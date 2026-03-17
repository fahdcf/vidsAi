<?php
/**
 * Minimal Laravel Http facade test for stepfun — tiny prompt to isolate the crash.
 */
ini_set('display_errors', 1);
ini_set('memory_limit', '512M');
error_reporting(E_ALL);

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\Http;

$key = config('services.openrouter.api_key');
$url = config('services.openrouter.base_url');

echo "Key length: " . strlen($key) . "\n";
echo "URL: {$url}\n";

$tests = [
    'tiny (5 chars)'   => 'Hi',
    'medium (200 chars)' => str_repeat('Tell me something interesting about AI. ', 5),
    'large (2000 chars)' => str_repeat('You are given a task to analyze text. ', 55),
];

foreach ($tests as $label => $msg) {
    echo "\nTesting {$label}...\n";
    flush();

    try {
        $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $key,
                'Content-Type'  => 'application/json',
            ])
            ->timeout(60)
            ->connectTimeout(10)
            ->withoutVerifying()
            ->post($url, [
                'model'       => 'stepfun/step-3.5-flash:free',
                'messages'    => [['role' => 'user', 'content' => $msg]],
                'temperature' => 0.2,
                'max_tokens'  => 200,
            ]);

        echo "HTTP {$response->status()} — content length: " . strlen($response->body()) . " bytes\n";

        if ($response->successful()) {
            $content = $response->json('choices.0.message.content');
            echo "Reply preview: " . mb_substr((string) $content, 0, 100) . "\n";
        } else {
            echo "Error: " . $response->body() . "\n";
        }
    } catch (\Throwable $e) {
        echo "EXCEPTION: " . get_class($e) . ": " . $e->getMessage() . "\n";
    }
}

echo "\nAll tests done.\n";
