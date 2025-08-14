<?php

require_once 'vendor/autoload.php';

use Illuminate\Support\Facades\DB;
use App\Models\Project;

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔍 Checking Project 45 Data...\n\n";

try {
    // Get Project 45 data
    $project = Project::find(45);
    if (!$project) {
        echo "❌ Project 45 not found!\n";
        exit(1);
    }
    
    echo "📊 Project 45 Details:\n";
    echo "   ID: {$project->id}\n";
    echo "   Name: " . ($project->name ?? 'NULL') . "\n";
    echo "   Language: " . ($project->language ?? 'NULL') . "\n";
    echo "   Script: " . ($project->script ?? 'NULL') . "\n";
    echo "   Voiceover: " . ($project->voiceover_file ?? 'NULL') . "\n";
    echo "   Created: " . ($project->created_at ?? 'NULL') . "\n";
    echo "   Updated: " . ($project->updated_at ?? 'NULL') . "\n\n";
    
    // Check database directly
    echo "🗄️  Raw Database Data:\n";
    $rawProject = DB::table('projects')->where('id', 45)->first();
    if ($rawProject) {
        echo "   ID: {$rawProject->id}\n";
        echo "   Name: " . ($rawProject->name ?? 'NULL') . "\n";
        echo "   Language: " . ($rawProject->language ?? 'NULL') . "\n";
        echo "   Script: " . ($rawProject->script ?? 'NULL') . "\n";
        echo "   Voiceover: " . ($rawProject->voiceover_file ?? 'NULL') . "\n";
    } else {
        echo "   ❌ No raw data found\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}

echo "\n🏁 Check completed!\n";
