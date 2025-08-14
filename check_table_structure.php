<?php

require_once 'vendor/autoload.php';

use Illuminate\Support\Facades\DB;

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔍 Checking Projects Table Structure...\n\n";

try {
    // Get table structure
    $columns = DB::select("DESCRIBE projects");
    
    echo "📊 Projects Table Columns:\n";
    foreach ($columns as $column) {
        echo "   {$column->Field} ({$column->Type}) - {$column->Null} - {$column->Key}\n";
    }
    
    echo "\n📋 Sample Project Data:\n";
    $sampleProject = DB::table('projects')->first();
    if ($sampleProject) {
        foreach ((array) $sampleProject as $key => $value) {
            $displayValue = is_string($value) && strlen($value) > 100 ? substr($value, 0, 100) . "..." : $value;
            echo "   {$key}: {$displayValue}\n";
        }
    }
    
    echo "\n🌍 Language Distribution:\n";
    $languages = DB::table('projects')->select('language', DB::raw('count(*) as count'))->groupBy('language')->get();
    foreach ($languages as $lang) {
        echo "   {$lang->language}: {$lang->count} projects\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}

echo "\n🏁 Check completed!\n";
