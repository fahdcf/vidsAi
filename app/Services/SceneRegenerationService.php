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
    public function regenerateScene(Scene $scene, string $regenerationOption = 'pexels'): array
    {
        try {
            Log::info('🔄 Starting scene regeneration', [
                'scene_id' => $scene->id,
                'scene_number' => $scene->scene_number,
                'regeneration_option' => $regenerationOption
            ]);

            // Extract keywords from scene script
            $keywords = $this->extractKeywordsFromScript($scene->script_text);

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
     * Extract keywords from script text
     */
    private function extractKeywordsFromScript(string $scriptText): array
    {
        // Simple keyword extraction - can be enhanced with NLP
        $words = preg_split('/\s+/', strtolower($scriptText));
        $stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those'];
        
        $keywords = array_filter($words, function($word) use ($stopWords) {
            return !in_array($word, $stopWords) && strlen($word) > 2;
        });

        // Take top 3 keywords
        return array_slice(array_unique($keywords), 0, 3);
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

            $query = implode(' ', $keywords);

            $response = Http::withHeaders([
                'Authorization' => config('services.pexels.api_key')
            ])->timeout(60) // 1 minute timeout
            ->retry(3, 1000) // Retry 3 times with 1 second delay
            ->withoutVerifying() // Disable SSL verification for local development
            ->get(config('services.pexels.base_url'), [
                'query' => $query,
                'per_page' => 10,
                'orientation' => 'landscape'
            ]);

            if (!$response->successful()) {
                throw new \Exception('Pexels API request failed: ' . $response->body());
            }

            $data = $response->json();
            $videos = $data['videos'] ?? [];

            if (empty($videos)) {
                throw new \Exception('No videos found for keywords: ' . $query);
            }

            // Limit to first 5 videos and randomly pick one
            $topVideos = array_slice($videos, 0, 5);
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
