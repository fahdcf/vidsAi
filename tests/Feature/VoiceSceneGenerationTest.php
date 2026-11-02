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

    public function test_generated_scene_offsets_are_local_to_each_stock_source_and_can_be_confirmed(): void
    {
        $user=User::factory()->create();
        $project=Project::factory()->create(['user_id'=>$user->id,'status'=>'reviewing']);
        $data=[
            ['phrase'=>'Discover our bottle','video_url'=>'https://example.com/one.mp4','duration_seconds'=>20,'source_duration_seconds'=>20,'gemini_duration'=>2,'start_time'=>0,'end_time'=>2],
            ['phrase'=>'Take it everywhere','video_url'=>'https://example.com/two.mp4','duration_seconds'=>30,'source_duration_seconds'=>30,'gemini_duration'=>2,'start_time'=>2,'end_time'=>4],
        ];
        $job=new GenerateScenesFromVoiceJob($project);
        (new \ReflectionMethod($job,'createScenesFromResponse'))->invoke($job,$project,$data);
        $scenes=$project->scenes()->orderBy('scene_number')->get();
        $this->assertEquals(30,$scenes[1]->duration_seconds);
        $this->assertEquals(0,$scenes[1]->start_time);
        $this->assertEquals(2,$scenes[1]->end_time);
        $this->assertEquals(2,$scenes[1]->gemini_duration);
        $this->actingAs($user)->postJson('/review/'.$project->id.'/confirm',['scenes'=>$scenes->map(fn($s)=>['scene_id'=>$s->id,'video_url'=>$s->video_url,'duration'=>2,'start_time'=>0,'end_time'=>2])->all()])->assertOk();
    }

    public function test_short_planned_scenes_keep_a_real_stock_source_when_merged(): void
    {
        $project=Project::factory()->create();$job=new GenerateScenesFromVoiceJob($project);
        $data=[
            ['phrase'=>'A brief opening','video_url'=>'https://example.com/one.mp4','duration_seconds'=>20,'source_duration_seconds'=>20,'gemini_duration'=>.5,'start_time'=>0,'end_time'=>.5],
            ['phrase'=>'Discover our reusable bottle','video_url'=>'https://example.com/two.mp4','duration_seconds'=>30,'source_duration_seconds'=>30,'gemini_duration'=>2.5,'start_time'=>.5,'end_time'=>3],
        ];
        $merged=(new \ReflectionMethod($job,'enforceSceneQualityRules'))->invoke($job,$data,3,1.5);
        $this->assertCount(1,$merged);
        $this->assertEquals('https://example.com/two.mp4',$merged[0]['video_url']);
        $this->assertEquals(30,$merged[0]['source_duration_seconds']);
        $this->assertEquals(3,$merged[0]['gemini_duration']);
    }
}
