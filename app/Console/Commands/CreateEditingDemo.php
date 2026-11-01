<?php

namespace App\Console\Commands;

use App\Models\Project;
use App\Models\Scene;
use App\Models\User;
use Illuminate\Console\Command;

class CreateEditingDemo extends Command
{
    protected $signature = 'editing:demo {email}';

    protected $description = 'Create a deterministic local editing project for an existing account';

    public function handle(): int
    {
        $user = User::where('email', $this->argument('email'))->first();
        if (! $user) {
            $this->error('Register this account first.');

            return self::FAILURE;
        }
        $project = Project::create(['user_id' => $user->id, 'name' => 'Migration verification · English + العربية', 'type' => 'product', 'category' => 'Demo', 'description' => 'Deterministic local migration fixture', 'language' => 'arabic', 'video_format' => ['16:9'], 'script_option' => 'paste', 'custom_script' => 'Hello · مرحبا بالعالم', 'voiceover_option' => 'upload', 'status' => 'subtitle_selection']);
        $d = json_decode(file_get_contents(base_path('tests/Fixtures/edit-state.json')), true);
        $d['project_id'] = (string) $project->id;
        foreach ($d['tracks']['video'] as $i => &$clip) {
            $clip['clip_url'] = url('/'.$clip['clip_url']);
            Scene::create(['project_id' => $project->id, 'scene_number' => $i + 1, 'script_text' => $i ? 'مرحبا بالعالم' : 'Hello', 'video_url' => $clip['clip_url'], 'duration_seconds' => 1, 'trimmed_duration' => 1, 'start_time' => 0, 'end_time' => 1, 'type' => 'image', 'status' => 'completed', 'approved' => true]);
        }unset($clip);
        $project->update(['edit_state' => $d]);
        $this->line((string) $project->id);

        return self::SUCCESS;
    }
}
