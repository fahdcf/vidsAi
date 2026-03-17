<?php

namespace App\Services;

use App\Models\Project;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SubtitleGenerationService
{
    /**
     * Generate subtitles and merge videos
     */
    public function generateSubtitlesAndMerge(Project $project, array $videoData, array $projectInfo): array
    {
        try {
            Log::info('🎬 Starting subtitle generation and video merging', [
                'project_id' => $project->id,
                'clips_count' => count($videoData['clips'] ?? []),
                'subtitles_count' => count($videoData['subtitles'] ?? [])
            ]);

            // Step 1: Send render request
            $renderResult = $this->sendRenderRequest($videoData);

            if (!$renderResult) {
                throw new \Exception('Failed to submit render request');
            }

            $renderId = $renderResult['id'] ?? null;

            if (!$renderId) {
                throw new \Exception('No render ID received from render service');
            }

            Log::info('⏳ Render request submitted', [
                'project_id' => $project->id,
                'render_id' => $renderId
            ]);

            // Step 2: Wait for render completion
            $finalResult = $this->waitForRenderCompletion($renderId, $project->id);

            if (!$finalResult) {
                throw new \Exception('Render processing failed or timed out');
            }

            Log::info('✅ Subtitle generation and merging completed', [
                'project_id' => $project->id,
                'merged_video_url' => $finalResult['merged video url'] ?? 'unknown'
            ]);

            return $finalResult;

        } catch (\Exception $e) {
            Log::error('❌ Subtitle generation and merging failed', [
                'project_id' => $project->id,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Send render request to video render service
     */
    private function sendRenderRequest(array $videoData): ?array
    {
        try {
            $renderUrl = config('services.video_render.base_url') . config('services.video_render.render_endpoint');

            Log::info('📤 Sending render request', [
                'url' => $renderUrl,
                'video_data_keys' => array_keys($videoData)
            ]);

            $response = Http::withOptions([
                'timeout' => 1200, // 20 minutes timeout
                'verify' => false
            ])->post($renderUrl, $videoData);

            if (!$response->successful()) {
                throw new \Exception('Render request failed: ' . $response->body());
            }

            $responseData = $response->json();
            $renderId = $responseData['jobId'] ?? $responseData['id'] ?? null;

            if (!$renderId) {
                throw new \Exception('No render ID received from render service');
            }

            Log::info('✅ Render request submitted successfully', [
                'render_id' => $renderId
            ]);

            return [
                'id' => $renderId,
                'status' => 'submitted'
            ];

        } catch (\Exception $e) {
            Log::error('❌ Render request failed', [
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Wait for render completion and get final result
     */
    private function waitForRenderCompletion(string $renderId, int $projectId): ?array
    {
        $maxAttempts = 300; // 300 attempts with 7-second wait = 35 minutes max
        $attempt = 0;

        while ($attempt < $maxAttempts) {
            try {
                $statusUrl = config('services.video_render.base_url') . '/status/' . $renderId;
                
                Log::info('🔍 Checking render status', [
                    'attempt' => $attempt + 1,
                    'render_id' => $renderId,
                    'project_id' => $projectId
                ]);

                $response = Http::withOptions([
                    'timeout' => 30,
                    'verify' => false
                ])->get($statusUrl);

                if (!$response->successful()) {
                    throw new \Exception('Status check failed: ' . $response->body());
                }

                $statusData = $response->json();
                $status = $statusData['status'] ?? 'unknown';

                if ($status === 'completed') {
                    $finalUrl = $statusData['remoteUrl']
                        ?? $statusData['publicUrl']
                        ?? $statusData['outputUrl']
                        ?? $statusData['downloadUrl']
                        ?? $statusData['download_url']
                        ?? '';

                    Log::info('✅ Render completed', [
                        'render_id' => $renderId,
                        'project_id' => $projectId,
                        'download_url' => $statusData['downloadUrl'] ?? $statusData['download_url'] ?? 'unknown',
                        'public_url' => $statusData['publicUrl'] ?? $statusData['outputUrl'] ?? $statusData['remoteUrl'] ?? 'unknown',
                        'completed_at' => $statusData['completedAt'] ?? now()->toISOString()
                    ]);

                    return [
                        'merged video url' => $finalUrl,
                        'completed_at' => $statusData['completedAt'] ?? now()->toISOString()
                    ];
                } elseif ($status === 'failed') {
                    throw new \Exception('Render processing failed: ' . ($statusData['error'] ?? 'Unknown error'));
                } else {
                    // Still processing, wait and try again
                    Log::info('⏳ Render still processing', [
                        'render_id' => $renderId,
                        'project_id' => $projectId,
                        'status' => $status
                    ]);
                    
                    sleep(7); // Wait 7 seconds before next check
                    $attempt++;
                }

            } catch (\Exception $e) {
                Log::error('❌ Render status check failed', [
                    'render_id' => $renderId,
                    'project_id' => $projectId,
                    'attempt' => $attempt + 1,
                    'error' => $e->getMessage()
                ]);
                
                // If it's a network error, wait and retry
                if ($attempt < $maxAttempts - 1) {
                    sleep(7);
                    $attempt++;
                    continue;
                } else {
                    throw $e;
                }
            }
        }

        // Timeout reached
        Log::error('⏰ Render timeout reached', [
            'render_id' => $renderId,
            'project_id' => $projectId,
            'max_attempts' => $maxAttempts
        ]);

        return null;
    }
}
