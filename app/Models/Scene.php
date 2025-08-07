<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Scene extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'scene_number',
        'script_text',
        'video_url',
        'video_path',
        'thumbnail_path',
        'duration_seconds',
        'keywords',
        'prompt',
        'status',
        'approved'
    ];

    protected $casts = [
        'approved' => 'boolean'
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}