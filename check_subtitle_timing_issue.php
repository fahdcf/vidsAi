<?php

require_once 'vendor/autoload.php';

use Illuminate\Support\Facades\DB;

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔍 Investigating Subtitle Timing Issue...\n\n";

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
    
    // Show first few words with timing
    echo "   First 10 words:\n";
    for ($i = 0; $i < min(10, count($transcript)); $i++) {
        $word = $transcript[$i];
        echo "     {$i}: '{$word['word']}' ({$word['start']}s - {$word['end']}s)\n";
    }
    
    // Show last few words
    if (count($transcript) > 10) {
        echo "   Last 5 words:\n";
        for ($i = count($transcript) - 5; $i < count($transcript); $i++) {
            $word = $transcript[$i];
            echo "     {$i}: '{$word['word']}' ({$word['start']}s - {$word['end']}s)\n";
        }
    }

    // Calculate total transcript duration
    $totalDuration = 0;
    if (count($transcript) > 0) {
        $lastWord = end($transcript);
        $totalDuration = $lastWord['end'];
    }
    echo "   Total duration: {$totalDuration}s\n\n";

    // Check if project has subtitles script
    $scenes = DB::table('scenes')->where('project_id', $project->id)->get();
    
    if ($scenes->count() > 0) {
        echo "🎬 Scenes:\n";
        foreach ($scenes as $scene) {
            echo "   Scene {$scene->id}: {$scene->prompt}\n";
            echo "     Gemini Duration: {$scene->gemini_duration}s\n";
            echo "     Duration Seconds: {$scene->duration_seconds}s\n";
            echo "     Trimmed Duration: {$scene->trimmed_duration}s\n";
            echo "     Start Time: {$scene->start_time}s\n";
            echo "     End Time: {$scene->end_time}s\n\n";
        }
    }

    // Check if there are any subtitle entries in the database
    echo "📝 Checking for subtitle data...\n";
    
    // Look for subtitle-related tables or data
    $tables = DB::select('SHOW TABLES');
    $subtitleTables = array_filter($tables, function($table) {
        $tableName = array_values((array)$table)[0];
        return strpos(strtolower($tableName), 'subtitle') !== false;
    });
    
    if (!empty($subtitleTables)) {
        echo "   Found subtitle tables:\n";
        foreach ($subtitleTables as $table) {
            $tableName = array_values((array)$table)[0];
            echo "     - {$tableName}\n";
        }
    } else {
        echo "   No subtitle tables found\n";
    }

    // Check if the project has any subtitle-related data
    $projectColumns = DB::select("DESCRIBE projects");
    $subtitleColumns = array_filter($projectColumns, function($col) {
        return strpos(strtolower($col->Field), 'subtitle') !== false;
    });
    
    if (!empty($subtitleColumns)) {
        echo "   Project subtitle columns:\n";
        foreach ($subtitleColumns as $col) {
            echo "     - {$col->Field}: {$col->Type}\n";
        }
    }

    echo "\n🔍 Analysis:\n";
    echo "   The subtitle timing issue suggests that the system is not properly\n";
    echo "   using the transcript word timings to generate accurate subtitle durations.\n";
    echo "   Instead, it's using estimated or scene-based timing.\n\n";
    
    echo "   Expected behavior:\n";
    echo "   - 'Discover EcoSip' should start at the first word's start time\n";
    echo "   - Duration should match the actual transcript timing\n";
    echo "   - Each subtitle should align with the voiceover words\n\n";
    
    echo "   Current issue:\n";
    echo "   - Subtitles are using estimated timing (0.791s intervals)\n";
    echo "   - Not synced with actual transcript word timings\n";

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
