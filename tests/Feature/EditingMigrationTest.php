<?php

namespace Tests\Feature;

use App\Models\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class EditingMigrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_data_migration_refuses_to_overwrite_a_concurrent_edit(): void
    {
        $d = json_decode(file_get_contents(base_path('tests/Fixtures/edit-state.json')), true);
        $p = Project::factory()->create(['edit_state' => $d]);
        $d['project_id'] = (string) $p->id;
        $p->update(['edit_state' => $d]);
        Http::fake(function () use ($p, $d) {
            $new = $d;
            $new['version'] = $new['revision'] = 2;
            $p->fresh()->update(['edit_state' => $new]);

            return Http::response(['document' => $d]);
        });
        $this->artisan('editing:migrate', ['--project' => $p->id])->assertExitCode(1);
        $this->assertSame(2, $p->fresh()->edit_state['revision']);
        $this->assertDatabaseCount('edit_revisions', 0);
    }
}
