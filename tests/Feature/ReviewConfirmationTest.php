<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Scene;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
}
