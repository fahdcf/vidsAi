<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Create AI-Generated Video Ads in Minutes - VideoAI</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        /* 3D and Animation Utilities */
        .perspective-1000 {
            perspective: 1000px;
        }

        .preserve-3d {
            transform-style: preserve-3d;
        }

        .bg-gradient-radial {
            background: radial-gradient(circle, var(--tw-gradient-stops));
        }

        /* Custom Animations */
        @keyframes pulse {
            0%, 100% {
                opacity: 1;
            }
            50% {
                opacity: 0.5;
            }
        }

        @keyframes bounce {
            0%, 100% {
                transform: translateY(-25%);
                animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
            }
            50% {
                transform: none;
                animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
            }
        }

        @keyframes ping {
            75%, 100% {
                transform: scale(2);
                opacity: 0;
            }
        }

        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @keyframes slideInLeft {
            from {
                opacity: 0;
                transform: translateX(-30px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }

        @keyframes slideInRight {
            from {
                opacity: 0;
                transform: translateX(30px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }

        @keyframes scaleIn {
            from {
                opacity: 0;
                transform: scale(0.9);
            }
            to {
                opacity: 1;
                transform: scale(1);
            }
        }

        @keyframes shimmer {
            0% {
                background-position: -200% 0;
            }
            100% {
                background-position: 200% 0;
            }
        }

        /* Animation Classes */
        .animate-pulse {
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        .animate-bounce {
            animation: bounce 1s infinite;
        }

        .animate-ping {
            animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
        }

        .animate-fade-in-up {
            animation: fadeInUp 0.6s ease-out;
        }

        .animate-slide-in-left {
            animation: slideInLeft 0.6s ease-out;
        }

        .animate-slide-in-right {
            animation: slideInRight 0.6s ease-out;
        }

        .animate-scale-in {
            animation: scaleIn 0.6s ease-out;
        }

        /* Interactive Elements */
        .interactive-image {
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }

        .interactive-image:hover {
            transform: scale(1.02);
        }

        .interactive-image img {
            transition: transform 0.5s ease;
        }

        .interactive-image:hover img {
            transform: scale(1.1);
        }

        /* Feature Cards */
        .feature-card {
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }

        .feature-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }

        .feature-card .absolute {
            transition: all 0.5s ease;
        }

        /* Testimonial Cards */
        .testimonial-card {
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }

        .testimonial-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.2);
        }

        /* 3D Hero Specific Styles */
        #hero-3d-container {
            will-change: transform;
        }

        #hero-3d-content {
            will-change: transform;
        }

        #hero-glow {
            will-change: transform, opacity;
        }

        #floating-users,
        #floating-trending,
        #floating-award {
            will-change: transform, opacity;
            backface-visibility: hidden;
        }

        #floating-action {
            will-change: transform;
            backface-visibility: hidden;
        }

        #cursor-follower {
            will-change: transform, opacity;
            pointer-events: none;
        }

        #ambient-light {
            will-change: transform, opacity;
        }

        .particle {
            will-change: transform, opacity;
            backface-visibility: hidden;
        }

        /* Gradient Text */
        .bg-clip-text {
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        /* Backdrop Blur Support */
        .backdrop-blur-sm {
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
        }

        /* Custom Scrollbar */
        ::-webkit-scrollbar {
            width: 8px;
        }

        ::-webkit-scrollbar-track {
            background: #f1f1f1;
        }

        ::-webkit-scrollbar-thumb {
            background: linear-gradient(45deg, #3b82f6, #8b5cf6);
            border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(45deg, #2563eb, #7c3aed);
        }

        /* Button Hover Effects */
        .group:hover .group-hover\:scale-110 {
            transform: scale(1.1);
        }

        .group:hover .group-hover\:translate-x-1 {
            transform: translateX(0.25rem);
        }

        .group:hover .group-hover\:translate-y-0 {
            transform: translateY(0);
        }

        .group:hover .group-hover\:opacity-100 {
            opacity: 1;
        }

        .group:hover .group-hover\:rotate-6 {
            transform: rotate(6deg);
        }

        /* Loading States */
        .loading-shimmer {
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            background-size: 200% 100%;
            animation: shimmer 2s infinite;
        }

        /* Focus States for Accessibility */
        .focus\:ring-2:focus {
            outline: 2px solid transparent;
            outline-offset: 2px;
            box-shadow: 0 0 0 2px #3b82f6;
        }

        .focus\:ring-purple-500:focus {
            box-shadow: 0 0 0 2px #8b5cf6;
        }

        /* High Contrast Mode Support */
        @media (prefers-contrast: high) {
            .bg-gradient-to-r {
                background: #000;
                color: #fff;
            }
            
            .text-gray-600 {
                color: #000;
            }
            
            .border-gray-300 {
                border-color: #000;
            }
        }

        /* Reduced Motion Support */
        @media (prefers-reduced-motion: reduce) {
            *,
            *::before,
            *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
            
            .animate-pulse,
            .animate-bounce,
            .animate-ping {
                animation: none;
            }
        }

        /* Dark Mode Support */
        @media (prefers-color-scheme: dark) {
            .bg-white {
                background-color: #1f2937;
            }
            
            .text-gray-900 {
                color: #f9fafb;
            }
            
            .text-gray-600 {
                color: #d1d5db;
            }
            
            .border-gray-300 {
                border-color: #374151;
            }
        }

        /* Mobile Optimizations */
        @media (max-width: 768px) {
            .perspective-1000 {
                perspective: 500px;
            }

            #hero-3d-container {
                height: 300px !important;
            }
            
            .text-4xl {
                font-size: 2rem;
                line-height: 2.5rem;
            }
            
            .text-6xl {
                font-size: 3rem;
                line-height: 1;
            }
            
            .py-20 {
                padding-top: 3rem;
                padding-bottom: 3rem;
            }
            
            .lg\:py-32 {
                padding-top: 3rem;
                padding-bottom: 3rem;
            }
        }

        /* Tablet Optimizations */
        @media (max-width: 1024px) and (min-width: 769px) {
            .lg\:text-5xl {
                font-size: 3rem;
                line-height: 1;
            }
            
            .lg\:text-6xl {
                font-size: 3.5rem;
                line-height: 1;
            }
        }

        /* Print Styles */
        @media print {
            .bg-gradient-to-r,
            .bg-gradient-to-br {
                background: #fff !important;
                color: #000 !important;
            }
            
            .shadow-lg,
            .shadow-xl,
            .shadow-2xl {
                box-shadow: none !important;
            }
            
            .animate-pulse,
            .animate-bounce,
            .animate-ping {
                animation: none !important;
            }
        }

        /* Performance Optimizations */
        .will-change-transform {
            will-change: transform;
        }

        .will-change-opacity {
            will-change: opacity;
        }

        .backface-hidden {
            backface-visibility: hidden;
        }

        /* Custom Utilities */
        .text-shadow {
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .text-shadow-lg {
            text-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }

        .filter-blur {
            filter: blur(4px);
        }

        .filter-brightness {
            filter: brightness(1.1);
        }

        /* Smooth Scrolling */
        html {
            scroll-behavior: smooth;
        }

        /* Selection Styles */
        ::selection {
            background-color: #3b82f6;
            color: white;
        }

        ::-moz-selection {
            background-color: #3b82f6;
            color: white;
        }
    </style>
</head>
<body>
    <!-- Top Navigation Bar -->
    <nav class="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200/50 shadow-sm">
        <div class="container mx-auto px-4">
            <div class="flex items-center justify-between h-16">
                <!-- Logo -->
                <div class="flex items-center">
                    <a href="{{ route('home') }}" class="flex items-center space-x-2">
                        <div class="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                            <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"></path>
                            </svg>
                        </div>
                        <span class="text-xl font-bold text-gray-900">VideoAI</span>
                    </a>
                </div>

                <!-- Navigation Links -->
                <div class="hidden md:flex items-center space-x-8">
                    <a href="{{ route('home') }}" class="text-gray-700 hover:text-blue-600 font-medium transition-colors">Home</a>
                    <a href="{{ route('pricing') }}" class="text-gray-700 hover:text-blue-600 font-medium transition-colors">Pricing</a>
                    <a href="#features" class="text-gray-700 hover:text-blue-600 font-medium transition-colors">Features</a>
                    <a href="#testimonials" class="text-gray-700 hover:text-blue-600 font-medium transition-colors">Reviews</a>
                </div>

                <!-- Auth Buttons -->
                <div class="flex items-center space-x-4">
                    @auth
                        <!-- Logged in user menu -->
                        <div class="relative group">
                            <button class="flex items-center space-x-2 text-gray-700 hover:text-blue-600 font-medium transition-colors">
                                <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                                    <span class="text-white text-sm font-semibold">{{ substr(Auth::user()->name, 0, 1) }}</span>
                                </div>
                                <span class="hidden sm:block">{{ Auth::user()->name }}</span>
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                </svg>
                            </button>

                            <!-- Dropdown Menu -->
                            <div class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                                <div class="py-2">
                                    <a href="{{ route('dashboard') }}" class="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                                        <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"></path>
                                        </svg>
                                        Dashboard
                                    </a>
                                    <a href="{{ route('projects.create') }}" class="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                                        <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                                        </svg>
                                        Create Project
                                    </a>
                                    <a href="{{ route('profile.edit') }}" class="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                                        <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                        </svg>
                                        Profile
                                    </a>
                                    <hr class="my-2">
                                    <form method="POST" action="{{ route('logout') }}" class="block">
                                        @csrf
                                        <button type="submit" class="w-full text-left px-4 py-2 text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors">
                                            <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                                            </svg>
                                            Logout
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    @else
                        <!-- Guest user buttons -->
                        <a href="{{ route('login') }}" class="text-gray-700 hover:text-blue-600 font-medium transition-colors">Login</a>
                        <a href="{{ route('register') }}" class="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-medium">
                            Sign Up
                        </a>
                    @endauth
                </div>

                <!-- Mobile menu button -->
                <div class="md:hidden">
                    <button id="mobile-menu-button" class="text-gray-700 hover:text-blue-600 transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Mobile Menu -->
            <div id="mobile-menu" class="md:hidden hidden border-t border-gray-200 py-4">
                <div class="space-y-2">
                    <a href="{{ route('home') }}" class="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">Home</a>
                    <a href="{{ route('pricing') }}" class="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">Pricing</a>
                    <a href="#features" class="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">Features</a>
                    <a href="#testimonials" class="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">Reviews</a>

                    @auth
                        <hr class="my-2">
                        <a href="{{ route('dashboard') }}" class="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">Dashboard</a>
                        <a href="{{ route('projects.create') }}" class="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">Create Project</a>
                        <a href="{{ route('profile.edit') }}" class="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">Profile</a>
                        <form method="POST" action="{{ route('logout') }}" class="block">
                            @csrf
                            <button type="submit" class="w-full text-left px-4 py-2 text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors">Logout</button>
                        </form>
                    @else
                        <hr class="my-2">
                        <a href="{{ route('login') }}" class="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">Login</a>
                        <a href="{{ route('register') }}" class="block px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 mx-4">Sign Up</a>
                    @endauth
                </div>
            </div>
        </div>
    </nav>

    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 pt-16">
        <!-- Hero Section -->
        <section class="relative overflow-hidden">
            <div class="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10"></div>
            <div class="container mx-auto px-4 py-20 lg:py-32">
                <div class="grid lg:grid-cols-2 gap-12 items-center">
                    <div class="space-y-8">
                        <div class="space-y-4">
                            <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700 animate-pulse">
                                <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"></path>
                                </svg>
                                AI-Powered Video Creation
                            </span>
                            <h1 class="text-4xl lg:text-6xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent leading-tight">
                                Create Stunning Video Ads in Minutes
                            </h1>
                            <p class="text-xl text-gray-600 leading-relaxed">
                                Transform your ideas into professional video advertisements with AI. Control every scene, transition,
                                subtitle style, and music choice—no editing experience required.
                            </p>
                        </div>



                        <div class="flex flex-col sm:flex-row gap-4">
                            @auth
                                <a href="{{ route('projects.create') }}"
                                   class="cta-button inline-flex items-center justify-center px-8 py-6 text-lg font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg transition-all duration-300 group shadow-lg hover:shadow-xl transform hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-blue-300 active:scale-95"
                                   role="button"
                                   data-action="create-project"
                                   aria-label="Start creating your video project now">
                                    <svg class="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"></path>
                                    </svg>
                                    Start Creating Now
                                </a>
                            @else
                                <a href="{{ route('register') }}"
                                   class="cta-button inline-flex items-center justify-center px-8 py-6 text-lg font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg transition-all duration-300 group shadow-lg hover:shadow-xl transform hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-blue-300 active:scale-95"
                                   role="button"
                                   data-action="register"
                                   aria-label="Sign up to start creating videos">
                                    <svg class="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"></path>
                                    </svg>
                                    Start Creating Now
                                </a>
                            @endauth

                            <a href="{{ route('pricing') }}"
                               class="cta-button inline-flex items-center justify-center px-8 py-6 text-lg font-medium text-gray-900 bg-transparent border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 group shadow-md hover:shadow-lg transform hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-gray-300 active:scale-95"
                               role="button"
                               data-action="view-pricing"
                               aria-label="View our pricing plans">
                                View Prices
                                <svg class="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                </svg>
                            </a>
                        </div>

                        <div class="flex items-center gap-6 text-sm text-gray-600">
                            <div class="flex items-center gap-2">
                                <svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                </svg>
                                No credit card required
                            </div>
                            <div class="flex items-center gap-2">
                                <svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                </svg>
                                Free trial included
                            </div>
                        </div>
                    </div>

                    <div class="relative">
                        <div id="hero-3d-container" class="relative w-full h-[500px] perspective-1000">
                            <div id="hero-3d-content" class="relative w-full h-full transition-all duration-300 ease-out preserve-3d">
                                <!-- Background Glow -->
                                <div id="hero-glow" class="absolute inset-0 bg-gradient-to-r from-blue-400/30 via-purple-500/30 to-pink-500/30 rounded-3xl blur-3xl transition-all duration-500 opacity-30"></div>

                                <!-- Main Image Container -->
                                <div class="relative bg-white/10 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                                    <!-- Glassmorphism Overlay -->
                                    <div class="absolute inset-0 bg-gradient-to-br from-white/20 via-white/10 to-transparent"></div>

                                    <!-- Main Image -->
                                    <img src="{{ asset('storage/images/Capture d\'écran 2025-07-23 231000.png') }}"
                                         alt="VideoAI Platform Dashboard"
                                         class="w-full h-full object-cover rounded-3xl">

                                    <!-- Dynamic Overlays -->
                                    <div id="hero-overlay" class="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20 transition-all duration-500 opacity-0"></div>

                                    <!-- Floating UI Elements -->
                                    <div id="floating-users" class="absolute top-6 left-6 bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg transition-all duration-500 translate-y-4 opacity-0">
                                        <div class="flex items-center gap-3">
                                            <div class="w-10 h-10 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                                                <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"></path>
                                                </svg>
                                            </div>
                                            <div>
                                                <p class="text-sm font-semibold text-gray-800">1,247 Active Users</p>
                                                <p class="text-xs text-gray-600">Creating videos now</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div id="floating-trending" class="absolute top-6 right-6 bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg transition-all duration-700 translate-y-4 opacity-0">
                                        <div class="flex items-center gap-3">
                                            <div class="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center">
                                                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                                                </svg>
                                            </div>
                                            <div>
                                                <p class="text-sm font-semibold text-gray-800">300% Faster</p>
                                                <p class="text-xs text-gray-600">Than traditional editing</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div id="floating-award" class="absolute bottom-6 left-6 bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg transition-all duration-900 translate-y-4 opacity-0">
                                        <div class="flex items-center gap-3">
                                            <div class="w-10 h-10 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center">
                                                <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                                                </svg>
                                            </div>
                                            <div>
                                                <p class="text-sm font-semibold text-gray-800">AI-Powered</p>
                                                <p class="text-xs text-gray-600">Smart scene generation</p>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Floating Particles -->
                                    <div class="floating-particles">
                                        <div class="particle absolute w-2 h-2 bg-white/60 rounded-full transition-all duration-1000 opacity-0" style="left: 20%; top: 30%;"></div>
                                        <div class="particle absolute w-2 h-2 bg-white/60 rounded-full transition-all duration-1000 opacity-0" style="left: 35%; top: 70%;"></div>
                                        <div class="particle absolute w-2 h-2 bg-white/60 rounded-full transition-all duration-1000 opacity-0" style="left: 50%; top: 30%;"></div>
                                        <div class="particle absolute w-2 h-2 bg-white/60 rounded-full transition-all duration-1000 opacity-0" style="left: 65%; top: 70%;"></div>
                                        <div class="particle absolute w-2 h-2 bg-white/60 rounded-full transition-all duration-1000 opacity-0" style="left: 80%; top: 30%;"></div>
                                        <div class="particle absolute w-2 h-2 bg-white/60 rounded-full transition-all duration-1000 opacity-0" style="left: 95%; top: 70%;"></div>
                                    </div>

                                    <!-- Interactive Cursor Follower -->
                                    <div id="cursor-follower" class="absolute w-20 h-20 bg-gradient-to-r from-blue-400/30 to-purple-500/30 rounded-full blur-xl transition-all duration-300 pointer-events-none opacity-0"></div>

                                    <!-- Corner Indicators -->
                                    <div class="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-white/40 rounded-tl-lg"></div>
                                    <div class="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-white/40 rounded-tr-lg"></div>
                                    <div class="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-white/40 rounded-bl-lg"></div>
                                    <div class="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-white/40 rounded-br-lg"></div>
                                </div>

                                <!-- Floating Action Button -->
                                <div id="floating-action" class="absolute -bottom-6 -right-6 transition-all duration-500">
                                    <div class="bg-gradient-to-r from-green-400 to-blue-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 font-semibold relative">
                                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                                        </svg>
                                        Under 5 min
                                        <div class="absolute inset-0 bg-white/20 rounded-full animate-ping"></div>
                                    </div>
                                </div>

                                <!-- Depth Layers -->
                                <div class="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent rounded-3xl pointer-events-none" style="transform: translateZ(20px);"></div>
                            </div>

                            <!-- Ambient Light Effect -->
                            <div id="ambient-light" class="absolute inset-0 bg-gradient-radial from-blue-400/20 via-purple-500/10 to-transparent rounded-full blur-3xl transition-all duration-1000 scale-100 opacity-30"></div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- How It Works Section -->
        <section class="py-20 bg-white">
            <div class="container mx-auto px-4">
                <div class="text-center mb-16">
                    <span class="inline-block px-3 py-1 text-sm font-medium border border-gray-300 rounded-full mb-4">
                        Simple Process
                    </span>
                    <h2 class="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">How It Works</h2>
                    <p class="text-xl text-gray-600 max-w-2xl mx-auto">
                        Three simple steps to create your perfect video ad with complete creative control
                    </p>
                </div>

                <div class="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    <div class="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 group bg-white rounded-lg">
                        <div class="p-8 text-center">
                            <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                            <div class="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6 group-hover:scale-110 transition-transform">
                                1
                            </div>
                            <h3 class="text-2xl font-bold text-gray-900 mb-4">Describe Your Vision</h3>
                            <p class="text-gray-600 mb-6">
                                Tell us about your product, target audience, and style preferences. Upload custom assets if needed.
                            </p>
                            <div class="interactive-image relative group cursor-pointer overflow-hidden rounded-2xl">
                                <img src="https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=300" 
                                     alt="Step 1: Fill the Form" 
                                     class="w-full h-48 object-cover transition-all duration-500 group-hover:scale-110">
                                
                                <div class="absolute inset-0 bg-gradient-to-br from-blue-500/90 to-purple-500/90 transition-all duration-500 opacity-0 group-hover:opacity-100">
                                    <div class="absolute inset-0 flex flex-col justify-center items-center text-white p-6 text-center">
                                        <div class="transform transition-all duration-500 delay-100 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100">
                                            <h3 class="text-xl font-bold mb-3">Smart Form Interface</h3>
                                            <p class="text-sm opacity-90 mb-4">AI-powered form that understands your vision</p>
                                            <div class="space-y-2">
                                                <div class="flex items-center justify-center gap-2 text-xs">
                                                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                                    </svg>
                                                    Product description
                                                </div>
                                                <div class="flex items-center justify-center gap-2 text-xs">
                                                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                                    </svg>
                                                    Target audience
                                                </div>
                                                <div class="flex items-center justify-center gap-2 text-xs">
                                                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                                    </svg>
                                                    Style preferences
                                                </div>
                                                <div class="flex items-center justify-center gap-2 text-xs">
                                                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                                    </svg>
                                                    Custom assets upload
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="absolute top-4 right-4 bg-white/20 backdrop-blur-sm rounded-full p-2 transition-all duration-300 group-hover:scale-110 group-hover:bg-white/30">
                                    <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"></path>
                                        <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"></path>
                                    </svg>
                                </div>

                                <div class="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/50 to-transparent"></div>
                            </div>
                        </div>
                    </div>

                    <div class="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 group bg-white rounded-lg">
                        <div class="p-8 text-center">
                            <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
                            <div class="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6 group-hover:scale-110 transition-transform">
                                2
                            </div>
                            <h3 class="text-2xl font-bold text-gray-900 mb-4">Review & Customize</h3>
                            <p class="text-gray-600 mb-6">
                                AI generates scenes with transitions, subtitles, and music. Review, regenerate, or fine-tune each element.
                            </p>
                            <div class="interactive-image relative group cursor-pointer overflow-hidden rounded-2xl">
                                <img src="https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=300" 
                                     alt="Step 2: Review Scenes" 
                                     class="w-full h-48 object-cover transition-all duration-500 group-hover:scale-110">
                                
                                <div class="absolute inset-0 bg-gradient-to-br from-purple-500/90 to-pink-500/90 transition-all duration-500 opacity-0 group-hover:opacity-100">
                                    <div class="absolute inset-0 flex flex-col justify-center items-center text-white p-6 text-center">
                                        <div class="transform transition-all duration-500 delay-100 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100">
                                            <h3 class="text-xl font-bold mb-3">Scene Editor</h3>
                                            <p class="text-sm opacity-90 mb-4">Complete control over every aspect of your video</p>
                                            <div class="space-y-2">
                                                <div class="flex items-center justify-center gap-2 text-xs">
                                                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                                    </svg>
                                                    Scene customization
                                                </div>
                                                <div class="flex items-center justify-center gap-2 text-xs">
                                                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                                    </svg>
                                                    Transition effects
                                                </div>
                                                <div class="flex items-center justify-center gap-2 text-xs">
                                                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                                    </svg>
                                                    Subtitle styling
                                                </div>
                                                <div class="flex items-center justify-center gap-2 text-xs">
                                                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                                    </svg>
                                                    Music selection
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="absolute top-4 right-4 bg-white/20 backdrop-blur-sm rounded-full p-2 transition-all duration-300 group-hover:scale-110 group-hover:bg-white/30">
                                    <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"></path>
                                        <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"></path>
                                    </svg>
                                </div>

                                <div class="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/50 to-transparent"></div>
                            </div>
                        </div>
                    </div>

                    <div class="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 group bg-white rounded-lg">
                        <div class="p-8 text-center">
                            <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-red-500"></div>
                            <div class="w-16 h-16 bg-gradient-to-r from-pink-500 to-red-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6 group-hover:scale-110 transition-transform">
                                3
                            </div>
                            <h3 class="text-2xl font-bold text-gray-900 mb-4">Export & Share</h3>
                            <p class="text-gray-600 mb-6">
                                Download your video in multiple formats optimized for different platforms and social media.
                            </p>
                            <div class="interactive-image relative group cursor-pointer overflow-hidden rounded-2xl">
                                <img src="https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=300" 
                                     alt="Step 3: Download Video" 
                                     class="w-full h-48 object-cover transition-all duration-500 group-hover:scale-110">
                                
                                <div class="absolute inset-0 bg-gradient-to-br from-pink-500/90 to-red-500/90 transition-all duration-500 opacity-0 group-hover:opacity-100">
                                    <div class="absolute inset-0 flex flex-col justify-center items-center text-white p-6 text-center">
                                        <div class="transform transition-all duration-500 delay-100 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100">
                                            <h3 class="text-xl font-bold mb-3">Export Center</h3>
                                            <p class="text-sm opacity-90 mb-4">Multi-format export for all platforms</p>
                                            <div class="space-y-2">
                                                <div class="flex items-center justify-center gap-2 text-xs">
                                                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                                    </svg>
                                                    HD/4K quality
                                                </div>
                                                <div class="flex items-center justify-center gap-2 text-xs">
                                                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                                    </svg>
                                                    Social media formats
                                                </div>
                                                <div class="flex items-center justify-center gap-2 text-xs">
                                                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                                    </svg>
                                                    Platform optimization
                                                </div>
                                                <div class="flex items-center justify-center gap-2 text-xs">
                                                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                                    </svg>
                                                    Instant download
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="absolute top-4 right-4 bg-white/20 backdrop-blur-sm rounded-full p-2 transition-all duration-300 group-hover:scale-110 group-hover:bg-white/30">
                                    <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"></path>
                                        <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"></path>
                                    </svg>
                                </div>

                                <div class="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/50 to-transparent"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Features Section -->
        <section id="features" class="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
            <div class="container mx-auto px-4">
                <div class="text-center mb-16">
                    <span class="inline-block px-3 py-1 text-sm font-medium border border-gray-300 rounded-full mb-4">
                        Platform Features
                    </span>
                    <h2 class="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">Complete Creative Control</h2>
                    <p class="text-xl text-gray-600 max-w-2xl mx-auto">
                        Every aspect of your video is customizable with our advanced AI-powered tools
                    </p>
                </div>

                <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
                    <div class="feature-card border-0 shadow-lg hover:shadow-2xl transition-all duration-500 bg-white group cursor-pointer overflow-hidden rounded-lg">
                        <div class="p-8 text-center relative">
                            <div class="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 transition-all duration-500 opacity-0 group-hover:opacity-5"></div>

                            <div class="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6">
                                <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"></path>
                                </svg>
                            </div>

                            <h3 class="text-xl font-bold text-gray-900 mb-3 relative z-10">Lightning Fast</h3>
                            <p class="text-gray-600 relative z-10">Generate professional videos in under 5 minutes, not hours or days.</p>

                            <div class="absolute top-4 right-4 transition-all duration-500 opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100">
                                <svg class="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732L14.146 12.8l-1.179 4.456a1 1 0 01-1.934 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732L9.854 7.2l1.179-4.456A1 1 0 0112 2z" clip-rule="evenodd"></path>
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div class="feature-card border-0 shadow-lg hover:shadow-2xl transition-all duration-500 bg-white group cursor-pointer overflow-hidden rounded-lg">
                        <div class="p-8 text-center relative">
                            <div class="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 transition-all duration-500 opacity-0 group-hover:opacity-5"></div>

                            <div class="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6">
                                <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" clip-rule="evenodd"></path>
                                </svg>
                            </div>

                            <h3 class="text-xl font-bold text-gray-900 mb-3 relative z-10">Scene Control</h3>
                            <p class="text-gray-600 relative z-10">Customize every scene, transition, and visual element to match your brand.</p>

                            <div class="absolute top-4 right-4 transition-all duration-500 opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100">
                                <svg class="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732L14.146 12.8l-1.179 4.456a1 1 0 01-1.934 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732L9.854 7.2l1.179-4.456A1 1 0 0112 2z" clip-rule="evenodd"></path>
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div class="feature-card border-0 shadow-lg hover:shadow-2xl transition-all duration-500 bg-white group cursor-pointer overflow-hidden rounded-lg">
                        <div class="p-8 text-center relative">
                            <div class="absolute inset-0 bg-gradient-to-br from-green-500 to-teal-500 transition-all duration-500 opacity-0 group-hover:opacity-5"></div>

                            <div class="w-16 h-16 bg-gradient-to-r from-green-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6">
                                <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.894A1 1 0 0018 16V3z" clip-rule="evenodd"></path>
                                </svg>
                            </div>

                            <h3 class="text-xl font-bold text-gray-900 mb-3 relative z-10">Subtitle Styling</h3>
                            <p class="text-gray-600 relative z-10">Choose from multiple subtitle styles and customize fonts, colors, and animations.</p>

                            <div class="absolute top-4 right-4 transition-all duration-500 opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100">
                                <svg class="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732L14.146 12.8l-1.179 4.456a1 1 0 01-1.934 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732L9.854 7.2l1.179-4.456A1 1 0 0112 2z" clip-rule="evenodd"></path>
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div class="feature-card border-0 shadow-lg hover:shadow-2xl transition-all duration-500 bg-white group cursor-pointer overflow-hidden rounded-lg">
                        <div class="p-8 text-center relative">
                            <div class="absolute inset-0 bg-gradient-to-br from-orange-500 to-red-500 transition-all duration-500 opacity-0 group-hover:opacity-5"></div>

                            <div class="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6">
                                <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.894A1 1 0 0018 16V3z"></path>
                                </svg>
                            </div>

                            <h3 class="text-xl font-bold text-gray-900 mb-3 relative z-10">Music Library</h3>
                            <p class="text-gray-600 relative z-10">Access thousands of royalty-free tracks or upload your own custom audio.</p>

                            <div class="absolute top-4 right-4 transition-all duration-500 opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100">
                                <svg class="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a  d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732L14.146 12.8l-1.179 4.456a1 1 0 01-1.934 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732L9.854 7.2l1.179-4.456A1 1 0 0112 2z" clip-rule="evenodd"></path>
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="mt-16 text-center">
                    <div class="relative group">
                        <div class="interactive-image relative group cursor-pointer overflow-hidden rounded-2xl mx-auto border border-gray-200" style="max-width: 800px;">
                            <img src="https://images.pexels.com/photos/7688336/pexels-photo-7688336.jpeg?auto=compress&cs=tinysrgb&w=800" 
                                 alt="VideoAI Feature Overview" 
                                 class="w-full h-96 object-cover transition-all duration-500 group-hover:scale-110">
                            
                            <div class="absolute inset-0 bg-gradient-to-br from-indigo-600/90 to-purple-600/90 transition-all duration-500 opacity-0 group-hover:opacity-100">
                                <div class="absolute inset-0 flex flex-col justify-center items-center text-white p-6 text-center">
                                    <div class="transform transition-all duration-500 delay-100 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100">
                                        <h3 class="text-xl font-bold mb-3">Complete Video Editor</h3>
                                        <p class="text-sm opacity-90 mb-4">Professional-grade editing tools powered by AI</p>
                                        <div class="space-y-2">
                                            <div class="flex items-center justify-center gap-2 text-xs">
                                                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                                </svg>
                                                Timeline-based editing
                                            </div>
                                            <div class="flex items-center justify-center gap-2 text-xs">
                                                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                                </svg>
                                                Real-time collaboration
                                            </div>
                                            <div class="flex items-center justify-center gap-2 text-xs">
                                                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                                </svg>
                                                Advanced effects library
                                            </div>
                                            <div class="flex items-center justify-center gap-2 text-xs">
                                                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                                </svg>
                                                Brand template system
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="absolute top-4 right-4 bg-white/20 backdrop-blur-sm rounded-full p-2 transition-all duration-300 group-hover:scale-110 group-hover:bg-white/30">
                                <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"></path>
                                    <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"></path>
                                </svg>
                            </div>

                            <div class="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/50 to-transparent"></div>
                        </div>

                        <!-- Floating Action Buttons -->
                        <div class="absolute -top-4 -right-4 space-y-2 opacity-0 group-hover:opacity-100 transition-all duration-500">
                            <div class="bg-white rounded-full p-3 shadow-lg hover:scale-110 transition-transform cursor-pointer">
                                <svg class="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"></path>
                                </svg>
                            </div>
                            <div class="bg-white rounded-full p-3 shadow-lg hover:scale-110 transition-transform cursor-pointer">
                                <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Testimonials Section -->
        <section id="testimonials" class="py-20 bg-white">
            <div class="container mx-auto px-4">
                <div class="text-center mb-16">
                    <span class="inline-block px-3 py-1 text-sm font-medium border border-gray-300 rounded-full mb-4">
                        Customer Success
                    </span>
                    <h2 class="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">Loved by Creators Worldwide</h2>
                    <p class="text-xl text-gray-600 max-w-2xl mx-auto">
                        Join thousands of businesses and creators who've transformed their marketing with VideoAI
                    </p>
                </div>

                <div class="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    <div class="testimonial-card border-0 shadow-lg hover:shadow-xl transition-all duration-300 group bg-white rounded-lg">
                        <div class="p-8 relative overflow-hidden">
                            <div class="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-500 opacity-0 group-hover:opacity-5 transition-opacity duration-500"></div>

                            <div class="flex items-center mb-6 relative z-10">
                                <div class="relative">
                                    <img src="https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100" 
                                         alt="Sarah Johnson" 
                                         class="w-15 h-15 rounded-full mr-4 group-hover:scale-110 transition-transform duration-300">
                                    <div class="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                                </div>
                                <div>
                                    <h4 class="font-bold text-gray-900">Sarah Johnson</h4>
                                    <p class="text-gray-600">Marketing Director</p>
                                </div>
                            </div>

                            <p class="text-gray-700 mb-6 italic relative z-10">"VideoAI completely transformed our marketing campaigns. We can now create professional video ads in minutes instead of weeks, and the quality is incredible!"</p>

                            <div class="flex text-yellow-400 relative z-10">
                                <svg class="w-5 h-5 fill-current group-hover:scale-110 transition-transform duration-300" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                                </svg>
                                <svg class="w-5 h-5 fill-current group-hover:scale-110 transition-transform duration-300" style="transition-delay: 50ms;" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                                </svg>
                                <svg class="w-5 h-5 fill-current group-hover:scale-110 transition-transform duration-300" style="transition-delay: 100ms;" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                                </svg>
                                <svg class="w-5 h-5 fill-current group-hover:scale-110 transition-transform duration-300" style="transition-delay: 150ms;" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                                </svg>
                                <svg class="w-5 h-5 fill-current group-hover:scale-110 transition-transform duration-300" style="transition-delay: 200ms;" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                                </svg>
                            </div>

                            <div class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <svg class="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div class="testimonial-card border-0 shadow-lg hover:shadow-xl transition-all duration-300 group bg-white rounded-lg">
                        <div class="p-8 relative overflow-hidden">
                            <div class="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 opacity-0 group-hover:opacity-5 transition-opacity duration-500"></div>

                            <div class="flex items-center mb-6 relative z-10">
                                <div class="relative">
                                    <img src="https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100" 
                                         alt="Mike Chen" 
                                         class="w-15 h-15 rounded-full mr-4 group-hover:scale-110 transition-transform duration-300">
                                    <div class="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                                </div>
                                <div>
                                    <h4 class="font-bold text-gray-900">Mike Chen</h4>
                                    <p class="text-gray-600">Small Business Owner</p>
                                </div>
                            </div>

                            <p class="text-gray-700 mb-6 italic relative z-10">"As a small business, I couldn't afford expensive video production. VideoAI gave me professional results at a fraction of the cost. Game changer!"</p>

                            <div class="flex text-yellow-400 relative z-10">
                                <svg class="w-5 h-5 fill-current group-hover:scale-110 transition-transform duration-300" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                                </svg>
                                <svg class="w-5 h-5 fill-current group-hover:scale-110 transition-transform duration-300" style="transition-delay: 50ms;" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                                </svg>
                                <svg class="w-5 h-5 fill-current group-hover:scale-110 transition-transform duration-300" style="transition-delay: 100ms;" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                                </svg>
                                <svg class="w-5 h-5 fill-current group-hover:scale-110 transition-transform duration-300" style="transition-delay: 150ms;" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                                </svg>
                                <svg class="w-5 h-5 fill-current group-hover:scale-110 transition-transform duration-300" style="transition-delay: 200ms;" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                                </svg>
                            </div>

                            <div class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <svg class="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div class="testimonial-card border-0 shadow-lg hover:shadow-xl transition-all duration-300 group bg-white rounded-lg">
                        <div class="p-8 relative overflow-hidden">
                            <div class="absolute inset-0 bg-gradient-to-br from-pink-500 to-red-500 opacity-0 group-hover:opacity-5 transition-opacity duration-500"></div>

                            <div class="flex items-center mb-6 relative z-10">
                                <div class="relative">
                                    <img src="https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100" 
                                         alt="Emily Rodriguez" 
                                         class="w-15 h-15 rounded-full mr-4 group-hover:scale-110 transition-transform duration-300">
                                    <div class="absolute inset-0 rounded-full bg-gradient-to-r from-pink-500 to-red-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                                </div>
                                <div>
                                    <h4 class="font-bold text-gray-900">Emily Rodriguez</h4>
                                    <p class="text-gray-600">Content Creator</p>
                                </div>
                            </div>

                            <p class="text-gray-700 mb-6 italic relative z-10">"The control over scenes, transitions, and subtitles is amazing. My engagement rates increased by 300% since using VideoAI. Absolutely love it!"</p>

                            <div class="flex text-yellow-400 relative z-10">
                                <svg class="w-5 h-5 fill-current group-hover:scale-110 transition-transform duration-300" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                                </svg>
                                <svg class="w-5 h-5 fill-current group-hover:scale-110 transition-transform duration-300" style="transition-delay: 50ms;" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                                </svg>
                                <svg class="w-5 h-5 fill-current group-hover:scale-110 transition-transform duration-300" style="transition-delay: 100ms;" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                                </svg>
                                <svg class="w-5 h-5 fill-current group-hover:scale-110 transition-transform duration-300" style="transition-delay: 150ms;" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                                </svg>
                                <svg class="w-5 h-5 fill-current group-hover:scale-110 transition-transform duration-300" style="transition-delay: 200ms;" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                                </svg>
                            </div>

                            <div class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <svg class="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                                </svg>
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

            <div class="container mx-auto px-4 text-center relative z-10">
                <div class="max-w-4xl mx-auto">
                    <h2 class="text-4xl lg:text-6xl font-bold mb-6">Ready to Create Your First Video?</h2>
                    <p class="text-xl lg:text-2xl mb-8 opacity-90">
                        Join thousands of businesses creating amazing video content with AI. Start your free trial today.
                    </p>

                    <div class="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                        @auth
                            <a href="{{ route('projects.create') }}"
                               class="cta-button inline-flex items-center justify-center px-8 py-6 text-lg font-semibold bg-white text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-300 group shadow-lg hover:shadow-xl transform hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-white focus:ring-opacity-50 active:scale-95"
                               role="button"
                               data-action="create-project"
                               aria-label="Start creating your video project now">
                                <svg class="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"></path>
                                </svg>
                                Start Creating Now
                            </a>
                        @else
                            <a href="{{ route('register') }}"
                               class="cta-button inline-flex items-center justify-center px-8 py-6 text-lg font-semibold bg-white text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-300 group shadow-lg hover:shadow-xl transform hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-white focus:ring-opacity-50 active:scale-95"
                               role="button"
                               data-action="register"
                               aria-label="Sign up to start creating videos">
                                <svg class="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"></path>
                                </svg>
                                Start Creating Now
                            </a>
                        @endauth

                        <a href="{{ route('pricing') }}"
                           class="cta-button inline-flex items-center justify-center px-8 py-6 text-lg font-medium border-white text-white hover:bg-white hover:text-gray-900 border-2 rounded-lg bg-transparent transition-all duration-300 group shadow-md hover:shadow-lg transform hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-white focus:ring-opacity-50 active:scale-95"
                           role="button"
                           data-action="view-pricing"
                           aria-label="View our pricing plans">
                            View Prices
                            <svg class="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                            </svg>
                        </a>
                    </div>

                    <div class="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm opacity-90">
                        <div class="flex items-center gap-2">
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                            </svg>
                            No credit card required
                        </div>
                        <div class="flex items-center gap-2">
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                            </svg>
                            Free 7-day trial
                        </div>
                        <div class="flex items-center gap-2">
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                            </svg>
                            Cancel anytime
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // 3D Hero Image Interaction
            const hero3DContainer = document.getElementById('hero-3d-container');
            const hero3DContent = document.getElementById('hero-3d-content');
            const heroGlow = document.getElementById('hero-glow');
            const heroOverlay = document.getElementById('hero-overlay');
            const floatingUsers = document.getElementById('floating-users');
            const floatingTrending = document.getElementById('floating-trending');
            const floatingAward = document.getElementById('floating-award');
            const floatingAction = document.getElementById('floating-action');
            const cursorFollower = document.getElementById('cursor-follower');
            const ambientLight = document.getElementById('ambient-light');
            const particles = document.querySelectorAll('.particle');

            let isHovered = false;
            let mouseX = 0;
            let mouseY = 0;

            // Initialize with bottom-right corner hover effect
            function initializeBottomCornerEffect() {
                // Simulate exact bottom-right corner hover position
                // Calculate as if mouse is at bottom-right (75% right, 75% down from center)
                const rect = hero3DContainer.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;

                // Simulate mouse position at bottom-right corner
                const simulatedMouseX = centerX + (rect.width * 0.25); // 75% to the right
                const simulatedMouseY = centerY + (rect.height * 0.25); // 75% down

                // Calculate rotations exactly like the mousemove handler
                const rotateX = (simulatedMouseY - centerY) / 10;
                const rotateY = (centerX - simulatedMouseX) / 10;

                // Apply the exact same transformations as hover
                if (hero3DContent) {
                    hero3DContent.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(0)`;
                }

                // Full hover effects - exactly like mouseenter
                if (heroGlow) {
                    heroGlow.style.opacity = '0.6';
                    heroGlow.style.transform = 'translateZ(-50px) scale(1.1)';
                }
                if (heroOverlay) {
                    heroOverlay.style.opacity = '1';
                }
                if (floatingUsers) {
                    floatingUsers.style.opacity = '1';
                    floatingUsers.style.transform = `translateZ(20px) translateY(${rotateX * 2}px)`;
                }
                if (floatingTrending) {
                    floatingTrending.style.opacity = '1';
                    floatingTrending.style.transform = `translateZ(30px) translateX(${rotateY * -2}px)`;
                }
                if (floatingAward) {
                    floatingAward.style.opacity = '1';
                    floatingAward.style.transform = `translateZ(25px) translateY(${rotateX * -1.5}px)`;
                }
                if (floatingAction) {
                    floatingAction.style.transform = `translateZ(50px) scale(1.1) rotate(${rotateY * 0.5}deg)`;
                }
                if (cursorFollower) {
                    cursorFollower.style.opacity = '1';
                    cursorFollower.style.left = `${rotateY * 2 + 50}%`;
                    cursorFollower.style.top = `${rotateX * 2 + 50}%`;
                }
                if (ambientLight) {
                    ambientLight.style.opacity = '0.6';
                    ambientLight.style.transform = `scale(1.5) translate(${rotateY * 3}px, ${rotateX * 3}px)`;
                }

                // Show all particles with full opacity
                particles.forEach((particle, index) => {
                    if (particle) {
                        particle.style.opacity = '1';
                        particle.style.transform = `translateZ(${10 + index * 5}px) translate(${rotateY * (index + 1)}px, ${rotateX * (index + 1)}px)`;
                    }
                });
            }

            if (hero3DContainer) {
                // Initialize the bottom corner effect
                setTimeout(initializeBottomCornerEffect, 500);
                hero3DContainer.addEventListener('mousemove', function(e) {
                    const rect = hero3DContainer.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;

                    const rotateX = (e.clientY - centerY) / 10;
                    const rotateY = (centerX - e.clientX) / 10;

                    mouseX = rotateY;
                    mouseY = rotateX;

                    if (hero3DContent) {
                        hero3DContent.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(0)`;
                    }

                    // Update floating elements
                    if (floatingUsers) {
                        floatingUsers.style.transform = `translateZ(20px) translateY(${rotateX * 2}px)`;
                    }
                    if (floatingTrending) {
                        floatingTrending.style.transform = `translateZ(30px) translateX(${rotateY * -2}px)`;
                    }
                    if (floatingAward) {
                        floatingAward.style.transform = `translateZ(25px) translateY(${rotateX * -1.5}px)`;
                    }
                    if (floatingAction) {
                        floatingAction.style.transform = `translateZ(50px) scale(${isHovered ? 1.1 : 1}) rotate(${rotateY * 0.5}deg)`;
                    }

                    // Update cursor follower
                    if (cursorFollower) {
                        cursorFollower.style.left = `${rotateY * 2 + 50}%`;
                        cursorFollower.style.top = `${rotateX * 2 + 50}%`;
                    }

                    // Update ambient light
                    if (ambientLight) {
                        ambientLight.style.transform = `translate(${rotateY * 3}px, ${rotateX * 3}px)`;
                    }

                    // Update particles
                    particles.forEach((particle, index) => {
                        if (particle) {
                            particle.style.transform = `translateZ(${10 + index * 5}px) translate(${rotateY * (index + 1)}px, ${rotateX * (index + 1)}px)`;
                        }
                    });
                });

                hero3DContainer.addEventListener('mouseenter', function() {
                    isHovered = true;
                    
                    if (heroGlow) {
                        heroGlow.style.opacity = '0.6';
                        heroGlow.style.transform = 'translateZ(-50px) scale(1.1)';
                    }
                    if (heroOverlay) {
                        heroOverlay.style.opacity = '1';
                    }
                    if (floatingUsers) {
                        floatingUsers.style.opacity = '1';
                        floatingUsers.style.transform = 'translateY(0) translateZ(20px)';
                    }
                    if (floatingTrending) {
                        floatingTrending.style.opacity = '1';
                        floatingTrending.style.transform = 'translateY(0) translateZ(30px)';
                    }
                    if (floatingAward) {
                        floatingAward.style.opacity = '1';
                        floatingAward.style.transform = 'translateY(0) translateZ(25px)';
                    }
                    if (floatingAction) {
                        floatingAction.style.transform = `translateZ(50px) scale(1.1) rotate(6deg)`;
                    }
                    if (cursorFollower) {
                        cursorFollower.style.opacity = '1';
                    }
                    if (ambientLight) {
                        ambientLight.style.opacity = '0.6';
                        ambientLight.style.transform = 'scale(1.5)';
                    }

                    particles.forEach(particle => {
                        if (particle) {
                            particle.style.opacity = '1';
                        }
                    });
                });

                hero3DContainer.addEventListener('mouseleave', function() {
                    isHovered = false;
                    mouseX = 0;
                    mouseY = 0;

                    // Return to exact bottom-right corner hover state
                    setTimeout(() => {
                        if (!isHovered) { // Only apply if still not hovered
                            // Recalculate the exact bottom-right corner position
                            const rect = hero3DContainer.getBoundingClientRect();
                            const centerX = rect.left + rect.width / 2;
                            const centerY = rect.top + rect.height / 2;

                            const simulatedMouseX = centerX + (rect.width * 0.25);
                            const simulatedMouseY = centerY + (rect.height * 0.25);

                            const rotateX = (simulatedMouseY - centerY) / 10;
                            const rotateY = (centerX - simulatedMouseX) / 10;

                            if (hero3DContent) {
                                hero3DContent.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(0)`;
                            }
                            if (heroGlow) {
                                heroGlow.style.opacity = '0.6';
                                heroGlow.style.transform = 'translateZ(-50px) scale(1.1)';
                            }
                            if (heroOverlay) {
                                heroOverlay.style.opacity = '1';
                            }
                            if (floatingUsers) {
                                floatingUsers.style.opacity = '1';
                                floatingUsers.style.transform = `translateZ(20px) translateY(${rotateX * 2}px)`;
                            }
                            if (floatingTrending) {
                                floatingTrending.style.opacity = '1';
                                floatingTrending.style.transform = `translateZ(30px) translateX(${rotateY * -2}px)`;
                            }
                            if (floatingAward) {
                                floatingAward.style.opacity = '1';
                                floatingAward.style.transform = `translateZ(25px) translateY(${rotateX * -1.5}px)`;
                            }
                            if (floatingAction) {
                                floatingAction.style.transform = `translateZ(50px) scale(1.1) rotate(${rotateY * 0.5}deg)`;
                            }
                            if (cursorFollower) {
                                cursorFollower.style.opacity = '1';
                                cursorFollower.style.left = `${rotateY * 2 + 50}%`;
                                cursorFollower.style.top = `${rotateX * 2 + 50}%`;
                            }
                            if (ambientLight) {
                                ambientLight.style.opacity = '0.6';
                                ambientLight.style.transform = `scale(1.5) translate(${rotateY * 3}px, ${rotateX * 3}px)`;
                            }

                            particles.forEach((particle, index) => {
                                if (particle) {
                                    particle.style.opacity = '1';
                                    particle.style.transform = `translateZ(${10 + index * 5}px) translate(${rotateY * (index + 1)}px, ${rotateX * (index + 1)}px)`;
                                }
                            });
                        }
                    }, 300); // Small delay for smooth transition
                });
            }
        });

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

        // Enhanced button functionality
        document.addEventListener('DOMContentLoaded', function() {
            // Add loading state to CTA buttons
            const ctaButtons = document.querySelectorAll('.cta-button');

            ctaButtons.forEach(button => {
                button.addEventListener('click', function(e) {
                    // Validate the link before proceeding
                    const href = this.getAttribute('href');
                    if (!href || href === '#') {
                        e.preventDefault();
                        console.error('Invalid button link:', href);
                        return;
                    }

                    // Add loading state
                    const originalText = this.innerHTML;
                    const action = this.getAttribute('data-action');
                    const isCreateButton = action === 'create-project' || action === 'register';

                    if (isCreateButton) {
                        this.innerHTML = `
                            <svg class="w-5 h-5 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Loading...
                        `;
                        this.style.pointerEvents = 'none';
                    }

                    // Log button click for debugging
                    console.log('CTA Button clicked:', {
                        action: action,
                        text: originalText.replace(/<[^>]*>/g, '').trim(),
                        href: href,
                        timestamp: new Date().toISOString()
                    });

                    // Restore original text after a delay if navigation fails
                    setTimeout(() => {
                        this.innerHTML = originalText;
                        this.style.pointerEvents = 'auto';
                    }, 3000);
                });
            });

            // Add keyboard navigation support
            ctaButtons.forEach(button => {
                button.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this.click();
                    }
                });
            });

            // Add visual feedback for button states
            ctaButtons.forEach(button => {
                button.addEventListener('mousedown', function() {
                    this.style.transform = 'scale(0.95) translateY(-1px)';
                });

                button.addEventListener('mouseup', function() {
                    this.style.transform = '';
                });

                button.addEventListener('mouseleave', function() {
                    this.style.transform = '';
                });
            });
        });

        // Smooth scrolling for anchor links
        document.addEventListener('DOMContentLoaded', function() {
            const anchorLinks = document.querySelectorAll('a[href^="#"]');

            anchorLinks.forEach(link => {
                link.addEventListener('click', function(e) {
                    const href = this.getAttribute('href');
                    if (href === '#') return;

                    const target = document.querySelector(href);
                    if (target) {
                        e.preventDefault();
                        const offsetTop = target.offsetTop - 80; // Account for fixed nav
                        window.scrollTo({
                            top: offsetTop,
                            behavior: 'smooth'
                        });
                    }
                });
            });
        });
    </script>
</body>
</html>
