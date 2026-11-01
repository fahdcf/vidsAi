<?php

namespace App\Services;

use App\Models\Project;
use Illuminate\Support\Facades\DB;

class EditingService
{
    public function document(Project $project): array
    {
        $d = $project->edit_state ?: app(EditStateBuilder::class)->build($project);
        $d['schemaVersion'] ??= 1;
        $d['revision'] ??= $d['version'] ?? 1;
        $d['version'] = $d['revision'];

        return $d;
    }

    public function commit(Project $project, array $command): array
    {
        $inputHash = hash('sha256', json_encode($command));
        $existing = DB::table('edit_commands')->where('id', $command['commandId'])->first();
        if ($existing) {
            abort_unless($existing->project_id == $project->id && $existing->input_hash === $inputHash, 409, 'Command ID already used.');

            return json_decode($existing->result, true);
        }
        $document = $this->document($project->fresh());
        abort_unless($command['projectId'] == (string) $project->id && $command['expectedRevision'] === $document['revision'], 409, 'The project changed. Reload before applying edits.');
        if (isset($command['restoreRevision'])) {
            $row = DB::table('edit_revisions')->where('project_id', $project->id)->where('revision', $command['restoreRevision'])->first();
            abort_unless($row, 422, 'Revision unavailable.');
            $next = json_decode($row->document, true);
            $next['revision'] = $document['revision'] + 1;
            $next['version'] = $next['revision'];
            $next['metadata']['last_modified'] = now()->toISOString();
        } else {
            $next = app(EditingWorker::class)->request('POST', '/commands', ['document' => $document, 'command' => $command])['document'];
        }

        return DB::transaction(function () use ($project, $document, $next, $command, $inputHash) {
            $run = DB::table('agent_runs')->where('id', $command['commandId'])->lockForUpdate()->first();
            if ($run) {
                abort_if($run->status === 'cancelled', 409, 'This request was cancelled.');
            }
            $locked = Project::whereKey($project->id)->lockForUpdate()->firstOrFail();
            $again = DB::table('edit_commands')->where('id', $command['commandId'])->first();
            if ($again) {
                abort_unless($again->project_id == $project->id && $again->input_hash === $inputHash, 409);

                return json_decode($again->result, true);
            }
            abort_unless($this->document($locked)['revision'] === $document['revision'], 409, 'The project changed. Reload before applying edits.');
            foreach ([$document, $next] as $d) {
                DB::table('edit_revisions')->insertOrIgnore(['project_id' => $project->id, 'revision' => $d['revision'], 'document' => json_encode($d), 'created_at' => now(), 'updated_at' => now()]);
            }
            $locked->update(['edit_state' => $next]);
            $result = ['success' => true, 'edit_state' => $next, 'revision' => $next['revision']];
            DB::table('edit_commands')->insert(['id' => $command['commandId'], 'project_id' => $project->id, 'input_hash' => $inputHash, 'result' => json_encode($result), 'created_at' => now(), 'updated_at' => now()]);
            if ($run) {
                DB::table('agent_runs')->where('id', $run->id)->update(['status' => 'applied', 'result' => json_encode($result), 'updated_at' => now()]);
            }

            return $result;
        });
    }
}
