<?php

namespace App\Jobs;

use App\Models\Project;
use App\Models\Scene;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Http;

class GenerateScenesFromVoiceJob implements ShouldQueue
{
    use Queueable;

    public $timeout = 300; // 5 minutes timeout

    /**
     * Create a new job instance.
     */
    public function __construct(
        public Project $project
    ) {
        //
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            logger()->info('Starting scene generation job', [
                'project_id' => $this->project->id
            ]);

            // Set processing started timestamp if not already set
            if (!$this->project->processing_started_at) {
                $this->project->update(['processing_started_at' => now()]);
            }

            $result = $this->generateScenesFromVoice($this->project);

            if ($result && isset($result['scenes_data'])) {
                logger()->info('🎯 Processing job result', [
                    'project_id' => $this->project->id,
                    'result_keys' => array_keys($result),
                    'scenes_count' => count($result['scenes_data']),
                    'has_transcript' => isset($result['voiceover_transcript']),
                    'has_subtitles_script' => isset($result['subtitles_script'])
                ]);

                // Create scenes from the response
                $this->createScenesFromResponse($this->project, $result['scenes_data']);

                // Prepare update data
                $updateData = [
                    'status' => 'reviewing',
                    'processing_completed_at' => now()
                ];

                // Store the voiceover transcript if available
                if (isset($result['voiceover_transcript'])) {
                    $updateData['voiceover_transcript'] = $result['voiceover_transcript'];

                    logger()->info('📝 Storing voiceover transcript', [
                        'project_id' => $this->project->id,
                        'transcript_words_count' => count($result['voiceover_transcript']),
                        'first_word' => $result['voiceover_transcript'][0] ?? null,
                        'last_word' => end($result['voiceover_transcript']) ?? null
                    ]);
                } else {
                    logger()->warning('⚠️ No voiceover transcript found in result', [
                        'project_id' => $this->project->id,
                        'result_keys' => array_keys($result)
                    ]);
                }

                // Store the subtitles script if available
                if (isset($result['subtitles_script'])) {
                    $updateData['subtitles_script'] = $result['subtitles_script'];

                    logger()->info('📝 Storing subtitles script', [
                        'project_id' => $this->project->id,
                        'subtitles_count' => count($result['subtitles_script']),
                        'first_subtitle' => $result['subtitles_script'][0] ?? null,
                        'last_subtitle' => end($result['subtitles_script']) ?? null
                    ]);
                } else {
                    logger()->warning('⚠️ No subtitles script found in result', [
                        'project_id' => $this->project->id,
                        'result_keys' => array_keys($result)
                    ]);
                }

                logger()->info('💾 About to update project', [
                    'project_id' => $this->project->id,
                    'update_data_keys' => array_keys($updateData),
                    'has_subtitles_in_update' => isset($updateData['subtitles_script'])
                ]);

                // Update project with scenes data and transcript
                $this->project->update($updateData);

                logger()->info('✅ Successfully generated scenes from voice', [
                    'project_id' => $this->project->id,
                    'scenes_count' => count($result['scenes_data']),
                    'has_transcript' => isset($result['voiceover_transcript']),
                    'has_subtitles_script' => isset($result['subtitles_script']),
                    'update_completed' => true
                ]);
            } else {
                // If API call failed, set status to failed
                $this->project->update([
                    'status' => 'failed',
                    'processing_completed_at' => now(),
                    'error_message' => 'Failed to generate scenes from voice'
                ]);

                logger()->error('Failed to generate scenes from voice', [
                    'project_id' => $this->project->id
                ]);
            }
        } catch (\Exception $e) {
            $this->project->update([
                'status' => 'failed',
                'processing_completed_at' => now(),
                'error_message' => 'Exception during scene generation: ' . $e->getMessage()
            ]);

            logger()->error('Exception during scene generation', [
                'project_id' => $this->project->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            throw $e; // Re-throw to mark job as failed
        }
    }

    protected function generateScenesFromVoice(Project $project)
    {
        try {
            // Get the script text
            $script = $project->custom_script ?? $project->description;

            // Get the full path to the voiceover file
            $voiceoverFullPath = storage_path('app/public/' . $project->voiceover_file);

            // Check if file exists
            if (!file_exists($voiceoverFullPath)) {
                logger()->error('Voiceover file not found', ['path' => $voiceoverFullPath]);
                return null;
            }

            // Prepare the form data
            $formData = [
                'script' => $script,
                'description' => $project->description,
                'category' => $project->category,
                'language' => $this->mapLanguageCode($project->language),
                'video_format' => 'mp4',
            ];

            logger()->info('🌐 Sending request to n8n API', [
                'url' => config('services.n8n.voice_scenes_url'),
                'form_data' => $formData,
                'file_path' => $voiceoverFullPath,
                'file_exists' => file_exists($voiceoverFullPath),
                'file_size' => filesize($voiceoverFullPath),
                'file_mime_type' => mime_content_type($voiceoverFullPath)
            ]);

            // Make the request to n8n API
            $response = Http::withOptions([
                'verify' => false, // Disable SSL verification to fix the certificate error
                'timeout' => 120,  // Increase timeout for large files
            ])->attach(
                'audio_file',
                file_get_contents($voiceoverFullPath),
                basename($project->voiceover_file)
            )->post(config('services.n8n.voice_scenes_url'), $formData);

            logger()->info('📡 n8n API response received', [
                'status' => $response->status(),
                'headers' => $response->headers(),
                'body_length' => strlen($response->body()),
                'body' => $response->body()
            ]);

            if ($response->successful()) {
                $responseData = $response->json();

                logger()->info('✅ n8n API call successful', [
                    'response_keys' => array_keys($responseData),
                    'response_structure' => $this->getResponseStructure($responseData),
                    'has_transcript_in_response' => isset($responseData[0]['voice_over_transcript']) || isset($responseData['voice_over_transcript'])
                ]);

                // Handle new response format: array with 'all_videos' key
                if (isset($responseData[0]['all_videos'])) {
                    logger()->info('📹 Using new response format (array[0][all_videos])', [
                        'videos_count' => count($responseData[0]['all_videos']),
                        'has_transcript' => isset($responseData[0]['voice_over_transcript']),
                        'has_subtitles_script' => isset($responseData[0]['subtitles_script']),
                        'response_keys' => array_keys($responseData[0])
                    ]);

                    $result = [
                        'scenes_data' => $responseData[0]['all_videos']
                    ];

                    // Include transcript if available
                    if (isset($responseData[0]['voice_over_transcript'])) {
                        $result['voiceover_transcript'] = $responseData[0]['voice_over_transcript'];
                        logger()->info('✅ Added transcript to result', [
                            'transcript_count' => count($responseData[0]['voice_over_transcript'])
                        ]);
                    }

                    // Include subtitles script if available
                    if (isset($responseData[0]['subtitles_script'])) {
                        $result['subtitles_script'] = $responseData[0]['subtitles_script'];
                        logger()->info('✅ Added subtitles_script to result', [
                            'subtitles_count' => count($responseData[0]['subtitles_script']),
                            'first_subtitle' => $responseData[0]['subtitles_script'][0] ?? null
                        ]);
                    } else {
                        logger()->warning('❌ No subtitles_script found in new format response', [
                            'available_keys' => array_keys($responseData[0])
                        ]);
                    }

                    logger()->info('🔄 Returning result with keys', [
                        'result_keys' => array_keys($result)
                    ]);

                    return $result;
                }
                // Handle old response format: direct 'all_videos' key
                elseif (isset($responseData['all_videos'])) {
                    logger()->info('📹 Using old response format (all_videos)', [
                        'videos_count' => count($responseData['all_videos']),
                        'has_transcript' => isset($responseData['voice_over_transcript']),
                        'has_subtitles_script' => isset($responseData['subtitles_script']),
                        'response_keys' => array_keys($responseData)
                    ]);

                    $result = [
                        'scenes_data' => $responseData['all_videos']
                    ];

                    // Include transcript if available
                    if (isset($responseData['voice_over_transcript'])) {
                        $result['voiceover_transcript'] = $responseData['voice_over_transcript'];
                        logger()->info('📝 Transcript found in old format', [
                            'transcript_words' => count($responseData['voice_over_transcript'])
                        ]);
                    } else {
                        logger()->warning('⚠️ No transcript found in old format response', [
                            'available_keys' => array_keys($responseData)
                        ]);
                    }

                    // Include subtitles script if available
                    if (isset($responseData['subtitles_script'])) {
                        $result['subtitles_script'] = $responseData['subtitles_script'];
                        logger()->info('📝 Subtitles script found in old format', [
                            'subtitles_count' => count($responseData['subtitles_script'])
                        ]);
                    } else {
                        logger()->warning('⚠️ No subtitles script found in old format response', [
                            'available_keys' => array_keys($responseData)
                        ]);
                    }

                    return $result;
                }

                logger()->error('❌ Unexpected response format from n8n API', [
                    'response' => $responseData,
                    'available_keys' => array_keys($responseData)
                ]);
                return null;
            } else {
                logger()->error('❌ n8n API request failed', [
                    'status' => $response->status(),
                    'response' => $response->body(),
                    'url' => config('services.n8n.voice_scenes_url')
                ]);
                return null;
            }
        } catch (\Exception $e) {
            logger()->error('Failed to generate scenes from voice: ' . $e->getMessage(), [
                'exception' => $e->getTraceAsString()
            ]);
            return null;
        }
    }

    protected function createScenesFromResponse(Project $project, array $scenesData)
    {
        foreach ($scenesData as $index => $sceneData) {
            Scene::create([
                'project_id' => $project->id,
                'scene_number' => $index + 1,
                'script_text' => $sceneData['phrase'],
                'video_url' => $sceneData['video_url'],
                'duration_seconds' => is_numeric($sceneData['duration_seconds'] ?? null)
                    ? (float) $sceneData['duration_seconds']
                    : null,
                'keywords' => $sceneData['keywords'] ?? null,
                'prompt' => $sceneData['prompt'] ?? null,
                'status' => 'completed'
            ]);
        }
    }

    /**
     * Helper method to analyze response structure for debugging
     */
    private function getResponseStructure($data, $depth = 0): array
    {
        if ($depth > 2) return ['...too_deep'];

        if (is_array($data)) {
            $structure = [];
            foreach ($data as $key => $value) {
                if (is_array($value)) {
                    $structure[$key] = $this->getResponseStructure($value, $depth + 1);
                } else {
                    $structure[$key] = gettype($value);
                }
            }
            return $structure;
        }

        return [gettype($data)];
    }

    protected function mapLanguageCode($language)
    {
        // Map full language names to language codes
        $languageMap = [
            'english' => 'en',
            'spanish' => 'es',
            'french' => 'fr',
            'german' => 'de',
            'italian' => 'it',
            'portuguese' => 'pt',
            'russian' => 'ru',
            'chinese' => 'zh',
            'japanese' => 'ja',
            'korean' => 'ko',
            'arabic' => 'ar',
            'hindi' => 'hi',
        ];

        return $languageMap[strtolower($language)] ?? 'en';
    }
}
