<?php

namespace Tests\Feature;

use App\Jobs\ReconcileVideoExport;
use App\Models\Project;
use App\Models\User;
use App\Services\EditingWorker;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Tests\TestCase;

class EditingExportTest extends TestCase
{
    use RefreshDatabase;

    public function test_cancelled_and_stale_agent_plans_cannot_change_a_project():void
    {
        $user=User::factory()->create();
        $d=json_decode(file_get_contents(base_path('tests/Fixtures/edit-state.json')),true);
        $p=Project::factory()->create(['user_id'=>$user->id]);$d['project_id']=(string)$p->id;$p->update(['edit_state'=>$d]);
        $plan=['operations'=>[['tool'=>'set_transition','params'=>['type'=>'fade']]],'reply'=>'Prepared'];
        $run=(string)Str::uuid();
        DB::table('agent_runs')->insert(['id'=>$run,'project_id'=>$p->id,'starting_revision'=>1,'message'=>'Use fade','status'=>'planned','plan'=>json_encode($plan),'snapshot'=>json_encode($d),'created_at'=>now(),'updated_at'=>now()]);
        $this->actingAs($user)->deleteJson("/projects/{$p->id}/agent-runs/{$run}")->assertOk();
        $this->postJson("/projects/{$p->id}/agent-runs/{$run}/execute")->assertConflict();
        $this->assertDatabaseCount('edit_commands',0);
        DB::table('agent_runs')->where('id',$run)->update(['status'=>'planned']);
        $d['version']=$d['revision']=2;$p->update(['edit_state'=>$d]);
        $this->postJson("/projects/{$p->id}/agent-runs/{$run}/execute")->assertConflict();
        $this->assertSame(2,$p->fresh()->edit_state['revision']);
        Http::assertNothingSent();
    }

    public function test_export_dispatches_once_and_preserves_immutable_saved_snapshot(): void
    {
        Queue::fake();
        $u = User::factory()->create();
        $d = json_decode(file_get_contents(base_path('tests/Fixtures/edit-state.json')), true);
        $p = Project::factory()->create(['user_id' => $u->id, 'status' => 'subtitle_selection']);
        $d['project_id'] = (string) $p->id;
        $d['tracks']['video'][0]['trim_in'] = 7;
        $p->update(['edit_state' => $d]);
        $id = (string) Str::uuid();
        $this->actingAs($u)->postJson("/projects/{$p->id}/export", ['requestId' => $id])->assertAccepted()->assertJsonPath('export_id', $id);
        $this->postJson("/projects/{$p->id}/export", ['requestId' => $id])->assertAccepted();
        $this->assertDatabaseCount('video_exports', 1);
        Queue::assertPushed(ReconcileVideoExport::class, 1);
        $d['tracks']['video'][0]['trim_in'] = 12;
        $p->update(['edit_state' => $d]);
        $row = DB::table('video_exports')->first();
        $this->assertSame(7, json_decode($row->snapshot, true)['tracks']['video'][0]['trim_in']);
        Http::fake(['*/render' => Http::response(['jobId' => 'worker-id'], 202), '*/status/*' => Http::response(['status' => 'done', 'progress' => 1, 'download_url' => '/downloads/worker-id.mp4'])]);
        (new ReconcileVideoExport($id))->handle(app(EditingWorker::class));
        $this->assertDatabaseHas('video_exports', ['id' => $id, 'status' => 'done', 'worker_job_id' => 'worker-id']);
        $this->assertSame('completed', $p->fresh()->status);
        Http::assertSent(fn ($r) => str_ends_with($r->url(), '/render') && $r['editState']['tracks']['video'][0]['trim_in'] === 7 && $r['requestId'] === $id);
    }

    public function test_agent_proposal_is_persistent_and_applied_once(): void
    {
        $u = User::factory()->create();
        $d = json_decode(file_get_contents(base_path('tests/Fixtures/edit-state.json')), true);
        $p = Project::factory()->create(['user_id' => $u->id, 'edit_state' => $d]);
        $d['project_id'] = (string) $p->id;
        $p->update(['edit_state' => $d]);
        $next = $d;
        $next['version'] = $next['revision'] = 2;
        $next['tracks']['subtitles'][0]['style'] = 'arabic_banner';
        $run = (string) Str::uuid();
        Http::fake(['*/agent/plan' => Http::response(['operations' => [['tool' => 'set_subtitle_style', 'params' => ['style' => 'arabic_banner']]], 'reply' => 'Prepared captions', 'source' => 'fixture']), '*/commands' => Http::response(['document' => $next])]);
        $this->actingAs($u)->postJson("/projects/{$p->id}/agent-runs", ['runId' => $run, 'message' => 'Use Arabic banner captions'])->assertOk();
        $this->assertSame(1, $p->fresh()->edit_state['revision']);
        $this->postJson("/projects/{$p->id}/agent-runs/{$run}/execute")->assertOk()->assertJsonPath('revision', 2);
        $this->postJson("/projects/{$p->id}/agent-runs/{$run}/execute")->assertOk();
        $this->assertDatabaseCount('edit_commands', 1);
        $this->assertDatabaseHas('agent_runs', ['id' => $run, 'status' => 'applied']);
    }
}
