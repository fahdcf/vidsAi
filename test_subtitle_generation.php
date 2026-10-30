<?php

require_once 'vendor/autoload.php';

use App\Services\SceneGenerationService;
use App\Models\Project;

// Test script to identify subtitle generation issues
echo "🔍 Testing Subtitle Generation Service...\n\n";

// Check environment variables
echo "📋 Environment Variables Check:\n";
echo "DEEPGRAM_API_KEY: " . (getenv('DEEPGRAM_API_KEY') ? '✅ Set' : '❌ Missing') . "\n";
echo "GEMINI_API_KEY: " . (getenv('GEMINI_API_KEY') ? '✅ Set' : '❌ Missing') . "\n";
echo "PEXELS_API_KEY: " . (getenv('PEXELS_API_KEY') ? '✅ Set' : '❌ Missing') . "\n";
echo "VIDEO_RENDER_BASE_URL: " . (getenv('VIDEO_RENDER_BASE_URL') ? '✅ Set' : '❌ Missing') . "\n\n";

// Check configuration
echo "⚙️ Configuration Check:\n";
echo "Deepgram Base URL: " . config('services.deepgram.base_url') . "\n";
echo "Gemini Base URL: " . config('services.gemini.base_url') . "\n";
echo "Pexels Base URL: " . config('services.pexels.base_url') . "\n\n";

// Test API connectivity
echo "🌐 API Connectivity Test:\n";

// Test Deepgram
try {
    $deepgramUrl = config('services.deepgram.base_url');
    echo "Deepgram: Testing connection to $deepgramUrl... ";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $deepgramUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_NOBODY, true);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode == 200 || $httpCode == 401) {
        echo "✅ Connected (HTTP $httpCode)\n";
    } else {
        echo "❌ Failed (HTTP $httpCode)\n";
    }
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}

// Test Gemini
try {
    $geminiUrl = config('services.gemini.base_url');
    echo "Gemini: Testing connection to $geminiUrl... ";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $geminiUrl . '?key=test');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_NOBODY, true);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode == 200 || $httpCode == 400 || $httpCode == 401) {
        echo "✅ Connected (HTTP $httpCode)\n";
    } else {
        echo "❌ Failed (HTTP $httpCode)\n";
    }
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}

// Test Pexels
try {
    $pexelsUrl = config('services.pexels.base_url');
    echo "Pexels: Testing connection to $pexelsUrl... ";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $pexelsUrl . '?query=test');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_NOBODY, true);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode == 200 || $httpCode == 401) {
        echo "✅ Connected (HTTP $httpCode)\n";
    } else {
        echo "❌ Failed (HTTP $httpCode)\n";
    }
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}

echo "\n🔧 Solution:\n";
echo "The issue is that the required API keys are missing from your .env file.\n";
echo "You need to add these lines to your .env file:\n\n";
echo "DEEPGRAM_API_KEY=YOUR_DEEPGRAM_FALLBACK_API_KEY\n";
echo "GEMINI_API_KEY=YOUR_GEMINI_API_KEY\n";
echo "PEXELS_API_KEY=YOUR_PEXELS_API_KEY\n\n";
echo "After adding these, restart your Laravel application and try again.\n";
