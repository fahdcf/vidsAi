<?php

namespace App\Jobs;

use App\Models\Project;
use App\Services\SceneTrimmingService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class ProcessTrimScenesJob implements ShouldQueue
{
    use Queueable;

    public $timeout = 900; // 15 minutes timeout
    public $tries = 3; // Allow 3 attempts
    public $maxExceptions = 3; // Allow 3 exceptions before failing

    /**
     * Create a new job instance.
     */
    public function __construct(
        public Project $project,
        public array $webhookData
    ) {
        //
    }

    /**
     * Get the unique ID for the job.
     */
    public function uniqueId(): string
    {
        return 'trim_scenes_' . $this->project->id;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            Log::info('🚀 ProcessTrimScenesJob started', [
                'project_id' => $this->project->id,
                'job_id' => $this->uniqueId(),
                'scenes_count' => count($this->webhookData['scenes'])
            ]);

            // Use the new SceneTrimmingService instead of n8n webhook
            $sceneTrimmingService = new SceneTrimmingService();
            $responseData = $sceneTrimmingService->trimScenes($this->project, $this->webhookData['scenes']);

            Log::info('✅ Trim scenes successful', [
                'project_id' => $this->project->id,
                'job_id' => $this->uniqueId(),
                'response_keys' => is_array($responseData) ? array_keys($responseData) : 'not_array'
            ]);

            // Parse the response to find trimmed videos
            $trimmedVideos = $this->parseTrimmedVideos($responseData);

            Log::info('🔍 Parsed trimmed videos', [
                'project_id' => $this->project->id,
                'job_id' => $this->uniqueId(),
                'raw_response' => $responseData,
                'parsed_videos' => $trimmedVideos,
                'videos_count' => count($trimmedVideos)
            ]);

            if (!empty($trimmedVideos)) {
                // Update project status to subtitle selection
                $this->project->update([
                    'status' => 'subtitle_selection',
                    'processing_completed_at' => now(),
                    'trim_response' => $responseData // Store as array, not JSON string
                ]);

                Log::info('🎯 Project updated to subtitle_selection', [
                    'project_id' => $this->project->id,
                    'job_id' => $this->uniqueId(),
                    'trimmed_videos_count' => count($trimmedVideos),
                    'stored_response' => $responseData
                ]);
            } else {
                // No trimmed videos found, go to completed
                $this->project->update([
                    'status' => 'completed',
                    'processing_completed_at' => now(),
                    'trim_response' => $responseData // Store as array, not JSON string
                ]);

                Log::info('🏁 Project completed (no trimmed videos)', [
                    'project_id' => $this->project->id,
                    'job_id' => $this->uniqueId(),
                    'response_data' => $responseData
                ]);
            }

        } catch (\Exception $e) {
            Log::error('❌ ProcessTrimScenesJob failed', [
                'project_id' => $this->project->id,
                'job_id' => $this->uniqueId(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'attempt' => $this->attempts(),
                'max_tries' => $this->tries
            ]);

            // Only update project status to failed if this is the final attempt
            if ($this->attempts() >= $this->tries) {
                $this->project->update([
                    'status' => 'trim_failed',
                    'processing_completed_at' => now(),
                    'error_message' => $e->getMessage()
                ]);

                Log::error('❌ ProcessTrimScenesJob permanently failed after all attempts', [
                    'project_id' => $this->project->id,
                    'job_id' => $this->uniqueId(),
                    'final_error' => $e->getMessage()
                ]);
            } else {
                Log::info('🔄 ProcessTrimScenesJob will retry', [
                    'project_id' => $this->project->id,
                    'job_id' => $this->uniqueId(),
                    'attempt' => $this->attempts(),
                    'remaining_tries' => $this->tries - $this->attempts()
                ]);
            }

            throw $e; // Re-throw to mark job as failed for this attempt
        }
    }

    /**
     * Parse trimmed videos from response data
     */
    private function parseTrimmedVideos(array $responseData): array
    {
        $trimmedVideos = [];

        Log::info('🔍 Parsing trimmed videos', [
            'response_structure' => $this->getResponseStructure($responseData),
            'response_keys' => is_array($responseData) ? array_keys($responseData) : 'not_array'
        ]);

        // Check various response structures
        if (isset($responseData['all_videos']) && is_array($responseData['all_videos'])) {
            $trimmedVideos = $responseData['all_videos'];
            Log::info('✅ Found videos in direct all_videos key', ['count' => count($trimmedVideos)]);
        } elseif (isset($responseData['trimmed_videos']) && is_array($responseData['trimmed_videos'])) {
            $trimmedVideos = $responseData['trimmed_videos'];
            Log::info('✅ Found videos in direct trimmed_videos key', ['count' => count($trimmedVideos)]);
        } elseif (is_array($responseData) && count($responseData) > 0) {
            $responseItem = $responseData[0] ?? [];
            Log::info('🔍 Checking first array item', ['item_keys' => is_array($responseItem) ? array_keys($responseItem) : 'not_array']);

            if (isset($responseItem['all_videos']) && is_array($responseItem['all_videos'])) {
                $trimmedVideos = $responseItem['all_videos'];
                Log::info('✅ Found videos in array[0].all_videos', ['count' => count($trimmedVideos)]);
            } elseif (isset($responseItem['trimmed_videos']) && is_array($responseItem['trimmed_videos'])) {
                $trimmedVideos = $responseItem['trimmed_videos'];
                Log::info('✅ Found videos in array[0].trimmed_videos', ['count' => count($trimmedVideos)]);
            } elseif (isset($responseData[0]['scene_id']) && isset($responseData[0]['video_url'])) {
                $trimmedVideos = $responseData;
                Log::info('✅ Found videos in direct array format', ['count' => count($trimmedVideos)]);
            }
        }

        Log::info('🎯 Final parsed videos', [
            'videos_count' => count($trimmedVideos),
            'first_video' => !empty($trimmedVideos) ? $trimmedVideos[0] : null
        ]);

        return $trimmedVideos;
    }

    /**
     * Get response structure for debugging
     */
    private function getResponseStructure(array $data, int $depth = 0): array
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
}
