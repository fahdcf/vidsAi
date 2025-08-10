<?php

namespace App\Jobs;

use App\Models\Project;
use App\Services\SubtitleGenerationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class ProcessSubtitleGenerationJob implements ShouldQueue
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
        public array $videoData,
        public array $projectInfo
    ) {
        //
    }

    /**
     * Get the unique ID for the job.
     */
    public function uniqueId(): string
    {
        return 'subtitle_generation_' . $this->project->id;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            Log::info('🚀 ProcessSubtitleGenerationJob started', [
                'project_id' => $this->project->id,
                'job_id' => $this->uniqueId(),
                'clips_count' => count($this->videoData['clips'] ?? []),
                'subtitles_count' => count($this->videoData['subtitles'] ?? [])
            ]);

            // Use the SubtitleGenerationService
            $subtitleGenerationService = new SubtitleGenerationService();
            $responseData = $subtitleGenerationService->generateSubtitlesAndMerge($this->project, $this->videoData, $this->projectInfo);

            Log::info('✅ Subtitle generation successful', [
                'project_id' => $this->project->id,
                'job_id' => $this->uniqueId(),
                'response_keys' => is_array($responseData) ? array_keys($responseData) : 'not_array'
            ]);

            // Parse the response to find merged video URL
            $mergedVideoUrl = $this->parseMergedVideoUrl($responseData);

            if ($mergedVideoUrl) {
                // Update project status to completed
                $this->project->update([
                    'status' => 'completed',
                    'processing_completed_at' => now(),
                    'final_video_path' => $mergedVideoUrl
                ]);

                Log::info('🎯 Project updated to completed', [
                    'project_id' => $this->project->id,
                    'job_id' => $this->uniqueId(),
                    'merged_video_url' => $mergedVideoUrl
                ]);
            } else {
                // No merged video URL found, mark as failed
                $this->project->update([
                    'status' => 'failed',
                    'processing_completed_at' => now(),
                    'error_message' => 'No merged video URL received from render service'
                ]);

                Log::error('❌ No merged video URL found', [
                    'project_id' => $this->project->id,
                    'job_id' => $this->uniqueId(),
                    'response_data' => $responseData
                ]);
            }

        } catch (\Exception $e) {
            Log::error('❌ ProcessSubtitleGenerationJob failed', [
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
                    'status' => 'failed',
                    'processing_completed_at' => now(),
                    'error_message' => $e->getMessage()
                ]);

                Log::error('❌ ProcessSubtitleGenerationJob permanently failed after all attempts', [
                    'project_id' => $this->project->id,
                    'job_id' => $this->uniqueId(),
                    'final_error' => $e->getMessage()
                ]);
            } else {
                Log::info('🔄 ProcessSubtitleGenerationJob will retry', [
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
     * Parse merged video URL from response data
     */
    private function parseMergedVideoUrl(array $responseData): ?string
    {
        Log::info('🔍 Parsing merged video URL', [
            'project_id' => $this->project->id,
            'response_structure' => $this->getResponseStructure($responseData),
            'response_keys' => is_array($responseData) ? array_keys($responseData) : 'not_array'
        ]);

        // Check various response structures
        if (isset($responseData['merged video url'])) {
            $mergedVideoUrl = $responseData['merged video url'];
            Log::info('✅ Found merged video URL in direct key', ['url' => $mergedVideoUrl]);
            return $mergedVideoUrl;
        } elseif (isset($responseData['merged_video_url'])) {
            $mergedVideoUrl = $responseData['merged_video_url'];
            Log::info('✅ Found merged video URL in merged_video_url key', ['url' => $mergedVideoUrl]);
            return $mergedVideoUrl;
        } elseif (isset($responseData['remoteUrl'])) {
            $mergedVideoUrl = $responseData['remoteUrl'];
            Log::info('✅ Found merged video URL in remoteUrl key', ['url' => $mergedVideoUrl]);
            return $mergedVideoUrl;
        } elseif (is_array($responseData) && count($responseData) > 0) {
            $responseItem = $responseData[0] ?? [];
            Log::info('🔍 Checking first array item', ['item_keys' => is_array($responseItem) ? array_keys($responseItem) : 'not_array']);

            if (isset($responseItem['merged video url'])) {
                $mergedVideoUrl = $responseItem['merged video url'];
                Log::info('✅ Found merged video URL in array[0].merged video url', ['url' => $mergedVideoUrl]);
                return $mergedVideoUrl;
            } elseif (isset($responseItem['merged_video_url'])) {
                $mergedVideoUrl = $responseItem['merged_video_url'];
                Log::info('✅ Found merged video URL in array[0].merged_video_url', ['url' => $mergedVideoUrl]);
                return $mergedVideoUrl;
            }
        }

        Log::error('❌ No merged video URL found in response', [
            'project_id' => $this->project->id,
            'response_data' => $responseData
        ]);

        return null;
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
