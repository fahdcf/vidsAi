<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $project->name ?? 'Editor' }} — VidsAI</title>
    @vite(['resources/css/app.css'])
    <meta name="csrf-token" content="{{ csrf_token() }}">

    {{-- WaveSurfer.js for waveform --}}
    <script src="https://cdnjs.cloudflare.com/ajax/libs/wavesurfer.js/7.8.7/wavesurfer.min.js"></script>

    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
            --bg:      #080B11;
            --surface: #0D1117;
            --border:  #1E2D40;
            --accent:  #2563EB;
            --sky:     #38BDF8;
            --text:    #F1F5F9;
            --muted:   #475569;
            --radius:  8px;
        }

        body {
            background: var(--bg);
            color: var(--text);
            font-family: Arial, sans-serif;
            height: 100vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }

        /* -- Top bar ---------------------------------------------------- */
        #top-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 20px;
            background: var(--surface);
            border-bottom: 1px solid var(--border);
            flex-shrink: 0;
            height: 52px;
        }

        #top-bar .left {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        #top-bar .brand {
            font-size: 15px;
            font-weight: 700;
            color: var(--text);
        }

        #top-bar .project-name {
            font-size: 13px;
            color: var(--muted);
        }

        #top-bar .status-badge {
            font-size: 11px;
            padding: 3px 8px;
            border-radius: 20px;
            background: var(--border);
            color: var(--sky);
            font-weight: 600;
        }

        #top-bar .right {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .btn-back {
            padding: 7px 14px;
            background: var(--border);
            color: var(--text);
            border: 1px solid #2D3F55;
            border-radius: 6px;
            font-size: 12px;
            cursor: pointer;
            text-decoration: none;
            font-family: Arial;
        }

        .btn-export {
            padding: 7px 16px;
            background: var(--accent);
            color: var(--text);
            border: none;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
            font-family: Arial;
        }

        .btn-export:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        /* -- Main area -------------------------------------------------- */
        #main-area {
            display: flex;
            flex-direction: row;
            flex: 1;
            overflow: hidden;
            min-height: 0;
            height: calc(100vh - 52px);
            position: relative;
        }

        /* -- Left panel - Chat ----------------------------------------- */
        #chat-panel {
            width: 340px;
            min-width: 220px;
            max-width: 600px;
            flex-shrink: 0;
            display: flex;
            flex-direction: column;
            border-right: none;
            background: var(--surface);
            overflow: hidden;
            height: 100%;
            min-height: 0;
        }

        #resize-handle {
            width: 6px;
            background: var(--border);
            cursor: col-resize;
            flex-shrink: 0;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.15s;
            z-index: 10;
        }

        #resize-handle:hover,
        #resize-handle.dragging {
            background: var(--accent);
        }

        #resize-grip {
            width: 2px;
            height: 32px;
            background: var(--muted);
            border-radius: 2px;
            opacity: 0.5;
        }

        #resize-handle:hover #resize-grip,
        #resize-handle.dragging #resize-grip {
            opacity: 1;
            background: white;
        }

        #chat-header {
            padding: 12px 16px;
            border-bottom: 1px solid var(--border);
            font-size: 13px;
            font-weight: 700;
            color: var(--text);
            flex-shrink: 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        #chat-header .ai-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #22C55E;
        }

        #chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            min-height: 0;
        }

        #chat-messages::-webkit-scrollbar { width: 4px; }
        #chat-messages::-webkit-scrollbar-track { background: transparent; }
        #chat-messages::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

        .chat-msg {
            display: flex;
            flex-direction: column;
            gap: 3px;
        }

        .chat-msg.user {
            align-items: flex-end;
        }

        .chat-msg.ai {
            align-items: flex-start;
        }

        .chat-bubble {
            padding: 8px 12px;
            border-radius: 10px;
            font-size: 13px;
            line-height: 1.5;
            max-width: 90%;
        }

        .chat-msg.user .chat-bubble {
            background: var(--accent);
            color: white;
            border-bottom-right-radius: 3px;
        }

        .chat-msg.ai .chat-bubble {
            background: var(--border);
            color: var(--text);
            border-bottom-left-radius: 3px;
        }

        .chat-msg.ai .chat-bubble.thinking {
            color: var(--muted);
            font-style: italic;
        }

        .tool-badge {
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 4px;
            background: rgba(37, 99, 235, 0.2);
            color: var(--sky);
            font-family: monospace;
            align-self: flex-start;
            margin-top: 2px;
        }

        #quick-actions {
            padding: 10px 12px;
            border-top: 1px solid var(--border);
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            flex-shrink: 0;
        }

        .quick-chip {
            padding: 5px 10px;
            background: var(--bg);
            border: 1px solid var(--border);
            border-radius: 20px;
            font-size: 11px;
            color: var(--muted);
            cursor: pointer;
            font-family: Arial;
            transition: all 0.15s;
            white-space: nowrap;
        }

        .quick-chip:hover {
            border-color: var(--accent);
            color: var(--text);
        }

        #chat-input-area {
            padding: 10px 12px;
            border-top: 1px solid var(--border);
            display: flex;
            gap: 8px;
            flex-shrink: 0;
        }

        #chat-input {
            flex: 1;
            padding: 8px 12px;
            background: var(--bg);
            border: 1px solid var(--border);
            border-radius: 6px;
            color: var(--text);
            font-size: 13px;
            font-family: Arial;
            resize: none;
            height: 38px;
            line-height: 1.4;
        }

        #chat-input:focus {
            outline: none;
            border-color: var(--accent);
        }

        #chat-input::placeholder { color: var(--muted); }

        #chat-send {
            padding: 8px 14px;
            background: var(--accent);
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
            font-family: Arial;
            flex-shrink: 0;
        }

        #chat-send:disabled { opacity: 0.5; cursor: not-allowed; }

        /* -- Right panel ------------------------------------------------ */
        #right-panel {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            min-height: 0;
            height: 100%;
            min-width: 400px;
        }

        /* -- Player area ------------------------------------------------ */
        #player-area {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #080B11;
            overflow: hidden;
            min-height: 0;
            position: relative;
        }

        #vidsai-preview-root {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        #player-loading {
            color: var(--muted);
            font-size: 13px;
            text-align: center;
        }

        /* -- Timeline --------------------------------------------------- */
        #timeline-panel {
            height: 240px;
            flex-shrink: 0;
            border-top: 1px solid var(--border);
            background: var(--surface);
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        #timeline-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 5px 12px;
            border-bottom: 1px solid var(--border);
            flex-shrink: 0;
            height: 32px;
        }

        #timeline-label {
            font-size: 10px;
            font-weight: 700;
            color: var(--muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .zoom-btn {
            width: 22px;
            height: 22px;
            background: var(--border);
            color: var(--text);
            border: 1px solid #2D3F55;
            border-radius: 4px;
            font-size: 13px;
            cursor: pointer;
            font-family: Arial;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            line-height: 1;
        }

        .zoom-btn:hover { background: var(--accent); }

        /* Scrollable body */
        #timeline-body {
            flex: 1;
            overflow-x: auto;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            min-height: 0;
            position: relative;
        }

        #timeline-body::-webkit-scrollbar { width: 6px; height: 6px; }
        #timeline-body::-webkit-scrollbar-track { background: transparent; }
        #timeline-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

        /* Track rows */
        .track-row {
            display: flex;
            align-items: stretch;
            border-bottom: 1px solid var(--border);
            flex-shrink: 0;
            min-height: 44px;
        }

        .track-row:last-child { border-bottom: none; }

        .track-label {
            width: 64px;
            min-width: 64px;
            flex-shrink: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 2px;
            background: var(--bg);
            border-right: 1px solid var(--border);
            padding: 4px;
            position: sticky;
            left: 0;
            z-index: 5;
        }

        .track-label .track-icon { font-size: 12px; line-height: 1; }

        .track-label span:last-child {
            font-size: 9px;
            color: var(--muted);
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }

        .track-content {
            flex: 1;
            display: flex;
            align-items: center;
            padding: 4px 6px;
            gap: 3px;
            min-width: 0;
            position: relative;
        }

        /* Scene blocks */
        .scene-block {
            height: 36px;
            border-radius: 5px;
            border: 1px solid var(--border);
            background: linear-gradient(135deg, #1E3A5F, #162030);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            cursor: grab;
            user-select: none;
            flex-shrink: 0;
            position: relative;
            overflow: hidden;
            transition: border-color 0.15s;
            min-width: 50px;
        }

        .scene-block:hover { border-color: var(--accent); }
        .scene-block.selected { border-color: var(--sky); box-shadow: 0 0 0 1px var(--sky); }
        .scene-block.dragging { opacity: 0.4; cursor: grabbing; }

        .scene-block .scene-num {
            font-size: 9px;
            font-weight: 700;
            color: var(--sky);
            line-height: 1;
        }

        .scene-block .scene-dur {
            font-size: 9px;
            color: var(--muted);
            line-height: 1;
            margin-top: 1px;
        }

        /* Transition arrow */
        .transition-arrow {
            font-size: 9px;
            color: var(--muted);
            flex-shrink: 0;
            padding: 0 1px;
        }

        /* Subtitle blocks */
        .subtitle-block {
            height: 28px;
            border-radius: 4px;
            background: rgba(56, 189, 248, 0.15);
            border: 1px solid rgba(56, 189, 248, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 4px;
            flex-shrink: 0;
            overflow: hidden;
            min-width: 30px;
        }

        .subtitle-block span {
            font-size: 9px;
            color: var(--sky);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 100%;
        }

        /* Waveform elements */
        .waveform-el {
            width: 100%;
            height: 36px;
        }

        #voiceover-waveform-container,
        #music-waveform-container {
            flex: 1;
            overflow: hidden;
            padding: 4px 6px;
        }

        /* Render in progress banner */
        #render-banner {
            display: none;
            position: absolute;
            top: 12px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(37,99,235,0.9);
            color: white;
            padding: 8px 18px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            z-index: 10;
            white-space: nowrap;
        }
    </style>
</head>
<body>

    {{-- Inject all data --}}
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
        window.__SUBTITLE_STYLES_URL__ = '{{ route('projects.subtitle-styles', $project) }}';
    </script>

    {{-- Top bar --}}
    <div id="top-bar">
        <div class="left">
            <span class="brand">VidsAI</span>
            <span style="color:var(--border);">/</span>
            <span class="project-name">{{ $project->name ?? 'Project' }}</span>
            <span class="status-badge" id="status-badge">{{ $project->status }}</span>
        </div>
        <div class="right">
            <a href="{{ route('projects.subtitle-styles', $project) }}" class="btn-back">← Back</a>
            <button class="btn-export" id="btn-export" onclick="triggerExport()">
                🚀 Render & Export
            </button>
        </div>
    </div>

    {{-- Main area --}}
    <div id="main-area">

        {{-- LEFT: Chat panel --}}
        <div id="chat-panel">
            <div id="chat-header">
                <div class="ai-dot"></div>
                AI Editor
            </div>

            <div id="chat-messages">
                {{-- Welcome message --}}
                <div class="chat-msg ai">
                    <div class="chat-bubble">
                        👋 I can edit your video. Try asking me to change subtitle style, transitions, or music volume.
                    </div>
                </div>
            </div>

            <div id="quick-actions">
                <button class="quick-chip" onclick="sendQuickAction('Use tiktok trending subtitles')">TikTok subtitles</button>
                <button class="quick-chip" onclick="sendQuickAction('Use progressive highlight subtitles')">Progressive highlight</button>
                <button class="quick-chip" onclick="sendQuickAction('Use fade transitions')">Fade transitions</button>
                <button class="quick-chip" onclick="sendQuickAction('Use zoom-in transitions')">Zoom transitions</button>
                <button class="quick-chip" onclick="sendQuickAction('Lower the music volume to 20 percent')">Duck music</button>
                <button class="quick-chip" onclick="sendQuickAction('Remove background music')">Remove music</button>
            </div>

            <div id="chat-input-area">
                <textarea
                    id="chat-input"
                    placeholder="Ask me to edit your video..."
                    onkeydown="handleChatKeydown(event)"
                ></textarea>
                <button id="chat-send" onclick="sendChatMessage()">Send</button>
            </div>
        </div>

        {{-- Resize handle --}}
        <div id="resize-handle" title="Drag to resize">
            <div id="resize-grip"></div>
        </div>

        {{-- RIGHT: Player + Timeline --}}
        <div id="right-panel">

            {{-- Player --}}
            <div id="player-area">
                <div id="render-banner">⏳ Rendering in progress...</div>
                <div id="vidsai-preview-root">
                    <div id="player-loading">Loading preview...</div>
                </div>
            </div>

            {{-- Timeline --}}
            <div id="timeline-panel">

                {{-- Timeline header with zoom controls --}}
                <div id="timeline-header">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span id="timeline-label">TIMELINE</span>
                        <span id="timeline-duration" style="color:var(--muted); font-size:10px;"></span>
                    </div>
                    <div style="display:flex; align-items:center; gap:6px;">
                        <span style="color:var(--muted); font-size:10px;">Zoom:</span>
                        <button class="zoom-btn" onclick="zoomTimeline(-0.25)" title="Zoom out">-</button>
                        <span id="zoom-label" style="color:var(--muted); font-size:10px; min-width:32px; text-align:center;">1x</span>
                        <button class="zoom-btn" onclick="zoomTimeline(0.25)" title="Zoom in">+</button>
                        <button class="zoom-btn" onclick="zoomTimeline(0, true)" title="Reset zoom" style="font-size:9px; padding:2px 6px;">⟳</button>
                        <span id="timeline-hint" style="color:var(--muted); font-size:10px; margin-left:8px;">Drag to reorder scenes · Scroll to pan</span>
                    </div>
                </div>

                {{-- Scrollable timeline body --}}
                <div id="timeline-body">

                    {{-- Track: Scenes (video clips) --}}
                    <div class="track-row">
                        <div class="track-label">
                            <span class="track-icon">🎬</span>
                            <span>Scenes</span>
                        </div>
                        <div class="track-content" id="scene-blocks-container"></div>
                    </div>

                    {{-- Track: Subtitles --}}
                    <div class="track-row">
                        <div class="track-label">
                            <span class="track-icon">💬</span>
                            <span>Subtitles</span>
                        </div>
                        <div class="track-content" id="subtitle-blocks-container"></div>
                    </div>

                    {{-- Track: Voiceover waveform --}}
                    <div class="track-row">
                        <div class="track-label">
                            <span class="track-icon">🎤</span>
                            <span>Voice</span>
                        </div>
                        <div class="track-content" id="voiceover-waveform-container">
                            <div id="waveform-voiceover" class="waveform-el"></div>
                        </div>
                    </div>

                    {{-- Track: Music waveform --}}
                    <div class="track-row" id="music-track-row" style="display:none;">
                        <div class="track-label">
                            <span class="track-icon">🎵</span>
                            <span>Music</span>
                        </div>
                        <div class="track-content" id="music-waveform-container">
                            <div id="waveform-music" class="waveform-el"></div>
                        </div>
                    </div>

                </div>

        </div>
    </div>

    {{-- Remotion Player bundle --}}
    <script src="{{ asset('js/remotion-player/vidsai-player.iife.js') }}"></script>

    <script>
    // --- State ---------------------------------------------------------------
    let editState    = window.__EDIT_STATE__ ? JSON.parse(JSON.stringify(window.__EDIT_STATE__)) : null;
    let playerRoot   = null;
    let timelineZoom = 1.0;
    let wavesurferVoice = null;
    let wavesurferMusic = null;
    const ZOOM_MIN = 0.25;
    const ZOOM_MAX = 4.0;
    const TRACK_PX_PER_SEC = 80;
    let isSending    = false;

    // --- Boot ----------------------------------------------------------------
    window.addEventListener('load', function () {
        mountPlayer();
        initTimeline();
        checkRenderStatus();
    });

    // --- Resizable panels ---------------------------------------------------
    (function initResizable() {
        const handle = document.getElementById('resize-handle');
        const chatPanel = document.getElementById('chat-panel');
        const mainArea = document.getElementById('main-area');

        if (!handle || !chatPanel || !mainArea) return;

        let isResizing = false;
        let startX = 0;
        let startWidth = 0;

        handle.addEventListener('mousedown', function (e) {
            isResizing = true;
            startX = e.clientX;
            startWidth = chatPanel.offsetWidth;
            handle.classList.add('dragging');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        });

        document.addEventListener('mousemove', function (e) {
            if (!isResizing) return;
            const delta = e.clientX - startX;
            const newWidth = Math.max(220, Math.min(600, startWidth + delta));
            chatPanel.style.width = newWidth + 'px';
        });

        document.addEventListener('mouseup', function () {
            if (!isResizing) return;
            isResizing = false;
            handle.classList.remove('dragging');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            renderSceneBlocks();
        });

        handle.addEventListener('touchstart', function (e) {
            isResizing = true;
            startX = e.touches[0].clientX;
            startWidth = chatPanel.offsetWidth;
            handle.classList.add('dragging');
            e.preventDefault();
        }, { passive: false });

        document.addEventListener('touchmove', function (e) {
            if (!isResizing) return;
            const delta = e.touches[0].clientX - startX;
            const newWidth = Math.max(220, Math.min(600, startWidth + delta));
            chatPanel.style.width = newWidth + 'px';
        }, { passive: false });

        document.addEventListener('touchend', function () {
            if (!isResizing) return;
            isResizing = false;
            handle.classList.remove('dragging');
            renderSceneBlocks();
        });
    })();

    // --- Remotion Player -----------------------------------------------------
    function mountPlayer() {
        const P  = window.VidsAIPlayer;
        const el = document.getElementById('vidsai-preview-root');
        if (!P || !el || !editState) {
            const loadingEl = document.getElementById('player-loading');
            if (loadingEl) {
                loadingEl.textContent = editState ? 'Player unavailable.' : 'No edit state - complete scene generation first.';
            }
            return;
        }

        try {
            const loadingEl = document.getElementById('player-loading');
            if (loadingEl) {
                loadingEl.remove();
            }
            if (!playerRoot) {
                playerRoot = P.ReactDOM.createRoot(el);
            }
            playerRoot.render(P.React.createElement(P.VideoPreviewPlayer, {
                editState:                  editState,
                projectId:                  window.__PROJECT_ID__,
                acknowledgeRemotionLicense: true,
                compact:                    false,
            }));
        } catch (e) {
            console.error('[Editor] Player mount error:', e);
        }
    }

    function refreshPlayer(newEditState) {
        editState = newEditState;
        mountPlayer();
        renderSceneBlocks();
        renderSubtitleBlocks();
        initMusicWaveform();
        updateTimelineDuration();
    }

    // --- Timeline ------------------------------------------------------------
    function initTimeline() {
        if (!editState) return;
        renderSceneBlocks();
        renderSubtitleBlocks();
        initDragDrop();
        initWaveforms();
        initWheelZoom();
        updateTimelineDuration();
    }

    function updateTimelineDuration() {
        const el = document.getElementById('timeline-duration');
        if (!el || !editState) return;
        const dur = ((editState.total_frames ?? 0) / (editState.fps ?? 30)).toFixed(1);
        el.textContent = dur + 's';
    }

    function zoomTimeline(delta, reset) {
        if (reset) {
            timelineZoom = 1.0;
        } else {
            timelineZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, timelineZoom + delta));
        }
        const zoomLabel = document.getElementById('zoom-label');
        if (zoomLabel) {
            zoomLabel.textContent = timelineZoom.toFixed(2).replace(/\.?0+$/, '') + 'x';
        }
        renderSceneBlocks();
        renderSubtitleBlocks();
    }

    function initWheelZoom() {
        const body = document.getElementById('timeline-body');
        if (!body) return;
        body.addEventListener('wheel', function (e) {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                zoomTimeline(e.deltaY > 0 ? -0.1 : 0.1);
            }
        }, { passive: false });
    }

    function renderSceneBlocks() {
        const container = document.getElementById('scene-blocks-container');
        if (!container || !editState) return;
        container.innerHTML = '';

        const clips = editState.tracks?.video ?? [];
        const fps   = editState.fps ?? 30;

        clips.forEach(function (clip, i) {
            const dur   = (clip.end_frame - clip.start_frame) / fps;
            const width = Math.max(50, Math.round(dur * TRACK_PX_PER_SEC * timelineZoom));
            const trans = clip.transition_out?.type ?? 'none';

            const block = document.createElement('div');
            block.className = 'scene-block';
            block.style.width = width + 'px';
            block.dataset.clipId    = clip.id;
            block.dataset.clipIndex = i;
            block.draggable = true;
            block.innerHTML = `
                <span class="scene-num">S${i + 1}</span>
                <span class="scene-dur">${dur.toFixed(1)}s</span>
            `;
            block.title = clip.id;

            block.addEventListener('click', function () {
                document.querySelectorAll('.scene-block').forEach(b => b.classList.remove('selected'));
                block.classList.add('selected');
            });

            container.appendChild(block);

            // Transition indicator
            if (i < clips.length - 1) {
                const arrow = document.createElement('span');
                arrow.className = 'transition-arrow';
                arrow.textContent = trans === 'none' ? '|' : '→';
                arrow.title = trans;
                container.appendChild(arrow);
            }
        });
    }

    function renderSubtitleBlocks() {
        const container = document.getElementById('subtitle-blocks-container');
        if (!container || !editState) return;
        container.innerHTML = '';

        const subs = editState.tracks?.subtitles ?? [];
        const fps = editState.fps ?? 30;

        if (subs.length === 0) {
            const empty = document.createElement('span');
            empty.style.cssText = 'font-size:10px; color:var(--muted); padding:0 8px;';
            empty.textContent = 'No subtitles yet';
            container.appendChild(empty);
            return;
        }

        const firstStart = subs[0].start_frame / fps;
        if (firstStart > 0.1) {
            const spacer = document.createElement('div');
            spacer.style.cssText = `width:${Math.round(firstStart * TRACK_PX_PER_SEC * timelineZoom)}px; flex-shrink:0;`;
            container.appendChild(spacer);
        }

        subs.forEach(function (sub, i) {
            const startSec = sub.start_frame / fps;
            const endSec = sub.end_frame / fps;
            const dur = endSec - startSec;
            const width = Math.max(30, Math.round(dur * TRACK_PX_PER_SEC * timelineZoom));

            const block = document.createElement('div');
            block.className = 'subtitle-block';
            block.style.width = width + 'px';
            block.title = sub.text ?? '';
            block.innerHTML = `<span>${sub.text ?? ''}</span>`;
            container.appendChild(block);

            if (i < subs.length - 1) {
                const nextStart = subs[i + 1].start_frame / fps;
                const gap = nextStart - endSec;
                if (gap > 0.05) {
                    const spacer = document.createElement('div');
                    spacer.style.cssText = `width:${Math.round(gap * TRACK_PX_PER_SEC * timelineZoom)}px; flex-shrink:0;`;
                    container.appendChild(spacer);
                }
            }
        });
    }

    function initDragDrop() {
        const container = document.getElementById('scene-blocks-container');
        if (!container) return;

        let draggedEl = null;
        let draggedIndex = null;

        container.addEventListener('dragstart', function (e) {
            const block = e.target.closest('.scene-block');
            if (!block) return;
            draggedEl = block;
            draggedIndex = parseInt(block.dataset.clipIndex, 10);
            block.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        container.addEventListener('dragend', function (e) {
            const block = e.target.closest('.scene-block');
            if (block) {
                block.classList.remove('dragging');
            }
            document.querySelectorAll('.scene-block').forEach(b => b.style.outline = '');
            draggedEl = null;
            draggedIndex = null;
        });

        container.addEventListener('dragover', function (e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            const block = e.target.closest('.scene-block');
            if (!block || block === draggedEl) return;
            document.querySelectorAll('.scene-block').forEach(b => b.style.outline = '');
            block.style.outline = '2px solid var(--sky)';
        });

        container.addEventListener('dragleave', function (e) {
            const block = e.target.closest('.scene-block');
            if (block) {
                block.style.outline = '';
            }
        });

        container.addEventListener('drop', function (e) {
            e.preventDefault();
            document.querySelectorAll('.scene-block').forEach(b => b.style.outline = '');
            const targetBlock = e.target.closest('.scene-block');
            if (!targetBlock || !draggedEl || targetBlock === draggedEl) return;

            const targetIndex = parseInt(targetBlock.dataset.clipIndex, 10);
            if (draggedIndex !== null && draggedIndex !== targetIndex) {
                reorderScenesLocally(draggedIndex, targetIndex);
            }
        });
    }

    function reorderScenesLocally(fromIndex, toIndex) {
        if (!editState) return;
        const clips = [...(editState.tracks.video ?? [])];
        if (fromIndex < 0 || fromIndex >= clips.length) return;

        const [moved] = clips.splice(fromIndex, 1);
        const insertAt = toIndex > fromIndex ? toIndex - 1 : toIndex;
        clips.splice(Math.max(0, Math.min(clips.length, insertAt)), 0, moved);

        // Recalculate frame positions after local reorder
        let currentFrame = 0;
        clips.forEach((clip, i) => {
            const duration = clip.end_frame - clip.start_frame;
            clip.start_frame = currentFrame;
            clip.end_frame = currentFrame + duration;
            if (i === clips.length - 1) {
                clip.transition_out = null;
            }
            currentFrame += duration;
        });

        editState.tracks.video = clips;
        editState.total_frames = currentFrame;
        editState.version = (editState.version || 1) + 1;

        refreshPlayer(editState);
        renderSceneBlocks();

        const newOrder = clips.map(c => c.id);
        syncReorderToBackend(newOrder);
    }

    // --- Waveforms -----------------------------------------------------------
    function initWaveforms() {
        initVoiceoverWaveform();
        initMusicWaveform();
    }

    function initVoiceoverWaveform() {
        const voiceoverUrl = window.__VOICEOVER_URL__;
        const el = document.getElementById('waveform-voiceover');
        if (!el || !voiceoverUrl) return;

        if (wavesurferVoice) {
            wavesurferVoice.destroy();
            wavesurferVoice = null;
        }

        try {
            wavesurferVoice = WaveSurfer.create({
                container: '#waveform-voiceover',
                waveColor: '#1E3A5F',
                progressColor: '#2563EB',
                cursorColor: '#38BDF8',
                height: 36,
                barWidth: 2,
                barGap: 1,
                barRadius: 2,
                normalize: true,
                interact: false,
            });
            wavesurferVoice.load(voiceoverUrl);
        } catch (e) {
            console.warn('[Timeline] Voiceover waveform failed:', e);
        }
    }

    function initMusicWaveform() {
        const audioTracks = editState?.tracks?.audio ?? [];
        const musicTrack = audioTracks.find(t => t.type === 'music');
        const musicUrl = musicTrack?.url ?? null;

        const row = document.getElementById('music-track-row');
        const el = document.getElementById('waveform-music');

        if (!row || !el) return;

        if (!musicUrl) {
            row.style.display = 'none';
            return;
        }

        row.style.display = 'flex';

        if (wavesurferMusic) {
            wavesurferMusic.destroy();
            wavesurferMusic = null;
        }

        try {
            wavesurferMusic = WaveSurfer.create({
                container: '#waveform-music',
                waveColor: '#1A3A2A',
                progressColor: '#16A34A',
                cursorColor: '#4ADE80',
                height: 36,
                barWidth: 2,
                barGap: 1,
                barRadius: 2,
                normalize: true,
                interact: false,
            });
            wavesurferMusic.load(musicUrl);
        } catch (e) {
            console.warn('[Timeline] Music waveform failed:', e);
        }
    }

    // --- Chat ----------------------------------------------------------------
    function handleChatKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    }

    function sendQuickAction(text) {
        document.getElementById('chat-input').value = text;
        sendChatMessage();
    }

    async function sendChatMessage() {
        const input   = document.getElementById('chat-input');
        const message = input.value.trim();
        if (!message || isSending) return;

        input.value = '';
        appendMessage('user', message);
        const thinkingEl = appendMessage('ai', 'Thinking...', true);
        setSending(true);

        try {
            const res  = await fetch(window.__CHAT_URL__, {
                method:  'POST',
                headers: {
                    'Content-Type':     'application/json',
                    'X-CSRF-TOKEN':     window.__CSRF_TOKEN__,
                    'Accept':           'application/json',
                },
                body: JSON.stringify({ message }),
            });

            const data = await res.json();

            thinkingEl.remove();

            if (data.success) {
                appendMessage('ai', data.agent_reply ?? 'Done.', false, data.tool_used);

                if (data.edit_state) {
                    // Update local state and refresh player + timeline
                    refreshPlayer(data.edit_state);
                    renderSceneBlocks();
                }
            } else {
                appendMessage('ai', data.agent_reply ?? 'Something went wrong.');
            }

        } catch (err) {
            thinkingEl?.remove();
            appendMessage('ai', 'Network error. Please try again.');
            console.error('[Chat] Error:', err);
        }

        setSending(false);
    }

    async function syncReorderToBackend(newOrder) {
        try {
            const res = await fetch(window.__CHAT_URL__, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': window.__CSRF_TOKEN__,
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    message: '__reorder__',
                    order: newOrder,
                }),
            });

            const data = await res.json();
            if (!data.success) {
                console.warn('[Reorder] Backend sync failed:', data);
            }
        } catch (err) {
            console.warn('[Reorder] Backend sync error:', err);
        }
    }

    function appendMessage(role, text, thinking = false, toolUsed = null) {
        const container = document.getElementById('chat-messages');
        const wrapper   = document.createElement('div');
        wrapper.className = `chat-msg ${role}`;

        const bubble = document.createElement('div');
        bubble.className = `chat-bubble${thinking ? ' thinking' : ''}`;
        bubble.textContent = text;
        wrapper.appendChild(bubble);

        if (toolUsed) {
            const badge = document.createElement('span');
            badge.className = 'tool-badge';
            badge.textContent = toolUsed;
            wrapper.appendChild(badge);
        }

        container.appendChild(wrapper);
        container.scrollTop = container.scrollHeight;
        return wrapper;
    }

    function setSending(state) {
        isSending = state;
        document.getElementById('chat-send').disabled   = state;
        document.getElementById('chat-input').disabled  = state;
    }

    // --- Export --------------------------------------------------------------
    async function triggerExport() {
        const btn = document.getElementById('btn-export');
        btn.disabled = true;
        btn.textContent = '⏳ Starting render...';

        try {
            const res  = await fetch(window.__EXPORT_URL__, {
                method:  'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': window.__CSRF_TOKEN__,
                    'Accept':       'application/json',
                },
                body: JSON.stringify({}),
            });

            const data = await res.json();

            if (data.success) {
                appendMessage('ai', '🚀 Render started! I\'ll let you know when it\'s ready. This usually takes 4-8 minutes.');
                document.getElementById('render-banner').style.display = 'block';
                document.getElementById('status-badge').textContent = 'rendering';

                // Redirect to processing page
                setTimeout(() => {
                    if (data.redirect_url) {
                        window.location.href = data.redirect_url;
                    }
                }, 2000);
            } else {
                appendMessage('ai', data.message ?? 'Export failed. Please try again.');
                btn.disabled = false;
                btn.textContent = '🚀 Render & Export';
            }

        } catch (err) {
            appendMessage('ai', 'Network error starting export.');
            btn.disabled = false;
            btn.textContent = '🚀 Render & Export';
        }
    }

    // --- Render status polling ----------------------------------------------
    function checkRenderStatus() {
        const status = window.__PROJECT_STATUS__;
        if (status === 'subtitle_generating') {
            document.getElementById('render-banner').style.display = 'block';
            document.getElementById('btn-export').disabled = true;
            document.getElementById('btn-export').textContent = '⏳ Rendering...';
            appendMessage('ai', '⏳ A render is currently in progress. The player shows your latest edit state.');
        }
        if (status === 'completed' && window.__FINAL_VIDEO_URL__) {
            appendMessage('ai', '✅ Your video is ready! Click "Render & Export" to render with your latest edits, or download the previous render below.');
            const btn = document.getElementById('btn-export');
            btn.textContent = '🚀 Re-render & Export';
        }
    }
    </script>

</body>
</html>
