<?php

namespace Tests\Feature;

use App\Http\Controllers\ProjectAssetController;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProjectAssetTest extends TestCase
{
    public function test_uploaded_voiceover_is_private_and_gets_signed_worker_access_including_saved_legacy_urls(): void
    {
        Storage::fake('public');Storage::disk('public')->put('voiceovers/test.wav','wave fixture');
        $owner=User::factory()->create();$other=User::factory()->create();
        $p=Project::factory()->create(['user_id'=>$owner->id,'voiceover_file'=>'voiceovers/test.wav']);
        $url=route('projects.voiceover',$p);
        $this->get($url)->assertForbidden();
        $this->actingAs($owner)->get($url)->assertOk();
        $this->actingAs($other)->get($url)->assertForbidden();
        $d=json_decode(file_get_contents(base_path('tests/Fixtures/edit-state.json')),true);
        $d['tracks']['audio']=[['id'=>'voiceover','type'=>'voiceover','url'=>url('/storage/voiceovers/test.wav')]];
        $signed=ProjectAssetController::renderSnapshot($d,$p->id);
        $this->assertStringContainsString('/projects/'.$p->id.'/voiceover?', $signed['tracks']['audio'][0]['url']);
        $this->get($signed['tracks']['audio'][0]['url'])->assertOk();
        $this->assertStringContainsString('/storage/voiceovers/test.wav',$d['tracks']['audio'][0]['url']);
        $d['tracks']['audio'][0]['url']=$url;
        $signed=ProjectAssetController::renderSnapshot($d,$p->id);
        $this->get($signed['tracks']['audio'][0]['url'])->assertOk();
    }

    use RefreshDatabase;

    public function test_private_upload_uses_a_stable_id_and_signed_render_access(): void
    {
        Storage::fake('local');
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $p = Project::factory()->create(['user_id' => $owner->id]);
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=');
        $response = $this->actingAs($owner)->postJson("/projects/{$p->id}/assets", ['file' => UploadedFile::fake()->createWithContent('image.png', $png)])->assertOk();
        $asset = $response->json();
        $this->assertNotEmpty($asset['asset_id']);
        $this->get($asset['url'])->assertOk();
        $this->actingAs($other)->get($asset['url'])->assertForbidden();
        $this->postJson("/projects/{$p->id}/assets", [])->assertForbidden();
        $d = json_decode(file_get_contents(base_path('tests/Fixtures/edit-state.json')), true);
        $d['tracks']['video'][0]['clip_url'] = $asset['url'];
        $signed = ProjectAssetController::renderSnapshot($d, $p->id);
        $this->get($signed['tracks']['video'][0]['clip_url'])->assertOk();
        $this->assertStringContainsString('signature=', $signed['tracks']['video'][0]['clip_url']);
        $this->assertSame($asset['url'], $d['tracks']['video'][0]['clip_url']);
    }
}
