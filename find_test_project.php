<?php

require_once 'vendor/autoload.php';

use Illuminate\Support\Facades\DB;

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔍 Finding Arabic Projects with Custom Scripts for Testing...\n\n";

try {
    // Find Arabic projects with custom scripts
    $arabicProjects = DB::table('projects')
        ->whereIn('language', ['arabic', 'moroccan', 'darija', 'ar', 'ara'])
        ->whereNotNull('custom_script')
        ->where('custom_script', '!=', '')
        ->whereNotNull('voiceover_file')
        ->where('voiceover_file', '!=', '')
        ->orderBy('id', 'desc')
        ->limit(5)
        ->get();
    
    if ($arabicProjects->count() === 0) {
        echo "❌ No Arabic projects with custom scripts found!\n";
        exit(1);
    }
    
    echo "✅ Found " . $arabicProjects->count() . " Arabic projects with custom scripts:\n\n";
    
    foreach ($arabicProjects as $project) {
        echo "📁 Project ID: {$project->id}\n";
        echo "   Name: " . ($project->name ?? 'NULL') . "\n";
        echo "   Language: {$project->language}\n";
        echo "   Custom Script: " . substr($project->custom_script, 0, 150) . "...\n";
        echo "   Voiceover: " . ($project->voiceover_file ?? 'NULL') . "\n";
        echo "   Status: " . ($project->status ?? 'NULL') . "\n";
        echo "   Created: {$project->created_at}\n";
        echo "   ---\n";
    }
    
    // Suggest the best project to test
    $bestProject = $arabicProjects->first();
    echo "\n🎯 Recommended for testing: Project {$bestProject->id}\n";
    echo "   Script length: " . strlen($bestProject->custom_script) . " characters\n";
    echo "   Has voiceover: " . ($bestProject->voiceover_file ? 'Yes' : 'No') . "\n";
    echo "   Status: {$bestProject->status}\n";
    
    // Check if voiceover file exists
    $voiceoverPath = storage_path('app/public/' . $bestProject->voiceover_file);
    if (file_exists($voiceoverPath)) {
        echo "   Voiceover file exists: Yes (" . round(filesize($voiceoverPath) / 1024 / 1024, 2) . " MB)\n";
    } else {
        echo "   Voiceover file exists: No\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}

echo "\n🏁 Check completed!\n";
