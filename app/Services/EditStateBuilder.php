<?php

namespace App\Services;

use App\Models\Project;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;

/**
 * Builds a structured EditState object from a Project.
 *
 * EditState is the single source of truth for a video edit.
 * Saved to projects.edit_state and sent to the render service.
 */
class EditStateBuilder
{
    private const FPS = 30;

    public function build(Project $project): array
    {
        $scenes = $project->scenes()
            ->orderBy('scene_number')
            ->get();

        ['width' => $width, 'height' => $height] = $this->getDimensions($project);

        $videoTrack = $this->buildVideoTrack($scenes, $project);
        $subtitleTrack = $this->buildSubtitleTrack($project);
        $totalFrames = $this->calcTotalFrames($videoTrack, $subtitleTrack);
        $audioTrack = $this->buildAudioTrack($project, $totalFrames);

        return [
            'version' => 1,
            'project_id' => (string) $project->id,
            'fps' => self::FPS,
            'total_frames' => $totalFrames,
            'width' => $width,
            'height' => $height,
            'tracks' => [
                'video' => $videoTrack,
                'subtitles' => $subtitleTrack,
                'overlays' => [],
                'motion_graphics' => [],
                'audio' => $audioTrack,
            ],
            'metadata' => [
                'platform' => $this->detectPlatform($project),
                'language' => $project->language ?? 'en',
                'created_at' => now()->toISOString(),
                'last_modified' => now()->toISOString(),
            ],
        ];
    }

    private function buildVideoTrack(Collection $scenes, Project $project): array
    {
        $track = [];
        $currentFrame = 0;
        $total = $scenes->count();

        foreach ($scenes as $index => $scene) {
            $durationSeconds = (float) ($scene->trimmed_duration
                ?? $scene->gemini_duration
                ?? $scene->duration_seconds
                ?? 3.0);

            $durationFrames = (int) round($durationSeconds * self::FPS);
            $startFrame = $currentFrame;
            $endFrame = $currentFrame + $durationFrames;
            $isLast = $index === $total - 1;

            $clipUrl = $scene->video_url;
            if (!$clipUrl && !empty($scene->video_path)) {
                $clipUrl = Storage::url($scene->video_path);
            }

            $trimInSeconds = (float) ($scene->start_time ?? 0);
            $trimOutSeconds = (float) ($scene->end_time ?? $durationSeconds);

            $track[] = [
                'id' => 'scene_' . $scene->id,
                'clip_url' => $clipUrl,
                'media_type' => $this->normalizeMediaType($scene->type),
                'start_frame' => $startFrame,
                'end_frame' => $endFrame,
                'trim_in' => (int) round($trimInSeconds * self::FPS),
                'trim_out' => (int) round($trimOutSeconds * self::FPS),
                'animation' => 'zoom-in',
                'transition_out' => $isLast ? null : [
                    'type' => $project->transition ?? 'fade',
                    'duration_frames' => 15,
                ],
                'speed' => 1.0,
                'color_grade' => null,
                'volume' => 0,
            ];

            $currentFrame = $endFrame;
        }

        return $track;
    }

    private function buildSubtitleTrack(Project $project): array
    {
        $subtitlesScript = $project->subtitles_script;

        if (empty($subtitlesScript)) {
            return [];
        }

        if (is_string($subtitlesScript)) {
            $subtitlesScript = json_decode($subtitlesScript, true) ?? [];
        }

        // Detect and warn about plain string subtitle format (legacy data)
        $firstItem = $subtitlesScript[0] ?? null;
        if ($firstItem !== null && !is_array($firstItem)) {
            \Illuminate\Support\Facades\Log::warning(
                '[EditStateBuilder] subtitles_script contains non-array items - '
                . 'subtitle track will be empty. Project: ' . $project->id
                . ' Item type: ' . gettype($firstItem)
            );
            return [];
        }

        $style = $project->subtitle_style ?? 'default';
        $track = [];

        foreach ($subtitlesScript as $index => $sub) {
            $startFrame = (int) round(($sub['start'] ?? 0) * self::FPS);
            $endFrame = (int) round(($sub['end'] ?? 0) * self::FPS);

            if ($endFrame <= $startFrame) {
                continue;
            }

            $item = [
                'id' => 'sub_' . $index,
                'text' => $sub['text'] ?? '',
                'start_frame' => $startFrame,
                'end_frame' => $endFrame,
                'style' => $style,
                'position' => $sub['position'] ?? 'bottom',
                'config' => [],
            ];

            if (!empty($sub['words']) && is_array($sub['words'])) {
                $item['words'] = array_map(static fn ($w) => [
                    'word' => $w['word'] ?? '',
                    'start_frame' => (int) round(($w['start'] ?? 0) * self::FPS),
                    'end_frame' => (int) round(($w['end'] ?? 0) * self::FPS),
                ], $sub['words']);
            }

            $track[] = $item;
        }

        return $track;
    }

    private function buildAudioTrack(Project $project, int $totalFrames): array
    {
        $track = [];

        $voiceoverUrl = $project->voiceover_url
            ?? $project->voiceover_file
            ?? null;

        if (!empty($voiceoverUrl)) {
            $track[] = [
                'id' => 'voiceover',
                'url' => $voiceoverUrl,
                'type' => 'voiceover',
                'start_frame' => 0,
                'end_frame' => $totalFrames,
                'volume' => 1.0,
                'fade_in_frames' => 0,
                'fade_out_frames' => 10,
            ];
        }

        $musicUrl = null;
        if (!empty($project->selected_music) && is_array($project->selected_music)) {
            $musicUrl = $project->selected_music['url']
                ?? $project->selected_music['preview_hq_mp3']
                ?? $project->selected_music['preview_lq_mp3']
                ?? null;
        }
        $musicUrl = $musicUrl ?? ($project->music_url ?? null);

        if (!empty($musicUrl)) {
            $track[] = [
                'id' => 'music',
                'url' => $musicUrl,
                'type' => 'music',
                'start_frame' => 0,
                'end_frame' => $totalFrames,
                'volume' => 0.3,
                'fade_in_frames' => 15,
                'fade_out_frames' => 15,
            ];
        }

        return $track;
    }

    private function calcTotalFrames(array $videoTrack, array $subtitleTrack): int
    {
        $lastVideoFrame = empty($videoTrack)
            ? 0
            : max(array_column($videoTrack, 'end_frame'));

        $lastSubtitleFrame = empty($subtitleTrack)
            ? 0
            : max(array_column($subtitleTrack, 'end_frame'));

        return max($lastVideoFrame, $lastSubtitleFrame, 1);
    }

    private function getDimensions(Project $project): array
    {
        $format = $project->video_format ?? '9:16';

        if (is_array($format)) {
            $format = $format[0] ?? '9:16';
        }

        $format = (string) $format;

        return match (true) {
            str_contains($format, '16:9') => ['width' => 1920, 'height' => 1080],
            str_contains($format, '1:1') => ['width' => 1080, 'height' => 1080],
            default => ['width' => 1080, 'height' => 1920],
        };
    }

    private function normalizeMediaType(?string $type): string
    {
        return match ($type) {
            'image' => 'image',
            'generated' => 'generated',
            default => 'video',
        };
    }

    private function detectPlatform(Project $project): ?string
    {
        $format = $project->video_format ?? null;

        if (is_array($format)) {
            $format = implode(' ', $format);
        }

        $format = strtolower((string) $format);

        if (str_contains($format, 'tiktok')) {
            return 'tiktok';
        }
        if (str_contains($format, 'reels')) {
            return 'reels';
        }
        if (str_contains($format, 'youtube')) {
            return 'youtube';
        }
        if (str_contains($format, '16:9')) {
            return 'youtube';
        }
        if (str_contains($format, '9:16')) {
            return 'tiktok';
        }
        if (str_contains($format, '1:1')) {
            return 'ads';
        }

        return null;
    }
}
