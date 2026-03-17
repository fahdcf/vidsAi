@extends('layouts.app')

@section('title', 'Processing Video - ' . $project->name)

@push('styles')
<meta name="csrf-token" content="{{ csrf_token() }}">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" rel="stylesheet">
<style>
    :root {
        --bg: #0F1117;
        --surface: #161B27;
        --surface-2: #1C2233;
        --border: rgba(255,255,255,0.08);
        --border-hover: rgba(255,255,255,0.14);
        --white: #ffffff;
        --white-60: rgba(255,255,255,0.6);
        --white-40: rgba(255,255,255,0.4);
        --blue: #2563EB;
        --blue-glow: rgba(37,99,235,0.28);
        --red: #ef4444;
        --green: #22c55e;
        --amber: #f59e0b;
        --radius-sm: 10px;
        --radius-md: 14px;
        --radius-lg: 18px;
    }

    .processing-shell {
        min-height: calc(100vh - 70px);
        background:
            radial-gradient(900px 540px at 8% -10%, rgba(37,99,235,0.20), transparent 65%),
            radial-gradient(800px 480px at 95% 5%, rgba(245,158,11,0.12), transparent 70%),
            var(--bg);
        padding: 40px 18px 56px;
        color: var(--white);
    }

    .processing-wrap {
        max-width: 940px;
        margin: 0 auto;
    }

    .processing-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 20px;
    }

    .processing-eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 12px;
        border: 1px solid var(--border);
        border-radius: 999px;
        font-size: 12px;
        color: var(--white-60);
        background: rgba(22,27,39,0.9);
    }

    .processing-title {
        margin: 10px 0 8px;
        font-size: clamp(28px, 4vw, 42px);
        letter-spacing: -0.02em;
        font-weight: 800;
        line-height: 1.1;
    }

    .processing-sub {
        margin: 0;
        color: var(--white-60);
        max-width: 680px;
        line-height: 1.6;
    }

    .processing-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
    }

    .btn-dark-ui {
        border: 1px solid var(--border);
        background: var(--surface);
        color: var(--white);
        border-radius: var(--radius-sm);
        padding: 10px 14px;
        font-size: 13px;
        font-weight: 600;
        text-decoration: none;
        transition: all 0.2s ease;
    }

    .btn-dark-ui:hover {
        border-color: var(--border-hover);
        background: var(--surface-2);
        color: var(--white);
    }

    .btn-dark-primary {
        border: 1px solid transparent;
        background: var(--blue);
        color: var(--white);
        box-shadow: 0 0 22px var(--blue-glow);
    }

    .btn-dark-primary:hover {
        background: #3B82F6;
        color: var(--white);
    }

    .processing-card {
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        background: linear-gradient(180deg, rgba(28,34,51,0.95), rgba(22,27,39,0.98));
        backdrop-filter: blur(8px);
        box-shadow: 0 28px 52px rgba(0,0,0,0.33);
        padding: 28px;
    }

    .status-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
        margin-bottom: 22px;
    }

    .status-stat {
        border: 1px solid var(--border);
        background: rgba(15,17,23,0.65);
        border-radius: var(--radius-sm);
        padding: 12px;
    }

    .status-stat-label {
        display: block;
        font-size: 11px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--white-40);
        margin-bottom: 6px;
    }

    .status-stat-value {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        font-size: 14px;
        color: var(--white);
    }

    .spinner-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--blue);
        animation: pulseDot 1.2s ease-in-out infinite;
        box-shadow: 0 0 0 0 var(--blue-glow);
    }

    @keyframes pulseDot {
        0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(37,99,235,0.4); }
        70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(37,99,235,0); }
        100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(37,99,235,0); }
    }

    .progress-shell {
        margin: 4px 0 16px;
    }

    .progress-rail {
        width: 100%;
        height: 10px;
        background: rgba(255,255,255,0.08);
        border-radius: 999px;
        overflow: hidden;
    }

    .progress-fill {
        height: 100%;
        width: 0;
        background: linear-gradient(90deg, #1D4ED8, #3B82F6);
        border-radius: 999px;
        transition: width 0.25s ease;
    }

    .progress-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 10px;
        color: var(--white-60);
        font-size: 13px;
    }

    .status-banner {
        border: 1px solid var(--border);
        background: rgba(15,17,23,0.68);
        border-radius: var(--radius-sm);
        padding: 14px 16px;
        color: var(--white-60);
        line-height: 1.6;
    }

    .status-banner.success {
        border-color: rgba(34,197,94,0.35);
        background: rgba(34,197,94,0.08);
        color: #bbf7d0;
    }

    .status-banner.error {
        border-color: rgba(239,68,68,0.35);
        background: rgba(239,68,68,0.10);
        color: #fecaca;
    }

    .processing-tip {
        margin-top: 14px;
        font-size: 13px;
        color: var(--white-40);
    }

    .log-modal {
        position: fixed;
        inset: 0;
        background: rgba(5,7,10,0.72);
        backdrop-filter: blur(4px);
        display: none;
        align-items: center;
        justify-content: center;
        padding: 16px;
        z-index: 3000;
    }

    .log-modal.show {
        display: flex;
    }

    .log-dialog {
        width: min(980px, 100%);
        max-height: 88vh;
        border: 1px solid var(--border-hover);
        background: #0b0f16;
        border-radius: var(--radius-md);
        overflow: hidden;
        box-shadow: 0 30px 70px rgba(0,0,0,0.45);
        display: flex;
        flex-direction: column;
    }

    .log-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 12px 14px;
        border-bottom: 1px solid var(--border);
        background: #121826;
    }

    .log-title {
        margin: 0;
        font-size: 15px;
        font-weight: 700;
    }

    .log-tools {
        display: flex;
        gap: 10px;
        align-items: center;
    }

    .log-autoscroll {
        font-size: 12px;
        color: var(--white-60);
        display: inline-flex;
        gap: 6px;
        align-items: center;
    }

    .log-body {
        background: #080c12;
        color: #dbeafe;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        font-size: 12px;
        line-height: 1.5;
        padding: 12px;
        overflow: auto;
        min-height: 340px;
        max-height: calc(88vh - 58px);
        white-space: pre-wrap;
    }

    .log-line {
        margin: 0 0 8px;
        padding: 7px 9px;
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.05);
        background: rgba(255,255,255,0.02);
        color: #c7d2fe;
    }

    .log-line.warn { color: #fde68a; border-color: rgba(245,158,11,0.25); }
    .log-line.error { color: #fecaca; border-color: rgba(239,68,68,0.25); }
    .log-line.success { color: #bbf7d0; border-color: rgba(34,197,94,0.25); }

    .log-empty {
        color: #94a3b8;
        font-size: 13px;
    }

    @media (max-width: 900px) {
        .status-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .processing-card {
            padding: 20px;
        }

        .processing-head {
            flex-direction: column;
            align-items: flex-start;
        }
    }

    @media (max-width: 560px) {
        .status-grid {
            grid-template-columns: 1fr;
        }

        .processing-shell {
            padding: 22px 12px 30px;
        }

        .processing-title {
            font-size: 28px;
        }
    }
</style>
@endpush

@section('content')
<div class="processing-shell">
    <div class="processing-wrap">
        <div class="processing-head">
            <div>
                <span class="processing-eyebrow">
                    <i class="bi bi-cpu"></i>
                    Project #{{ $project->id }} Pipeline
                </span>
                <h1 class="processing-title">Processing Your Video Ad</h1>
                <p class="processing-sub" id="status-message">
                    We are generating scenes from your voiceover and assembling your ad assets.
                </p>
            </div>
            <div class="processing-actions">
                <button type="button" class="btn-dark-ui btn-dark-primary" id="open-logs-btn">
                    <i class="bi bi-terminal"></i>
                    Live Logs
                </button>
                <button type="button" class="btn-dark-ui" onclick="location.reload()">
                    <i class="bi bi-arrow-clockwise"></i>
                    Refresh
                </button>
            </div>
        </div>

        <div class="processing-card">
            <div class="status-grid">
                <div class="status-stat">
                    <span class="status-stat-label">Status</span>
                    <span class="status-stat-value" id="current-status">
                        <span class="spinner-dot"></span>
                        Processing
                    </span>
                </div>
                <div class="status-stat">
                    <span class="status-stat-label">Progress</span>
                    <span class="status-stat-value" id="progress-text">0%</span>
                </div>
                <div class="status-stat">
                    <span class="status-stat-label">Started</span>
                    <span class="status-stat-value" id="start-time">{{ $project->processing_started_at?->format('H:i:s') ?? 'Just now' }}</span>
                </div>
                <div class="status-stat">
                    <span class="status-stat-label">Duration</span>
                    <span class="status-stat-value" id="duration">0s</span>
                </div>
            </div>

            <div class="progress-shell">
                <div class="progress-rail">
                    <div class="progress-fill" id="progress-fill"></div>
                </div>
                <div class="progress-meta">
                    <span id="progress-stage">Queued for processing...</span>
                    <span id="eta-text">ETA: 3-5 min</span>
                </div>
            </div>

            <div class="status-banner" id="status-banner">
                We are currently processing your project. Keep this tab open, or return later to continue.
            </div>

            <div class="processing-tip">
                If processing hangs, open <strong>Live Logs</strong> to inspect exact backend steps in real time.
            </div>
        </div>
    </div>
</div>

<div class="log-modal" id="log-modal" aria-hidden="true">
    <div class="log-dialog" role="dialog" aria-modal="true" aria-labelledby="log-title">
        <div class="log-head">
            <h3 class="log-title" id="log-title">
                <i class="bi bi-activity"></i>
                Real-time Processing Logs
            </h3>
            <div class="log-tools">
                <label class="log-autoscroll">
                    <input type="checkbox" id="auto-scroll" checked>
                    Auto-scroll
                </label>
                <button class="btn-dark-ui" id="clear-log-view" type="button">Clear View</button>
                <button class="btn-dark-ui" id="close-log-modal" type="button">Close</button>
            </div>
        </div>
        <div class="log-body" id="log-output">
            <div class="log-empty">Waiting for logs...</div>
        </div>
    </div>
</div>

<script>
let statusCheckInterval;
let startTime = new Date('{{ $project->processing_started_at?->toISOString() ?? now()->toISOString() }}');
let currentStatus = '{{ $project->status }}';

let logsInterval = null;
let logsSince = 0;
let hasLogRows = false;
let lastStatusErrorMessage = null;

const logModal = document.getElementById('log-modal');
const logOutput = document.getElementById('log-output');
const autoScrollCheckbox = document.getElementById('auto-scroll');

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function updateDuration() {
    const now = new Date();
    const duration = Math.max(0, Math.floor((now - startTime) / 1000));
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    document.getElementById('duration').textContent = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function updateProgress(progress) {
    const safeProgress = Math.max(0, Math.min(100, Number(progress) || 0));
    document.getElementById('progress-fill').style.width = safeProgress + '%';
    document.getElementById('progress-text').textContent = safeProgress + '%';
}

function setStatusUI(status, message, errorMessage) {
    const statusEl = document.getElementById('current-status');
    const banner = document.getElementById('status-banner');
    const eta = document.getElementById('eta-text');
    const stage = document.getElementById('progress-stage');

    const statusLabel = {
        processing: 'Processing',
        reviewing: 'Scenes Ready',
        subtitle_selection: 'Subtitle Step Ready',
        subtitle_generating: 'Generating Subtitles',
        completed: 'Completed',
        failed: 'Failed'
    }[status] || 'Processing';

    const stageText = message || 'Processing...';
    stage.textContent = stageText;

    if (status === 'failed') {
        statusEl.innerHTML = '<i class="bi bi-x-octagon-fill" style="color: var(--red);"></i> ' + statusLabel;
        banner.className = 'status-banner error';
        banner.textContent = errorMessage || 'Processing failed. Open logs for details and retry.';
        eta.textContent = 'ETA: blocked';
    } else if (['reviewing', 'subtitle_selection', 'completed'].includes(status)) {
        statusEl.innerHTML = '<i class="bi bi-check-circle-fill" style="color: var(--green);"></i> ' + statusLabel;
        banner.className = 'status-banner success';
        banner.textContent = stageText;
        eta.textContent = status === 'completed' ? 'Done' : 'Ready for next step';
    } else if (status === 'subtitle_generating') {
        statusEl.innerHTML = '<span class="spinner-dot"></span> ' + statusLabel;
        banner.className = 'status-banner';
        banner.textContent = stageText;
        eta.textContent = 'ETA: 2-4 min';
    } else {
        statusEl.innerHTML = '<span class="spinner-dot"></span> ' + statusLabel;
        banner.className = 'status-banner';
        banner.textContent = stageText;
        eta.textContent = 'ETA: 3-5 min';
    }
}

function appendLogEntry(entry) {
    if (!entry || !entry.message) {
        return;
    }

    if (!hasLogRows) {
        logOutput.innerHTML = '';
        hasLogRows = true;
    }

    const source = (entry.source || 'system').toUpperCase();
    const level = (entry.level || 'info').toLowerCase();
    const ts = entry.ts ? new Date(entry.ts).toLocaleTimeString() : '--:--:--';
    const message = String(entry.message || '');

    let className = 'log-line';
    if (level.includes('error') || /(failed|error|exception|quota|429)/i.test(message)) {
        className += ' error';
    } else if (level.includes('warn') || /(warn|retry|fallback)/i.test(message)) {
        className += ' warn';
    } else if (level.includes('success') || /success|completed|ready|done|✅/i.test(message)) {
        className += ' success';
    }

    let contextText = '';
    if (entry.context && Object.keys(entry.context).length > 0) {
        contextText = '\n' + escapeHtml(JSON.stringify(entry.context, null, 2));
    }

    const row = document.createElement('div');
    row.className = className;
    row.innerHTML = `[${escapeHtml(ts)}] [${escapeHtml(source)}] ${escapeHtml(message)}${contextText}`;
    logOutput.appendChild(row);

    if (autoScrollCheckbox.checked) {
        logOutput.scrollTop = logOutput.scrollHeight;
    }
}

function pollLogs() {
    fetch('{{ route("projects.processing-logs", $project) }}?since=' + encodeURIComponent(logsSince) + '&limit=80', {
        headers: {
            'Accept': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
        },
        credentials: 'same-origin'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch logs (' + response.status + ')');
        }
        return response.json();
    })
    .then(data => {
        const entries = Array.isArray(data.entries) ? data.entries : [];
        entries.forEach(appendLogEntry);
        logsSince = Number(data.next_since || logsSince || 0);
    })
    .catch(error => {
        appendLogEntry({
            source: 'ui',
            level: 'warn',
            message: 'Log polling warning: ' + error.message,
            ts: new Date().toISOString(),
            context: {}
        });
    });
}

function startLogPolling() {
    if (logsInterval) {
        return;
    }
    pollLogs();
    logsInterval = setInterval(pollLogs, 1500);
}

function stopLogPolling() {
    if (logsInterval) {
        clearInterval(logsInterval);
        logsInterval = null;
    }
}

function openLogModal() {
    logModal.classList.add('show');
    logModal.setAttribute('aria-hidden', 'false');
    startLogPolling();
}

function closeLogModal() {
    logModal.classList.remove('show');
    logModal.setAttribute('aria-hidden', 'true');
    stopLogPolling();
}

function checkStatus() {
    fetch('{{ route("projects.processing-status", $project) }}', {
        headers: {
            'Accept': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
        },
        credentials: 'same-origin'
    })
    .then(response => {
        if (response.status === 401) {
            window.location.href = '{{ route("login") }}';
            return null;
        }
        return response.json();
    })
    .then(data => {
        if (!data) {
            return;
        }

        updateDuration();
        if (data.progress !== undefined) {
            updateProgress(data.progress);
        }
        if (data.status_message) {
            document.getElementById('status-message').textContent = data.status_message;
        }

        if (data.status !== currentStatus || data.error_message) {
            currentStatus = data.status;
            setStatusUI(data.status, data.status_message, data.error_message);
        }

        if (data.status === 'failed' && data.error_message && data.error_message !== lastStatusErrorMessage) {
            lastStatusErrorMessage = data.error_message;
            appendLogEntry({
                source: 'status',
                level: 'error',
                message: 'Project failed: ' + data.error_message,
                ts: new Date().toISOString(),
                context: {}
            });
        }

        if (data.status === 'failed' && data.can_retry) {
            if (!document.getElementById('retry-btn')) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.id = 'retry-btn';
                btn.className = 'btn-dark-ui btn-dark-primary';
                btn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Retry Project';
                btn.onclick = (event) => retryProject(event);
                document.querySelector('.processing-actions').appendChild(btn);
            }
        }

        if (data.is_completed) {
            clearInterval(statusCheckInterval);
            if (data.redirect_url) {
                setTimeout(() => {
                    window.location.href = data.redirect_url;
                }, 1800);
            }
        }
    })
    .catch(() => {
        // Keep the polling loop alive for transient errors.
    });
}

function retryProject(event) {
    const button = event?.currentTarget || document.getElementById('retry-btn');
    if (!button) {
        return;
    }

    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Retrying...';

    fetch('{{ route("projects.retry", $project) }}', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
        },
        credentials: 'same-origin'
    })
    .then(response => response.json())
    .then(data => {
        if (!data.success) {
            throw new Error(data.message || 'Retry failed');
        }

        button.remove();
        currentStatus = 'processing';
        setStatusUI('processing', 'Retry started. Processing restarted...', null);
        updateProgress(5);

        appendLogEntry({
            source: 'ui',
            level: 'info',
            message: 'Retry requested successfully. Waiting for backend logs...',
            ts: new Date().toISOString(),
            context: {}
        });

        setTimeout(() => {
            window.location.href = data.redirect_url;
        }, 1000);
    })
    .catch(error => {
        button.disabled = false;
        button.innerHTML = originalText;
        appendLogEntry({
            source: 'ui',
            level: 'error',
            message: 'Retry failed: ' + error.message,
            ts: new Date().toISOString(),
            context: {}
        });
        alert('Retry failed: ' + error.message);
    });
}

document.getElementById('open-logs-btn').addEventListener('click', openLogModal);
document.getElementById('close-log-modal').addEventListener('click', closeLogModal);
document.getElementById('clear-log-view').addEventListener('click', () => {
    logOutput.innerHTML = '<div class="log-empty">Log view cleared. Streaming new lines...</div>';
    hasLogRows = false;
});

logModal.addEventListener('click', (event) => {
    if (event.target === logModal) {
        closeLogModal();
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && logModal.classList.contains('show')) {
        closeLogModal();
    }
});

updateDuration();
setInterval(updateDuration, 1000);
statusCheckInterval = setInterval(checkStatus, 3000);
checkStatus();
</script>
@endsection
