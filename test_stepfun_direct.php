<?php
require 'vendor/autoload.php';
Dotenv\Dotenv::createMutable(__DIR__)->safeLoad();

$key = $_ENV['OPENROUTER_API_KEY'] ?? getenv('OPENROUTER_API_KEY') ?? '';
echo 'Key length: ' . strlen($key) . PHP_EOL;

$ch = curl_init('https://openrouter.ai/api/v1/chat/completions');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $key,
    ],
    CURLOPT_POSTFIELDS     => json_encode([
        'model'    => 'stepfun/step-3.5-flash:free',
        'messages' => [['role' => 'user', 'content' => 'Say hi in one word']],
    ]),
    CURLOPT_SSL_VERIFYPEER => false,
]);

$res  = curl_exec($ch);
$err  = curl_error($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo 'HTTP status : ' . $code . PHP_EOL;
echo 'cURL error  : ' . ($err ?: 'none') . PHP_EOL;

if ($res) {
    $json = json_decode($res, true);
    echo 'Content     : ' . ($json['choices'][0]['message']['content'] ?? 'N/A') . PHP_EOL;
} else {
    echo 'No response body' . PHP_EOL;
}

echo 'Done.' . PHP_EOL;
