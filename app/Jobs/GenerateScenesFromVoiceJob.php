<?php

namespace App\Jobs;

use App\Models\Project;
use App\Models\Scene;
use App\Services\ProjectProcessingLogService;
use App\Services\SceneGenerationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class GenerateScenesFromVoiceJob implements ShouldQueue
{
    use Queueable;

    public $timeout = 600; // 10 minutes timeout
    public $tries = 3; // Allow 3 attempts
    public $maxExceptions = 3; // Allow 3 exceptions before failing

    /**
     * Create a new job instance.
     */
    public function __construct(
        public Project $project
    ) {
        //
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            $this->logToCustomFile('🚀 Starting scene generation job', [
                'project_id' => $this->project->id,
                'project_name' => $this->project->name,
                'project_language' => $this->project->language,
                'project_script' => $this->project->script,
                'script_length' => strlen($this->project->script),
                'script_first_100_chars' => substr($this->project->script, 0, 100),
                'script_last_100_chars' => substr($this->project->script, -100),
                'job_attempt' => $this->attempts(),
                'max_tries' => $this->tries,
                'timeout' => $this->timeout,
                'timestamp' => now()->toISOString()
            ]);

            Log::info('Starting scene generation job', [
                'project_id' => $this->project->id
            ]);

            // Set processing started timestamp if not already set
            if (!$this->project->processing_started_at) {
                $this->project->update(['processing_started_at' => now()]);
            }

            // Use the new SceneGenerationService instead of n8n webhook
            $this->logToCustomFile('🔧 Creating SceneGenerationService instance', [
                'project_id' => $this->project->id,
                'timestamp' => now()->toISOString()
            ]);

            $sceneGenerationService = new SceneGenerationService();
            
            $this->logToCustomFile('🎯 Calling generateScenesFromVoice method', [
                'project_id' => $this->project->id,
                'service_class' => get_class($sceneGenerationService),
                'method_name' => 'generateScenesFromVoice',
                'timestamp' => now()->toISOString()
            ]);

            $result = $sceneGenerationService->generateScenesFromVoice($this->project);

            $this->logToCustomFile('📊 Scene generation service returned result', [
                'project_id' => $this->project->id,
                'result_type' => gettype($result),
                'result_is_array' => is_array($result),
                'result_is_null' => is_null($result),
                'result_keys' => is_array($result) ? array_keys($result) : 'N/A',
                'result_count' => is_array($result) ? count($result) : 'N/A',
                'has_all_videos' => is_array($result) && isset($result['all_videos']),
                'all_videos_count' => is_array($result) && isset($result['all_videos']) ? count($result['all_videos']) : 'N/A',
                'timestamp' => now()->toISOString()
            ]);

            if ($result && isset($result['all_videos'])) {
                Log::info('🎯 Processing job result', [
                    'project_id' => $this->project->id,
                    'result_keys' => array_keys($result),
                    'scenes_count' => count($result['all_videos']),
                    'has_transcript' => isset($result['voice_over_transcript']),
                    'has_subtitles_script' => isset($result['subtitles_script'])
                ]);

                // Create scenes from the response
                $this->createScenesFromResponse($this->project, $result['all_videos']);

                // Prepare update data
                $updateData = [
                    'status' => 'reviewing',
                    'processing_completed_at' => now()
                ];

                // Store the voiceover transcript if available
                if (isset($result['voice_over_transcript'])) {
                    $updateData['voiceover_transcript'] = $result['voice_over_transcript'];

                    Log::info('📝 Storing voiceover transcript', [
                        'project_id' => $this->project->id,
                        'transcript_words_count' => count($result['voice_over_transcript']),
                        'first_word' => $result['voice_over_transcript'][0] ?? null,
                        'last_word' => end($result['voice_over_transcript']) ?? null
                    ]);
                } else {
                    Log::warning('⚠️ No voiceover transcript found in result', [
                        'project_id' => $this->project->id,
                        'result_keys' => array_keys($result)
                    ]);
                }

                // Store the subtitles script if available
                if (isset($result['subtitles_script'])) {
                    $subtitlesScript = is_array($result['subtitles_script'])
                        ? array_values($result['subtitles_script'])
                        : [];

                    $sceneTexts = [];
                    if (!empty($result['all_videos']) && is_array($result['all_videos'])) {
                        foreach ($result['all_videos'] as $sceneItem) {
                            $sceneTexts[] = (string) ($sceneItem['phrase'] ?? $sceneItem['script_text'] ?? '');
                        }
                    }

                    // Merge split phrases back to match scene count
                    if (!empty($subtitlesScript) && !empty($sceneTexts)) {
                        $subtitlesScript = $this->mergeSubtitlesToMatchScenes(
                            $subtitlesScript,
                            $sceneTexts
                        );
                    }

                    $updateData['subtitles_script'] = $subtitlesScript;

                    Log::info('📝 Storing subtitles script', [
                        'project_id' => $this->project->id,
                        'subtitles_count' => count($subtitlesScript),
                        'first_subtitle' => $subtitlesScript[0] ?? null,
                        'last_subtitle' => end($subtitlesScript) ?? null
                    ]);
                } else {
                    Log::warning('⚠️ No subtitles script found in result', [
                        'project_id' => $this->project->id,
                        'result_keys' => array_keys($result)
                    ]);
                }

                Log::info('💾 About to update project', [
                    'project_id' => $this->project->id,
                    'update_data_keys' => array_keys($updateData),
                    'has_subtitles_in_update' => isset($updateData['subtitles_script'])
                ]);

                // Update the project
                $this->project->update($updateData);

                $this->logToCustomFile('✅ Project updated successfully', [
                    'project_id' => $this->project->id,
                    'project_name' => $this->project->name,
                    'project_language' => $this->project->language,
                    'status' => $this->project->status,
                    'scenes_count' => $this->project->scenes()->count(),
                    'processing_completed_at' => $this->project->processing_completed_at,
                    'has_voiceover_transcript' => !empty($this->project->voiceover_transcript),
                    'has_subtitles_script' => !empty($this->project->subtitles_script),
                    'final_memory_usage' => memory_get_usage(true),
                    'final_memory_peak' => memory_get_peak_usage(true),
                    'timestamp' => now()->toISOString()
                ]);

                Log::info('✅ Project updated successfully', [
                    'project_id' => $this->project->id,
                    'status' => $this->project->status,
                    'scenes_count' => $this->project->scenes()->count()
                ]);

            } else {
                $this->logToCustomFile('❌ Invalid result from scene generation service', [
                    'project_id' => $this->project->id,
                    'project_name' => $this->project->name,
                    'project_language' => $this->project->language,
                    'result_type' => gettype($result),
                    'result_is_null' => is_null($result),
                    'result_is_array' => is_array($result),
                    'result_keys' => is_array($result) ? array_keys($result) : 'N/A',
                    'result_count' => is_array($result) ? count($result) : 'N/A',
                    'result_structure' => $this->getResponseStructure($result),
                    'memory_usage' => memory_get_usage(true),
                    'memory_peak' => memory_get_peak_usage(true),
                    'timestamp' => now()->toISOString()
                ]);

                Log::error('❌ Invalid result from scene generation service', [
                    'project_id' => $this->project->id,
                    'result' => $result
                ]);

                $this->project->update([
                    'status' => 'failed',
                    'processing_completed_at' => now(),
                    'error_message' => 'Invalid result from scene generation service'
                ]);
            }

        } catch (\Exception $e) {
            $message = $e->getMessage();

            $this->logToCustomFile('❌ Scene generation job failed with exception', [
                'project_id' => $this->project->id,
                'project_name' => $this->project->name,
                'project_language' => $this->project->language,
                'error_message' => $message,
                'error_code' => $e->getCode(),
                'error_file' => $e->getFile(),
                'error_line' => $e->getLine(),
                'error_trace' => $e->getTraceAsString(),
                'attempt' => $this->attempts(),
                'max_tries' => $this->tries,
                'memory_usage' => memory_get_usage(true),
                'memory_peak' => memory_get_peak_usage(true),
                'timestamp' => now()->toISOString()
            ]);

            Log::error('❌ Scene generation job failed', [
                'project_id' => $this->project->id,
                'error' => $message,
                'trace' => $e->getTraceAsString(),
                'attempt' => $this->attempts(),
                'max_tries' => $this->tries
            ]);

            // Immediate fail on known user-fixable errors
            $isMismatch = stripos($message, 'Audio does not match script') !== false;
            $isEmptyTranscript = stripos($message, 'No transcript content') !== false;
            if ($isMismatch || $isEmptyTranscript) {
                $friendly = $isMismatch
                    ? 'Your voiceover audio does not match the script. Please upload a matching voiceover in the correct language, or adjust the script/language and try again.'
                    : 'We could not detect any spoken words in the voiceover. Please ensure the audio contains clear speech and try again.';

                $this->project->update([
                    'status' => 'failed',
                    'processing_completed_at' => now(),
                    'error_message' => $friendly
                ]);

                $this->logToCustomFile('🛑 Marked project failed due to audio/script issue', [
                    'project_id' => $this->project->id,
                    'error_message' => $friendly
                ]);

                // Do not retry further for these cases
                return;
            }

            // Only update project status to failed if this is the final attempt
            if ($this->attempts() >= $this->tries) {
                $this->project->update([
                    'status' => 'failed',
                    'processing_completed_at' => now(),
                    'error_message' => $message
                ]);

                $this->logToCustomFile('💀 Scene generation permanently failed after all attempts', [
                    'project_id' => $this->project->id,
                    'project_name' => $this->project->name,
                    'project_language' => $this->project->language,
                    'final_error' => $e->getMessage(),
                    'total_attempts' => $this->attempts(),
                    'max_tries' => $this->tries,
                    'final_memory_usage' => memory_get_usage(true),
                    'final_memory_peak' => memory_get_peak_usage(true),
                    'timestamp' => now()->toISOString()
                ]);

                Log::error('❌ Scene generation permanently failed after all attempts', [
                    'project_id' => $this->project->id,
                    'final_error' => $e->getMessage()
                ]);
            } else {
                Log::info('🔄 Scene generation will retry', [
                    'project_id' => $this->project->id,
                    'attempt' => $this->attempts(),
                    'remaining_tries' => $this->tries - $this->attempts()
                ]);
            }

            throw $e; // Re-throw to mark job as failed for this attempt
        }
    }

    /**
     * Create scenes from the response data
     */
    protected function createScenesFromResponse(Project $project, array $scenesData): void
    {
        // Clear existing scenes for this project
        $project->scenes()->delete();

        // Use Deepgram transcript timings when available
        $transcriptWords = $project->voiceover_transcript ?? [];
        $voiceoverTotalDuration = 0.0;
        if (!empty($transcriptWords)) {
            $lastWord = end($transcriptWords);
            $voiceoverTotalDuration = (float) ($lastWord['end'] ?? 0.0);
        }

        $sceneNumber = 1;
        foreach ($scenesData as $index => $sceneData) {
            $sceneText = (string) ($sceneData['phrase'] ?? '');
            $nextSceneText = isset($scenesData[$index + 1])
                ? (string) ($scenesData[$index + 1]['phrase'] ?? '')
                : null;

            $geminiFallback = (float) (
                $sceneData['gemini_duration']
                ?? $sceneData['duration_seconds']
                ?? 3.0
            );

            $transcriptDuration = $this->getDurationFromTranscript(
                $sceneText,
                $nextSceneText,
                $transcriptWords,
                $voiceoverTotalDuration,
                $geminiFallback
            );

            Scene::create([
                'project_id' => $project->id,
                'scene_number' => $sceneNumber,
                'script_text' => $sceneText,
                'video_url' => $sceneData['video_url'] ?? '',
                'start_time' => $sceneData['start_time'] ?? null,
                'end_time' => $sceneData['end_time'] ?? null,
                'duration_seconds' => $transcriptDuration,
                'gemini_duration' => $transcriptDuration,
                'keywords' => is_array($sceneData['keywords'] ?? []) ? implode(', ', $sceneData['keywords']) : ($sceneData['keywords'] ?? ''),
                'prompt' => $sceneData['prompt'] ?? null,
                'type' => 'video' // Default to video for all generated scenes
            ]);

            $sceneNumber++;
        }

        $this->logToCustomFile('✅ Scenes created from response', [
            'project_id' => $project->id,
            'project_name' => $project->name,
            'project_language' => $project->language,
            'scenes_created' => count($scenesData),
            'scenes_data_sample' => array_slice($scenesData, 0, 2), // First 2 scenes for debugging
            'memory_usage' => memory_get_usage(true),
            'memory_peak' => memory_get_peak_usage(true),
            'timestamp' => now()->toISOString()
        ]);

        Log::info('✅ Scenes created from response', [
            'project_id' => $project->id,
            'scenes_created' => count($scenesData)
        ]);
    }

    /**
     * Get response structure for debugging
     */
    private function getResponseStructure($data, $depth = 0): array
    {
        if ($depth > 3) return ['...too_deep'];

        $structure = [];
        foreach ($data as $key => $value) {
            if (is_array($value)) {
                $structure[$key] = $this->getResponseStructure($value, $depth + 1);
            } else {
                $structure[$key] = gettype($value);
            }
        }
        return $structure;
    }

    /**
     * Calculate scene duration from Deepgram word timestamps.
     * Uses the gap between this scene's first word and the next scene's first word
     * so that inter-phrase silences belong to the current scene.
     * Falls back to Gemini's estimate if transcript matching fails.
     */
    private function getDurationFromTranscript(
        string $sceneText,
        ?string $nextSceneText,
        array $transcriptWords,
        float $voiceoverTotalDuration,
        float $geminiFallback
    ): float {
        if (empty($transcriptWords)) {
            return $geminiFallback;
        }

        // Normalize: lowercase, strip punctuation
        $normalize = fn(string $w) => strtolower(preg_replace('/[^a-z0-9]/i', '', $w));

        // Get first word of this scene
        $sceneWordList = preg_split('/\s+/', trim($sceneText));
        $firstWord = $normalize($sceneWordList[0] ?? '');

        // Get first word of next scene
        $nextFirstWord = null;
        if ($nextSceneText) {
            $nextWordList = preg_split('/\s+/', trim($nextSceneText));
            $nextFirstWord = $normalize($nextWordList[0] ?? '');
        }

        // Find this scene's start time in transcript
        $sceneStartTime = null;
        $nextSceneStartTime = null;
        $foundCurrentScene = false;

        foreach ($transcriptWords as $word) {
            $w = $normalize($word['word'] ?? '');

            if (!$foundCurrentScene && $w === $firstWord) {
                $sceneStartTime = (float) $word['start'];
                $foundCurrentScene = true;
                continue;
            }

            if ($foundCurrentScene && $nextFirstWord && $w === $nextFirstWord) {
                $nextSceneStartTime = (float) $word['start'];
                break;
            }
        }

        // Could not find the scene start — use Gemini fallback
        if ($sceneStartTime === null) {
            return $geminiFallback;
        }

        $endTime = $nextSceneStartTime ?? $voiceoverTotalDuration;
        $duration = round($endTime - $sceneStartTime, 3);

        // Sanity check — duration must be positive and reasonable
        if ($duration <= 0 || $duration > 60) {
            return $geminiFallback;
        }

        return $duration;
    }

    /**
     * Merge subtitle strings to match scene count.
     * When Gemini splits a long phrase across multiple subtitle items,
     * this merges them back to one item per scene.
     */
    private function mergeSubtitlesToMatchScenes(array $subtitleStrings, array $sceneTexts): array
    {
        // If counts already match, nothing to do
        if (count($subtitleStrings) === count($sceneTexts)) {
            return $subtitleStrings;
        }

        // If fewer subtitles than scenes, return as-is (different problem)
        if (count($subtitleStrings) < count($sceneTexts)) {
            return $subtitleStrings;
        }

        $merged = [];
        $subIndex = 0;

        foreach ($sceneTexts as $sceneIndex => $sceneText) {
            if ($subIndex >= count($subtitleStrings)) {
                $merged[] = $sceneText; // fallback to scene text
                continue;
            }

            // Normalize both for comparison
            $sceneNorm = strtolower((string) preg_replace('/[^a-z0-9\s]/i', '', $sceneText));
            $sceneWords = array_values(array_filter(explode(' ', $sceneNorm)));

            // Collect subtitle strings until we've covered all words in this scene
            $collectedWords = [];
            $collectedStrings = [];

            while ($subIndex < count($subtitleStrings)) {
                $subStr = (string) $subtitleStrings[$subIndex];
                $subNorm = strtolower((string) preg_replace('/[^a-z0-9\s]/i', '', $subStr));
                $subWords = array_values(array_filter(explode(' ', $subNorm)));

                $collectedWords = array_merge($collectedWords, $subWords);
                $collectedStrings[] = $subStr;
                $subIndex++;

                // Check if we've covered enough words for this scene
                // Stop when collected words cover at least 80% of scene words
                $sceneWordCount = count($sceneWords);
                $coveredCount = 0;
                foreach ($sceneWords as $sw) {
                    if (in_array($sw, $collectedWords, true)) {
                        $coveredCount++;
                    }
                }

                if ($sceneWordCount > 0 && ($coveredCount / $sceneWordCount) >= 0.8) {
                    break;
                }

                // Also stop if next subtitle string starts a new scene
                if ($subIndex < count($subtitleStrings)) {
                    $nextSub = strtolower((string) preg_replace('/[^a-z0-9\s]/i', '', (string) $subtitleStrings[$subIndex]));
                    $nextSceneIndex = $sceneIndex + 1;
                    if (isset($sceneTexts[$nextSceneIndex])) {
                        $nextSceneNorm = strtolower((string) preg_replace('/[^a-z0-9\s]/i', '', (string) $sceneTexts[$nextSceneIndex]));
                        $nextSceneFirstWord = explode(' ', trim($nextSceneNorm))[0] ?? '';
                        $nextSubFirstWord = explode(' ', trim($nextSub))[0] ?? '';
                        if ($nextSceneFirstWord && $nextSubFirstWord === $nextSceneFirstWord) {
                            break;
                        }
                    }
                }
            }

            $merged[] = implode(', ', $collectedStrings);
        }

        return $merged;
    }

    /**
     * Map language code for API calls
     */
    protected function mapLanguageCode($language): string
    {
        $languageMap = [
            'english' => 'en',
            'french' => 'fr',
            'spanish' => 'es',
            'german' => 'de',
            'italian' => 'it',
            'portuguese' => 'pt',
            'russian' => 'ru',
            'chinese' => 'zh',
            'japanese' => 'ja',
            'korean' => 'ko',
            'arabic' => 'ar',
            'hindi' => 'hi'
        ];

        return $languageMap[$language] ?? 'en';
    }

    /**
     * Log to custom scene generation log file
     */
    private function logToCustomFile(string $message, array $context = []): void
    {
        try {
            ProjectProcessingLogService::write(
                $this->project->id,
                $message,
                $context,
                'job'
            );

            $logEntry = [
                'timestamp' => now()->toISOString(),
                'message' => $message,
                'context' => $context,
                'memory_usage' => memory_get_usage(true),
                'memory_peak' => memory_get_peak_usage(true),
                'execution_time' => microtime(true) - LARAVEL_START
            ];

            $logContent = json_encode($logEntry, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n" . str_repeat('-', 80) . "\n";

            // Use the custom logging channel
            Log::channel('scene_generation')->info($message, $context);
            
            // Also write to a custom file for easier debugging
            $customLogPath = storage_path('logs/scene_generation_detailed.log');
            file_put_contents($customLogPath, $logContent, FILE_APPEND | LOCK_EX);
            
        } catch (\Exception $e) {
            // Fallback to default logging if custom logging fails
            Log::error('Failed to write to custom log file', [
                'error' => $e->getMessage(),
                'original_message' => $message
            ]);
        }
    }
}
