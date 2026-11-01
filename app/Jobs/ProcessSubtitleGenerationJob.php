<?php

namespace App\Jobs;

use App\Models\Project;
use App\Services\EditingWorker;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProcessSubtitleGenerationJob implements ShouldQueue
{
    use Queueable;

    public $timeout = 90;

    public $tries = 3;

    public string $exportId;

    public ?array $snapshot;

    public function __construct(public Project $project, public array $videoData, public array $projectInfo)
    {
        $this->exportId = (string) Str::uuid();
        $this->snapshot = $project->edit_state;
    }

    public function handle(EditingWorker $worker): void
    {
        if (DB::table('video_exports')->where('id', $this->exportId)->exists()) {
            return;
        }
        $d = $this->snapshot ?: $worker->request('POST', '/convert', ['payload' => $this->videoData])['document'];
        $d['project_id'] = (string) $this->project->id;
        $d['schemaVersion'] ??= 1;
        $d['revision'] ??= $d['version'] ?? 1;
        $canonical = $d;
        $d = \App\Http\Controllers\ProjectAssetController::renderSnapshot($d, $this->project->id);
        DB::transaction(function () use ($d, $canonical) {
            DB::table('video_exports')->insert(['id' => $this->exportId, 'project_id' => $this->project->id, 'revision' => $d['revision'], 'snapshot' => json_encode($d), 'status' => 'queued', 'created_at' => now(), 'updated_at' => now()]);
            if (! $this->project->fresh()->edit_state) {
                $this->project->update(['edit_state' => $canonical]);
            }
            ReconcileVideoExport::dispatch($this->exportId)->afterCommit();
        });
    }

    public function failed(?\Throwable $e): void
    {
        $this->project->update(['status' => 'failed', 'error_message' => $e?->getMessage()]);
    }
}
