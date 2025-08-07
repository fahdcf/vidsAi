<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VoiceoverTranscriptTest extends TestCase
{
    use RefreshDatabase;

    public function test_project_can_store_voiceover_transcript()
    {
        $user = User::factory()->create();
        
        $project = Project::factory()->create([
            'user_id' => $user->id,
            'voiceover_transcript' => [
                [
                    'word' => 'hello',
                    'start' => 0.0,
                    'end' => 0.5,
                    'confidence' => 0.99
                ],
                [
                    'word' => 'world',
                    'start' => 0.5,
                    'end' => 1.0,
                    'confidence' => 0.95
                ]
            ]
        ]);

        $this->assertTrue($project->hasVoiceoverTranscript());
        $this->assertEquals(2, $project->getTranscriptWordsCount());
        $this->assertEquals(1.0, $project->getTranscriptDuration());
        
        $transcript = $project->getVoiceoverTranscript();
        $this->assertIsArray($transcript);
        $this->assertCount(2, $transcript);
        $this->assertEquals('hello', $transcript[0]['word']);
        $this->assertEquals('world', $transcript[1]['word']);
    }

    public function test_project_without_transcript_returns_correct_values()
    {
        $user = User::factory()->create();
        
        $project = Project::factory()->create([
            'user_id' => $user->id,
            'voiceover_transcript' => null
        ]);

        $this->assertFalse($project->hasVoiceoverTranscript());
        $this->assertEquals(0, $project->getTranscriptWordsCount());
        $this->assertEquals(0.0, $project->getTranscriptDuration());
        $this->assertNull($project->getVoiceoverTranscript());
    }

    public function test_transcript_endpoint_returns_data_for_authorized_user()
    {
        $user = User::factory()->create();
        
        $project = Project::factory()->create([
            'user_id' => $user->id,
            'voiceover_transcript' => [
                [
                    'word' => 'test',
                    'start' => 0.0,
                    'end' => 0.5,
                    'confidence' => 0.99
                ]
            ]
        ]);

        $response = $this->actingAs($user)
            ->getJson("/projects/{$project->id}/transcript");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'project_id' => $project->id,
                    'project_name' => $project->name,
                    'words_count' => 1,
                    'duration_seconds' => 0.5
                ]
            ]);
    }

    public function test_transcript_endpoint_returns_404_for_project_without_transcript()
    {
        $user = User::factory()->create();
        
        $project = Project::factory()->create([
            'user_id' => $user->id,
            'voiceover_transcript' => null
        ]);

        $response = $this->actingAs($user)
            ->getJson("/projects/{$project->id}/transcript");

        $response->assertStatus(404)
            ->assertJson([
                'success' => false,
                'message' => 'No voiceover transcript available for this project.'
            ]);
    }

    public function test_unauthorized_user_cannot_access_transcript()
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        
        $project = Project::factory()->create([
            'user_id' => $owner->id,
            'voiceover_transcript' => [
                ['word' => 'test', 'start' => 0.0, 'end' => 0.5, 'confidence' => 0.99]
            ]
        ]);

        $response = $this->actingAs($otherUser)
            ->getJson("/projects/{$project->id}/transcript");

        $response->assertStatus(403);
    }
}
