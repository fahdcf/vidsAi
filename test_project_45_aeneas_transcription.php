<?php

require_once 'vendor/autoload.php';

use Illuminate\Support\Facades\DB;
use App\Services\SceneGenerationService;

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🧪 Testing Aeneas Transcription with Project 45 Voiceover and Script...\n\n";

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
    
    // Check if voiceover file exists
    $voiceoverPath = storage_path('app/public/' . $project->voiceover_file);
    if (!file_exists($voiceoverPath)) {
        echo "❌ Voiceover file not found at: {$voiceoverPath}\n";
        exit(1);
    }
    
    echo "✅ Voiceover file found: " . basename($voiceoverPath) . "\n";
    echo "   Full path: {$voiceoverPath}\n";
    echo "   File size: " . round(filesize($voiceoverPath) / 1024 / 1024, 2) . " MB\n\n";
    
    // Get the script text from the existing transcript (since script field doesn't exist)
    // We'll extract the script from the current transcript
    $currentTranscript = json_decode($project->voiceover_transcript, true);
    if (!$currentTranscript || !is_array($currentTranscript)) {
        echo "❌ No existing transcript found to extract script from!\n";
        exit(1);
    }
    
    // Extract script from transcript words
    $script = implode(' ', array_column($currentTranscript, 'word'));
    if (empty($script)) {
        echo "❌ Could not extract script from transcript!\n";
        exit(1);
    }
    
    echo "📝 Script Text (extracted from transcript):\n";
    echo "   '{$script}'\n\n";
    
    // Create SceneGenerationService instance
    echo "🔧 Initializing SceneGenerationService...\n";
    $sceneService = new SceneGenerationService();
    
    // Test Aeneas transcription method
    echo "🎤 Testing Aeneas Transcription Method...\n";
    
    // Use reflection to access private methods for testing
    $reflection = new ReflectionClass($sceneService);
    
    // Get the createStandaloneAeneasTranscript method
    $createStandaloneMethod = $reflection->getMethod('createStandaloneAeneasTranscript');
    $createStandaloneMethod->setAccessible(true);
    
    // Get the detectActualSpeechStart method
    $detectSpeechStartMethod = $reflection->getMethod('detectActualSpeechStart');
    $detectSpeechStartMethod->setAccessible(true);
    
    // Get the tokenizeWords method
    $tokenizeMethod = $reflection->getMethod('tokenizeWords');
    $tokenizeMethod->setAccessible(true);
    
    // Get the createPreciseWordTiming method
    $createTimingMethod = $reflection->getMethod('createPreciseWordTiming');
    $createTimingMethod->setAccessible(true);
    
    // Get the normalizeWordTiming method
    $normalizeMethod = $reflection->getMethod('normalizeWordTiming');
    $normalizeMethod->setAccessible(true);
    
    echo "✅ All required methods accessible via reflection\n\n";
    
    // Test word tokenization
    echo "🔤 Testing Word Tokenization...\n";
    $scriptTokens = $tokenizeMethod->invoke($sceneService, $script);
    echo "   Script tokens: " . count($scriptTokens) . " words\n";
    echo "   First 5 tokens: " . implode(', ', array_slice($scriptTokens, 0, 5)) . "\n\n";
    
    // Simulate Aeneas fragments (since we can't run the actual Aeneas command in this test)
    // We'll create realistic fragments based on the script length and typical Aeneas behavior
    echo "🎵 Simulating Aeneas Fragments...\n";
    
    $wordCount = count($scriptTokens);
    $estimatedDuration = $wordCount * 0.4; // Rough estimate: 0.4s per word
    
    // Create fragments that start at 0s (the problematic case we're fixing)
    $fragments = [];
    $currentTime = 0.0;
    
    for ($i = 0; $i < $wordCount; $i++) {
        $wordDuration = 0.3 + (rand(0, 20) / 100); // 0.3s to 0.5s per word
        $fragments[] = [
            'begin' => $currentTime,
            'end' => $currentTime + $wordDuration
        ];
        $currentTime += $wordDuration + 0.02; // Small gap between words
    }
    
    echo "   Created " . count($fragments) . " fragments\n";
    echo "   Total simulated duration: " . round($currentTime, 2) . "s\n";
    echo "   First 3 fragments:\n";
    for ($i = 0; $i < min(3, count($fragments)); $i++) {
        $frag = $fragments[$i];
        echo "      Fragment {$i}: {$frag['begin']}s - {$frag['end']}s (duration: " . round($frag['end'] - $frag['begin'], 3) . "s)\n";
    }
    echo "\n";
    
    // Test speech start detection
    echo "🔍 Testing Speech Start Detection...\n";
    $speechStart = $detectSpeechStartMethod->invoke($sceneService, $fragments);
    echo "   Detected speech start: {$speechStart}s\n";
    
    if ($speechStart < 0.1) {
        echo "   ⚠️ WARNING: Speech start too early - this should trigger the Arabic fix!\n";
    } else {
        echo "   ✅ Speech start is reasonable\n";
    }
    echo "\n";
    
    // Test the complete Aeneas transcription process
    echo "🎯 Testing Complete Aeneas Transcription Process...\n";
    
    try {
        $transcript = $createStandaloneMethod->invoke($sceneService, $script, $fragments, $currentTime, null);
        
        if ($transcript && isset($transcript['words'])) {
            echo "✅ Aeneas transcription successful!\n";
            echo "   Total words: " . count($transcript['words']) . "\n";
            echo "   Full text: '{$transcript['text']}'\n\n";
            
            echo "📊 Complete Transcript with Timing:\n";
            echo str_repeat('-', 80) . "\n";
            echo sprintf("%-4s %-20s %-10s %-10s %-10s\n", "ID", "Word", "Start", "End", "Duration");
            echo str_repeat('-', 80) . "\n";
            
            foreach ($transcript['words'] as $i => $word) {
                $start = round($word['start'], 3);
                $end = round($word['end'], 3);
                $duration = round($word['end'] - $word['start'], 3);
                
                printf("%-4d %-20s %-10s %-10s %-10s\n", 
                    $i, 
                    substr($word['word'], 0, 19), 
                    $start . 's', 
                    $end . 's', 
                    $duration . 's'
                );
            }
            
            echo str_repeat('-', 80) . "\n";
            
            // Check for timing issues
            echo "\n🔍 Timing Analysis:\n";
            $firstWord = $transcript['words'][0];
            $lastWord = end($transcript['words']);
            
            echo "   First word: '{$firstWord['word']}' starts at {$firstWord['start']}s\n";
            echo "   Last word: '{$lastWord['word']}' ends at {$lastWord['end']}s\n";
            echo "   Total transcript duration: " . round($lastWord['end'] - $firstWord['start'], 3) . "s\n";
            
            if ($firstWord['start'] < 0.1) {
                echo "   ❌ ISSUE: First word still starts too early at {$firstWord['start']}s\n";
                echo "   🔧 This indicates the Arabic fix needs to be applied\n";
            } else {
                echo "   ✅ SUCCESS: First word starts at reasonable time {$firstWord['start']}s\n";
            }
            
            // Check word gaps
            $largeGaps = [];
            for ($i = 1; $i < count($transcript['words']); $i++) {
                $gap = $transcript['words'][$i]['start'] - $transcript['words'][$i-1]['end'];
                if ($gap > 0.1) {
                    $largeGaps[] = [
                        'position' => $i,
                        'gap' => $gap,
                        'word1' => $transcript['words'][$i-1]['word'],
                        'word2' => $transcript['words'][$i]['word']
                    ];
                }
            }
            
            if (!empty($largeGaps)) {
                echo "   ⚠️ Found large gaps between words:\n";
                foreach (array_slice($largeGaps, 0, 3) as $gap) {
                    echo "      Gap {$gap['position']}: '{$gap['word1']}' → '{$gap['word2']}' ({$gap['gap']}s)\n";
                }
                if (count($largeGaps) > 3) {
                    echo "      ... and " . (count($largeGaps) - 3) . " more\n";
                }
            } else {
                echo "   ✅ Word timing is consistent (no large gaps)\n";
            }
            
        } else {
            echo "❌ Aeneas transcription failed or returned invalid data\n";
        }
        
    } catch (Exception $e) {
        echo "❌ Error during Aeneas transcription: " . $e->getMessage() . "\n";
        echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    }
    
    echo "\n🌟 Test Complete!\n";
    echo "   This test simulated Aeneas transcription using Project 45's script.\n";
    echo "   To test with real Aeneas processing:\n";
    echo "   1. Re-run scene generation for Project 45\n";
    echo "   2. Check the logs for 'Arabic speech boundary detection'\n";
    echo "   3. Verify the transcript timing is corrected\n";

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
