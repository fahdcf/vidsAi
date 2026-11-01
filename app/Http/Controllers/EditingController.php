<?php

namespace App\Http\Controllers;

use App\Jobs\ReconcileVideoExport;
use App\Models\Project;
use App\Services\EditingService;
use App\Services\EditingWorker;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class EditingController extends Controller
{
    public function commands(Request $r, Project $project, EditingService $ed)
    {
        $this->authorize('update', $project);
        $data = $r->validate(['commandId' => 'required|uuid', 'expectedRevision' => 'required|integer|min:0', 'operations' => 'required|array|min:1|max:30', 'operations.*.tool' => 'required|string', 'operations.*.params' => 'present|array']);
        $data['projectId'] = (string) $project->id;

        return response()->json($ed->commit($project, $data));
    }

    public function restore(Request $r, Project $project, EditingService $ed)
    {
        $this->authorize('update', $project);
        $data = $r->validate(['commandId' => 'required|uuid', 'expectedRevision' => 'required|integer', 'restoreRevision' => 'required|integer']);
        $data['projectId'] = (string) $project->id;

        return response()->json($ed->commit($project, $data));
    }

    public function export(Request $r, Project $project, EditingService $ed)
    {
        $this->authorize('update', $project);
        $r->validate(['requestId' => 'sometimes|uuid']);
        $id = $r->input('requestId', (string) Str::uuid());
        $row = DB::transaction(function () use ($project, $ed, $id) {
            $locked = Project::whereKey($project->id)->lockForUpdate()->firstOrFail();
            $existing = DB::table('video_exports')->where('id', $id)->first();
            if ($existing) {
                abort_unless($existing->project_id == $project->id, 409);

                return $existing;
            }
            $active = DB::table('video_exports')->where('project_id', $project->id)->whereIn('status', ['queued', 'rendering'])->first();
            if ($active) {
                return $active;
            }
            $d = ProjectAssetController::renderSnapshot($ed->document($locked), $project->id);
            abort_if(empty($d['tracks']['video']), 422, 'No clips to render.');
            DB::table('video_exports')->insert(['id' => $id, 'project_id' => $project->id, 'revision' => $d['revision'], 'snapshot' => json_encode($d), 'status' => 'queued', 'created_at' => now(), 'updated_at' => now()]);
            $locked->update(['status' => 'subtitle_generating', 'error_message' => null]);
            ReconcileVideoExport::dispatch($id)->afterCommit();

            return DB::table('video_exports')->where('id', $id)->first();
        });

        return response()->json(['success' => true, 'export_id' => $row->id, 'status' => $row->status, 'redirect_url' => route('projects.processing', $project)], 202);
    }

    public function exportStatus(Project $project, string $export)
    {
        $this->authorize('view', $project);
        $row = DB::table('video_exports')->where('id', $export)->where('project_id', $project->id)->first();
        abort_unless($row, 404);

        return response()->json($row);
    }

    public function cancel(Project $project, string $export, EditingWorker $worker)
    {
        $this->authorize('update', $project);
        $row = DB::table('video_exports')->where('id', $export)->where('project_id', $project->id)->first();
        abort_unless($row, 404);
        if (! in_array($row->status, ['done', 'failed', 'cancelled'])) {
            if ($row->worker_job_id) {
                $worker->request('DELETE', '/renders/'.$row->worker_job_id);
            }DB::table('video_exports')->where('id', $export)->update(['status' => 'cancelled', 'updated_at' => now()]);
            $project->update(['status' => 'subtitle_selection']);
        }

        return response()->json(['success' => true]);
    }

    public function download(Project $project, string $export)
    {
        $this->authorize('view', $project);
        $row = DB::table('video_exports')->where('id', $export)->where('project_id', $project->id)->where('status', 'done')->first();
        abort_unless($row, 404);
        $response = \Illuminate\Support\Facades\Http::withToken(config('editing.worker_token'))->timeout(120)->withOptions(['stream' => true])->get(rtrim(config('editing.worker_url'), '/').'/downloads/'.$row->worker_job_id.'.mp4');
        abort_unless($response->successful(), 502);

        return response()->streamDownload(function () use ($response) {
            $stream = $response->toPsrResponse()->getBody();
            while (! $stream->eof()) {
                echo $stream->read(1024 * 1024);
            }
        }, 'vidsai-'.$project->id.'.mp4', ['Content-Type' => 'video/mp4']);
    }

    public function plan(Request $r, Project $project, EditingService $ed, EditingWorker $worker)
    {
        $this->authorize('update', $project);
        $r->validate(['runId' => 'required|uuid', 'message' => 'required|string|max:2000']);
        $id = $r->input('runId');
        $d = $ed->document($project);
        $row = DB::table('agent_runs')->where('id', $id)->first();
        if ($row) {
            abort_unless($row->project_id == $project->id && $row->message === $r->input('message'), 409);
            if ($row->plan) {
                return response()->json(['runId' => $id, 'status' => $row->status, 'plan' => json_decode($row->plan, true)]);
            }
        } else {
            DB::table('agent_runs')->insertOrIgnore(['id' => $id, 'project_id' => $project->id, 'starting_revision' => $d['revision'], 'snapshot' => json_encode($d), 'message' => $r->input('message'), 'status' => 'planning', 'created_at' => now(), 'updated_at' => now()]);
        }
        $stored = DB::table('agent_runs')->where('id', $id)->first();
        abort_unless($stored->project_id == $project->id && $stored->message === $r->input('message'), 409, 'Run ID already used.');
        abort_if($stored->status === 'cancelled', 409, 'This run was cancelled.');
        if ($stored->snapshot) {
            $d = json_decode($stored->snapshot, true);
        }
        try {
            $result = $worker->request('POST', '/agent/plan', ['runId' => $id, 'message' => $r->input('message'), 'document' => $d]);
            $runStatus = empty($result['operations']) ? 'completed' : 'planned';
            DB::table('agent_runs')->where('id', $id)->where('status', '!=', 'cancelled')->update(['status' => $runStatus, 'plan' => json_encode($result), 'error' => null, 'updated_at' => now()]);
            abort_if(DB::table('agent_runs')->where('id', $id)->value('status') === 'cancelled', 409, 'This run was cancelled.');

            return response()->json(['runId' => $id, 'status' => $runStatus, 'plan' => $result]);
        } catch (\Throwable $e) {
            DB::table('agent_runs')->where('id', $id)->where('status', '!=', 'cancelled')->update(['status' => 'failed', 'error' => $e->getMessage(), 'updated_at' => now()]);
            throw $e;
        }
    }

    public function execute(Project $project, string $run, EditingService $ed)
    {
        $this->authorize('update', $project);
        $row = DB::table('agent_runs')->where('id', $run)->where('project_id', $project->id)->first();
        abort_unless($row, 404);
        if ($row->status === 'applied') {
            return response()->json(json_decode($row->result, true));
        }
        abort_unless($row->status === 'planned', 409, 'Run is not ready.');
        $plan = json_decode($row->plan, true);
        abort_if(empty($plan['operations']), 422, 'No editing changes in this plan.');
        $result = $ed->commit($project, ['commandId' => $run, 'projectId' => (string) $project->id, 'expectedRevision' => $row->starting_revision, 'operations' => $plan['operations']]);
        DB::table('agent_runs')->where('id', $run)->update(['status' => 'applied', 'result' => json_encode($result), 'updated_at' => now()]);

        return response()->json($result);
    }

    public function run(Project $project, string $run)
    {
        $this->authorize('view', $project);
        $row = DB::table('agent_runs')->where('id', $run)->where('project_id', $project->id)->first();
        abort_unless($row, 404);

        return response()->json($row);
    }

    public function cancelRun(Project $project, string $run)
    {
        $this->authorize('update', $project);
        DB::transaction(function () use ($project, $run) {
            $row = DB::table('agent_runs')->where('id', $run)->where('project_id', $project->id)->lockForUpdate()->first();
            abort_unless($row, 404);
            abort_if($row->status === 'applied', 409, 'This run already applied changes. Use Undo to reverse them.');
            DB::table('agent_runs')->where('id', $run)->update(['status' => 'cancelled', 'updated_at' => now()]);
        });

        return response()->json(['success' => true]);
    }
}
