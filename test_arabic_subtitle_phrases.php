<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Services\SceneGenerationService;
use App\Models\Project;

echo "🧪 TEST: Arabic Subtitle Phrase Generation\n";
echo "   Testing the improved Gemini prompt for Arabic semantic splitting\n\n";

try {
    // Load Project 45 (Arabic project)
    $project = Project::find(45);
    if (!$project) {
        echo "❌ Project 45 not found\n";
        exit(1);
    }

    echo "🔍 Project Details:\n";
    echo "   ID: {$project->id}\n";
    echo "   Name: {$project->name}\n";
    echo "   Language: {$project->language}\n";
    echo "   Script: " . substr($project->custom_script, 0, 100) . "...\n\n";

    // Create service instance
    $service = new SceneGenerationService();
    
    // Use reflection to access private method
    $reflection = new ReflectionClass($service);
    $method = $reflection->getMethod('generateScenePhrases');
    $method->setAccessible(true);

    // Create sample transcript data
    $transcriptData = [
        'text' => $project->custom_script,
        'words' => [
            ['word' => 'كتقلب', 'start' => 0.477, 'end' => 0.872],
            ['word' => 'على', 'start' => 0.882, 'end' => 1.277],
            ['word' => 'مبرد', 'start' => 1.287, 'end' => 1.682],
            ['word' => 'دوز', 'start' => 1.682, 'end' => 2.057],
            ['word' => 'بيه', 'start' => 2.067, 'end' => 2.462],
            ['word' => 'السيف', 'start' => 2.472, 'end' => 2.866],
            ['word' => 'يكون', 'start' => 2.866, 'end' => 3.241],
            ['word' => 'اقتصادي', 'start' => 3.251, 'end' => 3.646],
            ['word' => 'قابل', 'start' => 3.656, 'end' => 4.051],
            ['word' => 'للنقل', 'start' => 4.051, 'end' => 4.426],
            ['word' => 'وبتمن', 'start' => 4.436, 'end' => 4.811],
            ['word' => 'مناسب', 'start' => 4.821, 'end' => 5.196],
        ]
    ];

    echo "🚀 Testing Scene Phrase Generation with Arabic Script...\n";
    echo "   This will test the improved Gemini prompt for Arabic semantic splitting\n\n";

    // Test the method
    $startTime = microtime(true);
    $result = $method->invoke($service, $project->custom_script, $transcriptData, $project->language);
    $endTime = microtime(true);

    $executionTime = round(($endTime - $startTime) * 1000, 2);
    echo "⏱️  Execution Time: {$executionTime}ms\n\n";

    if ($result && isset($result['subtitles_script'])) {
        echo "✅ Scene Generation SUCCESSFUL!\n";
        echo "   Phrases Count: " . count($result['phrases'] ?? []) . "\n";
        echo "   Subtitles Count: " . count($result['subtitles_script']) . "\n\n";

        echo "📝 Generated Subtitles:\n";
        foreach ($result['subtitles_script'] as $i => $subtitle) {
            echo "   " . ($i + 1) . ". \"{$subtitle}\"\n";
        }

        echo "\n🎯 Analysis:\n";
        
        // Check for common Arabic splitting issues
        $issues = [];
        foreach ($result['subtitles_script'] as $subtitle) {
            // Check for incomplete phrases
            if (preg_match('/\s+(و|ف|ل|ب|ك|ع|م|ن|ه|ي|ت|س|أ|إ|آ)\s*$/', $subtitle)) {
                $issues[] = "Incomplete phrase ending with preposition: \"{$subtitle}\"";
            }
            
            // Check for broken adjective-noun pairs
            if (preg_match('/\s+(كبير|صغير|جديد|قديم|جميل|قوي|ضعيف|سريع|بطيء)\s*$/', $subtitle)) {
                $issues[] = "Adjective without noun: \"{$subtitle}\"";
            }
        }

        if (empty($issues)) {
            echo "   ✅ All subtitle phrases look semantically correct!\n";
        } else {
            echo "   ⚠️  Found potential issues:\n";
            foreach ($issues as $issue) {
                echo "      - {$issue}\n";
            }
        }

    } else {
        echo "❌ Scene Generation FAILED\n";
        echo "   Result: " . json_encode($result) . "\n";
    }

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "   File: " . $e->getFile() . "\n";
    echo "   Line: " . $e->getLine() . "\n";
}

echo "\n🏁 Test completed!\n";
