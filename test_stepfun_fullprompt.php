<?php
/**
 * Targeted stepfun test — calls Http::post() directly with the full scene-gen prompt,
 * bypassing the service class to isolate where the crash occurs.
 */
ini_set('display_errors', 1);
ini_set('memory_limit', '512M');
error_reporting(E_ALL);

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Project;
use App\Services\SceneGenerationService;
use Illuminate\Support\Facades\Http;

$projectId = isset($argv[1]) ? (int) $argv[1] : 70;
$project   = Project::findOrFail($projectId);

echo "Project: {$project->name}\n";
echo "Building prompt via service...\n";

// Use reflection just for building the prompt (lightweight, no HTTP)
$service = app(SceneGenerationService::class);

function invokePrivate(object $instance, string $method, array $args = []) {
    $ref = new ReflectionClass($instance);
    $m   = $ref->getMethod($method);
    $m->setAccessible(true);
    return $m->invokeArgs($instance, $args);
}

// Step 1: transcribe
echo "Transcribing...\n";
$voiceoverPath = storage_path('app/public/' . $project->voiceover_file);
$transcriptData = invokePrivate($service, 'transcribeAudio', [$voiceoverPath, $project->language]);
echo "Transcription OK — " . count($transcriptData) . " words\n";

// Step 2: build prompt
$script = $project->script ?? '';
$prompt = invokePrivate($service, 'buildGeminiPrompt', [$script, $transcriptData, $project->language]);
echo "Prompt built — " . strlen($prompt) . " chars\n";

// Step 3: call stepfun DIRECTLY via Http facade (no retry, no service wrapper)
$model = 'stepfun/step-3.5-flash:free';
$key   = config('services.openrouter.api_key');
$url   = config('services.openrouter.base_url');

echo "Calling {$model} directly (no retry)...\n";
$start = microtime(true);

try {
    $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $key,
            'Content-Type'  => 'application/json',
        ])
        ->timeout(180)
        ->connectTimeout(15)
        ->withoutVerifying()
        ->post($url, [
            'model'       => $model,
            'messages'    => [['role' => 'user', 'content' => $prompt]],
            'temperature' => 0.2,
        ]);

    $elapsed = round((microtime(true) - $start) * 1000);
    echo "HTTP status : " . $response->status() . " ({$elapsed}ms)\n";

    if (!$response->successful()) {
        echo "FAILED: " . $response->body() . "\n";
        exit(1);
    }

    $content = $response->json('choices.0.message.content');
    echo "Content type: " . gettype($content) . "\n";
    echo "Content length: " . (is_string($content) ? strlen($content) : 'N/A') . " chars\n";
    echo "Preview: " . mb_substr(is_string($content) ? $content : json_encode($content), 0, 500) . "\n";
    echo "\nDone — stepfun WORKS with full prompt.\n";

} catch (\Throwable $e) {
    $elapsed = round((microtime(true) - $start) * 1000);
    echo "EXCEPTION after {$elapsed}ms: " . get_class($e) . ": " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
    exit(1);
}
