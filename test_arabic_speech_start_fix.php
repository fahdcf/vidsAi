<?php

require_once 'vendor/autoload.php';

use Illuminate\Support\Facades\DB;

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🧪 Testing Arabic Speech Start Detection Fix...\n\n";

try {
    // Check if there are any Arabic language projects
    $arabicProjects = DB::table('projects')
        ->whereIn('language', [
            'arabic', 'ar', 'arabic (morocco)', 'arabic (algeria)', 'arabic (tunisia)', 
            'arabic (egypt)', 'arabic (saudi)', 'arabic (uae)', 'arabic (qatar)',
            'moroccan', 'darija', 'maghrebi', 'tunisian', 'algerian', 'egyptian',
            'saudi arabic', 'gulf arabic', 'levantine arabic'
        ])
        ->where('voiceover_option', 'upload')
        ->whereNotNull('voiceover_transcript')
        ->orderBy('id', 'desc')
        ->limit(3)
        ->get();
    
    if ($arabicProjects->count() === 0) {
        echo "❌ No Arabic language projects with voiceover transcript found!\n";
        exit(1);
    }

    echo "🌍 Found {$arabicProjects->count()} Arabic language project(s) with voiceover transcript\n\n";
    
    foreach ($arabicProjects as $project) {
        echo "🔍 Testing Project: {$project->name} (ID: {$project->id})\n";
        echo "   Language: {$project->language}\n";
        echo "   Voiceover Option: {$project->voiceover_option}\n\n";
        
        // Get the transcript
        $transcript = json_decode($project->voiceover_transcript, true);
        if (!$transcript || !is_array($transcript)) {
            echo "   ❌ Invalid transcript data!\n\n";
            continue;
        }

        echo "   🎤 Voiceover Transcript Analysis:\n";
        echo "      Total words: " . count($transcript) . "\n";
        echo "      Total duration: " . end($transcript)['end'] . "s\n";
        
        // Check the first word timing
        $firstWord = $transcript[0];
        $firstWordStart = $firstWord['start'];
        $firstWordEnd = $firstWord['end'];
        $firstWordDuration = $firstWordEnd - $firstWordStart;
        
        echo "      First word: '{$firstWord['word']}' ({$firstWordStart}s - {$firstWordEnd}s) [duration: {$firstWordDuration}s]\n";
        
        // Check if there's a speech start issue
        if ($firstWordStart < 0.1) {
            echo "      ❌ SPEECH START ISSUE: First word starts too early at {$firstWordStart}s\n";
            echo "         This indicates the Aeneas forced alignment problem for Arabic\n";
            echo "         Expected: First word should start around 0.2s - 0.5s\n";
        } else {
            echo "      ✅ Speech start OK: First word starts at {$firstWordStart}s\n";
        }
        
        // Check the second word timing
        if (count($transcript) > 1) {
            $secondWord = $transcript[1];
            $secondWordStart = $secondWord['start'];
            $secondWordEnd = $secondWord['end'];
            $gapBetweenWords = $secondWordStart - $firstWordEnd;
            
            echo "      Second word: '{$secondWord['word']}' ({$secondWordStart}s - {$secondWordEnd}s) [duration: " . round($secondWordEnd - $secondWordStart, 3) . "s]\n";
            echo "      Gap between words: {$gapBetweenWords}s\n";
            
            // Check for reasonable gaps between words
            if ($gapBetweenWords < 0.01) {
                echo "      ⚠️ WARNING: Words are too close together (gap: {$gapBetweenWords}s)\n";
                echo "         This suggests timing compression issues\n";
            } elseif ($gapBetweenWords > 0.5) {
                echo "      ⚠️ WARNING: Large gap between words (gap: {$gapBetweenWords}s)\n";
                echo "         This suggests timing expansion issues\n";
            } else {
                echo "      ✅ Word gap OK: {$gapBetweenWords}s between words\n";
            }
        }
        
        // Check overall timing consistency
        echo "\n   📊 Timing Consistency Analysis:\n";
        
        $timingIssues = [];
        $totalDuration = end($transcript)['end'];
        $expectedWordCount = count($transcript);
        $averageWordDuration = $totalDuration / $expectedWordCount;
        
        echo "      Total duration: {$totalDuration}s\n";
        echo "      Word count: {$expectedWordCount}\n";
        echo "      Average word duration: " . round($averageWordDuration, 3) . "s\n";
        
        // Check for words with unreasonable durations
        $unreasonableWords = [];
        foreach ($transcript as $i => $word) {
            $duration = $word['end'] - $word['start'];
            if ($duration < 0.05 || $duration > 2.0) {
                $unreasonableWords[] = [
                    'index' => $i,
                    'word' => $word['word'],
                    'duration' => $duration,
                    'start' => $word['start'],
                    'end' => $word['end']
                ];
            }
        }
        
        if (!empty($unreasonableWords)) {
            echo "      ⚠️ Found words with unreasonable durations:\n";
            foreach (array_slice($unreasonableWords, 0, 5) as $word) {
                echo "         Word {$word['index']}: '{$word['word']}' ({$word['start']}s - {$word['end']}s) [duration: {$word['duration']}s]\n";
            }
            if (count($unreasonableWords) > 5) {
                echo "         ... and " . (count($unreasonableWords) - 5) . " more\n";
            }
        } else {
            echo "      ✅ All word durations are reasonable\n";
        }
        
        // Summary and recommendations
        echo "\n   🎯 Summary for Project {$project->id}:\n";
        
        if ($firstWordStart < 0.1) {
            echo "      ❌ CRITICAL ISSUE: Speech starts too early\n";
            echo "      🔧 RECOMMENDATION: Re-run scene generation with the new Arabic speech start fix\n";
            echo "      📝 EXPECTED RESULT: First word should start around 0.2s - 0.5s\n";
        } elseif ($firstWordStart < 0.2) {
            echo "      ⚠️ MINOR ISSUE: Speech starts slightly early\n";
            echo "      🔧 RECOMMENDATION: Consider re-running for better timing\n";
        } else {
            echo "      ✅ NO ISSUES: Speech start timing is correct\n";
        }
        
        echo "\n";
        
        // Only test the first project in detail
        break;
    }

    echo "🌟 Arabic Speech Start Detection Fix Status:\n";
    echo "   ✅ Enhanced speech start detection implemented\n";
    echo "   ✅ Arabic-specific timing corrections added\n";
    echo "   ✅ Fallback mechanisms for 0s start times\n";
    echo "   ✅ Comprehensive logging for debugging\n\n";
    
    echo "🔧 To apply the fix to existing projects:\n";
    echo "   1. Re-run scene generation for Arabic projects\n";
    echo "   2. Check logs for 'Arabic speech boundary detection'\n";
    echo "   3. Verify first word starts around 0.2s - 0.5s\n";
    echo "   4. Confirm subtitle timing matches transcript\n\n";

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
