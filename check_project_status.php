<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Project;

echo "🔍 Checking project status...\n\n";

$project = Project::find(16);

echo "📊 Project 16 Status:\n";
echo "- ID: " . $project->id . "\n";
echo "- Name: " . $project->name . "\n";
echo "- Status: " . $project->status . "\n";
echo "- Processing Started: " . ($project->processing_started_at ?? 'NOT_SET') . "\n";
echo "- Processing Completed: " . ($project->processing_completed_at ?? 'NOT_SET') . "\n";
echo "- Final Video Path: " . ($project->final_video_path ?? 'NOT_SET') . "\n";
echo "- Error Message: " . ($project->error_message ?? 'NOT_SET') . "\n";
echo "- Created At: " . $project->created_at . "\n";
echo "- Updated At: " . $project->updated_at . "\n\n";

// Check if there are any recent jobs in the queue
echo "🔍 Checking recent jobs...\n";

try {
    $jobs = \Illuminate\Support\Facades\DB::table('jobs')
        ->where('payload', 'like', '%ProcessSubtitleGenerationJob%')
        ->orderBy('created_at', 'desc')
        ->limit(5)
        ->get();
    
    echo "📋 Recent subtitle generation jobs:\n";
    foreach($jobs as $job) {
        echo "- Job ID: " . $job->id . "\n";
        echo "  Created: " . $job->created_at . "\n";
        echo "  Available: " . $job->available_at . "\n";
        echo "  Reserved: " . ($job->reserved_at ?? 'NOT_RESERVED') . "\n";
        echo "  Attempts: " . $job->attempts . "\n";
        echo "  Queue: " . $job->queue . "\n\n";
    }
} catch (Exception $e) {
    echo "❌ Error checking jobs: " . $e->getMessage() . "\n";
}

// Check failed jobs
echo "🔍 Checking failed jobs...\n";

try {
    $failedJobs = \Illuminate\Support\Facades\DB::table('failed_jobs')
        ->where('payload', 'like', '%ProcessSubtitleGenerationJob%')
        ->orderBy('failed_at', 'desc')
        ->limit(5)
        ->get();
    
    echo "📋 Recent failed subtitle generation jobs:\n";
    foreach($failedJobs as $job) {
        echo "- Job ID: " . $job->id . "\n";
        echo "  Failed At: " . $job->failed_at . "\n";
        echo "  Exception: " . substr($job->exception, 0, 200) . "...\n\n";
    }
} catch (Exception $e) {
    echo "❌ Error checking failed jobs: " . $e->getMessage() . "\n";
}

echo "🔍 Check completed!\n";

