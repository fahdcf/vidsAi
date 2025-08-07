@extends('layouts.app')

@section('title', 'Final Video')

@section('content')
<div class="container py-5">
    <div class="row">
        <div class="col-12">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h1 class="h2">Your Video is Ready!</h1>
                    <p class="text-muted">
                        {{ $project->name }} - Final video preview and download
                        @if($project->video_format)
                            <br><small class="text-primary">
                                <i class="bi bi-aspect-ratio"></i>
                                Available in: {{ is_array($project->video_format) ? implode(', ', $project->video_format) : $project->video_format }}
                            </small>
                        @endif
                    </p>
                </div>
                <div class="d-flex gap-2">
                    <a href="{{ route('dashboard') }}" class="btn btn-outline-secondary">
                        <i class="bi bi-arrow-left"></i> Dashboard
                    </a>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Progress Indicator -->
    <div class="card mb-4">
        <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
                <div class="d-flex align-items-center">
                    <div class="progress-step completed me-3">
                        <i class="bi bi-check"></i>
                    </div>
                    <span>Generation Complete</span>
                </div>
                <div class="d-flex align-items-center">
                    <div class="progress-step completed me-3">
                        <i class="bi bi-check"></i>
                    </div>
                    <span>Scenes Reviewed</span>
                </div>
                <div class="d-flex align-items-center">
                    <div class="progress-step active me-3">
                        <i class="bi bi-check"></i>
                    </div>
                    <span class="fw-bold">Final Video Ready</span>
                </div>
            </div>
        </div>
    </div>
    
    <div class="row">
        <!-- Video Preview -->
        <div class="col-lg-8 mb-4">
            <div class="card">
                <div class="card-header">
                    <h5 class="mb-0"><i class="bi bi-play-circle"></i> Video Preview</h5>
                </div>
                <div class="card-body">
                    @if($project->final_video_path)
                        <div class="video-preview mb-3">
                            <video controls class="w-100" style="max-height: 500px;">
                                <source src="{{ $project->getFinalVideoUrl() }}" type="video/mp4">
                                Your browser does not support the video tag.
                            </video>
                        </div>
                        
                        <!-- Video Info -->
                        <div class="alert alert-success">
                            <i class="bi bi-check-circle"></i>
                            <strong>Video Generated Successfully!</strong>
                            @if($project->processing_completed_at)
                                <br><small class="text-muted">Completed at: {{ $project->processing_completed_at->format('M d, Y g:i A') }}</small>
                            @endif
                            @if($project->isFinalVideoExternal())
                                <br><small class="text-muted">
                                    <i class="bi bi-link-45deg"></i>
                                    <a href="{{ $project->final_video_path }}" target="_blank" class="text-decoration-none">
                                        View Video URL
                                    </a>
                                </small>
                            @endif
                        </div>
                    @else
                        <!-- Placeholder for demo -->
                        <div class="bg-light p-5 text-center rounded mb-3">
                            <i class="bi bi-camera-video text-muted" style="font-size: 5rem;"></i>
                            <h4 class="mt-3 text-muted">Video Preview</h4>
                            <p class="text-muted">Your final video will appear here</p>
                        </div>
                    @endif
                    
                    <!-- Video Controls -->
                    <div class="d-flex justify-content-center gap-2">
                        <button type="button" class="btn btn-outline-primary btn-sm">
                            <i class="bi bi-skip-backward"></i>
                        </button>
                        <button type="button" class="btn btn-primary btn-sm">
                            <i class="bi bi-play"></i>
                        </button>
                        <button type="button" class="btn btn-outline-primary btn-sm">
                            <i class="bi bi-skip-forward"></i>
                        </button>
                        <button type="button" class="btn btn-outline-secondary btn-sm">
                            <i class="bi bi-volume-up"></i>
                        </button>
                        <button type="button" class="btn btn-outline-secondary btn-sm">
                            <i class="bi bi-arrows-fullscreen"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Download Options -->
        <div class="col-lg-4 mb-4">
            <div class="card">
                <div class="card-header">
                    <h5 class="mb-0"><i class="bi bi-download"></i> Download Options</h5>
                </div>
                <div class="card-body">
                    <div class="mb-3">
                        <label for="format" class="form-label">Choose Format:</label>
                        <select class="form-select" id="format">
                            <option value="youtube">YouTube (16:9) - 1920x1080</option>
                            <option value="reel">Instagram Reel (9:16) - 1080x1920</option>
                            <option value="square">Square (1:1) - 1080x1080</option>
                            <option value="story">Story (9:16) - 1080x1920</option>
                        </select>
                    </div>
                    
                    <div class="mb-3">
                        <label for="quality" class="form-label">Quality:</label>
                        <select class="form-select" id="quality">
                            <option value="hd">HD (1080p)</option>
                            <option value="4k">4K (2160p)</option>
                            <option value="web">Web Optimized (720p)</option>
                        </select>
                    </div>
                    
                    <div class="d-grid gap-2">
                        @if($project->final_video_path)
                            @if($project->isFinalVideoExternal())
                                <!-- External URL - direct link -->
                                <a href="{{ $project->final_video_path }}" 
                                   target="_blank"
                                   class="btn btn-success btn-lg download-btn">
                                    <i class="bi bi-play-circle"></i> View Video
                                </a>
                                <a href="{{ route('projects.download', [$project, 'youtube']) }}" 
                                   class="btn btn-outline-success">
                                    <i class="bi bi-download"></i> Download Video
                                </a>
                            @else
                                <!-- Local file -->
                                <a href="{{ route('projects.download', [$project, 'youtube']) }}" 
                                   class="btn btn-success btn-lg download-btn">
                                    <i class="bi bi-download"></i> Download Video
                                </a>
                            @endif
                        @else
                            <button type="button" class="btn btn-secondary btn-lg" disabled>
                                <i class="bi bi-hourglass-split"></i> Video Not Ready
                            </button>
                        @endif
                        <button type="button" class="btn btn-outline-info" onclick="openInEditor()">
                            <i class="bi bi-pencil-square"></i> Open in Clipchamp
                        </button>
                    </div>
                    
                    <hr>
                    
                    <div class="text-center">
                        <small class="text-muted">
                            <i class="bi bi-info-circle"></i>
                            Video will be downloaded in MP4 format
                        </small>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Subtitle Editor -->
    <div class="card mb-4">
        <div class="card-header">
            <h5 class="mb-0"><i class="bi bi-fonts"></i> Subtitle Settings</h5>
        </div>
        <div class="card-body">
            <div class="row">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="subtitle-style" class="form-label">Subtitle Style:</label>
                        <select class="form-select" id="subtitle-style">
                            <option value="modern">Modern</option>
                            <option value="classic">Classic</option>
                            <option value="bold">Bold</option>
                            <option value="minimal">Minimal</option>
                            <option value="creative">Creative</option>
                        </select>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label for="subtitle-position" class="form-label">Position:</label>
                        <select class="form-select" id="subtitle-position">
                            <option value="bottom">Bottom</option>
                            <option value="center">Center</option>
                            <option value="top">Top</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <!-- Subtitle Preview -->
            <div class="mb-3">
                <label class="form-label">Subtitle Preview:</label>
                <div class="bg-dark text-white p-3 rounded text-center">
                    <span class="subtitle-preview" style="background: rgba(0,0,0,0.7); padding: 5px 10px; border-radius: 5px;">
                        Sample subtitle text
                    </span>
                </div>
            </div>
            
            <!-- Subtitle Editor -->
            <div class="mb-3">
                <label for="subtitle-text" class="form-label">Edit Subtitles:</label>
                <textarea class="form-control" id="subtitle-text" rows="4" placeholder="Edit your subtitle text here...">Welcome to our amazing product demo.
This video showcases all the features.
Thank you for watching!</textarea>
            </div>
            
            <div class="d-flex gap-2">
                <button type="button" class="btn btn-primary">
                    <i class="bi bi-check"></i> Update Subtitles
                </button>
                <button type="button" class="btn btn-outline-secondary">
                    <i class="bi bi-eye-slash"></i> Hide Subtitles
                </button>
            </div>
        </div>
    </div>
    
    <!-- Project Summary -->
    <div class="card">
        <div class="card-header">
            <h5 class="mb-0"><i class="bi bi-info-circle"></i> Project Summary</h5>
        </div>
        <div class="card-body">
            <div class="row">
                <div class="col-md-6">
                    <h6>Project Details</h6>
                    <ul class="list-unstyled">
                        <li><strong>Name:</strong> {{ $project->name }}</li>
                        <li><strong>Type:</strong> {{ ucfirst($project->type) }}</li>
                        <li><strong>Category:</strong> {{ ucfirst($project->category) }}</li>
                        <li><strong>Language:</strong> {{ ucfirst($project->language) }}</li>
                        <li><strong>Created:</strong> {{ $project->created_at->format('M d, Y g:i A') }}</li>
                    </ul>
                </div>
                <div class="col-md-6">
                    <h6>Technical Details</h6>
                    <ul class="list-unstyled">
                        <li><strong>Scenes:</strong> {{ $project->scenes->count() }}</li>
                        <li><strong>Approved Scenes:</strong> {{ $project->scenes->where('approved', true)->count() }}</li>
                        <li><strong>Script Option:</strong> {{ $project->script_option == 'generate' ? 'AI Generated' : 'Custom' }}</li>
                        <li><strong>Voiceover:</strong> {{ ucfirst($project->voiceover_option) }}</li>
                        <li><strong>Status:</strong> {!! $project->status_badge !!}</li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
</div>

@push('scripts')
<script>
// Update download link when format changes
document.getElementById('format').addEventListener('change', function() {
    const format = this.value;
    const downloadBtn = document.querySelector('.download-btn');
    downloadBtn.href = `/download/{{ $project->id }}/${format}`;
});

// Open in external editor
function openInEditor() {
    alert('This feature would integrate with Clipchamp or similar video editing tools.');
    // In a real implementation, this would:
    // 1. Upload the video to the editor's cloud storage
    // 2. Generate a shareable link
    // 3. Open the editor with the project loaded
}

// Subtitle style preview
document.getElementById('subtitle-style').addEventListener('change', function() {
    const style = this.value;
    const preview = document.querySelector('.subtitle-preview');
    
    // Reset classes
    preview.className = 'subtitle-preview';
    
    // Apply style
    switch(style) {
        case 'modern':
            preview.style.background = 'rgba(0,0,0,0.7)';
            preview.style.color = 'white';
            preview.style.fontWeight = 'normal';
            break;
        case 'classic':
            preview.style.background = 'yellow';
            preview.style.color = 'black';
            preview.style.fontWeight = 'bold';
            break;
        case 'bold':
            preview.style.background = 'red';
            preview.style.color = 'white';
            preview.style.fontWeight = 'bold';
            break;
        case 'minimal':
            preview.style.background = 'transparent';
            preview.style.color = 'white';
            preview.style.fontWeight = 'normal';
            preview.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
            break;
        case 'creative':
            preview.style.background = 'linear-gradient(45deg, #ff6b6b, #4ecdc4)';
            preview.style.color = 'white';
            preview.style.fontWeight = 'bold';
            break;
    }
});

// Initialize
document.getElementById('subtitle-style').dispatchEvent(new Event('change'));
</script>
@endpush
@endsection