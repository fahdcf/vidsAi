<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Create Project - VidsAI</title>
    
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
            --red-500: #ef4444;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: var(--navy-900);
            color: #fff;
            overflow-x: hidden;
        }

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
            text-decoration: none;
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

        /* Page Header */
        .page-header {
            margin-bottom: 2rem;
        }

        .page-header h1 {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
        }

        .page-header p {
            color: var(--gray-400);
            font-size: 1rem;
        }

        /* Progress Steps */
        .progress-steps {
            background: var(--navy-800);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 16px;
            padding: 1.5rem 2rem;
            margin-bottom: 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 1rem;
        }

        .step-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            flex: 1;
            position: relative;
        }

        .step-item:not(:last-child)::after {
            content: '';
            position: absolute;
            right: -0.5rem;
            top: 50%;
            transform: translateY(-50%);
            width: 100%;
            height: 2px;
            background: rgba(255, 255, 255, 0.1);
            z-index: 0;
        }

        .step-number {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.05);
            color: var(--gray-400);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 1rem;
            position: relative;
            z-index: 1;
            flex-shrink: 0;
        }

        .step-item.active .step-number {
            background: linear-gradient(135deg, var(--blue-500), var(--purple-500));
            color: #fff;
        }

        .step-item.completed .step-number {
            background: var(--green-500);
            color: #fff;
        }

        .step-label {
            font-size: 0.9rem;
            font-weight: 600;
            color: var(--gray-400);
        }

        .step-item.active .step-label {
            color: #fff;
        }

        /* Form Card */
        .form-card {
            background: var(--navy-800);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 16px;
            padding: 2rem;
            margin-bottom: 2rem;
        }

        .form-card-header {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 2rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .form-card-icon {
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, var(--blue-500), var(--purple-500));
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.25rem;
        }

        .form-card-header h2 {
            font-size: 1.5rem;
            font-weight: 700;
            margin: 0;
        }

        /* Form Elements */
        .form-group {
            margin-bottom: 1.5rem;
        }

        .form-label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 600;
            font-size: 0.9rem;
            color: #fff;
        }

        .form-input,
        .form-select,
        .form-textarea {
            width: 100%;
            padding: 0.75rem 1rem;
            background: var(--navy-700);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            color: #fff;
            font-size: 0.9rem;
            transition: all 0.2s;
        }

        .form-input:focus,
        .form-select:focus,
        .form-textarea:focus {
            outline: none;
            border-color: var(--blue-500);
            background: var(--navy-600);
        }

        .form-textarea {
            resize: vertical;
            min-height: 120px;
        }

        .form-text {
            display: block;
            margin-top: 0.375rem;
            font-size: 0.8rem;
            color: var(--gray-400);
        }

        /* Radio/Checkbox Cards */
        .option-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
        }

        .option-card {
            position: relative;
        }

        .option-card input[type="radio"],
        .option-card input[type="checkbox"] {
            position: absolute;
            opacity: 0;
            pointer-events: none;
        }

        .option-label {
            display: block;
            padding: 1.5rem;
            background: var(--navy-700);
            border: 2px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s;
        }

        .option-card input:checked + .option-label {
            background: rgba(59, 130, 246, 0.1);
            border-color: var(--blue-500);
        }

        .option-label:hover {
            border-color: rgba(59, 130, 246, 0.5);
        }

        .option-icon {
            font-size: 2.5rem;
            display: block;
            margin-bottom: 0.75rem;
            color: var(--blue-500);
        }

        .option-title {
            font-weight: 600;
            margin-bottom: 0.25rem;
            color: #fff;
        }

        .option-description {
            font-size: 0.8rem;
            color: var(--gray-400);
        }

        /* Buttons */
        .btn-group {
            display: flex;
            gap: 1rem;
            justify-content: space-between;
            margin-top: 2rem;
        }

        .btn {
            padding: 0.875rem 2rem;
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
            background: var(--navy-700);
            color: #fff;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .btn-secondary:hover {
            background: var(--navy-600);
        }

        .btn-success {
            background: var(--green-500);
            color: #fff;
        }

        .btn-success:hover {
            background: #0ea672;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        /* Alert */
        .alert {
            padding: 1rem 1.25rem;
            border-radius: 10px;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: flex-start;
            gap: 0.75rem;
        }

        .alert-info {
            background: rgba(59, 130, 246, 0.1);
            border: 1px solid rgba(59, 130, 246, 0.2);
            color: #60a5fa;
        }

        .alert-success {
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.2);
            color: #4ade80;
        }

        /* Hidden Step */
        .step-content {
            display: none;
        }

        .step-content.active {
            display: block;
        }

        /* Review Section */
        .review-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 2rem;
        }

        .review-section h3 {
            font-size: 1.125rem;
            font-weight: 700;
            margin-bottom: 1rem;
            color: #fff;
        }

        .review-list {
            list-style: none;
        }

        .review-list li {
            padding: 0.5rem 0;
            font-size: 0.9rem;
            color: var(--gray-400);
        }

        .review-list li strong {
            color: #fff;
            margin-right: 0.5rem;
        }

        /* Responsive */
        @media (max-width: 768px) {
            .sidebar {
                transform: translateX(-100%);
            }

            .main-content {
                margin-left: 0;
            }

            .progress-steps {
                flex-direction: column;
            }

            .step-item:not(:last-child)::after {
                display: none;
            }

            .option-grid {
                grid-template-columns: 1fr;
            }

            .review-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="dashboard-wrapper">
        <!-- Sidebar -->
        <aside class="sidebar">
            <a href="{{ route('dashboard') }}" class="logo">
                <div class="logo-icon">
                    <i class="bi bi-camera-video-fill"></i>
                </div>
                <span>VidsAI</span>
            </a>

            <ul class="nav-menu">
                <li class="nav-item">
                    <a href="{{ route('dashboard') }}" class="nav-link">
                        <i class="bi bi-house-fill"></i>
                        <span>Dashboard</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a href="{{ route('projects.create') }}" class="nav-link active">
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
            <!-- Page Header -->
            <div class="page-header">
                <h1>Create New Video Project</h1>
                <p>Follow the steps below to create your AI-powered video advertisement</p>
            </div>

            <!-- Progress Steps -->
            <div class="progress-steps">
                <div class="step-item active" id="progress-step-1">
                    <div class="step-number">1</div>
                    <div class="step-label">General Info</div>
                </div>
                <div class="step-item" id="progress-step-2">
                    <div class="step-number">2</div>
                    <div class="step-label">Script Options</div>
                </div>
                <div class="step-item" id="progress-step-3">
                    <div class="step-number">3</div>
                    <div class="step-label">Voiceover</div>
                </div>
                <div class="step-item" id="progress-step-4">
                    <div class="step-number">4</div>
                    <div class="step-label">Review & Submit</div>
                </div>
            </div>

            <!-- Form -->
            <form method="POST" action="{{ route('projects.store') }}" enctype="multipart/form-data" id="videoForm">
            <form method="POST" action="{{ route('projects.store') }}" enctype="multipart/form-data" id="videoForm">
                @csrf
                
                <!-- Step 1: General Info -->
                <div class="step-content active" id="step-content-1">
                    <div class="form-card">
                        <div class="form-card-header">
                            <div class="form-card-icon">
                                <i class="bi bi-info-circle-fill"></i>
                            </div>
                            <h2>General Information</h2>
                        </div>

                        <div class="form-group">
                            <label for="name" class="form-label">Project Name *</label>
                            <input type="text" class="form-input" id="name" name="name" value="{{ old('name') }}" required placeholder="Enter project name">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Project Type *</label>
                            <div class="option-grid">
                                <div class="option-card">
                                    <input type="radio" name="type" id="type-product" value="product" {{ old('type') == 'product' ? 'checked' : '' }} required>
                                    <label class="option-label" for="type-product">
                                        <i class="bi bi-box-seam option-icon"></i>
                                        <div class="option-title">Product</div>
                                        <div class="option-description">Physical or digital products</div>
                                    </label>
                                </div>
                                <div class="option-card">
                                    <input type="radio" name="type" id="type-service" value="service" {{ old('type') == 'service' ? 'checked' : '' }}>
                                    <label class="option-label" for="type-service">
                                        <i class="bi bi-gear-fill option-icon"></i>
                                        <div class="option-title">Service</div>
                                        <div class="option-description">Professional services</div>
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="category" class="form-label">Category *</label>
                            <select class="form-select" id="category" name="category" required>
                                <option value="">Select a category</option>
                                <option value="tech" {{ old('category') == 'tech' ? 'selected' : '' }}>Technology</option>
                                <option value="beauty" {{ old('category') == 'beauty' ? 'selected' : '' }}>Beauty & Cosmetics</option>
                                <option value="food" {{ old('category') == 'food' ? 'selected' : '' }}>Food & Beverage</option>
                                <option value="fashion" {{ old('category') == 'fashion' ? 'selected' : '' }}>Fashion</option>
                                <option value="health" {{ old('category') == 'health' ? 'selected' : '' }}>Health & Fitness</option>
                                <option value="finance" {{ old('category') == 'finance' ? 'selected' : '' }}>Finance</option>
                                <option value="education" {{ old('category') == 'education' ? 'selected' : '' }}>Education</option>
                                <option value="travel" {{ old('category') == 'travel' ? 'selected' : '' }}>Travel</option>
                                <option value="other" {{ old('category') == 'other' ? 'selected' : '' }}>Other</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="description" class="form-label">Description *</label>
                            <textarea class="form-textarea" id="description" name="description" required placeholder="Describe your product or service in detail. This will help AI generate better content.">{{ old('description') }}</textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="language" class="form-label">Language *</label>
                            <select class="form-select" id="language" name="language" required>
                                <option value="english" {{ old('language') == 'english' ? 'selected' : '' }}>English</option>
                                <option value="arabic" {{ old('language') == 'arabic' ? 'selected' : '' }}>Arabic</option>
                                <option value="french" {{ old('language') == 'french' ? 'selected' : '' }}>French</option>
                                <option value="spanish" {{ old('language') == 'spanish' ? 'selected' : '' }}>Spanish</option>
                                <option value="german" {{ old('language') == 'german' ? 'selected' : '' }}>German</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Video Format *</label>
                            <div class="option-grid" style="grid-template-columns: repeat(4, 1fr);">
                                <div class="option-card">
                                    <input type="checkbox" name="video_format[]" id="format-16-9" value="16:9" {{ in_array('16:9', old('video_format', [])) ? 'checked' : '' }}>
                                    <label class="option-label" for="format-16-9">
                                        <i class="bi bi-laptop option-icon"></i>
                                        <div class="option-title">16:9</div>
                                        <div class="option-description">Landscape</div>
                                    </label>
                                </div>
                                <div class="option-card">
                                    <input type="checkbox" name="video_format[]" id="format-1-1" value="1:1" {{ in_array('1:1', old('video_format', [])) ? 'checked' : '' }}>
                                    <label class="option-label" for="format-1-1">
                                        <i class="bi bi-square option-icon"></i>
                                        <div class="option-title">1:1</div>
                                        <div class="option-description">Square</div>
                                    </label>
                                </div>
                                <div class="option-card">
                                    <input type="checkbox" name="video_format[]" id="format-9-16" value="9:16" {{ in_array('9:16', old('video_format', [])) ? 'checked' : '' }}>
                                    <label class="option-label" for="format-9-16">
                                        <i class="bi bi-phone option-icon"></i>
                                        <div class="option-title">9:16</div>
                                        <div class="option-description">Portrait</div>
                                    </label>
                                </div>
                                <div class="option-card">
                                    <input type="checkbox" name="video_format[]" id="format-all" value="all" {{ in_array('all', old('video_format', [])) ? 'checked' : '' }}>
                                    <label class="option-label" for="format-all">
                                        <i class="bi bi-collection-play option-icon"></i>
                                        <div class="option-title">All Formats</div>
                                        <div class="option-description">Generate all</div>
                                    </label>
                                </div>
                            </div>
                            <span class="form-text">Select one or more video formats</span>
                        </div>
                    </div>
                </div>
                
                <!-- Step 2: Script Options -->
                <div class="step-content" id="step-content-2">
                    <div class="form-card">
                        <div class="form-card-header">
                            <div class="form-card-icon">
                                <i class="bi bi-file-text-fill"></i>
                            </div>
                            <h2>Script Options</h2>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Script Option *</label>
                            <div class="option-grid">
                                <div class="option-card">
                                    <input type="radio" name="script_option" id="script-generate" value="generate" {{ old('script_option') == 'generate' ? 'checked' : '' }} required>
                                    <label class="option-label" for="script-generate">
                                        <i class="bi bi-magic option-icon"></i>
                                        <div class="option-title">Generate Script</div>
                                        <div class="option-description">AI creates from description</div>
                                    </label>
                                </div>
                                <div class="option-card">
                                    <input type="radio" name="script_option" id="script-paste" value="paste" {{ old('script_option') == 'paste' ? 'checked' : '' }}>
                                    <label class="option-label" for="script-paste">
                                        <i class="bi bi-file-earmark-text option-icon"></i>
                                        <div class="option-title">Paste My Script</div>
                                        <div class="option-description">Use your own script</div>
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-group" id="custom-script-section" style="display: none;">
                            <label for="custom_script" class="form-label">Your Script *</label>
                            <textarea class="form-textarea" id="custom_script" name="custom_script" placeholder="Paste your video script here...">{{ old('custom_script') }}</textarea>
                            <span class="form-text">Maximum 5000 characters</span>
                        </div>
                    </div>
                </div>
                
                <!-- Step 3: Voiceover Options -->
                <div class="step-content" id="step-content-3">
                    <div class="form-card">
                        <div class="form-card-header">
                            <div class="form-card-icon">
                                <i class="bi bi-mic-fill"></i>
                            </div>
                            <h2>Voiceover Options</h2>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Voiceover Option *</label>
                            <div class="option-grid" style="grid-template-columns: repeat(3, 1fr);">
                                <div class="option-card">
                                    <input type="radio" name="voiceover_option" id="voice-ai" value="ai" {{ old('voiceover_option') == 'ai' ? 'checked' : '' }} required>
                                    <label class="option-label" for="voice-ai">
                                        <i class="bi bi-robot option-icon"></i>
                                        <div class="option-title">AI Voice</div>
                                        <div class="option-description">Generate with AI</div>
                                    </label>
                                </div>
                                <div class="option-card">
                                    <input type="radio" name="voiceover_option" id="voice-upload" value="upload" {{ old('voiceover_option') == 'upload' ? 'checked' : '' }}>
                                    <label class="option-label" for="voice-upload">
                                        <i class="bi bi-upload option-icon"></i>
                                        <div class="option-title">Upload Voice</div>
                                        <div class="option-description">MP3 or WAV file</div>
                                    </label>
                                </div>
                                <div class="option-card">
                                    <input type="radio" name="voiceover_option" id="voice-none" value="none" {{ old('voiceover_option') == 'none' ? 'checked' : '' }}>
                                    <label class="option-label" for="voice-none">
                                        <i class="bi bi-volume-mute option-icon"></i>
                                        <div class="option-title">No Voice</div>
                                        <div class="option-description">Text only</div>
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-group" id="voice-upload-section" style="display: none;">
                            <label for="voiceover_file" class="form-label">Upload Voice File</label>
                            <input type="file" class="form-input" id="voiceover_file" name="voiceover_file" accept=".mp3,.wav">
                            <span class="form-text">Supported formats: MP3, WAV. Maximum size: 10MB</span>
                        </div>
                    </div>
                </div>
                
                <!-- Step 4: Review & Submit -->
                <div class="step-content" id="step-content-4">
                    <div class="form-card">
                        <div class="form-card-header">
                            <div class="form-card-icon">
                                <i class="bi bi-check-circle-fill"></i>
                            </div>
                            <h2>Review & Submit</h2>
                        </div>

                        <div class="alert alert-info">
                            <i class="bi bi-info-circle-fill"></i>
                            <div>
                                <strong>Almost there!</strong> Review your settings and click "Generate My Video" to start the AI video creation process.
                            </div>
                        </div>
                        
                        <div id="review-content" class="review-grid">
                            <!-- Review content will be populated by JavaScript -->
                        </div>
                    </div>
                </div>
                
                <!-- Navigation Buttons -->
                <div class="btn-group">
                    <button type="button" class="btn btn-secondary" id="prevBtn" onclick="changeStep(-1)" style="display: none;">
                        <i class="bi bi-arrow-left"></i> Previous
                    </button>
                    <div></div>
                    <button type="button" class="btn btn-primary" id="nextBtn" onclick="changeStep(1)">
                        Next <i class="bi bi-arrow-right"></i>
                    </button>
                    <button type="submit" class="btn btn-success" id="submitBtn" style="display: none;">
                        <i class="bi bi-magic"></i> Generate My Video
                    </button>
                </div>
            </form>
        </main>
    </div>
    </div>

    <script>
let currentStep = 1;
const totalSteps = 4;

function showStep(step) {
    // Hide all steps
    document.querySelectorAll('.step-content').forEach(el => {
        el.classList.remove('active');
    });
    
    // Show current step
    document.getElementById(`step-content-${step}`).classList.add('active');
    
    // Update progress indicators
    document.querySelectorAll('.step-item').forEach((el, index) => {
        el.classList.remove('active', 'completed');
        if (index + 1 < step) {
            el.classList.add('completed');
        } else if (index + 1 === step) {
            el.classList.add('active');
        }
    });
    
    // Update navigation buttons
    document.getElementById('prevBtn').style.display = step === 1 ? 'none' : 'inline-flex';
    document.getElementById('nextBtn').style.display = step === totalSteps ? 'none' : 'inline-flex';
    document.getElementById('submitBtn').style.display = step === totalSteps ? 'inline-flex' : 'none';
    
    // Populate review content on last step
    if (step === totalSteps) {
        populateReview();
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function changeStep(direction) {
    if (direction === 1 && !validateCurrentStep()) {
        return;
    }
    
    currentStep += direction;
    if (currentStep < 1) currentStep = 1;
    if (currentStep > totalSteps) currentStep = totalSteps;
    
    showStep(currentStep);
}

function validateCurrentStep() {
    const step = currentStep;
    let isValid = true;
    
    if (step === 1) {
        const required = ['name', 'type', 'category', 'description', 'language'];
        required.forEach(field => {
            const element = document.querySelector(`[name="${field}"]`);
            if (field === 'type') {
                const checked = document.querySelector('[name="type"]:checked');
                if (!checked) isValid = false;
            } else if (!element?.value) {
                isValid = false;
            }
        });

        const videoFormatChecked = document.querySelectorAll('[name="video_format[]"]:checked');
        if (videoFormatChecked.length === 0) {
            isValid = false;
            alert('Please select at least one video format.');
        }
    } else if (step === 2) {
        const scriptOption = document.querySelector('[name="script_option"]:checked');
        if (!scriptOption) {
            isValid = false;
            alert('Please select a script option.');
        } else if (scriptOption.value === 'paste') {
            const customScript = document.querySelector('[name="custom_script"]');
            if (!customScript.value) {
                isValid = false;
                alert('Please enter your custom script.');
            }
        }
    } else if (step === 3) {
        const voiceOption = document.querySelector('[name="voiceover_option"]:checked');
        if (!voiceOption) {
            isValid = false;
            alert('Please select a voiceover option.');
        } else if (voiceOption.value === 'upload') {
            const voiceFile = document.querySelector('[name="voiceover_file"]');
            if (!voiceFile.files.length) {
                isValid = false;
                alert('Please upload a voice file.');
            }
        }
    }
    
    return isValid;
}

function populateReview() {
    const reviewContent = document.getElementById('review-content');
    const name = document.querySelector('[name="name"]').value;
    const type = document.querySelector('[name="type"]:checked')?.value;
    const category = document.querySelector('[name="category"]').value;
    const description = document.querySelector('[name="description"]').value;
    const language = document.querySelector('[name="language"]').value;
    const videoFormats = Array.from(document.querySelectorAll('[name="video_format[]"]:checked')).map(cb => cb.value);
    const scriptOption = document.querySelector('[name="script_option"]:checked')?.value;
    const voiceOption = document.querySelector('[name="voiceover_option"]:checked')?.value;
    
    reviewContent.innerHTML = `
        <div class="review-section">
            <h3>Project Details</h3>
            <ul class="review-list">
                <li><strong>Name:</strong> ${name}</li>
                <li><strong>Type:</strong> ${type ? type.charAt(0).toUpperCase() + type.slice(1) : ''}</li>
                <li><strong>Category:</strong> ${category}</li>
                <li><strong>Language:</strong> ${language.charAt(0).toUpperCase() + language.slice(1)}</li>
                <li><strong>Video Format:</strong> ${videoFormats.includes('all') ? 'All Formats (16:9, 1:1, 9:16)' : videoFormats.join(', ')}</li>
            </ul>
        </div>
        <div class="review-section">
            <h3>Content Options</h3>
            <ul class="review-list">
                <li><strong>Script:</strong> ${scriptOption === 'generate' ? 'AI Generated' : 'Custom Script'}</li>
                <li><strong>Voiceover:</strong> ${voiceOption === 'ai' ? 'AI Generated' : voiceOption === 'upload' ? 'Custom Upload' : 'None'}</li>
            </ul>
        </div>
        <div class="review-section" style="grid-column: 1 / -1;">
            <h3>Description</h3>
            <p style="color: var(--gray-400);">${description}</p>
        </div>
    `;
}

// Handle script option changes
document.querySelectorAll('[name="script_option"]').forEach(radio => {
    radio.addEventListener('change', function() {
        const customScriptSection = document.getElementById('custom-script-section');
        customScriptSection.style.display = this.value === 'paste' ? 'block' : 'none';
    });
});

// Handle voiceover option changes
document.querySelectorAll('[name="voiceover_option"]').forEach(radio => {
    radio.addEventListener('change', function() {
        const uploadSection = document.getElementById('voice-upload-section');
        uploadSection.style.display = this.value === 'upload' ? 'block' : 'none';
    });
});

// Handle video format checkbox changes
document.querySelectorAll('[name="video_format[]"]').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
        const allFormatsCheckbox = document.getElementById('format-all');
        const otherCheckboxes = document.querySelectorAll('[name="video_format[]"]:not(#format-all)');

        if (this.id === 'format-all') {
            if (this.checked) {
                otherCheckboxes.forEach(cb => cb.checked = false);
            }
        } else {
            if (this.checked) {
                allFormatsCheckbox.checked = false;
            }
        }
    });
});

// Initialize
showStep(1);

// Set initial state based on old values
@if(old('script_option') == 'paste')
    document.getElementById('custom-script-section').style.display = 'block';
@endif

@if(old('voiceover_option') == 'upload')
    document.getElementById('voice-upload-section').style.display = 'block';
@endif
    </script>
</body>
</html>