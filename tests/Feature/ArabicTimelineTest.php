<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Scene;
use App\Services\EditStateBuilder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ArabicTimelineTest extends TestCase
{
    use RefreshDatabase;

    public function test_arabic_phrases_align_to_their_own_words(): void
    {
        $p = Project::factory()->create(['language' => 'arabic', 'subtitles_script' => ['مرحبا بكم', 'اشتروا الآن'], 'voiceover_transcript' => [['word' => 'مرحبا', 'start' => 0, 'end' => .8], ['word' => 'بكم', 'start' => .8, 'end' => 1.8], ['word' => 'اشتروا', 'start' => 2, 'end' => 2.8], ['word' => 'الآن', 'start' => 2.8, 'end' => 4]]]);
        foreach (['مرحبا بكم', 'اشتروا الآن'] as $i => $text) {
            Scene::factory()->create(['project_id' => $p->id, 'scene_number' => $i + 1, 'script_text' => $text, 'duration_seconds' => 2, 'trimmed_duration' => 2, 'start_time' => 0, 'end_time' => 2, 'video_url' => 'https://example.com/scene.mp4']);
        }
        $d = app(EditStateBuilder::class)->build($p);
        $subs = $d['tracks']['subtitles'];
        $this->assertCount(2, $subs);
        $this->assertGreaterThanOrEqual(50, $subs[1]['start_frame']);
        $this->assertLessThanOrEqual($subs[1]['start_frame'], $subs[0]['end_frame']);
        $this->assertSame(0, $subs[1]['words'][0]['start_frame']);
    }
}
