<?php

namespace App\Console\Commands;

use App\Models\Project;
use App\Services\EditingService;
use App\Services\EditingWorker;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class MigrateEditingDocuments extends Command
{
    protected $signature = 'editing:migrate {--dry-run} {--project=}';

    protected $description = 'Validate and migrate legacy editing documents without losing saved edits';

    public function handle(EditingService $ed, EditingWorker $worker): int
    {
        $failed = 0;
        $query = Project::query();
        if ($this->option('project')) {
            $query->whereKey($this->option('project'));
        }
        $query->chunkById(50, function ($projects) use ($ed, $worker, &$failed) {
            foreach ($projects as $p) {
                if (! $p->edit_state && $p->scenes()->count() === 0) {
                    $this->line("Project {$p->id}: no edit yet, skipped");

                    continue;
                }try {
                    $d = $worker->request('POST', '/validate', ['document' => $ed->document($p)])['document'];
                    if (! $this->option('dry-run')) {
                        DB::transaction(function () use ($p, $d) {
                            $locked = Project::whereKey($p->id)->lockForUpdate()->firstOrFail();
                            if ($locked->edit_state !== $p->edit_state) {
                                throw new \RuntimeException('Project changed during validation; retry this migration.');
                            }
                            DB::table('edit_revisions')->insertOrIgnore(['project_id' => $p->id, 'revision' => $d['revision'], 'document' => json_encode($d), 'created_at' => now(), 'updated_at' => now()]);
                            $locked->update(['edit_state' => $d]);
                        });
                    }$this->line("Project {$p->id}: valid revision {$d['revision']}");
                } catch (\Throwable $e) {
                    $failed++;
                    $this->error("Project {$p->id}: ".$e->getMessage());
                }
            }
        });

        return $failed ? self::FAILURE : self::SUCCESS;
    }
}
