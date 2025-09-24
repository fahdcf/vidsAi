<?php

namespace App\Jobs;

use App\Models\Project;
use App\Models\Scene;
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
                    $updateData['subtitles_script'] = $result['subtitles_script'];

                    Log::info('📝 Storing subtitles script', [
                        'project_id' => $this->project->id,
                        'subtitles_count' => count($result['subtitles_script']),
                        'first_subtitle' => $result['subtitles_script'][0] ?? null,
                        'last_subtitle' => end($result['subtitles_script']) ?? null
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

        $sceneNumber = 1;
        foreach ($scenesData as $sceneData) {
            Scene::create([
                'project_id' => $project->id,
                'scene_number' => $sceneNumber,
                'script_text' => $sceneData['phrase'] ?? '',
                'video_url' => $sceneData['video_url'] ?? '',
                'start_time' => $sceneData['start_time'] ?? null,
                'end_time' => $sceneData['end_time'] ?? null,
                'duration_seconds' => $sceneData['duration_seconds'] ?? 0,
                'gemini_duration' => $sceneData['gemini_duration'] ?? null,
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
