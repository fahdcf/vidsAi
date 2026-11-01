<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

class ProjectAssetController extends Controller
{
    public function upload(Request $r, Project $project)
    {
        $this->authorize('update', $project);
        $r->validate(['file' => 'required|file|mimes:jpg,jpeg,png,webp,mp4,webm,mp3,wav|max:102400']);
        $file = $r->file('file');
        $id = (string) Str::uuid();
        $path = $file->store("project-assets/{$project->id}", 'local');
        DB::table('project_assets')->insert(['id' => $id, 'project_id' => $project->id, 'path' => $path, 'name' => $file->getClientOriginalName(), 'mime' => $file->getMimeType(), 'size' => $file->getSize(), 'created_at' => now(), 'updated_at' => now()]);

        return response()->json(['asset_id' => $id, 'url' => route('projects.asset', ['project' => $project, 'asset' => $id]), 'media_type' => str_starts_with($file->getMimeType(), 'image/') ? 'image' : 'video']);
    }

    public function show(Request $r, Project $project, string $asset)
    {
        if (! $r->hasValidSignature()) {
            $this->authorize('view', $project);
        }
        $row = DB::table('project_assets')->where('id', $asset)->where('project_id', $project->id)->first();
        abort_unless($row, 404);

        return response()->file(Storage::disk('local')->path($row->path), ['Content-Type' => $row->mime, 'Cache-Control' => 'private, max-age=3600']);
    }

    public static function renderSnapshot(array $d, int $projectId): array
    {
        foreach (['video' => 'clip_url', 'overlays' => 'src', 'audio' => 'url'] as $track => $field) {
            foreach ($d['tracks'][$track] as &$item) {
                $url = $item[$field] ?? '';
                $path = parse_url($url, PHP_URL_PATH);
                if (is_string($path) && preg_match('#^/projects/(\d+)/assets/([a-f0-9-]{36})$#', $path, $m)) {
                    abort_unless((int) $m[1] === $projectId && DB::table('project_assets')->where('id', $m[2])->where('project_id', $projectId)->exists(), 422, 'Asset does not belong to this project');
                    $item['asset_id'] = $m[2];
                    $item[$field] = URL::temporarySignedRoute('projects.asset', now()->addDay(), ['project' => $projectId, 'asset' => $m[2]]);
                }
            }
        }
        unset($item);

        return $d;
    }
}
