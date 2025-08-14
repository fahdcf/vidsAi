<?php

require_once 'vendor/autoload.php';

use Illuminate\Support\Facades\DB;

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔧 Fixing Subtitle Timing Issue...\n\n";

try {
    // Get the most recent project with voiceover transcript
    $project = DB::table('projects')
        ->where('voiceover_option', 'upload')
        ->whereNotNull('voiceover_transcript')
        ->orderBy('id', 'desc')
        ->first();
    
    if (!$project) {
        echo "❌ No project with voiceover transcript found!\n";
        exit(1);
    }

    echo "📋 Project: {$project->name} (ID: {$project->id})\n";
    echo "🌍 Language: {$project->language}\n\n";

    // Get the transcript
    $transcript = json_decode($project->voiceover_transcript, true);
    if (!$transcript || !is_array($transcript)) {
        echo "❌ Invalid transcript data!\n";
        exit(1);
    }

    echo "🎤 Transcript loaded: " . count($transcript) . " words\n";
    echo "   Total duration: " . end($transcript)['end'] . "s\n\n";

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

    // Now let's fix the subtitle generation by creating a corrected version
    echo "🔧 Generating corrected subtitle timings...\n\n";
    
    $correctedSubtitles = [];
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
                    $score += 3; // Exact match gets highest score
                    $matchedWords++;
                } elseif (strpos($transcriptWord, $subtitleWord) !== false || strpos($subtitleWord, $transcriptWord) !== false) {
                    $score += 1; // Partial match
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
            
            $correctedSubtitle = [
                'text' => $subtitleText,
                'start' => round($bestMatch['start'], 3),
                'end' => round($bestMatch['end'], 3),
                'duration' => round($bestMatch['end'] - $bestMatch['start'], 3),
                'match_percentage' => round($bestMatch['match_percentage'], 2),
                'word_range' => $bestMatch['startIndex'] . '-' . $bestMatch['endIndex']
            ];

            $correctedSubtitles[] = $correctedSubtitle;

            echo "   ✅ Match found: {$bestMatch['start']}s - {$bestMatch['end']}s (duration: {$correctedSubtitle['duration']}s)\n";
            echo "   📊 Match quality: {$correctedSubtitle['match_percentage']}% (words {$correctedSubtitle['word_range']})\n";
        } else {
            echo "   ❌ No match found in transcript\n";
            
            // Fallback: Create subtitle with estimated timing
            if (count($correctedSubtitles) > 0) {
                $lastSubtitle = end($correctedSubtitles);
                $estimatedStart = $lastSubtitle['end'] + 0.1;
                $estimatedEnd = $estimatedStart + 2.0;
            } else {
                $estimatedStart = 0.0;
                $estimatedEnd = 2.0;
            }
            
            $correctedSubtitles[] = [
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

    echo "📊 Summary of Corrected Subtitles:\n";
    foreach ($correctedSubtitles as $i => $subtitle) {
        echo "   " . ($i + 1) . ". \"{$subtitle['text']}\" ({$subtitle['start']}s - {$subtitle['end']}s) [{$subtitle['duration']}s]\n";
        if (isset($subtitle['note'])) {
            echo "      Note: {$subtitle['note']}\n";
        }
    }

    echo "\n🎯 Expected vs Current:\n";
    echo "   Expected: 'Discover EcoSip' should be 0.359s - 1.238s (0.879s duration)\n";
    echo "   Current:  'Discover EcoSip' shows 0s - 0.791s (0.791s duration)\n";
    echo "   Issue: Timing is completely wrong and not using transcript data\n\n";

    echo "🔧 To fix this permanently, the subtitle generation logic in\n";
    echo "   ProjectController.php needs to be updated to properly use\n";
    echo "   transcript word timings instead of estimated timing.\n";

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
