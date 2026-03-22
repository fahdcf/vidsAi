<?php

namespace App\Services;

use App\Models\Project;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
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
        $totalFrames = $this->calcTotalFrames($videoTrack, $subtitleTrack, $project);
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

        // Extend last clip to cover full voiceover duration if scenes are shorter
        if (!empty($track) && !empty($project->voiceover_transcript)) {
            $transcript = $project->voiceover_transcript;
            $lastWord = end($transcript);
            $voiceoverEndFrame = !empty($lastWord['end'])
                ? (int) ceil($lastWord['end'] * self::FPS)
                : 0;

            if ($voiceoverEndFrame > $currentFrame) {
                // Extend the last clip's end_frame to cover the voiceover
                $lastIndex = count($track) - 1;
                $track[$lastIndex]['end_frame'] = $voiceoverEndFrame;
                // Also update trim_out proportionally — hold on last frame
                $track[$lastIndex]['trim_out'] = $track[$lastIndex]['trim_out'];
            }
        }

        return $track;
    }

    private function buildSubtitleTrack(Project $project): array
    {
        $subtitlesScript = $project->subtitles_script;
        $transcript = $project->voiceover_transcript ?? [];

        if (empty($subtitlesScript)) {
            return [];
        }

        if (is_string($subtitlesScript)) {
            $subtitlesScript = json_decode($subtitlesScript, true) ?? [];
        }

        $track = [];
        $style = $project->subtitle_style ?? 'default';

        // Check if subtitles are timed objects or plain strings
        $firstItem = $subtitlesScript[0] ?? null;
        if (is_string($firstItem)) {
            // Plain strings — build timing from voiceover transcript
            $voiceoverTotalDuration = 0.0;
            if (!empty($transcript)) {
                $lastWord = end($transcript);
                $voiceoverTotalDuration = (float) ($lastWord['end'] ?? 0);
            }

            $subtitleStrings = array_values(array_filter($subtitlesScript, static fn ($s) => is_string($s) && trim($s) !== ''));
            $sceneTexts = $project->scenes()
                ->orderBy('scene_number')
                ->pluck('script_text')
                ->map(static fn ($t) => (string) $t)
                ->toArray();

            if (!empty($subtitleStrings) && !empty($sceneTexts)) {
                $subtitleStrings = $this->mergeSubtitlesToMatchScenes($subtitleStrings, $sceneTexts);
            }

            foreach ($subtitleStrings as $i => $text) {
                if (!is_string($text) || empty(trim($text))) {
                    continue;
                }

                // Find timing from transcript
                $nextText = $subtitleStrings[$i + 1] ?? null;
                $timing = $this->getTimingFromTranscript(
                    $text,
                    is_string($nextText) ? $nextText : null,
                    $transcript,
                    $voiceoverTotalDuration
                );

                $startFrame = (int) round($timing['start'] * self::FPS);
                $endFrame = (int) round($timing['end'] * self::FPS);

                if ($endFrame <= $startFrame) {
                    continue;
                }

                $track[] = [
                    'id' => 'sub_' . $i,
                    'text' => $text,
                    'start_frame' => $startFrame,
                    'end_frame' => $endFrame,
                    'style' => $style,
                    'position' => 'bottom',
                    'config' => [],
                    'words' => $this->extractWordTimestamps(
                        $text,
                        $startFrame,
                        $endFrame,
                        $transcript
                    ),
                ];
            }

            return $track;
        }

        foreach ($subtitlesScript as $index => $sub) {
            if (!is_array($sub)) {
                Log::warning(
                    '[EditStateBuilder] subtitles_script contains non-array items - skipping item',
                    [
                        'project_id' => $project->id,
                        'item_index' => $index,
                        'item_type' => gettype($sub),
                    ]
                );
                continue;
            }

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
                'words' => $this->extractWordTimestamps(
                    (string) ($sub['text'] ?? ''),
                    $startFrame,
                    $endFrame,
                    $transcript
                ),
            ];

            $track[] = $item;
        }

        return $track;
    }

    private function mergeSubtitlesToMatchScenes(array $subtitleStrings, array $sceneTexts): array
    {
        if (count($subtitleStrings) <= count($sceneTexts)) {
            return $subtitleStrings;
        }

        $merged = [];
        $subIndex = 0;

        foreach ($sceneTexts as $sceneIndex => $sceneText) {
            if ($subIndex >= count($subtitleStrings)) {
                $merged[] = $sceneText;
                continue;
            }

            $sceneNorm = strtolower((string) preg_replace('/[^a-z0-9\s]/i', '', $sceneText));
            $sceneWords = array_values(array_filter(explode(' ', $sceneNorm)));

            $collectedWords = [];
            $collectedStrings = [];

            while ($subIndex < count($subtitleStrings)) {
                $subStr = (string) $subtitleStrings[$subIndex];
                $subNorm = strtolower((string) preg_replace('/[^a-z0-9\s]/i', '', $subStr));
                $subWords = array_values(array_filter(explode(' ', $subNorm)));

                $collectedWords = array_merge($collectedWords, $subWords);
                $collectedStrings[] = $subStr;
                $subIndex++;

                $sceneWordCount = count($sceneWords);
                $coveredCount = 0;
                foreach ($sceneWords as $sw) {
                    if (in_array($sw, $collectedWords, true)) {
                        $coveredCount++;
                    }
                }

                if ($sceneWordCount > 0 && ($coveredCount / $sceneWordCount) >= 0.8) {
                    break;
                }

                if ($subIndex < count($subtitleStrings)) {
                    $nextSub = strtolower((string) preg_replace('/[^a-z0-9\s]/i', '', (string) $subtitleStrings[$subIndex]));
                    $nextSceneIndex = $sceneIndex + 1;
                    if (isset($sceneTexts[$nextSceneIndex])) {
                        $nextSceneNorm = strtolower((string) preg_replace('/[^a-z0-9\s]/i', '', (string) $sceneTexts[$nextSceneIndex]));
                        $nextSceneFirstWord = explode(' ', trim($nextSceneNorm))[0] ?? '';
                        $nextSubFirstWord = explode(' ', trim($nextSub))[0] ?? '';
                        if ($nextSceneFirstWord && $nextSubFirstWord === $nextSceneFirstWord) {
                            break;
                        }
                    }
                }
            }

            $merged[] = implode(', ', $collectedStrings);
        }

        return $merged;
    }

    private function getTimingFromTranscript(
        string $text,
        ?string $nextText,
        array $transcript,
        float $totalDuration
    ): array {
        if (empty($transcript)) {
            return ['start' => 0.0, 'end' => $totalDuration];
        }

        $words = preg_split('/\s+/', trim(strtolower($text)));
        $firstWord = preg_replace('/[^a-z0-9]/', '', $words[0] ?? '');

        $nextWords = $nextText ? preg_split('/\s+/', trim(strtolower($nextText))) : [];
        $nextFirstWord = !empty($nextWords)
            ? preg_replace('/[^a-z0-9]/', '', $nextWords[0])
            : null;

        $startTime = null;
        $endTime = null;
        $foundStart = false;

        foreach ($transcript as $word) {
            $w = preg_replace('/[^a-z0-9]/', '', strtolower($word['word'] ?? ''));

            if (!$foundStart && $w === $firstWord) {
                $startTime = (float) ($word['start'] ?? 0.0);
                $foundStart = true;
                continue;
            }

            if ($foundStart && $nextFirstWord && $w === $nextFirstWord) {
                $endTime = (float) ($word['start'] ?? $totalDuration);
                break;
            }
        }

        $startTime = $startTime ?? 0.0;
        $endTime = $endTime ?? $totalDuration;

        if ($endTime <= $startTime) {
            $endTime = min($totalDuration, $startTime + 1.0);
        }

        // Add small padding
        return [
            'start' => max(0, $startTime - 0.1),
            'end' => min($totalDuration, $endTime - 0.1),
        ];
    }

    /**
     * Extract word-level timestamps for a subtitle segment from the Deepgram transcript.
     * Returns array of {word, start_frame, end_frame} for each word in the subtitle text.
     * Falls back to equal distribution if words cannot be matched.
     */
    private function extractWordTimestamps(
        string $subtitleText,
        int $segmentStartFrame,
        int $segmentEndFrame,
        array $transcript
    ): array {
        if (empty($transcript) || empty($subtitleText)) {
            return $this->equalDistributionFallback($subtitleText, $segmentStartFrame, $segmentEndFrame);
        }

        $subtitleWords = preg_split('/\s+/', trim($subtitleText));
        $subtitleWords = array_values(array_filter($subtitleWords, static fn ($w) => $w !== ''));

        if (empty($subtitleWords)) {
            return [];
        }

        $transcriptNormalized = array_map(static function ($entry) {
            return [
                'word' => $entry['word'] ?? $entry['punctuated_word'] ?? '',
                'normalized' => strtolower((string) preg_replace('/[^a-z0-9]/i', '', (string) ($entry['word'] ?? ''))),
                'start' => (float) ($entry['start'] ?? 0),
                'end' => (float) ($entry['end'] ?? 0),
            ];
        }, $transcript);

        $segmentStartTime = $segmentStartFrame / self::FPS;
        $segmentEndTime = $segmentEndFrame / self::FPS;

        $segmentTranscriptWords = array_values(array_filter(
            $transcriptNormalized,
            static fn ($w) => $w['start'] >= ($segmentStartTime - 0.5)
                && $w['start'] <= ($segmentEndTime + 0.5)
        ));

        if (empty($segmentTranscriptWords)) {
            return $this->equalDistributionFallback($subtitleText, $segmentStartFrame, $segmentEndFrame);
        }

        $result = [];
        $transcriptIndex = 0;

        foreach ($subtitleWords as $i => $subWord) {
            $subNorm = strtolower((string) preg_replace('/[^a-z0-9]/i', '', $subWord));
            $found = false;

            for ($j = $transcriptIndex; $j < count($segmentTranscriptWords); $j++) {
                if ($segmentTranscriptWords[$j]['normalized'] === $subNorm) {
                    $startFrame = (int) round($segmentTranscriptWords[$j]['start'] * self::FPS);
                    $nextStart = isset($segmentTranscriptWords[$j + 1])
                        ? (int) round($segmentTranscriptWords[$j + 1]['start'] * self::FPS)
                        : $segmentEndFrame;

                    $startFrame = max($segmentStartFrame, $startFrame);
                    $endFrame = min($segmentEndFrame, $nextStart);
                    if ($endFrame <= $startFrame) {
                        $endFrame = min($segmentEndFrame, $startFrame + 1);
                    }

                    $result[] = [
                        'word' => $subWord,
                        'start_frame' => $startFrame,
                        'end_frame' => $endFrame,
                    ];

                    $transcriptIndex = $j + 1;
                    $found = true;
                    break;
                }
            }

            if (!$found) {
                $prevEnd = !empty($result) ? (int) end($result)['end_frame'] : $segmentStartFrame;
                $remaining = count($subtitleWords) - $i;
                $framesLeft = max(0, $segmentEndFrame - $prevEnd);
                $frameWidth = $remaining > 0 ? (int) round($framesLeft / $remaining) : 0;

                $fallbackEnd = min($segmentEndFrame, $prevEnd + max(1, $frameWidth));
                $result[] = [
                    'word' => $subWord,
                    'start_frame' => $prevEnd,
                    'end_frame' => $fallbackEnd,
                ];
            }
        }

        return $this->normalizeWordFramesToSegment($result, $segmentStartFrame, $segmentEndFrame);
    }

    /**
     * Fallback: distribute words equally across the segment duration.
     * Used when transcript matching fails.
     */
    private function equalDistributionFallback(
        string $text,
        int $startFrame,
        int $endFrame
    ): array {
        $words = preg_split('/\s+/', trim($text));
        $words = array_values(array_filter($words, static fn ($w) => $w !== ''));

        if (empty($words)) {
            return [];
        }

        $totalFrames = max(0, $endFrame - $startFrame);
        $framesPerWord = $totalFrames > 0 ? $totalFrames / count($words) : 0;
        $result = [];

        foreach ($words as $i => $word) {
            $wStart = $startFrame + (int) round($i * $framesPerWord);
            $wEnd = $startFrame + (int) round(($i + 1) * $framesPerWord);
            $result[] = [
                'word' => $word,
                'start_frame' => $wStart,
                'end_frame' => min($endFrame, max($wStart + 1, $wEnd)),
            ];
        }

        return $this->normalizeWordFramesToSegment($result, $startFrame, $endFrame);
    }

    /**
     * Remotion progressive subtitle components consume word frames relative to
     * the subtitle segment Sequence (0..segmentDuration), not absolute timeline frames.
     */
    private function normalizeWordFramesToSegment(array $words, int $segmentStartFrame, int $segmentEndFrame): array
    {
        $segmentDuration = max(1, $segmentEndFrame - $segmentStartFrame);
        $normalized = [];

        foreach ($words as $index => $word) {
            $absStart = (int) ($word['start_frame'] ?? $segmentStartFrame);
            $absEnd = (int) ($word['end_frame'] ?? $absStart + 1);

            $localStart = max(0, min($segmentDuration - 1, $absStart - $segmentStartFrame));
            $localEnd = max($localStart + 1, min($segmentDuration, $absEnd - $segmentStartFrame));

            // Keep word intervals contiguous and non-overlapping.
            if (!empty($normalized)) {
                $prevEnd = $normalized[count($normalized) - 1]['end_frame'];
                if ($localStart < $prevEnd) {
                    $localStart = $prevEnd;
                }
                if ($localEnd <= $localStart) {
                    $localEnd = min($segmentDuration, $localStart + 1);
                }
            }

            $normalized[] = [
                'word' => (string) ($word['word'] ?? ''),
                'start_frame' => $localStart,
                'end_frame' => $localEnd,
            ];

            if ($normalized[$index]['end_frame'] >= $segmentDuration) {
                $normalized[$index]['end_frame'] = $segmentDuration;
            }
        }

        if (!empty($normalized)) {
            $normalized[0]['start_frame'] = 0;
            $last = count($normalized) - 1;
            $normalized[$last]['end_frame'] = $segmentDuration;
        }

        return $normalized;
    }

    private function buildAudioTrack(Project $project, int $totalFrames): array
    {
        $track = [];

        $voiceoverUrl = $project->voiceover_url
            ?? $project->voiceover_file
            ?? null;

        // Ensure voiceover URL is absolute so the browser Player can load it
        if ($voiceoverUrl && !str_starts_with($voiceoverUrl, 'http')) {
            // It's a relative path — convert to full storage URL
            $voiceoverUrl = asset('storage/' . ltrim($voiceoverUrl, '/'));
            // If that doesn't work try direct asset URL
            if (!str_starts_with($voiceoverUrl, 'http')) {
                $voiceoverUrl = url($voiceoverUrl);
            }
        }

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

    private function calcTotalFrames(array $videoTrack, array $subtitleTrack, ?Project $project = null): int
    {
        $lastVideoFrame = empty($videoTrack)
            ? 0
            : max(array_column($videoTrack, 'end_frame'));

        $lastSubtitleFrame = empty($subtitleTrack)
            ? 0
            : max(array_column($subtitleTrack, 'end_frame'));

        // Use actual voiceover duration from Deepgram transcript as the floor
        $transcriptFrame = 0;
        if ($project && !empty($project->voiceover_transcript)) {
            $transcript = $project->voiceover_transcript;
            $lastWord = end($transcript);
            if (!empty($lastWord['end'])) {
                $transcriptFrame = (int) ceil($lastWord['end'] * self::FPS);
            }
        }

        return max($lastVideoFrame, $lastSubtitleFrame, $transcriptFrame, 1);
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
