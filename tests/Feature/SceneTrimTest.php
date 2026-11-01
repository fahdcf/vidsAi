<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Scene;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SceneTrimTest extends TestCase
{
    use RefreshDatabase;

    private function project(User $user): Project
    {
        $d = json_decode(file_get_contents(base_path('tests/Fixtures/edit-state.json')), true);
        $p = Project::factory()->create(['user_id' => $user->id, 'status' => 'subtitle_selection']);
        $d['project_id'] = (string) $p->id;
        $p->update(['edit_state' => $d]);

        return $p;
    }

    public function test_trim_command_is_saved_once_with_revision_and_source_offsets(): void
    {
        $u = User::factory()->create();
        $p = $this->project($u);
        $d = $p->edit_state;
        $d['tracks']['video'][0]['trim_in'] = 5;
        $d['tracks']['video'][0]['trim_out'] = 20;
        $d['version'] = $d['revision'] = 2;
        Http::fake(['*/commands' => Http::response(['document' => $d])]);
        $command = ['commandId' => (string) \Illuminate\Support\Str::uuid(), 'expectedRevision' => 1, 'operations' => [['tool' => 'trim_clip', 'params' => ['id' => 'a', 'trim_in' => 5, 'trim_out' => 20]]]];
        $this->actingAs($u)->postJson("/projects/{$p->id}/commands", $command)->assertOk()->assertJsonPath('revision', 2);
        $this->postJson("/projects/{$p->id}/commands", $command)->assertOk();
        Http::assertSentCount(1);
        Http::assertSent(fn ($r) => $r['document']['tracks']['video'][0]['trim_in'] === 0 && $r['command']['operations'][0]['params']['trim_in'] === 5);
        $this->assertEquals(5, $p->fresh()->edit_state['tracks']['video'][0]['trim_in']);
        $this->assertDatabaseCount('edit_revisions', 2);
        $this->assertDatabaseCount('edit_commands', 1);
    }

    public function test_stale_edits_and_invalid_envelopes_are_rejected(): void
    {
        $u = User::factory()->create();
        $p = $this->project($u);
        Http::fake();
        $this->actingAs($u)->postJson("/projects/{$p->id}/commands", [])->assertUnprocessable();
        $this->postJson("/projects/{$p->id}/commands", ['commandId' => (string) \Illuminate\Support\Str::uuid(), 'expectedRevision' => 0, 'operations' => [['tool' => 'set_transition', 'params' => []]]])->assertConflict();
        Http::assertNothingSent();
    }

    public function test_another_account_cannot_open_or_edit_project_or_scene(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $p = $this->project($owner);
        $scene = Scene::factory()->create(['project_id' => $p->id]);
        $this->actingAs($other)->get("/projects/{$p->id}/editor")->assertForbidden();
        $this->postJson("/projects/{$p->id}/commands", [])->assertForbidden();
        $this->putJson("/scenes/{$scene->id}/update", ['video_url' => 'https://example.com/a.mp4'])->assertForbidden();
        $this->getJson("/projects/{$p->id}/edit-state")->assertForbidden();
    }
}
