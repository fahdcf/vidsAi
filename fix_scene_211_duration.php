<?php

require_once 'vendor/autoload.php';

use Illuminate\Support\Facades\DB;

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔧 Fixing Scene 211 duration mismatch in Project 41...\n\n";

try {
    // Get Scene 211 details
    $scene = DB::table('scenes')->where('id', 211)->first();
    if (!$scene) {
        echo "❌ Scene 211 not found!\n";
        exit(1);
    }

    echo "🎬 Scene 211 Current Data:\n";
    echo "   ID: {$scene->id}\n";
    echo "   Project ID: {$scene->project_id}\n";
    echo "   Gemini Duration: {$scene->gemini_duration}s\n";
    echo "   Duration Seconds: {$scene->duration_seconds}s\n";
    echo "   Trimmed Duration: {$scene->trimmed_duration}s ❌\n";
    echo "   Start Time: {$scene->start_time}s\n";
    echo "   End Time: {$scene->end_time}s ❌\n\n";

    // Calculate correct values
    $correctDuration = $scene->gemini_duration;
    $correctStartTime = 0.0;
    $correctEndTime = $correctDuration;

    echo "🎯 Correct Values:\n";
    echo "   Trimmed Duration: {$correctDuration}s\n";
    echo "   Start Time: {$correctStartTime}s\n";
    echo "   End Time: {$correctEndTime}s\n\n";

    // Update the scene with correct values
    $updated = DB::table('scenes')
        ->where('id', 211)
        ->update([
            'trimmed_duration' => $correctDuration,
            'start_time' => $correctStartTime,
            'end_time' => $correctEndTime,
            'updated_at' => now()
        ]);

    if ($updated) {
        echo "✅ Scene 211 updated successfully!\n\n";
        
        // Verify the update
        $updatedScene = DB::table('scenes')->where('id', 211)->first();
        echo "🎬 Scene 211 Updated Data:\n";
        echo "   ID: {$updatedScene->id}\n";
        echo "   Project ID: {$updatedScene->project_id}\n";
        echo "   Gemini Duration: {$updatedScene->gemini_duration}s\n";
        echo "   Duration Seconds: {$updatedScene->duration_seconds}s\n";
        echo "   Trimmed Duration: {$updatedScene->trimmed_duration}s ✅\n";
        echo "   Start Time: {$updatedScene->start_time}s ✅\n";
        echo "   End Time: {$updatedScene->end_time}s ✅\n\n";
        
        // Check if duration now matches
        $difference = abs($updatedScene->gemini_duration - $updatedScene->trimmed_duration);
        if ($difference <= 0.1) {
            echo "🎉 SUCCESS: Duration mismatch fixed! Difference: {$difference}s\n";
        } else {
            echo "❌ FAILED: Duration still doesn't match. Difference: {$difference}s\n";
        }
        
    } else {
        echo "❌ Failed to update Scene 211\n";
    }

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
