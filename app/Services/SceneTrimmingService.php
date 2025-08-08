<?php

namespace App\Services;

use App\Models\Project;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SceneTrimmingService
{
    /**
     * Trim all scenes for a project following the n8n workflow pattern
     */
    public function trimScenes(Project $project, array $scenesData): array
    {
        try {
            Log::info('✂️ Starting scene trimming workflow', [
                'project_id' => $project->id,
                'scenes_count' => count($scenesData),
                'scenes_ids' => array_column($scenesData, 'scene_id')
            ]);

            $trimmedVideos = [];
            $failedScenes = [];
            $sceneIndex = 0;

            // Loop through each scene (like n8n "Loop Over Items")
            foreach ($scenesData as $sceneData) {
                $sceneIndex++;
                $sceneStartTime = now();
                
                // Force a delay before starting each scene to ensure sequential processing
                if ($sceneIndex > 1) {
                    Log::info("⏸️ Waiting 3 seconds before starting scene {$sceneIndex}", [
                        'scene_index' => $sceneIndex,
                        'previous_scene' => $sceneIndex - 1
                    ]);
                    sleep(3);
                }
                
                Log::info("🎬 Starting scene {$sceneIndex} of " . count($scenesData), [
                    'scene_id' => $sceneData['scene_id'],
                    'scene_index' => $sceneIndex,
                    'total_scenes' => count($scenesData),
                    'start_time' => $sceneStartTime->toISOString(),
                    'video_url' => $sceneData['video_url'],
                    'start_time' => $sceneData['start_time'],
                    'end_time' => $sceneData['end_time']
                ]);

                try {
                    // Step 1: POST to trim endpoint (like n8n "Request Video Trim1")
                    $trimmedVideo = $this->processSingleScene($sceneData);
                    
                    $sceneEndTime = now();
                    $processingDuration = $sceneStartTime->diffInSeconds($sceneEndTime);
                    
                    if ($trimmedVideo) {
                        $trimmedVideos[] = [
                            'scene_id' => $sceneData['scene_id'],
                            'video_url' => $trimmedVideo['url']
                        ];
                        
                        Log::info("✅ Scene {$sceneIndex} completed successfully", [
                            'scene_id' => $sceneData['scene_id'],
                            'scene_index' => $sceneIndex,
                            'trimmed_url' => $trimmedVideo['url'],
                            'completed_scenes' => count($trimmedVideos),
                            'remaining_scenes' => count($scenesData) - $sceneIndex,
                            'processing_duration_seconds' => $processingDuration,
                            'start_time' => $sceneStartTime->toISOString(),
                            'end_time' => $sceneEndTime->toISOString()
                        ]);
                    } else {
                        $failedScenes[] = $sceneData['scene_id'];
                        Log::error("❌ Scene {$sceneIndex} failed", [
                            'scene_id' => $sceneData['scene_id'],
                            'scene_index' => $sceneIndex,
                            'processing_duration_seconds' => $processingDuration
                        ]);
                    }

                } catch (\Exception $e) {
                    $sceneEndTime = now();
                    $processingDuration = $sceneStartTime->diffInSeconds($sceneEndTime);
                    
                    Log::error("❌ Scene {$sceneIndex} processing failed", [
                        'scene_id' => $sceneData['scene_id'],
                        'scene_index' => $sceneIndex,
                        'error' => $e->getMessage(),
                        'processing_duration_seconds' => $processingDuration
                    ]);
                    $failedScenes[] = $sceneData['scene_id'];
                }

                // Log progress after each scene
                Log::info("📊 Progress update after scene {$sceneIndex}", [
                    'project_id' => $project->id,
                    'scene_index' => $sceneIndex,
                    'total_scenes' => count($scenesData),
                    'completed_scenes' => count($trimmedVideos),
                    'failed_scenes' => count($failedScenes),
                    'success_rate' => round((count($trimmedVideos) / $sceneIndex) * 100, 2) . '%'
                ]);
            }

            // Step 2: Collect all results (like n8n "Code5")
            $result = [
                'all_videos' => $trimmedVideos,
                'total' => count($trimmedVideos),
                'collected_at' => now()->toISOString(),
                'failed_scenes' => $failedScenes
            ];

            Log::info('✅ Scene trimming workflow completed', [
                'project_id' => $project->id,
                'successful_trims' => count($trimmedVideos),
                'failed_trims' => count($failedScenes),
                'total_scenes_processed' => count($scenesData),
                'success_rate' => round((count($trimmedVideos) / count($scenesData)) * 100, 2) . '%',
                'result' => $result
            ]);

            return $result;

        } catch (\Exception $e) {
            Log::error('❌ Scene trimming workflow failed', [
                'project_id' => $project->id,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Process a single scene: POST to trim, get request ID, poll status until completed
     */
    private function processSingleScene(array $sceneData): ?array
    {
        $processStartTime = now();
        
        try {
            Log::info('📤 Initiating trim request for scene', [
                'scene_id' => $sceneData['scene_id'],
                'video_url' => $sceneData['video_url'],
                'start_time' => $sceneData['start_time'],
                'end_time' => $sceneData['end_time'],
                'process_start_time' => $processStartTime->toISOString()
            ]);

            // Step 1: POST to trim endpoint (like n8n "Request Video Trim1")
            $trimUrl = config('services.video_trim.base_url') . config('services.video_trim.trim_endpoint');
            
            $requestData = [
                'videoUrl' => $sceneData['video_url'],
                'start' => sprintf('%02d:%02d:%02d', 
                    floor($sceneData['start_time'] / 3600),
                    floor(($sceneData['start_time'] % 3600) / 60),
                    $sceneData['start_time'] % 60
                ),
                'duration' => sprintf('%02d:%02d:%02d', 
                    floor(($sceneData['end_time'] - $sceneData['start_time']) / 3600),
                    floor((($sceneData['end_time'] - $sceneData['start_time']) % 3600) / 60),
                    ($sceneData['end_time'] - $sceneData['start_time']) % 60
                )
            ];

            Log::info('📤 Sending trim request', [
                'scene_id' => $sceneData['scene_id'],
                'url' => $trimUrl,
                'request_data' => $requestData
            ]);

            $response = Http::withOptions([
                'timeout' => 300, // 5 minutes timeout
                'verify' => false
            ])->post($trimUrl, $requestData);

            if (!$response->successful()) {
                throw new \Exception('Trim request failed: ' . $response->body());
            }

            $responseData = $response->json();
            $requestId = $responseData['requestId'] ?? $responseData['id'] ?? null;

            if (!$requestId) {
                throw new \Exception('No request ID received from trim service');
            }

            Log::info('⏳ Trim request submitted successfully', [
                'scene_id' => $sceneData['scene_id'],
                'request_id' => $requestId,
                'response_data' => $responseData
            ]);

            // Step 2: Poll status until completed (like n8n "Wait for Processing" + "Check Trim Status" + "Check If Completed")
            Log::info('🔄 Starting status polling for scene', [
                'scene_id' => $sceneData['scene_id'],
                'request_id' => $requestId
            ]);

            $result = $this->waitForTrimCompletion($requestId, $sceneData['scene_id']);

            $processEndTime = now();
            $totalProcessingTime = $processStartTime->diffInSeconds($processEndTime);
            
            if ($result) {
                Log::info('✅ Scene processing completed successfully', [
                    'scene_id' => $sceneData['scene_id'],
                    'request_id' => $requestId,
                    'final_url' => $result['url'],
                    'process_start_time' => $processStartTime->toISOString(),
                    'process_end_time' => $processEndTime->toISOString(),
                    'total_processing_seconds' => $totalProcessingTime
                ]);
            } else {
                Log::error('❌ Scene processing failed or timed out', [
                    'scene_id' => $sceneData['scene_id'],
                    'request_id' => $requestId,
                    'process_start_time' => $processStartTime->toISOString(),
                    'process_end_time' => $processEndTime->toISOString(),
                    'total_processing_seconds' => $totalProcessingTime
                ]);
            }

            return $result;

        } catch (\Exception $e) {
            $processEndTime = now();
            $totalProcessingTime = $processStartTime->diffInSeconds($processEndTime);
            
            Log::error('❌ Single scene processing failed', [
                'scene_id' => $sceneData['scene_id'],
                'error' => $e->getMessage(),
                'process_start_time' => $processStartTime->toISOString(),
                'process_end_time' => $processEndTime->toISOString(),
                'total_processing_seconds' => $totalProcessingTime
            ]);
            return null;
        }
    }

    /**
     * Wait for trim completion and get result (like n8n polling loop)
     */
    private function waitForTrimCompletion(string $requestId, string $sceneId): ?array
    {
        $maxAttempts = 30; // 30 attempts with 7-second wait = 3.5 minutes max
        $attempt = 0;

        Log::info('🔄 Starting polling loop for scene', [
            'scene_id' => $sceneId,
            'request_id' => $requestId,
            'max_attempts' => $maxAttempts
        ]);

        while ($attempt < $maxAttempts) {
            try {
                // Step 3: Check status (like n8n "Check Trim Status")
                $statusUrl = config('services.video_trim.base_url') . config('services.video_trim.status_endpoint') . '/' . $requestId;
                
                Log::info('🔍 Checking trim status', [
                    'attempt' => $attempt + 1,
                    'request_id' => $requestId,
                    'scene_id' => $sceneId,
                    'status_url' => $statusUrl
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

                Log::info('📊 Status response received', [
                    'scene_id' => $sceneId,
                    'request_id' => $requestId,
                    'attempt' => $attempt + 1,
                    'status' => $status,
                    'status_data' => $statusData
                ]);

                // Step 4: Check if completed (like n8n "Check If Completed")
                if ($status === 'completed') {
                    $downloadUrl = $statusData['url'] ?? $statusData['download_url'] ?? null;
                    
                    if (!$downloadUrl) {
                        throw new \Exception('No download URL found in completed response');
                    }

                    // Check if this was completed immediately (first attempt)
                    $isImmediateCompletion = ($attempt === 0);
                    
                    Log::info('✅ Trim completed', [
                        'request_id' => $requestId,
                        'scene_id' => $sceneId,
                        'download_url' => $downloadUrl,
                        'total_attempts' => $attempt + 1,
                        'is_immediate_completion' => $isImmediateCompletion,
                        'processing_time_seconds' => $isImmediateCompletion ? 'immediate' : ($attempt + 1) * 7
                    ]);

                    return [
                        'url' => $downloadUrl,
                        'request_id' => $requestId,
                        'status' => 'completed'
                    ];
                } elseif ($status === 'failed') {
                    throw new \Exception('Trim processing failed: ' . ($statusData['error'] ?? 'Unknown error'));
                } else {
                    // Still processing, wait and try again (like n8n "Wait for Processing")
                    Log::info('⏳ Trim still processing', [
                        'request_id' => $requestId,
                        'scene_id' => $sceneId,
                        'status' => $status,
                        'attempt' => $attempt + 1,
                        'waiting_seconds' => 7
                    ]);
                    
                    sleep(7); // Wait 7 seconds before next check (like n8n wait node)
                    $attempt++;
                }

            } catch (\Exception $e) {
                Log::error('❌ Status check failed', [
                    'request_id' => $requestId,
                    'scene_id' => $sceneId,
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
        Log::error('⏰ Trim timeout reached', [
            'request_id' => $requestId,
            'scene_id' => $sceneId,
            'max_attempts' => $maxAttempts
        ]);

        return null;
    }
}
