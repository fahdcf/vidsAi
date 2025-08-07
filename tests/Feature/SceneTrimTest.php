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

    public function test_trim_scenes_sends_correct_data_to_n8n_webhook()
    {
        // Create a test user and project
        $user = User::factory()->create();
        $project = Project::factory()->create([
            'user_id' => $user->id,
            'name' => 'Test Trim Project',
            'status' => 'reviewing'
        ]);

        // Create test scenes
        $scene1 = Scene::factory()->create([
            'project_id' => $project->id,
            'scene_number' => 1,
            'script_text' => 'First scene text',
            'video_url' => 'https://example.com/video1.mp4',
            'duration_seconds' => 10.5
        ]);

        $scene2 = Scene::factory()->create([
            'project_id' => $project->id,
            'scene_number' => 2,
            'script_text' => 'Second scene text',
            'video_url' => 'https://example.com/video2.mp4',
            'duration_seconds' => 8.3
        ]);

        // Mock the n8n trim webhook response
        Http::fake([
            'https://n8n-projects-jqkw.onrender.com/webhook-test/trim-scenes' => Http::response([
                'success' => true,
                'message' => 'Scenes trimmed successfully'
            ], 200)
        ]);

        // Prepare trim data
        $trimData = [
            'scenes' => [
                [
                    'scene_id' => $scene1->id,
                    'video_url' => 'https://example.com/video1.mp4',
                    'duration' => 5.2,
                    'start_time' => 2.0,
                    'end_time' => 7.2
                ],
                [
                    'scene_id' => $scene2->id,
                    'video_url' => 'https://example.com/video2.mp4',
                    'duration' => 4.1,
                    'start_time' => 1.5,
                    'end_time' => 5.6
                ]
            ]
        ];

        // Make the trim request
        $response = $this->actingAs($user)
            ->postJson(route('projects.trim-scenes', $project), $trimData);

        // Assert successful response
        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Scenes trimmed successfully! Your video is being processed.'
            ]);

        // Assert the project status was updated
        $project->refresh();
        $this->assertEquals('completed', $project->status);

        // Assert the correct data was sent to n8n
        Http::assertSent(function ($request) use ($project, $scene1, $scene2) {
            $data = $request->data();
            
            return $request->url() === 'https://n8n-projects-jqkw.onrender.com/webhook-test/trim-scenes' &&
                   $data['project_id'] === $project->id &&
                   $data['project_name'] === $project->name &&
                   count($data['scenes']) === 2 &&
                   $data['scenes'][0]['scene_id'] === $scene1->id &&
                   $data['scenes'][0]['video_url'] === 'https://example.com/video1.mp4' &&
                   $data['scenes'][0]['duration'] === 5.2 &&
                   $data['scenes'][0]['start_time'] === 2.0 &&
                   $data['scenes'][0]['end_time'] === 7.2 &&
                   $data['scenes'][0]['scene_number'] === 1 &&
                   $data['scenes'][0]['script_text'] === 'First scene text';
        });
    }

    public function test_trim_scenes_validates_required_fields()
    {
        $user = User::factory()->create();
        $project = Project::factory()->create([
            'user_id' => $user->id,
            'status' => 'reviewing'
        ]);

        // Test with missing scenes data
        $response = $this->actingAs($user)
            ->postJson(route('projects.trim-scenes', $project), []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['scenes']);

        // Test with invalid scene data
        $response = $this->actingAs($user)
            ->postJson(route('projects.trim-scenes', $project), [
                'scenes' => [
                    [
                        'scene_id' => 'invalid',
                        // missing required fields
                    ]
                ]
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors([
                'scenes.0.video_url',
                'scenes.0.duration',
                'scenes.0.start_time',
                'scenes.0.end_time'
            ]);
    }

    public function test_trim_scenes_handles_n8n_webhook_failure()
    {
        $user = User::factory()->create();
        $project = Project::factory()->create([
            'user_id' => $user->id,
            'status' => 'reviewing'
        ]);

        $scene = Scene::factory()->create([
            'project_id' => $project->id,
            'scene_number' => 1
        ]);

        // Mock n8n webhook failure
        Http::fake([
            'https://n8n-projects-jqkw.onrender.com/webhook-test/trim-scenes' => Http::response([
                'error' => 'Processing failed'
            ], 500)
        ]);

        $trimData = [
            'scenes' => [
                [
                    'scene_id' => $scene->id,
                    'video_url' => 'https://example.com/video.mp4',
                    'duration' => 5.0,
                    'start_time' => 0.0,
                    'end_time' => 5.0
                ]
            ]
        ];

        $response = $this->actingAs($user)
            ->postJson(route('projects.trim-scenes', $project), $trimData);

        $response->assertStatus(500)
            ->assertJson([
                'success' => false
            ]);

        // Assert project status was not changed
        $project->refresh();
        $this->assertEquals('reviewing', $project->status);
    }
}
