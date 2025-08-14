<?php

require_once 'vendor/autoload.php';

use Illuminate\Support\Facades\DB;

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔍 Investigating Subtitle Timing Issue for Project 45...\n\n";

try {
    // Get Project 45
    $project = DB::table('projects')->where('id', 45)->first();
    
    if (!$project) {
        echo "❌ Project 45 not found!\n";
        exit(1);
    }

    echo "📋 Project: {$project->name} (ID: {$project->id})\n";
    echo "🌍 Language: {$project->language}\n";
    echo "🎤 Voiceover Option: {$project->voiceover_option}\n\n";

    // Get the transcript
    $transcript = json_decode($project->voiceover_transcript, true);
    if (!$transcript || !is_array($transcript)) {
        echo "❌ Invalid transcript data!\n";
        exit(1);
    }

    echo "🎤 Voiceover Transcript:\n";
    echo "   Total words: " . count($transcript) . "\n";
    echo "   Total duration: " . end($transcript)['end'] . "s\n\n";
    
    // Show first 10 words with timing
    echo "   First 10 words:\n";
    for ($i = 0; $i < min(10, count($transcript)); $i++) {
        $word = $transcript[$i];
        echo "     {$i}: '{$word['word']}' ({$word['start']}s - {$word['end']}s) [duration: " . round($word['end'] - $word['start'], 3) . "s]\n";
    }
    echo "\n";

    // Check if project has subtitles script
    $subtitlesScript = json_decode($project->subtitles_script ?? '[]', true);
    if (empty($subtitlesScript)) {
        echo "❌ No subtitles script found! This is required for proper timing.\n";
        exit(1);
    }

    echo "📝 Subtitles Script found: " . count($subtitlesScript) . " entries\n";
    foreach ($subtitlesScript as $i => $subtitle) {
        echo "   {$i}: {$subtitle}\n";
    }
    echo "\n";

    // Now test the subtitle generation logic step by step
    echo "🔧 Testing Subtitle Generation Logic Step by Step...\n\n";
    
    $testSubtitles = [];
    $lastUsedIndex = -1;

    foreach ($subtitlesScript as $subtitleIndex => $subtitleText) {
        $subtitleText = trim($subtitleText);
        if (empty($subtitleText)) continue;

        echo "🔍 Processing: '{$subtitleText}'\n";
        
        // Find the words that match this subtitle
        $subtitleWords = array_filter(array_map(function($word) {
            $w = preg_replace('/[^\p{L}\p{N}\s]/u', ' ', (string) $word);
            if ($w === null) { $w = (string) $word; }
            $w = trim(preg_replace('/\s+/u', ' ', $w));
            return mb_strtolower($w, 'UTF-8');
        }, preg_split('/\s+/u', (string) $subtitleText) ?: []));

        if (empty($subtitleWords)) {
            echo "   ❌ No words found in subtitle text\n";
            continue;
        }

        echo "   Words: " . implode(', ', $subtitleWords) . "\n";

        // Find the best match in transcript starting after last used index
        $bestMatch = null;
        $bestScore = 0;
        $minStartIndex = $lastUsedIndex + 1;

        // Try to find a sequence of words that matches our subtitle
        for ($i = $minStartIndex; $i <= count($transcript) - count($subtitleWords); $i++) {
            $score = 0;
            $matchedWords = 0;

            // Check how many words match in sequence
            for ($j = 0; $j < count($subtitleWords) && ($i + $j) < count($transcript); $j++) {
                $transcriptWord = strtolower(trim($transcript[$i + $j]['word'] ?? ''));
                $subtitleWord = $subtitleWords[$j] ?? '';

                if ($transcriptWord === $subtitleWord) {
                    $score += 5; // Exact match gets highest score
                    $matchedWords++;
                } elseif (strpos($transcriptWord, $subtitleWord) !== false || strpos($subtitleWord, $transcriptWord) !== false) {
                    $score += 2; // Partial match gets medium score
                    $matchedWords++;
                }
            }

            // Calculate match quality
            $matchPercentage = $matchedWords / count($subtitleWords);

            // Accept if we have a good match (at least 60% words matched)
            if ($matchPercentage >= 0.6 && $score > $bestScore) {
                $endIndex = min($i + count($subtitleWords) - 1, count($transcript) - 1);

                $bestScore = $score;
                $bestMatch = [
                    'start' => $transcript[$i]['start'],
                    'end' => $transcript[$endIndex]['end'],
                    'startIndex' => $i,
                    'endIndex' => $endIndex,
                    'match_percentage' => $matchPercentage,
                    'score' => $score
                ];

                // If we have a very good match (90%+), use it immediately
                if ($matchPercentage >= 0.9) {
                    break;
                }
            }
        }

        if ($bestMatch) {
            $lastUsedIndex = $bestMatch['endIndex'];
            
            $testSubtitles[] = [
                'text' => $subtitleText,
                'start' => round($bestMatch['start'], 3),
                'end' => round($bestMatch['end'], 3),
                'duration' => round($bestMatch['end'] - $bestMatch['start'], 3),
                'match_percentage' => round($bestMatch['match_percentage'], 2),
                'word_range' => $bestMatch['startIndex'] . '-' . $bestMatch['endIndex']
            ];

            echo "   ✅ Match found: {$bestMatch['start']}s - {$bestMatch['end']}s (duration: {$testSubtitles[count($testSubtitles)-1]['duration']}s)\n";
            echo "   📊 Match quality: {$testSubtitles[count($testSubtitles)-1]['match_percentage']}% (words {$testSubtitles[count($testSubtitles)-1]['word_range']})\n";
            
            // Show the actual words that were matched
            $matchedWords = array_slice($transcript, $bestMatch['startIndex'], $bestMatch['endIndex'] - $bestMatch['startIndex'] + 1);
            echo "   🎯 Matched words: " . implode(' ', array_column($matchedWords, 'word')) . "\n";
        } else {
            echo "   ❌ No match found in transcript\n";
            
            // Fallback: Create subtitle with estimated timing
            if (count($testSubtitles) > 0) {
                $lastSubtitle = end($testSubtitles);
                $estimatedStart = $lastSubtitle['end'] + 0.1;
                $estimatedEnd = $estimatedStart + 2.0;
            } else {
                $estimatedStart = 0.0;
                $estimatedEnd = 2.0;
            }
            
            $testSubtitles[] = [
                'text' => $subtitleText,
                'start' => round($estimatedStart, 3),
                'end' => round($estimatedEnd, 3),
                'duration' => round($estimatedEnd - $estimatedStart, 3),
                'match_percentage' => 0,
                'word_range' => 'estimated',
                'note' => 'Estimated timing - no transcript match found'
            ];
            
            echo "   ⚠️ Using estimated timing: {$estimatedStart}s - {$estimatedEnd}s\n";
        }
        echo "\n";
    }

    echo "📊 Test Results Summary:\n";
    foreach ($testSubtitles as $i => $subtitle) {
        echo "   " . ($i + 1) . ". \"{$subtitle['text']}\" ({$subtitle['start']}s - {$subtitle['end']}s) [{$subtitle['duration']}s]\n";
        if (isset($subtitle['note'])) {
            echo "      Note: {$subtitle['note']}\n";
        }
    }

    echo "\n🎯 Analysis:\n";
    echo "   The subtitle timing should match the transcript exactly.\n";
    echo "   For example, 'كتقلب على' should be 0s - 0.812s (from transcript).\n";
    echo "   If the render service is getting different timing, the issue is in:\n";
    echo "   1. Subtitle generation (should be fixed now)\n";
    echo "   2. Subtitle processing before sending to render service\n";
    echo "   3. The rebalancing logic that might still be running\n\n";

    // Check if there are any recent logs that might show what happened
    echo "🔍 Checking for recent logs...\n";
    
    // Look for any subtitle-related logs
    $logFile = storage_path('logs/laravel.log');
    if (file_exists($logFile)) {
        $logContent = file_get_contents($logFile);
        $lines = explode("\n", $logContent);
        $recentLines = array_slice($lines, -100); // Last 100 lines
        
        $subtitleLogs = array_filter($recentLines, function($line) {
            return strpos($line, 'subtitle') !== false || strpos($line, 'transcript') !== false;
        });
        
        if (!empty($subtitleLogs)) {
            echo "   Recent subtitle/transcript logs:\n";
            foreach (array_slice($subtitleLogs, -10) as $logLine) {
                echo "      " . trim($logLine) . "\n";
            }
        } else {
            echo "   No recent subtitle/transcript logs found\n";
        }
    } else {
        echo "   No log file found\n";
    }

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
