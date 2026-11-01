<?php

namespace Tests\Feature;

use App\Jobs\GenerateScenesFromVoiceJob;
use App\Models\Project;
use App\Models\User;
use App\Services\SceneGenerationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class VoiceSceneGenerationTest extends TestCase
{
    use RefreshDatabase;

    private function input(): array
    {
        return ['name' => 'Voice test', 'type' => 'product', 'category' => 'Demo', 'description' => 'A useful product', 'language' => 'english', 'video_format' => ['16:9'], 'script_option' => 'paste', 'custom_script' => 'Hello world', 'voiceover_option' => 'upload'];
    }

    public function test_upload_creates_project_and_dispatches_generation(): void
    {
        Queue::fake();
        Storage::fake('public');
        $u = User::factory()->create();
        $r = $this->actingAs($u)->post('/create', [...$this->input(), 'voiceover_file' => UploadedFile::fake()->create('voice.wav', 10, 'audio/wav')]);
        $p = Project::firstOrFail();
        $r->assertRedirect(route('projects.processing', $p));
        Storage::disk('public')->assertExists($p->voiceover_file);
        Queue::assertPushed(GenerateScenesFromVoiceJob::class, fn ($j) => $j->project->id === $p->id);
    }

    public function test_generation_job_stores_scenes_transcript_and_caption_script(): void
    {
        Storage::fake('public');
        $p = Project::factory()->withUploadedVoiceover()->create(['custom_script' => 'Hello world', 'script_option' => 'paste', 'status' => 'processing']);
        $this->mock(SceneGenerationService::class)->shouldReceive('generateScenesFromVoice')->once()->andReturn(['all_videos' => [['phrase' => 'Hello world', 'video_url' => 'https://example.com/clip.mp4', 'duration_seconds' => 2]], 'voice_over_transcript' => [['word' => 'Hello', 'start' => 0, 'end' => 1], ['word' => 'world', 'start' => 1, 'end' => 2]], 'subtitles_script' => ['Hello world']]);
        (new GenerateScenesFromVoiceJob($p))->handle();
        $p->refresh();
        $this->assertEquals('reviewing', $p->status);
        $this->assertCount(1, $p->scenes);
        $this->assertCount(2, $p->voiceover_transcript);
        $this->assertEquals(['Hello world'], $p->subtitles_script);
    }

    public function test_unimplemented_creation_modes_are_rejected_before_creating_stuck_projects(): void
    {
        $u = User::factory()->create();
        foreach (['ai', 'none'] as $mode) {
            $this->actingAs($u)->postJson('/create', [...$this->input(), 'voiceover_option' => $mode])->assertUnprocessable()->assertJsonValidationErrors('voiceover_option');
        }$this->assertDatabaseCount('projects',0);
    }
}
