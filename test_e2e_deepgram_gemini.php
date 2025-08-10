<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🧪 E2E Test: Deepgram + Gemini (no Pexels)\n\n";

use App\Services\SceneGenerationService;
use App\Models\Project;

try {
    // Prepare a transient Project model (not persisted)
    $project = new Project([
        'id' => 0,
        'name' => 'E2E Test Project',
        'language' => 'english',
        'voiceover_file' => 'voiceovers/RJHsl2W0X8n43DOq1zK3gGtaX8YzIl19fZZPMR3b.mp3',
        'custom_script' => 'Discover EcoSip, the reusable water bottle that keeps your drinks cold for 24 hours and hot for 12 hours. Made from sustainable materials, EcoSip is perfect for your daily adventures. Stay hydrated, stay green, and make a difference with EcoSip',
        'description' => null,
    ]);

    $voiceoverFullPath = storage_path('app/public/' . $project->voiceover_file);
    if (!file_exists($voiceoverFullPath)) {
        echo "❌ Audio file not found: {$voiceoverFullPath}\n";
        exit(1);
    }

    echo "🔑 Deepgram key len: " . strlen(config('services.deepgram.api_key')) . " | Gemini key len: " . strlen(config('services.gemini.api_key')) . "\n";
    echo "📁 Voiceover: {$voiceoverFullPath} (" . filesize($voiceoverFullPath) . " bytes)\n\n";

    $service = app(SceneGenerationService::class);

    // Step A: Transcribe
    $t0 = microtime(true);
    $transcript = (new ReflectionClass($service))->getMethod('transcribeAudio');
    $transcript->setAccessible(true);
    $transcriptData = $transcript->invoke($service, $voiceoverFullPath, $project->language);
    $t1 = microtime(true);

    echo "✅ Deepgram OK in " . round(($t1 - $t0) * 1000) . " ms, words: " . count($transcriptData['words'] ?? []) . "\n";

    // Step B: Gemini scene phrases
    $gen = (new ReflectionClass($service))->getMethod('generateScenePhrases');
    $gen->setAccessible(true);
    $scene = $gen->invoke($service, $project->custom_script, $transcriptData, $project->language);
    $t2 = microtime(true);

    echo "✅ Gemini OK in " . round(($t2 - $t1) * 1000) . " ms, phrases: " . count($scene['phrases'] ?? []) . ", subtitles: " . count($scene['subtitles_script'] ?? []) . "\n";

    // Output small preview
    $firstPhrase = $scene['phrases'][0] ?? null;
    echo "\nFirst phrase preview:\n";
    echo json_encode($firstPhrase, JSON_PRETTY_PRINT) . "\n";

    echo "\nAll good.\n";

} catch (Throwable $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "📍 File: " . $e->getFile() . ":" . $e->getLine() . "\n";
    echo $e->getTraceAsString() . "\n";
    exit(1);
}
