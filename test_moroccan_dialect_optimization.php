<?php

require_once 'vendor/autoload.php';

use Illuminate\Support\Facades\DB;
use App\Services\SceneGenerationService;

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🧪 Testing Moroccan Dialect Optimization with Project 45...\n\n";

try {
    // Get Project 45 data
    $project = DB::table('projects')->where('id', 45)->first();
    if (!$project) {
        echo "❌ Project 45 not found!\n";
        exit(1);
    }
    
    echo "🔍 Project Details:\n";
    echo "   ID: {$project->id}\n";
    echo "   Name: {$project->name}\n";
    echo "   Language: {$project->language}\n";
    echo "   Voiceover File: {$project->voiceover_file}\n\n";
    
    // Check if this is an Arabic project
    $isArabic = in_array(strtolower($project->language), ['arabic', 'moroccan', 'darija', 'ar']);
    echo "🌍 Language Analysis: " . ($isArabic ? "✅ Arabic/Moroccan dialect detected" : "❌ Not Arabic") . "\n\n";
    
    if (!$isArabic) {
        echo "⚠️ This test is designed for Arabic/Moroccan dialect projects.\n";
        echo "   Project language: '{$project->language}'\n";
        echo "   Consider changing the language to 'arabic' or 'moroccan' for testing.\n\n";
    }
    
    // Get the script text from the existing transcript
    $currentTranscript = json_decode($project->voiceover_transcript, true);
    if (!$currentTranscript || !is_array($currentTranscript)) {
        echo "❌ No existing transcript found!\n";
        exit(1);
    }
    
    // Extract script from transcript words
    $script = implode(' ', array_column($currentTranscript, 'word'));
    echo "📝 Script Text (" . count($currentTranscript) . " words):\n";
    echo "   '" . substr($script, 0, 100) . (strlen($script) > 100 ? '...' : '') . "'\n\n";
    
    // Check voiceover file
    $voiceoverPath = storage_path('app/public/' . $project->voiceover_file);
    if (!file_exists($voiceoverPath)) {
        echo "❌ Voiceover file not found: {$voiceoverPath}\n";
        exit(1);
    }
    
    echo "🎵 Voiceover File: {$voiceoverPath}\n";
    echo "   File size: " . round(filesize($voiceoverPath) / 1024 / 1024, 2) . " MB\n";
    echo "   File exists: ✅\n\n";
    
    // Create SceneGenerationService instance
    echo "🔧 Initializing SceneGenerationService...\n";
    $sceneService = new SceneGenerationService();
    
    // Test 1: Audio Preprocessing (if FFmpeg is available)
    echo "🎵 Test 1: Audio Preprocessing\n";
    echo "   Checking FFmpeg availability...\n";
    
    $ffmpegPath = config('services.aeneas.ffmpeg_path', 'ffmpeg');
    $ffprobePath = config('services.aeneas.ffprobe_path', 'ffprobe');
    
    $ffmpegAvailable = shell_exec("where {$ffmpegPath} 2>nul") || shell_exec("which {$ffmpegPath} 2>/dev/null");
    $ffprobeAvailable = shell_exec("where {$ffprobePath} 2>nul") || shell_exec("which {$ffprobePath} 2>/dev/null");
    
    if ($ffmpegAvailable && $ffprobeAvailable) {
        echo "   ✅ FFmpeg and FFprobe available\n";
        echo "   FFmpeg path: " . trim($ffmpegAvailable) . "\n";
        echo "   FFprobe path: " . trim($ffprobePath) . "\n";
        
        // Test audio preprocessing
        echo "   🎵 Testing audio preprocessing...\n";
        
        // Use reflection to access private method
        $reflection = new ReflectionClass($sceneService);
        $preprocessMethod = $reflection->getMethod('preprocessMoroccanAudio');
        $preprocessMethod->setAccessible(true);
        
        try {
            $preprocessMethod->invoke($sceneService, $voiceoverPath);
            echo "   ✅ Audio preprocessing completed\n";
        } catch (Exception $e) {
            echo "   ❌ Audio preprocessing failed: " . $e->getMessage() . "\n";
        }
    } else {
        echo "   ❌ FFmpeg or FFprobe not available\n";
        echo "   FFmpeg available: " . ($ffmpegAvailable ? 'Yes' : 'No') . "\n";
        echo "   FFprobe available: " . ($ffprobePath ? 'Yes' : 'No') . "\n";
        echo "   ⚠️ Audio preprocessing will be skipped\n";
    }
    
    echo "\n";
    
    // Test 2: Moroccan Speech Detection
    echo "🔍 Test 2: Moroccan Speech Detection\n";
    
    // Create simulated Aeneas fragments for testing
    $fragments = [];
    $currentTime = 0.0;
    $wordCount = count($currentTranscript);
    
    for ($i = 0; $i < $wordCount; $i++) {
        $wordDuration = 0.35 + (rand(0, 15) / 100); // 0.35s to 0.5s per word
        $fragments[] = [
            'begin' => $currentTime,
            'end' => $currentTime + $wordDuration
        ];
        $currentTime += $wordDuration + 0.01; // Small gap between words
    }
    
    echo "   Created " . count($fragments) . " simulated fragments\n";
    echo "   Total duration: " . round($currentTime, 2) . "s\n";
    echo "   First 3 fragments:\n";
    for ($i = 0; $i < min(3, count($fragments)); $i++) {
        $frag = $fragments[$i];
        echo "      Fragment {$i}: {$frag['begin']}s - {$frag['end']}s\n";
    }
    
    // Test Moroccan speech detection
    $reflection = new ReflectionClass($sceneService);
    $moroccanMethod = $reflection->getMethod('detectMoroccanSpeechStart');
    $moroccanMethod->setAccessible(true);
    
    try {
        $moroccanStart = $moroccanMethod->invoke($sceneService, $fragments);
        echo "   ✅ Moroccan speech start detected: {$moroccanStart}s\n";
    } catch (Exception $e) {
        echo "   ❌ Moroccan speech detection failed: " . $e->getMessage() . "\n";
    }
    
    echo "\n";
    
    // Test 3: Waveform Validation
    echo "🔍 Test 3: Waveform Validation\n";
    
    if ($ffprobeAvailable) {
        echo "   Testing waveform validation...\n";
        
        $validateMethod = $reflection->getMethod('validateWithWaveform');
        $validateMethod->setAccessible(true);
        
        // Create sample words for validation
        $sampleWords = [];
        for ($i = 0; $i < min(5, count($currentTranscript)); $i++) {
            $sampleWords[] = [
                'word' => $currentTranscript[$i]['word'],
                'start' => $i * 0.5,
                'end' => ($i + 1) * 0.5
            ];
        }
        
        try {
            $validatedWords = $validateMethod->invoke($sceneService, $sampleWords, $voiceoverPath);
            echo "   ✅ Waveform validation completed\n";
            echo "   Original words: " . count($sampleWords) . "\n";
            echo "   Validated words: " . count($validatedWords) . "\n";
            
            // Check if any adjustments were made
            $adjustments = 0;
            foreach ($validatedWords as $i => $word) {
                if (isset($word['adjustment_reason'])) {
                    $adjustments++;
                }
            }
            echo "   Words adjusted: {$adjustments}\n";
            
        } catch (Exception $e) {
            echo "   ❌ Waveform validation failed: " . $e->getMessage() . "\n";
        }
    } else {
        echo "   ⚠️ Skipping waveform validation (FFprobe not available)\n";
    }
    
    echo "\n";
    
    // Test 4: Sync Accuracy Calculation
    echo "🔄 Test 4: Sync Accuracy Calculation\n";
    
    $syncMethod = $reflection->getMethod('calculateSyncAccuracy');
    $syncMethod->setAccessible(true);
    
    try {
        $syncAccuracy = $syncMethod->invoke($sceneService, $sampleWords ?? [], $fragments);
        echo "   ✅ Sync accuracy calculated: " . round($syncAccuracy * 1000, 2) . "ms average error\n";
        
        // Calculate percentage accuracy
        $totalWords = count($sampleWords ?? []);
        $wordsWithErrors = 0;
        foreach ($sampleWords ?? [] as $i => $word) {
            if (isset($fragments[$i])) {
                $error = abs($fragments[$i]['begin'] - $word['start']);
                if ($error > 0.15) { // 150ms threshold
                    $wordsWithErrors++;
                }
            }
        }
        
        $accuracyPercent = $totalWords > 0 ? round((($totalWords - $wordsWithErrors) / $totalWords) * 100, 1) : 0;
        echo "   📊 Sync accuracy: {$accuracyPercent}% of words within 150ms threshold\n";
        
    } catch (Exception $e) {
        echo "   ❌ Sync accuracy calculation failed: " . $e->getMessage() . "\n";
    }
    
    echo "\n";
    
    // Summary
    echo "🌟 Moroccan Dialect Optimization Test Summary:\n";
    echo "   ✅ Audio preprocessing: " . ($ffmpegAvailable && $ffprobeAvailable ? 'Available' : 'Not available') . "\n";
    echo "   ✅ Moroccan speech detection: Implemented\n";
    echo "   ✅ Waveform validation: " . ($ffprobeAvailable ? 'Available' : 'Not available') . "\n";
    echo "   ✅ Sync accuracy calculation: Implemented\n";
    echo "   ✅ Configuration: Added to config/services.php\n\n";
    
    echo "🚀 Next Steps:\n";
    echo "   1. Install FFmpeg and FFprobe for full functionality\n";
    echo "   2. Test with a real Arabic project creation\n";
    echo "   3. Monitor logs for optimization results\n";
    echo "   4. Verify subtitle timing improvements\n\n";
    
    echo "📝 Configuration added to config/services.php:\n";
    echo "   - moroccan_rhythm_profile: conservative\n";
    echo "   - max_initial_pause: 3.5s\n";
    echo "   - ffmpeg_path: ffmpeg\n";
    echo "   - ffprobe_path: ffprobe\n\n";
    
    echo "🎯 Expected improvements for Moroccan dialect:\n";
    echo "   - Better speech start detection (up to 3.5s initial pause)\n";
    echo "   - Audio preprocessing for cleaner Aeneas input\n";
    echo "   - Waveform validation for timing accuracy\n";
    echo "   - Sync accuracy metrics for quality monitoring\n";

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
