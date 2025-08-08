<?php

namespace App\Jobs;

use App\Models\Project;
use App\Models\Scene;
use App\Services\SceneGenerationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

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
            Log::info('Starting scene generation job', [
                'project_id' => $this->project->id
            ]);

            // Set processing started timestamp if not already set
            if (!$this->project->processing_started_at) {
                $this->project->update(['processing_started_at' => now()]);
            }

            // Use the new SceneGenerationService instead of n8n webhook
            $sceneGenerationService = new SceneGenerationService();
            $result = $sceneGenerationService->generateScenesFromVoice($this->project);

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

                Log::info('✅ Project updated successfully', [
                    'project_id' => $this->project->id,
                    'status' => $this->project->status,
                    'scenes_count' => $this->project->scenes()->count()
                ]);

            } else {
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
            Log::error('❌ Scene generation job failed', [
                'project_id' => $this->project->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'attempt' => $this->attempts(),
                'max_tries' => $this->tries
            ]);

            // Only update project status to failed if this is the final attempt
            if ($this->attempts() >= $this->tries) {
                $this->project->update([
                    'status' => 'failed',
                    'processing_completed_at' => now(),
                    'error_message' => $e->getMessage()
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
                'keywords' => is_array($sceneData['keywords'] ?? []) ? implode(', ', $sceneData['keywords']) : ($sceneData['keywords'] ?? ''),
                'prompt' => $sceneData['prompt'] ?? null
            ]);

            $sceneNumber++;
        }

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
}
