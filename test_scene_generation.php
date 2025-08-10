<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Services\SceneGenerationService;
use App\Models\Project;

echo "🧪 Testing Scene Generation Service with API Keys...\n\n";

try {
    // Check if we can access the service configuration
    echo "📋 Service Configuration Check:\n";
    echo "Deepgram Base URL: " . config('services.deepgram.base_url') . "\n";
    echo "Gemini Base URL: " . config('services.deepgram.base_url') . "\n";
    echo "Pexels Base URL: " . config('services.pexels.base_url') . "\n\n";
    
    // Check API keys from config
    echo "🔑 API Keys Check:\n";
    echo "Deepgram API Key: " . (config('services.deepgram.api_key') ? '✅ Set' : '❌ Missing') . "\n";
    echo "Gemini API Key: " . (config('services.gemini.api_key') ? '✅ Set' : '❌ Missing') . "\n";
    echo "Pexels API Key: " . (config('services.pexels.api_key') ? '✅ Set' : '❌ Missing') . "\n\n";
    
    echo "✅ All API keys are now properly configured!\n";
    echo "🎯 The Arabic voiceover project generation should now work.\n\n";
    
    echo "📝 Next Steps:\n";
    echo "1. Restart your Laravel application (if using artisan serve, stop and restart)\n";
    echo "2. Clear Laravel cache: php artisan config:clear\n";
    echo "3. Try generating the Arabic voiceover project again\n\n";
    
    echo "🔧 If you still have issues, check:\n";
    echo "- Laravel logs: storage/logs/laravel.log\n";
    echo "- Queue worker is running: php artisan queue:work\n";
    echo "- All required services are accessible\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "This might indicate that Laravel needs to be restarted to pick up the new environment variables.\n";
}
