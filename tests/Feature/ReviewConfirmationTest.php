<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Scene;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ReviewConfirmationTest extends TestCase
{
    use RefreshDatabase;

    public function test_confirming_an_image_keeps_it_an_image_and_preserves_caption_edits(): void
    {
        $u = User::factory()->create();
        $d = json_decode(file_get_contents(base_path('tests/Fixtures/edit-state.json')), true);
        $p = Project::factory()->create(['user_id' => $u->id, 'status' => 'reviewing', 'edit_state' => $d]);
        $scene = Scene::factory()->create(['project_id' => $p->id, 'scene_number' => 1, 'type' => 'image', 'video_url' => 'https://example.com/a.png', 'duration_seconds' => 2, 'trimmed_duration' => 2]);
        $this->actingAs($u)->postJson("/review/{$p->id}/confirm", ['scenes' => [['scene_id' => $scene->id, 'video_url' => $scene->video_url, 'duration' => 2, 'start_time' => 0, 'end_time' => 2]]])->assertOk();
        $this->assertSame('image', $scene->fresh()->type);
        $this->assertSame($d['tracks']['subtitles'], $p->fresh()->edit_state['tracks']['subtitles']);
        $this->assertEquals(2, $p->fresh()->edit_state['revision']);
        $this->assertFalse(\Illuminate\Support\Facades\Route::has('health.check'));
        $this->withoutExceptionHandling();
        $this->get(route('projects.subtitle-styles', $p))->assertOk()
            ->assertSee('id="stylesSection"', false);
    }

    public function test_invalid_source_window_changes_no_scene(): void
    {
        $u = User::factory()->create();
        $p = Project::factory()->create(['user_id' => $u->id, 'status' => 'reviewing']);
        $scene = Scene::factory()->create(['project_id' => $p->id, 'duration_seconds' => 5, 'start_time' => 0, 'end_time' => 5]);
        $this->actingAs($u)->postJson("/review/{$p->id}/confirm", ['scenes' => [['scene_id' => $scene->id, 'video_url' => 'https://example.com/a.mp4', 'duration' => 2, 'start_time' => 4, 'end_time' => 2]]])->assertUnprocessable();
        $this->assertEquals(0, $scene->fresh()->start_time);
        $this->assertSame('reviewing', $p->fresh()->status);
    }

    public function test_uploaded_voiceover_is_prepared_locally_without_an_external_upload(): void
    {
        Storage::fake('public');Storage::disk('public')->put('voiceovers/test.wav','test recording');
        $user=User::factory()->create();
        $project=Project::factory()->create(['user_id'=>$user->id,'voiceover_option'=>'upload','voiceover_file'=>'voiceovers/test.wav']);
        $this->actingAs($user)->postJson(route('projects.prepare-voiceover',$project))->assertOk()
            ->assertJson(['success'=>true,'voiceover_url'=>route('projects.voiceover',$project)]);
        $this->assertSame(route('projects.voiceover',$project),$project->fresh()->voiceover_url);
        Http::assertNothingSent();
    }
}
