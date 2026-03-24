<?php

namespace App\Services\Agent;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class IntentClassifier
{
    public function classify(string $message, array $editState): array
    {
        // Ensure message is always a string
        $message = (string) $message;
        $message = trim($message);

        // Prefer AI classification first so chat behaves naturally.
        // Local regex rules are used as a reliability fallback only.
        $aiResult = $this->classifyWithOpenRouter($message, $editState);
        if (empty($aiResult['_failed'])) {
            return $aiResult;
        }

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

        return [
            'tool' => null,
            'agent_reply' => 'I had trouble understanding that. Try commands like "use fade transition" or "set style to tiktok trending".',
            '_source' => 'fallback',
        ];
    }

    private function classifyWithOpenRouter(string $message, array $editState): array
    {

        $currentStyle = $editState['tracks']['subtitles'][0]['style'] ?? 'default';
        $currentFontSize = $editState['tracks']['subtitles'][0]['config']['fontSize'] ?? '44px';
        $currentTransition = $editState['tracks']['video'][0]['transition_out']['type'] ?? 'none';
        $clipIds = implode(', ', array_column($editState['tracks']['video'] ?? [], 'id'));
        $hasMusicTrack = !empty(array_filter(
            $editState['tracks']['audio'] ?? [],
            fn($a) => ($a['type'] ?? '') === 'music'
        ));

        $prompt = <<<PROMPT
    You are the AI editing agent for the VidsAI project.
    Your job is to either:
    1) return a valid tool call for actionable edit requests, or
    2) return a helpful direct answer for informational/casual messages.

    Output must be a SINGLE valid JSON object with no markdown and no extra text.

TOOLS:
1. set_subtitle_style - params: { "style": one of [progressive_highlight, tiktok_trending, arabic_banner, rectangular, rounded_progressive, rectangular_banner, default] }
2. set_transition - params: { "type": one of [fade, zoom-in, zoom-out, slide-left, slide-right, slide-up, slide-down, none], "duration_frames": integer optional }
3. set_music - params: { "url": string or null, "volume": 0.0-1.0 optional }
4. set_volume - params: { "track": "voiceover" or "music", "volume": 0.0-1.0 }
5. reorder_scenes - params: { "order": [array of clip IDs in new order] }
6. update_subtitle_config - params: { "config": { "fontSize": "48px", "backgroundColor": "#hex", "textColor": "#hex", "fontFamily": "Roboto", "position": "top|bottom|center", "borderRadius": "8px", "opacity": 0.0-1.0 }, "scene_id": optional }

CURRENT STATE:
- Subtitle style: {$currentStyle}
- Subtitle font size: {$currentFontSize}
- Transition: {$currentTransition}
- Has music: {$hasMusicTrack}
- Clip IDs available: {$clipIds}

USER: "{$message}"

Decision rules:
- If the user asks to change/edit/update/move/set/use/increase/decrease/add/remove anything in the video, return tool != null.
- Treat "subtitle", "subtitles", "caption", "captions", and "subs" as the same domain.
- If user gives explicit subtitle size (example: 70px), use update_subtitle_config with params.config.fontSize.
- If user asks to make subtitles bigger/smaller without numeric size, still use update_subtitle_config and set fontSize fallback value.
- If user asks a question (example: current subtitle size, capabilities, greeting), return tool as null and provide a direct answer.

Strict output schema:
{"tool":"<name_or_null>","params":{},"confidence":0.0,"agent_reply":"..."}

Output constraints:
- Always include keys: tool, params, confidence, agent_reply.
- When tool is null, params must be {}.
- confidence must be a number between 0 and 1.
- No markdown, no code fences, no explanation outside JSON.

Examples:
- "hi" -> {"tool":null,"params":{},"confidence":0.98,"agent_reply":"Hey! Ready to help edit your video. What would you like to change?"}
- "use tiktok subtitles" -> {"tool":"set_subtitle_style","params":{"style":"tiktok_trending"},"confidence":0.95,"agent_reply":"Done - switched to TikTok trending subtitles."}
- "make captions 70px" -> {"tool":"update_subtitle_config","params":{"config":{"fontSize":"70px"}},"confidence":0.96,"agent_reply":"Set caption size to 70px."}
- "what is the size of the subtitles" -> {"tool":null,"params":{},"confidence":0.91,"agent_reply":"Current subtitle size is {$currentFontSize}."}

No markdown, no explanation. JSON only.
PROMPT;

        try {
            $apiKey = trim((string) config('services.openrouter.api_key'));
            $models = config('services.openrouter.models', []);
            $candidateModels = [];

            if (is_array($models)) {
                foreach ($models as $candidate) {
                    $candidate = trim((string) $candidate);
                    if ($candidate !== '') {
                        $candidateModels[] = $candidate;
                    }
                }
            }

            // Safety net: keep a real rotation even if env provides only one model.
            $candidateModels = array_merge($candidateModels, [
                'arcee-ai/trinity-large-preview:free',
                'google/gemma-3n-e4b-it:free',
                'google/gemma-3-4b-it:free',
                'google/gemma-3-12b-it:free',
            ]);

            $candidateModels = array_values(array_unique($candidateModels));

            if ($apiKey === '') {
                return [
                    'tool' => null,
                    'agent_reply' => 'OpenRouter API key is missing. I can still help with explicit style/transition/volume commands.',
                    '_source' => 'openrouter',
                    '_failed' => true,
                ];
            }

            if (empty($candidateModels)) {
                return [
                    'tool' => null,
                    'agent_reply' => 'OpenRouter model is not configured. I can still help with explicit style/transition/volume commands.',
                    '_source' => 'openrouter',
                    '_failed' => true,
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

            $baseUrl = (string) config('services.openrouter.base_url', 'https://openrouter.ai/api/v1/chat/completions');
            $lastError = null;

            $firstModel = array_shift($candidateModels);

            // 1) Try first OpenRouter model
            if ($firstModel !== null) {
                $firstResult = $this->tryOpenRouterModel($http, $baseUrl, $firstModel, $prompt, $message);
                if ($firstResult !== null) {
                    return $firstResult;
                }
                $lastError = 'FIRST_MODEL_FAILED';
            }

            // 2) Try Groq fallback before other OpenRouter models
            $groqResult = $this->tryGroqModel($prompt, $message);
            if ($groqResult !== null) {
                return $groqResult;
            }

            // 3) Try remaining OpenRouter models
            foreach ($candidateModels as $model) {
                $result = $this->tryOpenRouterModel($http, $baseUrl, $model, $prompt, $message);
                if ($result !== null) {
                    return $result;
                }
                $lastError = 'FALLBACK_MODEL_FAILED';
            }

            Log::warning('[IntentClassifier] All OpenRouter models failed', [
                'models' => array_values(array_filter(array_merge([$firstModel], $candidateModels))),
                'last_error' => $lastError,
            ]);

            return [
                'tool' => null,
                'agent_reply' => 'I had trouble understanding that. Try commands like "use fade transition" or "set style to tiktok trending".',
                '_source' => 'openrouter',
                '_failed' => true,
            ];
        } catch (\Exception $e) {
            Log::error('[IntentClassifier] Error: ' . $e->getMessage());
            return [
                'tool' => null,
                'agent_reply' => 'Something went wrong. Please try again.',
                '_source' => 'openrouter',
                '_failed' => true,
            ];
        }
    }

    private function tryOpenRouterModel($http, string $baseUrl, string $model, string $prompt, string $message): ?array
    {
        $response = $http->post(
            $baseUrl,
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
            Log::warning('[IntentClassifier] OpenRouter request failed, trying fallback', [
                'model' => $model,
                'status' => $response->status(),
                'body' => substr((string) $response->body(), 0, 400),
            ]);
            return null;
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
            Log::warning('[IntentClassifier] OpenRouter bad JSON, trying fallback', [
                'model' => $model,
                'text' => substr($text, 0, 400),
            ]);
            return null;
        }

        Log::info('[IntentClassifier] Result', [
            'message' => $message,
            'tool' => $result['tool'] ?? null,
            'model' => $model,
        ]);

        if (!isset($result['_source'])) {
            $result['_source'] = 'openrouter';
        }
        $result['_model'] = $model;

        if (($result['tool'] ?? null) === null && $this->looksLikeEditingCommand($message)) {
            Log::warning('[IntentClassifier] OpenRouter returned no tool for command-like input, trying fallback', [
                'model' => $model,
                'message' => $message,
            ]);
            return null;
        }

        return $result;
    }

    private function tryGroqModel(string $prompt, string $message): ?array
    {
        $apiKey = trim((string) config('services.groq.api_key'));
        $model = trim((string) config('services.groq.model', 'llama-3.1-8b-instant'));
        $baseUrl = trim((string) config('services.groq.base_url', 'https://api.groq.com/openai/v1/chat/completions'));

        if ($apiKey === '' || $model === '' || $baseUrl === '') {
            return null;
        }

        $http = Http::withHeaders(['Content-Type' => 'application/json'])
            ->withHeaders([
                'Authorization' => 'Bearer ' . $apiKey,
            ])
            ->timeout(15);

        if (app()->environment(['local', 'staging'])) {
            $http = $http->withOptions(['verify' => false]);
        }

        $response = $http->post(
            $baseUrl,
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
            Log::warning('[IntentClassifier] Groq request failed, trying fallback', [
                'model' => $model,
                'status' => $response->status(),
                'body' => substr((string) $response->body(), 0, 400),
            ]);
            return null;
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
            Log::warning('[IntentClassifier] Groq bad JSON, trying fallback', [
                'model' => $model,
                'text' => substr($text, 0, 400),
            ]);
            return null;
        }

        Log::info('[IntentClassifier] Result', [
            'message' => $message,
            'tool' => $result['tool'] ?? null,
            'model' => $model,
            'provider' => 'groq',
        ]);

        if (!isset($result['_source'])) {
            $result['_source'] = 'groq';
        }
        $result['_model'] = $model;

        if (($result['tool'] ?? null) === null && $this->looksLikeEditingCommand($message)) {
            Log::warning('[IntentClassifier] Groq returned no tool for command-like input, trying fallback', [
                'model' => $model,
                'message' => $message,
            ]);
            return null;
        }

        return $result;
    }

    private function looksLikeEditingCommand(string $message): bool
    {
        return (bool) preg_match(
            '/\b(make|set|change|increase|decrease|lower|raise|move|use|add|remove|bigger|smaller|caption|captions|subtitle|subtitles|subs|transition|music|volume|font|size|px)\b/i',
            (string) $message
        );
    }

    private function matchInformationalReply(string $message): ?string
    {
        $message = (string) $message;

        $infoPatterns = [
            '/^(hi|hello|hey|sup|yo|bonjour|salut|hola)[\s!.]*$/i' =>
                'Hey! Ready to help edit your video. What would you like to change?',
            '/^(yes|no|ok|okay|sure|thanks|thank you|merci|شكرا)[\s!.]*$/i' =>
                'Got it! Let me know what you\'d like to adjust in the video.',
            '/\bmy name is\b/i' =>
                'Nice to meet you! Tell me what you want to edit and I will handle it.',
            '/are you (an? )?ai|are you (a )?bot|are you real|who are you|\bare\s+an\s+ai\b|\bare\s+ai\b/i' =>
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
        $message = (string) $message;
        $m = strtolower(trim((string) $message));

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
            if ((str_contains((string) $m, 'subtitle') || str_contains((string) $m, 'style')) && str_contains((string) $m, $needle)) {
                return [
                    'tool' => 'set_subtitle_style',
                    'params' => ['style' => $style],
                    'confidence' => 0.96,
                    'agent_reply' => 'Updated subtitle style.',
                ];
            }
        }

        // Subtitle position
        if (preg_match('/subtitle.*top|move.*subtitle.*top|put.*subtitle.*top/i', $message)) {
            return [
                'tool' => 'update_subtitle_config',
                'params' => ['config' => ['position' => 'top']],
                'confidence' => 0.95,
                'agent_reply' => 'Moved subtitles to the top.',
            ];
        }
        if (preg_match('/subtitle.*bottom|move.*subtitle.*bottom|put.*subtitle.*bottom/i', $message)) {
            return [
                'tool' => 'update_subtitle_config',
                'params' => ['config' => ['position' => 'bottom']],
                'confidence' => 0.95,
                'agent_reply' => 'Moved subtitles to the bottom.',
            ];
        }
        if (preg_match('/subtitle.*center|move.*subtitle.*center|subtitle.*middle/i', $message)) {
            return [
                'tool' => 'update_subtitle_config',
                'params' => ['config' => ['position' => 'center']],
                'confidence' => 0.95,
                'agent_reply' => 'Moved subtitles to the center.',
            ];
        }

        // Subtitle size info query (fallback when AI provider is unavailable)
        if (preg_match('/what.*(size|font\s*size).*(subtitle|subtitles|caption|captions|subs)|\b(size|font\s*size)\b.*\b(subtitle|subtitles|caption|captions|subs)\b/i', $message)) {
            $currentSize = '44px';
            if (!empty($editState['tracks']['subtitles'][0]['config']['fontSize'])) {
                $currentSize = (string) $editState['tracks']['subtitles'][0]['config']['fontSize'];
            }

            return [
                'tool' => null,
                'confidence' => 0.9,
                'agent_reply' => "Current subtitle size is {$currentSize}.",
            ];
        }

        // Subtitle font size
        if (preg_match('/bigger|larger|increase.*size|size.*up|more.*visible/i', $message) &&
            preg_match('/subtitle|subtitles|subs|caption|captions/i', $message)) {
            return [
                'tool' => 'update_subtitle_config',
                'params' => ['config' => ['fontSize' => '44px'], 'size_direction' => 'bigger'],
                'confidence' => 0.92,
                'agent_reply' => 'Making subtitles bigger.',
            ];
        }
        if (preg_match('/smaller|reduce.*size|size.*down|less.*visible/i', $message) &&
            preg_match('/subtitle|subtitles|subs|caption|captions/i', $message)) {
            return [
                'tool' => 'update_subtitle_config',
                'params' => ['config' => ['fontSize' => '28px'], 'size_direction' => 'smaller'],
                'confidence' => 0.92,
                'agent_reply' => 'Making subtitles smaller.',
            ];
        }
        if (preg_match('/\b(subtitle|subtitles|caption|captions|subs)\b/i', $message) &&
            preg_match('/\b(\d{1,3})\s*px?\b/i', $message, $matches)) {
            $rawSize = (int) ($matches[1] ?? 44);
            $rawSize = max(16, min(120, $rawSize));
            $size = $rawSize . 'px';
            return [
                'tool' => 'update_subtitle_config',
                'params' => ['config' => ['fontSize' => $size]],
                'confidence' => 0.93,
                'agent_reply' => "Set subtitle font size to {$size}.",
            ];
        }

        // Transition intents
        $transitionTypes = ['fade', 'zoom-in', 'zoom-out', 'slide-left', 'slide-right', 'slide-up', 'slide-down', 'none'];
        if (str_contains((string) $m, 'transition')) {
            foreach ($transitionTypes as $type) {
                if (str_contains((string) $m, $type) || ($type === 'fade' && preg_match('/\bfade\b/', (string) $m))) {
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
        if (str_contains((string) $m, 'volume') || str_contains((string) $m, 'louder') || str_contains((string) $m, 'quieter')) {
            $track = str_contains((string) $m, 'music') ? 'music' : 'voiceover';

            $volume = null;
            if (preg_match('/(\d+(?:\.\d+)?)\s*%/', (string) $m, $pctMatch)) {
                $volume = max(0.0, min(1.0, ((float) $pctMatch[1]) / 100.0));
            } elseif (preg_match('/(\d+(?:\.\d+)?)\s*percent/', (string) $m, $pctWordMatch)) {
                $volume = max(0.0, min(1.0, ((float) $pctWordMatch[1]) / 100.0));
            } elseif (preg_match('/(\d(?:\.\d+)?)/', (string) $m, $numMatch) && str_contains((string) $m, 'volume')) {
                $volume = max(0.0, min(1.0, (float) $numMatch[1]));
            } elseif (str_contains((string) $m, 'louder') || str_contains((string) $m, 'increase')) {
                $volume = 0.8;
            } elseif (str_contains((string) $m, 'quieter') || str_contains((string) $m, 'lower') || str_contains((string) $m, 'decrease')) {
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

        if (str_contains((string) $m, 'remove music') || str_contains((string) $m, 'no music')) {
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
