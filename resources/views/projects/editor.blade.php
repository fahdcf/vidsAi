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

    {{-- interact.js for drag and drop --}}
    <script src="https://cdnjs.cloudflare.com/ajax/libs/interact.js/1.10.27/interact.min.js"></script>

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
            display: grid;
            grid-template-columns: 340px 1fr;
            flex: 1;
            overflow: hidden;
            min-height: 0;
        }

        /* -- Left panel - Chat ----------------------------------------- */
        #chat-panel {
            display: flex;
            flex-direction: column;
            border-right: 1px solid var(--border);
            background: var(--surface);
            overflow: hidden;
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
            display: flex;
            flex-direction: column;
            overflow: hidden;
            min-height: 0;
        }

        /* -- Player area ------------------------------------------------ */
        #player-area {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #000;
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
            height: 200px;
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
            padding: 6px 14px;
            border-bottom: 1px solid var(--border);
            flex-shrink: 0;
        }

        #timeline-header span {
            font-size: 11px;
            font-weight: 700;
            color: var(--muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        #timeline-hint {
            font-size: 11px;
            color: var(--muted);
        }

        /* Waveform track */
        #waveform-track {
            padding: 4px 14px 0;
            flex-shrink: 0;
            height: 52px;
            position: relative;
        }

        #waveform {
            width: 100%;
            height: 44px;
        }

        #waveform-label {
            position: absolute;
            left: 14px;
            top: 6px;
            font-size: 10px;
            color: var(--muted);
            pointer-events: none;
            z-index: 1;
        }

        /* Scene blocks track */
        #scene-track {
            flex: 1;
            padding: 6px 14px;
            display: flex;
            align-items: center;
            gap: 3px;
            overflow-x: auto;
            overflow-y: hidden;
            min-height: 0;
            position: relative;
        }

        #scene-track::-webkit-scrollbar { height: 4px; }
        #scene-track::-webkit-scrollbar-track { background: transparent; }
        #scene-track::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

        #scene-track-label {
            font-size: 10px;
            color: var(--muted);
            flex-shrink: 0;
            width: 60px;
            text-align: right;
            padding-right: 8px;
        }

        #scene-blocks-container {
            display: flex;
            align-items: center;
            gap: 3px;
            flex: 1;
            height: 100%;
        }

        .scene-block {
            height: 52px;
            border-radius: 6px;
            border: 1px solid var(--border);
            background: linear-gradient(135deg, #1E2D40, #162030);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            cursor: grab;
            user-select: none;
            flex-shrink: 0;
            position: relative;
            overflow: hidden;
            transition: border-color 0.15s, transform 0.1s;
            min-width: 60px;
        }

        .scene-block:hover {
            border-color: var(--accent);
        }

        .scene-block.selected {
            border-color: var(--sky);
            box-shadow: 0 0 0 1px var(--sky);
        }

        .scene-block.dragging {
            opacity: 0.5;
            cursor: grabbing;
            transform: scale(0.95);
        }

        .scene-block .scene-num {
            font-size: 10px;
            font-weight: 700;
            color: var(--sky);
            line-height: 1;
        }

        .scene-block .scene-dur {
            font-size: 10px;
            color: var(--muted);
            line-height: 1;
            margin-top: 2px;
        }

        .scene-block .scene-text {
            font-size: 9px;
            color: var(--muted);
            line-height: 1;
            margin-top: 3px;
            max-width: 90%;
            text-overflow: ellipsis;
            overflow: hidden;
            white-space: nowrap;
            text-align: center;
        }

        /* Transition arrow between blocks */
        .transition-arrow {
            font-size: 10px;
            color: var(--muted);
            flex-shrink: 0;
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
                <div id="timeline-header">
                    <span>Timeline</span>
                    <span id="timeline-hint">Drag scenes to reorder</span>
                </div>

                {{-- Waveform --}}
                <div id="waveform-track">
                    <span id="waveform-label">Audio</span>
                    <div id="waveform"></div>
                </div>

                {{-- Scene blocks --}}
                <div id="scene-track">
                    <span id="scene-track-label">Scenes</span>
                    <div id="scene-blocks-container"></div>
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
    let wavesurfer   = null;
    let isSending    = false;
    let dragSrcIndex = null;

    // --- Boot ----------------------------------------------------------------
    window.addEventListener('load', function () {
        mountPlayer();
        initTimeline();
        initWaveform();
        checkRenderStatus();
    });

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
    }

    // --- Timeline ------------------------------------------------------------
    function initTimeline() {
        if (!editState) return;
        renderSceneBlocks();
        initDragDrop();
    }

    function renderSceneBlocks() {
        const container = document.getElementById('scene-blocks-container');
        if (!container || !editState) return;
        container.innerHTML = '';

        const clips = editState.tracks?.video ?? [];
        const fps   = editState.fps ?? 30;
        const total = editState.total_frames ?? 1;

        // Calculate total display width available
        const trackWidth = container.parentElement.clientWidth - 80;

        clips.forEach(function (clip, i) {
            const dur   = (clip.end_frame - clip.start_frame) / fps;
            // Width proportional to duration
            const pct   = (clip.end_frame - clip.start_frame) / total;
            const width = Math.max(70, Math.floor(pct * trackWidth));
            const trans = clip.transition_out?.type ?? 'none';

            const block = document.createElement('div');
            block.className = 'scene-block';
            block.style.width = width + 'px';
            block.dataset.clipId    = clip.id;
            block.dataset.clipIndex = i;
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

    function initDragDrop() {
        if (typeof interact === 'undefined') return;

        interact('.scene-block').draggable({
            inertia: false,
            modifiers: [],
            autoScroll: true,
            listeners: {
                start: function (event) {
                    event.target.classList.add('dragging');
                    dragSrcIndex = parseInt(event.target.dataset.clipIndex, 10);
                },
                move: function (event) {
                    const target = event.target;
                    const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                    target.style.transform = `translateX(${x}px)`;
                    target.setAttribute('data-x', x);
                },
                end: function (event) {
                    const target = event.target;
                    target.classList.remove('dragging');
                    target.style.transform = '';
                    target.setAttribute('data-x', 0);

                    // Find drop target by position
                    const rect      = target.getBoundingClientRect();
                    const centerX   = rect.left + rect.width / 2;
                    const blocks    = Array.from(document.querySelectorAll('.scene-block:not(.dragging)'));
                    let   dropIndex = blocks.length;

                    for (let i = 0; i < blocks.length; i++) {
                        const bRect = blocks[i].getBoundingClientRect();
                        if (centerX < bRect.left + bRect.width / 2) {
                            dropIndex = i;
                            break;
                        }
                    }

                    if (dragSrcIndex !== null && dropIndex !== dragSrcIndex) {
                        reorderScenesLocally(dragSrcIndex, dropIndex);
                    }
                    dragSrcIndex = null;
                },
            },
        });
    }

    function reorderScenesLocally(fromIndex, toIndex) {
        if (!editState) return;
        const clips = [...(editState.tracks.video ?? [])];
        if (fromIndex < 0 || fromIndex >= clips.length) return;

        const [moved] = clips.splice(fromIndex, 1);
        const insertAt = toIndex > fromIndex ? toIndex - 1 : toIndex;
        clips.splice(Math.max(0, Math.min(clips.length, insertAt)), 0, moved);

        const newOrder = clips.map(c => c.id);

        // Send to backend
        sendMessage('reorder_scenes_direct', null, newOrder);
    }

    // --- Waveform ------------------------------------------------------------
    function initWaveform() {
        const voiceoverUrl = window.__VOICEOVER_URL__;
        const el = document.getElementById('waveform');
        if (!el) return;

        if (!voiceoverUrl) {
            el.innerHTML = '<div style="height:44px;display:flex;align-items:center;padding-left:8px;font-size:11px;color:var(--muted);">No audio uploaded yet</div>';
            return;
        }

        try {
            wavesurfer = WaveSurfer.create({
                container:       '#waveform',
                waveColor:       '#1E2D40',
                progressColor:   '#2563EB',
                cursorColor:     '#38BDF8',
                height:          44,
                barWidth:        2,
                barGap:          1,
                barRadius:       2,
                normalize:       true,
                interact:        true,
                backend:         'WebAudio',
            });

            wavesurfer.load(voiceoverUrl);
        } catch (e) {
            console.warn('[Editor] WaveSurfer init failed:', e);
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

    // Direct reorder call (from drag/drop, not chat)
    async function sendMessage(type, message, newOrder) {
        if (!editState) return;

        if (type === 'reorder_scenes_direct') {
            try {
                const res  = await fetch(window.__CHAT_URL__, {
                    method:  'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': window.__CSRF_TOKEN__,
                        'Accept':       'application/json',
                    },
                    body: JSON.stringify({
                        message: 'reorder scenes: ' + newOrder.join(', '),
                    }),
                });

                const data = await res.json();
                if (data.success && data.edit_state) {
                    refreshPlayer(data.edit_state);
                    renderSceneBlocks();
                    appendMessage('ai', '↕️ Scenes reordered.');
                }
            } catch (err) {
                console.error('[Reorder] Error:', err);
            }
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
