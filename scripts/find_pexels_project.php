<?php

use App\Models\Project;

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$candidates = Project::query()
    ->orderByDesc('id')
    ->limit(50)
    ->get(['id', 'name', 'voiceover_option', 'voiceover_url']);

$result = [];

foreach ($candidates as $project) {
    $pexelsScenes = $project->scenes()
        ->whereNotNull('video_url')
        ->where('video_url', 'like', '%pexels%')
        ->orderBy('scene_number')
        ->get(['id', 'scene_number', 'video_url', 'trimmed_duration', 'duration_seconds']);

    if ($pexelsScenes->count() >= 2) {
        $result[] = [
            'id' => $project->id,
            'name' => $project->name,
            'voiceover_option' => $project->voiceover_option,
            'voiceover_url' => $project->voiceover_url,
            'pexels_scene_count' => $pexelsScenes->count(),
            'sample_urls' => $pexelsScenes->take(2)->pluck('video_url')->toArray(),
        ];
    }
}

echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
