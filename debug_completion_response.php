<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Project;
use App\Services\SubtitleGenerationService;

echo "🔍 Debugging completion response structure...\n\n";

$project = Project::find(16);

// Prepare the same data that would be sent from the frontend
$requestData = [
    'style' => 'tiktok_trending',
    'style_config' => [
        'style' => 'tiktok_trending',
        'position' => 'bottom',
        'fontFamily' => 'Roboto',
        'transition' => 'fade'
    ],
    'videos' => [],
    'voiceOverVolume' => 1.3,
    'musicVolume' => 0.2
];

// Get scene data
$scenes = $project->scenes()->orderBy('scene_number')->get();
foreach($scenes as $scene) {
    $requestData['videos'][] = [
        'video_url' => $scene->video_url,
        'scene_id' => $scene->id,
        'duration' => $scene->trimmed_duration ?? $scene->duration_seconds,
        'start_time' => $scene->start_time ?? 0,
        'end_time' => $scene->end_time ?? $scene->duration_seconds
    ];
}

// Use the controller to prepare data
$controller = new \App\Http\Controllers\ProjectController();
$reflection = new ReflectionClass($controller);
$method = $reflection->getMethod('prepareSubtitleData');
$method->setAccessible(true);

$preparedData = $method->invoke($controller, $project, $requestData);
$videoData = $preparedData['videoData'];
$projectInfo = $preparedData['projectInfo'];

echo "📊 Testing completion response...\n";

// Test the service and see what it returns
try {
    $service = new SubtitleGenerationService();
    
    // Test just the render request part first
    echo "📤 Testing render request...\n";
    
    $renderReflection = new ReflectionClass($service);
    $renderMethod = $renderReflection->getMethod('sendRenderRequest');
    $renderMethod->setAccessible(true);
    
    $renderResult = $renderMethod->invoke($service, $videoData);
    
    if ($renderResult) {
        echo "✅ Render request successful\n";
        echo "📋 Render ID: " . ($renderResult['id'] ?? 'NOT_SET') . "\n";
        
        // Now test the status checking with a shorter timeout
        echo "\n🔍 Testing status check with shorter timeout...\n";
        
        $statusMethod = $renderReflection->getMethod('waitForRenderCompletion');
        $statusMethod->setAccessible(true);
        
        // Create a modified version that times out quickly for testing
        $renderId = $renderResult['id'];
        $maxAttempts = 10; // Only 10 attempts for testing
        $attempt = 0;
        
        while ($attempt < $maxAttempts) {
            try {
                $statusUrl = config('services.video_render.base_url') . '/status/' . $renderId;
                
                echo "🔍 Checking status at: $statusUrl (attempt " . ($attempt + 1) . ")\n";
                
                $response = \Illuminate\Support\Facades\Http::withOptions([
                    'timeout' => 30,
                    'verify' => false
                ])->get($statusUrl);
                
                if (!$response->successful()) {
                    throw new \Exception('Status check failed: ' . $response->body());
                }
                
                $statusData = $response->json();
                $status = $statusData['status'] ?? 'unknown';
                
                echo "📋 Status: $status\n";
                echo "📋 Full response: " . json_encode($statusData) . "\n\n";
                
                if ($status === 'completed') {
                    echo "✅ Render completed!\n";
                    echo "📋 Download URL: " . ($statusData['download_url'] ?? 'NOT_SET') . "\n";
                    echo "📋 Download URL field: " . (isset($statusData['download_url']) ? 'EXISTS' : 'NOT_EXISTS') . "\n";
                    echo "📋 All fields: " . implode(', ', array_keys($statusData)) . "\n";
                    
                    // Test what the service would return
                    $expectedResponse = [
                        'merged video url' => $statusData['download_url'] ?? '',
                        'completed_at' => $statusData['completedAt'] ?? now()->toISOString()
                    ];
                    
                    echo "📋 Expected service response: " . json_encode($expectedResponse) . "\n";
                    break;
                } elseif ($status === 'failed') {
                    echo "❌ Render failed: " . ($statusData['error'] ?? 'Unknown error') . "\n";
                    break;
                } else {
                    echo "⏳ Still processing...\n";
                    sleep(3); // Wait 3 seconds for testing
                    $attempt++;
                }
                
            } catch (Exception $e) {
                echo "❌ Status check error: " . $e->getMessage() . "\n";
                break;
            }
        }
        
        if ($attempt >= $maxAttempts) {
            echo "⏰ Test timeout reached\n";
        }
        
    } else {
        echo "❌ Render request failed\n";
    }
    
} catch (Exception $e) {
    echo "❌ Service error: " . $e->getMessage() . "\n";
}

echo "\n🔍 Debug completed!\n";



