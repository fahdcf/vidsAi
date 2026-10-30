<?php

require_once 'vendor/autoload.php';

// Test Deepgram API directly
echo "🧪 Testing Deepgram API Transcription...\n\n";

// Configuration
$deepgramApiKey = getenv('DEEPGRAM_API_KEY') ?: '';
$deepgramUrl = 'https://api.deepgram.com/v1/listen';

if ($deepgramApiKey === '') {
    fwrite(STDERR, "Set DEEPGRAM_API_KEY in the process environment before this manual diagnostic.\n");
    exit(1);
}

// Test audio file path (use one of the existing voiceover files)
$audioFile = 'storage/app/public/voiceovers/7K9NJ9lpyvW3rG5WqZSO53AQrnUq71hPLJ87NxDG.mp3';

echo "📁 Audio file: $audioFile\n";
echo "🔑 API Key length: " . strlen($deepgramApiKey) . "\n";
echo "🌐 API URL: $deepgramUrl\n\n";

// Check if audio file exists
if (!file_exists($audioFile)) {
    echo "❌ Audio file not found: $audioFile\n";
    exit(1);
}

echo "✅ Audio file exists (" . filesize($audioFile) . " bytes)\n\n";

// Test 1: Basic connectivity test
echo "🔍 Test 1: Testing basic connectivity...\n";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $deepgramUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_NOBODY, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($error) {
    echo "❌ Connection error: $error\n";
} else {
    echo "✅ Connection successful (HTTP $httpCode)\n";
}
echo "\n";

// Test 2: Full transcription test with timeout
echo "🎤 Test 2: Testing full transcription...\n";
echo "⏱️  Setting 30 second timeout...\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $deepgramUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Token ' . $deepgramApiKey,
    'Content-Type: audio/mpeg'
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, file_get_contents($audioFile));
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);

echo "📤 Sending request to Deepgram...\n";
$startTime = microtime(true);

$response = curl_exec($ch);
$endTime = microtime(true);

$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
$totalTime = curl_getinfo($ch, CURLINFO_TOTAL_TIME);
$connectTime = curl_getinfo($ch, CURLINFO_CONNECT_TIME);

curl_close($ch);

echo "⏱️  Total time: " . round(($endTime - $startTime) * 1000, 2) . "ms\n";
echo "🔗 Connect time: " . round($connectTime * 1000, 2) . "ms\n";
echo "📡 HTTP Code: $httpCode\n";

if ($error) {
    echo "❌ cURL Error: $error\n";
} else {
    echo "✅ Request completed\n";
    if ($response) {
        echo "📄 Response length: " . strlen($response) . " bytes\n";
        echo "📄 Response preview: " . substr($response, 0, 200) . "...\n";
    } else {
        echo "⚠️  No response received\n";
    }
}

// Do not print cURL verbose headers: they can contain the Authorization token.

echo "\n" . str_repeat("=", 50) . "\n";
echo "🏁 Test completed\n";
echo str_repeat("=", 50) . "\n";
