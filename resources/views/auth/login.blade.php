<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Login - VidsAI</title>
    
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
            min-height: 100vh;
            display: flex;
            align-items: center;
        }

        .auth-container {
            background: var(--dark-surface);
            border: 1px solid var(--dark-border);
            border-radius: 16px;
            padding: 3rem;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        .form-control {
            background-color: var(--dark-surface);
            border: 1px solid var(--dark-border);
            color: var(--dark-text);
            border-radius: 8px;
        }

        .form-control:focus {
            background-color: var(--dark-surface);
            border-color: var(--accent-blue);
            color: var(--dark-text);
            box-shadow: 0 0 0 0.2rem rgba(88, 166, 255, 0.25);
        }

        .btn-primary-dark {
            background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
            border: none;
            color: white;
            font-weight: 600;
            border-radius: 8px;
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

        .hero-gradient {
            background: linear-gradient(135deg, var(--dark-bg) 0%, #1a1a2e 50%, var(--dark-bg) 100%);
        }
    </style>
</head>
<body class="hero-gradient">
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-md-6 col-lg-5">
                <div class="auth-container">
                    <div class="text-center mb-5">
                        <div class="mb-3">
                            <i class="bi bi-camera-video-fill text-primary" style="font-size: 3rem;"></i>
                        </div>
                        <h1 class="h3 fw-bold mb-2">Welcome Back</h1>
                        <p class="text-muted">Sign in to your VidsAI account</p>
                    </div>

                    <form method="POST" action="{{ route('login') }}">
                        @csrf

                        <!-- Email Address -->
                        <div class="mb-4">
                            <label for="email" class="form-label fw-semibold">Email Address</label>
                            <input id="email" class="form-control form-control-lg @error('email') is-invalid @enderror" 
                                   type="email" name="email" value="{{ old('email') }}" required autofocus autocomplete="username"
                                   placeholder="Enter your email">
                            @error('email')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                        </div>

                        <!-- Password -->
                        <div class="mb-4">
                            <label for="password" class="form-label fw-semibold">Password</label>
                            <input id="password" class="form-control form-control-lg @error('password') is-invalid @enderror"
                                   type="password" name="password" required autocomplete="current-password"
                                   placeholder="Enter your password">
                            @error('password')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                        </div>

                        <!-- Remember Me -->
                        <div class="mb-4 form-check">
                            <input id="remember_me" type="checkbox" class="form-check-input" name="remember">
                            <label for="remember_me" class="form-check-label">Remember me</label>
                        </div>

                        <div class="d-grid mb-4">
                            <button type="submit" class="btn btn-primary-dark btn-lg">
                                <i class="bi bi-box-arrow-in-right me-2"></i>Sign In
                            </button>
                        </div>

                        <div class="text-center mb-4">
                            @if (Route::has('password.request'))
                                <a class="text-decoration-none text-primary" href="{{ route('password.request') }}">
                                    Forgot your password?
                                </a>
                            @endif
                        </div>

                        <hr class="my-4 border-secondary">

                        <div class="text-center">
                            <p class="mb-0 text-muted">Don't have an account? 
                                <a href="{{ route('register') }}" class="text-decoration-none fw-bold gradient-text">Sign up</a>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
