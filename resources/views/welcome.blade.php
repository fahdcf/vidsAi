<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>VidsAI - AI-Powered Video Advertisement Generator</title>
    
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Bootstrap Icons -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
    
    <style>
        /* Professional Dark Theme - Enhanced */
        :root {
            --dark-bg: #0a0e16;
            --dark-surface: #151b26;
            --dark-surface-2: #1e2633;
            --dark-border: #2d3748;
            --dark-text: #f7fafc;
            --dark-text-secondary: #a0aec0;
            --accent-blue: #4299e1;
            --accent-purple: #9f7aea;
            --accent-green: #48bb78;
            --accent-orange: #ed8936;
            --glass-bg: rgba(255, 255, 255, 0.05);
            --glass-border: rgba(255, 255, 255, 0.1);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            background: linear-gradient(135deg, var(--dark-bg) 0%, #0f1419 50%, var(--dark-bg) 100%);
            color: var(--dark-text);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif;
            line-height: 1.6;
            overflow-x: hidden;
        }

        /* Animated Background */
        body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: 
                radial-gradient(circle at 20% 80%, rgba(66, 153, 225, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(159, 122, 234, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 40% 40%, rgba(72, 187, 120, 0.05) 0%, transparent 50%);
            z-index: -1;
            animation: backgroundShift 20s ease-in-out infinite;
        }

        @keyframes backgroundShift {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }

        /* Glass Navigation */
        .glass-nav {
            background: rgba(15, 20, 25, 0.8);
            backdrop-filter: blur(20px);
            border-bottom: 1px solid var(--glass-border);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            z-index: 1000;
        }

        .navbar-brand {
            font-weight: 700;
            font-size: 1.5rem;
            transition: all 0.3s ease;
        }

        .navbar-brand:hover {
            transform: scale(1.05);
        }

        /* Enhanced Buttons */
        .btn-primary-enhanced {
            background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
            border: none;
            color: white;
            font-weight: 600;
            padding: 12px 32px;
            border-radius: 12px;
            position: relative;
            overflow: hidden;
            transition: all 0.3s ease;
            box-shadow: 0 4px 20px rgba(66, 153, 225, 0.3);
        }

        .btn-primary-enhanced::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            transition: left 0.5s;
        }

        .btn-primary-enhanced:hover::before {
            left: 100%;
        }

        .btn-primary-enhanced:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 30px rgba(66, 153, 225, 0.4);
        }

        .btn-outline-enhanced {
            background: transparent;
            border: 2px solid var(--glass-border);
            color: var(--dark-text);
            font-weight: 600;
            padding: 12px 32px;
            border-radius: 12px;
            backdrop-filter: blur(10px);
            transition: all 0.3s ease;
        }

        .btn-outline-enhanced:hover {
            background: var(--glass-bg);
            border-color: var(--accent-blue);
            color: var(--accent-blue);
            transform: translateY(-2px);
        }

        /* Hero Section */
        .hero-enhanced {
            background: linear-gradient(135deg, 
                rgba(10, 14, 22, 0.9) 0%, 
                rgba(21, 27, 38, 0.8) 50%, 
                rgba(10, 14, 22, 0.9) 100%);
            position: relative;
            overflow: hidden;
            z-index: 1;
            padding-top: 100px;
        }

        .hero-enhanced::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: conic-gradient(from 0deg, transparent, rgba(66, 153, 225, 0.03), transparent);
            animation: rotate 20s linear infinite;
        }

        @keyframes rotate {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .hero-content {
            position: relative;
            z-index: 2;
        }

        .gradient-text-enhanced {
            background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple), var(--accent-green));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            animation: gradientShift 3s ease-in-out infinite;
        }

        @keyframes gradientShift {
            0%, 100% { filter: hue-rotate(0deg); }
            50% { filter: hue-rotate(30deg); }
        }

        /* Feature Cards Enhanced */
        .feature-card-enhanced {
            background: linear-gradient(145deg, var(--dark-surface), var(--dark-surface-2));
            border: 1px solid var(--dark-border);
            border-radius: 20px;
            padding: 2.5rem;
            position: relative;
            overflow: hidden;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            backdrop-filter: blur(10px);
            z-index: 3;
        }

        .feature-card-enhanced::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, var(--accent-blue), transparent);
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        .feature-card-enhanced:hover::before {
            opacity: 1;
        }

        .feature-card-enhanced:hover {
            transform: translateY(-8px) scale(1.02);
            border-color: var(--accent-blue);
            box-shadow: 
                0 20px 40px rgba(66, 153, 225, 0.15),
                0 0 0 1px rgba(66, 153, 225, 0.1);
        }

        .feature-icon {
            width: 60px;
            height: 60px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 1.5rem;
            position: relative;
            overflow: hidden;
            transition: all 0.3s ease;
        }

        .feature-icon-1 { background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple)); }
        .feature-icon-2 { background: linear-gradient(135deg, var(--accent-purple), var(--accent-green)); }
        .feature-icon-3 { background: linear-gradient(135deg, var(--accent-green), var(--accent-orange)); }
        .feature-icon-4 { background: linear-gradient(135deg, var(--accent-orange), var(--accent-blue)); }
        .feature-icon-5 { background: linear-gradient(135deg, var(--accent-blue), var(--accent-green)); }
        .feature-icon-6 { background: linear-gradient(135deg, var(--accent-purple), var(--accent-orange)); }

        /* Demo Video Card */
        .demo-card {
            background: linear-gradient(145deg, var(--dark-surface), var(--dark-surface-2));
            border: 1px solid var(--dark-border);
            border-radius: 24px;
            padding: 2rem;
            position: relative;
            overflow: hidden;
            transform: rotate(3deg);
            transition: all 0.4s ease;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        .demo-card:hover {
            transform: rotate(0deg) scale(1.05);
        }

        .demo-video {
            background: linear-gradient(135deg, #1a202c, #2d3748);
            border-radius: 16px;
            aspect-ratio: 16/9;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            overflow: hidden;
        }

        .play-button {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            cursor: pointer;
            border: none;
        }

        .play-button:hover {
            transform: scale(1.1);
            box-shadow: 0 0 30px rgba(66, 153, 225, 0.5);
        }

        /* Stats Counter */
        .stats-item {
            text-align: center;
            padding: 1.5rem;
        }

        .stats-number {
            font-size: 2.5rem;
            font-weight: 700;
            background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        /* Animations */
        .fade-in-up {
            opacity: 0;
            transform: translateY(30px);
            animation: fadeInUp 0.8s ease forwards;
        }

        .fade-in-left {
            opacity: 0;
            transform: translateX(-30px);
            animation: fadeInLeft 0.8s ease forwards;
        }

        .fade-in-right {
            opacity: 0;
            transform: translateX(30px);
            animation: fadeInRight 0.8s ease forwards;
        }

        @keyframes fadeInUp {
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @keyframes fadeInLeft {
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }

        @keyframes fadeInRight {
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }

        /* Stagger animation delays */
        .fade-in-up:nth-child(1) { animation-delay: 0.1s; }
        .fade-in-up:nth-child(2) { animation-delay: 0.2s; }
        .fade-in-up:nth-child(3) { animation-delay: 0.3s; }
        .fade-in-up:nth-child(4) { animation-delay: 0.4s; }
        .fade-in-up:nth-child(5) { animation-delay: 0.5s; }
        .fade-in-up:nth-child(6) { animation-delay: 0.6s; }

        /* Section Spacing */
        section {
            position: relative;
            z-index: 2;
        }
        
        .section-spacer {
            padding: 4rem 0;
        }

        /* Responsive */
        @media (max-width: 768px) {
            .demo-card {
                transform: rotate(0deg);
            }
            
            .hero-enhanced h1 {
                font-size: 2.5rem;
            }
            
            .section-spacer {
                padding: 2rem 0;
            }
        }
    </style>
</head>
<body>
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
                        <a class="nav-link active" href="{{ route('home') }}">Home</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="{{ route('pricing') }}">Pricing</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="#features">Features</a>
                    </li>
                </ul>
                
                <ul class="navbar-nav">
                    @guest
                        <li class="nav-item">
                            <a class="nav-link" href="{{ route('login') }}">Login</a>
                        </li>
                        <li class="nav-item">
                            <a class="btn btn-primary-enhanced ms-2" href="{{ route('register') }}">Sign Up</a>
                        </li>
                    @else
                        <li class="nav-item dropdown">
                            <a class="nav-link dropdown-toggle d-flex align-items-center" href="#" role="button" data-bs-toggle="dropdown">
                                <div class="bg-primary rounded-circle me-2 d-flex align-items-center justify-content-center" style="width: 32px; height: 32px;">
                                    <span class="text-white fw-bold">{{ substr(Auth::user()->name, 0, 1) }}</span>
                                </div>
                                {{ Auth::user()->name }}
                            </a>
                            <ul class="dropdown-menu dropdown-menu-dark">
                                <li><a class="dropdown-item" href="{{ route('dashboard') }}">Dashboard</a></li>
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
                    @endguest
                </ul>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero-enhanced min-vh-100 d-flex align-items-center">
        <div class="container hero-content">
            <div class="row align-items-center">
                <div class="col-lg-6 fade-in-left">
                    <div class="mb-4">
                        <span class="badge bg-primary bg-opacity-20 text-primary px-4 py-2 rounded-pill">
                            <i class="bi bi-lightning-fill me-2"></i>AI-Powered Video Creation
                        </span>
                    </div>
                    
                    <h1 class="display-3 fw-bold mb-4">
                        Create Stunning Video Ads 
                        <span class="gradient-text-enhanced">in Minutes</span>
                    </h1>
                    
                    <p class="lead mb-5" style="color: var(--dark-text-secondary); font-size: 1.25rem;">
                        Transform your ideas into professional video advertisements with AI. 
                        Control every scene, transition, subtitle style, and music choice—no editing experience required.
                    </p>
                    
                    <div class="d-flex flex-column flex-sm-row gap-4 mb-5">
                        @auth
                            <a href="{{ route('projects.create') }}" class="btn btn-primary-enhanced btn-lg">
                                <i class="bi bi-play-circle me-2"></i>Start Creating Now
                            </a>
                        @else
                            <a href="{{ route('register') }}" class="btn btn-primary-enhanced btn-lg">
                                <i class="bi bi-play-circle me-2"></i>Start Creating Now
                            </a>
                        @endauth
                        <a href="{{ route('pricing') }}" class="btn btn-outline-enhanced btn-lg">
                            View Pricing <i class="bi bi-arrow-right ms-2"></i>
                        </a>
                    </div>
                    
                    <!-- Stats -->
                    <div class="row text-center">
                        <div class="col-4">
                            <div class="stats-item">
                                <div class="stats-number" data-count="10000">0</div>
                                <small style="color: var(--dark-text-secondary);">Videos Created</small>
                            </div>
                        </div>
                        <div class="col-4">
                            <div class="stats-item">
                                <div class="stats-number" data-count="1247">0</div>
                                <small style="color: var(--dark-text-secondary);">Active Users</small>
                            </div>
                        </div>
                        <div class="col-4">
                            <div class="stats-item">
                                <div class="stats-number">4.9</div>
                                <small style="color: var(--dark-text-secondary);">Rating</small>
                            </div>
                        </div>
                    </div>
                    
                    <div class="d-flex align-items-center gap-4 text-muted mt-4">
                        <div class="d-flex align-items-center">
                            <i class="bi bi-check-circle-fill text-success me-2"></i>
                            <small>No credit card required</small>
                        </div>
                        <div class="d-flex align-items-center">
                            <i class="bi bi-check-circle-fill text-success me-2"></i>
                            <small>Free trial included</small>
                        </div>
                    </div>
                </div>
                
                <div class="col-lg-6 text-center fade-in-right">
                    <div class="position-relative">
                        <div class="demo-card">
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <div class="d-flex align-items-center">
                                    <div class="bg-success rounded-circle me-2" style="width: 8px; height: 8px;"></div>
                                    <small style="color: var(--dark-text-secondary);">Live Demo</small>
                                </div>
                                <div class="text-end">
                                    <small style="color: var(--dark-text-secondary);">Click to play</small>
                                </div>
                            </div>
                            
                            <div class="demo-video mb-3">
                                <button class="play-button" onclick="playDemo()">
                                    <i class="bi bi-play-fill text-white" style="font-size: 2rem; margin-left: 4px;"></i>
                                </button>
                            </div>
                            
                            <div class="d-flex justify-content-between align-items-center">
                                <small style="color: var(--dark-text-secondary);">Creation Time: 2.7min</small>
                                <span class="badge" style="background: linear-gradient(135deg, var(--accent-green), var(--accent-blue)); color: white;">AI Generated</span>
                            </div>
                        </div>
                        
                        <!-- Floating badges -->
                        <div class="position-absolute top-0 end-0 translate-middle">
                            <div style="background: linear-gradient(135deg, var(--accent-orange), var(--accent-purple)); color: white;" class="px-3 py-2 rounded-pill">
                                <small class="fw-bold">300% Faster</small>
                            </div>
                        </div>
                        
                        <div class="position-absolute bottom-0 start-0 translate-middle">
                            <div style="background: linear-gradient(135deg, var(--accent-green), var(--accent-blue)); color: white;" class="px-3 py-2 rounded-pill">
                                <small class="fw-bold">No Skills Required</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Section Spacer -->
    <div class="section-spacer"></div>

    <!-- Features Section -->
    <section id="features" class="py-5" style="position: relative; z-index: 2; background: var(--dark-bg);">
        <div class="container">
            <div class="text-center mb-5 fade-in-up">
                <div class="mb-4">
                    <span class="badge bg-primary bg-opacity-20 text-primary px-4 py-2 rounded-pill">
                        <i class="bi bi-stars me-2"></i>Powerful Features
                    </span>
                </div>
                <h2 class="display-4 fw-bold mb-4">Everything You Need</h2>
                <p class="lead" style="color: var(--dark-text-secondary);">Professional video creation tools powered by artificial intelligence</p>
            </div>
            
            <div class="row g-4">
                <div class="col-md-6 col-lg-4 fade-in-up">
                    <div class="feature-card-enhanced h-100">
                        <div class="feature-icon feature-icon-1">
                            <i class="bi bi-robot text-white" style="font-size: 1.5rem;"></i>
                        </div>
                        <h4 class="fw-bold mb-3">AI Scene Generation</h4>
                        <p style="color: var(--dark-text-secondary);">Automatically creates video scenes from your text scripts using advanced AI technology.</p>
                    </div>
                </div>
                
                <div class="col-md-6 col-lg-4 fade-in-up">
                    <div class="feature-card-enhanced h-100">
                        <div class="feature-icon feature-icon-2">
                            <i class="bi bi-translate text-white" style="font-size: 1.5rem;"></i>
                        </div>
                        <h4 class="fw-bold mb-3">Multi-Language Support</h4>
                        <p style="color: var(--dark-text-secondary);">Supports English, Arabic, and various Arabic dialects with precise audio-text alignment.</p>
                    </div>
                </div>
                
                <div class="col-md-6 col-lg-4 fade-in-up">
                    <div class="feature-card-enhanced h-100">
                        <div class="feature-icon feature-icon-3">
                            <i class="bi bi-camera-video text-white" style="font-size: 1.5rem;"></i>
                        </div>
                        <h4 class="fw-bold mb-3">Multiple Formats</h4>
                        <p style="color: var(--dark-text-secondary);">Generate videos in 16:9, 1:1, 9:16 formats or all formats at once.</p>
                    </div>
                </div>
                
                <div class="col-md-6 col-lg-4 fade-in-up">
                    <div class="feature-card-enhanced h-100">
                        <div class="feature-icon feature-icon-4">
                            <i class="bi bi-fonts text-white" style="font-size: 1.5rem;"></i>
                        </div>
                        <h4 class="fw-bold mb-3">Professional Subtitles</h4>
                        <p style="color: var(--dark-text-secondary);">6 professional subtitle styles with automatic timing and customization options.</p>
                    </div>
                </div>
                
                <div class="col-md-6 col-lg-4 fade-in-up">
                    <div class="feature-card-enhanced h-100">
                        <div class="feature-icon feature-icon-5">
                            <i class="bi bi-music-note-beamed text-white" style="font-size: 1.5rem;"></i>
                        </div>
                        <h4 class="fw-bold mb-3">Background Music</h4>
                        <p style="color: var(--dark-text-secondary);">Professional music library with category filtering and preview functionality.</p>
                    </div>
                </div>
                
                <div class="col-md-6 col-lg-4 fade-in-up">
                    <div class="feature-card-enhanced h-100">
                        <div class="feature-icon feature-icon-6">
                            <i class="bi bi-scissors text-white" style="font-size: 1.5rem;"></i>
                        </div>
                        <h4 class="fw-bold mb-3">Precise Trimming</h4>
                        <p style="color: var(--dark-text-secondary);">Timeline-based video editing with exact start and end time controls.</p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- CTA Section -->
    <section class="py-5" style="background: linear-gradient(135deg, var(--dark-surface), var(--dark-surface-2)); margin-top: 2rem; position: relative; z-index: 2;">
        <div class="container text-center">
            <div class="fade-in-up">
                <div class="mb-4">
                    <span class="badge bg-primary bg-opacity-20 text-primary px-4 py-2 rounded-pill">
                        <i class="bi bi-rocket-takeoff me-2"></i>Get Started Today
                    </span>
                </div>
                <h2 class="display-4 fw-bold mb-4">Ready to Create Amazing Videos?</h2>
                <p class="lead mb-5" style="color: var(--dark-text-secondary);">Join thousands of creators who are already using VidsAI to produce stunning content</p>
                
                @auth
                    <a href="{{ route('projects.create') }}" class="btn btn-primary-enhanced btn-lg me-3">
                        <i class="bi bi-play-circle me-2"></i>Start Creating Now
                    </a>
                @else
                    <a href="{{ route('register') }}" class="btn btn-primary-enhanced btn-lg me-3">
                        <i class="bi bi-play-circle me-2"></i>Get Started Free
                    </a>
                @endauth
                <a href="{{ route('pricing') }}" class="btn btn-outline-enhanced btn-lg">
                    View Pricing
                </a>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="py-5 border-top border-secondary">
        <div class="container">
            <div class="row">
                <div class="col-md-6">
                    <h5 class="fw-bold mb-3">VidsAI</h5>
                    <p class="text-muted">Create amazing AI-generated video ads in minutes.</p>
                </div>
                <div class="col-md-6 text-md-end">
                    <div class="d-flex justify-content-md-end gap-3 mb-3">
                        <a href="#" class="text-muted">Privacy Policy</a>
                        <a href="#" class="text-muted">Terms of Service</a>
                        <a href="#" class="text-muted">Contact</a>
                    </div>
                    <p class="text-muted mb-0">&copy; {{ date('Y') }} VidsAI. All rights reserved.</p>
                </div>
            </div>
        </div>
    </footer>

    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    
    <script>
        // Enhanced Interactivity
        document.addEventListener('DOMContentLoaded', function() {
            // Animate stats counter
            function animateCounter(element, target) {
                let current = 0;
                const increment = target / 100;
                const timer = setInterval(() => {
                    current += increment;
                    if (current >= target) {
                        current = target;
                        clearInterval(timer);
                    }
                    element.textContent = Math.floor(current).toLocaleString();
                }, 20);
            }

            // Start counter animation when visible
            const observerOptions = {
                threshold: 0.5,
                rootMargin: '0px 0px -100px 0px'
            };

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const counters = entry.target.querySelectorAll('[data-count]');
                        counters.forEach(counter => {
                            const target = parseInt(counter.getAttribute('data-count'));
                            animateCounter(counter, target);
                        });
                        observer.unobserve(entry.target);
                    }
                });
            }, observerOptions);

            const statsSection = document.querySelector('.stats-item');
            if (statsSection) {
                const statsContainer = statsSection.closest('.row');
                if (statsContainer) observer.observe(statsContainer);
            }

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

            // Feature cards interactive effects
            document.querySelectorAll('.feature-card-enhanced').forEach(card => {
                card.addEventListener('mouseenter', function() {
                    const icon = this.querySelector('.feature-icon');
                    if (icon) {
                        icon.style.transform = 'scale(1.1) rotate(5deg)';
                    }
                });
                
                card.addEventListener('mouseleave', function() {
                    const icon = this.querySelector('.feature-icon');
                    if (icon) {
                        icon.style.transform = 'scale(1) rotate(0deg)';
                    }
                });
            });
        });

        // Demo video interaction
        function playDemo() {
            const button = document.querySelector('.play-button');
            const video = document.querySelector('.demo-video');
            
            // Add loading state
            button.innerHTML = '<i class="bi bi-hourglass-split text-white" style="font-size: 2rem;"></i>';
            button.style.transform = 'scale(0.9)';
            
            // Simulate video loading
            setTimeout(() => {
                video.style.background = 'linear-gradient(135deg, #2d3748, #4a5568)';
                button.innerHTML = '<i class="bi bi-check-circle-fill text-white" style="font-size: 2rem;"></i>';
                
                // Show success message
                setTimeout(() => {
                    alert('Demo video would play here! This showcases the interactive elements of your VidsAI platform.');
                    
                    // Reset button
                    setTimeout(() => {
                        button.innerHTML = '<i class="bi bi-play-fill text-white" style="font-size: 2rem; margin-left: 4px;"></i>';
                        button.style.transform = 'scale(1)';
                        video.style.background = 'linear-gradient(135deg, #1a202c, #2d3748)';
                    }, 1000);
                }, 500);
            }, 1500);
        }

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