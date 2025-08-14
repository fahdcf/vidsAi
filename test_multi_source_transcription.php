<?php

require_once 'vendor/autoload.php';

use Illuminate\Support\Facades\DB;
use App\Services\SceneGenerationService;
use App\Models\Project;

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🧪 TEST: Multi-Source Transcription System for Arabic Projects\n";
echo "   This will test the new fallback transcription methods when Aeneas fails\n\n";

try {
    // Get Project 45 data
    $project = Project::find(45);
    if (!$project) {
        echo "❌ Project 45 not found!\n";
        exit(1);
    }
    
    echo "🔍 Project Details:\n";
    echo "   ID: {$project->id}\n";
    echo "   Name: {$project->name}\n";
    echo "   Language: {$project->language}\n";
    echo "   Custom Script: " . ($project->custom_script ? substr($project->custom_script, 0, 100) . "..." : "NULL") . "\n";
    echo "   Voiceover: {$project->voiceover_file}\n\n";
    
    // Check if custom script exists
    if (!$project->custom_script) {
        echo "❌ Project custom script is NULL! Cannot proceed with transcription.\n";
        exit(1);
    }
    
    // Get voiceover path
    $voiceoverPath = storage_path('app/public/' . $project->voiceover_file);
    if (!file_exists($voiceoverPath)) {
        echo "❌ Voiceover file not found: {$voiceoverPath}\n";
        exit(1);
    }
    
    echo "🎵 Voiceover file found: " . basename($project->voiceover_file) . "\n";
    echo "   Size: " . round(filesize($voiceoverPath) / 1024 / 1024, 2) . " MB\n";
    echo "   Path: {$voiceoverPath}\n\n";
    
    // Create SceneGenerationService instance
    $service = new SceneGenerationService();
    
    echo "🚀 Testing Multi-Source Transcription System...\n";
    echo "   This will try multiple methods when Aeneas fails\n\n";
    
    // Use reflection to call the private method
    $reflection = new ReflectionClass($service);
    $method = $reflection->getMethod('tryMultipleTranscriptionSources');
    $method->setAccessible(true);
    
    // Test the multi-source transcription
    $startTime = microtime(true);
    $result = $method->invoke($service, $voiceoverPath, $project->custom_script, $project->language);
    $endTime = microtime(true);
    
    $executionTime = round(($endTime - $startTime) * 1000, 2);
    
    echo "⏱️  Execution Time: {$executionTime}ms\n\n";
    
    if ($result) {
        echo "✅ Multi-Source Transcription SUCCESSFUL!\n";
        echo "   Source: {$result['source']}\n";
        echo "   Words Count: " . count($result['words']) . "\n";
        echo "   Total Duration: " . ($result['total_duration'] ?? 'unknown') . "s\n\n";
        
        echo "📝 Sample Words (First 10):\n";
        $sampleWords = array_slice($result['words'], 0, 10);
        foreach ($sampleWords as $i => $word) {
            $start = $word['start_time'] ?? $word['start'] ?? 'N/A';
            $end = $word['end_time'] ?? $word['end'] ?? 'N/A';
            $duration = isset($start) && isset($end) ? round($end - $start, 3) : 'N/A';
            $text = $word['text'] ?? $word['word'] ?? 'N/A';
            
            echo "   " . ($i + 1) . ". \"{$text}\" ({$start}s - {$end}s, duration: {$duration}s)\n";
        }
        
        if (count($result['words']) > 10) {
            echo "   ... and " . (count($result['words']) - 10) . " more words\n";
        }
        
        echo "\n🎯 Key Metrics:\n";
        $firstWord = $result['words'][0] ?? null;
        $lastWord = end($result['words']) ?: null;
        
        if ($firstWord) {
            $firstStart = $firstWord['start_time'] ?? $firstWord['start'] ?? 'N/A';
            echo "   First word starts at: {$firstStart}s\n";
        }
        
        if ($lastWord) {
            $lastEnd = $lastWord['end_time'] ?? $lastWord['end'] ?? 'N/A';
            echo "   Last word ends at: {$lastEnd}s\n";
        }
        
        // Check if timing looks realistic
        if ($firstWord && isset($firstWord['start_time']) && $firstWord['start_time'] > 0.1) {
            echo "   ✅ Speech start timing looks realistic\n";
        } else {
            echo "   ⚠️  Speech start timing may need improvement\n";
        }
        
    } else {
        echo "❌ Multi-Source Transcription FAILED\n";
        echo "   All transcription methods failed\n";
        echo "   This means we need to install the required tools\n\n";
        
        echo "🔧 Required Tools:\n";
        echo "   1. Whisper.cpp (for lightweight transcription)\n";
        echo "   2. Coqui TTS (for forced alignment)\n";
        echo "   3. FFmpeg/FFprobe (for audio analysis)\n\n";
        
        echo "💡 Installation Commands:\n";
        echo "   # For Whisper.cpp:\n";
        echo "   git clone https://github.com/ggerganov/whisper.cpp.git\n";
        echo "   cd whisper.cpp && make\n";
        echo "   # Download model: bash ./models/download-ggml-model.sh base\n\n";
        
        echo "   # For Coqui TTS:\n";
        echo "   pip install TTS\n\n";
        
        echo "   # For FFmpeg (Windows):\n";
        echo "   # Download from https://ffmpeg.org/download.html\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "   File: " . $e->getFile() . "\n";
    echo "   Line: " . $e->getLine() . "\n";
    echo "   Stack trace:\n" . $e->getTraceAsString() . "\n";
}

echo "\n🏁 Test completed!\n";
