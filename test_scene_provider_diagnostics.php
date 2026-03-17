<?php
ini_set('display_errors', 1);
ini_set('memory_limit', '512M');
error_reporting(E_ALL);
ob_implicit_flush(true);

register_shutdown_function(function (): void {
    $error = error_get_last();
    if ($error !== null) {
        echo "\n[SHUTDOWN] Last PHP error: {$error['message']} in {$error['file']}:{$error['line']}\n";
    } else {
        echo "\n[SHUTDOWN] Script ended without PHP fatal.\n";
    }
});

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Project;
use App\Services\SceneGenerationService;

function section(string $title): void
{
    echo "\n" . str_repeat('=', 90) . "\n";
    echo $title . "\n";
    echo str_repeat('=', 90) . "\n";
}

function line(string $label, string $value): void
{
    echo str_pad($label . ':', 28) . $value . "\n";
}

function preview(string $text, int $limit = 400): string
{
    $text = trim($text);
    if ($text === '') {
        return '[empty]';
    }

    return mb_strlen($text) > $limit
        ? mb_substr($text, 0, $limit) . '...'
        : $text;
}

function invokePrivate(object $instance, string $methodName, array $arguments = [])
{
    $reflection = new ReflectionClass($instance);
    $method = $reflection->getMethod($methodName);
    $method->setAccessible(true);

    return $method->invokeArgs($instance, $arguments);
}

$projectId = isset($argv[1]) ? (int) $argv[1] : 70;

section('Scene Provider Diagnostics');
line('Project ID', (string) $projectId);
line('Timestamp', now()->toDateTimeString());

$project = Project::find($projectId);
if (!$project) {
    fwrite(STDERR, "[FAIL] Project {$projectId} not found.\n");
    exit(1);
}

$script = $project->custom_script ?: $project->description;
$voiceoverPath = storage_path('app/public/' . $project->voiceover_file);

line('Project name', (string) $project->name);
line('Language', (string) $project->language);
line('Voiceover file', (string) $project->voiceover_file);
line('Voiceover path', $voiceoverPath);
line('Voice file exists', file_exists($voiceoverPath) ? 'yes' : 'no');
line('Script length', (string) strlen((string) $script));

if (!file_exists($voiceoverPath)) {
    fwrite(STDERR, "[FAIL] Voiceover file not found.\n");
    exit(1);
}

if (!$script) {
    fwrite(STDERR, "[FAIL] Project has no custom_script or description.\n");
    exit(1);
}

section('Environment Summary');
line('Deepgram key length', (string) strlen((string) config('services.deepgram.api_key')));
line('OpenRouter key length', (string) strlen((string) config('services.openrouter.api_key')));
line('Gemini key length', (string) strlen((string) config('services.gemini.api_key')));
line('OpenRouter models', implode(', ', config('services.openrouter.models', [])) ?: '[none]');
line('Gemini fallback enabled', config('services.scene_generation.enable_gemini_fallback') ? 'yes' : 'no');
line('Gemini URL', (string) config('services.gemini.base_url'));

$service = app(SceneGenerationService::class);

section('Step 1: Deepgram Transcription');
$transcriptData = null;

try {
    $start = microtime(true);
    $transcriptData = invokePrivate($service, 'transcribeAudio', [$voiceoverPath, $project->language]);
    $elapsedMs = (int) round((microtime(true) - $start) * 1000);

    $words = $transcriptData['words'] ?? [];
    line('Result', '[OK] Deepgram transcription succeeded');
    line('Elapsed', $elapsedMs . ' ms');
    line('Words', (string) count($words));
    line('Transcript preview', preview((string) ($transcriptData['text'] ?? '')));
} catch (Throwable $e) {
    line('Result', '[FAIL] Deepgram transcription failed');
    line('Error', $e->getMessage());
    line('Location', $e->getFile() . ':' . $e->getLine());
}

if (!$transcriptData || empty($transcriptData['words'])) {
    fwrite(STDERR, "\n[FAIL] Cannot continue provider diagnostics without transcript data.\n");
    exit(1);
}

section('Step 2: Prompt Build');
$prompt = invokePrivate($service, 'buildGeminiPrompt', [$script, $transcriptData, $project->language]);
line('Prompt length', (string) strlen($prompt));
line('Prompt preview', preview($prompt, 700));

$providerTests = [];
$openRouterModels = config('services.openrouter.models', []);
foreach ($openRouterModels as $model) {
    $providerTests[] = [
        'label' => 'OpenRouter',
        'model' => $model,
        'request_method' => 'requestOpenRouterSceneGeneration',
    ];
}

if (config('services.scene_generation.enable_gemini_fallback')) {
    $providerTests[] = [
        'label' => 'Gemini',
        'model' => invokePrivate($service, 'extractGeminiModelName'),
        'request_method' => 'requestGeminiSceneGeneration',
    ];
}

foreach ($providerTests as $providerTest) {
    section('Provider Test: ' . $providerTest['label'] . ' [' . $providerTest['model'] . ']');
    echo "[TRACE] Starting provider call...\n";

    try {
        $start = microtime(true);
        $rawText = invokePrivate($service, $providerTest['request_method'], [$providerTest['model'], $prompt]);
        echo "[TRACE] Provider returned raw text. Length: " . strlen($rawText) . "\n";
        $elapsedMs = (int) round((microtime(true) - $start) * 1000);
        $parsed = invokePrivate($service, 'parseSceneGenerationResponse', [$rawText, $providerTest['label'], $providerTest['model']]);
        echo "[TRACE] Parsed provider response.\n";

        line('Result', '[OK] Provider request succeeded');
        line('Elapsed', $elapsedMs . ' ms');
        line('Phrases', (string) count($parsed['phrases'] ?? []));
        line('Subtitles', (string) count($parsed['subtitles_script'] ?? []));
        line('Raw preview', preview($rawText, 500));

        $firstPhrase = $parsed['phrases'][0] ?? null;
        if (is_array($firstPhrase)) {
            line('First phrase', json_encode($firstPhrase, JSON_UNESCAPED_UNICODE));
        }
    } catch (Throwable $e) {
        line('Result', '[FAIL] Provider request failed');
        line('Error', $e->getMessage());
        line('Location', $e->getFile() . ':' . $e->getLine());
    }
}

section('Step 3: Full Chain');

try {
    $start = microtime(true);
    $sceneData = invokePrivate($service, 'generateScenePhrases', [$script, $transcriptData, $project->language]);
    $elapsedMs = (int) round((microtime(true) - $start) * 1000);

    line('Result', '[OK] Full provider chain succeeded');
    line('Elapsed', $elapsedMs . ' ms');
    line('Phrases', (string) count($sceneData['phrases'] ?? []));
    line('Subtitles', (string) count($sceneData['subtitles_script'] ?? []));
} catch (Throwable $e) {
    line('Result', '[FAIL] Full provider chain failed');
    line('Error', $e->getMessage());
    line('Location', $e->getFile() . ':' . $e->getLine());
}

echo "\nDone.\n";