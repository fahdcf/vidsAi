<?php

namespace App\Jobs;

use App\Models\Scene;
use App\Services\WanAiVideoGenerationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class WanAiVideoGenerationJob implements ShouldQueue
{
    use Queueable;

    public $timeout = 300; // 5 minutes timeout
    public $tries = 3; // Allow 3 attempts
    public $maxExceptions = 3; // Allow 3 exceptions before failing

    /**
     * Create a new job instance.
     */
    public function __construct(
        public Scene $scene,
        public string $prompt,
        public string $model = 'wan2.2-t2v-plus',
        public string $resolution = '1920*1080'
    ) {
        //
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            Log::info('🤖 Starting WAN AI video generation job', [
                'scene_id' => $this->scene->id,
                'prompt' => $this->prompt,
                'model' => $this->model,
                'resolution' => $this->resolution,
                'job_attempt' => $this->attempts(),
                'max_tries' => $this->tries
            ]);

            // Update scene status to processing
            $this->scene->update(['status' => 'processing']);

            // Use the WAN AI service
            $wanAiService = new WanAiVideoGenerationService();
            $result = $wanAiService->generateVideo($this->scene, $this->prompt, $this->model, $this->resolution);

            if ($result['success']) {
                Log::info('✅ WAN AI video generation job completed successfully', [
                    'scene_id' => $this->scene->id,
                    'task_id' => $result['task_id']
                ]);

                // The scene status and job_id are already updated by the service
                // The frontend will poll for completion via the status check endpoint
            } else {
                Log::error('❌ WAN AI video generation job failed', [
                    'scene_id' => $this->scene->id,
                    'error' => $result['error']
                ]);

                // Update scene status to failed
                $this->scene->update(['status' => 'failed']);
            }

        } catch (\Exception $e) {
            Log::error('❌ WAN AI video generation job failed with exception', [
                'scene_id' => $this->scene->id,
                'error' => $e->getMessage(),
                'error_file' => $e->getFile(),
                'error_line' => $e->getLine(),
                'attempt' => $this->attempts(),
                'max_tries' => $this->tries
            ]);

            // Update scene status to failed
            $this->scene->update(['status' => 'failed']);

            // Only fail the job if this is the final attempt
            if ($this->attempts() >= $this->tries) {
                Log::error('💀 WAN AI video generation job permanently failed after all attempts', [
                    'scene_id' => $this->scene->id,
                    'final_error' => $e->getMessage()
                ]);
            } else {
                Log::info('🔄 WAN AI video generation job will retry', [
                    'scene_id' => $this->scene->id,
                    'attempt' => $this->attempts(),
                    'remaining_tries' => $this->tries - $this->attempts()
                ]);
            }

            throw $e; // Re-throw to mark job as failed for this attempt
        }
    }
}
