<?php

// Simple test script to check environment variables
echo "🔍 Testing Environment Variables...\n\n";

// Check environment variables
echo "📋 Environment Variables Check:\n";
echo "DEEPGRAM_API_KEY: " . (getenv('DEEPGRAM_API_KEY') ? '✅ Set' : '❌ Missing') . "\n";
echo "GEMINI_API_KEY: " . (getenv('GEMINI_API_KEY') ? '✅ Set' : '❌ Missing') . "\n";
echo "PEXELS_API_KEY: " . (getenv('PEXELS_API_KEY') ? '✅ Set' : '❌ Missing') . "\n";
echo "VIDEO_RENDER_BASE_URL: " . (getenv('VIDEO_RENDER_BASE_URL') ? '✅ Set' : '❌ Missing') . "\n\n";

// Check if .env file exists and read it
echo "📁 .env File Check:\n";
if (file_exists('.env')) {
    echo "✅ .env file exists\n";
    
    $envContent = file_get_contents('.env');
    
    // Check for API keys in .env content
    echo "DEEPGRAM_API_KEY in .env: " . (strpos($envContent, 'DEEPGRAM_API_KEY') !== false ? '✅ Found' : '❌ Missing') . "\n";
    echo "GEMINI_API_KEY in .env: " . (strpos($envContent, 'GEMINI_API_KEY') !== false ? '✅ Found' : '❌ Missing') . "\n";
    echo "PEXELS_API_KEY in .env: " . (strpos($envContent, 'PEXELS_API_KEY') !== false ? '✅ Found' : '❌ Missing') . "\n";
    
} else {
    echo "❌ .env file not found\n";
}

echo "\n🔧 Solution:\n";
echo "The issue is that the required API keys are missing from your .env file.\n";
echo "You need to manually add these lines to your .env file:\n\n";
echo "DEEPGRAM_API_KEY=YOUR_DEEPGRAM_FALLBACK_API_KEY\n";
echo "GEMINI_API_KEY=YOUR_GEMINI_API_KEY\n";
echo "PEXELS_API_KEY=YOUR_PEXELS_API_KEY\n\n";
echo "After adding these, restart your Laravel application and try again.\n";
echo "The Arabic voiceover project generation should work after adding these API keys.\n";
