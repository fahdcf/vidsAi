<?php

require_once 'vendor/autoload.php';

use Illuminate\Support\Facades\DB;

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔍 Finding Arabic Projects with Scripts...\n\n";

try {
    // Find Arabic projects with scripts
    $arabicProjects = DB::table('projects')
        ->whereIn('language', ['arabic', 'moroccan', 'darija', 'ar', 'ara'])
        ->whereNotNull('script')
        ->where('script', '!=', '')
        ->orderBy('id', 'desc')
        ->limit(10)
        ->get();
    
    if ($arabicProjects->count() === 0) {
        echo "❌ No Arabic projects with scripts found!\n";
        
        // Check all projects
        echo "\n📊 All Projects Summary:\n";
        $allProjects = DB::table('projects')->get();
        $languages = $allProjects->pluck('language')->unique();
        foreach ($languages as $lang) {
            $count = $allProjects->where('language', $lang)->count();
            $withScript = $allProjects->where('language', $lang)->whereNotNull('script')->where('script', '!=', '')->count();
            echo "   {$lang}: {$count} total, {$withScript} with scripts\n";
        }
        
        exit(1);
    }
    
    echo "✅ Found " . $arabicProjects->count() . " Arabic projects with scripts:\n\n";
    
    foreach ($arabicProjects as $project) {
        echo "📁 Project ID: {$project->id}\n";
        echo "   Name: " . ($project->name ?? 'NULL') . "\n";
        echo "   Language: {$project->language}\n";
        echo "   Script: " . substr($project->script, 0, 100) . "...\n";
        echo "   Voiceover: " . ($project->voiceover_file ?? 'NULL') . "\n";
        echo "   Created: {$project->created_at}\n";
        echo "   ---\n";
    }
    
    // Suggest the best project to test
    $bestProject = $arabicProjects->first();
    echo "\n🎯 Recommended for testing: Project {$bestProject->id}\n";
    echo "   Script length: " . strlen($bestProject->script) . " characters\n";
    echo "   Has voiceover: " . ($bestProject->voiceover_file ? 'Yes' : 'No') . "\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}

echo "\n🏁 Check completed!\n";
