<?php

namespace App\Services\Agent;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class IntentClassifier
{
    public function classify(string $message, array $editState): array
    {
        $localMatch = $this->classifyLocally($message, $editState);
        if ($localMatch !== null) {
            return $localMatch;
        }

        $currentStyle = $editState['tracks']['subtitles'][0]['style'] ?? 'default';
        $currentTransition = $editState['tracks']['video'][0]['transition_out']['type'] ?? 'none';
        $clipIds = implode(', ', array_column($editState['tracks']['video'] ?? [], 'id'));
        $hasMusicTrack = !empty(array_filter(
            $editState['tracks']['audio'] ?? [],
            fn($a) => ($a['type'] ?? '') === 'music'
        ));

        $prompt = <<<PROMPT
You are a video editing assistant. Classify this message into a tool call.

TOOLS:
1. set_subtitle_style - params: { "style": one of [progressive_highlight, tiktok_trending, arabic_banner, rectangular, rounded_progressive, rectangular_banner, default] }
2. set_transition - params: { "type": one of [fade, zoom-in, zoom-out, slide-left, slide-right, slide-up, slide-down, none], "duration_frames": integer optional }
3. set_music - params: { "url": string or null, "volume": 0.0-1.0 optional }
4. set_volume - params: { "track": "voiceover" or "music", "volume": 0.0-1.0 }
5. reorder_scenes - params: { "order": [array of clip IDs in new order] }

CURRENT STATE:
- Subtitle style: {$currentStyle}
- Transition: {$currentTransition}
- Has music: {$hasMusicTrack}
- Clip IDs available: {$clipIds}

USER: "{$message}"

Respond ONLY with JSON:
- If actionable with confidence >= 0.7: {"tool":"<name>","params":{...},"confidence":0.0-1.0,"agent_reply":"<brief confirmation>"}
- If not actionable: {"tool":null,"agent_reply":"<helpful message explaining what you can change>"}

No markdown, no explanation. JSON only.
PROMPT;

        try {
            $apiKey = (string) config('services.gemini.api_key');
            $baseUrl = (string) config('services.gemini.base_url', 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent');

            if ($apiKey === '') {
                return [
                    'tool' => null,
                    'agent_reply' => 'Gemini API key is missing. I can still help with explicit style/transition/volume commands.',
                ];
            }

            $endpoint = str_contains($baseUrl, '?key=')
                ? $baseUrl
                : $baseUrl . '?key=' . $apiKey;

            $request = Http::withHeaders(['Content-Type' => 'application/json'])
                ->timeout(15);

            // Laragon local environments may have SSL CA issues; disable verify locally only.
            if (app()->environment(['local', 'staging'])) {
                $request = $request->withOptions(['verify' => false]);
            }

            $response = $request->post($endpoint, [
                'contents' => [['parts' => [['text' => $prompt]]]],
                'generationConfig' => ['temperature' => 0.1, 'maxOutputTokens' => 300],
            ]);

            $text = $response->json('candidates.0.content.parts.0.text') ?? '';
            $text = trim((string) preg_replace('/```json\s*|\s*```/', '', $text));
            $result = json_decode($text, true);

            if (!is_array($result)) {
                Log::warning('[IntentClassifier] Bad response', ['text' => $text]);
                return [
                    'tool' => null,
                    'agent_reply' => 'I had trouble understanding that. Try commands like "use fade transition" or "set style to tiktok trending".',
                ];
            }

            Log::info('[IntentClassifier] Result', [
                'message' => $message,
                'tool' => $result['tool'] ?? null,
            ]);

            return $result;
        } catch (\Exception $e) {
            Log::error('[IntentClassifier] Error: ' . $e->getMessage());
            return ['tool' => null, 'agent_reply' => 'Something went wrong. Please try again.'];
        }
    }

    private function classifyLocally(string $message, array $editState): ?array
    {
        $m = strtolower(trim($message));

        // Subtitle style intents
        $styleMap = [
            'progressive highlight' => 'progressive_highlight',
            'tiktok trending' => 'tiktok_trending',
            'arabic banner' => 'arabic_banner',
            'rounded progressive' => 'rounded_progressive',
            'rectangular banner' => 'rectangular_banner',
            'rectangular' => 'rectangular',
            'default' => 'default',
        ];
        foreach ($styleMap as $needle => $style) {
            if ((str_contains($m, 'subtitle') || str_contains($m, 'style')) && str_contains($m, $needle)) {
                return [
                    'tool' => 'set_subtitle_style',
                    'params' => ['style' => $style],
                    'confidence' => 0.96,
                    'agent_reply' => 'Updated subtitle style.',
                ];
            }
        }

        // Transition intents
        $transitionTypes = ['fade', 'zoom-in', 'zoom-out', 'slide-left', 'slide-right', 'slide-up', 'slide-down', 'none'];
        if (str_contains($m, 'transition')) {
            foreach ($transitionTypes as $type) {
                if (str_contains($m, $type) || ($type === 'fade' && preg_match('/\bfade\b/', $m))) {
                    return [
                        'tool' => 'set_transition',
                        'params' => ['type' => $type],
                        'confidence' => 0.94,
                        'agent_reply' => 'Updated transitions.',
                    ];
                }
            }
        }

        // Volume intents
        if (str_contains($m, 'volume') || str_contains($m, 'louder') || str_contains($m, 'quieter')) {
            $track = str_contains($m, 'music') ? 'music' : 'voiceover';

            $volume = null;
            if (preg_match('/(\d+(?:\.\d+)?)\s*%/', $m, $pctMatch)) {
                $volume = max(0.0, min(1.0, ((float) $pctMatch[1]) / 100.0));
            } elseif (preg_match('/(\d+(?:\.\d+)?)\s*percent/', $m, $pctWordMatch)) {
                $volume = max(0.0, min(1.0, ((float) $pctWordMatch[1]) / 100.0));
            } elseif (preg_match('/(\d(?:\.\d+)?)/', $m, $numMatch) && str_contains($m, 'volume')) {
                $volume = max(0.0, min(1.0, (float) $numMatch[1]));
            } elseif (str_contains($m, 'louder') || str_contains($m, 'increase')) {
                $volume = 0.8;
            } elseif (str_contains($m, 'quieter') || str_contains($m, 'lower') || str_contains($m, 'decrease')) {
                $volume = 0.3;
            }

            if ($volume !== null) {
                return [
                    'tool' => 'set_volume',
                    'params' => ['track' => $track, 'volume' => $volume],
                    'confidence' => 0.95,
                    'agent_reply' => 'Adjusted track volume.',
                ];
            }
        }

        // Music add/remove intents
        if (str_contains($m, 'remove music') || str_contains($m, 'no music')) {
            return [
                'tool' => 'set_music',
                'params' => ['url' => null],
                'confidence' => 0.92,
                'agent_reply' => 'Removed background music.',
            ];
        }

        return null;
    }
}
