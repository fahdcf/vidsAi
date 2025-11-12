<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;

// Public routes
Route::get('/', [HomeController::class, 'index'])->name('home');
Route::get('/pricing', [HomeController::class, 'pricing'])->name('pricing');

// Test route for debugging Laragon setup
Route::get('/test-laravel', function() {
    return response()->json([
        'success' => true,
        'message' => 'Laravel is working correctly',
        'timestamp' => now(),
        'url' => request()->url(),
        'path' => request()->path()
    ]);
})->name('test-laravel');

// Test route for debugging regenerate-proxy (outside auth for testing)
Route::post('/test-regenerate-proxy', function(Request $request) {
    return response()->json([
        'success' => true,
        'message' => 'Regenerate proxy test successful',
        'data' => $request->all(),
        'timestamp' => now()
    ]);
})->name('test-regenerate-proxy')->withoutMiddleware(['web']);



// Music API routes (moved outside auth middleware for testing)
Route::middleware('auth')->group(function () {
    Route::get('/api/music/search', [ProjectController::class, 'searchMusic'])->name('api.music.search');
    Route::get('/api/music/categories', [ProjectController::class, 'getMusicCategories'])->name('api.music.categories');
    Route::get('/api/music/popular', [ProjectController::class, 'getPopularMusic'])->name('api.music.popular');
    Route::get('/api/music/trending', [ProjectController::class, 'getTrendingMusic'])->name('api.music.trending');
});



// Authenticated routes
Route::middleware('auth')->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    
    // Project routes
    Route::get('/create', [ProjectController::class, 'create'])->name('projects.create');
    Route::post('/create', [ProjectController::class, 'store'])->name('projects.store');
    Route::get('/processing/{project}', [ProjectController::class, 'processing'])->name('projects.processing');
    Route::get('/projects/{project}/status', [ProjectController::class, 'checkStatus'])->name('projects.status');
    Route::get('/review/{project}', [ProjectController::class, 'review'])->name('projects.review');
    Route::post('/review/{project}/scenes/{scene}/regenerate', [ProjectController::class, 'regenerateScene'])->name('projects.regenerate-scene');
    Route::post('/review/{project}/scenes/{scene}/upload', [ProjectController::class, 'uploadCustomMedia'])->name('projects.upload-custom');
    Route::put('/scenes/{scene}/update', [ProjectController::class, 'updateScene'])->name('scenes.update');
    Route::post('/scenes/{scene}/regenerate-proxy', [ProjectController::class, 'regenerateSceneProxy'])->name('scenes.regenerate-proxy');
    Route::get('/scenes/{scene}/ai-status', [ProjectController::class, 'checkAiGenerationStatus'])->name('scenes.ai-status');
    Route::post('/upload-image', [ProjectController::class, 'uploadImage'])->name('upload-image');
    Route::post('/upload-image-to-hosting', [ProjectController::class, 'uploadImageToHosting'])->name('upload-image-to-hosting');




    Route::post('/review/{project}/approve', [ProjectController::class, 'approveScenes'])->name('projects.approve-scenes');
    Route::post('/review/{project}/confirm', [ProjectController::class, 'confirmScenes'])->name('projects.confirm-scenes');
    Route::get('/processing/{project}', [ProjectController::class, 'processing'])->name('projects.processing');
    Route::get('/processing/{project}/status', [ProjectController::class, 'processingStatus'])->name('projects.processing-status');
Route::post('/projects/{project}/retry', [ProjectController::class, 'retryProject'])->name('projects.retry');
    Route::get('/subtitle-styles/{project}', [ProjectController::class, 'subtitleStyles'])->name('projects.subtitle-styles');
    Route::post('/subtitle-styles/{project}/prepare-voiceover', [ProjectController::class, 'prepareVoiceover'])->name('projects.prepare-voiceover');
    Route::post('/subtitle-styles/{project}/generate', [ProjectController::class, 'generateSubtitles'])->name('projects.generate-subtitles');



    // Test route to verify Freesound API
    Route::get('/test-freesound', function() {
        $apiKey = config('services.freesound.api_key');
        return response()->json([
            'message' => 'Freesound API test',
            'api_key_configured' => $apiKey ? 'Yes' : 'No',
            'api_key_preview' => $apiKey ? substr($apiKey, 0, 10) . '...' : 'Not set',
            'timestamp' => now()->toISOString()
        ]);
    });

    // Test route to verify trending music API
    Route::get('/test-trending-music', function() {
        $controller = new App\Http\Controllers\ProjectController();
        $request = new Illuminate\Http\Request(['limit' => 9]);
        return $controller->getTrendingMusic($request);
    });

    // Test route to verify subtitles script functionality
    Route::get('/test-subtitles-script/{project}', function($projectId) {
        $project = App\Models\Project::find($projectId);
        if (!$project) {
            return response()->json(['error' => 'Project not found'], 404);
        }

        $debugInfo = [
            'project_id' => $project->id,
            'project_name' => $project->name,
            'has_voiceover_transcript' => $project->hasVoiceoverTranscript(),
            'has_subtitles_script' => $project->hasSubtitlesScript(),
            'transcript_words_count' => $project->getTranscriptWordsCount(),
            'subtitles_script_count' => $project->getSubtitlesScriptCount(),
        ];

        if ($project->hasVoiceoverTranscript()) {
            $transcript = $project->getVoiceoverTranscript();
            $debugInfo['transcript_sample'] = array_slice($transcript, 0, 5);
            $debugInfo['transcript_duration'] = $project->getTranscriptDuration();
        }

        if ($project->hasSubtitlesScript()) {
            $subtitlesScript = $project->getSubtitlesScript();
            $debugInfo['subtitles_script_sample'] = array_slice($subtitlesScript, 0, 10);
        }

        return response()->json($debugInfo);
    });

    // Test route to create a sample project with subtitles script
    Route::get('/test-create-sample-project', function() {
        // Sample data from your n8n response
        $sampleTranscript = [
            ["word" => "discover", "start" => 0.35951087, "end" => 0.6790761, "confidence" => 0.99365234],
            ["word" => "eco", "start" => 0.6790761, "end" => 1.0785326, "confidence" => 0.9716797],
            ["word" => "sip", "start" => 1.0785326, "end" => 1.2383152, "confidence" => 0.54003906],
            ["word" => "the", "start" => 2.037228, "end" => 2.3567934, "confidence" => 0.9975586],
            ["word" => "reusable", "start" => 2.3567934, "end" => 2.75625, "confidence" => 0.99853516],
            ["word" => "water", "start" => 2.75625, "end" => 3.0758152, "confidence" => 0.9970703],
            ["word" => "bottle", "start" => 3.0758152, "end" => 3.5758152, "confidence" => 0.99853516],
        ];

        $sampleSubtitlesScript = [
            "Discover EcoSip",
            "the reusable water bottle",
            "that keeps your drinks cold",
            "for 24 hours and hot",
            "for 12 hours"
        ];

        // Create or update a test project
        $project = App\Models\Project::updateOrCreate(
            ['name' => 'Test Subtitles Script Project'],
            [
                'user_id' => 1, // Assuming user ID 1 exists
                'type' => 'product',
                'category' => 'tech',
                'description' => 'Test project for subtitles script functionality',
                'language' => 'english',
                'video_format' => ['16:9'],
                'script_option' => 'paste',
                'custom_script' => 'Discover EcoSip, the reusable water bottle...',
                'voiceover_option' => 'upload',
                'status' => 'reviewing',
                'voiceover_transcript' => $sampleTranscript,
                'subtitles_script' => $sampleSubtitlesScript
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Sample project created/updated successfully',
            'project_id' => $project->id,
            'project_name' => $project->name,
            'has_transcript' => $project->hasVoiceoverTranscript(),
            'has_subtitles_script' => $project->hasSubtitlesScript(),
            'transcript_words' => $project->getTranscriptWordsCount(),
            'subtitles_count' => $project->getSubtitlesScriptCount(),
            'test_url' => url("/test-subtitles-script/{$project->id}")
        ]);
    });

    // Test route to test subtitle generation with new method
    Route::get('/test-subtitle-generation/{project}', function($projectId) {
        $project = App\Models\Project::find($projectId);
        if (!$project) {
            return response()->json(['error' => 'Project not found'], 404);
        }

        // Test style configuration
        $styleConfig = [
            'position' => 'bottom',
            'backgroundColor' => 'rgba(0,0,0,0.8)',
            'textColor' => '#ffffff',
            'fontSize' => 48,
            'transition' => 'fade',
            'transitionDuration' => 0.5
        ];

        // Use reflection to access private method for testing
        $controller = new App\Http\Controllers\ProjectController();
        $reflection = new ReflectionClass($controller);
        $method = $reflection->getMethod('generateSubtitleEntries');
        $method->setAccessible(true);

        try {
            $subtitles = $method->invoke($controller, $project, $styleConfig);

            return response()->json([
                'success' => true,
                'project_id' => $project->id,
                'project_name' => $project->name,
                'method_used' => $project->hasSubtitlesScript() && $project->hasVoiceoverTranscript() ? 'subtitles_script_with_timing' :
                               ($project->hasVoiceoverTranscript() ? 'transcript_based' : 'scene_based'),
                'subtitles_count' => count($subtitles),
                'subtitles' => $subtitles,
                'input_data' => [
                    'has_subtitles_script' => $project->hasSubtitlesScript(),
                    'has_transcript' => $project->hasVoiceoverTranscript(),
                    'subtitles_script_count' => $project->getSubtitlesScriptCount(),
                    'transcript_words_count' => $project->getTranscriptWordsCount()
                ]
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ], 500);
        }
    });

    // Test route to simulate merge videos response
    Route::get('/test-merge-response/{project}', function($projectId) {
        $project = App\Models\Project::find($projectId);
        if (!$project) {
            return response()->json(['error' => 'Project not found'], 404);
        }

        // Simulate the expected response format
        $mockResponse = [
            [
                "merged video url" => "https://0x0.st/87Yi.mp4",
                "completed_at" => "2025-08-03T01:12:21.383Z"
            ]
        ];

        // Update the project with the mock data
        $project->update([
            'status' => 'completed',
            'processing_completed_at' => now(),
            'final_video_path' => $mockResponse[0]['merged video url']
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Test merge response applied successfully!',
            'project_id' => $project->id,
            'merged_video_url' => $mockResponse[0]['merged video url'],
            'completed_at' => $mockResponse[0]['completed_at'],
            'redirect_url' => route('projects.final', $project),
            'mock_response' => $mockResponse
        ]);
    });


    // Temporary debug route (remove after testing)
    Route::get('/debug-upload/{project}', function($projectId) {
        $project = App\Models\Project::find($projectId);
        if (!$project) {
            return response()->json(['error' => 'Project not found'], 404);
        }

        // Step-by-step debugging
        $debugInfo = [];

        try {
            // Check file existence
            $debugInfo['voiceover_file'] = $project->voiceover_file;
            $debugInfo['file_exists_storage'] = Storage::disk('public')->exists($project->voiceover_file);

            // Get file path
            $filePath = Storage::disk('public')->path($project->voiceover_file);
            $debugInfo['file_path'] = $filePath;

            // Normalize path
            $normalizedPath = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $filePath);
            $debugInfo['normalized_path'] = $normalizedPath;
            $debugInfo['file_exists_filesystem'] = file_exists($normalizedPath);

            if (file_exists($normalizedPath)) {
                $debugInfo['file_size'] = filesize($normalizedPath);
                $debugInfo['file_readable'] = is_readable($normalizedPath);

                // Try to read file content
                $fileContent = file_get_contents($normalizedPath);
                $debugInfo['content_read_success'] = $fileContent !== false;
                $debugInfo['content_length'] = $fileContent !== false ? strlen($fileContent) : 0;

                if ($fileContent !== false) {
                    // Try the HTTP upload
                    $fileName = basename($project->voiceover_file);
                    $debugInfo['file_name'] = $fileName;

                    try {
                        $response = Http::timeout(60)
                            ->withOptions([
                                'verify' => false, // Disable SSL verification
                            ])
                            ->attach(
                                'file',
                                $fileContent,
                                $fileName
                            )->post('https://0x0.st');

                        $debugInfo['http_status'] = $response->status();
                        $debugInfo['http_successful'] = $response->successful();
                        $debugInfo['http_body'] = $response->body();
                        $debugInfo['http_headers'] = $response->headers();

                        if ($response->successful()) {
                            $uploadUrl = trim($response->body());
                            $debugInfo['upload_url'] = $uploadUrl;
                            $debugInfo['upload_success'] = !empty($uploadUrl);
                        }

                    } catch (Exception $httpError) {
                        $debugInfo['http_error'] = $httpError->getMessage();
                    }
                }
            }

            return response()->json($debugInfo);

        } catch (Exception $e) {
            $debugInfo['exception'] = [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ];
            return response()->json($debugInfo, 500);
        }
    });
    Route::get('/final/{project}', [ProjectController::class, 'final'])->name('projects.final');
    Route::get('/download/{project}/{format?}', [ProjectController::class, 'download'])->name('projects.download');
    Route::get('/projects/{project}/transcript', [ProjectController::class, 'viewTranscript'])->name('projects.transcript');

    // Profile routes
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Test route to check n8n endpoint connectivity
    Route::get('/test-n8n-connectivity', function() {
        try {
            $response = Http::withOptions([
                'verify' => false,
                'timeout' => 10,
            ])->get(config('services.n8n.merge_subtitles_url'));

            return response()->json([
                'success' => true,
                'status_code' => $response->status(),
                'endpoint' => config('services.n8n.merge_subtitles_url'),
                'response' => $response->body()
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'endpoint' => config('services.n8n.merge_subtitles_url')
            ], 500);
        }
    })->name('test.n8n.connectivity');

    // Simple health check route
    Route::get('/health-check', function() {
        return response()->json([
            'status' => 'ok',
            'timestamp' => now()->toISOString(),
            'laravel_version' => app()->version(),
            'php_version' => PHP_VERSION
        ]);
    })->name('health.check');

    // Test route for subtitle generation without n8n
    Route::post('/test-subtitle-generation-simple/{project}', function($projectId) {
        $project = App\Models\Project::find($projectId);
        if (!$project) {
            return response()->json(['error' => 'Project not found'], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Test response - no n8n call',
            'project_id' => $project->id,
            'timestamp' => now()->toISOString()
        ]);
    })->name('test.subtitle.generation.simple');
});

require __DIR__.'/auth.php';



