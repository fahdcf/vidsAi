<?php

use App\Models\Project;
use Illuminate\Support\Facades\Http;

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$projectId = 72;
$voiceOver = 'https://files.catbox.moe/x566vr.mp3';

$clips = [
    'https://filesamples.com/samples/video/mp4/sample_640x360.mp4',
    'https://filesamples.com/samples/video/mp4/sample_960x540.mp4',
];

$clipDurations = [5.0, 10.0];
$clipStartTimes = [0.0, 0.0];
$clipEndTimes = [5.0, 10.0];

$subtitles = [
    [
        'text' => 'This is a render test with Catbox voiceover.',
        'start' => 0.0,
        'end' => 3.2,
        'style' => 'tiktok_trending',
        'position' => 'bottom',
        'fontFamily' => 'Roboto',
    ],
    [
        'text' => 'Using public internet clips and timed subtitles.',
        'start' => 3.2,
        'end' => 7.0,
        'style' => 'tiktok_trending',
        'position' => 'bottom',
        'fontFamily' => 'Roboto',
    ],
    [
        'text' => 'Fallback hosting is still available if needed.',
        'start' => 7.0,
        'end' => 12.5,
        'style' => 'tiktok_trending',
        'position' => 'bottom',
        'fontFamily' => 'Roboto',
    ],
];

$videoData = [
    'clips' => $clips,
    'clipDurations' => $clipDurations,
    'animations' => ['none', 'none'],
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

$project = Project::find($projectId);
if (!$project) {
    fwrite(STDERR, "Project {$projectId} not found\n");
    exit(1);
}

$renderUrl = config('services.video_render.base_url') . config('services.video_render.render_endpoint');
$statusBase = config('services.video_render.base_url') . '/status/';

echo "Submitting render to: {$renderUrl}\n";
$response = Http::withOptions([
    'timeout' => 45,
    'verify' => false,
])->post($renderUrl, $videoData);

if (!$response->successful()) {
    echo "RENDER_SUBMIT_FAILED\n";
    echo "HTTP_STATUS=" . $response->status() . "\n";
    echo "BODY=" . $response->body() . "\n";
    exit(2);
}

$data = $response->json();
$jobId = $data['jobId'] ?? $data['id'] ?? null;

echo "RENDER_SUBMIT_OK\n";
echo "JOB_ID=" . ($jobId ?? 'null') . "\n";
echo "RESPONSE=" . json_encode($data, JSON_UNESCAPED_SLASHES) . "\n";

if (!$jobId) {
    exit(3);
}

$statusUrl = $statusBase . $jobId;
echo "STATUS_URL={$statusUrl}\n";

for ($i = 1; $i <= 4; $i++) {
    sleep(5);
    $statusResp = Http::withOptions([
        'timeout' => 30,
        'verify' => false,
    ])->get($statusUrl);

    echo "STATUS_CHECK_{$i}_HTTP=" . $statusResp->status() . "\n";
    echo "STATUS_CHECK_{$i}_BODY=" . $statusResp->body() . "\n";

    if ($statusResp->successful()) {
        $statusJson = $statusResp->json();
        $status = $statusJson['status'] ?? 'unknown';
        if (in_array($status, ['completed', 'failed'], true)) {
            break;
        }
    }
}
