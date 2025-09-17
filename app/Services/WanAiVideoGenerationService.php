<?php

namespace App\Services;

use App\Models\Scene;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WanAiVideoGenerationService
{
    /**
     * Generate video using WAN AI
     */
    public function generateVideo(Scene $scene, string $prompt, string $model = 'wan2.2-t2v-plus', string $resolution = '1920*1080', string $generationType = 'text-to-video', ?string $imageUrl = null): array
    {
        try {
            Log::info('🤖 Starting WAN AI video generation', [
                'scene_id' => $scene->id,
                'model' => $model,
                'resolution' => $resolution,
                'generation_type' => $generationType,
                'image_url' => $imageUrl,
                'image_url_type' => gettype($imageUrl),
                'image_url_empty' => empty($imageUrl),
                'prompt_length' => strlen($prompt)
            ]);

            // Check if API key is configured
            $apiKey = config('services.wan_ai.api_key');
            if (empty($apiKey)) {
                throw new \Exception('WAN AI API key is not configured. Please add WAN_AI_API_KEY to your .env file.');
            }

            // Validate model and resolution
            $this->validateModelAndResolution($model, $resolution);

            // Prepare the request data
            $requestData = $this->prepareRequestData($prompt, $model, $resolution, $generationType, $imageUrl);

            // Send the generation request
            $response = $this->sendGenerationRequest($requestData);

            $taskId = $response['task_id'] ?? null;

            if (!$taskId) {
                throw new \Exception('No task ID received from WAN AI service');
            }

            Log::info('⏳ Video generation request submitted', [
                'scene_id' => $scene->id,
                'task_id' => $taskId
            ]);

            // Store task ID in scene for polling
            Log::info('💾 Updating scene with task ID', [
                'scene_id' => $scene->id,
                'task_id' => $taskId
            ]);
            
            $scene->update([
                'status' => 'processing',
                'job_id' => $taskId
            ]);
            
            Log::info('✅ Scene updated successfully', [
                'scene_id' => $scene->id,
                'status' => $scene->status,
                'job_id' => $scene->job_id
            ]);

            return [
                'success' => true,
                'task_id' => $taskId,
                'status' => 'PENDING',
                'message' => 'Video generation started successfully'
            ];

        } catch (\Exception $e) {
            Log::error('❌ WAN AI video generation failed', [
                'scene_id' => $scene->id,
                'error' => $e->getMessage()
            ]);

            // Update scene status to failed
            $scene->update(['status' => 'failed']);

            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Check the status of a video generation task
     */
    public function checkTaskStatus(string $taskId): ?array
    {
        try {
            $apiKey = config('services.wan_ai.api_key');
            $statusUrl = config('services.wan_ai.task_status_url') . '/' . $taskId;

            Log::info('🔍 Checking WAN AI task status', [
                'task_id' => $taskId
            ]);

            $response = Http::withOptions([
                'timeout' => 30,
                'verify' => false
            ])->withHeaders([
                'Authorization' => 'Bearer ' . $apiKey,
                'Content-Type' => 'application/json'
            ])->get($statusUrl);

            if (!$response->successful()) {
                throw new \Exception('Status check failed: ' . $response->body());
            }

            $responseData = $response->json();
            $taskStatus = $responseData['output']['task_status'] ?? 'UNKNOWN';

            Log::info('📊 WAN AI task status response', [
                'task_id' => $taskId,
                'status' => $taskStatus,
                'response_keys' => array_keys($responseData)
            ]);

            if ($taskStatus === 'SUCCEEDED') {
                $videoUrl = $responseData['output']['video_url'] ?? null;
                
                if (!$videoUrl) {
                    throw new \Exception('No video URL received from WAN AI service');
                }

                Log::info('✅ WAN AI video generation completed', [
                    'task_id' => $taskId,
                    'video_url' => $videoUrl
                ]);

                return [
                    'status' => 'SUCCEEDED',
                    'video_url' => $videoUrl,
                    'task_data' => $responseData['output']
                ];
            } elseif ($taskStatus === 'FAILED') {
                $errorCode = $responseData['output']['code'] ?? 'Unknown';
                $errorMessage = $responseData['output']['message'] ?? 'Unknown error';

                Log::error('❌ WAN AI video generation failed', [
                    'task_id' => $taskId,
                    'error_code' => $errorCode,
                    'error_message' => $errorMessage
                ]);

                return [
                    'status' => 'FAILED',
                    'error_code' => $errorCode,
                    'error_message' => $errorMessage
                ];
            } else {
                // Still processing (PENDING, RUNNING)
                return [
                    'status' => $taskStatus,
                    'message' => 'Video generation in progress'
                ];
            }

        } catch (\Exception $e) {
            Log::error('❌ WAN AI status check failed', [
                'task_id' => $taskId,
                'error' => $e->getMessage()
            ]);

            return [
                'status' => 'ERROR',
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Update scene with generated video URL
     */
    public function updateSceneWithVideo(Scene $scene, string $videoUrl): bool
    {
        try {
            $scene->update([
                'video_url' => $videoUrl,
                'status' => 'completed',
                'job_id' => null // Clear job ID since task is complete
            ]);

            Log::info('✅ Scene updated with AI-generated video', [
                'scene_id' => $scene->id,
                'video_url' => $videoUrl
            ]);

            return true;

        } catch (\Exception $e) {
            Log::error('❌ Failed to update scene with video', [
                'scene_id' => $scene->id,
                'video_url' => $videoUrl,
                'error' => $e->getMessage()
            ]);

            return false;
        }
    }

    /**
     * Validate model and resolution combination
     */
    private function validateModelAndResolution(string $model, string $resolution): void
    {
        $models = config('services.wan_ai.models');
        
        if (!isset($models[$model])) {
            throw new \Exception("Invalid model: {$model}");
        }

        $supportedResolutions = $models[$model]['resolutions'];
        
        if (!in_array($resolution, $supportedResolutions)) {
            throw new \Exception("Resolution {$resolution} not supported for model {$model}");
        }
    }

    /**
     * Prepare request data for WAN AI API
     */
    private function prepareRequestData(string $prompt, string $model, string $resolution, string $generationType = 'text-to-video', ?string $imageUrl = null): array
    {
        // Enhance the prompt with cinematic quality instructions
        $enhancedPrompt = $this->enhancePrompt($prompt);

        $requestData = [
            'model' => $model,
            'parameters' => [
                'size' => $resolution,
                'prompt_extend' => true,
                'watermark' => false
            ]
        ];

        if ($generationType === 'image-to-video') {
            // Image-to-video request format
            Log::info('🖼️ Preparing image-to-video request', [
                'image_url' => $imageUrl,
                'image_url_type' => gettype($imageUrl),
                'image_url_empty' => empty($imageUrl)
            ]);
            
            $requestData['input'] = [
                'prompt' => $enhancedPrompt,
                'img_url' => $imageUrl,
                'negative_prompt' => 'text, logo, distortion, glitch, low quality, poor lighting, artifacts, watermark, blurry, pixelated'
            ];
            
            // For image-to-video, keep size parameter (not resolution)
            // The API expects size in format like "720*1280"
        } else {
            // Text-to-video request format
            $requestData['input'] = [
                'prompt' => $enhancedPrompt,
                'negative_prompt' => 'text, logo, distortion, glitch, low quality, poor lighting, artifacts, watermark, blurry, pixelated'
            ];
        }

        return $requestData;
    }

    /**
     * Enhance the prompt with cinematic quality instructions
     */
    private function enhancePrompt(string $prompt): string
    {
        // Add cinematic quality enhancements if not already present
        $cinematicKeywords = ['cinematic', 'professional', 'high quality', '4k', 'hd', 'smooth', 'elegant'];
        $hasCinematicKeywords = false;

        foreach ($cinematicKeywords as $keyword) {
            if (stripos($prompt, $keyword) !== false) {
                $hasCinematicKeywords = true;
                break;
            }
        }

        if (!$hasCinematicKeywords) {
            $prompt .= ', cinematic quality, professional lighting, smooth motion, high definition';
        }

        // Ensure prompt doesn't exceed 800 characters
        if (strlen($prompt) > 800) {
            $prompt = substr($prompt, 0, 797) . '...';
        }

        return $prompt;
    }

    /**
     * Send generation request to WAN AI API
     */
    private function sendGenerationRequest(array $requestData): ?array
    {
        try {
            $apiKey = config('services.wan_ai.api_key');
            $baseUrl = config('services.wan_ai.base_url');

            if (!$apiKey) {
                throw new \Exception('WAN AI API key not configured');
            }

            Log::info('📤 Sending WAN AI generation request', [
                'url' => $baseUrl,
                'model' => $requestData['model'],
                'parameters' => $requestData['parameters'],
                'input' => $requestData['input'],
                'full_request' => $requestData
            ]);

            $response = Http::withOptions([
                'timeout' => 120,
                'verify' => false
            ])->withHeaders([
                'X-DashScope-Async' => 'enable',
                'Authorization' => 'Bearer ' . $apiKey,
                'Content-Type' => 'application/json'
            ])->post($baseUrl, $requestData);

            if (!$response->successful()) {
                $errorBody = $response->json();
                $errorCode = $errorBody['code'] ?? 'Unknown';
                $errorMessage = $errorBody['message'] ?? $response->body();
                
                // Handle specific WAN AI API errors based on documentation
                switch ($errorCode) {
                    case 'InvalidApiKey':
                        throw new \Exception('Invalid WAN AI API key. Please check your configuration.');
                    case 'InvalidParameter':
                        throw new \Exception('Invalid parameters: ' . $errorMessage);
                    case 'QuotaExceeded':
                        throw new \Exception('WAN AI quota exceeded. Please try again later.');
                    default:
                        throw new \Exception('WAN AI API error (' . $errorCode . '): ' . $errorMessage);
                }
            }

            $responseData = $response->json();
            
            // Check for error in response
            if (isset($responseData['code']) && $responseData['code'] !== 'Success') {
                throw new \Exception('WAN AI API error: ' . ($responseData['message'] ?? 'Unknown error'));
            }
            
            $taskId = $responseData['output']['task_id'] ?? null;

            if (!$taskId) {
                throw new \Exception('No task ID received from WAN AI service');
            }

            Log::info('✅ WAN AI generation request submitted successfully', [
                'task_id' => $taskId
            ]);

            return [
                'task_id' => $taskId,
                'status' => 'submitted'
            ];

        } catch (\Exception $e) {
            Log::error('❌ WAN AI generation request failed', [
                'error' => $e->getMessage(),
                'url' => $baseUrl ?? 'not set',
                'api_key_configured' => !empty($apiKey)
            ]);
            
            // Re-throw the exception with more context
            throw new \Exception('WAN AI API request failed: ' . $e->getMessage());
        }
    }

    /**
     * Get available models and their configurations
     */
    public function getAvailableModels(): array
    {
        return config('services.wan_ai.models', []);
    }

    /**
     * Get resolutions for a specific model
     */
    public function getResolutionsForModel(string $model): array
    {
        $models = config('services.wan_ai.models');
        return $models[$model]['resolutions'] ?? [];
    }

}
