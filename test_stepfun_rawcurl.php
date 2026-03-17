<?php
/**
 * Full scene-gen test using raw PHP cURL (not Guzzle/Http facade)
 * to bypass any state corruption from the service's Deepgram call.
 */
ini_set('display_errors', 1);
ini_set('memory_limit', '512M');
error_reporting(E_ALL);

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Project;
use App\Services\SceneGenerationService;

$projectId = isset($argv[1]) ? (int) $argv[1] : 70;
$project   = Project::findOrFail($projectId);
echo "Project: {$project->name}\n";

$service = app(SceneGenerationService::class);

function invokePrivate(object $instance, string $method, array $args = []) {
    $ref = new ReflectionClass($instance);
    $m   = $ref->getMethod($method);
    $m->setAccessible(true);
    return $m->invokeArgs($instance, $args);
}

// Transcribe via service (uses Http internally)
echo "Transcribing...\n";
$voiceoverPath  = storage_path('app/public/' . $project->voiceover_file);
$transcriptData = invokePrivate($service, 'transcribeAudio', [$voiceoverPath, $project->language]);
echo "Transcription OK\n";

// Build prompt via service
$script = $project->script ?? '';
$prompt = invokePrivate($service, 'buildGeminiPrompt', [$script, $transcriptData, $project->language]);
echo "Prompt built — " . strlen($prompt) . " chars\n";

// Now call stepfun with RAW cURL (not Guzzle)
$key = config('services.openrouter.api_key');
$url = config('services.openrouter.base_url');

echo "Calling stepfun via raw cURL...\n";
flush();

$payload = json_encode([
    'model'      => 'stepfun/step-3.5-flash:free',
    'messages'   => [['role' => 'user', 'content' => $prompt]],
    'temperature'=> 0.2,
    'max_tokens' => 2000,
]);

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_TIMEOUT        => 180,
    CURLOPT_CONNECTTIMEOUT => 15,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => false,
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $key,
    ],
    CURLOPT_POSTFIELDS     => $payload,
]);

$start   = microtime(true);
$res     = curl_exec($ch);
$elapsed = round((microtime(true) - $start) * 1000);
$err     = curl_error($ch);
$code    = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$ctype   = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
curl_close($ch);

echo "HTTP status   : {$code} ({$elapsed}ms)\n";
echo "Content-Type  : {$ctype}\n";
echo "cURL error    : " . ($err ?: 'none') . "\n";
echo "Body length   : " . strlen($res) . " bytes\n";
echo "First 60 bytes hex: " . bin2hex(substr($res, 0, 60)) . "\n";

if ($res === false || $res === '') {
    echo "No response body\n";
    exit(1);
}

// Strip SSE heartbeat lines / leading whitespace before JSON
if (preg_match('/(\{.+\})\s*$/s', $res, $m)) {
    $jsonStr = $m[1];
} else {
    $jsonStr = trim($res);
}

$json = json_decode($jsonStr, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    echo "JSON decode error: " . json_last_error_msg() . "\n";
    echo "Trying to parse as SSE lines...\n";
    // SSE: each line starts with 'data: '
    foreach (explode("\n", $res) as $line) {
        $line = trim($line);
        if (str_starts_with($line, 'data: ') && $line !== 'data: [DONE]') {
            $chunk = json_decode(substr($line, 6), true);
            if ($chunk && isset($chunk['choices'])) {
                $json = $chunk;
                echo "Parsed as SSE chunk\n";
                break;
            }
        }
    }
}

$content = $json['choices'][0]['message']['content'] ?? null;

if ($content === null) {
    echo "No content field in response\n";
    echo "Response tail: " . substr($res, -300) . "\n";
    exit(1);
}

echo "Content length : " . strlen($content) . " chars\n";
echo "Content preview: " . mb_substr($content, 0, 600) . "\n";
echo "\nDone — stepfun with full prompt WORKS.\n";
