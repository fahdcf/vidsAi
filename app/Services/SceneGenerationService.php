<?php

namespace App\Services;

use App\Models\Project;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class SceneGenerationService
{
    /**
     * Generate scenes from uploaded voiceover
     */
    public function generateScenesFromVoice(Project $project): array
    {
        try {
            $this->logToCustomFile('🎬 Starting scene generation from voice', [
                'project_id' => $project->id,
                'project_name' => $project->name,
                'project_language' => $project->language,
                'voiceover_file' => $project->voiceover_file,
                'custom_script' => $project->custom_script,
                'description' => $project->description,
                'script_length' => strlen($project->custom_script ?? $project->description),
                'script_first_100_chars' => substr($project->custom_script ?? $project->description, 0, 100),
                'script_last_100_chars' => substr($project->custom_script ?? $project->description, -100),
                'timestamp' => now()->toISOString()
            ]);

            Log::info('🎬 Starting scene generation from voice', [
                'project_id' => $project->id,
                'voiceover_file' => $project->voiceover_file
            ]);

            // Step 1: Get the script text
            $script = $project->custom_script ?? $project->description;
            
            $this->logToCustomFile('📝 Step 1: Script preparation', [
                'project_id' => $project->id,
                'script_source' => $project->custom_script ? 'custom_script' : 'description',
                'script_content' => $script,
                'script_length' => strlen($script),
                'script_language' => $project->language,
                'timestamp' => now()->toISOString()
            ]);

            // Step 2: Get the full path to the voiceover file
            $voiceoverFullPath = storage_path('app/public/' . $project->voiceover_file);
            
            $this->logToCustomFile('🎵 Step 2: Voiceover file preparation', [
                'project_id' => $project->id,
                'voiceover_file' => $project->voiceover_file,
                'full_path' => $voiceoverFullPath,
                'file_exists' => file_exists($voiceoverFullPath),
                'file_size' => file_exists($voiceoverFullPath) ? filesize($voiceoverFullPath) : 'N/A',
                'timestamp' => now()->toISOString()
            ]);

            if (!file_exists($voiceoverFullPath)) {
                Log::error('Voiceover file not found', ['path' => $voiceoverFullPath]);
                throw new \Exception('Voiceover file not found');
            }

            // Step 3: Obtain timings
            $transcriptData = null;
            $isArabic = strtolower($project->language) === 'arabic' || strtolower($project->language) === 'ar';

            if ($isArabic) {
                // Prefer Aeneas forced alignment first for Arabic
                $this->logToCustomFile('🧭 Step 3: Trying Aeneas alignment first (Arabic)', [
                    'project_id' => $project->id,
                    'audio_path' => $voiceoverFullPath,
                    'language' => $project->language,
                    'timestamp' => now()->toISOString()
                ]);
                try {
                    $aligned = $this->attemptAeneasAlignment($voiceoverFullPath, $script, $project->language);
                    if (is_array($aligned) && count($aligned['words'] ?? []) > 0) {
                        $transcriptData = $aligned;
                        $this->logToCustomFile('✅ Aeneas alignment succeeded (Arabic)', [
                            'words_count' => count($aligned['words'])
                        ]);
                    }
                } catch (\Throwable $e) {
                    $this->logToCustomFile('⚠️ Aeneas alignment threw; will try Deepgram next', [
                        'error' => $e->getMessage()
                    ]);
                }
            }

            if ($transcriptData === null) {
                // Fallback or non-Arabic: Transcribe audio using Deepgram
                $this->logToCustomFile('🎤 Step 3: Starting audio transcription', [
                    'project_id' => $project->id,
                    'audio_path' => $voiceoverFullPath,
                    'language' => $project->language,
                    'deepgram_url' => config('services.deepgram.base_url'),
                    'deepgram_api_key_length' => strlen(config('services.deepgram.api_key')),
                    'timestamp' => now()->toISOString()
                ]);
                $transcriptData = $this->transcribeAudio($voiceoverFullPath, $project->language);
            }

            // Avoid passing by reference to end() on expression
            $transcriptWords = $transcriptData['words'] ?? [];
            $lastTranscriptWord = is_array($transcriptWords) && count($transcriptWords) > 0
                ? $transcriptWords[count($transcriptWords) - 1]
                : null;

            $this->logToCustomFile('📊 Step 3 completed: Transcription results', [
                'project_id' => $project->id,
                'transcript_data_type' => gettype($transcriptData),
                'transcript_keys' => array_keys($transcriptData),
                'words_count' => count($transcriptWords),
                'first_word' => $transcriptWords[0] ?? null,
                'last_word' => $lastTranscriptWord,
                'timestamp' => now()->toISOString()
            ]);

            // Step 4: Generate scene phrases using Gemini
            $this->logToCustomFile('🤖 Step 4: Starting scene generation with Gemini', [
                'project_id' => $project->id,
                'script' => $script,
                'transcript_words_count' => count($transcriptData['words'] ?? []),
                'language' => $project->language,
                'gemini_url' => config('services.gemini.base_url'),
                'gemini_api_key_length' => strlen(config('services.gemini.api_key')),
                'timestamp' => now()->toISOString()
            ]);
            try {
                $sceneData = $this->generateScenePhrases($script, $transcriptData, $project->language);
            } catch (\Exception $e) {
                // If Gemini reports mismatch, retry using transcript text as script (voice-first fallback)
                if (stripos($e->getMessage(), 'Audio does not match script') !== false) {
                    $this->logToCustomFile('🔁 Gemini mismatch detected, retrying with transcript as script', [
                        'project_id' => $project->id,
                        'original_script_length' => strlen($script),
                        'transcript_text_length' => strlen($transcriptData['text'] ?? '')
                    ]);

                    $fallbackScript = $transcriptData['text'] ?? '';
                    if (!empty($fallbackScript)) {
                        $sceneData = $this->generateScenePhrases($fallbackScript, $transcriptData, $project->language);
                    } else {
                        // As last resort, generate from script only (empty words). Backfill durations.
                        $this->logToCustomFile('🪄 Script-only fallback: generating scenes without transcript', [
                            'project_id' => $project->id,
                            'script_length' => strlen($script)
                        ]);
                        $syntheticTiming = $this->estimateTimingWhenNoTranscript($voiceoverFullPath, $script);
                        $sceneData = $this->generateScenePhrases($script, $syntheticTiming, $project->language);
                    }
                } else {
                    throw $e;
                }
            }

            $this->logToCustomFile('📊 Step 4 completed: Scene generation results', [
                'project_id' => $project->id,
                'scene_data_type' => gettype($sceneData),
                'scene_data_keys' => array_keys($sceneData),
                'phrases_count' => count($sceneData['phrases'] ?? []),
                'subtitles_count' => count($sceneData['subtitles_script'] ?? []),
                'first_phrase' => $sceneData['phrases'][0] ?? null,
                'first_subtitle' => $sceneData['subtitles_script'][0] ?? null,
                'timestamp' => now()->toISOString()
            ]);

            // Step 5: Search videos for each phrase
            $this->logToCustomFile('🎬 Step 5: Starting video search with Pexels', [
                'project_id' => $project->id,
                'phrases_count' => count($sceneData['phrases'] ?? []),
                'pexels_url' => config('services.pexels.base_url'),
                'pexels_api_key_length' => strlen(config('services.pexels.api_key')),
                'timestamp' => now()->toISOString()
            ]);

            $videos = $this->searchVideosForPhrases($sceneData['phrases']);

            $this->logToCustomFile('📊 Step 5 completed: Video search results', [
                'project_id' => $project->id,
                'videos_type' => gettype($videos),
                'videos_count' => count($videos),
                'videos_is_array' => is_array($videos),
                'first_video' => is_array($videos) && count($videos) > 0 ? $videos[0] : null,
                'timestamp' => now()->toISOString()
            ]);

            // Step 6: Format final response
            $this->logToCustomFile('🔧 Step 6: Preparing final result', [
                'project_id' => $project->id,
                'videos_count' => count($videos),
                'transcript_words_count' => count($transcriptData['words'] ?? []),
                'subtitles_count' => count($sceneData['subtitles_script'] ?? []),
                'timestamp' => now()->toISOString()
            ]);

            $result = [
                'all_videos' => $videos,
                'voice_over_transcript' => $transcriptData['words'],
                'subtitles_script' => $sceneData['subtitles_script'],
                'total' => count($videos),
                'collected_at' => now()->toISOString()
            ];

            $this->logToCustomFile('✅ Scene generation completed successfully', [
                'project_id' => $project->id,
                'project_name' => $project->name,
                'project_language' => $project->language,
                'videos_count' => count($videos),
                'transcript_words_count' => count($transcriptData['words']),
                'subtitles_count' => count($sceneData['subtitles_script']),
                'result_keys' => array_keys($result),
                'final_memory_usage' => memory_get_usage(true),
                'final_memory_peak' => memory_get_peak_usage(true),
                'timestamp' => now()->toISOString()
            ]);

            Log::info('✅ Scene generation completed', [
                'project_id' => $project->id,
                'videos_count' => count($videos),
                'transcript_words' => count($transcriptData['words']),
                'subtitles_count' => count($sceneData['subtitles_script'])
            ]);

            return $result;

        } catch (\Exception $e) {
            $this->logToCustomFile('❌ Scene generation failed with exception', [
                'project_id' => $project->id,
                'project_name' => $project->name,
                'project_language' => $project->language,
                'error_message' => $e->getMessage(),
                'error_code' => $e->getCode(),
                'error_file' => $e->getFile(),
                'error_line' => $e->getLine(),
                'error_trace' => $e->getTraceAsString(),
                'memory_usage' => memory_get_usage(true),
                'memory_peak' => memory_get_peak_usage(true),
                'timestamp' => now()->toISOString()
            ]);

            Log::error('❌ Scene generation failed', [
                'project_id' => $project->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    /**
     * Transcribe audio using Deepgram
     */
    private function transcribeAudio(string $audioPath, string $language): array
    {
        try {
            Log::info('🎤 Transcribing audio with Deepgram', [
                'audio_path' => $audioPath,
                'language' => $language
            ]);

            $audioContent = file_get_contents($audioPath);
            // Prefer explicit audio/mpeg for .mp3 to match working direct tests
            $extension = strtolower(pathinfo($audioPath, PATHINFO_EXTENSION));
            $detectedMime = @mime_content_type($audioPath) ?: 'application/octet-stream';
            $mimeType = $extension === 'mp3' ? 'audio/mpeg' : $detectedMime;
            $languageCode = $this->mapLanguageCode($language);

            // Extra visibility in custom log
            $this->logToCustomFile('🎤 Deepgram request prepared', [
                'audio_path' => $audioPath,
                'mime_type' => $mimeType,
                'audio_size_bytes' => strlen($audioContent),
                'api_key_length' => strlen(config('services.deepgram.api_key'))
            ]);

            // Try primary API key first
            $response = $this->attemptTranscription($audioContent, $mimeType, $languageCode, config('services.deepgram.api_key'), 'primary');
            
            if (!$response->successful()) {
                Log::warning('❌ Primary API key failed, trying fallback', [
                    'primary_response' => $response->body(),
                    'status_code' => $response->status()
                ]);
                
                // Try fallback API key
                $response = $this->attemptTranscription($audioContent, $mimeType, $languageCode, config('services.deepgram.fallback_api_key'), 'fallback');
                
                if (!$response->successful()) {
                    throw new \Exception('Both primary and fallback Deepgram API keys failed. Last error: ' . $response->body());
                }
            }

            $data = $response->json();
            $transcript = $data['results']['channels'][0]['alternatives'][0] ?? null;

            // If transcript missing or empty, try alternate language (en <-> ar) before failing
            $transcriptText = $transcript['transcript'] ?? '';
            $transcriptWords = $transcript['words'] ?? [];
            if ((!$transcript) || ($transcriptText === '' && empty($transcriptWords))) {
                $alternateLanguage = $languageCode === 'en' ? 'ar' : 'en';
                $this->logToCustomFile('🔁 Deepgram returned empty transcript, retrying with alternate language', [
                    'original_language' => $languageCode,
                    'alternate_language' => $alternateLanguage
                ]);

                // Try alternate language with primary key
                $response = $this->attemptTranscription($audioContent, $mimeType, $alternateLanguage, config('services.deepgram.api_key'), 'primary');
                if (!$response->successful()) {
                    // Try alternate language with fallback key
                    $response = $this->attemptTranscription($audioContent, $mimeType, $alternateLanguage, config('services.deepgram.fallback_api_key'), 'fallback');
                }

                if ($response->successful()) {
                    $data = $response->json();
                    $transcript = $data['results']['channels'][0]['alternatives'][0] ?? null;
                    $transcriptText = $transcript['transcript'] ?? '';
                    $transcriptWords = $transcript['words'] ?? [];
                }
            }

            if (!$transcript || ($transcriptText === '' && empty($transcriptWords))) {
                // Try to recover from utterances (segment-level timings) if available
                $utterances = $data['results']['utterances'] ?? [];
                if (is_array($utterances) && count($utterances) > 0) {
                    $this->logToCustomFile('🧩 No words found; synthesizing timings from Deepgram utterances', [
                        'utterances_count' => count($utterances)
                    ]);
                    $synthetic = $this->synthesizeWordsFromUtterances($utterances);
                    if (count($synthetic['words']) > 0) {
                        return $synthetic;
                    }
                }

                // Return empty transcript to allow script-only fallback upstream
                $this->logToCustomFile('⚠️ Deepgram produced no transcript; returning empty for script-only fallback', []);
                return [
                    'text' => '',
                    'words' => []
                ];
            }

            Log::info('✅ Audio transcription completed', [
                'transcript_text' => $transcriptText,
                'words_count' => count($transcriptWords)
            ]);

            return [
                'text' => $transcriptText,
                'words' => $transcriptWords
            ];

        } catch (\Exception $e) {
            // Log to custom scene-generation log as well
            $this->logToCustomFile('❌ Audio transcription failed', [
                'error' => $e->getMessage(),
                'exception_class' => get_class($e)
            ]);
            Log::error('❌ Audio transcription failed', [
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Attempt transcription with a specific API key
     */
    private function attemptTranscription(string $audioContent, string $mimeType, string $languageCode, string $apiKey, string $keyType): \Illuminate\Http\Client\Response
    {
        Log::info("🎤 Attempting transcription with {$keyType} API key", [
            'api_key_length' => strlen($apiKey),
            'key_type' => $keyType
        ]);

        $deepgramUrl = rtrim(config('services.deepgram.base_url'), '/');
        // Enable auto language detection only; avoid translate to prevent 400 errors
        $params = [
            'smart_format' => 'true',
            'punctuate' => 'true',
            'detect_language' => 'true',
        ];
        $deepgramUrlWithParams = $deepgramUrl . '?' . http_build_query($params);

        return Http::withHeaders([
            'Authorization' => 'Token ' . $apiKey,
            'Content-Type' => $mimeType
        ])->withBody($audioContent, $mimeType)
        ->timeout(120) // 2 minutes timeout
        ->connectTimeout(10) // fail fast on connection issues
        ->retry(3, 1000) // Retry 3 times with 1 second delay
        ->withoutVerifying() // Disable SSL verification for local development
        ->withOptions([
            // Disable "Expect: 100-continue" which can cause long waits on some servers
            'expect' => false,
        ])
        ->post($deepgramUrlWithParams);
    }

    /**
     * Map language to Deepgram language code
     */
    private function mapLanguageCode(string $language): string
    {
        $languageMap = [
            'english' => 'en',
            'french' => 'fr',
            'spanish' => 'es',
            'german' => 'de',
            'italian' => 'it',
            'portuguese' => 'pt',
            'russian' => 'ru',
            'chinese' => 'zh',
            'japanese' => 'ja',
            'korean' => 'ko',
            'arabic' => 'ar',
            'hindi' => 'hi'
        ];

        return $languageMap[strtolower($language)] ?? 'en';
    }

    /**
     * Generate scene phrases using Gemini
     */
    private function generateScenePhrases(string $script, array $transcriptData, string $language): array
    {
        try {
            Log::info('🤖 Generating scene phrases with Gemini', [
                'script_length' => strlen($script),
                'transcript_words' => count($transcriptData['words'])
            ]);

            $prompt = $this->buildGeminiPrompt($script, $transcriptData, $language);

            $response = Http::withHeaders([
                'Content-Type' => 'application/json'
            ])->timeout(120) // 2 minutes timeout
            ->retry(3, 1000) // Retry 3 times with 1 second delay
            ->withoutVerifying() // Disable SSL verification for local development
            ->post(config('services.gemini.base_url') . '?key=' . config('services.gemini.api_key'), [
                'contents' => [
                    [
                        'role' => 'user',
                        'parts' => [
                            ['text' => $prompt]
                        ]
                    ]
                ]
            ]);

            if (!$response->successful()) {
                throw new \Exception('Gemini API request failed: ' . $response->body());
            }

            $data = $response->json();
            $rawText = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';

            // Parse the JSON response
            $rawText = preg_replace('/```json\s*|\s*```/s', '', $rawText);
            $parsed = json_decode($rawText, true);

            if (!$parsed || !isset($parsed['phrases']) || !is_array($parsed['phrases'])) {
                throw new \Exception('Invalid response format from Gemini: ' . $rawText);
            }

            Log::info('✅ Scene phrases generated', [
                'phrases_count' => count($parsed['phrases']),
                'subtitles_count' => count($parsed['subtitles_script'] ?? [])
            ]);

            return [
                'phrases' => $parsed['phrases'],
                'subtitles_script' => $parsed['subtitles_script'] ?? []
            ];

        } catch (\Exception $e) {
            $this->logToCustomFile('❌ Scene phrase generation failed', [
                'error' => $e->getMessage(),
                'exception_class' => get_class($e)
            ]);
            Log::error('❌ Scene phrase generation failed', [
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Build the prompt for Gemini
     */
    private function buildGeminiPrompt(string $script, array $transcriptData, string $language): string
    {
        $transcriptText = $transcriptData['text'] ?? '';
        $transcriptWords = json_encode($transcriptData['words'] ?? []);

        return "
You are given:
1. A promotional script.
2. A voice-over transcript with word-level timing (start, end, confidence).
3. The language of the script and transcript (e.g., 'en' for English, 'fr' for French').

### Your tasks:

1. Verify transcript matches script:
   - Small differences are acceptable.
   - If unrelated, respond **only** with:
     {\"error\": \"Audio does not match script.\"}

2. If they match:
   - Split the script into meaningful scene phrases.
   - Minimize splits—only break where it makes visual sense.
   - For lists (commas, \"and\"), split items individually.
   - Preserve exact wording.

3. For each phrase:
   - Generate **2–3 English keywords**.
   - Align words to transcript:
     - start_time = first matched word's start
     - end_time = last matched word's end
   - Adjust:
     - Extend each end_time up to the next start_time (include pauses).
     - First phrase: if start_time > 0, add that to duration_seconds (don't change start_time).
     - Last phrase: add exactly **2.0 seconds** to duration_seconds.
     - duration_seconds = end_time - start_time (+ adjustments), rounded to 1 decimal.

4. Validation:
   - Sum(duration_seconds) ≈ last transcript word's end + 2 seconds.

5. For each phrase:
   - Create a **prompt**: cinematic visual scene description (English).

6. **Also generate subtitles_script:**
   - A **global array** of short TikTok-style subtitle chunks.
   - Each chunk: **2–4 words**, meaningful, natural.
   - Example:
     \"Discover EcoSip, the reusable water bottle made from eco materials\"
     → [\"Discover EcoSip\", \"the reusable water bottle\", \"made from eco materials\"]
   - Avoid awkward breaks:
     ❌ [\"the reusable water\", \"bottle made from eco\", \"materials\"]
     ✅ [\"the reusable water bottle\", \"made from eco materials\"]

### OUTPUT FORMAT (return ONLY this):
{
  \"phrases\": [
    {
      \"phrase\": \"Discover EcoSip\",
      \"keywords\": [\"eco\", \"bottle\"],
      \"start_time\": 0.0,
      \"end_time\": 4.8,
      \"duration_seconds\": 4.8,
      \"prompt\": \"A cinematic scene...\",
      \"subtitles_script\": [\"Discover EcoSip\"]
    }
  ],
  \"subtitles_script\": [
    \"Discover EcoSip\",
    \"the reusable water bottle\",
    \"made from eco materials\"
  ]
}

NO explanations, NO code, NO markdown, just valid JSON.

Language: {$language}
Script: {$script}
Transcript Text: {$transcriptText}
Transcript Words: {$transcriptWords}
";
    }

    /**
     * Create synthetic word timings from Deepgram utterances when word-level data is unavailable.
     * Splits each utterance text into tokens and linearly distributes time across tokens.
     */
    private function synthesizeWordsFromUtterances(array $utterances): array
    {
        $words = [];
        $allTextParts = [];

        foreach ($utterances as $utt) {
            $uttText = (string)($utt['transcript'] ?? '');
            $uttStart = (float)($utt['start'] ?? 0.0);
            $uttEnd = (float)($utt['end'] ?? $uttStart);
            if ($uttText === '' || $uttEnd <= $uttStart) {
                continue;
            }

            $tokens = $this->tokenizeWords(trim($uttText));
            $tokenCount = count($tokens);
            if ($tokenCount === 0) {
                continue;
            }

            $segmentDuration = max(0.0, $uttEnd - $uttStart);
            $perToken = $segmentDuration / $tokenCount;
            $cursor = $uttStart;

            foreach ($tokens as $token) {
                if ($token === '') continue;
                $start = $cursor;
                $end = $cursor + $perToken;
                $words[] = [
                    'word' => $token,
                    'start' => round($start, 3),
                    'end' => round($end, 3),
                    'confidence' => 0.6,
                ];
                $cursor = $end;
                $allTextParts[] = $token;
            }
        }

        return [
            'text' => trim(implode(' ', $allTextParts)),
            'words' => $words,
        ];
    }

    /**
     * Search videos for each phrase using Pexels
     */
    private function searchVideosForPhrases(array $phrases): array
    {
        $videos = [];

        foreach ($phrases as $phrase) {
            try {
                Log::info('🔍 Searching video for phrase', [
                    'phrase' => $phrase['phrase'],
                    'keywords' => $phrase['keywords']
                ]);

                $videoData = $this->searchPexelsVideo($phrase['keywords']);
                
                if ($videoData) {
                    $videos[] = [
                        'phrase' => $phrase['phrase'],
                        'video_url' => $videoData['video_url'],
                        'keywords' => $phrase['keywords'],
                        'start_time' => $phrase['start_time'] ?? null,
                        'end_time' => $phrase['end_time'] ?? null,
                        'duration_seconds' => $videoData['duration_seconds'], // Use actual video duration from Pexels
                        'gemini_duration' => $phrase['duration_seconds'], // Store Gemini timing separately
                        'prompt' => $phrase['prompt'] ?? null,
                        'subtitles_script' => $phrase['subtitles_script'] ?? []
                    ];
                }

            } catch (\Exception $e) {
                Log::error('❌ Video search failed for phrase', [
                    'phrase' => $phrase['phrase'],
                    'error' => $e->getMessage()
                ]);
                // Continue with next phrase
            }
        }

        Log::info('✅ Video search completed', [
            'total_phrases' => count($phrases),
            'videos_found' => count($videos)
        ]);

        return $videos;
    }

    /**
     * Search for video on Pexels
     */
    private function searchPexelsVideo(array $keywords): ?array
    {
        try {
            $query = implode(' ', $keywords);

            $response = Http::withHeaders([
                'Authorization' => config('services.pexels.api_key')
            ])->timeout(60) // 1 minute timeout
            ->retry(3, 1000) // Retry 3 times with 1 second delay
            ->withoutVerifying() // Disable SSL verification for local development
            ->get(config('services.pexels.base_url'), [
                'query' => $query,
                'per_page' => 10,
                'orientation' => 'landscape'
            ]);

            if (!$response->successful()) {
                throw new \Exception('Pexels API request failed: ' . $response->body());
            }

            $data = $response->json();
            $videos = $data['videos'] ?? [];

            if (empty($videos)) {
                Log::warning('No videos found for keywords', ['keywords' => $keywords]);
                return null;
            }

            // Get the first video
            $video = $videos[0];
            $duration = $video['duration'] ?? 0;
            $isShortEnough = $duration <= 30;

            // Filter MP4 files only
            $mp4Files = array_filter($video['video_files'] ?? [], function($file) {
                return $file['file_type'] === 'video/mp4';
            });

            // Sort files by height (resolution) descending
            usort($mp4Files, function($a, $b) {
                return ($b['height'] ?? 0) - ($a['height'] ?? 0);
            });

            // Prefer 1080p or 720p if available and video is short
            $preferredFile = null;
            if ($isShortEnough) {
                foreach ($mp4Files as $file) {
                    if (in_array($file['height'], [1080, 720])) {
                        $preferredFile = $file;
                        break;
                    }
                }
            }

            // Use fallback if no HD or if video is too long
            $bestFile = $preferredFile ?? $mp4Files[0] ?? null;

            if (!$bestFile) {
                Log::warning('No suitable video file found', ['video_id' => $video['id'] ?? 'unknown']);
                return null;
            }

            return [
                'video_url' => $bestFile['link'],
                'resolution' => $bestFile['width'] . 'x' . $bestFile['height'],
                'duration_seconds' => $duration,
                'preview' => $video['image'],
                'quality_score' => ($bestFile['height'] >= 720 && $isShortEnough) ? "✔ Good (HD)" : "⚠ Acceptable",
                'height' => $bestFile['height'],
                'width' => $bestFile['width']
            ];

        } catch (\Exception $e) {
            Log::error('❌ Pexels video search failed', [
                'keywords' => $keywords,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Estimate total audio duration and produce synthetic word timings when transcript is empty.
     * Priority:
     * 1) ffprobe if available
     * 2) Deepgram duration hint from utterances if present (handled earlier)
     * 3) Text-based estimation (words per second)
     */
    private function estimateTimingWhenNoTranscript(string $audioFullPath, string $script): array
    {
        // Try Aeneas forced alignment first, if available
        try {
            $aeneas = $this->attemptAeneasAlignment($audioFullPath, $script, 'auto');
            if (is_array($aeneas) && isset($aeneas['words']) && count($aeneas['words']) > 0) {
                $this->logToCustomFile('🧭 Using Aeneas alignment fallback', [
                    'words_count' => count($aeneas['words'])
                ]);
                return $aeneas;
            }
        } catch (\Throwable $e) {
            $this->logToCustomFile('⚠️ Aeneas fallback failed, continuing with other strategies', [
                'error' => $e->getMessage()
            ]);
        }

        $durationSeconds = $this->probeAudioDuration($audioFullPath);
        if ($durationSeconds <= 0) {
            // fallback to text-based estimate: ~2.2 words/sec (≈130 wpm)
            $wordCount = str_word_count($script);
            $durationSeconds = max(6, round($wordCount / 2.2, 1));
        }

        // Build pseudo-words array aligned across full duration from script tokens
        $tokens = $this->tokenizeWords(trim($script));

        $words = [];
        if (count($tokens) > 0) {
            $perToken = $durationSeconds / count($tokens);
            $cursor = 0.0;
            foreach ($tokens as $token) {
                $start = $cursor;
                $end = $cursor + $perToken;
                $words[] = [
                    'word' => $token,
                    'start' => round($start, 3),
                    'end' => round($end, 3),
                    'confidence' => 0.3,
                ];
                $cursor = $end;
            }
        }

        $this->logToCustomFile('⏱️ Using synthetic timing due to missing transcript', [
            'script_word_count' => count($tokens),
            'estimated_duration_seconds' => $durationSeconds,
        ]);

        return [
            'text' => $script,
            'words' => $words,
        ];
    }

    /**
     * Attempt offline alignment using a local Python Aeneas runner script to obtain fragment timings,
     * then synthesize per-word timings. Returns ['text' => string, 'words' => array] or null if failed.
     */
    private function attemptAeneasAlignment(string $audioFullPath, string $script, string $language): ?array
    {
        // Feature flag
        $enabled = (bool) (config('services.aeneas.enabled') ?? true);
        if (!$enabled) {
            return null;
        }

        $python = (string) (config('services.aeneas.python_path') ?? 'python');
        $runner = (string) (config('services.aeneas.script_path') ?? base_path('scripts/aeneas_align.py'));
        if (!is_file($runner)) {
            return null;
        }

        // Prepare temp files
        $tmpDir = storage_path('app/tmp');
        if (!is_dir($tmpDir)) {
            @mkdir($tmpDir, 0775, true);
        }
        $token = uniqid('aeneas_', true);
        $textPath = $tmpDir . DIRECTORY_SEPARATOR . $token . '.txt';
        $outPath = $tmpDir . DIRECTORY_SEPARATOR . $token . '.json';
        file_put_contents($textPath, $script);

        $aeneasLang = $this->mapAeneasLanguageCode($language);

        // Build command; quote for spaces; capture stdout/stderr
        $cmd = escapeshellarg($python)
            . ' ' . escapeshellarg($runner)
            . ' --audio ' . escapeshellarg($audioFullPath)
            . ' --text ' . escapeshellarg($textPath)
            . ' --lang ' . escapeshellarg($aeneasLang)
            . ' --out ' . escapeshellarg($outPath)
            . ' 2>&1';

        $this->logToCustomFile('🐍 Running local Aeneas runner', [ 'cmd' => $cmd ]);
        $output = (string) @shell_exec($cmd);

        if (!file_exists($outPath)) {
            $this->logToCustomFile('❌ Aeneas local run produced no output file', [ 'runner_output' => mb_substr($output, 0, 2000) ]);
            @unlink($textPath);
            return null;
        }

        $json = json_decode((string) @file_get_contents($outPath), true);
        @unlink($textPath);
        // keep JSON for diagnostics

        if (!is_array($json) || !isset($json['fragments']) || !is_array($json['fragments'])) {
            $this->logToCustomFile('❌ Aeneas JSON invalid', [ 'runner_output' => mb_substr($output, 0, 1000) ]);
            return null;
        }

        // Convert fragments to per-word timings by distributing fragment duration across words
        $words = [];
        $allTokens = [];
        foreach ($json['fragments'] as $frag) {
            $begin = isset($frag['begin']) ? (float) $frag['begin'] : null;
            $end = isset($frag['end']) ? (float) $frag['end'] : null;
            $lines = $frag['lines'] ?? [];

            if ($begin === null || $end === null || $end <= $begin) {
                continue;
            }

            $fragText = trim(implode(' ', array_map('strval', $lines)));
            if ($fragText === '') {
                continue;
            }

            $tokens = $this->tokenizeWords($fragText);
            if (count($tokens) === 0) {
                continue;
            }

            $fragDuration = max(0.0, $end - $begin);
            // Length-weighted distribution for a bit more realism
            $lengths = array_map(fn($t) => max(1, mb_strlen($t)), $tokens);
            $lengthSum = array_sum($lengths);
            $cursor = $begin;
            foreach ($tokens as $idx => $tok) {
                $portion = $lengths[$idx] / ($lengthSum > 0 ? $lengthSum : count($tokens));
                $dur = $fragDuration * $portion;
                $start = $cursor;
                $endw = $cursor + $dur;
                $words[] = [
                    'word' => $tok,
                    'start' => round($start, 3),
                    'end' => round($endw, 3),
                    'confidence' => 0.7,
                ];
                $cursor = $endw;
                $allTokens[] = $tok;
            }
        }

        if (count($words) === 0) {
            return null;
        }

        // Clamp to actual audio duration if available
        $audioDuration = $this->probeAudioDuration($audioFullPath);
        if ($audioDuration > 0) {
            $words = $this->clampWordsToDuration($words, $audioDuration);
        }

        return [
            'text' => trim(implode(' ', $allTokens)),
            'words' => $words,
        ];
    }

    /**
     * Map application language to Aeneas 3-letter code.
     * Fallback to 'eng' if unknown.
     */
    private function mapAeneasLanguageCode(string $language): string
    {
        $lang = strtolower(trim($language));
        if ($lang === 'auto') {
            return 'eng';
        }
        $map = [
            'english' => 'eng',
            'en' => 'eng',
            'arabic' => 'ara',
            'ar' => 'ara',
            'french' => 'fra',
            'fr' => 'fra',
            'spanish' => 'spa',
            'es' => 'spa',
            'german' => 'deu',
            'de' => 'deu',
            'italian' => 'ita',
            'it' => 'ita',
            'portuguese' => 'por',
            'pt' => 'por',
            'russian' => 'rus',
            'ru' => 'rus',
        ];
        return $map[$lang] ?? 'eng';
    }

    /**
     * Compute path of $full relative to $root using forward slashes for Docker volume paths.
     */
    private function pathRelativeTo(string $root, string $full): string
    {
        $rootNorm = rtrim(str_replace('\\', '/', $root), '/');
        $fullNorm = str_replace('\\', '/', $full);
        if (strpos($fullNorm, $rootNorm) === 0) {
            return ltrim(substr($fullNorm, strlen($rootNorm)), '/');
        }
        // If not under root, copy into tmp and return that relative path
        $tmpDir = storage_path('app/tmp');
        if (!is_dir($tmpDir)) {
            @mkdir($tmpDir, 0775, true);
        }
        $target = $tmpDir . DIRECTORY_SEPARATOR . basename($full);
        if ($full !== $target) {
            @copy($full, $target);
        }
        $targetNorm = str_replace('\\', '/', $target);
        return ltrim(substr($targetNorm, strlen($rootNorm)), '/');
    }

    /**
     * Adjust word timings so none exceed the media duration and times are monotonic.
     */
    private function clampWordsToDuration(array $words, float $duration): array
    {
        $clamped = [];
        $prevEnd = 0.0;
        foreach ($words as $w) {
            $start = isset($w['start']) ? (float)$w['start'] : 0.0;
            $end = isset($w['end']) ? (float)$w['end'] : $start;
            // Ensure monotonic and within [0, duration]
            $start = max($prevEnd, min($start, $duration));
            $end = max($start, min($end, $duration));
            $clamped[] = [
                'word' => (string)($w['word'] ?? ''),
                'start' => round($start, 3),
                'end' => round($end, 3),
                'confidence' => (float)($w['confidence'] ?? 0.5),
            ];
            $prevEnd = $end;
        }
        // Force last end to exactly duration if it is very close or beyond
        if (count($clamped) > 0) {
            $lastIdx = count($clamped) - 1;
            $clamped[$lastIdx]['end'] = round(min(max($clamped[$lastIdx]['end'], $clamped[$lastIdx]['start']), $duration), 3);
        }
        return $clamped;
    }

    /**
     * Unicode-aware tokenizer: strips punctuation/symbols and splits on whitespace.
     */
    private function tokenizeWords(string $text): array
    {
        $normalized = preg_replace('/[\p{P}\p{S}]+/u', ' ', (string) $text);
        if ($normalized === null) {
            $normalized = (string) $text;
        }
        $normalized = preg_replace('/\s+/u', ' ', $normalized);
        if ($normalized === null) {
            $normalized = (string) $text;
        }
        $normalized = trim($normalized);
        if ($normalized === '') {
            return [];
        }
        $parts = preg_split('/\s+/u', $normalized);
        if (!is_array($parts)) {
            return [];
        }
        return array_values(array_filter($parts, fn ($t) => $t !== ''));
    }

    /**
     * Get media duration in seconds using ffprobe if available.
     */
    private function probeAudioDuration(string $audioFullPath): float
    {
        try {
            $candidates = [
                'ffprobe',
                base_path('storage/tools/ffmpeg/bin/ffprobe.exe'),
                base_path('storage/tools/ffmpeg/bin/ffprobe'),
            ];

            foreach ($candidates as $bin) {
                $cmdWin = '"' . $bin . '" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "' . addslashes($audioFullPath) . '" 2> NUL';
                $cmdNix = '"' . $bin . '" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "' . addslashes($audioFullPath) . '" 2>/dev/null';

                $out = trim((string)@shell_exec($cmdWin));
                if ($out === '' || !is_numeric($out)) {
                    $out = trim((string)@shell_exec($cmdNix));
                }
                if ($out !== '' && is_numeric($out)) {
                    $seconds = (float)$out;
                    if ($seconds > 0) {
                        $this->logToCustomFile('🎯 ffprobe duration detected', [
                            'ffprobe_path' => $bin,
                            'duration_seconds' => $seconds,
                        ]);
                        return $seconds;
                    }
                }
            }
            return 0.0;
        } catch (\Throwable $e) {
            return 0.0;
        }
    }

    /**
     * Log to custom scene generation log file
     */
    private function logToCustomFile(string $message, array $context = []): void
    {
        try {
            $logEntry = [
                'timestamp' => now()->toISOString(),
                'message' => $message,
                'context' => $context,
                'memory_usage' => memory_get_usage(true),
                'memory_peak' => memory_get_peak_usage(true),
                'execution_time' => defined('LARAVEL_START') ? microtime(true) - LARAVEL_START : 'N/A'
            ];

            $logContent = json_encode($logEntry, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n" . str_repeat('-', 80) . "\n";

            // Use the custom logging channel
            Log::channel('scene_generation')->info($message, $context);
            
            // Also write to a custom file for easier debugging
            $customLogPath = storage_path('logs/scene_generation_detailed.log');
            file_put_contents($customLogPath, $logContent, FILE_APPEND | LOCK_EX);
            
        } catch (\Exception $e) {
            // Fallback to default logging if custom logging fails
            Log::error('Failed to write to custom log file', [
                'error' => $e->getMessage(),
                'original_message' => $message
            ]);
        }
    }
}
