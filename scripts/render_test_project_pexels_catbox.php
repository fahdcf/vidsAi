<?php

use App\Models\Project;
use Illuminate\Support\Facades\Http;

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$projectId = 72;
$voiceOver = 'https://files.catbox.moe/x566vr.mp3';
$maxClips = 4;

$project = Project::find($projectId);
if (!$project) {
    fwrite(STDERR, "Project {$projectId} not found\n");
    exit(1);
}

$sceneRows = $project->scenes()
    ->whereNotNull('video_url')
    ->where('video_url', 'like', '%pexels%')
    ->orderBy('scene_number')
    ->limit($maxClips)
    ->get(['id', 'scene_number', 'video_url', 'trimmed_duration', 'duration_seconds', 'start_time', 'end_time']);

if ($sceneRows->count() < 2) {
    fwrite(STDERR, "Not enough Pexels scenes found for project {$projectId}\n");
    exit(2);
}

$clips = [];
$clipDurations = [];
$clipStartTimes = [];
$clipEndTimes = [];
$totalDuration = 0.0;

foreach ($sceneRows as $scene) {
    $duration = (float) ($scene->trimmed_duration ?? $scene->duration_seconds ?? 3.0);
    if ($duration <= 0) {
        $duration = 3.0;
    }

    $start = $scene->start_time !== null ? (float) $scene->start_time : 0.0;
    $end = $scene->end_time !== null ? (float) $scene->end_time : $duration;

    $clips[] = $scene->video_url;
    $clipDurations[] = $duration;
    $clipStartTimes[] = $start;
    $clipEndTimes[] = $end;
    $totalDuration += $duration;
}

$subtitles = [
    [
        'text' => 'Testing render with Pexels scene URLs.',
        'start' => 0.0,
        'end' => min(3.0, $totalDuration),
        'style' => 'tiktok_trending',
        'position' => 'bottom',
        'fontFamily' => 'Roboto',
    ],
    [
        'text' => 'Voiceover source is Catbox and subtitles are timed.',
        'start' => min(3.0, $totalDuration),
        'end' => min(7.0, $totalDuration),
        'style' => 'tiktok_trending',
        'position' => 'bottom',
        'fontFamily' => 'Roboto',
    ],
    [
        'text' => 'Provider fallback remains available if needed.',
        'start' => min(7.0, $totalDuration),
        'end' => max(min($totalDuration, 12.0), min(7.0, $totalDuration) + 0.5),
        'style' => 'tiktok_trending',
        'position' => 'bottom',
        'fontFamily' => 'Roboto',
    ],
];

$videoData = [
    'clips' => $clips,
    'clipDurations' => $clipDurations,
    'animations' => array_fill(0, count($clips), 'none'),
    'clipStartTimes' => $clipStartTimes,
    'clipEndTimes' => $clipEndTimes,
    'voiceOver' => $voiceOver,
    'voiceOverVolume' => 1.3,
    'music' => null,
    'musicVolume' => 0.2,
    'aspectRatio' => '9:16',
    'transition' => 'fade',
    'subtitles' => $subtitles,
];

$renderUrl = config('services.video_render.base_url') . config('services.video_render.render_endpoint');
$statusBase = config('services.video_render.base_url') . '/status/';

echo 'PROJECT_ID=' . $projectId . PHP_EOL;
echo 'SCENES_USED=' . json_encode($sceneRows->pluck('scene_number')->toArray()) . PHP_EOL;
echo 'CLIPS=' . json_encode($clips, JSON_UNESCAPED_SLASHES) . PHP_EOL;
echo 'Submitting render to: ' . $renderUrl . PHP_EOL;

$response = Http::withOptions([
    'timeout' => 90,
    'verify' => false,
])->post($renderUrl, $videoData);

if (!$response->successful()) {
    echo 'RENDER_SUBMIT_FAILED' . PHP_EOL;
    echo 'HTTP_STATUS=' . $response->status() . PHP_EOL;
    echo 'BODY=' . $response->body() . PHP_EOL;
    exit(3);
}

$data = $response->json();
$jobId = $data['jobId'] ?? $data['id'] ?? null;

echo 'RENDER_SUBMIT_OK' . PHP_EOL;
echo 'JOB_ID=' . ($jobId ?? 'null') . PHP_EOL;
echo 'RESPONSE=' . json_encode($data, JSON_UNESCAPED_SLASHES) . PHP_EOL;

if (!$jobId) {
    exit(4);
}

$statusUrl = $statusBase . $jobId;
echo 'STATUS_URL=' . $statusUrl . PHP_EOL;

for ($i = 1; $i <= 8; $i++) {
    sleep(5);
    $statusResp = Http::withOptions([
        'timeout' => 30,
        'verify' => false,
    ])->get($statusUrl);

    echo 'STATUS_CHECK_' . $i . '_HTTP=' . $statusResp->status() . PHP_EOL;
    echo 'STATUS_CHECK_' . $i . '_BODY=' . $statusResp->body() . PHP_EOL;

    if ($statusResp->successful()) {
        $statusJson = $statusResp->json();
        $status = $statusJson['status'] ?? 'unknown';
        if (in_array($status, ['completed', 'failed'], true)) {
            break;
        }
    }
}
