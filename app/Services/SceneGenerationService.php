<?php

namespace App\Services;

use App\Models\Project;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class SceneGenerationService
{
    /**
     * Generate scenes from uploaded voiceover
     */
    public function generateScenesFromVoice(Project $project): array
    {
        try {
            Log::info('🎬 Starting scene generation from voice', [
                'project_id' => $project->id,
                'voiceover_file' => $project->voiceover_file
            ]);

            // Step 1: Get the script text
            $script = $project->custom_script ?? $project->description;

            // Step 2: Get the full path to the voiceover file
            $voiceoverFullPath = storage_path('app/public/' . $project->voiceover_file);

            if (!file_exists($voiceoverFullPath)) {
                Log::error('Voiceover file not found', ['path' => $voiceoverFullPath]);
                throw new \Exception('Voiceover file not found');
            }

            // Step 3: Transcribe audio using Deepgram
            $transcriptData = $this->transcribeAudio($voiceoverFullPath, $project->language);

            // Step 4: Generate scene phrases using Gemini
            $sceneData = $this->generateScenePhrases($script, $transcriptData, $project->language);

            // Step 5: Search videos for each phrase
            $videos = $this->searchVideosForPhrases($sceneData['phrases']);

            // Step 6: Format final response
            $result = [
                'all_videos' => $videos,
                'voice_over_transcript' => $transcriptData['words'],
                'subtitles_script' => $sceneData['subtitles_script'],
                'total' => count($videos),
                'collected_at' => now()->toISOString()
            ];

            Log::info('✅ Scene generation completed', [
                'project_id' => $project->id,
                'videos_count' => count($videos),
                'transcript_words' => count($transcriptData['words']),
                'subtitles_count' => count($sceneData['subtitles_script'])
            ]);

            return $result;

        } catch (\Exception $e) {
            Log::error('❌ Scene generation failed', [
                'project_id' => $project->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    /**
     * Transcribe audio using Deepgram
     */
    private function transcribeAudio(string $audioPath, string $language): array
    {
        try {
            Log::info('🎤 Transcribing audio with Deepgram', [
                'audio_path' => $audioPath,
                'language' => $language
            ]);

            $audioContent = file_get_contents($audioPath);
            $mimeType = mime_content_type($audioPath);

            $response = Http::withHeaders([
                'Authorization' => 'Token ' . config('services.deepgram.api_key'),
                'Content-Type' => $mimeType
            ])->withBody($audioContent, $mimeType)
            ->timeout(120) // 2 minutes timeout
            ->retry(3, 1000) // Retry 3 times with 1 second delay
            ->withoutVerifying() // Disable SSL verification for local development
            ->post(config('services.deepgram.base_url'));

            if (!$response->successful()) {
                throw new \Exception('Deepgram transcription failed: ' . $response->body());
            }

            $data = $response->json();
            $transcript = $data['results']['channels'][0]['alternatives'][0] ?? null;

            if (!$transcript) {
                throw new \Exception('No transcript found in Deepgram response');
            }

            Log::info('✅ Audio transcription completed', [
                'transcript_text' => $transcript['transcript'] ?? '',
                'words_count' => count($transcript['words'] ?? [])
            ]);

            return [
                'text' => $transcript['transcript'] ?? '',
                'words' => $transcript['words'] ?? []
            ];

        } catch (\Exception $e) {
            Log::error('❌ Audio transcription failed', [
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Generate scene phrases using Gemini
     */
    private function generateScenePhrases(string $script, array $transcriptData, string $language): array
    {
        try {
            Log::info('🤖 Generating scene phrases with Gemini', [
                'script_length' => strlen($script),
                'transcript_words' => count($transcriptData['words'])
            ]);

            $prompt = $this->buildGeminiPrompt($script, $transcriptData, $language);

            $response = Http::withHeaders([
                'Content-Type' => 'application/json'
            ])->timeout(120) // 2 minutes timeout
            ->retry(3, 1000) // Retry 3 times with 1 second delay
            ->withoutVerifying() // Disable SSL verification for local development
            ->post(config('services.gemini.base_url') . '?key=' . config('services.gemini.api_key'), [
                'contents' => [
                    [
                        'role' => 'user',
                        'parts' => [
                            ['text' => $prompt]
                        ]
                    ]
                ]
            ]);

            if (!$response->successful()) {
                throw new \Exception('Gemini API request failed: ' . $response->body());
            }

            $data = $response->json();
            $rawText = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';

            // Parse the JSON response
            $rawText = preg_replace('/```json\s*|\s*```/s', '', $rawText);
            $parsed = json_decode($rawText, true);

            if (!$parsed || !isset($parsed['phrases']) || !is_array($parsed['phrases'])) {
                throw new \Exception('Invalid response format from Gemini: ' . $rawText);
            }

            Log::info('✅ Scene phrases generated', [
                'phrases_count' => count($parsed['phrases']),
                'subtitles_count' => count($parsed['subtitles_script'] ?? [])
            ]);

            return [
                'phrases' => $parsed['phrases'],
                'subtitles_script' => $parsed['subtitles_script'] ?? []
            ];

        } catch (\Exception $e) {
            Log::error('❌ Scene phrase generation failed', [
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Build the prompt for Gemini
     */
    private function buildGeminiPrompt(string $script, array $transcriptData, string $language): string
    {
        $transcriptText = $transcriptData['text'] ?? '';
        $transcriptWords = json_encode($transcriptData['words'] ?? []);

        return "
You are given:
1. A promotional script.
2. A voice-over transcript with word-level timing (start, end, confidence).
3. The language of the script and transcript (e.g., 'en' for English, 'fr' for French').

### Your tasks:

1. Verify transcript matches script:
   - Small differences are acceptable.
   - If unrelated, respond **only** with:
     {\"error\": \"Audio does not match script.\"}

2. If they match:
   - Split the script into meaningful scene phrases.
   - Minimize splits—only break where it makes visual sense.
   - For lists (commas, \"and\"), split items individually.
   - Preserve exact wording.

3. For each phrase:
   - Generate **2–3 English keywords**.
   - Align words to transcript:
     - start_time = first matched word's start
     - end_time = last matched word's end
   - Adjust:
     - Extend each end_time up to the next start_time (include pauses).
     - First phrase: if start_time > 0, add that to duration_seconds (don't change start_time).
     - Last phrase: add exactly **2.0 seconds** to duration_seconds.
     - duration_seconds = end_time - start_time (+ adjustments), rounded to 1 decimal.

4. Validation:
   - Sum(duration_seconds) ≈ last transcript word's end + 2 seconds.

5. For each phrase:
   - Create a **prompt**: cinematic visual scene description (English).

6. **Also generate subtitles_script:**
   - A **global array** of short TikTok-style subtitle chunks.
   - Each chunk: **2–4 words**, meaningful, natural.
   - Example:
     \"Discover EcoSip, the reusable water bottle made from eco materials\"
     → [\"Discover EcoSip\", \"the reusable water bottle\", \"made from eco materials\"]
   - Avoid awkward breaks:
     ❌ [\"the reusable water\", \"bottle made from eco\", \"materials\"]
     ✅ [\"the reusable water bottle\", \"made from eco materials\"]

### OUTPUT FORMAT (return ONLY this):
{
  \"phrases\": [
    {
      \"phrase\": \"Discover EcoSip\",
      \"keywords\": [\"eco\", \"bottle\"],
      \"start_time\": 0.0,
      \"end_time\": 4.8,
      \"duration_seconds\": 4.8,
      \"prompt\": \"A cinematic scene...\",
      \"subtitles_script\": [\"Discover EcoSip\"]
    }
  ],
  \"subtitles_script\": [
    \"Discover EcoSip\",
    \"the reusable water bottle\",
    \"made from eco materials\"
  ]
}

NO explanations, NO code, NO markdown, just valid JSON.

Language: {$language}
Script: {$script}
Transcript Text: {$transcriptText}
Transcript Words: {$transcriptWords}
";
    }

    /**
     * Search videos for each phrase using Pexels
     */
    private function searchVideosForPhrases(array $phrases): array
    {
        $videos = [];

        foreach ($phrases as $phrase) {
            try {
                Log::info('🔍 Searching video for phrase', [
                    'phrase' => $phrase['phrase'],
                    'keywords' => $phrase['keywords']
                ]);

                $videoData = $this->searchPexelsVideo($phrase['keywords']);
                
                if ($videoData) {
                    $videos[] = [
                        'phrase' => $phrase['phrase'],
                        'video_url' => $videoData['video_url'],
                        'keywords' => $phrase['keywords'],
                        'start_time' => $phrase['start_time'] ?? null,
                        'end_time' => $phrase['end_time'] ?? null,
                        'duration_seconds' => $phrase['duration_seconds'],
                        'prompt' => $phrase['prompt'] ?? null,
                        'subtitles_script' => $phrase['subtitles_script'] ?? []
                    ];
                }

            } catch (\Exception $e) {
                Log::error('❌ Video search failed for phrase', [
                    'phrase' => $phrase['phrase'],
                    'error' => $e->getMessage()
                ]);
                // Continue with next phrase
            }
        }

        Log::info('✅ Video search completed', [
            'total_phrases' => count($phrases),
            'videos_found' => count($videos)
        ]);

        return $videos;
    }

    /**
     * Search for video on Pexels
     */
    private function searchPexelsVideo(array $keywords): ?array
    {
        try {
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
                Log::warning('No videos found for keywords', ['keywords' => $keywords]);
                return null;
            }

            // Get the first video
            $video = $videos[0];
            $duration = $video['duration'] ?? 0;
            $isShortEnough = $duration <= 30;

            // Filter MP4 files only
            $mp4Files = array_filter($video['video_files'] ?? [], function($file) {
                return $file['file_type'] === 'video/mp4';
            });

            // Sort files by height (resolution) descending
            usort($mp4Files, function($a, $b) {
                return ($b['height'] ?? 0) - ($a['height'] ?? 0);
            });

            // Prefer 1080p or 720p if available and video is short
            $preferredFile = null;
            if ($isShortEnough) {
                foreach ($mp4Files as $file) {
                    if (in_array($file['height'], [1080, 720])) {
                        $preferredFile = $file;
                        break;
                    }
                }
            }

            // Use fallback if no HD or if video is too long
            $bestFile = $preferredFile ?? $mp4Files[0] ?? null;

            if (!$bestFile) {
                Log::warning('No suitable video file found', ['video_id' => $video['id'] ?? 'unknown']);
                return null;
            }

            return [
                'video_url' => $bestFile['link'],
                'resolution' => $bestFile['width'] . 'x' . $bestFile['height'],
                'duration_seconds' => $duration,
                'preview' => $video['image'],
                'quality_score' => ($bestFile['height'] >= 720 && $isShortEnough) ? "✔ Good (HD)" : "⚠ Acceptable",
                'height' => $bestFile['height'],
                'width' => $bestFile['width']
            ];

        } catch (\Exception $e) {
            Log::error('❌ Pexels video search failed', [
                'keywords' => $keywords,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }
}
