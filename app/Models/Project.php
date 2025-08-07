<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class Project extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'type',
        'category',
        'description',
        'language',
        'video_format',
        'script_option',
        'custom_script',
        'voiceover_option',
        'voiceover_file',
        'voiceover_url',
        'status',
        'job_id',
        'final_video_path',
        'scenes_data',
        'processing_started_at',
        'processing_completed_at',
        'error_message',
        'trim_response',
        'voiceover_transcript',
        'subtitles_script',
        'last_scene_config',
        'selected_music'
    ];

    protected $casts = [
        'scenes_data' => 'array',
        'video_format' => 'array',
        'trim_response' => 'array',
        'voiceover_transcript' => 'array',
        'subtitles_script' => 'array',
        'selected_music' => 'array',
        'processing_started_at' => 'datetime',
        'processing_completed_at' => 'datetime'
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scenes(): HasMany
    {
        return $this->hasMany(Scene::class);
    }

    /**
     * Get the voiceover transcript data
     *
     * @return array|null
     */
    public function getVoiceoverTranscript(): ?array
    {
        return $this->voiceover_transcript;
    }

    /**
     * Check if the project has a voiceover transcript
     *
     * @return bool
     */
    public function hasVoiceoverTranscript(): bool
    {
        return !empty($this->voiceover_transcript);
    }

    /**
     * Get transcript words count
     *
     * @return int
     */
    public function getTranscriptWordsCount(): int
    {
        return $this->hasVoiceoverTranscript() ? count($this->voiceover_transcript) : 0;
    }

    /**
     * Get transcript duration in seconds
     *
     * @return float
     */
    public function getTranscriptDuration(): float
    {
        if (!$this->hasVoiceoverTranscript()) {
            return 0.0;
        }

        $transcript = $this->voiceover_transcript;
        $lastWord = end($transcript);

        return $lastWord['end'] ?? 0.0;
    }

    /**
     * Get the subtitles script data
     *
     * @return array|null
     */
    public function getSubtitlesScript(): ?array
    {
        return $this->subtitles_script;
    }

    /**
     * Check if the project has a subtitles script
     *
     * @return bool
     */
    public function hasSubtitlesScript(): bool
    {
        return !empty($this->subtitles_script);
    }

    /**
     * Get subtitles script count
     *
     * @return int
     */
    public function getSubtitlesScriptCount(): int
    {
        return $this->hasSubtitlesScript() ? count($this->subtitles_script) : 0;
    }

    public function getStatusBadgeAttribute(): string
    {
        return match($this->status) {
            'pending' => '<span class="badge bg-warning">Pending</span>',
            'processing' => '<span class="badge bg-info">Processing</span>',
            'reviewing' => '<span class="badge bg-primary">Reviewing</span>',
            'subtitle_selection' => '<span class="badge bg-purple">Subtitle Selection</span>',
            'completed' => '<span class="badge bg-success">Completed</span>',
            'failed' => '<span class="badge bg-danger">Failed</span>',
            default => '<span class="badge bg-secondary">Unknown</span>'
        };
    }

    /**
     * Check if the final video is an external URL
     *
     * @return bool
     */
    public function isFinalVideoExternal(): bool
    {
        return $this->final_video_path && filter_var($this->final_video_path, FILTER_VALIDATE_URL);
    }

    /**
     * Get the final video URL for display
     *
     * @return string|null
     */
    public function getFinalVideoUrl(): ?string
    {
        if (!$this->final_video_path) {
            return null;
        }

        if ($this->isFinalVideoExternal()) {
            return $this->final_video_path;
        }

        // For local files, return the storage URL
        return Storage::url($this->final_video_path);
    }
}