<?php

namespace App\Services\Agent;

use Illuminate\Support\Facades\Log;

/**
 * ToolRegistry - surgical edit tools for the AI agent.
 *
 * Each tool takes the current edit_state array and parameters,
 * applies a precise mutation, and returns the updated edit_state.
 *
 * Tools are pure functions - no side effects, no DB writes.
 * The caller is responsible for saving the result.
 */
class ToolRegistry
{
    public function getToolSchemas(): array
    {
        return [
            [
                'name' => 'set_subtitle_style',
                'description' => 'Change the subtitle style for all scenes or a specific scene.',
                'parameters' => [
                    'style' => ['type' => 'string', 'required' => true],
                    'scene_id' => ['type' => 'string', 'required' => false],
                ],
            ],
            [
                'name' => 'set_transition',
                'description' => 'Change the transition effect between scene clips.',
                'parameters' => [
                    'type' => ['type' => 'string', 'required' => true],
                    'duration_frames' => ['type' => 'integer', 'required' => false],
                    'clip_index' => ['type' => 'integer', 'required' => false],
                ],
            ],
            [
                'name' => 'set_music',
                'description' => 'Add, replace, or remove background music.',
                'parameters' => [
                    'url' => ['type' => 'string', 'required' => false],
                    'volume' => ['type' => 'number', 'required' => false],
                ],
            ],
            [
                'name' => 'set_volume',
                'description' => 'Adjust the volume of voiceover or music tracks.',
                'parameters' => [
                    'track' => ['type' => 'string', 'required' => true],
                    'volume' => ['type' => 'number', 'required' => true],
                ],
            ],
            [
                'name' => 'reorder_scenes',
                'description' => 'Change the order of scene clips in the video.',
                'parameters' => [
                    'order' => ['type' => 'array', 'required' => true],
                ],
            ],
        ];
    }

    public function execute(string $toolName, array $params, array $editState): array
    {
        Log::info('[ToolRegistry] Executing tool', [
            'tool' => $toolName,
            'params' => $params,
        ]);

        return match ($toolName) {
            'set_subtitle_style' => $this->setSubtitleStyle($params, $editState),
            'set_transition' => $this->setTransition($params, $editState),
            'set_music' => $this->setMusic($params, $editState),
            'set_volume' => $this->setVolume($params, $editState),
            'reorder_scenes' => $this->reorderScenes($params, $editState),
            default => throw new \InvalidArgumentException("Unknown tool: {$toolName}"),
        };
    }

    private function setSubtitleStyle(array $params, array $editState): array
    {
        $style = $params['style'] ?? 'default';
        $sceneId = $params['scene_id'] ?? null;

        $validStyles = [
            'progressive_highlight', 'tiktok_trending', 'arabic_banner',
            'rectangular', 'rounded_progressive', 'rectangular_banner', 'default',
        ];

        if (!in_array($style, $validStyles, true)) {
            throw new \InvalidArgumentException("Invalid subtitle style: {$style}");
        }

        $editState['tracks']['subtitles'] = array_map(
            function ($sub) use ($style, $sceneId) {
                if ($sceneId === null || ($sub['id'] ?? '') === $sceneId) {
                    $sub['style'] = $style;
                }
                return $sub;
            },
            $editState['tracks']['subtitles'] ?? []
        );

        return $this->bumpVersion($editState);
    }

    private function setTransition(array $params, array $editState): array
    {
        $type = $params['type'] ?? 'fade';
        $durationFrames = (int) ($params['duration_frames'] ?? 15);
        $clipIndex = isset($params['clip_index']) ? (int) $params['clip_index'] : null;

        $validTypes = [
            'fade', 'zoom-in', 'zoom-out',
            'slide-left', 'slide-right', 'slide-up', 'slide-down', 'none',
        ];

        if (!in_array($type, $validTypes, true)) {
            throw new \InvalidArgumentException("Invalid transition type: {$type}");
        }

        $clips = $editState['tracks']['video'] ?? [];

        foreach ($clips as $i => &$clip) {
            if ($i >= count($clips) - 1) {
                $clip['transition_out'] = null;
                continue;
            }
            if ($clipIndex === null || $clipIndex === $i) {
                $clip['transition_out'] = $type === 'none' ? null : [
                    'type' => $type,
                    'duration_frames' => $durationFrames,
                ];
            }
        }
        unset($clip);

        $editState['tracks']['video'] = $clips;

        return $this->bumpVersion($editState);
    }

    private function setMusic(array $params, array $editState): array
    {
        $url = $params['url'] ?? null;
        $volume = (float) ($params['volume'] ?? 0.3);

        $editState['tracks']['audio'] = array_values(array_filter(
            $editState['tracks']['audio'] ?? [],
            fn($t) => ($t['type'] ?? '') !== 'music'
        ));

        if ($url) {
            $editState['tracks']['audio'][] = [
                'id' => 'music',
                'url' => $url,
                'type' => 'music',
                'start_frame' => 0,
                'end_frame' => $editState['total_frames'] ?? 300,
                'volume' => $volume,
                'fade_in_frames' => 15,
                'fade_out_frames' => 15,
            ];
        }

        return $this->bumpVersion($editState);
    }

    private function setVolume(array $params, array $editState): array
    {
        $track = $params['track'] ?? 'voiceover';
        $volume = max(0.0, min(1.0, (float) ($params['volume'] ?? 1.0)));

        if (!in_array($track, ['voiceover', 'music'], true)) {
            throw new \InvalidArgumentException("Invalid track: {$track}");
        }

        $editState['tracks']['audio'] = array_map(
            function ($t) use ($track, $volume) {
                if (($t['type'] ?? '') === $track) {
                    $t['volume'] = $volume;
                }
                return $t;
            },
            $editState['tracks']['audio'] ?? []
        );

        return $this->bumpVersion($editState);
    }

    private function reorderScenes(array $params, array $editState): array
    {
        $newOrder = $params['order'] ?? [];

        if (empty($newOrder)) {
            throw new \InvalidArgumentException('reorder_scenes requires a non-empty order array.');
        }

        $clips = $editState['tracks']['video'] ?? [];
        $clipsById = [];
        foreach ($clips as $clip) {
            $clipsById[$clip['id']] = $clip;
        }

        foreach ($newOrder as $id) {
            if (!isset($clipsById[$id])) {
                throw new \InvalidArgumentException("Unknown clip ID: {$id}");
            }
        }

        $reordered = [];
        $currentFrame = 0;

        foreach ($newOrder as $id) {
            $clip = $clipsById[$id];
            $duration = $clip['end_frame'] - $clip['start_frame'];
            $clip['start_frame'] = $currentFrame;
            $clip['end_frame'] = $currentFrame + $duration;
            $reordered[] = $clip;
            $currentFrame += $duration;
        }

        if (!empty($reordered)) {
            $reordered[count($reordered) - 1]['transition_out'] = null;
        }

        $editState['tracks']['video'] = $reordered;
        $editState['total_frames'] = $currentFrame;

        return $this->bumpVersion($editState);
    }

    private function bumpVersion(array $editState): array
    {
        $editState['version'] = ($editState['version'] ?? 1) + 1;
        $editState['metadata']['last_modified'] = now()->toISOString();
        return $editState;
    }
}
