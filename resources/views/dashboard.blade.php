@extends('layouts.app')

@section('title', 'Dashboard')

@section('content')
<div class="container py-5">
    <div class="row">
        <div class="col-12">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h1 class="h2">Welcome back, {{ Auth::user()->name }}!</h1>
                    <p class="text-muted">Manage your video projects and create new AI-generated content.</p>
                </div>
                <a href="{{ route('projects.create') }}" class="btn btn-primary btn-lg">
                    <i class="bi bi-plus-circle"></i> Create New Video
                </a>
            </div>
        </div>
    </div>
    
    <!-- Stats Cards -->
    <div class="row mb-5">
        <div class="col-md-3 mb-3">
            <div class="card text-center">
                <div class="card-body">
                    <i class="bi bi-collection-play text-primary" style="font-size: 2rem;"></i>
                    <h3 class="mt-2">{{ $projects->count() }}</h3>
                    <p class="text-muted mb-0">Total Projects</p>
                </div>
            </div>
        </div>
        <div class="col-md-3 mb-3">
            <div class="card text-center">
                <div class="card-body">
                    <i class="bi bi-check-circle text-success" style="font-size: 2rem;"></i>
                    <h3 class="mt-2">{{ $projects->where('status', 'completed')->count() }}</h3>
                    <p class="text-muted mb-0">Completed</p>
                </div>
            </div>
        </div>
        <div class="col-md-3 mb-3">
            <div class="card text-center">
                <div class="card-body">
                    <i class="bi bi-clock text-warning" style="font-size: 2rem;"></i>
                    <h3 class="mt-2">{{ $projects->where('status', 'processing')->count() }}</h3>
                    <p class="text-muted mb-0">Processing</p>
                </div>
            </div>
        </div>
        <div class="col-md-3 mb-3">
            <div class="card text-center">
                <div class="card-body">
                    <i class="bi bi-eye text-info" style="font-size: 2rem;"></i>
                    <h3 class="mt-2">{{ $projects->whereIn('status', ['reviewing', 'subtitle_selection'])->count() }}</h3>
                    <p class="text-muted mb-0">Reviewing</p>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Projects List -->
    <div class="row">
        <div class="col-12">
            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">Your Projects</h5>
                    <small class="text-muted">{{ $projects->count() }} total projects</small>
                </div>
                <div class="card-body">
                    @if($projects->isEmpty())
                        <div class="text-center py-5">
                            <i class="bi bi-camera-video text-muted" style="font-size: 4rem;"></i>
                            <h4 class="mt-3">No projects yet</h4>
                            <p class="text-muted">Create your first AI-generated video to get started!</p>
                            <a href="{{ route('projects.create') }}" class="btn btn-primary">
                                <i class="bi bi-plus-circle"></i> Create Your First Video
                            </a>
                        </div>
                    @else
                        <div class="table-responsive">
                            <table class="table table-hover">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Type</th>
                                        <th>Status</th>
                                        <th>Created</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    @foreach($projects as $project)
                                        <tr>
                                            <td>
                                                <div>
                                                    <strong>{{ $project->name }}</strong>
                                                    <br>
                                                    <small class="text-muted">{{ Str::limit($project->description, 50) }}</small>
                                                    @if($project->video_format)
                                                        <br>
                                                        <small class="text-primary">
                                                            <i class="bi bi-aspect-ratio"></i>
                                                            {{ is_array($project->video_format) ? implode(', ', $project->video_format) : $project->video_format }}
                                                        </small>
                                                    @endif
                                                </div>
                                            </td>
                                            <td>
                                                <span class="badge bg-light text-dark">
                                                    <i class="bi bi-{{ $project->type == 'product' ? 'box' : 'gear' }}"></i>
                                                    {{ ucfirst($project->type) }}
                                                </span>
                                            </td>
                                            <td>{!! $project->status_badge !!}</td>
                                            <td>
                                                <small class="text-muted">
                                                    {{ $project->created_at->format('M d, Y') }}
                                                    <br>
                                                    {{ $project->created_at->format('g:i A') }}
                                                </small>
                                            </td>
                                            <td>
                                                <div class="btn-group btn-group-sm">
                                                    @if($project->status == 'processing')
                                                        <a href="{{ route('projects.processing', $project) }}" class="btn btn-outline-primary">
                                                            <i class="bi bi-clock"></i> View
                                                        </a>
                                                    @elseif($project->status == 'reviewing')
                                                        <a href="{{ route('projects.review', $project) }}" class="btn btn-outline-warning">
                                                            <i class="bi bi-eye"></i> Review
                                                        </a>
                                                    @elseif($project->status == 'subtitle_selection')
                                                        <a href="{{ route('projects.subtitle-styles', $project) }}" class="btn btn-outline-purple">
                                                            <i class="bi bi-fonts"></i> Choose Subtitles
                                                        </a>
                                                        <a href="{{ route('projects.review', $project) }}" class="btn btn-outline-secondary btn-sm">
                                                            <i class="bi bi-arrow-left"></i> Back to Review
                                                        </a>
                                                    @elseif($project->status == 'completed')
                                                        <a href="{{ route('projects.final', $project) }}" class="btn btn-outline-success">
                                                            <i class="bi bi-play"></i> View
                                                        </a>
                                                        <a href="{{ route('projects.download', $project) }}" class="btn btn-outline-primary">
                                                            <i class="bi bi-download"></i> Download
                                                        </a>
                                                    @else
                                                        <button class="btn btn-outline-secondary" disabled>
                                                            <i class="bi bi-hourglass"></i> Pending
                                                        </button>
                                                    @endif
                                                </div>
                                            </td>
                                        </tr>
                                    @endforeach
                                </tbody>
                            </table>
                        </div>
                    @endif
                </div>
            </div>
        </div>
    </div>
</div>
@endsection