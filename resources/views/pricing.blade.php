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
    <!-- Vite Assets -->
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    
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
    </nav>

        <!-- Hero Section -->
    <section class="hero-gradient py-5" style="margin-top: 80px;">
        <div class="container">
            <div class="text-center mb-5">
                <h1 class="display-4 fw-bold mb-4">
                        Simple, Transparent
                    <span class="gradient-text">Pricing</span>
                    </h1>
                <p class="lead text-muted">
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
                            <p class="text-muted">Perfect for trying out VidsAI</p>
                        </div>

                        <ul class="list-unstyled mb-4">
                            <li class="mb-3 d-flex align-items-center">
                                <i class="bi bi-check-circle-fill text-success me-3"></i>
                                <span>1 video per month</span>
                            </li>
                            <li class="mb-3 d-flex align-items-center">
                                <i class="bi bi-check-circle-fill text-success me-3"></i>
                                <span>Basic AI generation</span>
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
                                <i class="bi bi-x-circle-fill text-danger me-3"></i>
                                <span class="text-muted">Custom voiceover</span>
                            </li>
                            <li class="mb-3 d-flex align-items-center">
                                <i class="bi bi-x-circle-fill text-danger me-3"></i>
                                <span class="text-muted">Priority support</span>
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
                            <p class="text-muted">Great for small businesses</p>
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
                            <p class="text-muted">For growing businesses</p>
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
            <p class="lead text-muted mb-5">Join thousands of creators who are already using VidsAI to produce stunning content</p>
            
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
</body>
</html>

                    <!-- Free Plan -->
                    <div class="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 relative hover:shadow-xl transition-all duration-300">
                        <div class="text-center mb-8">
                            <h3 class="text-2xl font-bold text-gray-900 mb-2">Free</h3>
                            <div class="text-5xl font-bold text-gray-900 mb-2">$0</div>
                            <p class="text-gray-600">Perfect for trying out VideoAI</p>
                        </div>

                        <ul class="space-y-4 mb-8">
                            <li class="flex items-center">
                                <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                </svg>
                                <span class="text-gray-700">1 video per month</span>
                            </li>
                            <li class="flex items-center">
                                <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                </svg>
                                <span class="text-gray-700">Basic AI generation</span>
                            </li>
                            <li class="flex items-center">
                                <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                </svg>
                                <span class="text-gray-700">Standard quality</span>
                            </li>
                            <li class="flex items-center">
                                <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                </svg>
                                <span class="text-gray-700">3 formats (Reel, Square, YouTube)</span>
                            </li>
                            <li class="flex items-center">
                                <svg class="w-5 h-5 text-red-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                                </svg>
                                <span class="text-gray-500">Custom voiceover</span>
                            </li>
                            <li class="flex items-center">
                                <svg class="w-5 h-5 text-red-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                                </svg>
                                <span class="text-gray-500">Priority support</span>
                            </li>
                        </ul>

                        @auth
                            <a href="{{ route('projects.create') }}" class="w-full bg-gray-900 text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors text-center block">
                                Get Started
                            </a>
                        @else
                            <a href="{{ route('register') }}" class="w-full bg-gray-900 text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors text-center block">
                                Sign Up Free
                            </a>
                        @endauth
                    </div>

                    <!-- Basic Plan -->
                    <div class="bg-white rounded-2xl shadow-lg border-2 border-blue-500 p-8 relative hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                        <!-- Most Popular Badge -->
                        <div class="absolute -top-4 left-1/2 transform -translate-x-1/2">
                            <span class="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-medium">
                                Most Popular
                            </span>
                        </div>

                        <div class="text-center mb-8">
                            <h3 class="text-2xl font-bold text-gray-900 mb-2">Basic</h3>
                            <div class="text-5xl font-bold text-gray-900 mb-2">$29</div>
                            <p class="text-gray-600">Great for small businesses</p>
                        </div>

                        <ul class="space-y-4 mb-8">
                            <li class="flex items-center">
                                <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                </svg>
                                <span class="text-gray-700">3 videos per month</span>
                            </li>
                            <li class="flex items-center">
                                <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                </svg>
                                <span class="text-gray-700">Advanced AI generation</span>
                            </li>
                            <li class="flex items-center">
                                <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                </svg>
                                <span class="text-gray-700">HD quality</span>
                            </li>
                            <li class="flex items-center">
                                <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                </svg>
                                <span class="text-gray-700">All formats</span>
                            </li>
                            <li class="flex items-center">
                                <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                </svg>
                                <span class="text-gray-700">AI voiceover</span>
                            </li>
                            <li class="flex items-center">
                                <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                </svg>
                                <span class="text-gray-700">Email support</span>
                            </li>
                        </ul>

                        <a href="{{ route('register') }}" class="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-300 text-center block">
                            Choose Basic
                        </a>
                    </div>

                    <!-- Pro Plan -->
                    <div class="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 relative hover:shadow-xl transition-all duration-300">
                        <div class="text-center mb-8">
                            <h3 class="text-2xl font-bold text-gray-900 mb-2">Pro</h3>
                            <div class="text-5xl font-bold text-gray-900 mb-2">$99</div>
                            <p class="text-gray-600">For growing businesses</p>
                        </div>

                        <ul class="space-y-4 mb-8">
                            <li class="flex items-center">
                                <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                </svg>
                                <span class="text-gray-700">10 videos per month</span>
                            </li>
                            <li class="flex items-center">
                                <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                </svg>
                                <span class="text-gray-700">Premium AI generation</span>
                            </li>
                            <li class="flex items-center">
                                <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                </svg>
                                <span class="text-gray-700">4K quality</span>
                            </li>
                            <li class="flex items-center">
                                <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                </svg>
                                <span class="text-gray-700">All formats + custom</span>
                            </li>
                            <li class="flex items-center">
                                <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                </svg>
                                <span class="text-gray-700">Custom voiceover upload</span>
                            </li>
                            <li class="flex items-center">
                                <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                </svg>
                                <span class="text-gray-700">Priority support</span>
                            </li>
                        </ul>

                        <a href="{{ route('register') }}" class="w-full bg-gray-900 text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors text-center block">
                            Choose Pro
                        </a>
                    </div>
                </div>
            </div>
        </section>

        <!-- Payment Methods -->
        <section class="py-16 bg-white">
            <div class="container mx-auto px-4">
                <div class="text-center mb-12">
                    <h3 class="text-2xl font-bold text-gray-900 mb-4">Secure Payment Options</h3>
                    <p class="text-gray-600 mb-8">Your payment information is protected with enterprise-grade security</p>
                    <div class="flex justify-center items-center space-x-8">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" alt="Stripe" class="h-8 opacity-70 hover:opacity-100 transition-opacity">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/a/a4/Paypal_2014_logo.svg" alt="PayPal" class="h-8 opacity-70 hover:opacity-100 transition-opacity">
                        <div class="flex items-center space-x-2">
                            <svg class="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                            <span class="text-gray-600 font-medium">SSL Secured</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- FAQ Section -->
        <section class="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
            <div class="container mx-auto px-4">
                <div class="text-center mb-16">
                    <span class="inline-block px-3 py-1 text-sm font-medium border border-gray-300 rounded-full mb-4">
                        Support
                    </span>
                    <h2 class="text-4xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
                    <p class="text-xl text-gray-600 max-w-2xl mx-auto">
                        Everything you need to know about our pricing and plans
                    </p>
                </div>

                <div class="max-w-3xl mx-auto">
                    <div class="space-y-4">
                        <div class="bg-white rounded-lg shadow-sm border border-gray-200">
                            <button class="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors" onclick="toggleFAQ('faq1')">
                                <span class="font-semibold text-gray-900">Can I change my plan later?</span>
                                <svg id="faq1-icon" class="w-5 h-5 text-gray-500 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                </svg>
                            </button>
                            <div id="faq1-content" class="hidden px-6 pb-4">
                                <p class="text-gray-600">Yes! You can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle, and we'll prorate any differences.</p>
                            </div>
                        </div>

                        <div class="bg-white rounded-lg shadow-sm border border-gray-200">
                            <button class="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors" onclick="toggleFAQ('faq2')">
                                <span class="font-semibold text-gray-900">What happens if I exceed my video limit?</span>
                                <svg id="faq2-icon" class="w-5 h-5 text-gray-500 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                </svg>
                            </button>
                            <div id="faq2-content" class="hidden px-6 pb-4">
                                <p class="text-gray-600">You'll be notified when you're close to your limit. You can either upgrade your plan or wait for the next billing cycle. We never charge overage fees.</p>
                            </div>
                        </div>

                        <div class="bg-white rounded-lg shadow-sm border border-gray-200">
                            <button class="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors" onclick="toggleFAQ('faq3')">
                                <span class="font-semibold text-gray-900">Do you offer refunds?</span>
                                <svg id="faq3-icon" class="w-5 h-5 text-gray-500 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                </svg>
                            </button>
                            <div id="faq3-content" class="hidden px-6 pb-4">
                                <p class="text-gray-600">We offer a 30-day money-back guarantee for all paid plans. If you're not satisfied, contact us for a full refund, no questions asked.</p>
                            </div>
                        </div>

                        <div class="bg-white rounded-lg shadow-sm border border-gray-200">
                            <button class="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors" onclick="toggleFAQ('faq4')">
                                <span class="font-semibold text-gray-900">Can I cancel anytime?</span>
                                <svg id="faq4-icon" class="w-5 h-5 text-gray-500 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                </svg>
                            </button>
                            <div id="faq4-content" class="hidden px-6 pb-4">
                                <p class="text-gray-600">Absolutely! You can cancel your subscription at any time. You'll continue to have access until the end of your current billing period.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- CTA Section -->
        <section class="py-20 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white relative overflow-hidden">
            <div class="absolute inset-0 bg-black/20"></div>
            <div class="absolute inset-0">
                <div class="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full animate-pulse"></div>
                <div class="absolute bottom-20 right-20 w-32 h-32 bg-white/5 rounded-full animate-bounce"></div>
                <div class="absolute top-1/2 left-1/4 w-16 h-16 bg-white/10 rounded-full animate-ping"></div>
            </div>

            <div class="container mx-auto px-4 relative z-10">
                <div class="text-center">
                    <h2 class="text-4xl lg:text-5xl font-bold mb-6">
                        Ready to Create Amazing Videos?
                    </h2>
                    <p class="text-xl mb-8 max-w-2xl mx-auto opacity-90">
                        Join thousands of creators who are already using VideoAI to produce stunning content
                    </p>

                    <div class="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                        @auth
                            <a href="{{ route('projects.create') }}" class="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold bg-white text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-300 group">
                                <svg class="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"></path>
                                </svg>
                                Start Creating Now
                            </a>
                        @else
                            <a href="{{ route('register') }}" class="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold bg-white text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-300 group">
                                <svg class="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"></path>
                                </svg>
                                Get Started Free
                            </a>
                        @endauth

                        <a href="{{ route('home') }}" class="inline-flex items-center justify-center px-8 py-4 text-lg font-medium border-white text-white hover:bg-white hover:text-gray-900 border-2 rounded-lg bg-transparent transition-all duration-300 group">
                            Learn More
                            <svg class="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                            </svg>
                        </a>
                    </div>

                    <div class="flex items-center justify-center space-x-6 text-sm opacity-80">
                        <div class="flex items-center">
                            <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                            </svg>
                            Free trial
                        </div>
                        <div class="flex items-center">
                            <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                            </svg>
                            No credit card required
                        </div>
                        <div class="flex items-center">
                            <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                            </svg>
                            Cancel anytime
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </div>

    <script>
        // Mobile menu functionality
        document.addEventListener('DOMContentLoaded', function() {
            const mobileMenuButton = document.getElementById('mobile-menu-button');
            const mobileMenu = document.getElementById('mobile-menu');

            if (mobileMenuButton && mobileMenu) {
                mobileMenuButton.addEventListener('click', function() {
                    mobileMenu.classList.toggle('hidden');
                });

                // Close mobile menu when clicking outside
                document.addEventListener('click', function(event) {
                    if (!mobileMenuButton.contains(event.target) && !mobileMenu.contains(event.target)) {
                        mobileMenu.classList.add('hidden');
                    }
                });

                // Close mobile menu when window is resized to desktop
                window.addEventListener('resize', function() {
                    if (window.innerWidth >= 768) {
                        mobileMenu.classList.add('hidden');
                    }
                });
            }
        });

        // FAQ toggle functionality
        function toggleFAQ(faqId) {
            const content = document.getElementById(faqId + '-content');
            const icon = document.getElementById(faqId + '-icon');

            if (content.classList.contains('hidden')) {
                content.classList.remove('hidden');
                icon.style.transform = 'rotate(180deg)';
            } else {
                content.classList.add('hidden');
                icon.style.transform = 'rotate(0deg)';
            }
        }
    </script>
</body>
</html>

                            </li>

                        </ul>



                        <a href="{{ route('register') }}" class="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-300 text-center block">

                            Choose Basic

                        </a>

                    </div>



                    <!-- Pro Plan -->

                    <div class="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 relative hover:shadow-xl transition-all duration-300">

                        <div class="text-center mb-8">

                            <h3 class="text-2xl font-bold text-gray-900 mb-2">Pro</h3>

                            <div class="text-5xl font-bold text-gray-900 mb-2">$99</div>

                            <p class="text-gray-600">For growing businesses</p>

                        </div>



                        <ul class="space-y-4 mb-8">

                            <li class="flex items-center">

                                <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">

                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>

                                </svg>

                                <span class="text-gray-700">10 videos per month</span>

                            </li>

                            <li class="flex items-center">

                                <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">

                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>

                                </svg>

                                <span class="text-gray-700">Premium AI generation</span>

                            </li>

                            <li class="flex items-center">

                                <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">

                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>

                                </svg>

                                <span class="text-gray-700">4K quality</span>

                            </li>

                            <li class="flex items-center">

                                <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">

                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>

                                </svg>

                                <span class="text-gray-700">All formats + custom</span>

                            </li>

                            <li class="flex items-center">

                                <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">

                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>

                                </svg>

                                <span class="text-gray-700">Custom voiceover upload</span>

                            </li>

                            <li class="flex items-center">

                                <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">

                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>

                                </svg>

                                <span class="text-gray-700">Priority support</span>

                            </li>

                        </ul>



                        <a href="{{ route('register') }}" class="w-full bg-gray-900 text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors text-center block">

                            Choose Pro

                        </a>

                    </div>

                </div>

            </div>

        </section>



        <!-- Payment Methods -->

        <section class="py-16 bg-white">

            <div class="container mx-auto px-4">

                <div class="text-center mb-12">

                    <h3 class="text-2xl font-bold text-gray-900 mb-4">Secure Payment Options</h3>

                    <p class="text-gray-600 mb-8">Your payment information is protected with enterprise-grade security</p>

                    <div class="flex justify-center items-center space-x-8">

                        <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" alt="Stripe" class="h-8 opacity-70 hover:opacity-100 transition-opacity">

                        <img src="https://upload.wikimedia.org/wikipedia/commons/a/a4/Paypal_2014_logo.svg" alt="PayPal" class="h-8 opacity-70 hover:opacity-100 transition-opacity">

                        <div class="flex items-center space-x-2">

                            <svg class="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">

                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>

                            </svg>

                            <span class="text-gray-600 font-medium">SSL Secured</span>

                        </div>

                    </div>

                </div>

            </div>

        </section>



        <!-- FAQ Section -->

        <section class="py-20 bg-gradient-to-br from-gray-50 to-blue-50">

            <div class="container mx-auto px-4">

                <div class="text-center mb-16">

                    <span class="inline-block px-3 py-1 text-sm font-medium border border-gray-300 rounded-full mb-4">

                        Support

                    </span>

                    <h2 class="text-4xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>

                    <p class="text-xl text-gray-600 max-w-2xl mx-auto">

                        Everything you need to know about our pricing and plans

                    </p>

                </div>



                <div class="max-w-3xl mx-auto">

                    <div class="space-y-4">

                        <div class="bg-white rounded-lg shadow-sm border border-gray-200">

                            <button class="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors" onclick="toggleFAQ('faq1')">

                                <span class="font-semibold text-gray-900">Can I change my plan later?</span>

                                <svg id="faq1-icon" class="w-5 h-5 text-gray-500 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>

                                </svg>

                            </button>

                            <div id="faq1-content" class="hidden px-6 pb-4">

                                <p class="text-gray-600">Yes! You can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle, and we'll prorate any differences.</p>

                            </div>

                        </div>



                        <div class="bg-white rounded-lg shadow-sm border border-gray-200">

                            <button class="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors" onclick="toggleFAQ('faq2')">

                                <span class="font-semibold text-gray-900">What happens if I exceed my video limit?</span>

                                <svg id="faq2-icon" class="w-5 h-5 text-gray-500 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>

                                </svg>

                            </button>

                            <div id="faq2-content" class="hidden px-6 pb-4">

                                <p class="text-gray-600">You'll be notified when you're close to your limit. You can either upgrade your plan or wait for the next billing cycle. We never charge overage fees.</p>

                            </div>

                        </div>



                        <div class="bg-white rounded-lg shadow-sm border border-gray-200">

                            <button class="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors" onclick="toggleFAQ('faq3')">

                                <span class="font-semibold text-gray-900">Do you offer refunds?</span>

                                <svg id="faq3-icon" class="w-5 h-5 text-gray-500 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>

                                </svg>

                            </button>

                            <div id="faq3-content" class="hidden px-6 pb-4">

                                <p class="text-gray-600">We offer a 30-day money-back guarantee for all paid plans. If you're not satisfied, contact us for a full refund, no questions asked.</p>

                            </div>

                        </div>



                        <div class="bg-white rounded-lg shadow-sm border border-gray-200">

                            <button class="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors" onclick="toggleFAQ('faq4')">

                                <span class="font-semibold text-gray-900">Can I cancel anytime?</span>

                                <svg id="faq4-icon" class="w-5 h-5 text-gray-500 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>

                                </svg>

                            </button>

                            <div id="faq4-content" class="hidden px-6 pb-4">

                                <p class="text-gray-600">Absolutely! You can cancel your subscription at any time. You'll continue to have access until the end of your current billing period.</p>

                            </div>

                        </div>

                    </div>

                </div>

            </div>

        </section>



        <!-- CTA Section -->

        <section class="py-20 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white relative overflow-hidden">

            <div class="absolute inset-0 bg-black/20"></div>

            <div class="absolute inset-0">

                <div class="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full animate-pulse"></div>

                <div class="absolute bottom-20 right-20 w-32 h-32 bg-white/5 rounded-full animate-bounce"></div>

                <div class="absolute top-1/2 left-1/4 w-16 h-16 bg-white/10 rounded-full animate-ping"></div>

            </div>



            <div class="container mx-auto px-4 relative z-10">

                <div class="text-center">

                    <h2 class="text-4xl lg:text-5xl font-bold mb-6">

                        Ready to Create Amazing Videos?

                    </h2>

                    <p class="text-xl mb-8 max-w-2xl mx-auto opacity-90">

                        Join thousands of creators who are already using VideoAI to produce stunning content

                    </p>



                    <div class="flex flex-col sm:flex-row gap-4 justify-center mb-8">

                        @auth

                            <a href="{{ route('projects.create') }}" class="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold bg-white text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-300 group">

                                <svg class="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">

                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"></path>

                                </svg>

                                Start Creating Now

                            </a>

                        @else

                            <a href="{{ route('register') }}" class="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold bg-white text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-300 group">

                                <svg class="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">

                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"></path>

                                </svg>

                                Get Started Free

                            </a>

                        @endauth



                        <a href="{{ route('home') }}" class="inline-flex items-center justify-center px-8 py-4 text-lg font-medium border-white text-white hover:bg-white hover:text-gray-900 border-2 rounded-lg bg-transparent transition-all duration-300 group">

                            Learn More

                            <svg class="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>

                            </svg>

                        </a>

                    </div>



                    <div class="flex items-center justify-center space-x-6 text-sm opacity-80">

                        <div class="flex items-center">

                            <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">

                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>

                            </svg>

                            Free trial

                        </div>

                        <div class="flex items-center">

                            <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">

                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>

                            </svg>

                            No credit card required

                        </div>

                        <div class="flex items-center">

                            <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">

                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>

                            </svg>

                            Cancel anytime

                        </div>

                    </div>

                </div>

            </div>

        </section>

    </div>



    <script>

        // Mobile menu functionality

        document.addEventListener('DOMContentLoaded', function() {

            const mobileMenuButton = document.getElementById('mobile-menu-button');

            const mobileMenu = document.getElementById('mobile-menu');



            if (mobileMenuButton && mobileMenu) {

                mobileMenuButton.addEventListener('click', function() {

                    mobileMenu.classList.toggle('hidden');

                });



                // Close mobile menu when clicking outside

                document.addEventListener('click', function(event) {

                    if (!mobileMenuButton.contains(event.target) && !mobileMenu.contains(event.target)) {

                        mobileMenu.classList.add('hidden');

                    }

                });



                // Close mobile menu when window is resized to desktop

                window.addEventListener('resize', function() {

                    if (window.innerWidth >= 768) {

                        mobileMenu.classList.add('hidden');

                    }

                });

            }

        });



        // FAQ toggle functionality

        function toggleFAQ(faqId) {

            const content = document.getElementById(faqId + '-content');

            const icon = document.getElementById(faqId + '-icon');



            if (content.classList.contains('hidden')) {

                content.classList.remove('hidden');

                icon.style.transform = 'rotate(180deg)';

            } else {

                content.classList.add('hidden');

                icon.style.transform = 'rotate(0deg)';

            }

        }

    </script>

</body>

</html>
