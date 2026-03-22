<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $project->name ?? 'Editor' }} - VidsAI</title>
    @vite(['resources/css/app.css'])
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            background: #080B11;
            color: #F1F5F9;
            font-family: Arial, sans-serif;
            height: 100vh;
            overflow: hidden;
        }
    </style>
</head>
<body>

    {{-- Inject all data needed by the editor JS --}}
    <script>
        window.__EDIT_STATE__     = @json($project->edit_state ?? null);
        window.__PROJECT_ID__     = {{ $project->id }};
        window.__PROJECT_NAME__   = @json($project->name ?? 'Project');
        window.__PROJECT_STATUS__ = @json($project->status);
        window.__CSRF_TOKEN__     = '{{ csrf_token() }}';
        window.__CHAT_URL__       = '{{ route('projects.chat', $project) }}';
        window.__EDIT_STATE_URL__ = '{{ route('projects.edit-state', $project) }}';
        window.__EXPORT_URL__     = '{{ route('projects.export', $project) }}';
        window.__FINAL_VIDEO_URL__= @json($project->final_video_url ?? $project->final_video_path ?? null);
        window.__VOICEOVER_URL__  = @json($project->voiceover_url ?? null);
    </script>

    {{-- Editor shell - split layout placeholder, full UI in next prompt --}}
    <div id="editor-root" style="
        display: flex;
        height: 100vh;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 12px;
        color: #475569;
    ">
        <div style="font-size:18px; font-weight:700; color:#F1F5F9;">
            Editor Backend Ready
        </div>
        <div style="font-size:13px;">
            Project: <strong style="color:#F1F5F9">{{ $project->name ?? 'Project' }}</strong>
            - Status: <strong style="color:#38BDF8">{{ $project->status }}</strong>
        </div>
        <div style="font-size:13px;">
            Edit state: <strong style="color:#F1F5F9">{{ $project->edit_state ? 'Ready' : 'Not yet generated' }}</strong>
        </div>
        <div style="font-size:12px; color:#334155; margin-top:8px;">
            Chat endpoint: POST {{ route('projects.chat', $project) }}
        </div>
    </div>

    {{-- Remotion Player bundle for next prompt --}}
    <script src="{{ asset('js/remotion-player/vidsai-player.iife.js') }}"></script>

</body>
</html>
