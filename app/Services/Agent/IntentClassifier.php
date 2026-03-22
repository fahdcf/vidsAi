<?php

namespace App\Services\Agent;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class IntentClassifier
{
    public function classify(string $message, array $editState): array
    {
        $message = trim($message);

        $infoReply = $this->matchInformationalReply($message);
        if ($infoReply !== null) {
            return [
                'tool' => null,
                'agent_reply' => $infoReply,
                '_source' => 'local_info',
            ];
        }

        $localMatch = $this->classifyLocally($message, $editState);
        if ($localMatch !== null) {
            $localMatch['_source'] = 'local_tool';
            return $localMatch;
        }

        return $this->classifyWithOpenRouter($message, $editState);
    }

    private function classifyWithOpenRouter(string $message, array $editState): array
    {

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
- If the message is an editing command with confidence >= 0.7: {"tool":"<name>","params":{...},"confidence":0.0-1.0,"agent_reply":"<brief friendly confirmation>"}
- If the message is a question about the editor or what you can do: {"tool":null,"agent_reply":"<helpful direct answer>"}
- If the message is casual conversation (greetings, questions about you): {"tool":null,"agent_reply":"<short friendly reply, then offer to help with editing>"}
- Never say "I can help with subtitle styles, transitions..." as a generic fallback. Be natural and specific.

Examples:
- "hi" -> {"tool":null,"agent_reply":"Hey! Ready to make your video look great. What would you like to change?"}
- "say yes if you are ai" -> {"tool":null,"agent_reply":"Yes! I'm an AI video editor. Ask me to change subtitles, transitions, music or scene order."}
- "use tiktok subtitles" -> {"tool":"set_subtitle_style","params":{"style":"tiktok_trending"},"confidence":0.95,"agent_reply":"Done - switched to TikTok trending subtitles."}
- "make it more energetic" -> {"tool":"set_transition","params":{"type":"zoom-in"},"confidence":0.8,"agent_reply":"Added zoom-in transitions for more energy."}

No markdown, no explanation. JSON only.
PROMPT;

        try {
            $apiKey = trim((string) config('services.openrouter.api_key'));
            $models = config('services.openrouter.models', []);
            $model = null;

            if (is_array($models)) {
                foreach ($models as $candidate) {
                    $candidate = trim((string) $candidate);
                    if ($candidate !== '') {
                        $model = $candidate;
                        break;
                    }
                }
            }

            if ($apiKey === '') {
                return [
                    'tool' => null,
                    'agent_reply' => 'OpenRouter API key is missing. I can still help with explicit style/transition/volume commands.',
                ];
            }

            if ($model === null) {
                return [
                    'tool' => null,
                    'agent_reply' => 'OpenRouter model is not configured. I can still help with explicit style/transition/volume commands.',
                ];
            }

            $http = Http::withHeaders(['Content-Type' => 'application/json'])
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $apiKey,
                    'HTTP-Referer' => config('app.url'),
                    'X-Title' => config('app.name', 'VidsAI'),
                ])
                ->timeout(15);

            if (app()->environment(['local', 'staging'])) {
                $http = $http->withOptions(['verify' => false]);
            }

            $response = $http->post(
                (string) config('services.openrouter.base_url', 'https://openrouter.ai/api/v1/chat/completions'),
                [
                    'model' => $model,
                    'messages' => [
                        ['role' => 'user', 'content' => $prompt],
                    ],
                    'temperature' => 0.1,
                    'max_tokens' => 300,
                ]
            );

            if (!$response->successful()) {
                Log::warning('[IntentClassifier] OpenRouter request failed', [
                    'status' => $response->status(),
                    'body' => substr((string) $response->body(), 0, 400),
                ]);
                return [
                    'tool' => null,
                    'agent_reply' => 'I had trouble understanding that. Try commands like "use fade transition" or "set style to tiktok trending".',
                ];
            }

            $content = $response->json('choices.0.message.content');
            if (is_array($content)) {
                $chunks = [];
                foreach ($content as $item) {
                    if (is_array($item) && isset($item['text']) && is_string($item['text'])) {
                        $chunks[] = $item['text'];
                    } elseif (is_string($item)) {
                        $chunks[] = $item;
                    }
                }
                $content = implode("\n", $chunks);
            }

            $text = is_string($content) ? $content : '';
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

            if (!isset($result['_source'])) {
                $result['_source'] = 'openrouter';
            }

            return $result;
        } catch (\Exception $e) {
            Log::error('[IntentClassifier] Error: ' . $e->getMessage());
            return ['tool' => null, 'agent_reply' => 'Something went wrong. Please try again.'];
        }
    }

    private function matchInformationalReply(string $message): ?string
    {
        $infoPatterns = [
            '/^(hi|hello|hey|sup|yo|bonjour|salut|hola)[\s!.]*$/i' =>
                'Hey! Ready to help edit your video. What would you like to change?',
            '/^(yes|no|ok|okay|sure|thanks|thank you|merci|شكرا)[\s!.]*$/i' =>
                'Got it! Let me know what you\'d like to adjust in the video.',
            '/are you (an? )?ai|are you (a )?bot|are you real|who are you/i' =>
                'Yes, I\'m an AI video editor built into VidsAI. I can change subtitle styles, transitions, music volume, and scene order. What would you like to adjust?',
            '/what.*subtitle.*style|list.*subtitle|available.*style|subtitle.*option|subtitle.*style.*available/i' =>
                'Available subtitle styles: tiktok_trending, progressive_highlight, rounded_progressive, rectangular, rectangular_banner, arabic_banner, default. Try: "use tiktok trending subtitles".',
            '/what.*transition|list.*transition|available.*transition|transition.*option/i' =>
                'Available transitions: fade, zoom-in, zoom-out, slide-left, slide-right, slide-up, slide-down, none. Try: "use fade transitions".',
            '/what can you do|help|what.*command|how.*use|what.*say/i' =>
                'I can help with: subtitle style (tiktok_trending, progressive_highlight, etc.), transitions (fade, zoom-in, etc.), music volume, removing music. Just tell me what you want to change.',
        ];

        foreach ($infoPatterns as $pattern => $reply) {
            if (preg_match($pattern, $message)) {
                return $reply;
            }
        }

        return null;
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
        if (preg_match('/remove.*music|no music|without music|delete.*music|turn off.*music/i', $message)) {
            return [
                'tool'        => 'set_music',
                'params'      => ['url' => null],
                'confidence'  => 0.95,
                'agent_reply' => 'Removed background music.',
            ];
        }

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
