<?php

namespace App\Services;

use App\Models\Scene;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SceneRegenerationService
{
    /**
     * Regenerate a scene with new video
     */
    public function regenerateScene(Scene $scene, string $regenerationOption = 'pexels', ?array $providedKeywords = null): array
    {
        try {
            Log::info('🔄 Starting scene regeneration', [
                'scene_id' => $scene->id,
                'scene_number' => $scene->scene_number,
                'regeneration_option' => $regenerationOption
            ]);

            // Use provided keywords if present, otherwise extract from script
            $keywords = $providedKeywords && count($providedKeywords) > 0
                ? $this->normalizeKeywords($providedKeywords)
                : $this->extractKeywordsFromScript($scene->script_text);

            if ($regenerationOption === 'ai') {
                return $this->generateAIVideo($scene, $keywords);
            } else {
                return $this->searchPexelsVideo($scene, $keywords);
            }

        } catch (\Exception $e) {
            Log::error('❌ Scene regeneration failed', [
                'scene_id' => $scene->id,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Extract the best single keyword from script text
     */
    private function extractKeywordsFromScript(string $scriptText): array
    {
        $text = mb_strtolower((string) $scriptText, 'UTF-8');
        // Split by whitespace and punctuation, keep Arabic letters/digits
        $tokens = preg_split('/[^\p{L}\p{N}]+/u', $text);
        $tokens = array_values(array_filter($tokens ?? [], fn($t) => $t !== ''));

        // Basic multilingual stopwords (extendable)
        $stopWords = [
            'the','a','an','and','or','but','in','on','at','to','for','of','with','by','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','could','should','may','might','can','this','that','these','those',
            // Arabic common words
            'من','في','على','إلى','الى','عن','هذا','هذه','ذلك','تلك','هو','هي','هم','هن','و','يا','ما','لا','لم','لن','إن','ان','كان','كانت','مع','كل','كما','بعد','قبل','حتى','أو','او'
        ];

        $keywords = array_filter($tokens, function($word) use ($stopWords) {
            return !in_array($word, $stopWords, true) && mb_strlen($word, 'UTF-8') > 1;
        });

        // Prefer unique tokens preserving order
        $unique = [];
        foreach ($keywords as $k) {
            if (!in_array($k, $unique, true)) { $unique[] = $k; }
        }

        // Return only the first (best) keyword for better Pexels search results
        return array_slice($unique, 0, 1);
    }

    /**
     * Search for new video on Pexels
     */
    private function searchPexelsVideo(Scene $scene, array $keywords): array
    {
        try {
            Log::info('🔍 Searching Pexels for new video', [
                'scene_id' => $scene->id,
                'keywords' => $keywords
            ]);

            // Use only the first (and only) keyword for better search results
            $query = $keywords[0] ?? '';
            
            if (empty($query)) {
                throw new \Exception('No keyword provided for Pexels search');
            }

            $response = Http::withHeaders([
                'Authorization' => config('services.pexels.api_key')
            ])->timeout(30) // Reduced timeout to 30 seconds
            ->retry(2, 500) // Reduced retries to 2 with 500ms delay
            ->withoutVerifying() // Disable SSL verification for local development
            ->get(config('services.pexels.base_url'), [
                'query' => $query,
                'per_page' => 5, // Reduced from 10 to 5 for faster response
                'orientation' => 'landscape'
            ]);

            if (!$response->successful()) {
                throw new \Exception('Pexels API request failed: ' . $response->body());
            }

            $data = $response->json();
            $videos = $data['videos'] ?? [];

            if (empty($videos)) {
                // Retry strategy: search per keyword, then last-resort broad fallback in English translation if applicable
                foreach ($keywords as $kw) {
                    $alt = trim($kw);
                    if ($alt === '') { continue; }
                    $altResp = Http::withHeaders([
                        'Authorization' => config('services.pexels.api_key')
                    ])->timeout(20)->retry(1, 500)->withoutVerifying()->get(config('services.pexels.base_url'), [
                        'query' => $alt,
                        'per_page' => 5, // Reduced from 10 to 5
                        'orientation' => 'landscape'
                    ]);
                    if ($altResp->successful()) {
                        $altData = $altResp->json();
                        $altVideos = $altData['videos'] ?? [];
                        if (!empty($altVideos)) {
                            $videos = $altVideos;
                            $query = $alt; // Note used query for logging
                            break;
                        }
                    }
                }
                if (empty($videos)) {
                    throw new \Exception('No videos found for keywords: ' . $query);
                }
            }

            // Limit to first 3 videos and randomly pick one (faster processing)
            $topVideos = array_slice($videos, 0, 3);
            $randomVideoIndex = array_rand($topVideos);
            $video = $topVideos[$randomVideoIndex];

            $duration = $video['duration'] ?? 0;
            $durationLimit = 40;

            // Get all MP4 files between 720p and 1080p
            $files = $video['video_files'] ?? [];
            $eligibleFiles = array_filter($files, function($file) {
                return $file['file_type'] === 'video/mp4' && 
                       $file['width'] >= 720 && 
                       $file['width'] <= 1080;
            });

            // Prioritize shorter videos
            $candidates = $duration <= $durationLimit ? $eligibleFiles : [];

            // Fallback to all eligible files if none short enough
            if (empty($candidates)) {
                $candidates = $eligibleFiles;
            }

            // Randomly choose one of the matching files
            $bestFile = null;
            if (!empty($candidates)) {
                $randomFileIndex = array_rand($candidates);
                $bestFile = $candidates[$randomFileIndex];
            } else {
                // Last fallback: Highest resolution MP4
                $mp4Files = array_filter($files, function($file) {
                    return $file['file_type'] === 'video/mp4';
                });
                
                if (!empty($mp4Files)) {
                    usort($mp4Files, function($a, $b) {
                        return ($b['width'] ?? 0) - ($a['width'] ?? 0);
                    });
                    $bestFile = $mp4Files[0];
                }
            }

            if (!$bestFile) {
                throw new \Exception('No suitable video file found');
            }

            $result = [
                'success' => true,
                'message' => 'Scene regenerated successfully',
                'new_video_url' => $bestFile['link'],
                'new_keywords' => $keywords,
                'video_data' => [
                    'url' => $bestFile['link'],
                    'duration' => $duration,
                    'preview' => $video['image'],
                    'resolution' => $bestFile['width'] . 'x' . $bestFile['height']
                ]
            ];

            Log::info('✅ Scene regeneration completed', [
                'scene_id' => $scene->id,
                'new_video_url' => $bestFile['link']
            ]);

            return $result;

        } catch (\Exception $e) {
            Log::error('❌ Pexels video search failed', [
                'scene_id' => $scene->id,
                'keywords' => $keywords,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Normalize provided keywords array: trim, dedupe, drop empties, return only the best one
     */
    private function normalizeKeywords(array $keywords): array
    {
        $clean = [];
        foreach ($keywords as $k) {
            // Split if user accidentally provided comma/semicolon separated string within one entry
            $parts = preg_split('/[;,،\n\r]+/u', (string) $k);
            foreach ($parts ?? [] as $p) {
                $p = trim($p);
                $p = trim($p, "\"' \t\n\r\0\x0B");
                if ($p !== '' && !in_array($p, $clean, true)) {
                    $clean[] = $p;
                }
            }
        }
        // Return only the first (best) keyword for better Pexels search results
        return array_slice($clean, 0, 1);
    }

    /**
     * Generate AI video (placeholder for future implementation)
     */
    private function generateAIVideo(Scene $scene, array $keywords): array
    {
        Log::info('🤖 AI video generation requested', [
            'scene_id' => $scene->id,
            'keywords' => $keywords
        ]);

        // For now, return error as AI videos are not available yet
        return [
            'success' => false,
            'message' => 'AI video generation is not available yet',
            'video_url' => 'error ai videos are not available yet',
            'new_keywords' => $keywords
        ];
    }
}
