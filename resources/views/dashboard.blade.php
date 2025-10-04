<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Dashboard - VidsAI</title>
    
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Bootstrap Icons -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
    <!-- VidsAI Theme -->
    <link rel="stylesheet" href="{{ asset('css/vidsai-theme.css') }}">
    
    <style>
        /* Dashboard-specific styles */
        .dashboard-hero {
            background: var(--bg-gradient-main);
            position: relative;
            overflow: hidden;
            padding: 120px 0 80px;
        }

        .dashboard-hero::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: 
                radial-gradient(circle at 20% 80%, rgba(66, 153, 225, 0.08) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(159, 122, 234, 0.08) 0%, transparent 50%);
            z-index: 1;
        }

        .dashboard-content {
            position: relative;
            z-index: 2;
        }

        .stats-card {
            background: var(--bg-gradient-surface);
            border: 1px solid var(--dark-border);
            border-radius: var(--border-radius-xl);
            padding: 2rem;
            text-align: center;
            transition: var(--transition-medium);
            backdrop-filter: blur(10px);
            position: relative;
            overflow: hidden;
        }

        .stats-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: var(--gradient-primary);
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        .stats-card:hover::before {
            opacity: 1;
        }

        .stats-card:hover {
            transform: translateY(-5px);
            border-color: var(--accent-blue);
            box-shadow: var(--shadow-lg);
        }

        .stats-icon {
            width: 60px;
            height: 60px;
            border-radius: var(--border-radius-lg);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1rem;
            font-size: 1.5rem;
            color: white;
        }

        .stats-icon-1 { background: var(--gradient-primary); }
        .stats-icon-2 { background: var(--gradient-success); }
        .stats-icon-3 { background: var(--gradient-warning); }
        .stats-icon-4 { background: var(--gradient-secondary); }

        .projects-section {
            background: var(--dark-bg);
            position: relative;
            z-index: 2;
        }

        .projects-card {
            background: var(--bg-gradient-surface);
            border: 1px solid var(--dark-border);
            border-radius: var(--border-radius-xl);
            backdrop-filter: blur(10px);
            overflow: hidden;
        }

        .projects-header {
            background: linear-gradient(145deg, var(--dark-surface-2), var(--dark-surface));
            border-bottom: 1px solid var(--dark-border);
            padding: 1.5rem 2rem;
        }

        .project-row {
            background: transparent;
            border-bottom: 1px solid var(--dark-border);
            transition: var(--transition-fast);
            padding: 1.5rem 2rem;
        }

        .project-row:hover {
            background: rgba(66, 153, 225, 0.05);
        }

        .project-row:last-child {
            border-bottom: none;
        }

        .project-name {
            font-weight: 600;
            color: var(--dark-text);
            margin-bottom: 0.25rem;
        }

        .project-description {
            color: var(--dark-text-secondary);
            font-size: 0.875rem;
            margin-bottom: 0.25rem;
        }

        .project-format {
            color: var(--accent-blue);
            font-size: 0.75rem;
        }

        .status-badge {
            padding: 0.375rem 0.75rem;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .status-completed { 
            background: linear-gradient(135deg, var(--accent-green), rgba(72, 187, 120, 0.8));
            color: white;
        }
        .status-processing { 
            background: linear-gradient(135deg, var(--accent-orange), rgba(237, 137, 54, 0.8));
            color: white;
        }
        .status-reviewing { 
            background: linear-gradient(135deg, var(--accent-blue), rgba(66, 153, 225, 0.8));
            color: white;
        }
        .status-subtitle_selection { 
            background: linear-gradient(135deg, var(--accent-purple), rgba(159, 122, 234, 0.8));
            color: white;
        }
        .status-subtitle_generating { 
            background: linear-gradient(135deg, var(--accent-orange), rgba(237, 137, 54, 0.8));
            color: white;
        }
        .status-failed { 
            background: linear-gradient(135deg, #ef4444, rgba(239, 68, 68, 0.8));
            color: white;
        }
        .status-pending { 
            background: linear-gradient(135deg, var(--dark-text-secondary), rgba(160, 174, 192, 0.8));
            color: white;
        }

        .empty-state {
            text-align: center;
            padding: 4rem 2rem;
            color: var(--dark-text-secondary);
        }

        .empty-state-icon {
            font-size: 4rem;
            color: var(--accent-blue);
            opacity: 0.5;
            margin-bottom: 1.5rem;
        }

        .action-btn {
            padding: 0.5rem 1rem;
            border-radius: var(--border-radius-md);
            font-size: 0.875rem;
            font-weight: 500;
            transition: var(--transition-fast);
            border: 1px solid var(--dark-border);
            background: var(--glass-bg);
            color: var(--dark-text);
            backdrop-filter: blur(10px);
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
        }

        .action-btn:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-sm);
            color: var(--dark-text);
        }

        .action-btn-primary {
            background: var(--gradient-primary);
            border-color: var(--accent-blue);
            color: white;
        }

        .action-btn-primary:hover {
            color: white;
        }

        .action-btn-success {
            background: var(--gradient-success);
            border-color: var(--accent-green);
            color: white;
        }

        .action-btn-success:hover {
            color: white;
        }

        .action-btn-warning {
            background: var(--gradient-warning);
            border-color: var(--accent-orange);
            color: white;
        }

        .action-btn-warning:hover {
            color: white;
        }

        .action-btn-secondary {
            background: var(--gradient-secondary);
            border-color: var(--accent-purple);
            color: white;
        }

        .action-btn-secondary:hover {
            color: white;
        }

        .welcome-text {
            background: var(--gradient-primary);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .type-badge {
            padding: 0.25rem 0.75rem;
            border-radius: 15px;
            font-size: 0.75rem;
            font-weight: 500;
            background: var(--glass-bg);
            border: 1px solid var(--dark-border);
            color: var(--dark-text);
        }

        .type-product {
            background: linear-gradient(135deg, var(--accent-blue), rgba(66, 153, 225, 0.3));
            color: white;
            border-color: var(--accent-blue);
        }

        .type-service {
            background: linear-gradient(135deg, var(--accent-green), rgba(72, 187, 120, 0.3));
            color: white;
            border-color: var(--accent-green);
        }

        @media (max-width: 768px) {
            .dashboard-hero {
                padding: 100px 0 60px;
            }
            
            .stats-card {
                padding: 1.5rem;
            }
            
            .project-row {
                padding: 1rem;
            }
        }
    </style>
</head>
<body class="animated-background">
    <!-- Navigation -->
    <nav class="navbar navbar-expand-lg navbar-dark glass-nav fixed-top">
        <div class="container">
            <a class="navbar-brand d-flex align-items-center" href="{{ route('home') }}">
                <i class="bi bi-camera-video-fill text-primary me-2" style="font-size: 1.5rem;"></i>
                <span class="fw-bold fs-4">VidsAI</span>
            </a>
            
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                <span class="navbar-toggler-icon"></span>
            </button>
            
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav me-auto">
                    <li class="nav-item">
                        <a class="nav-link" href="{{ route('home') }}">Home</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="{{ route('pricing') }}">Pricing</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link active" href="{{ route('dashboard') }}">Dashboard</a>
                    </li>
                </ul>
                
                <ul class="navbar-nav">
                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle d-flex align-items-center" href="#" role="button" data-bs-toggle="dropdown">
                            <div class="bg-primary rounded-circle me-2 d-flex align-items-center justify-content-center" style="width: 32px; height: 32px;">
                                <span class="text-white fw-bold">{{ substr(Auth::user()->name, 0, 1) }}</span>
                            </div>
                            {{ Auth::user()->name }}
                        </a>
                        <ul class="dropdown-menu dropdown-menu-dark">
                            <li><a class="dropdown-item" href="{{ route('profile.edit') }}">Profile</a></li>
                            <li><a class="dropdown-item" href="{{ route('projects.create') }}">Create Project</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li>
                                <form method="POST" action="{{ route('logout') }}" class="d-inline">
                                    @csrf
                                    <button type="submit" class="dropdown-item">Logout</button>
                                </form>
                            </li>
                        </ul>
                    </li>
                </ul>
            </div>
        </div>
    </nav>

    <!-- Dashboard Hero Section -->
    <section class="dashboard-hero">
        <div class="container dashboard-content">
            <div class="row align-items-center">
                <div class="col-lg-8 fade-in-left">
                    <div class="mb-4">
                        <span class="badge bg-primary bg-opacity-20 text-primary px-4 py-2 rounded-pill">
                            <i class="bi bi-speedometer2 me-2"></i>Dashboard
                        </span>
                </div>
                    
                    <h1 class="display-4 fw-bold mb-4">
                        Welcome back, 
                        <span class="welcome-text">{{ Auth::user()->name }}!</span>
                    </h1>
                    
                    <p class="lead mb-4" style="color: var(--dark-text-secondary);">
                        Manage your video projects and create new AI-generated content with ease.
                    </p>
                    
                    <div class="d-flex flex-column flex-sm-row gap-3">
                        <a href="{{ route('projects.create') }}" class="btn btn-primary-enhanced btn-lg">
                            <i class="bi bi-plus-circle me-2"></i>Create New Video
                        </a>
                        <a href="{{ route('pricing') }}" class="btn btn-outline-enhanced btn-lg">
                            View Plans <i class="bi bi-arrow-right ms-2"></i>
                </a>
            </div>
                </div>
                
                <div class="col-lg-4 text-center fade-in-right">
                    <div class="position-relative">
                        <div class="stats-card">
                            <div class="stats-icon stats-icon-1">
                                <i class="bi bi-collection-play"></i>
                            </div>
                            <h3 class="fw-bold mb-2" style="color: var(--dark-text);">{{ $projects->count() }}</h3>
                            <p class="mb-0" style="color: var(--dark-text-secondary);">Total Projects</p>
        </div>
    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Stats Section -->
    <section class="py-5" style="background: var(--dark-bg); position: relative; z-index: 2;">
        <div class="container">
            <div class="row g-4 mb-5">
                <div class="col-md-6 col-lg-3 fade-in-up">
                    <div class="stats-card">
                        <div class="stats-icon stats-icon-2">
                            <i class="bi bi-check-circle"></i>
                        </div>
                        <h3 class="fw-bold mb-2" style="color: var(--dark-text);">{{ $projects->where('status', 'completed')->count() }}</h3>
                        <p class="mb-0" style="color: var(--dark-text-secondary);">Completed</p>
                    </div>
                </div>
                
                <div class="col-md-6 col-lg-3 fade-in-up">
                    <div class="stats-card">
                        <div class="stats-icon stats-icon-3">
                            <i class="bi bi-clock"></i>
                        </div>
                        <h3 class="fw-bold mb-2" style="color: var(--dark-text);">{{ $projects->whereIn('status', ['processing', 'subtitle_generating'])->count() }}</h3>
                        <p class="mb-0" style="color: var(--dark-text-secondary);">Processing</p>
                </div>
            </div>
                
                <div class="col-md-6 col-lg-3 fade-in-up">
                    <div class="stats-card">
                        <div class="stats-icon stats-icon-4">
                            <i class="bi bi-eye"></i>
        </div>
                        <h3 class="fw-bold mb-2" style="color: var(--dark-text);">{{ $projects->whereIn('status', ['reviewing', 'subtitle_selection'])->count() }}</h3>
                        <p class="mb-0" style="color: var(--dark-text-secondary);">Reviewing</p>
                </div>
            </div>
                
                <div class="col-md-6 col-lg-3 fade-in-up">
                    <div class="stats-card">
                        <div class="stats-icon" style="background: linear-gradient(135deg, #ef4444, rgba(239, 68, 68, 0.8));">
                            <i class="bi bi-exclamation-triangle"></i>
        </div>
                        <h3 class="fw-bold mb-2" style="color: var(--dark-text);">{{ $projects->where('status', 'failed')->count() }}</h3>
                        <p class="mb-0" style="color: var(--dark-text-secondary);">Failed</p>
                </div>
            </div>
        </div>
    </div>
    </section>
    
    <!-- Projects Section -->
    <section class="projects-section py-5">
        <div class="container">
    <div class="row">
        <div class="col-12">
                    <div class="projects-card fade-in-up">
                        <div class="projects-header">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h5 class="mb-1 fw-bold" style="color: var(--dark-text);">Your Projects</h5>
                                    <small style="color: var(--dark-text-secondary);">{{ $projects->count() }} total projects</small>
                                </div>
                                <a href="{{ route('projects.create') }}" class="btn btn-primary-enhanced">
                                    <i class="bi bi-plus-circle me-2"></i>New Project
                                </a>
                            </div>
                </div>
                        
                        <div class="projects-body">
                    @if($projects->isEmpty())
                                <div class="empty-state">
                                    <div class="empty-state-icon">
                                        <i class="bi bi-camera-video"></i>
                                    </div>
                                    <h4 class="fw-bold mb-3" style="color: var(--dark-text);">No projects yet</h4>
                                    <p class="mb-4">Create your first AI-generated video to get started!</p>
                                    <a href="{{ route('projects.create') }}" class="btn btn-primary-enhanced btn-lg">
                                        <i class="bi bi-plus-circle me-2"></i>Create Your First Video
                            </a>
                        </div>
                    @else
                                    @foreach($projects as $project)
                                    <div class="project-row">
                                        <div class="row align-items-center">
                                            <div class="col-lg-4">
                                                <div class="project-name">{{ $project->name }}</div>
                                                <div class="project-description">{{ Str::limit($project->description, 60) }}</div>
                                                    @if($project->video_format)
                                                    <div class="project-format">
                                                        <i class="bi bi-aspect-ratio me-1"></i>
                                                            {{ is_array($project->video_format) ? implode(', ', $project->video_format) : $project->video_format }}
                                                    </div>
                                                    @endif
                                                </div>
                                            
                                            <div class="col-lg-2">
                                                <span class="type-badge type-{{ $project->type }}">
                                                    <i class="bi bi-{{ $project->type == 'product' ? 'box' : 'gear' }} me-1"></i>
                                                    {{ ucfirst($project->type) }}
                                                </span>
                                            </div>
                                            
                                            <div class="col-lg-2">
                                                <span class="status-badge status-{{ $project->status }}">
                                                    {{ ucfirst(str_replace('_', ' ', $project->status)) }}
                                                </span>
                                            </div>
                                            
                                            <div class="col-lg-2">
                                                <small style="color: var(--dark-text-secondary);">
                                                    {{ $project->created_at->format('M d, Y') }}<br>
                                                    {{ $project->created_at->format('g:i A') }}
                                                </small>
                                            </div>
                                            
                                            <div class="col-lg-2">
                                                <div class="d-flex flex-column gap-2">
                                                    @if($project->status == 'processing')
                                                        <a href="{{ route('projects.processing', $project) }}" class="action-btn action-btn-warning">
                                                            <i class="bi bi-clock"></i> View
                                                        </a>
                                                    @elseif($project->status == 'reviewing')
                                                        <a href="{{ route('projects.review', $project) }}" class="action-btn action-btn-primary">
                                                            <i class="bi bi-eye"></i> Review
                                                        </a>
                                                    @elseif($project->status == 'subtitle_selection')
                                                        <a href="{{ route('projects.subtitle-styles', $project) }}" class="action-btn action-btn-secondary">
                                                            <i class="bi bi-fonts"></i> Subtitles
                                                        </a>
                                                    @elseif($project->status == 'subtitle_generating')
                                                        <a href="{{ route('projects.processing', $project) }}" class="action-btn action-btn-warning">
                                                            <i class="bi bi-clock"></i> Progress
                                                        </a>
                                                    @elseif($project->status == 'completed')
                                                        <a href="{{ route('projects.final', $project) }}" class="action-btn action-btn-success">
                                                            <i class="bi bi-play"></i> View
                                                        </a>
                                                        <a href="{{ route('projects.download', $project) }}" class="action-btn action-btn-primary">
                                                            <i class="bi bi-download"></i> Download
                                                        </a>
                                                    @else
                                                        <button class="action-btn" disabled>
                                                            <i class="bi bi-hourglass"></i> Pending
                                                        </button>
                                                    @endif
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    @endforeach
                    @endif
                </div>
            </div>
        </div>
    </div>
</div>
    </section>

    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    
    <script>
        // Enhanced Interactivity
        document.addEventListener('DOMContentLoaded', function() {
            // Smooth reveal animations
            const revealElements = document.querySelectorAll('.fade-in-up, .fade-in-left, .fade-in-right');
            const revealObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0) translateX(0)';
                    }
                });
            }, { threshold: 0.1 });

            revealElements.forEach(el => revealObserver.observe(el));

            // Interactive button hover effects
            document.querySelectorAll('.btn-primary-enhanced, .btn-outline-enhanced').forEach(btn => {
                btn.addEventListener('mouseenter', function() {
                    this.style.transform = 'translateY(-3px) scale(1.02)';
                });
                
                btn.addEventListener('mouseleave', function() {
                    this.style.transform = 'translateY(0) scale(1)';
                });
            });

            // Stats cards interactive effects
            document.querySelectorAll('.stats-card').forEach(card => {
                card.addEventListener('mouseenter', function() {
                    const icon = this.querySelector('.stats-icon');
                    if (icon) {
                        icon.style.transform = 'scale(1.1) rotate(5deg)';
                    }
                });
                
                card.addEventListener('mouseleave', function() {
                    const icon = this.querySelector('.stats-icon');
                    if (icon) {
                        icon.style.transform = 'scale(1) rotate(0deg)';
                    }
                });
            });
        });

        // Add dynamic navigation background on scroll
        window.addEventListener('scroll', function() {
            const nav = document.querySelector('.glass-nav');
            if (window.scrollY > 50) {
                nav.style.background = 'rgba(15, 20, 25, 0.95)';
                nav.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.5)';
            } else {
                nav.style.background = 'rgba(15, 20, 25, 0.8)';
                nav.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)';
            }
        });
    </script>
</body>
</html>

