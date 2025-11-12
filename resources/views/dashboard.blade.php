<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Dashboard - VidsAI</title>
    
    <!-- Bootstrap Icons -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
    
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --navy-900: #0f1419;
            --navy-800: #1a1f2e;
            --navy-700: #252b3b;
            --navy-600: #2d3548;
            --gray-400: #8b92a7;
            --gray-300: #a0a7b8;
            --blue-500: #3b82f6;
            --blue-600: #2563eb;
            --purple-500: #8b5cf6;
            --green-500: #10b981;
            --orange-500: #f97316;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: var(--navy-900);
            color: #fff;
            overflow-x: hidden;
        }

        /* Dashboard Layout */
        .dashboard-wrapper {
            display: flex;
            min-height: 100vh;
        }

        /* Sidebar */
        .sidebar {
            width: 280px;
            background: var(--navy-800);
            border-right: 1px solid rgba(255, 255, 255, 0.05);
            padding: 2rem 1.5rem;
            position: fixed;
            height: 100vh;
            left: 0;
            top: 0;
            z-index: 1000;
            overflow-y: auto;
        }

        .logo {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 2.5rem;
            font-size: 1.5rem;
            font-weight: 700;
            color: #fff;
        }

        .logo-icon {
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, var(--blue-500), var(--purple-500));
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .nav-menu {
            list-style: none;
            margin-bottom: 2rem;
        }

        .nav-item {
            margin-bottom: 0.25rem;
        }

        .nav-link {
            display: flex;
            align-items: center;
            gap: 0.875rem;
            padding: 0.75rem 1rem;
            color: var(--gray-300);
            text-decoration: none;
            border-radius: 10px;
            font-size: 0.9rem;
            font-weight: 500;
            transition: all 0.2s;
        }

        .nav-link:hover {
            background: rgba(59, 130, 246, 0.1);
            color: #fff;
        }

        .nav-link.active {
            background: linear-gradient(135deg, var(--blue-500), var(--purple-500));
            color: #fff;
        }

        .nav-link i {
            font-size: 1.1rem;
            width: 20px;
        }

        /* Main Content */
        .main-content {
            flex: 1;
            margin-left: 280px;
            padding: 2rem;
            background: var(--navy-900);
        }

        /* Top Bar */
        .top-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
        }

        .user-section {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .user-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--blue-500), var(--purple-500));
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 1rem;
        }

        .user-dropdown {
            position: relative;
            cursor: pointer;
        }

        .notification-icon {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: var(--navy-800);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
        }

        .notification-icon:hover {
            background: var(--navy-700);
        }

        /* Welcome Section */
        .welcome-section {
            margin-bottom: 2rem;
        }

        .welcome-header {
            display: flex;
            align-items: center;
            gap: 1.5rem;
            margin-bottom: 1.5rem;
        }

        .welcome-avatar {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--blue-500), var(--purple-500));
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            font-weight: 700;
        }

        .welcome-text h1 {
            font-size: 1.75rem;
            font-weight: 700;
            margin-bottom: 0.25rem;
        }

        .welcome-text p {
            color: var(--gray-400);
            font-size: 0.95rem;
        }

        .action-buttons {
            display: flex;
            gap: 0.875rem;
            flex-wrap: wrap;
        }

        .btn {
            padding: 0.75rem 1.5rem;
            border-radius: 10px;
            font-weight: 600;
            font-size: 0.9rem;
            border: none;
            cursor: pointer;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            transition: all 0.2s;
        }

        .btn-primary {
            background: linear-gradient(135deg, var(--blue-500), var(--purple-500));
            color: #fff;
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .btn-secondary {
            background: var(--navy-800);
            color: #fff;
        }

        .btn-secondary:hover {
            background: var(--navy-700);
        }

        /* Stats Grid */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 1.25rem;
            margin-bottom: 2rem;
        }

        .stat-card {
            background: var(--navy-800);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 16px;
            padding: 1.5rem;
            display: flex;
            align-items: center;
            gap: 1rem;
            transition: all 0.2s;
        }

        .stat-card:hover {
            border-color: rgba(59, 130, 246, 0.3);
            transform: translateY(-2px);
        }

        .stat-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
        }

        .stat-icon-blue {
            background: rgba(59, 130, 246, 0.15);
            color: var(--blue-500);
        }

        .stat-icon-green {
            background: rgba(16, 185, 129, 0.15);
            color: var(--green-500);
        }

        .stat-icon-orange {
            background: rgba(249, 115, 22, 0.15);
            color: var(--orange-500);
        }

        .stat-icon-purple {
            background: rgba(139, 92, 246, 0.15);
            color: var(--purple-500);
        }

        .stat-info h3 {
            font-size: 1.75rem;
            font-weight: 700;
            margin-bottom: 0.25rem;
        }

        .stat-info p {
            font-size: 0.85rem;
            color: var(--gray-400);
            font-weight: 500;
        }

        .stat-trend {
            margin-left: auto;
            display: flex;
            align-items: center;
            gap: 0.25rem;
            font-size: 0.85rem;
            font-weight: 600;
            color: var(--green-500);
        }

        /* Projects Section */
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
        }

        .section-title {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            font-size: 1.5rem;
            font-weight: 700;
        }

        .section-icon {
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, var(--blue-500), var(--purple-500));
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        /* Filter Tabs */
        .filter-tabs {
            display: flex;
            gap: 0.75rem;
            margin-bottom: 1.5rem;
            overflow-x: auto;
            padding-bottom: 0.5rem;
        }

        .filter-tabs::-webkit-scrollbar {
            height: 4px;
        }

        .filter-tabs::-webkit-scrollbar-track {
            background: var(--navy-800);
            border-radius: 4px;
        }

        .filter-tabs::-webkit-scrollbar-thumb {
            background: var(--navy-600);
            border-radius: 4px;
        }

        .filter-tab {
            padding: 0.65rem 1.25rem;
            border-radius: 10px;
            background: var(--navy-800);
            border: 1px solid rgba(255, 255, 255, 0.05);
            color: var(--gray-300);
            font-size: 0.875rem;
            font-weight: 600;
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.2s;
        }

        .filter-tab:hover {
            background: var(--navy-700);
            color: #fff;
        }

        .filter-tab.active {
            background: linear-gradient(135deg, var(--blue-500), var(--purple-500));
            color: #fff;
            border-color: transparent;
        }

        /* Projects Grid */
        .projects-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 1.5rem;
        }

        .project-card {
            background: var(--navy-800);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 16px;
            overflow: hidden;
            transition: all 0.2s;
            cursor: pointer;
        }

        .project-card:hover {
            border-color: rgba(59, 130, 246, 0.3);
            transform: translateY(-4px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        }

        .project-thumbnail {
            position: relative;
            width: 100%;
            height: 180px;
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1));
            overflow: hidden;
        }

        .project-thumbnail::before {
            content: '';
            position: absolute;
            inset: 0;
            background: 
                radial-gradient(circle at 30% 40%, rgba(59, 130, 246, 0.2) 0%, transparent 50%),
                radial-gradient(circle at 70% 60%, rgba(139, 92, 246, 0.2) 0%, transparent 50%);
        }

        .thumbnail-placeholder {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .thumbnail-icon {
            width: 70px;
            height: 70px;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            color: rgba(255, 255, 255, 0.6);
            transition: all 0.3s;
        }

        .project-card:hover .thumbnail-icon {
            transform: scale(1.1) rotate(5deg);
            background: rgba(255, 255, 255, 0.15);
            color: rgba(255, 255, 255, 0.9);
        }

        .status-badge {
            position: absolute;
            top: 12px;
            right: 12px;
            padding: 0.4rem 0.75rem;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: capitalize;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .status-completed { background: rgba(16, 185, 129, 0.9); color: #fff; }
        .status-processing { background: rgba(249, 115, 22, 0.9); color: #fff; }
        .status-reviewing { background: rgba(59, 130, 246, 0.9); color: #fff; }
        .status-subtitle_selection { background: rgba(139, 92, 246, 0.9); color: #fff; }
        .status-subtitle_generating { background: rgba(249, 115, 22, 0.9); color: #fff; }
        .status-pending { background: rgba(139, 148, 158, 0.9); color: #fff; }
        .status-failed { background: rgba(239, 68, 68, 0.9); color: #fff; }

        .project-info {
            padding: 1.25rem;
        }

        .project-title {
            font-size: 1.125rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
            color: #fff;
            display: -webkit-box;
            -webkit-line-clamp: 1;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .project-description {
            font-size: 0.875rem;
            color: var(--gray-400);
            margin-bottom: 1rem;
            line-height: 1.5;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .project-meta {
            display: flex;
            gap: 1rem;
            margin-bottom: 1rem;
            font-size: 0.8rem;
            color: var(--gray-400);
        }

        .project-meta-item {
            display: flex;
            align-items: center;
            gap: 0.375rem;
        }

        .project-actions {
            display: flex;
            gap: 0.5rem;
        }

        .project-btn {
            flex: 1;
            padding: 0.625rem 1rem;
            border-radius: 8px;
            font-size: 0.85rem;
            font-weight: 600;
            border: none;
            cursor: pointer;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.4rem;
            transition: all 0.2s;
            text-align: center;
        }

        .project-btn-primary {
            background: linear-gradient(135deg, var(--blue-500), var(--purple-500));
            color: #fff;
        }

        .project-btn-primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .project-btn-secondary {
            background: var(--navy-700);
            color: #fff;
        }

        .project-btn-secondary:hover {
            background: var(--navy-600);
        }

        /* Empty State */
        .empty-state {
            text-align: center;
            padding: 4rem 2rem;
            background: var(--navy-800);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 16px;
        }

        .empty-icon {
            width: 120px;
            height: 120px;
            margin: 0 auto 1.5rem;
            background: rgba(59, 130, 246, 0.1);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 3.5rem;
            color: var(--blue-500);
        }

        .empty-state h3 {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 0.75rem;
        }

        .empty-state p {
            color: var(--gray-400);
            margin-bottom: 2rem;
        }

        /* Responsive */
        @media (max-width: 1200px) {
            .stats-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }

        @media (max-width: 768px) {
            .sidebar {
                transform: translateX(-100%);
            }

            .main-content {
                margin-left: 0;
            }

            .stats-grid {
                grid-template-columns: 1fr;
            }

            .projects-grid {
                grid-template-columns: 1fr;
            }

            .welcome-header {
                flex-direction: column;
                text-align: center;
            }

            .action-buttons {
                justify-content: center;
            }
        }
    </style>
</head>
<body>
    <div class="dashboard-wrapper">
        <!-- Sidebar -->
        <aside class="sidebar">
            <div class="logo">
                <div class="logo-icon">
                    <i class="bi bi-camera-video-fill"></i>
                </div>
                <span>VidsAI</span>
            </div>

            <ul class="nav-menu">
                <li class="nav-item">
                    <a href="{{ route('dashboard') }}" class="nav-link active">
                        <i class="bi bi-house-fill"></i>
                        <span>Dashboard</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a href="{{ route('projects.create') }}" class="nav-link">
                        <i class="bi bi-folder-fill"></i>
                        <span>Projects</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a href="#" class="nav-link">
                        <i class="bi bi-layout-text-sidebar"></i>
                        <span>Templates</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a href="#" class="nav-link">
                        <i class="bi bi-bar-chart-fill"></i>
                        <span>Analytics</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a href="{{ route('profile.edit') }}" class="nav-link">
                        <i class="bi bi-gear-fill"></i>
                        <span>Settings</span>
                    </a>
                </li>
            </ul>
        </aside>

        <!-- Main Content -->
        <main class="main-content">
            <!-- Top Bar -->
            <div class="top-bar">
                <div></div>
                <div class="user-section">
                    <div class="notification-icon">
                        <i class="bi bi-bell-fill"></i>
                    </div>
                    <div class="user-dropdown">
                        <div class="user-avatar">
                            {{ substr(Auth::user()->name, 0, 1) }}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Welcome Section -->
            <section class="welcome-section">
                <div class="welcome-header">
                    <div class="welcome-avatar">
                        {{ substr(Auth::user()->name, 0, 1) }}
                    </div>
                    <div class="welcome-text">
                        <h1>Welcome back, {{ explode(' ', Auth::user()->name)[0] }}!</h1>
                        <p>Ready to create something amazing today?</p>
                    </div>
                </div>

                <div class="action-buttons">
                    <a href="{{ route('projects.create') }}" class="btn btn-primary">
                        <i class="bi bi-plus-circle-fill"></i>
                        Create New Video
                    </a>
                    <a href="#" class="btn btn-secondary">
                        <i class="bi bi-play-circle-fill"></i>
                        View Tutorials
                    </a>
                    <a href="#" class="btn btn-secondary">
                        <i class="bi bi-grid-3x3-gap-fill"></i>
                        Explore Templates
                    </a>
                </div>
            </section>

            <!-- Stats Grid -->
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon stat-icon-blue">
                        <i class="bi bi-play-circle-fill"></i>
                    </div>
                    <div class="stat-info">
                        <h3>{{ $projects->count() }}</h3>
                        <p>Total Projects</p>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon stat-icon-green">
                        <i class="bi bi-check-circle-fill"></i>
                    </div>
                    <div class="stat-info">
                        <h3>{{ $projects->where('status', 'completed')->count() }}</h3>
                        <p>Completed</p>
                    </div>
                    @if($projects->count() > 0)
                    <div class="stat-trend">
                        <i class="bi bi-arrow-up"></i>
                        <span>{{ round(($projects->where('status', 'completed')->count() / $projects->count()) * 100) }}%</span>
                    </div>
                    @endif
                </div>

                <div class="stat-card">
                    <div class="stat-icon stat-icon-orange">
                        <i class="bi bi-clock-fill"></i>
                    </div>
                    <div class="stat-info">
                        <h3>{{ $projects->whereIn('status', ['processing', 'subtitle_generating'])->count() }}</h3>
                        <p>In Progress</p>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon stat-icon-purple">
                        <i class="bi bi-arrow-up-circle-fill"></i>
                    </div>
                    <div class="stat-info">
                        <h3>15%</h3>
                        <p>Growth Rate</p>
                    </div>
                    <div class="stat-trend">
                        <i class="bi bi-arrow-up"></i>
                        <span>+12%</span>
                    </div>
                </div>
            </div>

            <!-- Projects Section -->
            <div class="section-header">
                <div class="section-title">
                    <div class="section-icon">
                        <i class="bi bi-folder-fill"></i>
                    </div>
                    <span>Projects</span>
                </div>
                <a href="{{ route('projects.create') }}" class="btn btn-primary">
                    <i class="bi bi-plus-circle-fill"></i>
                    New Project
                </a>
            </div>

            <!-- Filter Tabs -->
            <div class="filter-tabs">
                <div class="filter-tab active" data-filter="all">All</div>
                <div class="filter-tab" data-filter="completed">Completed</div>
                <div class="filter-tab" data-filter="reviewing">Reviewing</div>
            </div>

            <!-- Projects Grid -->
            @if($projects->isEmpty())
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="bi bi-camera-video"></i>
                    </div>
                    <h3>No projects yet</h3>
                    <p>Start creating amazing AI-generated videos by clicking the button below!</p>
                    <a href="{{ route('projects.create') }}" class="btn btn-primary" style="font-size: 1rem; padding: 1rem 2rem;">
                        <i class="bi bi-plus-circle-fill"></i>
                        Create Your First Video
                    </a>
                </div>
            @else
                <div class="projects-grid">
                    @foreach($projects as $project)
                    <div class="project-card" data-status="{{ $project->status }}">
                        <!-- Thumbnail -->
                        <div class="project-thumbnail">
                            <div class="thumbnail-placeholder">
                                <div class="thumbnail-icon">
                                    <i class="bi bi-{{ $project->type == 'product' ? 'box-seam' : 'gear-fill' }}"></i>
                                </div>
                            </div>
                            <div class="status-badge status-{{ $project->status }}">
                                {{ ucfirst(str_replace('_', ' ', $project->status)) }}
                            </div>
                        </div>

                        <!-- Project Info -->
                        <div class="project-info">
                            <h3 class="project-title">{{ $project->name }}</h3>
                            <p class="project-description">{{ Str::limit($project->description, 80) }}</p>

                            <div class="project-meta">
                                <div class="project-meta-item">
                                    <i class="bi bi-calendar3"></i>
                                    <span>Created: {{ $project->created_at->format('M d, Y') }}</span>
                                </div>
                            </div>
                            <div class="project-meta">
                                <div class="project-meta-item">
                                    <i class="bi bi-clock"></i>
                                    <span>Duration: {{ $project->created_at->format('g:i A') }}</span>
                                </div>
                            </div>

                            <!-- Actions -->
                            <div class="project-actions">
                                @if($project->status == 'completed')
                                    <a href="{{ route('projects.final', $project) }}" class="project-btn project-btn-primary">
                                        <i class="bi bi-play-fill"></i>
                                        View
                                    </a>
                                    <a href="{{ route('projects.download', $project) }}" class="project-btn project-btn-secondary">
                                        <i class="bi bi-share-fill"></i>
                                        Share
                                    </a>
                                @elseif($project->status == 'reviewing')
                                    <a href="{{ route('projects.review', $project) }}" class="project-btn project-btn-primary">
                                        <i class="bi bi-pencil-fill"></i>
                                        Edit
                                    </a>
                                    <a href="#" class="project-btn project-btn-secondary">
                                        <i class="bi bi-share-fill"></i>
                                        Share
                                    </a>
                                @else
                                    <a href="{{ route('projects.processing', $project) }}" class="project-btn project-btn-primary">
                                        <i class="bi bi-eye-fill"></i>
                                        View
                                    </a>
                                @endif
                            </div>
                        </div>
                    </div>
                    @endforeach
                </div>
            @endif
        </main>
    </div>

    <script>
        // Filter functionality
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');

                const filter = this.dataset.filter;
                document.querySelectorAll('.project-card').forEach(card => {
                    const status = card.dataset.status;
                    if (filter === 'all' || 
                        (filter === 'completed' && status === 'completed') ||
                        (filter === 'reviewing' && (status === 'reviewing' || status === 'subtitle_selection'))) {
                        card.style.display = 'block';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        });
    </script>
</body>
</html>