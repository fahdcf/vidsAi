<?php

require_once 'vendor/autoload.php';

use Illuminate\Support\Facades\DB;

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔍 Checking Scene 6 in Project 41...\n\n";

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

    // Get Scene 6 details
    $scene = DB::table('scenes')->where('project_id', 41)->where('id', 6)->first();
    if (!$scene) {
        echo "❌ Scene 6 not found in Project 41!\n";
        exit(1);
    }

    echo "🎬 Scene 6 Details:\n";
    echo "   ID: {$scene->id}\n";
    echo "   Prompt: {$scene->prompt}\n";
    echo "   Keywords: {$scene->keywords}\n";
    echo "   Gemini Duration: {$scene->gemini_duration}s\n";
    echo "   Duration Seconds: {$scene->duration_seconds}s\n";
    echo "   Trimmed Duration: {$scene->trimmed_duration}s\n";
    echo "   Start Time: {$scene->start_time}s\n";
    echo "   End Time: {$scene->end_time}s\n\n";

    // Check if there are any video files for this scene
    $videos = DB::table('project_videos')->where('project_id', 41)->where('scene_id', 6)->get();
    
    if ($videos->count() > 0) {
        echo "🎥 Videos for Scene 6:\n";
        foreach ($videos as $video) {
            echo "   Video ID: {$video->id}\n";
            echo "   URL: {$video->video_url}\n";
            echo "   Duration: {$video->duration}s\n";
            echo "   Trimmed Duration: {$video->trimmed_duration}s\n";
            echo "   Start Time: {$video->start_time}s\n";
            echo "   End Time: {$video->end_time}s\n\n";
        }
    } else {
        echo "⚠️ No videos found for Scene 6\n\n";
    }

    // Check all scenes in Project 41 for comparison
    $allScenes = DB::table('scenes')->where('project_id', 41)->orderBy('id')->get();
    
    echo "📊 All Scenes in Project 41:\n";
    foreach ($allScenes as $s) {
        echo "   Scene {$s->id}: Gemini={$s->gemini_duration}s, Duration={$s->duration_seconds}s, Trimmed={$s->trimmed_duration}s\n";
    }

    echo "\n🔍 Analysis:\n";
    
    // Check for duration mismatches
    if ($scene->gemini_duration && $scene->trimmed_duration) {
        $difference = abs($scene->gemini_duration - $scene->trimmed_duration);
        if ($difference > 0.1) {
            echo "   ❌ DURATION MISMATCH DETECTED!\n";
            echo "      Gemini Duration: {$scene->gemini_duration}s\n";
            echo "      Trimmed Duration: {$scene->trimmed_duration}s\n";
            echo "      Difference: {$difference}s\n";
        } else {
            echo "   ✅ Duration matches (difference: {$difference}s)\n";
        }
    }

    // Check if start/end times make sense
    if ($scene->start_time !== null && $scene->end_time !== null) {
        $calculatedDuration = $scene->end_time - $scene->start_time;
        echo "   📏 Start: {$scene->start_time}s, End: {$scene->end_time}s\n";
        echo "   📏 Calculated Duration: {$calculatedDuration}s\n";
        
        if (abs($calculatedDuration - $scene->gemini_duration) > 0.1) {
            echo "   ❌ TIMING MISMATCH: Start/End times don't match Gemini duration!\n";
        } else {
            echo "   ✅ Timing matches Gemini duration\n";
        }
    }

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
