<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="dark">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Pricing Plans - VidsAI Platform</title>

    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Bootstrap Icons -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
    
    <style>
        /* Modern Dark Theme Styles */
        :root {
            --dark-bg: #0d1117;
            --dark-surface: #161b22;
            --dark-border: #30363d;
            --dark-text: #f0f6fc;
            --dark-text-secondary: #8b949e;
            --accent-blue: #58a6ff;
            --accent-purple: #a855f7;
            --success-green: #3fb950;
            --warning-orange: #f85149;
        }

        body {
            background-color: var(--dark-bg);
            color: var(--dark-text);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        }

        .dark-nav {
            background-color: rgba(13, 17, 23, 0.8);
            backdrop-filter: blur(20px);
            border-bottom: 1px solid var(--dark-border);
        }

        .dark-card {
            background-color: var(--dark-surface);
            border: 1px solid var(--dark-border);
            border-radius: 12px;
        }

        .btn-primary-dark {
            background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
            border: none;
            color: white;
            font-weight: 600;
        }

        .btn-primary-dark:hover {
            background: linear-gradient(135deg, #4a9eff, #9333ea);
            transform: translateY(-1px);
        }

        .gradient-text {
            background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .pricing-card {
            background: var(--dark-surface);
            border: 1px solid var(--dark-border);
            border-radius: 16px;
            padding: 2rem;
            transition: all 0.3s ease;
            position: relative;
        }

        .pricing-card:hover {
            transform: translateY(-4px);
            border-color: var(--accent-blue);
            box-shadow: 0 20px 40px rgba(88, 166, 255, 0.1);
        }

        .pricing-card.featured {
            border-color: var(--accent-blue);
            transform: scale(1.05);
        }

        .pricing-card.featured:hover {
            transform: scale(1.05) translateY(-4px);
        }

        .hero-gradient {
            background: linear-gradient(135deg, var(--dark-bg) 0%, #1a1a2e 50%, var(--dark-bg) 100%);
        }
    </style>
</head>
<body>
    <!-- Navigation -->
    <nav class="navbar navbar-expand-lg navbar-dark dark-nav fixed-top">
        <div class="container">
            <div class="navbar-brand d-flex align-items-center">
                <div class="me-2">
                    <i class="bi bi-camera-video-fill text-primary" style="font-size: 1.5rem;"></i>
                        </div>
                <span class="fw-bold fs-4">VidsAI</span>
                </div>

            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                <span class="navbar-toggler-icon"></span>
                            </button>

            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav me-auto">
                    <li class="nav-item">
                        <a class="nav-link" href="{{ route('home') }}">Home</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link active" href="{{ route('pricing') }}">Pricing</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="{{ route('home') }}#features">Features</a>
                    </li>
                </ul>
                
                <ul class="navbar-nav">
                    @guest
                        <li class="nav-item">
                            <a class="nav-link" href="{{ route('login') }}">Login</a>
                        </li>
                        <li class="nav-item">
                            <a class="btn btn-primary-dark ms-2 px-4" href="{{ route('register') }}">Sign Up</a>
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
    <section class="hero-gradient py-5" style="margin-top: 80px;">
        <div class="container">
            <div class="text-center mb-5">
                <h1 class="display-4 fw-bold mb-4">
                        Simple, Transparent
                    <span class="gradient-text">Pricing</span>
                    </h1>
                <p class="lead" style="color: var(--dark-text-secondary);">
                        Choose the perfect plan for your video creation needs. Start free and scale as you grow.
                    </p>
                </div>
            </div>
        </section>

        <!-- Pricing Cards -->
    <section class="py-5">
        <div class="container">
            <div class="row g-4 justify-content-center">
                    <!-- Free Plan -->
                <div class="col-lg-4 col-md-6">
                    <div class="pricing-card h-100">
                        <div class="text-center mb-4">
                            <h3 class="fw-bold mb-2">Free</h3>
                            <div class="display-4 fw-bold mb-2">$0</div>
                            <p style="color: var(--dark-text-secondary);">Perfect for trying out VidsAI</p>
                        </div>

                        <ul class="list-unstyled mb-4">
                            <li class="mb-3 d-flex align-items-center">
                                <i class="bi bi-check-circle-fill text-success me-3"></i>
                                <span>1 video per month</span>
                            </li>
                            <li class="mb-3 d-flex align-items-center">
                                <i class="bi bi-check-circle-fill text-success me-3"></i>
                                <span>Stock video generations only (no AI)</span>
                            </li>
                            <li class="mb-3 d-flex align-items-center">
                                <i class="bi bi-check-circle-fill text-success me-3"></i>
                                <span>Standard quality</span>
                            </li>
                            <li class="mb-3 d-flex align-items-center">
                                <i class="bi bi-check-circle-fill text-success me-3"></i>
                                <span>3 formats (Reel, Square, YouTube)</span>
                            </li>
                            <li class="mb-3 d-flex align-items-center">
                                <i class="bi bi-check-circle-fill text-success me-3"></i>
                                <span>Basic saved generation settings</span>
                            </li>
                            <li class="mb-3 d-flex align-items-center">
                                <i class="bi bi-x-circle-fill text-danger me-3"></i>
                                <span style="color: var(--dark-text-secondary);">Custom voiceover</span>
                            </li>
                            <li class="mb-3 d-flex align-items-center">
                                <i class="bi bi-x-circle-fill text-danger me-3"></i>
                                <span style="color: var(--dark-text-secondary);">Priority support</span>
                            </li>
                        </ul>

                        @auth
                            <a href="{{ route('projects.create') }}" class="btn btn-outline-primary w-100">
                                Get Started
                            </a>
                        @else
                            <a href="{{ route('register') }}" class="btn btn-outline-primary w-100">
                                Sign Up Free
                            </a>
                        @endauth
                    </div>
                    </div>

                    <!-- Basic Plan -->
                <div class="col-lg-4 col-md-6">
                    <div class="pricing-card featured h-100">
                        <div class="text-center mb-4">
                            <div class="badge bg-primary mb-3">Most Popular</div>
                            <h3 class="fw-bold mb-2">Basic</h3>
                            <div class="display-4 fw-bold mb-2">$29</div>
                            <p style="color: var(--dark-text-secondary);">Great for small businesses</p>
                        </div>

                        <ul class="list-unstyled mb-4">
                            <li class="mb-3 d-flex align-items-center">
                                <i class="bi bi-check-circle-fill text-success me-3"></i>
                                <span>3 videos per month</span>
                            </li>
                            <li class="mb-3 d-flex align-items-center">
                                <i class="bi bi-check-circle-fill text-success me-3"></i>
                                <span>Advanced AI generation</span>
                            </li>
                            <li class="mb-3 d-flex align-items-center">
                                <i class="bi bi-check-circle-fill text-success me-3"></i>
                                <span>HD quality</span>
                            </li>
                            <li class="mb-3 d-flex align-items-center">
                                <i class="bi bi-check-circle-fill text-success me-3"></i>
                                <span>All formats</span>
                            </li>
                            <li class="mb-3 d-flex align-items-center">
                                <i class="bi bi-check-circle-fill text-success me-3"></i>
                                <span>Advanced saved generation settings</span>
                            </li>
                            <li class="mb-3 d-flex align-items-center">
                                <i class="bi bi-check-circle-fill text-success me-3"></i>
                                <span>AI voiceover</span>
                            </li>
                            <li class="mb-3 d-flex align-items-center">
                                <i class="bi bi-check-circle-fill text-success me-3"></i>
                                <span>Email support</span>
                            </li>
                        </ul>

                        <a href="{{ route('register') }}" class="btn btn-primary-dark w-100">
                            Choose Basic
                        </a>
                    </div>
                    </div>

                    <!-- Pro Plan -->
                <div class="col-lg-4 col-md-6">
                    <div class="pricing-card h-100">
                        <div class="text-center mb-4">
                            <h3 class="fw-bold mb-2">Pro</h3>
                            <div class="display-4 fw-bold mb-2">$99</div>
                            <p style="color: var(--dark-text-secondary);">For growing businesses</p>
                        </div>

                        <ul class="list-unstyled mb-4">
                            <li class="mb-3 d-flex align-items-center">
                                <i class="bi bi-check-circle-fill text-success me-3"></i>
                                <span>10 videos per month</span>
                            </li>
                            <li class="mb-3 d-flex align-items-center">
                                <i class="bi bi-check-circle-fill text-success me-3"></i>
                                <span>Premium AI generation</span>
                            </li>
                            <li class="mb-3 d-flex align-items-center">
                                <i class="bi bi-check-circle-fill text-success me-3"></i>
                                <span>4K quality</span>
                            </li>
                            <li class="mb-3 d-flex align-items-center">
                                <i class="bi bi-check-circle-fill text-success me-3"></i>
                                <span>All formats + custom</span>
                            </li>
                            <li class="mb-3 d-flex align-items-center">
                                <i class="bi bi-check-circle-fill text-success me-3"></i>
                                <span>Premium saved generation settings</span>
                            </li>
                            <li class="mb-3 d-flex align-items-center">
                                <i class="bi bi-check-circle-fill text-success me-3"></i>
                                <span>Custom voiceover upload</span>
                            </li>
                            <li class="mb-3 d-flex align-items-center">
                                <i class="bi bi-check-circle-fill text-success me-3"></i>
                                <span>Priority support</span>
                            </li>
                        </ul>

                        <a href="{{ route('register') }}" class="btn btn-outline-primary w-100">
                            Choose Pro
                        </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- CTA Section -->
    <section class="py-5 bg-primary bg-opacity-10">
        <div class="container text-center">
            <h2 class="display-5 fw-bold mb-4">Ready to Create Amazing Videos?</h2>
            <p class="lead mb-5" style="color: var(--dark-text-secondary);">Join thousands of creators who are already using VidsAI to produce stunning content with saved generation settings for instant high-quality videos</p>
            
                        @auth
                <a href="{{ route('projects.create') }}" class="btn btn-primary-dark btn-lg px-5 py-3">
                    <i class="bi bi-play-circle me-2"></i>Start Creating Now
                            </a>
                        @else
                <a href="{{ route('register') }}" class="btn btn-primary-dark btn-lg px-5 py-3">
                    <i class="bi bi-play-circle me-2"></i>Get Started Free
                            </a>
                        @endauth
                    </div>
    </section>

    <!-- Footer -->
    <footer class="py-5 border-top border-secondary">
        <div class="container">
            <div class="row">
                <div class="col-md-6">
                    <h5 class="fw-bold mb-3">VidsAI</h5>
                    <p style="color: var(--dark-text-secondary);">Create amazing AI-generated video ads in minutes.</p>
                        </div>
                <div class="col-md-6 text-md-end">
                    <div class="d-flex justify-content-md-end gap-3 mb-3">
                        <a href="#" style="color: var(--dark-text-secondary); text-decoration: none;">Privacy Policy</a>
                        <a href="#" style="color: var(--dark-text-secondary); text-decoration: none;">Terms of Service</a>
                        <a href="#" style="color: var(--dark-text-secondary); text-decoration: none;">Contact</a>
                        </div>
                    <p style="color: var(--dark-text-secondary);" class="mb-0">&copy; {{ date('Y') }} VidsAI. All rights reserved.</p>
                        </div>
                    </div>
                </div>
    </footer>

    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>