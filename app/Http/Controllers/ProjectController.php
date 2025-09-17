<?php

namespace App\Http\Controllers;

use App\Jobs\GenerateScenesFromVoiceJob;

use App\Models\Project;
use App\Models\Scene;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use GuzzleHttp\Client;
use Illuminate\Support\Arr;


class ProjectController extends Controller
{
    public function create()
    {
        return view('projects.create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:product,service',
            'category' => 'required|string|max:255',
            'description' => 'required|string|max:2000',
            'language' => 'required|string|max:50',
            'video_format' => 'required|array|min:1',
            'video_format.*' => 'in:16:9,1:1,9:16,all',
            'script_option' => 'required|in:paste,generate',
            'custom_script' => 'required_if:script_option,paste|nullable|string|max:5000',
            'voiceover_option' => 'required|in:upload,ai,none',
            'voiceover_file' => 'required_if:voiceover_option,upload|nullable|file|mimes:mp3,wav|max:10240'
        ]);

        // Handle voiceover file upload
        $voiceoverPath = null;
        if ($request->hasFile('voiceover_file')) {
            $voiceoverPath = $request->file('voiceover_file')->store('voiceovers', 'public');
        }

        // Process video format - if "all" is selected, expand to all formats
        $videoFormats = $validated['video_format'];
        if (in_array('all', $videoFormats)) {
            $videoFormats = ['16:9', '1:1', '9:16'];
        }

        // Create project
        $project = Project::create([
            'user_id' => Auth::id(),
            'name' => $validated['name'],
            'type' => $validated['type'],
            'category' => $validated['category'],
            'description' => $validated['description'],
            'language' => $validated['language'],
            'video_format' => $videoFormats,
            'script_option' => $validated['script_option'],
            'custom_script' => $validated['custom_script'] ?? null,
            'voiceover_option' => $validated['voiceover_option'],
            'voiceover_file' => $voiceoverPath,
            'status' => 'processing'
        ]);

        // Call n8n webhook based on voiceover option
        if ($validated['voiceover_option'] === 'upload' && $voiceoverPath) {
            // If user uploaded voiceover, send request immediately and show processing page
            logger()->info('🎵 Processing project with uploaded voiceover', [
                'project_id' => $project->id,
                'project_name' => $project->name,
                'voiceover_file' => $voiceoverPath,
                'file_exists' => Storage::disk('public')->exists($voiceoverPath),
                'file_size' => Storage::disk('public')->exists($voiceoverPath) ? Storage::disk('public')->size($voiceoverPath) : 'N/A'
            ]);

            // Set processing started timestamp and dispatch the job
            $project->update(['processing_started_at' => now()]);

            logger()->info('🚀 Dispatching GenerateScenesFromVoiceJob', [
                'project_id' => $project->id,
                'queue_connection' => config('queue.default')
            ]);

            GenerateScenesFromVoiceJob::dispatch($project);

            logger()->info('✅ Job dispatched successfully', [
                'project_id' => $project->id
            ]);

            return redirect()->route('projects.processing', $project->id)
                ->with('success', 'Your scenes are being generated! Please wait...');
        } else {
            // Original workflow for AI-generated voiceover or no voiceover
            $this->triggerVideoGeneration($project);

            return redirect()->route('projects.processing', $project->id)
                ->with('success', 'Your video generation request has been submitted!');
        }
    }

    public function processing(Project $project)
    {
        $this->authorize('view', $project);

        logger()->info('📄 Processing page accessed', [
            'project_id' => $project->id,
            'project_status' => $project->status,
            'user_id' => auth()->id()
        ]);

        return view('projects.processing', compact('project'));
    }

    public function review(Project $project)
    {
        $this->authorize('view', $project);
        
        if (!in_array($project->status, ['reviewing', 'subtitle_selection'])) {
            return redirect()->route('dashboard')
                ->with('error', 'Project is not ready for review.');
        }

        $scenes = $project->scenes()->orderBy('scene_number')->get();
        
        return view('projects.review', compact('project', 'scenes'));
    }

    public function regenerateScene(Request $request, Project $project, Scene $scene)
    {
        $this->authorize('update', $project);
        
        $scene->update(['status' => 'regenerating']);
        
        // Call n8n API to regenerate scene
        $this->triggerSceneRegeneration($project, $scene);
        
        return back()->with('success', 'Scene regeneration started!');
    }

    public function updateScene(Request $request, Scene $scene)
    {
        logger()->info('🔄 Scene update request received', [
            'scene_id' => $scene->id,
            'video_url' => $request->video_url,
            'keywords' => $request->keywords,
            'user_id' => auth()->id()
        ]);

        // Validate the request
        $request->validate([
            'video_url' => 'required|url',
            'keywords' => 'nullable|string'
        ]);

        try {
            // Update the scene
            $scene->update([
                'video_url' => $request->video_url,
                'keywords' => $request->keywords
            ]);

            logger()->info('✅ Scene updated successfully', [
                'scene_id' => $scene->id,
                'new_video_url' => $request->video_url
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Scene updated successfully',
                'scene_id' => $scene->id,
                'video_url' => $scene->video_url,
                'keywords' => $scene->keywords
            ]);

        } catch (\Exception $e) {
            logger()->error('❌ Scene update failed', [
                'scene_id' => $scene->id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update scene: ' . $e->getMessage()
            ], 500);
        }
    }

    public function regenerateSceneProxy(Request $request, Scene $scene)
    {
        logger()->info('🔄 Scene regeneration proxy request', [
            'scene_id' => $scene->id,
            'regeneration_option' => $request->regeneration_option,
            'keywords' => $request->keywords,
            'user_id' => auth()->id()
        ]);

        // Validate the request
        $request->validate([
            'regeneration_option' => 'required|in:pexels,ai',
            'keywords' => 'required|string',
            'ai_prompt' => 'nullable|string',
            'ai_model' => 'nullable|string',
            'ai_resolution' => 'nullable|string'
        ]);

        try {
            // Handle AI generation differently
            if ($request->regeneration_option === 'ai') {
                return $this->handleAiGeneration($request, $scene);
            }

            // Prepare data for Pexels regeneration
            // Convert keywords string to array (split on ; , Arabic comma ، and new lines)
            $keywordsArray = preg_split('/[;,،\n\r]+/u', (string) $request->keywords);
            $keywordsArray = array_values(array_filter(array_map(function($k){
                $k = trim($k);
                // Remove surrounding quotes and extra punctuation
                $k = trim($k, "\"' \t\n\r\0\x0B");
                return $k;
            }, $keywordsArray ?? []), fn($k) => $k !== ''));

            $webhookData = [
                'regeneration_option' => $request->regeneration_option,
                'scene_video_url' => $scene->video_url,
                'keywords' => $keywordsArray // Send as array
            ];

            logger()->info('🌐 Sending request to n8n regenerate webhook', [
                'webhook_data' => $webhookData,
                'keywords_array' => $keywordsArray,
                'keywords_count' => count($keywordsArray),
                'url' => config('services.n8n.regenerate_url')
            ]);

            // Use the new SceneRegenerationService
            $sceneRegenerationService = new \App\Services\SceneRegenerationService();
            $responseData = $sceneRegenerationService->regenerateScene($scene, $request->regeneration_option, $keywordsArray);

            logger()->info('📡 Scene regeneration response', [
                'response_data' => $responseData
            ]);

            if ($responseData && isset($responseData['success']) && $responseData['success']) {

                // Check if we got a new video URL
                if (isset($responseData['new_video_url']) && !empty($responseData['new_video_url'])) {
                    // Use new keywords from response if available, otherwise use original keywords
                    $finalKeywords = $request->keywords; // Default to original keywords string

                    if (isset($responseData['new_keywords']) && is_array($responseData['new_keywords'])) {
                        $finalKeywords = implode('; ', $responseData['new_keywords']);
                    }

                    // Get new prompt if available
                    $finalPrompt = $responseData['new_prompt'] ?? null;

                    logger()->info('🔄 Updating scene in database', [
                        'scene_id' => $scene->id,
                        'old_video_url' => $scene->video_url,
                        'new_video_url' => $responseData['new_video_url'],
                        'old_keywords' => $scene->keywords,
                        'new_keywords' => $finalKeywords,
                        'old_prompt' => $scene->prompt,
                        'new_prompt' => $finalPrompt,
                        'has_new_prompt' => $finalPrompt !== null
                    ]);

                    // Update the scene - ALWAYS update even if keywords are the same
                    $updateData = [
                        'video_url' => $responseData['new_video_url'],
                        'keywords' => $finalKeywords
                    ];

                    // Add prompt if available
                    if ($finalPrompt !== null) {
                        $updateData['prompt'] = $finalPrompt;
                    }

                    $scene->update($updateData);

                    logger()->info('✅ Scene regenerated successfully', [
                        'scene_id' => $scene->id,
                        'new_video_url' => $responseData['new_video_url'],
                        'database_updated' => true
                    ]);

                    $responseJson = [
                        'success' => true,
                        'message' => 'Scene regenerated successfully',
                        'new_video_url' => $responseData['new_video_url'],
                        'new_keywords' => $finalKeywords,
                        'scene_id' => $scene->id,
                        'database_updated' => true
                    ];

                    // Add prompt if available
                    if ($finalPrompt !== null) {
                        $responseJson['new_prompt'] = $finalPrompt;
                    }

                    return response()->json($responseJson);
                } else {
                    logger()->error('❌ No new_video_url in n8n response', [
                        'response' => $responseData,
                        'has_new_video_url' => isset($responseData['new_video_url']),
                        'new_video_url_value' => $responseData['new_video_url'] ?? 'not_set'
                    ]);

                    return response()->json([
                        'success' => false,
                        'message' => 'n8n did not return a new video URL',
                        'debug_response' => $responseData
                    ], 422);
                }
            } else {
                logger()->error('❌ Scene regeneration failed', [
                    'scene_id' => $scene->id,
                    'response_data' => $responseData
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Failed to regenerate scene'
                ], 500);
            }

        } catch (\Exception $e) {
            logger()->error('❌ Scene regeneration proxy failed', [
                'scene_id' => $scene->id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Regeneration failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Handle AI video generation using WAN AI
     */
    private function handleAiGeneration(Request $request, Scene $scene)
    {
        try {
            logger()->info('🤖 Starting AI video generation', [
                'scene_id' => $scene->id,
                'ai_prompt' => $request->ai_prompt,
                'ai_model' => $request->ai_model,
                'ai_resolution' => $request->ai_resolution
            ]);

            // Validate AI parameters
            $aiPrompt = $request->ai_prompt ?: $request->keywords;
            $aiModel = $request->ai_model ?: 'wan2.2-t2v-plus';
            $aiResolution = $request->ai_resolution ?: '1920*1080';

            if (empty($aiPrompt)) {
                return response()->json([
                    'success' => false,
                    'message' => 'AI prompt is required for AI generation'
                ], 422);
            }

            // Dispatch WAN AI generation job to queue
            $job = new \App\Jobs\WanAiVideoGenerationJob($scene, $aiPrompt, $aiModel, $aiResolution);
            dispatch($job);

            logger()->info('✅ AI video generation job dispatched successfully', [
                'scene_id' => $scene->id,
                'prompt' => $aiPrompt,
                'model' => $aiModel,
                'resolution' => $aiResolution
            ]);

            return response()->json([
                'success' => true,
                'message' => 'AI video generation job queued successfully',
                'status' => 'QUEUED',
                'scene_id' => $scene->id,
                'polling_required' => true
            ]);

        } catch (\Exception $e) {
            logger()->error('❌ AI generation handler failed', [
                'scene_id' => $scene->id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'AI generation failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check AI video generation status
     */
    public function checkAiGenerationStatus(Scene $scene)
    {
        try {
            // Check if scene is still processing (job might still be running)
            if ($scene->status === 'processing' && !$scene->job_id) {
                return response()->json([
                    'success' => true,
                    'status' => 'PROCESSING',
                    'message' => 'AI video generation job is running...',
                    'progress' => 25
                ]);
            }

            if (!$scene->job_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'No AI generation task found for this scene'
                ], 404);
            }

            $wanAiService = new \App\Services\WanAiVideoGenerationService();
            $status = $wanAiService->checkTaskStatus($scene->job_id);

            // Handle different WAN AI status values based on documentation
            switch ($status['status']) {
                case 'SUCCEEDED':
                    // Update scene with the generated video
                    $wanAiService->updateSceneWithVideo($scene, $status['video_url']);

                    return response()->json([
                        'success' => true,
                        'status' => 'SUCCEEDED',
                        'video_url' => $status['video_url'],
                        'message' => 'AI video generation completed successfully'
                    ]);

                case 'FAILED':
                    // Update scene status to failed
                    $scene->update(['status' => 'failed']);

                    return response()->json([
                        'success' => false,
                        'status' => 'FAILED',
                        'message' => 'AI video generation failed: ' . ($status['error_message'] ?? 'Unknown error')
                    ]);

                case 'CANCELED':
                    // Update scene status to pending (can retry)
                    $scene->update(['status' => 'pending', 'job_id' => null]);

                    return response()->json([
                        'success' => false,
                        'status' => 'CANCELED',
                        'message' => 'AI video generation was canceled'
                    ]);

                case 'UNKNOWN':
                    // Task expired (24 hours), update scene status
                    $scene->update(['status' => 'failed', 'job_id' => null]);

                    return response()->json([
                        'success' => false,
                        'status' => 'UNKNOWN',
                        'message' => 'AI video generation task expired (24 hours)'
                    ]);

                case 'PENDING':
                case 'RUNNING':
                default:
                    // Still processing - provide progress information
                    $progressMessage = $this->getProgressMessage($status['status']);
                    
                    return response()->json([
                        'success' => true,
                        'status' => $status['status'],
                        'message' => $progressMessage,
                        'progress' => $this->getProgressPercentage($status['status'])
                    ]);
            }

        } catch (\Exception $e) {
            logger()->error('❌ AI status check failed', [
                'scene_id' => $scene->id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to check AI generation status: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get progress message for AI generation status
     */
    private function getProgressMessage(string $status): string
    {
        switch ($status) {
            case 'PENDING':
                return 'AI video generation request submitted and waiting to start...';
            case 'RUNNING':
                return 'AI is generating your video. This may take 2-5 minutes...';
            default:
                return 'AI video generation in progress...';
        }
    }

    /**
     * Get progress percentage for AI generation status
     */
    private function getProgressPercentage(string $status): int
    {
        switch ($status) {
            case 'PENDING':
                return 10;
            case 'RUNNING':
                return 50;
            default:
                return 25;
        }
    }

    public function approveScenes(Request $request, Project $project)
    {
        $this->authorize('update', $project);

        $sceneIds = $request->input('approved_scenes', []);

        $project->scenes()->update(['approved' => false]);
        $project->scenes()->whereIn('id', $sceneIds)->update(['approved' => true]);

        $project->update(['status' => 'completed']);

        return redirect()->route('projects.final', $project->id)
            ->with('success', 'Scenes approved! Your video is ready.');
    }

    public function processingStatus(Project $project)
    {
        $this->authorize('view', $project);

        $status = $project->status;
        $processingStarted = $project->processing_started_at;
        $processingCompleted = $project->processing_completed_at;
        $errorMessage = $project->error_message;

        // Calculate processing duration
        $processingDuration = null;
        if ($processingStarted) {
            $endTime = $processingCompleted ?? now();
            $processingDuration = $processingStarted->diffInSeconds($endTime);
        }

        // Calculate progress based on status
        $progress = $this->calculateProgress($project);

        $response = [
            'status' => $status,
            'processing_started_at' => $processingStarted?->toISOString(),
            'processing_completed_at' => $processingCompleted?->toISOString(),
            'processing_duration' => $processingDuration,
            'error_message' => $errorMessage,
            'progress' => $progress,
            'status_message' => $this->getStatusMessage($status),
            'is_completed' => in_array($status, ['reviewing', 'subtitle_selection', 'completed', 'trim_failed', 'failed']),
            'can_retry' => $status === 'failed'
        ];

        // Add redirect URL based on status
        if ($status === 'reviewing') {
            $response['redirect_url'] = route('projects.review', $project);
        } elseif ($status === 'subtitle_selection') {
            $response['redirect_url'] = route('projects.subtitle-styles', $project);
        } elseif ($status === 'completed') {
            $response['redirect_url'] = route('projects.final', $project);
        } elseif ($status === 'failed') {
            $response['redirect_url'] = route('projects.create');
        }

        return response()->json($response);
    }

    /**
     * Calculate progress percentage based on project status
     */
    private function calculateProgress(Project $project): int
    {
        switch ($project->status) {
            case 'processing':
                return 25; // Initial processing
            case 'reviewing':
                return 50; // Scenes generated, ready for review
            case 'subtitle_selection':
                return 75; // Scenes confirmed, ready for subtitles
            case 'subtitle_generating':
                return 85; // Subtitle generation in progress
            case 'completed':
                return 100; // Final video ready
            case 'failed':
                return 0; // Failed, no progress
            default:
                return 0;
        }
    }

    /**
     * Get human-readable status message
     */
    private function getStatusMessage(string $status): string
    {
        switch ($status) {
            case 'processing':
                return 'Generating scenes from your voiceover...';
            case 'reviewing':
                return 'Scenes generated! Review and customize your video...';
            case 'subtitle_selection':
                return 'Scenes confirmed! Ready to add subtitles...';
            case 'subtitle_generating':
                return 'Generating subtitles and merging videos...';
            case 'completed':
                return 'Video completed! Your video is ready to download.';
            case 'failed':
                return 'Processing failed. Please try again.';
            default:
                return 'Processing...';
        }
    }

    /**
     * Retry a failed project
     */
    public function retryProject(Project $project)
    {
        $this->authorize('update', $project);

        if ($project->status !== 'failed') {
            return response()->json([
                'success' => false,
                'message' => 'Only failed projects can be retried.'
            ], 400);
        }

        try {
            // Reset project status
            $project->update([
                'status' => 'processing',
                'processing_started_at' => now(),
                'processing_completed_at' => null,
                'error_message' => null
            ]);

            // Dispatch the job again
            if ($project->voiceover_option === 'upload' && $project->voiceover_file) {
                GenerateScenesFromVoiceJob::dispatch($project);
            } else {
                // For AI/no voiceover projects, trigger video generation
                $this->triggerVideoGeneration($project);
            }

            logger()->info('🔄 Project retry initiated', [
                'project_id' => $project->id,
                'voiceover_option' => $project->voiceover_option
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Project retry initiated successfully.',
                'redirect_url' => route('projects.processing', $project)
            ]);

        } catch (\Exception $e) {
            logger()->error('❌ Project retry failed', [
                'project_id' => $project->id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to retry project: ' . $e->getMessage()
            ], 500);
        }
    }

    public function final(Project $project)
    {
        $this->authorize('view', $project);
        
        if ($project->status !== 'completed') {
            return redirect()->route('dashboard')
                ->with('error', 'Project is not completed yet.');
        }

        return view('projects.final', compact('project'));
    }

    public function download(Project $project, $format = 'youtube')
    {
        $this->authorize('view', $project);
        
        if (!$project->final_video_path) {
            return back()->with('error', 'Video file not found.');
        }

        // Check if it's an external URL (like 0x0.st)
        if ($project->isFinalVideoExternal()) {
            // For external URLs, redirect to the video URL
            return redirect($project->final_video_path);
        }

        // For local files, use the original download logic
        if (!Storage::disk('public')->exists($project->final_video_path)) {
            return back()->with('error', 'Video file not found.');
        }

        return Storage::disk('public')->download($project->final_video_path, $project->name . '_' . $format . '.mp4');
    }

    public function viewTranscript(Project $project)
    {
        $this->authorize('view', $project);

        // Only allow transcript access for uploaded voiceovers, not AI-generated ones
        if ($project->voiceover_option !== 'upload') {
            return response()->json([
                'success' => false,
                'message' => 'Transcript is only available for uploaded voiceover files.'
            ], 403);
        }

        if (!$project->hasVoiceoverTranscript()) {
            return response()->json([
                'success' => false,
                'message' => 'No voiceover transcript available for this project.'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'project_id' => $project->id,
                'project_name' => $project->name,
                'transcript' => $project->getVoiceoverTranscript(),
                'words_count' => $project->getTranscriptWordsCount(),
                'duration_seconds' => $project->getTranscriptDuration(),
                'created_at' => $project->created_at,
                'updated_at' => $project->updated_at
            ]
        ]);
    }

    protected function triggerVideoGeneration(Project $project)
    {
        // For AI/no voiceover projects, we'll use a simple job ID approach
        try {
            logger()->info('🎬 Triggering video generation for AI/no voiceover project', [
                'project_id' => $project->id,
                'voiceover_option' => $project->voiceover_option
            ]);

            // Generate a simple job ID for tracking
            $jobId = 'ai_gen_' . $project->id . '_' . time();
            
            $project->update([
                'job_id' => $jobId
            ]);

            logger()->info('✅ Video generation request successful', [
                'project_id' => $project->id,
                'job_id' => $jobId
            ]);
        } catch (\Exception $e) {
            logger()->error('❌ Failed to trigger video generation', [
                'project_id' => $project->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    protected function triggerSceneRegeneration(Project $project, Scene $scene)
    {
        // Use the new SceneRegenerationService
        try {
            $sceneRegenerationService = new \App\Services\SceneRegenerationService();
            $result = $sceneRegenerationService->regenerateScene($scene, 'pexels');
            
            logger()->info('Scene regeneration completed', [
                'scene_id' => $scene->id,
                'result' => $result
            ]);
        } catch (\Exception $e) {
            logger()->error('Failed to trigger scene regeneration: ' . $e->getMessage());
        }
    }



    public function checkStatus(Project $project)
    {
        $this->authorize('view', $project);

        return response()->json([
            'status' => $project->status,
            'scenes_count' => $project->scenes()->count(),
            'redirect_url' => $project->status === 'reviewing'
                ? route('projects.review', $project->id)
                : null
        ]);
    }

    public function uploadCustomMedia(Request $request, Project $project, Scene $scene)
    {
        // Add debugging
        logger()->info('Upload request received', [
            'project_id' => $project->id,
            'scene_id' => $scene->id,
            'user_id' => auth()->id(),
            'has_file' => $request->hasFile('custom_video'),
            'request_method' => $request->method()
        ]);

        $this->authorize('view', $project);

        // Validate that the scene belongs to the project
        if ($scene->project_id !== $project->id) {
            return response()->json(['success' => false, 'message' => 'Scene not found'], 404);
        }

        // Check if this is the new video upload format or old format
        $isNewVideoUpload = $request->hasFile('custom_video');

        if ($isNewVideoUpload) {
            // New video upload format - upload to 0x0.st
            logger()->info('New video upload started', [
                'project_id' => $project->id,
                'scene_id' => $scene->id,
                'file_size' => $request->file('custom_video') ? $request->file('custom_video')->getSize() : 'no file'
            ]);

            $request->validate([
                'custom_video' => 'required|file|mimes:mp4,webm,ogg,avi,mov|max:153600' // 150MB in KB
            ]);

            try {
                $file = $request->file('custom_video');

                // Upload video to 0x0.st to get downloadable URL
                $downloadableUrl = $this->uploadToFileHost($file);

                if (!$downloadableUrl) {
                    throw new \Exception('Failed to upload video to file hosting service');
                }

                // Update the scene with the new video URL
                $scene->update([
                    'video_url' => $downloadableUrl,
                    'video_path' => null, // Clear local path since we're using external URL
                    'status' => 'completed' // Mark as completed since user uploaded custom video
                ]);

                logger()->info('Video uploaded successfully', [
                    'scene_id' => $scene->id,
                    'video_url' => $downloadableUrl
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Video uploaded successfully',
                    'video_url' => $downloadableUrl
                ]);

            } catch (\Exception $e) {
                logger()->error('Video upload failed', [
                    'scene_id' => $scene->id,
                    'error' => $e->getMessage()
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Upload failed: ' . $e->getMessage()
                ], 500);
            }
        } else {
            // Original upload format
            $request->validate([
                'custom_media' => 'required|file|mimes:mp4,mov,avi,jpg,jpeg,png|max:51200' // 50MB max
            ]);

            try {
                $file = $request->file('custom_media');
                $filename = 'scene_' . $scene->id . '_custom_' . time() . '.' . $file->getClientOriginalExtension();

                // Store the file
                $path = $file->storeAs('scenes/custom', $filename, 'public');

                // Update the scene with the custom media
                if (in_array($file->getClientOriginalExtension(), ['mp4', 'mov', 'avi'])) {
                    // It's a video
                    $scene->update([
                        'video_path' => $path,
                        'video_url' => Storage::url($path),
                    ]);
                } else {
                    // It's an image - you might want to handle this differently
                    $scene->update([
                        'video_path' => $path,
                        'video_url' => Storage::url($path),
                    ]);
                }

                return response()->json([
                    'success' => true,
                    'message' => 'Custom media uploaded successfully',
                    'media_url' => Storage::url($path)
                ]);

            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Upload failed: ' . $e->getMessage()
                ], 500);
            }
        }
    }

    /**
     * Upload file to 0x0.st file hosting service
     */
    private function uploadToFileHost($file)
    {
        try {
            logger()->info('Starting upload to 0x0.st', [
                'filename' => $file->getClientOriginalName(),
                'size' => $file->getSize(),
                'mime_type' => $file->getMimeType()
            ]);

            // Create a multipart form data request to 0x0.st
            $client = new Client();

            $response = $client->post('https://0x0.st', [
                'multipart' => [
                    [
                        'name' => 'file',
                        'contents' => fopen($file->getRealPath(), 'r'),
                        'filename' => $file->getClientOriginalName()
                    ]
                ],
                'headers' => [
                    'User-Agent' => 'VidsAI/1.0'
                ],
                'timeout' => 300, // 5 minutes timeout for large files
                'verify' => false // Skip SSL verification if needed
            ]);

            if ($response->getStatusCode() === 200) {
                $downloadUrl = trim($response->getBody()->getContents());

                logger()->info('File uploaded successfully to 0x0.st', [
                    'url' => $downloadUrl
                ]);

                return $downloadUrl;
            }

            logger()->error('Failed to upload to 0x0.st', [
                'status_code' => $response->getStatusCode(),
                'response' => $response->getBody()->getContents()
            ]);

            return null;

        } catch (\Exception $e) {
            logger()->error('Exception during file upload to 0x0.st', [
                'error' => $e->getMessage(),
                'file' => $file->getClientOriginalName()
            ]);

            return null;
        }
    }

    public function subtitleStyles(Project $project)
    {
        $this->authorize('view', $project);

        logger()->info('📝 Subtitle styles page accessed', [
            'project_id' => $project->id,
            'user_id' => auth()->id(),
            'project_status' => $project->status
        ]);

        // Prepare scene videos data for the view
        $sceneVideos = $project->scenes()->orderBy('scene_number')->get()->map(function($scene) {
            return [
                'scene_id' => $scene->id,
                'video_url' => $scene->video_url,
                'duration' => (float) $scene->duration_seconds, // Actual video duration from Pexels
                'gemini_duration' => (float) $scene->gemini_duration, // Timing from Gemini API
                'trimmed_duration' => (float) $scene->trimmed_duration, // Actual trimmed duration from review page
                'scene_number' => $scene->scene_number,
                'script_text' => $scene->script_text ?? '',
                'start_time' => (float) ($scene->start_time ?? 0),
                'end_time' => (float) ($scene->end_time ?? $scene->duration_seconds)
            ];
        })->toArray(); // Convert to array to ensure proper JSON encoding

        logger()->info('📹 Subtitle styles page - scene videos data', [
            'project_id' => $project->id,
            'scenes_count' => count($sceneVideos),
            'first_scene' => $sceneVideos[0] ?? null,
            'scene_videos_data' => $sceneVideos
        ]);

        return view('projects.subtitle-styles', compact('project', 'sceneVideos'));
    }

    public function prepareVoiceover(Request $request, Project $project)
    {
        logger()->info('🚀 prepareVoiceover method called', [
            'project_id' => $project->id,
            'user_id' => auth()->id(),
            'request_method' => $request->method(),
            'request_headers' => $request->headers->all()
        ]);

        $this->authorize('update', $project);

        logger()->info('✅ Authorization passed, preparing voiceover for subtitle generation', [
            'project_id' => $project->id,
            'voiceover_option' => $project->voiceover_option,
            'voiceover_file' => $project->voiceover_file,
            'has_voiceover_file' => !empty($project->voiceover_file),
            'file_exists' => $project->voiceover_file ? Storage::disk('public')->exists($project->voiceover_file) : false
        ]);

        try {
            $voiceOverUrl = null;

            // Upload voiceover to 0x0.st if it's an uploaded file
            if ($project->voiceover_option === 'upload' && $project->voiceover_file) {
                logger()->info('🔄 Starting voiceover upload process', [
                    'project_id' => $project->id,
                    'file_path' => $project->voiceover_file
                ]);

                $voiceOverUrl = $this->uploadVoiceoverTo0x0($project);

                logger()->info('🔍 Upload result', [
                    'project_id' => $project->id,
                    'upload_successful' => !empty($voiceOverUrl),
                    'voiceover_url' => $voiceOverUrl
                ]);

                if (!$voiceOverUrl) {
                    logger()->error('❌ Upload returned null/empty URL', [
                        'project_id' => $project->id
                    ]);

                    return response()->json([
                        'success' => false,
                        'message' => 'Failed to upload voiceover file. Please try again.'
                    ], 500);
                }

                // Store the uploaded URL in the project for future use
                $project->update(['voiceover_url' => $voiceOverUrl]);

                logger()->info('💾 Stored voiceover URL in database', [
                    'project_id' => $project->id,
                    'stored_url' => $voiceOverUrl
                ]);
            } else {
                logger()->warning('⚠️ Voiceover preparation skipped', [
                    'project_id' => $project->id,
                    'reason' => $project->voiceover_option !== 'upload' ? 'not_upload_option' : 'no_voiceover_file'
                ]);
            }

            logger()->info('✅ Voiceover preparation completed', [
                'project_id' => $project->id,
                'voiceover_url' => $voiceOverUrl
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Voiceover prepared successfully!',
                'voiceover_url' => $voiceOverUrl
            ]);

        } catch (\Exception $e) {
            logger()->error('❌ Voiceover preparation failed with exception', [
                'project_id' => $project->id,
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An error occurred while preparing the voiceover: ' . $e->getMessage()
            ], 500);
        }
    }

    public function generateSubtitles(Request $request, Project $project)
    {
        logger()->info('🚀 ROUTE HIT: generateSubtitles method called', [
            'project_id' => $project->id,
            'method' => $request->method(),
            'url' => $request->url(),
            'user_agent' => $request->userAgent(),
            'request_size' => $request->getContent() ? strlen($request->getContent()) : 0
        ]);

        $this->authorize('update', $project);

        logger()->info('🎬 Subtitle generation requested', [
            'project_id' => $project->id,
            'user_id' => auth()->id(),
            'request_data' => $request->all()
        ]);

        // Validate the request
        $validated = $request->validate([
            'style' => 'required|string|in:tiktok_trending,progressive_highlight,rectangular,rounded_progressive,arabic_banner,rectangular_banner',
            'style_config' => 'required|array',
            'videos' => 'required|array|min:1',
            'clips_duration' => 'nullable|array',
            'aspect_ratio' => 'nullable|string',
            'voiceOver' => 'nullable|string|url',
            'voiceOverVolume' => 'nullable|numeric',
            'music' => 'nullable|string|url',
            'musicVolume' => 'nullable|numeric',
            // Keep backward compatibility
            'voiceover_url' => 'nullable|string|url'
        ]);

        try {
            // Prepare data for subtitle generation
            $preparedData = $this->prepareSubtitleData($project, $validated);
            $videoData = $preparedData['videoData'];
            $projectInfo = $preparedData['projectInfo'];

            logger()->info('📤 Preparing subtitle generation data', [
                'project_id' => $project->id,
                'clips_count' => count($videoData['clips']),
                'subtitles_count' => count($videoData['subtitles']),
                'total_duration' => $projectInfo['total_duration'],
                'video_data_keys' => array_keys($videoData),
                'project_info_keys' => array_keys($projectInfo),
                'has_music' => !empty($videoData['music']),
                'music_url' => $videoData['music'] ?? 'none',
                'voiceover_url' => $videoData['voiceOver'] ?? 'none'
            ]);

            // Update project status to subtitle_generating
            $project->update([
                'status' => 'subtitle_generating',
                'processing_started_at' => now()
            ]);

            logger()->info('🚀 Dispatching subtitle generation job', [
                'project_id' => $project->id,
                'clips_count' => count($videoData['clips']),
                'subtitles_count' => count($videoData['subtitles'])
            ]);

            // Dispatch the job for async processing
            \App\Jobs\ProcessSubtitleGenerationJob::dispatch($project, $videoData, $projectInfo);

            logger()->info('✅ Subtitle generation job dispatched successfully', [
                'project_id' => $project->id
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Subtitle generation started! Please wait while we process your video...',
                'redirect_to_processing' => true,
                'project_id' => $project->id
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            logger()->error('❌ Subtitle generation validation error', [
                'project_id' => $project->id,
                'errors' => $e->errors()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Validation error: ' . implode(', ', Arr::flatten($e->errors())),
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            logger()->error('❌ Subtitle generation exception', [
                'project_id' => $project->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An error occurred while starting subtitle generation: ' . $e->getMessage()
            ], 500);
        }
    }

    private function prepareSubtitleData(Project $project, array $validated): array
    {
        // Extract video URLs and durations from scene videos
        $clipUrls = [];
        $clipDurations = [];
        $clipStartTimes = [];
        $clipEndTimes = [];
        $scenes = $project->scenes()->orderBy('scene_number')->get()->keyBy('id');

        foreach ($validated['videos'] as $video) {
            if (isset($video['video_url']) && isset($video['scene_id'])) {
                $scene = $scenes->get($video['scene_id']);

                $clipUrls[] = $video['video_url'];
                // Use trimmed duration from review page, fallback to scene duration if not set
                $clipDurations[] = $scene ? (float) ($scene->trimmed_duration ?? $scene->duration_seconds) : 0;
                
                // Add Gemini timing information for precise trimming
                if ($scene && $scene->start_time !== null && $scene->end_time !== null) {
                    $clipStartTimes[] = (float) $scene->start_time;
                    $clipEndTimes[] = (float) $scene->end_time;
                } else {
                    $clipStartTimes[] = 0;
                    $clipEndTimes[] = $scene ? (float) ($scene->trimmed_duration ?? $scene->duration_seconds) : 0;
                }
            } elseif (isset($video['video_url'])) {
                // Fallback for videos without scene_id
                $clipUrls[] = $video['video_url'];
                $clipDurations[] = 0;
                $clipStartTimes[] = 0;
                $clipEndTimes[] = 0;
            }
        }

        logger()->info('📹 Prepared scene clips with durations and timing', [
            'project_id' => $project->id,
            'clips_count' => count($clipUrls),
            'total_duration' => array_sum($clipDurations),
            'durations_sample' => array_slice($clipDurations, 0, 3),
            'start_times_sample' => array_slice($clipStartTimes, 0, 3),
            'end_times_sample' => array_slice($clipEndTimes, 0, 3)
        ]);

        // Get project aspect ratio (default to 16:9 if not specified)
        $aspectRatio = '16:9';
        if (is_array($project->video_format) && !empty($project->video_format)) {
            $aspectRatio = $project->video_format[0];
        }

        // Prepare subtitles from project scenes and transcript
        $subtitles = $this->generateSubtitleEntries($project, $validated['style_config']);
        
        logger()->info('📝 Generated subtitles before processing', [
            'project_id' => $project->id,
            'subtitles_count' => count($subtitles),
            'sample_timing' => array_slice(array_map(function($s) {
                return [
                    'text' => substr($s['text'] ?? '', 0, 20) . '...',
                    'start' => $s['start'] ?? 'not_set',
                    'end' => $s['end'] ?? 'not_set',
                    'duration' => isset($s['start'], $s['end']) ? round($s['end'] - $s['start'], 3) : 'unknown'
                ];
            }, $subtitles), 0, 3)
        ]);

        // Clamp/Rebalance subtitles to voiceover duration (prefer transcript duration; fallback to total clips duration)
        $maxDuration = 0.0;
        if ($project->hasVoiceoverTranscript() && $project->voiceover_option === 'upload') {
            try {
                $maxDuration = (float) ($project->getTranscriptDuration() ?? 0.0);
                // As a fallback, compute from last transcript word
                if ($maxDuration <= 0.0) {
                    $transcript = $project->getVoiceoverTranscript();
                    if (is_array($transcript) && count($transcript) > 0) {
                        $last = $transcript[count($transcript) - 1];
                        $maxDuration = (float) ($last['end'] ?? 0.0);
                    }
                }
            } catch (\Throwable $e) {
                $maxDuration = 0.0;
            }
        }
        if ($maxDuration <= 0.0) {
            $maxDuration = array_sum($clipDurations);
        }
        if ($maxDuration > 0.0 && count($subtitles) > 0) {
                    // Only rebalance if we don't have transcript-based timing
        $hasTranscriptTiming = false;
        $transcriptSource = 'unknown';
        
        foreach ($subtitles as $subtitle) {
            if (isset($subtitle['start']) && isset($subtitle['end']) && 
                $subtitle['start'] > 0.0 && $subtitle['end'] > $subtitle['start']) {
                $hasTranscriptTiming = true;
                
                // Detect transcript source based on timing precision
                if (isset($subtitle['start']) && $subtitle['start'] > 0.0) {
                    $transcriptSource = 'transcript_based';
                }
                break;
            }
        }
        
        if ($hasTranscriptTiming) {
            logger()->info('🎯 Preserving transcript-based subtitle timing - skipping rebalancing', [
                'project_id' => $project->id,
                'language' => $project->language,
                'transcript_source' => $transcriptSource,
                'subtitles_count' => count($subtitles),
                'sample_timing' => array_slice(array_map(function($s) {
                    return [
                        'text' => substr($s['text'] ?? '', 0, 20) . '...',
                        'start' => $s['start'] ?? 'not_set',
                        'end' => $s['end'] ?? 'not_set'
                    ];
                }, $subtitles), 0, 2)
            ]);
            
            // Only clamp to ensure we don't exceed max duration
            $subtitles = $this->clampSubtitlesToDuration($subtitles, $maxDuration);
        } else {
            logger()->info('📏 No transcript timing found - applying uniform rebalancing', [
                'project_id' => $project->id,
                'language' => $project->language,
                'subtitles_count' => count($subtitles)
            ]);
            
            // Rebalance so each word has equal time and phrases receive duration proportional to their word count
            $subtitles = $this->rebalanceSubtitlesUniform($subtitles, $maxDuration);
            // Final safety clamp
            $subtitles = $this->clampSubtitlesToDuration($subtitles, $maxDuration);
        }
        }

        // Get voiceover URL if available
        $voiceOverUrl = null;
        if ($project->voiceover_option === 'upload') {
            // Use URL from request if provided, otherwise use stored URL
            $voiceOverUrl = $validated['voiceOver'] ?? $project->voiceover_url;
            logger()->info('🎤 Using voiceover URL', [
                'project_id' => $project->id,
                'voiceover_url' => $voiceOverUrl,
                'source' => isset($validated['voiceOver']) ? 'request_new' : 'stored'
            ]);
        }

        // Log final subtitle timing
        logger()->info('📝 Final subtitles after processing', [
            'project_id' => $project->id,
            'subtitles_count' => count($subtitles),
            'sample_timing' => array_slice(array_map(function($s) {
                return [
                    'text' => substr($s['text'] ?? '', 0, 20) . '...',
                    'start' => $s['start'] ?? 'not_set',
                    'end' => $s['end'] ?? 'not_set',
                    'duration' => isset($s['start'], $s['end']) ? round($s['end'] - $s['start'], 3) : 'unknown'
                ];
            }, $subtitles), 0, 3)
        ]);
        
        // Main video data object
        $videoData = [
            'clips' => $clipUrls,
            'clipDurations' => $clipDurations,
            'clipStartTimes' => $clipStartTimes,
            'clipEndTimes' => $clipEndTimes,
            'voiceOver' => $voiceOverUrl,
            'voiceOverVolume' => $validated['voiceOverVolume'] ?? 1.3,
            'music' => $validated['music'] ?? null,
            'musicVolume' => $validated['musicVolume'] ?? 0.2,
            'aspectRatio' => $aspectRatio,
            'transition' => $validated['style_config']['transition'] ?? 'fade',
            'subtitles' => $subtitles
        ];

        // Additional project information object
        $projectInfo = [
            'project_id' => $project->id,
            'project_name' => $project->name,
            'script' => $project->custom_script,
            'voiceover_option' => $project->voiceover_option,
            'style' => $validated['style'],
            'style_config' => $validated['style_config'],
            'language' => $project->language,
            'category' => $project->category,
            'created_at' => $project->created_at->toISOString(),
            'total_scenes' => count($clipUrls),
            'total_duration' => array_sum($clipDurations)
        ];

        return [
            'videoData' => $videoData,
            'projectInfo' => $projectInfo
        ];
    }

    private function generateSubtitleEntries(Project $project, array $styleConfig): array
    {
        $subtitles = [];

        // Priority 1: Use subtitles_script with transcript timing if both are available
        if ($project->hasSubtitlesScript() && $project->hasVoiceoverTranscript() && $project->voiceover_option === 'upload') {
            $subtitlesScript = $project->getSubtitlesScript();
            $transcript = $project->getVoiceoverTranscript();
            $subtitles = $this->generateSubtitlesFromScript($subtitlesScript, $transcript, $styleConfig);

            logger()->info('📝 Using subtitles script with transcript timing', [
                'project_id' => $project->id,
                'subtitles_count' => count($subtitlesScript),
                'transcript_words' => count($transcript)
            ]);
        }
        // Priority 2: Use transcript-based subtitles (old method)
        elseif ($project->hasVoiceoverTranscript() && $project->voiceover_option === 'upload') {
            $transcript = $project->getVoiceoverTranscript();
            $subtitles = $this->generateTranscriptBasedSubtitles($transcript, $styleConfig);

            logger()->info('📝 Using transcript-based subtitles (fallback)', [
                'project_id' => $project->id,
                'transcript_words' => count($transcript)
            ]);
        }
        // Priority 3: Fallback to scene-based subtitles
        else {
            $subtitles = $this->generateSceneBasedSubtitles($project, $styleConfig);

            logger()->info('📝 Using scene-based subtitles (fallback)', [
                'project_id' => $project->id,
                'scenes_count' => $project->scenes()->count()
            ]);
        }

        return $subtitles;
    }

    /**
     * Ensure subtitles do not exceed the maximum duration and are monotonic.
     */
    private function clampSubtitlesToDuration(array $subtitles, float $maxDuration): array
    {
        $clamped = [];
        $prevEnd = 0.0;
        foreach ($subtitles as $s) {
            $start = (float) ($s['start'] ?? 0.0);
            $end = (float) ($s['end'] ?? $start);
            $start = max($prevEnd, min($start, $maxDuration));
            $end = max($start, min($end, $maxDuration));
            $s['start'] = round($start, 3);
            $s['end'] = round($end, 3);
            $clamped[] = $s;
            $prevEnd = $s['end'];
        }
        // Force last end to exactly maxDuration if very close or beyond
        if (count($clamped) > 0) {
            $i = count($clamped) - 1;
            $clamped[$i]['end'] = round(min(max($clamped[$i]['end'], $clamped[$i]['start']), $maxDuration), 3);
        }
        return $clamped;
    }

    /**
     * Re-assign subtitle timings so that each token (word) consumes equal time across the total voiceover duration.
     * Phrases are allocated duration proportional to their token counts, preserving order and avoiding gaps/overlaps.
     */
    private function rebalanceSubtitlesUniform(array $subtitles, float $totalDuration): array
    {
        // Count tokens using Unicode-aware split
        $tokenCounts = [];
        $totalTokens = 0;
        foreach ($subtitles as $s) {
            $tokens = preg_split('/\s+/u', trim((string)($s['text'] ?? '')));
            $tokens = array_values(array_filter($tokens ?? [], fn($t) => $t !== ''));
            $count = count($tokens);
            $tokenCounts[] = $count;
            $totalTokens += $count;
        }
        if ($totalTokens <= 0) {
            // If no tokens, just spread evenly
            $per = $totalDuration / max(1, count($subtitles));
            $cursor = 0.0;
            return array_map(function($s) use (&$cursor, $per) {
                $start = $cursor;
                $end = $cursor + $per;
                $cursor = $end;
                $s['start'] = round($start, 3);
                $s['end'] = round($end, 3);
                return $s;
            }, $subtitles);
        }

        $secondsPerToken = $totalDuration / $totalTokens;
        $cursor = 0.0;
        $result = [];
        foreach ($subtitles as $idx => $s) {
            $phraseTokens = max(1, $tokenCounts[$idx]);
            $phraseDuration = $secondsPerToken * $phraseTokens;
            $start = $cursor;
            $end = $cursor + $phraseDuration;
            $cursor = $end;
            $s['start'] = round($start, 3);
            $s['end'] = round($end, 3);
            $result[] = $s;
        }
        // Snap last end to totalDuration to absorb rounding
        if (count($result) > 0) {
            $result[count($result) - 1]['end'] = round($totalDuration, 3);
        }
        return $result;
    }

    private function generateSubtitlesFromScript(array $subtitlesScript, array $transcript, array $styleConfig): array
    {
        $subtitles = [];

        // Remove duplicates and empty entries from subtitles script
        $uniqueSubtitles = [];
        $seenSubtitles = [];

        foreach ($subtitlesScript as $subtitleText) {
            $subtitleText = trim($subtitleText);
            if (empty($subtitleText)) continue;

            $normalizedText = strtolower($subtitleText);
            if (!in_array($normalizedText, $seenSubtitles)) {
                $uniqueSubtitles[] = $subtitleText;
                $seenSubtitles[] = $normalizedText;
            }
        }

        logger()->info('🔍 Processed subtitles script', [
            'original_count' => count($subtitlesScript),
            'unique_count' => count($uniqueSubtitles),
            'duplicates_removed' => count($subtitlesScript) - count($uniqueSubtitles),
            'transcript_words' => count($transcript)
        ]);

        // Track last used word index to ensure sequential processing
        $lastUsedIndex = -1;

        foreach ($uniqueSubtitles as $subtitleIndex => $subtitleText) {
            // Find timing for this subtitle by matching words sequentially
            $timing = $this->findSubtitleTimingSequential($subtitleText, $transcript, $lastUsedIndex);

            if ($timing) {
                // Update last used index to ensure sequential processing
                $lastUsedIndex = $timing['endIndex'];

                // Create subtitle in API format
                $subtitle = [
                    'text' => $subtitleText,
                    'start' => $timing['start'],
                    'end' => $timing['end'],
                    'style' => $styleConfig['style'] ?? 'tiktok_trending',
                    'position' => $styleConfig['position'] ?? 'bottom',
                    'fontFamily' => $styleConfig['fontFamily'] ?? 'Roboto'
                ];

                // Add style-specific parameters
                if (isset($styleConfig['backgroundColor'])) {
                    $subtitle['backgroundColor'] = $styleConfig['backgroundColor'];
                }
                if (isset($styleConfig['color'])) {
                    $subtitle['color'] = $styleConfig['color'];
                }

                // Add color variations for banner styles
                if (in_array($styleConfig['style'] ?? '', ['arabic_banner', 'rectangular_banner'])) {
                    // Use different colors for variety
                    $colors = ['#007acc', '#28a745', '#dc3545', '#ffc107', '#ff8800', '#6f42c1'];
                    $subtitle['backgroundColor'] = $colors[$subtitleIndex % count($colors)];
                }

                $subtitles[] = $subtitle;

                logger()->debug('✅ Subtitle timing found', [
                    'subtitle_index' => $subtitleIndex,
                    'text' => substr($subtitleText, 0, 30) . '...',
                    'start' => $timing['start'],
                    'end' => $timing['end'],
                    'duration' => round($timing['end'] - $timing['start'], 3),
                    'word_range' => $timing['startIndex'] . '-' . $timing['endIndex']
                ]);
                        } else {
                logger()->warning('⚠️ Could not find timing for subtitle', [
                    'subtitle_index' => $subtitleIndex,
                    'text' => substr($subtitleText, 0, 30) . '...',
                    'last_used_index' => $lastUsedIndex
                ]);
                
                // Fallback: Create subtitle with estimated timing
                if (count($subtitles) > 0) {
                    $lastSubtitle = end($subtitles);
                    $estimatedStart = $lastSubtitle['end'] + 0.1; // Start 0.1s after last subtitle
                    $estimatedEnd = $estimatedStart + 2.0; // Assume 2 seconds duration
                } else {
                    // First subtitle - start at beginning
                    $estimatedStart = 0.0;
                    $estimatedEnd = 2.0; // Assume 2 seconds duration
                }
                
                $subtitle = [
                    'text' => $subtitleText,
                    'start' => $estimatedStart,
                    'end' => $estimatedEnd,
                    'style' => $styleConfig['style'] ?? 'tiktok_trending',
                    'position' => $styleConfig['position'] ?? 'bottom',
                    'fontFamily' => $styleConfig['fontFamily'] ?? 'Roboto'
                ];

                // Add style-specific parameters
                if (isset($styleConfig['backgroundColor'])) {
                    $subtitle['backgroundColor'] = $styleConfig['backgroundColor'];
                }
                if (isset($styleConfig['color'])) {
                    $subtitle['color'] = $styleConfig['color'];
                }

                // Add color variations for banner styles
                if (in_array($styleConfig['style'] ?? '', ['arabic_banner', 'rectangular_banner'])) {
                    $colors = ['#007acc', '#28a745', '#dc3545', '#ffc107', '#ff8800', '#6f42c1'];
                    $subtitle['backgroundColor'] = $colors[$subtitleIndex % count($colors)];
                }

                $subtitles[] = $subtitle;
                
                logger()->info('✅ Added subtitle with fallback timing', [
                    'subtitle_index' => $subtitleIndex,
                    'text' => $subtitleText,
                    'start' => $estimatedStart,
                    'end' => $estimatedEnd
                ]);
            }
        }

        logger()->info('📝 Generated subtitles from script', [
            'input_subtitles' => count($uniqueSubtitles),
            'output_subtitles' => count($subtitles),
            'success_rate' => round(count($subtitles) / count($uniqueSubtitles) * 100, 1) . '%'
        ]);

        return $subtitles;
    }
    
    private function convertNumbersToWords(array $words): array
    {
        $numberMap = [
            '0' => 'zero', '1' => 'one', '2' => 'two', '3' => 'three', '4' => 'four',
            '5' => 'five', '6' => 'six', '7' => 'seven', '8' => 'eight', '9' => 'nine',
            '10' => 'ten', '11' => 'eleven', '12' => 'twelve', '13' => 'thirteen',
            '14' => 'fourteen', '15' => 'fifteen', '16' => 'sixteen', '17' => 'seventeen',
            '18' => 'eighteen', '19' => 'nineteen', '20' => 'twenty', '21' => 'twenty one',
            '22' => 'twenty two', '23' => 'twenty three', '24' => 'twenty four',
            '25' => 'twenty five', '26' => 'twenty six', '27' => 'twenty seven',
            '28' => 'twenty eight', '29' => 'twenty nine', '30' => 'thirty'
        ];
        
        $converted = [];
        foreach ($words as $word) {
            if (isset($numberMap[$word])) {
                // Split multi-word numbers into separate words
                $numberWords = explode(' ', $numberMap[$word]);
                foreach ($numberWords as $numberWord) {
                    $converted[] = $numberWord;
                }
            } else {
                $converted[] = $word;
            }
        }
        
        return $converted;
    }

    private function findSubtitleTimingSequential(string $subtitleText, array $transcript, int $lastUsedIndex): ?array
    {
        // Unicode-clean and split subtitle text into words (Arabic-friendly)
        $subtitleWords = array_filter(array_map(function($word) {
            $w = preg_replace('/[^\p{L}\p{N}\s]/u', ' ', (string) $word);
            if ($w === null) { $w = (string) $word; }
            $w = trim(preg_replace('/\s+/u', ' ', $w));
            return mb_strtolower($w, 'UTF-8');
        }, preg_split('/\s+/u', (string) $subtitleText) ?: []));

        if (empty($subtitleWords)) {
            return null;
        }

        // Precompute normalized transcript words
        $transcriptNorm = [];
        foreach ($transcript as $idx => $tw) {
            $w = (string)($tw['word'] ?? '');
            $w = preg_replace('/[^\p{L}\p{N}\s]/u', ' ', $w);
            if ($w === null) { $w = (string)($tw['word'] ?? ''); }
            $w = trim(preg_replace('/\s+/u', ' ', $w));
            $transcriptNorm[$idx] = mb_strtolower($w, 'UTF-8');
        }

        logger()->debug('🔍 Finding sequential timing for subtitle', [
            'subtitle_text' => substr($subtitleText, 0, 30) . '...',
            'subtitle_words' => $subtitleWords,
            'last_used_index' => $lastUsedIndex,
            'search_start' => $lastUsedIndex + 1
        ]);

        // Search for the best matching sequence starting after the last used index
        $bestMatch = null;
        $bestScore = 0;
        $minStartIndex = $lastUsedIndex + 1;

        // Try to find a sequence of words that matches our subtitle
        for ($i = $minStartIndex; $i <= count($transcript) - count($subtitleWords); $i++) {
            $score = 0;
            $matchedWords = 0;
            $consecutiveMatches = 0;
            $maxConsecutive = 0;

            // Check how many words match in sequence
            for ($j = 0; $j < count($subtitleWords) && ($i + $j) < count($transcript); $j++) {
                $transcriptWord = $transcriptNorm[$i + $j] ?? '';
                $subtitleWord = $subtitleWords[$j] ?? '';

                if ($transcriptWord === $subtitleWord) {
                    $score += 5; // Exact match gets highest score
                    $matchedWords++;
                    $consecutiveMatches++;
                    $maxConsecutive = max($maxConsecutive, $consecutiveMatches);
                } elseif (strpos($transcriptWord, $subtitleWord) !== false || strpos($subtitleWord, $transcriptWord) !== false) {
                    $score += 2; // Partial match gets medium score
                    $matchedWords++;
                    $consecutiveMatches = 0; // Reset consecutive counter
                } else {
                    $consecutiveMatches = 0; // Reset consecutive counter
                }
            }

            // Calculate match quality
            $matchPercentage = $matchedWords / count($subtitleWords);
            $consecutiveBonus = $maxConsecutive / count($subtitleWords);
            $finalScore = $score + ($consecutiveBonus * 10); // Bonus for consecutive matches

            // Accept if we have a good match (at least 60% words matched) - INCREASED THRESHOLD
            if ($matchPercentage >= 0.6 && $finalScore > $bestScore) {
                $endIndex = min($i + count($subtitleWords) - 1, count($transcript) - 1);

                $bestScore = $finalScore;
                $bestMatch = [
                    'start' => $transcript[$i]['start'],
                    'end' => $transcript[$endIndex]['end'],
                    'startIndex' => $i,
                    'endIndex' => $endIndex,
                    'match_percentage' => $matchPercentage,
                    'score' => $finalScore,
                    'consecutive_matches' => $maxConsecutive
                ];

                // If we have a very good match (90%+), use it immediately
                if ($matchPercentage >= 0.9) {
                    break;
                }
            }
        }

        if ($bestMatch) {
            logger()->info('✅ Sequential match found', [
                'subtitle_text' => substr($subtitleText, 0, 30) . '...',
                'match_percentage' => round($bestMatch['match_percentage'], 2),
                'score' => round($bestMatch['score'], 1),
                'consecutive_matches' => $bestMatch['consecutive_matches'],
                'start' => $bestMatch['start'],
                'end' => $bestMatch['end'],
                'duration' => round($bestMatch['end'] - $bestMatch['start'], 3),
                'word_range' => $bestMatch['startIndex'] . '-' . $bestMatch['endIndex'],
                'transcript_words' => array_slice(array_column($transcript, 'word'), $bestMatch['startIndex'], $bestMatch['endIndex'] - $bestMatch['startIndex'] + 1)
            ]);
        }

        if (!$bestMatch) {
            logger()->warning('⚠️ No sequential match found for subtitle', [
                'subtitle_text' => substr($subtitleText, 0, 30) . '...',
                'subtitle_words' => $subtitleWords,
                'last_used_index' => $lastUsedIndex,
                'search_range' => $minStartIndex . ' to ' . (count($transcript) - count($subtitleWords)),
                'transcript_sample' => array_slice(array_column($transcript, 'word'), $minStartIndex, 5)
            ]);
        }

        return $bestMatch;
    }

    private function findSubtitleTiming(string $subtitleText, array $transcript, array $wordMap, int $subtitleIndex): ?array
    {
        // Clean and split subtitle text into words
        $subtitleWords = array_filter(array_map(function($word) {
            return strtolower(trim(preg_replace('/[^\w\s]/', '', $word)));
        }, explode(' ', $subtitleText)));

        if (empty($subtitleWords)) {
            return null;
        }

        logger()->debug('🔍 Finding timing for subtitle', [
            'subtitle_index' => $subtitleIndex,
            'subtitle_words' => $subtitleWords,
            'first_word' => $subtitleWords[0],
            'last_word' => end($subtitleWords)
        ]);

        // Try to find the first word in the transcript
        $firstWord = $subtitleWords[0];
        $lastWord = end($subtitleWords);

        $startWordData = null;
        $endWordData = null;

        // Search for the first word occurrence after previous subtitles
        if (isset($wordMap[$firstWord])) {
            foreach ($wordMap[$firstWord] as $wordOccurrence) {
                $wordData = $wordOccurrence['data'];

                // Use this occurrence if it seems reasonable
                if (!$startWordData || $wordData['start'] >= ($startWordData['start'] ?? 0)) {
                    $startWordData = $wordData;
                    break;
                }
            }
        }

        // Search for the last word
        if (isset($wordMap[$lastWord])) {
            foreach ($wordMap[$lastWord] as $wordOccurrence) {
                $wordData = $wordOccurrence['data'];

                // Find the last word that comes after or at the same time as the first word
                if ($startWordData && $wordData['start'] >= $startWordData['start']) {
                    $endWordData = $wordData;
                }
            }
        }

        // If we couldn't find exact matches, try fuzzy matching
        if (!$startWordData || !$endWordData) {
            logger()->debug('🔍 Exact match failed, trying fuzzy matching', [
                'found_start' => $startWordData ? 'yes' : 'no',
                'found_end' => $endWordData ? 'yes' : 'no'
            ]);

            return $this->findSubtitleTimingFuzzy($subtitleWords, $transcript, $subtitleIndex);
        }

        return [
            'start' => $startWordData['start'],
            'end' => $endWordData['end']
        ];
    }

    private function findSubtitleTimingFuzzy(array $subtitleWords, array $transcript, int $subtitleIndex): ?array
    {
        // Normalize subtitle words
        $subtitleWords = array_values(array_filter(array_map(function($w) {
            $w = preg_replace('/[^\p{L}\p{N}\s]/u', ' ', (string) $w);
            if ($w === null) { $w = (string) $w; }
            $w = trim(preg_replace('/\s+/u', ' ', $w));
            return mb_strtolower($w, 'UTF-8');
        }, $subtitleWords)));

        // Precompute normalized transcript words
        $transcriptNorm = [];
        foreach ($transcript as $idx => $tw) {
            $w = (string)($tw['word'] ?? '');
            $w = preg_replace('/[^\p{L}\p{N}\s]/u', ' ', $w);
            if ($w === null) { $w = (string)($tw['word'] ?? ''); }
            $w = trim(preg_replace('/\s+/u', ' ', $w));
            $transcriptNorm[$idx] = mb_strtolower($w, 'UTF-8');
        }

        $bestMatch = null;
        $bestScore = 0;

        // Try to find a sequence of words that best matches our subtitle
        for ($i = 0; $i <= count($transcript) - count($subtitleWords); $i++) {
            $score = 0;
            $matchedWords = 0;

            // Check how many words match in sequence
            for ($j = 0; $j < count($subtitleWords) && ($i + $j) < count($transcript); $j++) {
                $transcriptWord = $transcriptNorm[$i + $j] ?? '';
                $subtitleWord = $subtitleWords[$j] ?? '';

                if ($transcriptWord === $subtitleWord) {
                    $score += 2; // Exact match
                    $matchedWords++;
                } elseif (strpos($transcriptWord, $subtitleWord) !== false || strpos($subtitleWord, $transcriptWord) !== false) {
                    $score += 1; // Partial match
                    $matchedWords++;
                }
            }

            // Calculate match percentage
            $matchPercentage = $matchedWords / count($subtitleWords);

            if ($matchPercentage > 0.5 && $score > $bestScore) { // At least 50% match
                $bestScore = $score;
                $bestMatch = [
                    'start' => $transcript[$i]['start'],
                    'end' => $transcript[min($i + count($subtitleWords) - 1, count($transcript) - 1)]['end'],
                    'match_percentage' => $matchPercentage,
                    'score' => $score
                ];
            }
        }

        if ($bestMatch) {
            logger()->debug('✅ Fuzzy match found', [
                'subtitle_index' => $subtitleIndex,
                'match_percentage' => $bestMatch['match_percentage'],
                'score' => $bestMatch['score'],
                'start' => $bestMatch['start'],
                'end' => $bestMatch['end']
            ]);
        }

        return $bestMatch;
    }

    private function generateTranscriptBasedSubtitles(array $transcript, array $styleConfig): array
    {
        $subtitles = [];
        $wordsPerSubtitle = 8; // Group words into subtitle chunks
        $chunks = array_chunk($transcript, $wordsPerSubtitle);

        foreach ($chunks as $chunk) {
            if (empty($chunk)) continue;

            $firstWord = $chunk[0];
            $lastWord = end($chunk);

            // Create subtitle text from words
            $text = implode(' ', array_column($chunk, 'word'));

            // Create subtitle in API format
            $subtitle = [
                'text' => ucfirst($text),
                'start' => $firstWord['start'],
                'end' => $lastWord['end'],
                'style' => $styleConfig['style'] ?? 'tiktok_trending',
                'position' => $styleConfig['position'] ?? 'bottom',
                'fontFamily' => $styleConfig['fontFamily'] ?? 'Roboto'
            ];

            // Add style-specific parameters
            if (isset($styleConfig['backgroundColor'])) {
                $subtitle['backgroundColor'] = $styleConfig['backgroundColor'];
            }
            if (isset($styleConfig['color'])) {
                $subtitle['color'] = $styleConfig['color'];
            }

            // Add color variations for banner styles
            if (in_array($styleConfig['style'] ?? '', ['arabic_banner', 'rectangular_banner'])) {
                $colors = ['#007acc', '#28a745', '#dc3545', '#ffc107', '#ff8800', '#6f42c1'];
                $subtitle['backgroundColor'] = $colors[count($subtitles) % count($colors)];
            }

            $subtitles[] = $subtitle;
        }

        return $subtitles;
    }

    private function generateSceneBasedSubtitles(Project $project, array $styleConfig): array
    {
        $subtitles = [];
        $scenes = $project->scenes()->orderBy('scene_number')->get();
        $currentTime = 0;

        foreach ($scenes as $scene) {
            if (!empty($scene->script_text)) {
                $duration = (float) $scene->duration_seconds;

                // Create subtitle in API format
                $subtitle = [
                    'text' => $scene->script_text,
                    'start' => $currentTime,
                    'end' => $currentTime + $duration,
                    'style' => $styleConfig['style'] ?? 'tiktok_trending',
                    'position' => $styleConfig['position'] ?? 'bottom',
                    'fontFamily' => $styleConfig['fontFamily'] ?? 'Roboto'
                ];

                // Add style-specific parameters
                if (isset($styleConfig['backgroundColor'])) {
                    $subtitle['backgroundColor'] = $styleConfig['backgroundColor'];
                }
                if (isset($styleConfig['color'])) {
                    $subtitle['color'] = $styleConfig['color'];
                }

                // Add color variations for banner styles
                if (in_array($styleConfig['style'] ?? '', ['arabic_banner', 'rectangular_banner'])) {
                    $colors = ['#007acc', '#28a745', '#dc3545', '#ffc107', '#ff8800', '#6f42c1'];
                    $subtitle['backgroundColor'] = $colors[count($subtitles) % count($colors)];
                }

                $subtitles[] = $subtitle;
                $currentTime += $duration;
            }
        }

        return $subtitles;
    }

    private function uploadVoiceoverTo0x0(Project $project): ?string
    {
        try {
            if (!$project->voiceover_file || !Storage::disk('public')->exists($project->voiceover_file)) {
                logger()->warning('⚠️ Voiceover file not found for upload', [
                    'project_id' => $project->id,
                    'voiceover_file' => $project->voiceover_file,
                    'file_exists' => $project->voiceover_file ? Storage::disk('public')->exists($project->voiceover_file) : false
                ]);
                return null;
            }

            $filePath = Storage::disk('public')->path($project->voiceover_file);
            $fileName = basename($project->voiceover_file);

            // Normalize path for Windows compatibility
            $filePath = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $filePath);

            if (!file_exists($filePath)) {
                logger()->error('❌ File does not exist at resolved path', [
                    'project_id' => $project->id,
                    'resolved_path' => $filePath,
                    'original_file' => $project->voiceover_file
                ]);
                return null;
            }

            $fileSize = filesize($filePath);

            logger()->info('📤 Uploading voiceover to 0x0.st', [
                'project_id' => $project->id,
                'file_name' => $fileName,
                'file_path' => $filePath,
                'file_size' => $fileSize
            ]);

            // Read file content
            $fileContent = file_get_contents($filePath);
            if ($fileContent === false) {
                logger()->error('❌ Failed to read file content', [
                    'project_id' => $project->id,
                    'file_path' => $filePath
                ]);
                return null;
            }

            // Upload to 0x0.st with timeout and SSL verification disabled
            $response = Http::timeout(60)
                ->withOptions([
                    'verify' => false, // Disable SSL verification to fix cURL error 77
                ])
                ->attach(
                    'file',
                    $fileContent,
                    $fileName
                )->post('https://0x0.st');

            if ($response->successful()) {
                $uploadUrl = trim($response->body());

                logger()->info('✅ Voiceover uploaded successfully', [
                    'project_id' => $project->id,
                    'upload_url' => $uploadUrl,
                    'response_status' => $response->status()
                ]);

                return $uploadUrl;
            } else {
                logger()->error('❌ Failed to upload voiceover to 0x0.st', [
                    'project_id' => $project->id,
                    'status_code' => $response->status(),
                    'response_body' => $response->body(),
                    'response_headers' => $response->headers()
                ]);

                return null;
            }
        } catch (\Exception $e) {
            logger()->error('❌ Exception during voiceover upload', [
                'project_id' => $project->id,
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);

            return null;
        }
    }

    /**
     * Generate a hash of the scene configuration for comparison
     */
    private function generateSceneConfigHash(array $scenes, Project $project): string
    {
        // Create a normalized array of scene data for hashing
        $sceneConfig = [];

        foreach ($scenes as $sceneData) {
            // Get the scene from database to include scene-specific data
            $scene = Scene::where('id', $sceneData['scene_id'])
                        ->where('project_id', $project->id)
                        ->first();

            if (!$scene) {
                continue;
            }

            // Process overlay data with defaults
            $overlays = $sceneData['overlays'] ?? [];
            $processedOverlays = [
                'logo' => (bool) ($overlays['logo'] ?? false),
                'cta' => (bool) ($overlays['cta'] ?? false),
                'text' => (bool) ($overlays['text'] ?? false),
                'text_content' => (string) ($overlays['text_content'] ?? '')
            ];

            $sceneConfig[] = [
                'scene_id' => $sceneData['scene_id'],
                'video_url' => $sceneData['video_url'],
                'duration' => (float) $sceneData['duration'],
                'start_time' => (float) $sceneData['start_time'],
                'end_time' => (float) $sceneData['end_time'],
                'scene_number' => $scene->scene_number,
                'script_text' => $scene->script_text,
                'overlays' => $processedOverlays,
                // Include scene status to detect regenerated scenes
                'scene_status' => $scene->status,
                'scene_updated_at' => $scene->updated_at->toISOString()
            ];
        }

        // Sort by scene_id to ensure consistent hashing
        usort($sceneConfig, function($a, $b) {
            return $a['scene_id'] <=> $b['scene_id'];
        });

        // Generate hash of the configuration
        return hash('sha256', json_encode($sceneConfig));
    }

    /**
     * Search music tracks using Freesound API
     */
    public function searchMusic(Request $request)
    {
        $query = $request->get('q', '');
        $category = $request->get('category', '');
        $perPage = $request->get('per_page', 12);
        $page = $request->get('page', 1);

        logger()->info('🎵 REAL FREESOUND API - Music search requested', [
            'query' => $query,
            'category' => $category,
            'per_page' => $perPage,
            'page' => $page,
            'timestamp' => now()->toISOString()
        ]);

        $apiKey = config('services.freesound.api_key');
        if (!$apiKey) {
            logger()->error('🎵 Freesound API key not configured');
            return response()->json([
                'success' => false,
                'message' => 'Music service not configured'
            ], 500);
        }

        try {
            // Build search query based on category and user input
            $searchQuery = '';

            if ($query) {
                $searchQuery = $query . ' background music instrumental';
            } else if ($category && $category !== 'music') {
                // Map categories to search terms for background music
                $categoryMap = [
                    'corporate' => 'corporate business background music instrumental',
                    'chill' => 'chill ambient relaxing background music',
                    'energetic' => 'energetic upbeat background music',
                    'cinematic' => 'cinematic epic dramatic background music',
                    'ambient' => 'ambient atmospheric background music',
                    'electronic' => 'electronic synthesizer background music'
                ];

                $searchQuery = $categoryMap[$category] ?? ($category . ' background music');
            } else {
                $searchQuery = 'background music instrumental loop';
            }

            logger()->info('🎵 Making Freesound search request', [
                'search_query' => $searchQuery,
                'category' => $category
            ]);

            // Search using Freesound API with pagination and background music filtering
            $response = Http::withoutVerifying()
                ->timeout(30)
                ->get('https://freesound.org/apiv2/search/text/', [
                    'token' => $apiKey,
                    'query' => $searchQuery,
                    'filter' => 'duration:[30 TO 300] type:(wav OR mp3) -tag:sound-effect -tag:sfx -tag:voice -tag:speech',
                    'sort' => 'downloads_desc',
                    'page' => $page,
                    'page_size' => min($perPage, 50),
                    'fields' => 'id,name,tags,username,duration,previews,download'
                ]);

            logger()->info('🎵 Freesound search response', [
                'status' => $response->status(),
                'body_preview' => substr($response->body(), 0, 200)
            ]);

            if ($response->successful()) {
                $data = $response->json();
                logger()->info('🎵 Freesound search response received', [
                    'count' => $data['count'] ?? 0,
                    'results_count' => count($data['results'] ?? [])
                ]);

                if (empty($data['results'])) {
                    logger()->warning('🎵 No music tracks found for search');
                    return response()->json([
                        'success' => true,
                        'tracks' => [],
                        'total' => 0,
                        'message' => 'No music tracks found for your search'
                    ]);
                }

                // Transform the data to match our frontend needs
                $tracks = collect($data['results'])->map(function ($track) use ($category) {
                    $previewUrl = $track['previews']['preview-hq-mp3'] ?? $track['previews']['preview-lq-mp3'] ?? null;
                    $downloadUrl = isset($track['download']) ? $track['download'] : $previewUrl;

                    return [
                        'id' => $track['id'],
                        'name' => $track['name'] ?? 'Untitled Track',
                        'artist' => $track['username'] ?? 'Unknown Artist',
                        'duration' => round($track['duration'] ?? 0),
                        'preview_url' => $previewUrl,
                        'download_url' => $downloadUrl,
                        'tags' => is_array($track['tags']) ? implode(', ', $track['tags']) : ($track['tags'] ?? ''),
                        'category' => $category ?: 'music',
                        'freesound_id' => $track['id']
                    ];
                });

                logger()->info('🎵 Returning Freesound search results', ['count' => $tracks->count()]);

                return response()->json([
                    'success' => true,
                    'tracks' => $tracks,
                    'total' => $data['count'] ?? 0
                ]);
            } else {
                logger()->error('🎵 Freesound search request failed', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Failed to search music: ' . $response->body()
                ], 500);
            }

        } catch (\Exception $e) {
            logger()->error('🎵 Music search failed', [
                'error' => $e->getMessage(),
                'query' => $query,
                'category' => $category,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Music search failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get predefined music categories
     */
    public function getMusicCategories()
    {
        logger()->info('🎵 REAL FREESOUND API - Music categories requested', [
            'timestamp' => now()->toISOString()
        ]);

        $categories = [
            ['id' => 'music', 'name' => 'All Music', 'description' => 'All available music tracks'],
            ['id' => 'corporate', 'name' => 'Corporate', 'description' => 'Professional business music'],
            ['id' => 'chill', 'name' => 'Chill', 'description' => 'Relaxed and calm music'],
            ['id' => 'energetic', 'name' => 'Energetic', 'description' => 'Upbeat and energetic tracks'],
            ['id' => 'cinematic', 'name' => 'Cinematic', 'description' => 'Epic and dramatic music'],
            ['id' => 'ambient', 'name' => 'Ambient', 'description' => 'Atmospheric background music'],
            ['id' => 'electronic', 'name' => 'Electronic', 'description' => 'Electronic and synthesized music']
        ];

        logger()->info('🎵 REAL FREESOUND API - Returning categories', [
            'count' => count($categories),
            'timestamp' => now()->toISOString()
        ]);

        return response()->json([
            'success' => true,
            'categories' => $categories,
            'api_version' => 'freesound_real_api',
            'timestamp' => now()->toISOString()
        ]);
    }

    /**
     * Get popular music tracks from Freesound API
     */
    public function getPopularMusic(Request $request)
    {
        $limit = $request->get('limit', 5);

        logger()->info('🎵 REAL FREESOUND API - Popular music requested', [
            'limit' => $limit,
            'timestamp' => now()->toISOString()
        ]);

        $apiKey = config('services.freesound.api_key');
        if (!$apiKey) {
            logger()->error('🎵 Freesound API key not configured');
            return response()->json([
                'success' => false,
                'message' => 'Music service not configured'
            ], 500);
        }

        try {
            logger()->info('🎵 Making Freesound API request for popular music');

            // Search for popular background music tracks using Freesound API
            $response = Http::withoutVerifying()
                ->timeout(30)
                ->get('https://freesound.org/apiv2/search/text/', [
                    'token' => $apiKey,
                    'query' => 'background music loop instrumental',
                    'filter' => 'duration:[30 TO 300] type:(wav OR mp3) -tag:sound-effect -tag:sfx -tag:voice',
                    'sort' => 'downloads_desc',
                    'page_size' => $limit,
                    'fields' => 'id,name,tags,username,duration,previews,download'
                ]);

            logger()->info('🎵 Freesound API response', [
                'status' => $response->status(),
                'body_preview' => substr($response->body(), 0, 200)
            ]);

            if ($response->successful()) {
                $data = $response->json();
                logger()->info('🎵 Freesound API response received', [
                    'count' => $data['count'] ?? 0,
                    'results_count' => count($data['results'] ?? [])
                ]);

                if (empty($data['results'])) {
                    logger()->warning('🎵 No music tracks found in Freesound response');
                    return response()->json([
                        'success' => true,
                        'tracks' => [],
                        'message' => 'No music tracks found'
                    ]);
                }

                $tracks = collect($data['results'])->map(function ($track) {
                    $previewUrl = $track['previews']['preview-hq-mp3'] ?? $track['previews']['preview-lq-mp3'] ?? null;
                    $downloadUrl = isset($track['download']) ? $track['download'] : $previewUrl;

                    return [
                        'id' => $track['id'],
                        'name' => $track['name'] ?? 'Untitled Track',
                        'artist' => $track['username'] ?? 'Unknown Artist',
                        'duration' => round($track['duration'] ?? 0),
                        'preview_url' => $previewUrl,
                        'download_url' => $downloadUrl,
                        'tags' => is_array($track['tags']) ? implode(', ', $track['tags']) : ($track['tags'] ?? ''),
                        'category' => 'popular',
                        'freesound_id' => $track['id']
                    ];
                });

                logger()->info('🎵 Returning Freesound popular tracks', ['count' => $tracks->count()]);

                return response()->json([
                    'success' => true,
                    'tracks' => $tracks
                ]);
            } else {
                logger()->error('🎵 Freesound API request failed', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Failed to fetch music from Freesound: ' . $response->body()
                ], 500);
            }

        } catch (\Exception $e) {
            logger()->error('🎵 Popular music fetch failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch popular music: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get trending background music tracks from Freesound API
     */
    public function getTrendingMusic(Request $request)
    {
        $limit = $request->get('limit', 9); // Default to 9 tracks for trending

        logger()->info('🎵 REAL FREESOUND API - Trending corporate music requested', [
            'limit' => $limit,
            'timestamp' => now()->toISOString()
        ]);

        $apiKey = config('services.freesound.api_key');
        if (!$apiKey) {
            logger()->error('🎵 Freesound API key not configured');
            return response()->json([
                'success' => false,
                'message' => 'Music service not configured',
                'debug' => 'API key missing from config'
            ], 500);
        }

        logger()->info('🎵 API key found, length: ' . strlen($apiKey));

        try {
            logger()->info('🎵 Making Freesound API request for corporate trending music');

            // Search specifically for corporate background music tracks
            $response = Http::withoutVerifying()
                ->timeout(30)
                ->get('https://freesound.org/apiv2/search/text/', [
                    'token' => $apiKey,
                    'query' => 'corporate business background music instrumental professional commercial',
                    'filter' => 'duration:[30 TO 300] type:(wav OR mp3) -tag:sound-effect -tag:sfx -tag:voice -tag:speech -tag:noise',
                    'sort' => 'downloads_desc', // Sort by popularity instead of creation date
                    'page_size' => $limit,
                    'fields' => 'id,name,tags,username,duration,previews,download'
                ]);

            logger()->info('🎵 Freesound trending API response', [
                'status' => $response->status(),
                'body_preview' => substr($response->body(), 0, 200)
            ]);

            if ($response->successful()) {
                $data = $response->json();
                logger()->info('🎵 Freesound trending API response received', [
                    'count' => $data['count'] ?? 0,
                    'results_count' => count($data['results'] ?? [])
                ]);

                if (empty($data['results'])) {
                    logger()->warning('🎵 No trending music tracks found in Freesound API');
                    return response()->json([
                        'success' => false,
                        'message' => 'No corporate music tracks found',
                        'debug' => 'Empty results from Freesound API',
                        'tracks' => []
                    ]);
                }

                $tracks = collect($data['results'])->map(function ($track) {
                    $previewUrl = $track['previews']['preview-hq-mp3'] ?? $track['previews']['preview-lq-mp3'] ?? null;
                    $downloadUrl = isset($track['download']) ? $track['download'] : $previewUrl;

                    return [
                        'id' => $track['id'],
                        'name' => $track['name'] ?? 'Untitled Track',
                        'artist' => $track['username'] ?? 'Unknown Artist',
                        'duration' => round($track['duration'] ?? 0),
                        'preview_url' => $previewUrl,
                        'download_url' => $downloadUrl,
                        'tags' => is_array($track['tags']) ? implode(', ', $track['tags']) : ($track['tags'] ?? ''),
                        'category' => 'corporate', // Mark as corporate category
                        'freesound_id' => $track['id']
                    ];
                });

                logger()->info('🎵 Returning Freesound trending tracks', ['count' => $tracks->count()]);

                return response()->json([
                    'success' => true,
                    'tracks' => $tracks
                ]);
            } else {
                logger()->error('🎵 Freesound trending API request failed', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Failed to fetch trending music from Freesound: ' . $response->body()
                ], 500);
            }

        } catch (\Exception $e) {
            logger()->error('🎵 Trending music fetch failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch corporate music from API',
                'debug' => $e->getMessage(),
                'tracks' => []
            ], 500);
        }
    }

    public function confirmScenes(Request $request, Project $project)
    {
        try {
            $this->authorize('update', $project);

            logger()->info('🎬 Confirm scenes request received', [
                'project_id' => $project->id,
                'user_id' => auth()->id(),
                'request_data' => $request->all(),
                'current_status' => $project->status
            ]);

            // Validate the request
            $validatedData = $request->validate([
                'scenes' => 'required|array|min:1',
                'scenes.*.scene_id' => 'required|integer|exists:scenes,id',
                'scenes.*.video_url' => 'required|url',
                'scenes.*.duration' => 'required|numeric|min:0',
                'scenes.*.start_time' => 'required|numeric|min:0',
                'scenes.*.end_time' => 'required|numeric|min:0',
                'scenes.*.overlays' => 'sometimes|array',
                'scenes.*.overlays.logo' => 'sometimes|boolean',
                'scenes.*.overlays.cta' => 'sometimes|boolean',
                'scenes.*.overlays.text' => 'sometimes|boolean',
                'scenes.*.overlays.text_content' => 'sometimes|nullable|string|max:255'
            ]);

            // Update scenes with trimming data from review page
            foreach ($validatedData['scenes'] as $sceneData) {
                $scene = $project->scenes()->find($sceneData['scene_id']);
                if ($scene) {
                    // Calculate the actual trimmed duration
                    $startTime = $sceneData['start_time'] ?? 0;
                    $endTime = $sceneData['end_time'] ?? $scene->duration_seconds;
                    $trimmedDuration = $endTime - $startTime;
                    
                    // Ensure trimmed duration doesn't exceed actual video duration
                    $trimmedDuration = min($trimmedDuration, $scene->duration_seconds);
                    
                    logger()->info('🎬 Updating scene with trimming data', [
                        'scene_id' => $scene->id,
                        'scene_number' => $scene->scene_number,
                        'start_time' => $startTime,
                        'end_time' => $endTime,
                        'trimmed_duration' => $trimmedDuration,
                        'original_duration' => $scene->duration_seconds
                    ]);
                    
                    $scene->update([
                        'start_time' => $startTime,
                        'end_time' => $endTime,
                        'trimmed_duration' => $trimmedDuration
                    ]);
                }
            }

            // Update project status to subtitle_selection
            $project->update([
                'status' => 'subtitle_selection',
                'last_scene_config' => $this->generateSceneConfigHash($validatedData['scenes'], $project),
                'processing_started_at' => now()
            ]);

            logger()->info('✅ Project status updated to subtitle_selection', [
                'project_id' => $project->id,
                'scenes_count' => count($validatedData['scenes'])
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Scenes confirmed! Ready to add subtitles.',
                'redirect_to_subtitles' => true,
                'project_id' => $project->id
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            logger()->error('❌ Scene confirmation validation error', [
                'project_id' => $project->id,
                'errors' => $e->errors()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Validation error: ' . implode(', ', Arr::flatten($e->errors())),
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            logger()->error('❌ Scene confirmation exception', [
                'project_id' => $project->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An error occurred while confirming scenes: ' . $e->getMessage()
            ], 500);
        }
    }

}