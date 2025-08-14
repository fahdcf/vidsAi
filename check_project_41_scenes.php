<?php

require_once 'vendor/autoload.php';

use Illuminate\Support\Facades\DB;

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔍 Checking all scenes in Project 41...\n\n";

try {
    // Get Project 41 details
    $project = DB::table('projects')->where('id', 41)->first();
    if (!$project) {
        echo "❌ Project 41 not found!\n";
        exit(1);
    }

    echo "📋 Project 41: {$project->name}\n";
    echo "🌍 Language: {$project->language}\n";
    echo "📝 Script Option: {$project->script_option}\n";
    echo "🎤 Voiceover Option: {$project->voiceover_option}\n\n";

    // Get all scenes in Project 41
    $scenes = DB::table('scenes')->where('project_id', 41)->orderBy('id')->get();
    
    if ($scenes->count() === 0) {
        echo "❌ No scenes found in Project 41!\n";
        exit(1);
    }

    echo "🎬 Found {$scenes->count()} scenes in Project 41:\n\n";
    
    foreach ($scenes as $scene) {
        echo "🎬 Scene {$scene->id}:\n";
        echo "   Prompt: " . substr($scene->prompt ?? 'N/A', 0, 50) . "...\n";
        echo "   Keywords: {$scene->keywords}\n";
        echo "   Gemini Duration: {$scene->gemini_duration}s\n";
        echo "   Duration Seconds: {$scene->duration_seconds}s\n";
        echo "   Trimmed Duration: {$scene->trimmed_duration}s\n";
        echo "   Start Time: {$scene->start_time}s\n";
        echo "   End Time: {$scene->end_time}s\n";
        
        // Check for duration mismatches
        if ($scene->gemini_duration && $scene->trimmed_duration) {
            $difference = abs($scene->gemini_duration - $scene->trimmed_duration);
            if ($difference > 0.1) {
                echo "   ❌ DURATION MISMATCH: Gemini={$scene->gemini_duration}s, Trimmed={$scene->trimmed_duration}s (diff: {$difference}s)\n";
            } else {
                echo "   ✅ Duration matches (diff: {$difference}s)\n";
            }
        }
        
        // Check if start/end times make sense
        if ($scene->start_time !== null && $scene->end_time !== null) {
            $calculatedDuration = $scene->end_time - $scene->start_time;
            echo "   📏 Start: {$scene->start_time}s, End: {$scene->end_time}s (calc: {$calculatedDuration}s)\n";
            
            if (abs($calculatedDuration - $scene->gemini_duration) > 0.1) {
                echo "   ❌ TIMING MISMATCH: Start/End times don't match Gemini duration!\n";
            } else {
                echo "   ✅ Timing matches Gemini duration\n";
            }
        }
        
        echo "\n";
    }

    // Check project videos table
    echo "🎥 Project Videos:\n";
    $videos = DB::table('project_videos')->where('project_id', 41)->orderBy('scene_id')->get();
    
    if ($videos->count() > 0) {
        foreach ($videos as $video) {
            echo "   Scene {$video->scene_id}: Duration={$video->duration}s, Trimmed={$video->trimmed_duration}s, Start={$video->start_time}s, End={$video->end_time}s\n";
        }
    } else {
        echo "   No videos found\n";
    }

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
