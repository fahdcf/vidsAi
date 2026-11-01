<?php

namespace App\Jobs;

use App\Models\Project;
use App\Services\EditingWorker;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;

class ReconcileVideoExport implements ShouldQueue
{
    use Queueable;

    public $timeout = 90;

    public $tries = 1000;

    public $backoff = 10;

    public function __construct(public string $exportId) {}

    public function handle(EditingWorker $worker): void
    {
        $row = DB::table('video_exports')->where('id', $this->exportId)->first();
        if (! $row || in_array($row->status, ['done', 'failed', 'cancelled'])) {
            return;
        }
        if (now()->diffInSeconds(\Illuminate\Support\Carbon::parse($row->created_at), true) > config('editing.render_deadline_seconds')) {
            DB::table('video_exports')->where('id', $row->id)->update(['status' => 'failed', 'error' => 'Export deadline exceeded', 'updated_at' => now()]);

            return;
        }
        $id = $row->worker_job_id;
        if (! $id) {
            $submission = $worker->request('POST', '/render', ['requestId' => $row->id, 'editState' => json_decode($row->snapshot, true)]);
            $id = $submission['jobId'];
            DB::table('video_exports')->where('id', $row->id)->update(['worker_job_id' => $id, 'updated_at' => now()]);
        }
        $status = $worker->request('GET', '/status/'.$id);
        $state = $status['status'];
        $url = null;
        if ($state === 'done') {
            $url = route('projects.export-download', ['project' => $row->project_id, 'export' => $row->id]);
        }
        DB::transaction(function () use ($row, $state, $status, $url) {
            $current = DB::table('video_exports')->where('id', $row->id)->lockForUpdate()->first();
            if ($current->status === 'cancelled') {
                return;
            }
            DB::table('video_exports')->where('id', $row->id)->update(['status' => $state, 'progress' => $status['progress'] ?? 0, 'error' => $status['error'] ?? null, 'output_url' => $url, 'updated_at' => now()]);
            $latest = DB::table('video_exports')->where('project_id', $row->project_id)->latest('created_at')->value('id');
            if ($latest !== $row->id) {
                return;
            }
            if ($state === 'done') {
                Project::whereKey($row->project_id)->update(['status' => 'completed', 'final_video_path' => $url, 'processing_completed_at' => now(), 'error_message' => null]);
            } elseif ($state === 'failed') {
                Project::whereKey($row->project_id)->update(['status' => 'failed', 'error_message' => $status['error'] ?? 'Render failed']);
            }
        });
        if (! in_array($state, ['cancelled', 'done', 'failed'])) {
            $this->release(3);
        }
    }

    public function failed(?\Throwable $e): void
    {
        DB::table('video_exports')->where('id', $this->exportId)->whereNotIn('status', ['done', 'cancelled'])->update(['status' => 'failed', 'error' => $e?->getMessage(), 'updated_at' => now()]);
    }
}
