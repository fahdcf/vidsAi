<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Services\EditingService;
use App\Services\EditingWorker;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AgentController extends Controller
{
    public function editor(Project $project, EditingService $ed)
    {
        $this->authorize('view', $project);
        if (! in_array($project->status, ['subtitle_selection', 'subtitle_generating', 'completed'])) {
            return redirect()->route('projects.review', $project)->with('info', 'Please confirm your scenes first.');
        }
        if (! $project->edit_state) {
            $project->update(['edit_state' => $ed->document($project)]);
        }
        if (config('editing.react_editor') && ! request()->boolean('legacy')) {
            return \Inertia\Inertia::render('Editor', ['project' => $project->only('id', 'name', 'status'), 'document' => $ed->document($project), 'history' => \Illuminate\Support\Facades\DB::table('edit_revisions')->where('project_id', $project->id)->where('revision', '<', $ed->document($project)['revision'])->orderByDesc('revision')->limit(30)->get()->reverse()->values()->map(fn ($r) => json_decode($r->document, true)), 'latestExport' => \Illuminate\Support\Facades\DB::table('video_exports')->where('project_id', $project->id)->latest('created_at')->first(), 'pendingRun' => \Illuminate\Support\Facades\DB::table('agent_runs')->where('project_id', $project->id)->whereIn('status', ['planning', 'planned', 'failed'])->latest('created_at')->first()]);
        }

        return view('projects.editor', compact('project'));
    }

    public function saveMusic(Request $r, Project $project, EditingService $ed)
    {
        $this->authorize('update', $project);
        $r->validate(['music_url' => 'nullable|url', 'music_volume' => 'nullable|numeric|min:0|max:1', 'music_name' => 'nullable|string|max:200']);
        $d = $ed->document($project);
        $url = $r->input('music_url');
        $result = $ed->commit($project, ['commandId' => (string) Str::uuid(), 'projectId' => (string) $project->id, 'expectedRevision' => $d['revision'], 'operations' => [['tool' => 'set_music', 'params' => ['url' => $url, 'volume' => (float) $r->input('music_volume', .3)]]]]);
        $project->update(['selected_music' => $url ? [['url' => $url, 'volume' => (float) $r->input('music_volume', .3), 'name' => $r->input('music_name', '')]] : null]);

        return response()->json([...$result, 'editor_url' => route('projects.editor', $project), 'music_saved' => (bool) $url]);
    }

    public function chat(Request $r, Project $project, EditingService $ed)
    {
        $this->authorize('update', $project);
        $r->validate(['message' => 'required|string|max:2000', 'order' => 'sometimes|array', 'expectedRevision' => 'sometimes|integer', 'commandId' => 'sometimes|uuid']);
        $d = $ed->document($project);
        if ($r->input('message') === '__reorder__') {
            return response()->json($ed->commit($project, ['commandId' => $r->input('commandId', (string) Str::uuid()), 'projectId' => (string) $project->id, 'expectedRevision' => $r->input('expectedRevision', $d['revision']), 'operations' => [['tool' => 'reorder_scenes', 'params' => ['order' => $r->input('order', [])]]]]));
        }
        $id = $r->input('commandId', (string) Str::uuid());
        $proposal = Request::create('', 'POST', ['runId' => $id, 'message' => $r->input('message')]);
        $controller = app(EditingController::class);
        $planned = $controller->plan($proposal, $project, $ed, app(EditingWorker::class))->getData(true);
        $plan = $planned['plan'];
        if (empty($plan['operations'])) {
            return response()->json(['success' => true, 'edit_state' => null, 'agent_reply' => $plan['reply'], 'tool_used' => null]);
        }
        $result = $controller->execute($project, $id, $ed)->getData(true);

        return response()->json([...$result, 'agent_reply' => $plan['reply'], 'tool_used' => $plan['operations'][0]['tool'], 'params_used' => $plan['operations'][0]['params']]);
    }

    public function getEditState(Project $project, EditingService $ed)
    {
        $this->authorize('view', $project);
        $d = $ed->document($project);

        return response()->json(['edit_state' => $d, 'version' => $d['revision'], 'status' => $project->status]);
    }

    public function export(Request $r, Project $project, EditingService $ed)
    {
        return app(EditingController::class)->export($r, $project, $ed);
    }
}
