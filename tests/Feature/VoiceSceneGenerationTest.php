<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class VoiceSceneGenerationTest extends TestCase
{
    use RefreshDatabase;

    public function test_project_with_uploaded_voice_generates_scenes_immediately()
    {
        // Create a test user
        $user = User::factory()->create();
        
        // Mock the HTTP response from n8n
        Http::fake([
            'https://n8n-projects-jqkw.onrender.com/webhook-test/generate-scenes-from-voice' => Http::response([
                [
                    'all_videos' => [
                        [
                            'phrase' => 'Introducing SolarBottle',
                            'video_url' => 'https://videos.pexels.com/video-files/33004948/14071037_640_360_25fps.mp4',
                            'duration_seconds' => 5.2
                        ],
                        [
                            'phrase' => 'the smart water bottle',
                            'video_url' => 'https://videos.pexels.com/video-files/5197249/5197249-hd_1920_1080_25fps.mp4',
                            'duration_seconds' => 4.8
                        ]
                    ]
                ]
            ], 200)
        ]);

        // Create a fake audio file
        Storage::fake('public');
        $audioFile = UploadedFile::fake()->create('test-voice.wav', 1000, 'audio/wav');

        // Submit the project creation form
        $response = $this->actingAs($user)->post(route('projects.store'), [
            'name' => 'Test Project',
            'type' => 'product',
            'category' => 'technology',
            'description' => 'A revolutionary device for hydration and charging.',
            'language' => 'english',
            'video_format' => ['16:9'],
            'script_option' => 'paste',
            'custom_script' => 'Introducing SolarBottle, the smart water bottle that powers your phone while you hydrate.',
            'voiceover_option' => 'upload',
            'voiceover_file' => $audioFile
        ]);

        // Assert the project was created
        $this->assertDatabaseHas('projects', [
            'name' => 'Test Project',
            'status' => 'reviewing'
        ]);

        // Assert scenes were created
        $project = Project::where('name', 'Test Project')->first();
        $this->assertCount(2, $project->scenes);

        // Assert scene data is correct
        $firstScene = $project->scenes->first();
        $this->assertEquals('Introducing SolarBottle', $firstScene->script_text);
        $this->assertEquals('https://videos.pexels.com/video-files/33004948/14071037_640_360_25fps.mp4', $firstScene->video_url);
        $this->assertEquals(5.2, $firstScene->duration_seconds);

        // Assert redirect to review page
        $response->assertRedirect(route('projects.review', $project->id));
    }

    public function test_project_without_uploaded_voice_uses_original_workflow()
    {
        // Create a test user
        $user = User::factory()->create();
        
        // Mock the original n8n webhook
        Http::fake([
            config('services.n8n.webhook_url') => Http::response(['job_id' => 'test-job-123'], 200)
        ]);

        // Submit the project creation form without voiceover upload
        $response = $this->actingAs($user)->post(route('projects.store'), [
            'name' => 'Test Project AI Voice',
            'type' => 'product',
            'category' => 'technology',
            'description' => 'A revolutionary device for hydration and charging.',
            'language' => 'english',
            'video_format' => ['16:9'],
            'script_option' => 'generate',
            'voiceover_option' => 'ai'
        ]);

        // Assert the project was created with processing status
        $this->assertDatabaseHas('projects', [
            'name' => 'Test Project AI Voice',
            'status' => 'processing'
        ]);

        // Assert redirect to processing page
        $project = Project::where('name', 'Test Project AI Voice')->first();
        $response->assertRedirect(route('projects.processing', $project->id));
    }
}
