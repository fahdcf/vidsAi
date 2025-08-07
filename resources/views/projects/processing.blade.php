@extends('layouts.app')

@section('title', 'Processing Video - ' . $project->name)

@push('styles')
<meta name="csrf-token" content="{{ csrf_token() }}">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" rel="stylesheet">
    <style>
        /* Processing Page Styling */
        .processing-page {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .processing-container {
            max-width: 600px;
            width: 100%;
            padding: 20px;
        }

        .processing-card {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .processing-icon {
            width: 80px;
            height: 80px;
            margin: 0 auto 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: pulse 2s infinite;
        }

        .processing-icon i {
            font-size: 36px;
            color: white;
        }

        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }

        .processing-title {
            font-size: 2rem;
            font-weight: 700;
            color: #2d3748;
            margin-bottom: 15px;
        }

        .processing-subtitle {
            font-size: 1.1rem;
            color: #718096;
            margin-bottom: 30px;
            line-height: 1.6;
        }

        .progress-container {
            margin: 30px 0;
        }

        .progress {
            height: 8px;
            border-radius: 10px;
            background-color: #e2e8f0;
            overflow: hidden;
        }

        .progress-bar {
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
            border-radius: 10px;
            transition: width 0.3s ease;
        }

        .status-info {
            background: #f7fafc;
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
            border-left: 4px solid #667eea;
        }

        .status-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 10px;
        }

        .status-item:last-child {
            margin-bottom: 0;
        }

        .status-label {
            font-weight: 600;
            color: #4a5568;
        }

        .status-value {
            color: #718096;
            font-family: monospace;
        }

        .spinner {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid #e2e8f0;
            border-radius: 50%;
            border-top-color: #667eea;
            animation: spin 1s ease-in-out infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .error-state {
            background: #fed7d7;
            border-left-color: #e53e3e;
        }

        .success-state {
            background: #c6f6d5;
            border-left-color: #38a169;
        }

        .estimated-time {
            font-size: 0.9rem;
            color: #a0aec0;
            margin-top: 15px;
        }

        /* Responsive */
        @media (max-width: 768px) {
            .processing-card {
                padding: 30px 20px;
            }

            .processing-title {
                font-size: 1.5rem;
            }
        }
    </style>
@endpush

@section('content')
<div class="processing-page">
    <div class="processing-container">
        <div class="processing-card">
            <div class="processing-icon">
                <i class="bi bi-gear-fill"></i>
            </div>

            <h1 class="processing-title">Processing Your Video</h1>
            <p class="processing-subtitle">
                We're trimming your scenes and preparing your video. This process can take up to 10 minutes depending on the complexity.
            </p>

            <div class="progress-container">
                <div class="progress">
                    <div class="progress-bar" role="progressbar" style="width: 0%" id="progress-bar"></div>
                </div>
            </div>

            <div class="status-info" id="status-info">
                <div class="status-item">
                    <span class="status-label">Status:</span>
                    <span class="status-value" id="current-status">
                        <span class="spinner"></span> Processing...
                    </span>
                </div>
                <div class="status-item">
                    <span class="status-label">Started:</span>
                    <span class="status-value" id="start-time">{{ $project->processing_started_at?->format('H:i:s') ?? 'Just now' }}</span>
                </div>
                <div class="status-item">
                    <span class="status-label">Duration:</span>
                    <span class="status-value" id="duration">0s</span>
                </div>
            </div>

            <div class="estimated-time">
                <i class="bi bi-clock me-1"></i>
                Estimated completion time: 5-10 minutes
            </div>
        </div>
    </div>
</div>

<script>
let statusCheckInterval;
let startTime = new Date('{{ $project->processing_started_at?->toISOString() ?? now()->toISOString() }}');
let progressValue = 0;

function updateDuration() {
    const now = new Date();
    const duration = Math.floor((now - startTime) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;

    document.getElementById('duration').textContent =
        minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function updateProgress() {
    // Simulate progress based on time (not real progress)
    const now = new Date();
    const elapsed = (now - startTime) / 1000; // seconds
    const maxTime = 600; // 10 minutes

    progressValue = Math.min(95, (elapsed / maxTime) * 100);
    document.getElementById('progress-bar').style.width = progressValue + '%';
}

function checkStatus() {
    fetch('{{ route("projects.processing-status", $project) }}', {
        headers: {
            'Accept': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log('📊 Status check:', data);

        updateDuration();
        updateProgress();

        if (data.is_completed) {
            clearInterval(statusCheckInterval);

            if (data.status === 'reviewing') {
                document.getElementById('current-status').innerHTML =
                    '<i class="bi bi-check-circle text-success"></i> Scenes Generated!';
                document.getElementById('status-info').className = 'status-info success-state';
                document.getElementById('progress-bar').style.width = '100%';

                setTimeout(() => {
                    window.location.href = data.redirect_url;
                }, 2000);

            } else if (data.status === 'subtitle_selection') {
                document.getElementById('current-status').innerHTML =
                    '<i class="bi bi-check-circle text-success"></i> Processing Complete!';
                document.getElementById('status-info').className = 'status-info success-state';
                document.getElementById('progress-bar').style.width = '100%';

                setTimeout(() => {
                    window.location.href = data.redirect_url;
                }, 2000);

            } else if (data.status === 'completed') {
                document.getElementById('current-status').innerHTML =
                    '<i class="bi bi-check-circle text-success"></i> Video Ready!';
                document.getElementById('status-info').className = 'status-info success-state';
                document.getElementById('progress-bar').style.width = '100%';

                setTimeout(() => {
                    window.location.href = data.redirect_url;
                }, 2000);

            } else if (data.status === 'failed' || data.status === 'trim_failed') {
                document.getElementById('current-status').innerHTML =
                    '<i class="bi bi-x-circle text-danger"></i> Processing Failed';
                document.getElementById('status-info').className = 'status-info error-state';

                // Show error message
                const errorDiv = document.createElement('div');
                errorDiv.className = 'status-item';
                errorDiv.innerHTML = `
                    <span class="status-label">Error:</span>
                    <span class="status-value text-danger">${data.error_message || 'Processing failed. Please try again.'}</span>
                `;
                document.getElementById('status-info').appendChild(errorDiv);

                // Add retry button after 3 seconds
                setTimeout(() => {
                    const retryDiv = document.createElement('div');
                    retryDiv.className = 'status-item';
                    retryDiv.innerHTML = `
                        <span class="status-label">Action:</span>
                        <span class="status-value">
                            <a href="${data.redirect_url || '{{ route("projects.create") }}'}" class="btn btn-sm btn-primary">
                                <i class="bi bi-arrow-clockwise me-1"></i>Try Again
                            </a>
                        </span>
                    `;
                    document.getElementById('status-info').appendChild(retryDiv);
                }, 3000);
            }
        }
    })
    .catch(error => {
        console.error('❌ Status check failed:', error);
    });
}

// Start checking status every 3 seconds
statusCheckInterval = setInterval(checkStatus, 3000);

// Initial check
checkStatus();

// Update duration every second
setInterval(updateDuration, 1000);
</script>

@push('scripts')
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
@endpush

@endsection