<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Preview - {{ $project->name ?? 'Video' }} - VidsAI</title>
    @vite(['resources/css/app.css'])
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080B11; min-height: 100vh; font-family: Arial, sans-serif; }
    </style>
</head>
<body>

    {{-- Inject project data BEFORE the bundle loads --}}
    <script>
        window.__EDIT_STATE__   = @json($project->edit_state ?? null);
        window.__PROJECT_ID__   = {{ $project->id }};
        window.__PROJECT_NAME__ = @json($project->name ?? 'Project');
    </script>

    {{-- Navigation --}}
    <div style="
        display:flex; align-items:center; justify-content:space-between;
        padding:14px 32px; border-bottom:1px solid #1E2D40; background:#0D1117;
    ">
        <span style="color:#F1F5F9; font-size:16px; font-weight:700;">
            VidsAI <span style="color:#475569; font-weight:400;">/ Preview</span>
        </span>
        <div style="display:flex; gap:12px; align-items:center;">
            <span style="color:#475569; font-size:13px;">{{ $project->name ?? '' }}</span>
            <a href="{{ url()->previous() }}" style="
                color:#F1F5F9; text-decoration:none; font-size:13px;
                padding:7px 14px; background:#1E2D40;
                border:1px solid #2D3F55; border-radius:6px;
            ">← Back</a>
            @if($project->final_video_url ?? $project->final_video_path)
            <a href="{{ $project->final_video_url ?? $project->final_video_path }}"
               download style="
                color:#F1F5F9; text-decoration:none; font-size:13px;
                padding:7px 14px; background:#2563EB;
                border:1px solid #1D4ED8; border-radius:6px;
            ">↓ Download</a>
            @endif
        </div>
    </div>

    {{-- Player mount point --}}
    <div style="
        display:flex; justify-content:center; align-items:flex-start;
        padding:40px 20px; min-height:calc(100vh - 57px);
    ">
        <div id="vidsai-preview-root" style="width:100%; max-width:960px;">
            <div style="
                display:flex; align-items:center; justify-content:center;
                padding:80px; color:#475569; font-size:14px;
            ">Loading preview...</div>
        </div>
    </div>

    {{-- Self-contained IIFE bundle --}}
    <script src="{{ asset('js/remotion-player/vidsai-player.iife.js') }}"></script>

    {{-- Mount after bundle loads --}}
    <script>
        (function () {
            const Player = window.VidsAIPlayer;

            if (!Player || !Player.VideoPreviewPlayer) {
                document.getElementById('vidsai-preview-root').innerHTML =
                    '<div style="color:#ef4444;padding:40px;text-align:center;font-family:Arial">Player failed to load. Check console for details.</div>';
                return;
            }

            const React = Player.React || window.React;
            const ReactDOM = Player.ReactDOM || window.ReactDOM;

            if (!React || !ReactDOM || !ReactDOM.createRoot) {
                document.getElementById('vidsai-preview-root').innerHTML =
                    '<div style="color:#ef4444;padding:40px;text-align:center;font-family:Arial">React not available. Check console for details.</div>';
                return;
            }

            ReactDOM.createRoot(document.getElementById('vidsai-preview-root')).render(
                React.createElement(Player.VideoPreviewPlayer, {
                    editState: window.__EDIT_STATE__ ?? null,
                    projectId: window.__PROJECT_ID__,
                    projectName: window.__PROJECT_NAME__,
                    acknowledgeRemotionLicense: true,
                })
            );
        })();
    </script>

</body>
</html>
