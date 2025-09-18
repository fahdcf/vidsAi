@extends('layouts.app')

@section('title', 'Review Scenes - ' . $project->name)

@push('styles')
<meta name="csrf-token" content="{{ csrf_token() }}">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" rel="stylesheet">
    <style>
        /* Modern Scene Page Styling */
        .scene-page {
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            min-height: 100vh;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .container {
            max-width: 1400px;
        }

        /* Header Styling */
        .page-header {
            background: white;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
            padding: 2rem;
            margin-bottom: 2rem;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .page-title {
            font-size: 2.5rem;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 0.5rem;
        }

        .page-subtitle {
            color: #64748b;
            font-size: 1.1rem;
            margin-bottom: 1rem;
        }

        .format-badge {
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 8px;
            font-size: 0.875rem;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
        }

        /* Progress Indicator */
        .progress-card {
            background: white;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.2);
            margin-bottom: 2rem;
        }

        .progress-step {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 1rem;
            transition: all 0.3s ease;
        }

        .progress-step.completed {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .progress-step.active {
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: white;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .progress-step:not(.completed):not(.active) {
            background: #f1f5f9;
            color: #94a3b8;
        }

        .progress-connector {
            width: 60px;
            height: 2px;
            background: #e2e8f0;
            margin: 0 1rem;
        }

        /* Scene Cards */
        .scene-card {
            background: white;
            border: none;
            border-radius: 20px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
            overflow: hidden;
            margin-bottom: 2rem;
        }

        .scene-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
        }

        .scene-card-header {
            background: linear-gradient(135deg, #f8fafc, #e2e8f0);
            padding: 1.5rem;
            border-bottom: 1px solid #e2e8f0;
        }

        .scene-number {
            font-size: 1.25rem;
            font-weight: 700;
            color: #1e293b;
        }

        .approval-checkbox {
            transform: scale(1.2);
            accent-color: #10b981;
        }

        /* Video Player Container */
        .video-player-container {
            background: #000;
            border-radius: 16px;
            overflow: hidden;
            margin-bottom: 1.5rem;
            position: relative;
        }

        .video-wrapper {
            position: relative;
            background: #000;
        }

        /* Video Overlay Styles */
        .video-overlays {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 10;
        }

        .video-overlay-logo {
            position: absolute;
            top: 20px;
            right: 20px;
            z-index: 11;
        }

        .overlay-logo {
            max-width: 80px;
            max-height: 60px;
            opacity: 0.9;
            filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3));
        }

        .video-overlay-cta {
            position: absolute;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 11;
            animation: pulse 2s infinite;
        }

        .overlay-cta {
            max-width: 150px;
            max-height: 50px;
            cursor: pointer;
            pointer-events: auto;
            filter: drop-shadow(2px 2px 8px rgba(0,0,0,0.4));
        }

        .video-overlay-text {
            position: absolute;
            bottom: 20px;
            left: 20px;
            right: 20px;
            z-index: 11;
        }

        .overlay-text-content {
            background: rgba(0, 0, 0, 0.7);
            padding: 10px 15px;
            border-radius: 8px;
            backdrop-filter: blur(5px);
        }

        .overlay-text {
            color: white;
            font-size: 16px;
            font-weight: 600;
            text-align: center;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
        }

        @keyframes pulse {
            0% { transform: translateX(-50%) scale(1); }
            50% { transform: translateX(-50%) scale(1.05); }
            100% { transform: translateX(-50%) scale(1); }
        }

        /* Overlay Controls */
        .overlay-controls .card {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            background: #f8fafc;
        }

        .btn-overlay {
            background: linear-gradient(135deg, #8b5cf6, #7c3aed);
            color: white;
            border-color: #8b5cf6;
        }

        .btn-overlay:hover {
            background: linear-gradient(135deg, #7c3aed, #6d28d9);
            color: white;
        }

        .scene-video {
            width: 100%;
            height: 280px;
            object-fit: contain;
            display: block;
        }

        .video-overlay {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.3);
            opacity: 0;
            transition: opacity 0.3s ease;
            backdrop-filter: blur(2px);
        }

        .video-wrapper:hover .video-overlay {
            opacity: 1;
        }

        .play-btn {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.95);
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            color: #1e293b;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        }

        .play-btn:hover {
            background: white;
            transform: scale(1.1);
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
        }

        .video-time-display {
            position: absolute;
            bottom: 16px;
            left: 16px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 0.875rem;
            font-weight: 500;
            backdrop-filter: blur(8px);
        }

        /* Timeline Section */
        .timeline-section {
            background: linear-gradient(135deg, #f8fafc, #f1f5f9);
            border-radius: 16px;
            padding: 1.5rem;
            margin-top: 1rem;
            border: 1px solid #e2e8f0;
        }

        .timeline-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
            font-size: 0.875rem;
            color: #64748b;
        }

        .timeline-info {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-weight: 500;
        }

        .current-time-display {
            background: rgba(59, 130, 246, 0.1);
            color: #3b82f6;
            padding: 4px 8px;
            border-radius: 6px;
            font-weight: 600;
        }

        /* Professional Video Timeline */
        .video-timeline-section {
            margin-top: 20px;
            padding: 20px;
            background: linear-gradient(135deg, #f8fafc, #f1f5f9);
            border-radius: 16px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .timeline-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid #e2e8f0;
        }

        .timeline-info {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            color: #475569;
        }



        .professional-timeline {
            position: relative;
            height: 60px;
            background: #ffffff;
            border-radius: 12px;
            border: 2px solid #e2e8f0;
            margin: 16px 0;
            cursor: pointer;
            overflow: hidden;
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .timeline-track {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(90deg,
                #f1f5f9 0%,
                #e2e8f0 25%,
                #f1f5f9 50%,
                #e2e8f0 75%,
                #f1f5f9 100%);
            background-size: 40px 100%;
        }

        /* Trim Selection */
        .trim-selection {
            position: absolute;
            top: 0;
            height: 100%;
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(29, 78, 216, 0.2));
            border: 2px solid #3b82f6;
            border-radius: 8px;
            cursor: move;
            min-width: 60px;
            transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
            backdrop-filter: blur(1px);
        }

        .trim-selection:hover {
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(29, 78, 216, 0.3));
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .trim-handle {
            position: absolute;
            top: -2px;
            width: 18px;
            height: calc(100% + 4px);
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            cursor: ew-resize;
            transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .trim-handle:hover {
            background: linear-gradient(135deg, #2563eb, #1e40af);
            transform: scaleX(1.3);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.6);
            width: 20px;
        }

        .trim-handle:active {
            background: linear-gradient(135deg, #1d4ed8, #1e3a8a);
            transform: scaleX(1.4);
            box-shadow: 0 6px 16px rgba(59, 130, 246, 0.8);
        }

        .left-handle {
            left: -8px;
        }

        .right-handle {
            right: -8px;
        }

        .handle-grip {
            width: 2px;
            height: 20px;
            background: rgba(255, 255, 255, 0.8);
            border-radius: 1px;
        }

        .selection-info {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
        }

        .duration-badge {
            background: rgba(255, 255, 255, 0.95);
            color: #1e293b;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            border: 1px solid #e2e8f0;
            transition: all 0.2s ease;
        }

        .duration-badge.editable-duration {
            cursor: pointer;
            user-select: none;
            position: relative;
        }

        .duration-badge.editable-duration:hover {
            background: rgba(59, 130, 246, 0.15);
            border-color: #3b82f6;
            transform: scale(1.1);
            box-shadow: 0 4px 8px rgba(59, 130, 246, 0.2);
        }

        .duration-badge.editable-duration:active {
            transform: scale(0.95);
            background: rgba(59, 130, 246, 0.2);
        }

        .duration-badge.editable-duration::after {
            content: '✏️';
            position: absolute;
            top: -8px;
            right: -8px;
            font-size: 10px;
            opacity: 0;
            transition: opacity 0.2s ease;
        }

        .duration-badge.editable-duration:hover::after {
            opacity: 1;
        }

        /* Editable Header Duration */
        .editable-header-duration {
            cursor: pointer;
            padding: 2px 6px;
            border-radius: 4px;
            transition: all 0.2s ease;
            user-select: none;
            position: relative;
        }

        .editable-header-duration:hover {
            background: rgba(59, 130, 246, 0.1);
            transform: scale(1.05);
            box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
        }

        .editable-header-duration:active {
            transform: scale(0.95);
        }

        .editable-header-duration::after {
            content: '✏️';
            position: absolute;
            top: -6px;
            right: -12px;
            font-size: 10px;
            opacity: 0;
            transition: opacity 0.2s ease;
        }

        .editable-header-duration:hover::after {
            opacity: 1;
        }

        .header-duration-input {
            background: #ffffff;
            border: 2px solid #3b82f6;
            border-radius: 4px;
            padding: 2px 6px;
            font-size: 14px;
            font-weight: 600;
            text-align: center;
            width: 60px;
            outline: none;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            color: #3b82f6;
        }

        /* Video Upload Styles */
        .upload-progress {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 16px;
            border: 1px solid #e9ecef;
        }

        .video-preview {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 16px;
            border: 1px solid #e9ecef;
        }

        .video-info {
            font-family: 'Courier New', monospace;
            background: rgba(59, 130, 246, 0.1);
            padding: 4px 8px;
            border-radius: 4px;
            display: inline-block;
        }

        .upload-status {
            font-weight: 600;
            color: #3b82f6;
        }

        .progress {
            height: 8px;
            border-radius: 4px;
            background: #e9ecef;
        }

        .progress-bar {
            background: linear-gradient(90deg, #3b82f6, #1d4ed8);
            border-radius: 4px;
            transition: width 0.3s ease;
        }

        .duration-input {
            background: #ffffff;
            border: 2px solid #3b82f6;
            border-radius: 6px;
            padding: 4px 8px;
            font-size: 12px;
            font-weight: 600;
            text-align: center;
            width: 50px;
            outline: none;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        /* Timeline Playhead */
        .timeline-playhead {
            position: absolute;
            top: -8px;
            width: 3px;
            height: calc(100% + 16px);
            z-index: 20;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .playhead-line {
            width: 3px;
            height: 100%;
            background: linear-gradient(135deg, #ef4444, #dc2626);
            border-radius: 2px;
            box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
        }

        .playhead-handle {
            position: absolute;
            top: -8px;
            left: 50%;
            transform: translateX(-50%);
            width: 16px;
            height: 16px;
            background: linear-gradient(135deg, #ef4444, #dc2626);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 8px;
            box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
            cursor: grab;
        }

        .playhead-handle:hover {
            transform: translateX(-50%) scale(1.2);
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.6);
        }

        .playhead-handle:active {
            cursor: grabbing;
        }

        /* Timeline Controls */
        .timeline-controls {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid #e2e8f0;
        }

        .trim-info {
            font-family: 'Courier New', monospace;
            font-size: 12px;
        }

        .start-time-display, .end-time-display {
            font-weight: 600;
            color: #3b82f6;
        }

        /* Time Markers */
        .time-markers {
            position: absolute;
            bottom: -20px;
            left: 0;
            right: 0;
            height: 20px;
            pointer-events: none;
        }

        .time-marker {
            position: absolute;
            font-size: 10px;
            color: #64748b;
            font-family: 'Courier New', monospace;
        }

        /* Duration Tooltip */
        .duration-tooltip {
            position: absolute;
            bottom: 75px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 600;
            white-space: nowrap;
            pointer-events: none;
            z-index: 20;
            opacity: 0;
            transition: opacity 0.2s ease;
        }

        .duration-tooltip:before {
            content: '';
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            border: 5px solid transparent;
            border-top-color: rgba(0, 0, 0, 0.9);
        }

        .duration-tooltip.show {
            opacity: 1;
        }



        /* Action Buttons */
        .action-btn {
            border-radius: 10px;
            padding: 0.5rem 1rem;
            font-weight: 500;
            transition: all 0.3s ease;
            border: 2px solid transparent;
        }

        .action-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .btn-regenerate {
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: white;
            border-color: #f59e0b;
        }

        .btn-regenerate:hover {
            background: linear-gradient(135deg, #d97706, #b45309);
        }

        /* Regenerate Modal Styles */
        #regenerateModal .modal-content {
            border: none;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        }

        #regenerateModal .nav-pills .nav-link {
            border-radius: 12px;
            font-weight: 500;
            padding: 12px 20px;
            transition: all 0.3s ease;
        }

        #regenerateModal .nav-pills .nav-link.active {
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .keywords-container {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            min-height: 40px;
            padding: 12px;
            border: 2px dashed #e5e7eb;
            border-radius: 8px;
            background: #f9fafb;
        }

        .keyword-tag {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: white;
            border-radius: 20px;
            font-size: 0.875rem;
            font-weight: 500;
            transition: all 0.2s ease;
        }

        .keyword-tag:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
        }

        .keyword-tag .remove-keyword {
            background: none;
            border: none;
            color: white;
            font-size: 1rem;
            cursor: pointer;
            padding: 0;
            width: 16px;
            height: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: background 0.2s ease;
        }

        .keyword-tag .remove-keyword:hover {
            background: rgba(255, 255, 255, 0.2);
        }

        /* Image Upload Styles */
        .upload-area {
            position: relative;
            cursor: pointer;
        }

        .upload-placeholder {
            transition: all 0.3s ease;
            background: #f8f9fa;
            border-color: #dee2e6 !important;
        }

        .upload-placeholder:hover {
            background: #e9ecef;
            border-color: #3b82f6 !important;
        }

        .uploaded-image img {
            border: 2px solid #e5e7eb;
            transition: border-color 0.3s ease;
        }

        .uploaded-image img:hover {
            border-color: #3b82f6;
        }

        /* Generation Type Toggle */
        .btn-check:checked + .btn-outline-primary {
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            border-color: #3b82f6;
            color: white;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        /* Loading Animation */
        .spin {
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }

        /* AI Prompt Display */
        .prompt-display {
            background: linear-gradient(135deg, #f8fafc, #e2e8f0);
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 12px;
            position: relative;
        }

        .prompt-display::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            border-radius: 4px 0 0 4px;
        }

        .prompt-display p {
            margin: 0;
            line-height: 1.5;
            font-style: italic;
        }

        /* Generate Prompt Button */
        .generate-prompt-btn {
            border-radius: 20px;
            font-size: 0.875rem;
            padding: 6px 12px;
            transition: all 0.3s ease;
            border: 1px solid #3b82f6;
            color: #3b82f6;
        }

        .generate-prompt-btn:hover {
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: white;
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
        }

        .generate-prompt-btn.loading {
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: white;
            pointer-events: none;
        }

        .generate-prompt-btn.loading i {
            animation: spin 1s linear infinite;
        }

        /* Placeholder Animation */
        .placeholder-animation {
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            color: transparent;
        }

        @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }

        /* Typewriter Effect */
        .typewriter {
            overflow: hidden;
            white-space: nowrap;
            animation: typing 0.05s steps(1, end);
        }

        /* Mobile Responsiveness */
        @media (max-width: 768px) {
            .generate-prompt-btn {
                font-size: 0.8rem;
                padding: 4px 8px;
            }

            .generate-prompt-btn .me-1 {
                margin-right: 0.25rem !important;
            }
        }

        /* Coming Soon Modal */
        #comingSoonModal .modal-content {
            border: none;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }

        #comingSoonModal .feature-item {
            padding: 12px;
            background: rgba(59, 130, 246, 0.1);
            border-radius: 12px;
            min-width: 80px;
        }

        #comingSoonModal .feature-item i {
            font-size: 1.5rem;
            margin-bottom: 4px;
        }

        #comingSoonModal .modal-header {
            padding: 2rem 2rem 0;
        }

        #comingSoonModal .modal-body {
            padding: 1rem 2rem;
        }

        #comingSoonModal .modal-footer {
            padding: 0 2rem 2rem;
        }

        .btn-upload {
            background: linear-gradient(135deg, #06b6d4, #0891b2);
            color: white;
            border-color: #06b6d4;
        }

        .btn-upload:hover {
            background: linear-gradient(135deg, #0891b2, #0e7490);
        }

        /* Loading States */
        .regenerating-indicator {
            background: linear-gradient(135deg, #fef3c7, #fde68a);
            color: #92400e;
            padding: 1rem;
            border-radius: 12px;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-top: 1rem;
        }

        .loading-spinner {
            width: 20px;
            height: 20px;
            border: 2px solid #f59e0b;
            border-top: 2px solid transparent;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }



        /* Final Approval Section */
        .approval-card {
            background: linear-gradient(135deg, #ecfdf5, #d1fae5);
            border: 2px solid #10b981;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(16, 185, 129, 0.1);
        }

        .btn-confirm {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            border: none;
            padding: 1rem 2rem;
            border-radius: 12px;
            font-size: 1.1rem;
            font-weight: 600;
            transition: all 0.3s ease;
        }

        .btn-confirm:hover {
            background: linear-gradient(135deg, #059669, #047857);
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
        }

        /* Video Placeholder */
        .video-placeholder {
            height: 280px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #f8fafc, #f1f5f9);
            border-radius: 16px;
            border: 2px dashed #cbd5e1;
            color: #64748b;
        }

        .video-placeholder i {
            font-size: 4rem;
            margin-bottom: 1rem;
            opacity: 0.5;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
            .page-title {
                font-size: 2rem;
            }
            
            .scene-video {
                height: 220px;
            }
            
            .frame-strip {
                gap: 2px;
            }
            
            .frame-item {
                width: 35px;
                height: 50px;
            }
            
            .duration-slider {
                height: 36px;
            }
            
            .slider-handle {
                width: 14px;
            }
            
            .play-btn {
                width: 60px;
                height: 60px;
                font-size: 24px;
            }
        }

        /* Loading Animation for Frame Strip */
        .frame-strip.loading::after {
            content: "Generating frames...";
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #64748b;
            font-size: 0.875rem;
            font-weight: 500;
        }

        /* Compact Professional Duration Warning */
        .duration-warning {
            margin-top: 0.75rem;
        }

        .warning-compact {
            background: linear-gradient(135deg, #fff8e1 0%, #fff3c4 100%);
            border: 1px solid #ffb74d;
            border-radius: 8px;
            padding: 12px 14px;
            position: relative;
            overflow: hidden;
        }

        .warning-compact::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 3px;
            height: 100%;
            background: #ff9800;
        }

        .warning-main {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
        }

        .warning-icon-small {
            flex-shrink: 0;
            width: 18px;
            height: 18px;
            background: #ff9800;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .warning-icon-small i {
            color: white;
            font-size: 10px;
        }

        .warning-text {
            flex: 1;
            font-size: 0.8rem;
            line-height: 1.3;
            color: #bf360c;
        }

        .warning-label {
            font-weight: 600;
            color: #e65100;
        }

        .warning-solutions {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.75rem;
            color: #8d4e00;
            padding-left: 26px;
        }

        .solution-item {
            display: flex;
            align-items: center;
            gap: 4px;
            white-space: nowrap;
        }

        .solution-item i {
            font-size: 10px;
            color: #ff9800;
        }

        .solution-divider {
            color: #ffb74d;
            font-weight: bold;
        }

        /* Hover effect */
        .warning-compact:hover {
            background: linear-gradient(135deg, #fff3c4 0%, #ffecb3 100%);
            border-color: #ff9800;
            transition: all 0.2s ease;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
            .warning-compact {
                padding: 10px 12px;
            }

            .warning-text {
                font-size: 0.75rem;
            }

            .warning-solutions {
                font-size: 0.7rem;
                flex-wrap: wrap;
                gap: 6px;
            }

            .solution-divider {
                display: none;
            }
        }
    </style>
@endpush

@section('content')
<div class="scene-page">
    <div class="container py-5">
        <!-- Header -->
        <div class="page-header">
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <h1 class="page-title">Review Your Video Scenes</h1>
                    <p class="page-subtitle">Project: {{ $project->name }} - Review and approve each scene before final generation</p>
                    <div class="d-flex gap-3">
                        <span class="format-badge">
                            <i class="bi bi-aspect-ratio"></i>
                            Format: {{ implode(', ', $project->video_format) }}
                        </span>
                        <span class="format-badge">
                            <i class="bi bi-clock"></i>
                            Total: {{ $scenes->sum('gemini_duration') ? gmdate('i:s', $scenes->sum('gemini_duration')) : 'N/A' }}
                        </span>
                        @if($project->hasVoiceoverTranscript() && $project->voiceover_option === 'upload')
                        <button type="button" class="btn btn-outline-primary btn-sm" onclick="viewTranscript()">
                            <i class="bi bi-file-text"></i>
                            View Transcript ({{ $project->getTranscriptWordsCount() }} words)
                        </button>
                        @endif
                    </div>
                    </div>
                    <a href="{{ route('dashboard') }}" class="btn btn-outline-secondary action-btn">
                        <i class="bi bi-arrow-left me-2"></i>Dashboard
                    </a>
                </div>
            </div>

            <div id="scenes-container">

            <!-- Progress Indicator -->
            <div class="progress-card">
                <div class="card-body p-4">
                    <div class="d-flex justify-content-center align-items-center">
                        <div class="d-flex align-items-center">
                            <div class="progress-step completed">
                                <i class="bi bi-check"></i>
                            </div>
                            <span class="ms-3">Generation Complete</span>
                        </div>
                        <div class="progress-connector"></div>
                        <div class="d-flex align-items-center">
                            <div class="progress-step active">2</div>
                            <span class="ms-3 fw-bold">Review Scenes</span>
                        </div>
                        <div class="progress-connector"></div>
                        <div class="d-flex align-items-center">
                            <div class="progress-step">3</div>
                            <span class="ms-3">Final Video</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Scenes Grid -->
            <div class="row">
                @forelse($scenes as $scene)
                <!-- Scene {{ $scene->scene_number }} -->
                <div class="col-lg-6 mb-4">
                    <div class="scene-card">
                        <div class="scene-card-header">
                            <div class="d-flex justify-content-between align-items-center">
                                <h3 class="scene-number mb-0">Scene {{ $scene->scene_number }}</h3>
                            </div>
                        </div>
                        <div class="card-body p-4">
                            <!-- Script Text -->
                            <div class="mb-4">
                                <h6 class="fw-bold mb-2">Script:</h6>
                                <p class="text-muted">{{ $scene->script_text }}</p>
                            </div>



                            <!-- Video Preview -->
                            <div class="mb-4">
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <h6 class="fw-bold mb-0">Video Preview</h6>
                                    @if($scene->gemini_duration)
                                        <span class="detail-badge">
                                            <i class="bi bi-clock"></i>
                                            <span>{{ number_format($scene->gemini_duration, 1) }}s</span>
                                        </span>
                                    @endif
                                </div>

                                @if($scene->video_url || $scene->video_path)
                                    <div class="video-player-container" data-scene-id="{{ $scene->id }}" data-project-id="{{ $project->id }}" data-duration="{{ $scene->gemini_duration ?? 0 }}">
                                        <div class="video-wrapper">
                                            <video id="video-{{ $scene->id }}" class="scene-video" preload="metadata" muted>
                                                @if($scene->video_url)
                                                    <source src="{{ $scene->video_url }}" type="video/mp4">
                                                @elseif($scene->video_path)
                                                    <source src="{{ Storage::url($scene->video_path) }}" type="video/mp4">
                                                @endif
                                                Your browser does not support the video tag.
                                            </video>

                                            <!-- Video Overlays -->
                                            <div class="video-overlays">
                                                <!-- Logo Overlay -->
                                                <div class="video-overlay-logo" id="logo-overlay-{{ $scene->id }}" style="display: none;">
                                                    <img src="/images/logo-transparent.png" alt="Logo" class="overlay-logo">
                                                </div>

                                                <!-- Call to Action Overlay -->
                                                <div class="video-overlay-cta" id="cta-overlay-{{ $scene->id }}" style="display: none;">
                                                    <img src="/images/cta-button.png" alt="Call to Action" class="overlay-cta">
                                                </div>

                                                <!-- Custom Text Overlay -->
                                                <div class="video-overlay-text" id="text-overlay-{{ $scene->id }}" style="display: none;">
                                                    <div class="overlay-text-content">
                                                        <span class="overlay-text">Your Text Here</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="video-overlay">
                                                <button type="button" class="play-btn" data-video-id="video-{{ $scene->id }}">
                                                    <i class="bi bi-play-fill"></i>
                                                </button>
                                            </div>
                                            <div class="video-time-display">
                                                <span class="current-time">0:00</span> / <span class="total-time">0:00</span>
                                            </div>
                                        </div>

                                        <!-- Professional Video Timeline -->
                                        <div class="video-timeline-section">
                                            <div class="timeline-header">
                                                <div class="timeline-info">
                                                    <i class="bi bi-scissors text-primary"></i>
                                                    <span class="fw-medium">Trim Duration:
                                                        <span class="selected-duration text-primary editable-header-duration"
                                                              id="header-duration-{{ $scene->id }}"
                                                              title="Double-click to edit duration">{{ number_format($scene->gemini_duration ?? 0, 1) }}s</span>
                                                    </span>
                                                </div>
                                            </div>

                                            <!-- Professional Timeline Slider -->
                                            <div class="professional-timeline" id="timeline-{{ $scene->id }}">
                                                <div class="timeline-track"></div>

                                                <!-- Trim Selection -->
                                                @php
                                                    // Calculate initial width based on scene duration vs estimated video duration
                                                    // Use gemini_duration (script timing) instead of duration_seconds (video file duration)
                                                    $sceneDuration = $scene->gemini_duration ?? $scene->duration_seconds ?? 5;
                                                    $estimatedVideoDuration = 30; // Default estimate, will be updated by JS
                                                    $initialWidth = min(100, ($sceneDuration / $estimatedVideoDuration) * 100);
                                                    $initialWidth = max(20, $initialWidth); // Minimum 20% width

                                                    // Debug logging
                                                    logger()->info('🔍 Scene duration debug', [
                                                        'scene_id' => $scene->id,
                                                        'duration_seconds' => $scene->duration_seconds,
                                                        'gemini_duration' => $scene->gemini_duration,
                                                        'calculated_duration' => $sceneDuration,
                                                        'initial_width' => $initialWidth
                                                    ]);
                                                @endphp
                                                <div class="trim-selection" id="trim-selection-{{ $scene->id }}"
                                                     style="left: 0%; width: {{ $initialWidth }}%;"
                                                     data-scene-duration="{{ $sceneDuration }}">
                                                    <div class="trim-handle left-handle" data-handle="start">
                                                        <div class="handle-grip"></div>
                                                    </div>
                                                    <div class="trim-handle right-handle" data-handle="end">
                                                        <div class="handle-grip"></div>
                                                    </div>
                                                    <div class="selection-info">
                                                        <span class="duration-badge">{{ number_format($sceneDuration, 1) }}s</span>
                                                    </div>
                                                </div>

                                                <!-- Playhead -->
                                                <div class="timeline-playhead" id="playhead-{{ $scene->id }}">
                                                    <div class="playhead-line"></div>
                                                    <div class="playhead-handle">
                                                        <i class="bi bi-caret-down-fill"></i>
                                                    </div>
                                                </div>

                                                <!-- Time Markers -->
                                                <div class="time-markers" id="time-markers-{{ $scene->id }}">
                                                    <!-- Time markers will be generated here -->
                                                </div>
                                            </div>

                                            <!-- Timeline Controls -->
                                            <div class="timeline-controls">
                                                <button type="button" class="btn btn-sm btn-outline-secondary" onclick="resetTrim({{ $scene->id }})">
                                                    <i class="bi bi-arrow-clockwise me-1"></i>Reset
                                                </button>
                                                <button type="button" class="btn btn-sm btn-outline-info" onclick="refreshTimeDisplay({{ $scene->id }})">
                                                    <i class="bi bi-arrow-clockwise me-1"></i>Refresh Time
                                                </button>
                                                <button type="button" class="btn btn-sm btn-outline-warning" onclick="fixTimeDisplayDirectly({{ $scene->id }})">
                                                    <i class="bi bi-wrench me-1"></i>Fix Time
                                                </button>
                                                <div class="trim-info">
                                                    <small class="text-muted">
                                                        Start: <span class="start-time-display">0:00.0</span> |
                                                        End: <span class="end-time-display">0:00.0</span>
                                                    </small>
                                                </div>
                                            </div>
                                        </div>
                                @else
                                    <div class="video-placeholder d-flex align-items-center justify-content-center" style="height: 280px; background: #f8f9fa; border-radius: 16px;">
                                        <div class="text-center">
                                            <i class="bi bi-camera-video text-muted" style="font-size: 3rem;"></i>
                                            <p class="text-muted mt-2">Video preview not available</p>
                                        </div>
                                    </div>
                                @endif
                                </div>
                            </div>



                            <!-- Action Buttons -->
                            <div class="d-flex gap-3">
                                <button type="button" class="btn action-btn btn-regenerate"
                                        onclick="regenerateScene({{ $scene->id }})"
                                        data-scene-keywords="{{ $scene->keywords }}"
                                        data-scene-prompt="{{ $scene->prompt ?? '' }}">
                                    <i class="bi bi-arrow-clockwise me-2"></i>Regenerate
                                </button>
                                <button type="button" class="btn action-btn btn-upload" data-bs-toggle="modal" data-bs-target="#uploadModal{{ $scene->id }}">
                                    <i class="bi bi-upload me-2"></i>Upload Custom
                                </button>
                                <button type="button" class="btn action-btn btn-overlay" onclick="toggleOverlayControls({{ $scene->id }})">
                                    <i class="bi bi-layers me-2"></i>Overlays
                                </button>
                            </div>

                            <!-- Overlay Controls (Initially Hidden) -->
                            <div class="overlay-controls mt-3" id="overlay-controls-{{ $scene->id }}" style="display: none;">
                                <div class="card">
                                    <div class="card-body p-3">
                                        <h6 class="fw-bold mb-3"><i class="bi bi-layers me-2"></i>Video Overlays</h6>

                                        <div class="row g-3">
                                            <!-- Logo Overlay -->
                                            <div class="col-md-4">
                                                <div class="form-check">
                                                    <input class="form-check-input" type="checkbox" id="logo-toggle-{{ $scene->id }}"
                                                           onchange="toggleOverlay({{ $scene->id }}, 'logo', this.checked)">
                                                    <label class="form-check-label fw-semibold" for="logo-toggle-{{ $scene->id }}">
                                                        <i class="bi bi-image me-1"></i>Logo
                                                    </label>
                                                </div>
                                                <small class="text-muted">Top-right corner</small>
                                            </div>

                                            <!-- CTA Overlay -->
                                            <div class="col-md-4">
                                                <div class="form-check">
                                                    <input class="form-check-input" type="checkbox" id="cta-toggle-{{ $scene->id }}"
                                                           onchange="toggleOverlay({{ $scene->id }}, 'cta', this.checked)">
                                                    <label class="form-check-label fw-semibold" for="cta-toggle-{{ $scene->id }}">
                                                        <i class="bi bi-cursor me-1"></i>Call to Action
                                                    </label>
                                                </div>
                                                <small class="text-muted">Bottom center</small>
                                            </div>

                                            <!-- Text Overlay -->
                                            <div class="col-md-4">
                                                <div class="form-check">
                                                    <input class="form-check-input" type="checkbox" id="text-toggle-{{ $scene->id }}"
                                                           onchange="toggleOverlay({{ $scene->id }}, 'text', this.checked)">
                                                    <label class="form-check-label fw-semibold" for="text-toggle-{{ $scene->id }}">
                                                        <i class="bi bi-type me-1"></i>Text
                                                    </label>
                                                </div>
                                                <small class="text-muted">Bottom overlay</small>
                                            </div>
                                        </div>

                                        <!-- Text Input for Custom Text -->
                                        <div class="mt-3" id="text-input-{{ $scene->id }}" style="display: none;">
                                            <label class="form-label fw-semibold">Custom Text:</label>
                                            <input type="text" class="form-control" placeholder="Enter your text..."
                                                   onchange="updateOverlayText({{ $scene->id }}, this.value)">
                                        </div>
                                    </div>
                                </div>
                            </div>

                            @if($scene->status == 'regenerating')
                                <div class="regenerating-indicator">
                                    <div class="loading-spinner"></div>
                                    <span>Regenerating scene...</span>
                                </div>
                            @endif
                        </div>
                    </div>
                </div>
                @empty
                <div class="col-12">
                    <div class="text-center py-5">
                        <i class="bi bi-camera-video text-muted" style="font-size: 4rem;"></i>
                        <h4 class="text-muted mt-3">No scenes available</h4>
                        <p class="text-muted">Please generate scenes first.</p>
                    </div>
                </div>
                @endforelse
            </div>



            <!-- Final Approval Section -->
            <div class="approval-card">
                <div class="card-body p-4">
                    <div class="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center gap-4">
                        <div>
                            <h5 class="fw-bold mb-2">Ready to proceed?</h5>
                            <p class="text-muted mb-0">
                                Review your scenes and their trim settings, then click "Confirm All Scenes" to proceed to subtitle selection
                            </p>
                        </div>
                        <div class="d-flex gap-2 flex-wrap">
                            <button type="button" class="btn btn-confirm" onclick="confirmAllScenes()" id="confirm-btn">
                                <i class="bi bi-check-circle me-2"></i>Confirm All Scenes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            </div>
        </div>
    </div>

    <!-- Upload Modals -->
    @foreach($scenes as $scene)
    <div class="modal fade" id="uploadModal{{ $scene->id }}" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Upload Custom Media - Scene {{ $scene->scene_number }}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <form id="uploadForm{{ $scene->id }}" enctype="multipart/form-data">
                        @csrf
                        <div class="mb-3">
                            <label class="form-label fw-bold">Upload Custom Video</label>
                            <input type="file"
                                   name="custom_video"
                                   id="videoInput{{ $scene->id }}"
                                   class="form-control"
                                   accept="video/mp4,video/webm,video/ogg,video/avi,video/mov"
                                   required>
                            <div class="form-text text-muted">
                                <i class="bi bi-info-circle me-1"></i>
                                <strong>Requirements:</strong> MP4, WebM, MOV formats • Max size: 150MB • Max duration: 1 minute
                            </div>
                        </div>

                        <!-- Upload Progress -->
                        <div id="uploadProgress{{ $scene->id }}" class="mb-3" style="display: none;">
                            <div class="d-flex align-items-center mb-2">
                                <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                                <span class="upload-status">Uploading...</span>
                            </div>
                            <div class="progress">
                                <div class="progress-bar" role="progressbar" style="width: 0%"></div>
                            </div>
                        </div>

                        <!-- Video Preview -->
                        <div id="videoPreview{{ $scene->id }}" class="mb-3" style="display: none;">
                            <label class="form-label">Preview:</label>
                            <video class="w-100" style="max-height: 200px; border-radius: 8px;" controls>
                                Your browser does not support the video tag.
                            </video>
                            <div class="mt-2">
                                <small class="text-muted">
                                    <span class="video-info"></span>
                                </small>
                            </div>
                        </div>

                        <!-- Validation Messages -->
                        <div id="validationMessage{{ $scene->id }}" class="alert" style="display: none;"></div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button"
                            id="uploadBtn{{ $scene->id }}"
                            class="btn btn-primary"
                            onclick="uploadCustomVideo({{ $scene->id }})"
                            disabled>
                        <i class="bi bi-upload me-2"></i>Upload & Replace
                    </button>
                </div>
            </div>
        </div>
    </div>
    @endforeach

    <!-- Regenerate Scene Modal -->
    <div class="modal fade" id="regenerateModal" tabindex="-1" aria-labelledby="regenerateModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header border-0 pb-0">
                    <h5 class="modal-title fw-bold" id="regenerateModalLabel">
                        <i class="bi bi-arrow-clockwise me-2 text-warning"></i>Regenerate Scene
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <!-- Tab Navigation -->
                    <ul class="nav nav-pills nav-fill mb-4" id="regenerateTab" role="tablist">
                        <li class="nav-item" role="presentation">
                            <button class="nav-link active" id="pexels-tab" data-bs-toggle="pill" data-bs-target="#pexels-content" type="button" role="tab">
                                <i class="bi bi-images me-2"></i>Generate from Pexels
                            </button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="ai-tab" data-bs-toggle="pill" data-bs-target="#ai-content" type="button" role="tab">
                                <i class="bi bi-robot me-2"></i>Regenerate with AI
                            </button>
                        </li>
                    </ul>

                    <!-- Tab Content -->
                    <div class="tab-content" id="regenerateTabContent">
                        <!-- Pexels Tab -->
                        <div class="tab-pane fade show active" id="pexels-content" role="tabpanel">
                            <div class="mb-3">
                                <label class="form-label fw-semibold">Keywords</label>
                                <div class="keywords-container" id="keywordsContainer">
                                    <!-- Keywords will be populated here -->
                                </div>
                                <div class="mt-2">
                                    <input type="text" class="form-control" id="newKeywordInput" placeholder="Add new keyword...">
                                    <button type="button" class="btn btn-sm btn-outline-primary mt-2" onclick="addKeyword()">
                                        <i class="bi bi-plus me-1"></i>Add Keyword
                                    </button>
                                </div>
                            </div>
                            <button type="button" class="btn btn-warning w-100" onclick="regenerateFromPexels()">
                                <i class="bi bi-images me-2"></i>Regenerate Video from Pexels
                            </button>
                        </div>

                        <!-- AI Tab -->
                        <div class="tab-pane fade" id="ai-content" role="tabpanel">
                            <!-- AI Generation Type Selection -->
                            <div class="mb-4">
                                <label class="form-label fw-semibold">Generation Type</label>
                                <div class="btn-group w-100" role="group">
                                    <input type="radio" class="btn-check" name="aiGenerationType" id="textToVideo" value="text-to-video" checked>
                                    <label class="btn btn-outline-primary" for="textToVideo">
                                        <i class="bi bi-type me-2"></i>Text to Video
                                    </label>
                                    
                                    <input type="radio" class="btn-check" name="aiGenerationType" id="imageToVideo" value="image-to-video">
                                    <label class="btn btn-outline-primary" for="imageToVideo">
                                        <i class="bi bi-image me-2"></i>Image to Video
                                    </label>
                                </div>
                            </div>

                            <!-- Text to Video Section -->
                            <div id="textToVideoSection">
                            <div class="mb-3">
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <label for="aiPrompt" class="form-label fw-semibold mb-0">AI Prompt</label>
                                    <button type="button" class="btn btn-sm btn-outline-primary generate-prompt-btn" onclick="generateSmartPrompt()">
                                        <i class="bi bi-magic me-1"></i>Generate Prompt
                                    </button>
                                </div>
                                <textarea class="form-control" id="aiPrompt" rows="4" placeholder="Click 'Generate Prompt' for AI suggestions or describe the video you want to generate..."></textarea>
                                <div class="form-text">Describe the style, mood, and content you want for the regenerated video.</div>
                                </div>
                            </div>

                            <!-- Image to Video Section -->
                            <div id="imageToVideoSection" style="display: none;">
                                <div class="mb-3">
                                    <label for="imageUpload" class="form-label fw-semibold">First Frame Image</label>
                                    <div class="upload-area" id="imageUploadArea">
                                        <input type="file" class="form-control d-none" id="imageUpload" accept="image/*" onchange="handleImageUpload(event)">
                                        <div class="upload-placeholder text-center p-4 border-2 border-dashed rounded">
                                            <i class="bi bi-cloud-upload fs-1 text-muted mb-3"></i>
                                            <p class="mb-2 fw-semibold">Click to upload image</p>
                                            <p class="text-muted small mb-0">Supports JPEG, JPG, PNG, BMP, WEBP (Max 10MB)</p>
                                        </div>
                                        <div class="uploaded-image d-none" id="uploadedImagePreview">
                                            <img id="imagePreview" class="img-fluid rounded mb-2" style="max-height: 200px;">
                                            <div class="d-flex justify-content-between align-items-center">
                                                <small class="text-muted" id="imageInfo"></small>
                                                <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeUploadedImage()">
                                                    <i class="bi bi-trash me-1"></i>Remove
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="mb-3">
                                    <label for="imagePrompt" class="form-label fw-semibold">Video Prompt</label>
                                    <textarea class="form-control" id="imagePrompt" rows="3" placeholder="Describe the motion and action you want in the video..."></textarea>
                                    <div class="form-text">Describe how the image should animate or what motion should occur.</div>
                                </div>
                            </div>

                            <!-- AI Model Selection -->
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label for="aiModel" class="form-label fw-semibold">AI Model</label>
                                    <select class="form-select" id="aiModel" onchange="updateResolutionOptions()">
                                        <option value="wan2.2-t2v-plus">WAN 2.2 T2V Plus (Best Quality)</option>
                                        <option value="wan2.1-t2v-turbo">WAN 2.1 T2V Turbo (Fast)</option>
                                        <option value="wan2.1-t2v-plus">WAN 2.1 T2V Plus (Balanced)</option>
                                        <option value="wan2.2-i2v-flash">WAN 2.2 I2V Flash (Image to Video)</option>
                                        <option value="wan2.2-i2v-plus">WAN 2.2 I2V Plus (Image to Video)</option>
                                        <option value="wan2.1-i2v-turbo">WAN 2.1 I2V Turbo (Image to Video)</option>
                                        <option value="wan2.1-i2v-plus">WAN 2.1 I2V Plus (Image to Video)</option>
                                    </select>
                                    <div class="form-text" id="modelPricing"></div>
                                </div>
                                <div class="col-md-6">
                                    <label for="aiResolution" class="form-label fw-semibold">Resolution</label>
                                    <select class="form-select" id="aiResolution">
                                        <option value="1920*1080">1920×1080 (16:9)</option>
                                        <option value="1080*1920">1080×1920 (9:16)</option>
                                        <option value="1440*1440">1440×1440 (1:1)</option>
                                        <option value="1632*1248">1632×1248 (4:3)</option>
                                        <option value="1248*1632">1248×1632 (3:4)</option>
                                    </select>
                                </div>
                            </div>

                            <button type="button" class="btn btn-primary w-100" onclick="regenerateWithAI()">
                                <i class="bi bi-robot me-2"></i>Regenerate with AI
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // Enhanced WhatsApp-Style Video Player Class
        class ProfessionalVideoTimeline {
            constructor(sceneId) {
                console.log(`🎬 Initializing Professional Timeline for scene ${sceneId}`);
                this.sceneId = sceneId;
                this.video = document.getElementById(`video-${sceneId}`);
                this.timeline = document.getElementById(`timeline-${sceneId}`);
                this.trimSelection = document.getElementById(`trim-selection-${sceneId}`);
                this.playhead = document.getElementById(`playhead-${sceneId}`);
                this.timeMarkers = document.getElementById(`time-markers-${sceneId}`);

                this.isDragging = false;
                this.dragType = null; // 'trim', 'start-handle', 'end-handle', 'playhead'
                this.startX = 0;
                this.startLeft = 0;
                this.startWidth = 0;

                // Trim range (0-100%)
                this.trimStart = 0;
                this.trimEnd = 100;
                this.currentTime = 0;

                console.log('✅ Timeline elements found:', {
                    video: !!this.video,
                    timeline: !!this.timeline,
                    trimSelection: !!this.trimSelection,
                    playhead: !!this.playhead
                });

                this.init();
            }

            init() {
                if (!this.video || !this.timeline) {
                    console.error('❌ Required elements not found for scene', this.sceneId);
                    return;
                }

                this.setupEventListeners();

                // Initialize when video is ready
                if (this.video.readyState >= 2) {
                    console.log('✅ Video already loaded, initializing timeline');
                    this.initializeTimeline();
                } else {
                    console.log('⏳ Waiting for video to load...');
                    this.video.addEventListener('loadedmetadata', () => {
                        console.log('✅ Video metadata loaded, initializing timeline');
                        this.initializeTimeline();
                    });

                    // Force load if needed
                    if (this.video.readyState === 0) {
                        this.video.load();
                    }
                }
            }

            initializeTimeline() {
                // Set initial trim based on scene duration
                this.setInitialTrimFromSceneDuration();
                this.generateTimeMarkers();
                this.updateTimeDisplays();
                this.updatePlayheadPosition();

                // Force update duration displays after initialization
                const sceneDuration = parseFloat(this.trimSelection.dataset.sceneDuration) || 5;
                setTimeout(() => {
                    this.forceUpdateDurationDisplay(sceneDuration);

                    // Fallback warning check after video should be loaded
                    console.log(`🔄 FALLBACK WARNING CHECK for scene ${this.sceneId}:`);
                    console.log(`   Video duration: ${this.video.duration}s`);
                    console.log(`   Scene duration: ${sceneDuration}s`);
                    console.log(`   Video loaded: ${this.video.duration ? 'YES' : 'NO'}`);

                    if (this.video.duration && sceneDuration > this.video.duration) {
                        console.log(`🚨 FALLBACK: Duration mismatch detected! Scene ${sceneDuration}s > Video ${this.video.duration}s`);
                        this.showDurationWarning(sceneDuration, this.video.duration);
                    } else if (!this.video.duration) {
                        console.warn(`⚠️ FALLBACK: Video duration not available yet for scene ${this.sceneId}`);
                    } else {
                        console.log(`✅ FALLBACK: No warning needed - Scene ${sceneDuration}s fits in video ${this.video.duration}s`);
                    }
                }, 1000); // Even longer delay to ensure video metadata is loaded

                // Debug: Check if duration badge exists
                const durationBadge = document.getElementById(`duration-badge-${this.sceneId}`);
                console.log(`🔍 Duration badge check for scene ${this.sceneId}:`, durationBadge);

                console.log('🎯 Timeline initialized successfully');
            }

            setInitialTrimFromSceneDuration() {
                const sceneDurationAttr = this.trimSelection.dataset.sceneDuration;
                const sceneDuration = parseFloat(sceneDurationAttr) || 5;
                const videoDuration = this.video.duration || 30;

                console.log(`🔍 Scene duration debug for scene ${this.sceneId}:`, {
                    sceneDurationAttr: sceneDurationAttr,
                    sceneDurationParsed: sceneDuration,
                    videoDuration: videoDuration,
                    trimSelectionElement: this.trimSelection,
                    durationRatio: (sceneDuration / videoDuration * 100).toFixed(1) + '%'
                });

                // Calculate what percentage of the video the scene duration represents
                let widthPercent = (sceneDuration / videoDuration) * 100;
                let finalWidth = widthPercent;

                // If scene duration exceeds video duration, use full width and show warning
                if (sceneDuration > videoDuration) {
                    finalWidth = 100;
                    console.log(`🚨 DURATION MISMATCH DETECTED for scene ${this.sceneId}:`);
                    console.log(`   Scene needs: ${sceneDuration}s`);
                    console.log(`   Video has: ${videoDuration}s`);
                    console.log(`   Calling showDurationWarning...`);
                    this.showDurationWarning(sceneDuration, videoDuration);
                    console.warn(`⚠️ Scene ${this.sceneId}: Scene duration (${sceneDuration}s) exceeds video duration (${videoDuration}s)`);
                } else {
                    // For very small scenes, ensure minimum visual width for usability
                    // but keep the actual calculation accurate for duration display
                    const minVisualWidth = 3; // 3% minimum for visibility and interaction
                    const visualWidth = Math.max(minVisualWidth, widthPercent);
                    finalWidth = Math.min(100, visualWidth);

                    // Store the actual percentage for accurate duration calculations
                    this.actualScenePercent = widthPercent;

                    console.log(`📏 Scene ${this.sceneId}: Actual ${widthPercent.toFixed(2)}%, Visual ${finalWidth.toFixed(2)}%`);
                }

                this.trimStart = 0;
                this.trimEnd = finalWidth;

                this.updateTrimSelection();
                this.updateTimeDisplays(); // Force update to show correct duration

                console.log(`📏 Set initial trim: ${sceneDuration}s = ${finalWidth.toFixed(1)}% of ${videoDuration.toFixed(1)}s video`);

                // Update the duration display to match the scene duration exactly
                this.forceUpdateDurationDisplay(sceneDuration);
                
                // Force update time displays immediately
                this.updateTimeDisplays();
            }

            setupEventListeners() {
                // Video events
                this.video.addEventListener('timeupdate', () => this.onTimeUpdate());
                this.video.addEventListener('ended', () => this.onVideoEnded());
                this.video.addEventListener('loadedmetadata', () => {
                    console.log(`📺 Video metadata loaded for scene ${this.sceneId}:`);
                    console.log(`   Video duration: ${this.video.duration}s`);
                    console.log(`   Video src: ${this.video.src}`);

                    // Get scene duration for comparison
                    const sceneDuration = parseFloat(this.trimSelection.dataset.sceneDuration) || 5;
                    console.log(`   Scene duration: ${sceneDuration}s`);

                    // Re-initialize trim based on scene duration now that we have actual video duration
                    this.setInitialTrimFromSceneDuration();
                    this.updateTimeDisplays();

                    // CRITICAL: Check for duration warnings with actual video duration
                    console.log(`🔍 METADATA WARNING CHECK: Scene ${sceneDuration}s vs Video ${this.video.duration}s`);
                    if (sceneDuration > this.video.duration) {
                        console.log(`🚨 METADATA: Duration mismatch detected! Calling showDurationWarning...`);
                        this.showDurationWarning(sceneDuration, this.video.duration);
                        console.warn(`⚠️ METADATA WARNING TRIGGERED: Scene ${this.sceneId} needs ${sceneDuration}s but video is only ${this.video.duration}s`);
                    } else {
                        console.log(`✅ METADATA: No warning needed - Scene ${sceneDuration}s fits in video ${this.video.duration}s`);
                        // Remove any existing warnings
                        const existingWarning = document.querySelector(`[data-scene-id="${this.sceneId}"] .duration-warning`);
                        if (existingWarning) {
                            existingWarning.remove();
                            console.log(`🗑️ Removed existing warning for scene ${this.sceneId}`);
                        }
                    }
                });
                this.video.addEventListener('loadeddata', () => this.updateTimeDisplays());
                this.video.addEventListener('canplay', () => this.updateTimeDisplays());

                // Play button
                const playBtn = document.querySelector(`[data-video-id="video-${this.sceneId}"]`);
                if (playBtn) {
                    playBtn.addEventListener('click', () => this.togglePlay());
                }

                // Timeline interactions
                this.timeline.addEventListener('click', (e) => this.onTimelineClick(e));

                // Trim handles
                const leftHandle = this.trimSelection.querySelector('.left-handle');
                const rightHandle = this.trimSelection.querySelector('.right-handle');

                if (leftHandle) leftHandle.addEventListener('mousedown', (e) => this.startDrag(e, 'start-handle'));
                if (rightHandle) rightHandle.addEventListener('mousedown', (e) => this.startDrag(e, 'end-handle'));
                this.trimSelection.addEventListener('mousedown', (e) => this.startDrag(e, 'trim'));

                // Playhead dragging
                this.playhead.addEventListener('mousedown', (e) => this.startDrag(e, 'playhead'));

                // Global mouse events
                document.addEventListener('mousemove', (e) => this.onMouseMove(e));
                document.addEventListener('mouseup', () => this.endDrag());

                // Editable header duration
                const headerDuration = document.getElementById(`header-duration-${this.sceneId}`);
                if (headerDuration) {
                    console.log(`✅ Setting up editable header duration for scene ${this.sceneId}`);
                    headerDuration.addEventListener('dblclick', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🖱️ Double-click detected on header duration');
                        this.editHeaderDuration();
                    });
                } else {
                    console.warn(`❌ Header duration not found for scene ${this.sceneId}`);
                }
            }

            // Timeline interaction methods
            onTimelineClick(e) {
                if (this.isDragging) return;

                const rect = this.timeline.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const percentage = (clickX / rect.width) * 100;

                // Seek video to clicked position
                const videoDuration = this.video.duration || 0;
                const targetTime = (percentage / 100) * videoDuration;

                this.video.currentTime = targetTime;
                this.updatePlayheadPosition();

                console.log(`🎯 Seeking to ${targetTime.toFixed(2)}s (${percentage.toFixed(1)}%)`);
            }

            startDrag(e, type) {
                this.isDragging = true;
                this.dragType = type;
                this.startX = e.clientX;

                const rect = this.timeline.getBoundingClientRect();

                if (type === 'trim') {
                    this.startLeft = this.trimStart;
                    this.startWidth = this.trimEnd - this.trimStart;
                } else if (type === 'playhead') {
                    // Store current playhead position
                    this.startLeft = (this.video.currentTime / this.video.duration) * 100;
                }

                // Add visual feedback during drag
                this.trimSelection.style.opacity = '0.8';
                document.body.style.cursor = type === 'playhead' ? 'grabbing' : 'ew-resize';

                e.preventDefault();
                e.stopPropagation();
            }

            onMouseMove(e) {
                if (!this.isDragging) return;

                const rect = this.timeline.getBoundingClientRect();
                const deltaX = e.clientX - this.startX;
                const deltaPercent = (deltaX / rect.width) * 100;

                switch (this.dragType) {
                    case 'trim':
                        // Move entire trim selection with precise control
                        let adjustedDeltaTrim = deltaPercent * 0.8; // 20% less sensitive for smoother movement
                        let newLeft = Math.max(0, Math.min(100 - this.startWidth, this.startLeft + adjustedDeltaTrim));

                        // Only update if change is meaningful
                        if (Math.abs(newLeft - this.trimStart) > 0.1) {
                            this.trimStart = Math.round(newLeft * 20) / 20; // Round to 0.05 precision
                            this.trimEnd = this.trimStart + this.startWidth;
                            this.updateTrimSelection();
                        }
                        break;

                    case 'start-handle':
                        // Ultra-precise resize from left with fine control
                        let minWidth = 3; // Minimum 3% width for maximum flexibility
                        let maxStart = this.trimEnd - minWidth;

                        // Much less sensitive for precise control
                        let adjustedDelta = deltaPercent * 0.4; // 60% less sensitive
                        let newStart = Math.max(0, Math.min(maxStart, this.trimStart + adjustedDelta));

                        // Ultra-precise updates with very small threshold
                        if (Math.abs(newStart - this.trimStart) > 0.05) {
                            this.trimStart = Math.round(newStart * 50) / 50; // Round to 0.02 precision
                            this.updateTrimSelection();
                            this.constrainVideoToTrim();
                        }
                        break;

                    case 'end-handle':
                        // Ultra-precise resize from right with fine control
                        let minWidthEnd = 3; // Minimum 3% width for maximum flexibility
                        let minEnd = this.trimStart + minWidthEnd;

                        // Much less sensitive for precise control
                        let adjustedDeltaEnd = deltaPercent * 0.4; // 60% less sensitive
                        let newEnd = Math.max(minEnd, Math.min(100, this.trimEnd + adjustedDeltaEnd));

                        // Ultra-precise updates with very small threshold
                        if (Math.abs(newEnd - this.trimEnd) > 0.05) {
                            this.trimEnd = Math.round(newEnd * 50) / 50; // Round to 0.02 precision
                            this.updateTrimSelection();
                            this.constrainVideoToTrim();
                        }
                        break;

                    case 'playhead':
                        // Move playhead
                        let newPosition = Math.max(0, Math.min(100, this.startLeft + deltaPercent));
                        let targetTime = (newPosition / 100) * this.video.duration;
                        this.video.currentTime = targetTime;
                        this.updatePlayheadPosition();
                        break;
                }

                this.updateTimeDisplays();
            }

            endDrag() {
                if (this.isDragging) {
                    // Restore visual feedback
                    this.trimSelection.style.opacity = '1';
                    document.body.style.cursor = '';

                    // Log final duration for user feedback
                    if (this.video.duration) {
                        const finalDuration = ((this.trimEnd - this.trimStart) / 100) * this.video.duration;
                        console.log(`🎯 Final trim duration: ${finalDuration.toFixed(1)}s`);
                    }
                }

                this.isDragging = false;
                this.dragType = null;
            }

            // Editable header duration functionality
            editHeaderDuration() {
                console.log('🎬 Starting header duration edit');
                const headerDuration = document.getElementById(`header-duration-${this.sceneId}`);
                if (!headerDuration) {
                    console.error('❌ Header duration not found');
                    return;
                }
                if (!this.video.duration) {
                    console.error('❌ Video duration not available');
                    return;
                }

                const currentDuration = ((this.trimEnd - this.trimStart) / 100) * this.video.duration;
                console.log(`📏 Current duration: ${currentDuration.toFixed(1)}s`);

                // Create input element
                const input = document.createElement('input');
                input.type = 'number';
                input.className = 'header-duration-input';
                input.value = currentDuration.toFixed(1);
                input.min = '0.1';
                input.max = this.video.duration.toFixed(1);
                input.step = '0.1';
                input.placeholder = 'Duration';

                // Replace header duration with input
                headerDuration.style.display = 'none';
                headerDuration.parentNode.insertBefore(input, headerDuration.nextSibling);

                // Focus and select after a small delay to ensure it's rendered
                setTimeout(() => {
                    input.focus();
                    input.select();
                }, 10);

                const finishEdit = () => {
                    const newDuration = parseFloat(input.value);
                    console.log(`⌨️ User entered: ${input.value} → ${newDuration}`);

                    if (input.parentNode) {
                        input.remove();
                    }
                    headerDuration.style.display = 'inline';

                    if (newDuration && newDuration > 0 && newDuration <= this.video.duration) {
                        console.log(`✅ Setting duration to ${newDuration}s`);
                        this.setDurationFromInput(newDuration);
                    } else {
                        console.warn(`❌ Invalid duration: ${input.value} (must be 0.1 - ${this.video.duration.toFixed(1)})`);
                        // Show brief error feedback
                        headerDuration.style.background = 'rgba(239, 68, 68, 0.1)';
                        setTimeout(() => {
                            headerDuration.style.background = '';
                        }, 1000);
                    }
                };

                // Handle input events
                input.addEventListener('blur', finishEdit);
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        finishEdit();
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        if (input.parentNode) {
                            input.remove();
                        }
                        headerDuration.style.display = 'inline';
                        console.log('🚫 Header duration edit cancelled');
                    }
                });
            }

            setDurationFromInput(targetDuration) {
                if (!this.video.duration) return;

                // Calculate what percentage width this duration should be
                const targetWidth = (targetDuration / this.video.duration) * 100;
                const maxWidth = 100 - this.trimStart;
                const finalWidth = Math.min(targetWidth, maxWidth);

                // Update trim end to match the desired duration
                this.trimEnd = this.trimStart + finalWidth;

                // Update UI
                this.updateTrimSelection();
                this.updateTimeDisplays();
                this.constrainVideoToTrim();

                console.log(`🎯 Set duration to ${targetDuration.toFixed(1)}s (${finalWidth.toFixed(1)}% width)`);
            }

            // Timeline update methods
            updateTrimSelection() {
                const width = this.trimEnd - this.trimStart;
                this.trimSelection.style.left = this.trimStart + '%';
                this.trimSelection.style.width = width + '%';

                // Update duration badge - use actual scene duration if this is initial setup
                const durationBadge = this.trimSelection.querySelector('.duration-badge');
                if (durationBadge && this.video.duration) {
                    let duration;

                    // Check if this is the initial scene duration display
                    const sceneDuration = parseFloat(this.trimSelection.dataset.sceneDuration) || 5;

                    // ALWAYS show scene duration for initial setup, even if it exceeds video duration
                    if (this.actualScenePercent && this.trimStart === 0) {
                        // This is initial setup - ALWAYS show exact scene duration
                        duration = sceneDuration;
                        console.log(`🎯 Duration badge showing scene duration: ${duration}s (scene needs ${sceneDuration}s, video has ${this.video.duration}s)`);
                    } else {
                        // This is user-modified trim - calculate from visual width
                        duration = (width / 100) * this.video.duration;
                        console.log(`📏 Duration badge showing trim duration: ${duration}s (${width}% width)`);
                    }

                    durationBadge.textContent = this.formatDuration(duration);
                }
            }

            updatePlayheadPosition() {
                if (!this.video.duration) return;

                const percentage = (this.video.currentTime / this.video.duration) * 100;
                this.playhead.style.left = percentage + '%';
            }

            updateTimeDisplays() {
                if (!this.video.duration) return;

                console.log(`🔄 updateTimeDisplays called for scene ${this.sceneId}`);

                // Update video time display (current time / total time) - NO decimals
                const videoContainer = document.querySelector(`[data-scene-id="${this.sceneId}"]`);
                if (videoContainer) {
                    const currentTimeEl = videoContainer.querySelector('.current-time');
                    const totalTimeEl = videoContainer.querySelector('.total-time');

                    if (currentTimeEl && totalTimeEl) {
                        currentTimeEl.textContent = this.formatVideoTime(this.video.currentTime);
                        totalTimeEl.textContent = this.formatVideoTime(this.video.duration);
                    }
                }

                // Update trim info with proper decimal formatting (for precision)
                const startTimeDisplay = document.querySelector(`[data-scene-id="${this.sceneId}"] .start-time-display`);
                const endTimeDisplay = document.querySelector(`[data-scene-id="${this.sceneId}"] .end-time-display`);

                console.log(`🔍 Time display elements found:`, {
                    startTimeDisplay: !!startTimeDisplay,
                    endTimeDisplay: !!endTimeDisplay,
                    sceneId: this.sceneId
                });

                if (startTimeDisplay && endTimeDisplay) {
                    let startTime, endTime;
                    
                    // Use actual scene percentage for accurate timing when available
                    if (this.actualScenePercent && this.trimStart === 0 && Math.abs(this.trimEnd - this.actualScenePercent) < 1.0) {
                        // This is the initial scene duration display - use accurate scene timing
                        startTime = 0; // Scene always starts at 0
                        endTime = (this.actualScenePercent / 100) * this.video.duration;
                        console.log(`🎯 Using actual scene timing: Start: 0s, End: ${endTime.toFixed(2)}s (${this.actualScenePercent.toFixed(2)}%)`);
                    } else {
                        // This is user-modified trim - use visual trim timing
                        startTime = (this.trimStart / 100) * this.video.duration;
                        endTime = (this.trimEnd / 100) * this.video.duration;
                        console.log(`📏 Using trim timing: Start: ${startTime.toFixed(2)}s, End: ${endTime.toFixed(2)}s (${this.trimStart}% - ${this.trimEnd}%)`);
                    }
                    
                    console.log(`📝 Updating time displays:`, {
                        startTime: startTime.toFixed(2),
                        endTime: endTime.toFixed(2),
                        formattedStart: this.formatTime(startTime),
                        formattedEnd: this.formatTime(endTime)
                    });
                    
                    startTimeDisplay.textContent = this.formatTime(startTime);
                    endTimeDisplay.textContent = this.formatTime(endTime);
                    
                    console.log(`✅ Time displays updated successfully`);
                } else {
                    console.error(`❌ Time display elements not found for scene ${this.sceneId}`);
                }

                // Update selected duration in header with proper decimal format (3.4s style)
                const selectedDurationEl = document.querySelector(`[data-scene-id="${this.sceneId}"] .selected-duration`);
                if (selectedDurationEl) {
                    // Use actual scene percentage if available (for initial display), otherwise use visual trim
                    let duration;
                    if (this.actualScenePercent && this.trimStart === 0 && Math.abs(this.trimEnd - this.actualScenePercent) < 1.0) {
                        // This is the initial scene duration display - use exact scene duration
                        duration = parseFloat(this.trimSelection.dataset.sceneDuration) || 5;
                        console.log(`🎯 Using exact scene duration: ${duration.toFixed(2)}s (from dataset)`);
                    } else {
                        // This is user-modified trim
                        duration = ((this.trimEnd - this.trimStart) / 100) * this.video.duration;
                        console.log(`📏 Using trim duration: ${duration.toFixed(2)}s (${this.trimStart}% - ${this.trimEnd}%)`);
                    }

                    selectedDurationEl.textContent = this.formatDuration(duration);
                }
            }

            updateDurationDisplay(sceneDuration) {
                // Update the duration badge to show the scene duration initially
                const durationBadge = document.getElementById(`duration-badge-${this.sceneId}`);
                if (durationBadge && sceneDuration) {
                    durationBadge.textContent = this.formatDuration(sceneDuration);
                    console.log(`📊 Updated duration badge for scene ${this.sceneId} to ${sceneDuration}s`);
                }

                // Update the selected duration display to match scene duration initially
                const selectedDurationEl = document.querySelector(`[data-scene-id="${this.sceneId}"] .selected-duration`);
                if (selectedDurationEl && sceneDuration) {
                    selectedDurationEl.textContent = this.formatDuration(sceneDuration);
                    console.log(`📊 Updated selected duration for scene ${this.sceneId} to ${sceneDuration}s`);
                }
            }

            forceUpdateDurationDisplay(sceneDuration) {
                // Force update all duration displays to show the exact scene duration
                const durationBadge = document.getElementById(`duration-badge-${this.sceneId}`);
                if (durationBadge) {
                    durationBadge.textContent = this.formatDuration(sceneDuration);
                }

                const selectedDurationEl = document.querySelector(`[data-scene-id="${this.sceneId}"] .selected-duration`);
                if (selectedDurationEl) {
                    selectedDurationEl.textContent = this.formatDuration(sceneDuration);
                }

                // Also update the trim duration display
                const trimDurationEl = document.querySelector(`[data-scene-id="${this.sceneId}"] .trim-duration`);
                if (trimDurationEl) {
                    trimDurationEl.textContent = this.formatDuration(sceneDuration);
                }

                console.log(`🎯 Force updated all duration displays for scene ${this.sceneId} to ${sceneDuration}s`);
            }

            showDurationWarning(sceneDuration, videoDuration) {
                console.log(`🚨 showDurationWarning called for scene ${this.sceneId}: ${sceneDuration}s vs ${videoDuration}s`);

                // Find the scene container
                const sceneContainer = document.querySelector(`[data-scene-id="${this.sceneId}"]`);
                if (!sceneContainer) {
                    console.error(`❌ Scene container not found for scene ${this.sceneId}`);
                    return;
                }

                console.log(`✅ Scene container found for scene ${this.sceneId}`);

                // Remove existing warning if any
                const existingWarning = sceneContainer.querySelector('.duration-warning');
                if (existingWarning) {
                    existingWarning.remove();
                    console.log(`🗑️ Removed existing warning for scene ${this.sceneId}`);
                }

                // Create compact professional warning element
                const warning = document.createElement('div');
                warning.className = 'duration-warning mt-2';
                warning.innerHTML = `
                    <div class="warning-compact">
                        <div class="warning-main">
                            <div class="warning-icon-small">
                                <i class="bi bi-exclamation-triangle-fill"></i>
                            </div>
                            <div class="warning-text">
                                <span class="warning-label">Duration Mismatch:</span>
                                Scene needs <strong>${this.formatDuration(sceneDuration)}</strong>, video has <strong>${this.formatDuration(videoDuration)}</strong>
                            </div>
                        </div>
                        <div class="warning-solutions">
                            <span class="solution-item">
                                <i class="bi bi-upload"></i> Upload longer video
                            </span>
                            <span class="solution-divider">•</span>
                            <span class="solution-item">
                                <i class="bi bi-arrow-clockwise"></i> Regenerate scene
                            </span>
                        </div>
                    </div>
                `;

                // Insert warning after the video preview
                const videoPreview = sceneContainer.querySelector('.video-preview');
                if (videoPreview) {
                    videoPreview.insertAdjacentElement('afterend', warning);
                    console.log(`✅ Warning inserted after video preview for scene ${this.sceneId}`);
                } else {
                    // Fallback: insert at the beginning of scene container
                    sceneContainer.insertBefore(warning, sceneContainer.firstChild);
                    console.log(`⚠️ Warning inserted at beginning of container for scene ${this.sceneId} (video preview not found)`);
                }

                console.log(`🚨 WARNING DISPLAYED for scene ${this.sceneId}: Scene needs ${sceneDuration}s but video is only ${videoDuration}s`);
            }

            constrainVideoToTrim() {
                if (!this.video.duration) return;

                const startTime = (this.trimStart / 100) * this.video.duration;
                const endTime = (this.trimEnd / 100) * this.video.duration;

                // If video is outside trim range, move it to the nearest boundary
                if (this.video.currentTime < startTime) {
                    this.video.currentTime = startTime;
                } else if (this.video.currentTime > endTime) {
                    this.video.currentTime = endTime;
                }
            }

            onTimeUpdate() {
                this.updatePlayheadPosition();
                this.updateTimeDisplays();

                // Check if video should loop within trim range
                if (this.video.duration) {
                    const endTime = (this.trimEnd / 100) * this.video.duration;
                    if (this.video.currentTime >= endTime) {
                        const startTime = (this.trimStart / 100) * this.video.duration;
                        this.video.currentTime = startTime;
                    }
                }
            }

            onVideoEnded() {
                // Reset to trim start when video ends
                if (this.video.duration) {
                    const startTime = (this.trimStart / 100) * this.video.duration;
                    this.video.currentTime = startTime;
                }

                // Update play button
                const btn = document.querySelector(`[data-video-id="video-${this.sceneId}"]`);
                const icon = btn?.querySelector('i');
                if (icon) {
                    icon.className = 'bi bi-play-fill';
                }
            }

            generateTimeMarkers() {
                if (!this.video.duration || !this.timeMarkers) return;

                this.timeMarkers.innerHTML = '';
                const markerCount = 5;

                for (let i = 0; i <= markerCount; i++) {
                    const percentage = (i / markerCount) * 100;
                    const time = (percentage / 100) * this.video.duration;

                    const marker = document.createElement('div');
                    marker.className = 'time-marker';
                    marker.style.left = percentage + '%';
                    marker.textContent = this.formatTime(time);

                    this.timeMarkers.appendChild(marker);
                }
            }

            formatTime(seconds) {
                if (!seconds || isNaN(seconds)) return '0:00.0';
                const mins = Math.floor(seconds / 60);
                const wholeSecs = Math.floor(seconds % 60);
                const decimal = Math.floor((seconds % 1) * 10); // Get first decimal place
                return `${mins}:${wholeSecs.toString().padStart(2, '0')}.${decimal}`;
            }

            formatVideoTime(seconds) {
                // For video display - no decimals, just minutes:seconds
                if (!seconds || isNaN(seconds)) return '0:00';
                const mins = Math.floor(seconds / 60);
                const wholeSecs = Math.floor(seconds % 60);
                return `${mins}:${wholeSecs.toString().padStart(2, '0')}`;
            }

            formatDuration(seconds) {
                if (!seconds || isNaN(seconds)) return '0.0s';
                return `${seconds.toFixed(1)}s`;
            }

            togglePlay() {
                const btn = document.querySelector(`[data-video-id="video-${this.sceneId}"]`);
                const icon = btn?.querySelector('i');

                if (!icon) return;

                if (this.video.paused) {
                    // Start from trim start if at beginning
                    if (this.video.currentTime === 0 && this.video.duration) {
                        const startTime = (this.trimStart / 100) * this.video.duration;
                        this.video.currentTime = startTime;
                    }
                    this.video.play();
                    icon.className = 'bi bi-pause-fill';
                } else {
                    this.video.pause();
                    icon.className = 'bi bi-play-fill';
                }
            }
        }

        // Global functions
        function resetTrim(sceneId) {
            const timeline = window[`timeline_${sceneId}`];
            if (timeline) {
                // Reset to original scene duration, not full video
                timeline.trimStart = 0;
                timeline.setInitialTrimFromSceneDuration();
                timeline.updateTrimSelection();
                timeline.updateTimeDisplays();

                // Reset video to beginning
                timeline.video.currentTime = 0;
                timeline.updatePlayheadPosition();

                console.log(`🔄 Reset trim to scene duration for scene ${sceneId}`);
            }
        }



        // Video Upload Functionality
        function setupVideoUpload() {
            document.querySelectorAll('[id^="videoInput"]').forEach(input => {
                const sceneId = input.id.replace('videoInput', '');

                input.addEventListener('change', function(e) {
                    validateAndPreviewVideo(sceneId, e.target.files[0]);
                });
            });
        }

        function validateAndPreviewVideo(sceneId, file) {
            const uploadBtn = document.getElementById(`uploadBtn${sceneId}`);
            const validationMsg = document.getElementById(`validationMessage${sceneId}`);
            const preview = document.getElementById(`videoPreview${sceneId}`);

            // Reset states
            uploadBtn.disabled = true;
            validationMsg.style.display = 'none';
            preview.style.display = 'none';

            if (!file) return;

            console.log(`📹 Validating video for scene ${sceneId}:`, file);

            // Check file size (150MB = 150 * 1024 * 1024 bytes)
            const maxSize = 150 * 1024 * 1024;
            if (file.size > maxSize) {
                showValidationError(sceneId, `File too large! Maximum size is 150MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB.`);
                return;
            }

            // Check file type
            const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov', 'video/quicktime'];
            if (!allowedTypes.includes(file.type)) {
                showValidationError(sceneId, 'Invalid file type! Please upload MP4, WebM, MOV, or AVI files only.');
                return;
            }

            // Create video element to check duration
            const video = document.createElement('video');
            video.preload = 'metadata';

            video.onloadedmetadata = function() {
                console.log(`📏 Video duration: ${video.duration} seconds`);

                // Check duration (60 seconds max)
                if (video.duration > 60) {
                    showValidationError(sceneId, `Video too long! Maximum duration is 1 minute. Your video is ${Math.round(video.duration)} seconds.`);
                    return;
                }

                // All validations passed - show preview and enable upload
                showVideoPreview(sceneId, file, video);
                uploadBtn.disabled = false;

                showValidationSuccess(sceneId, `✅ Video validated successfully! Duration: ${video.duration.toFixed(1)}s, Size: ${(file.size / 1024 / 1024).toFixed(1)}MB`);
            };

            video.onerror = function() {
                showValidationError(sceneId, 'Invalid video file! Please upload a valid video file.');
            };

            video.src = URL.createObjectURL(file);
        }

        function showValidationError(sceneId, message) {
            const validationMsg = document.getElementById(`validationMessage${sceneId}`);
            validationMsg.className = 'alert alert-danger';
            validationMsg.innerHTML = `<i class="bi bi-exclamation-triangle me-2"></i>${message}`;
            validationMsg.style.display = 'block';
        }

        function showValidationSuccess(sceneId, message) {
            const validationMsg = document.getElementById(`validationMessage${sceneId}`);
            validationMsg.className = 'alert alert-success';
            validationMsg.innerHTML = `<i class="bi bi-check-circle me-2"></i>${message}`;
            validationMsg.style.display = 'block';
        }

        function showVideoPreview(sceneId, file, videoElement) {
            const preview = document.getElementById(`videoPreview${sceneId}`);
            const video = preview.querySelector('video');
            const info = preview.querySelector('.video-info');

            video.src = URL.createObjectURL(file);
            info.textContent = `${file.name} • ${(file.size / 1024 / 1024).toFixed(1)}MB • ${videoElement.duration.toFixed(1)}s`;

            preview.style.display = 'block';
        }

        async function uploadCustomVideo(sceneId) {
            const form = document.getElementById(`uploadForm${sceneId}`);
            const fileInput = document.getElementById(`videoInput${sceneId}`);
            const uploadBtn = document.getElementById(`uploadBtn${sceneId}`);
            const progress = document.getElementById(`uploadProgress${sceneId}`);
            const progressBar = progress.querySelector('.progress-bar');
            const statusText = progress.querySelector('.upload-status');

            // Check if file is selected
            if (!fileInput.files || !fileInput.files[0]) {
                showValidationError(sceneId, 'Please select a video file first.');
                return;
            }

            // No need to get project ID since it's in the route

            // Create FormData and add the file
            const formData = new FormData();
            formData.append('custom_video', fileInput.files[0]);
            formData.append('_token', document.querySelector('meta[name="csrf-token"]').getAttribute('content'));

            // Debug FormData contents
            console.log('📋 FormData contents:');
            for (let [key, value] of formData.entries()) {
                console.log(`  ${key}:`, value instanceof File ? `File: ${value.name} (${value.size} bytes)` : value);
            }

            // Disable upload button and show progress
            uploadBtn.disabled = true;
            progress.style.display = 'block';

            try {
                console.log(`🚀 Starting upload for scene ${sceneId}`);
                console.log('📤 File selected:', fileInput.files[0].name);
                console.log('📤 File size:', (fileInput.files[0].size / 1024 / 1024).toFixed(2) + 'MB');
                console.log('📊 Scene ID:', sceneId);

                // Use Laravel's route helper to generate the correct URL
                const uploadUrl = `{{ route('projects.upload-custom', ['project' => $project->id, 'scene' => '__SCENE_ID__']) }}`.replace('__SCENE_ID__', sceneId);
                console.log('🔗 Upload URL (Laravel route):', uploadUrl);
                console.log('🔍 Project ID from Blade:', {{ $project->id }});
                console.log('🔍 Scene ID from JS:', sceneId);

                const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
                console.log('🔐 CSRF Token:', csrfToken ? 'Present' : 'Missing');

                const response = await fetch(uploadUrl, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-CSRF-TOKEN': csrfToken,
                        'Accept': 'application/json'
                    }
                });

                console.log('📡 Response status:', response.status);
                console.log('📡 Response statusText:', response.statusText);

                // Read the response body once
                const responseText = await response.text();
                console.log('📡 Response body:', responseText);

                if (!response.ok) {
                    let errorMessage;
                    try {
                        const errorJson = JSON.parse(responseText);
                        errorMessage = errorJson.message || errorJson.error || 'Unknown error';
                    } catch (e) {
                        errorMessage = responseText || `${response.status} ${response.statusText}`;
                    }
                    console.error('❌ Upload failed:', errorMessage);
                    throw new Error(`Upload failed: ${errorMessage}`);
                }

                // Parse the successful response
                let result;
                try {
                    result = JSON.parse(responseText);
                    console.log('✅ Upload successful:', result);
                } catch (e) {
                    console.error('❌ Failed to parse response JSON:', responseText);
                    throw new Error('Upload failed: Invalid response format');
                }

                // Update progress to complete
                progressBar.style.width = '100%';
                statusText.textContent = 'Upload complete! Updating video...';

                // Replace the video source with the new uploaded video
                await replaceSceneVideo(sceneId, result.video_url);

                // Close modal and show success - Force cleanup
                const modalElement = document.getElementById(`uploadModal${sceneId}`);
                const modal = bootstrap.Modal.getInstance(modalElement);

                if (modal) {
                    // Hide modal
                    modal.hide();

                    // Force cleanup immediately and after animation
                    const forceCleanup = () => {
                        // Remove all modal backdrops
                        document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());

                        // Reset body classes and styles
                        document.body.classList.remove('modal-open');
                        document.body.style.overflow = '';
                        document.body.style.paddingRight = '';
                        document.body.style.marginRight = '';

                        // Remove any lingering modal classes
                        modalElement.classList.remove('show');
                        modalElement.style.display = 'none';
                        modalElement.setAttribute('aria-hidden', 'true');
                        modalElement.removeAttribute('aria-modal');
                    };

                    // Immediate cleanup
                    forceCleanup();

                    // Delayed cleanup to ensure everything is cleared
                    setTimeout(forceCleanup, 100);
                    setTimeout(forceCleanup, 500);
                }

                showSuccessMessage(`Video uploaded and replaced successfully!`);

            } catch (error) {
                console.error('❌ Upload failed:', error);
                showValidationError(sceneId, `Upload failed: ${error.message}`);
                uploadBtn.disabled = false;
            } finally {
                progress.style.display = 'none';
            }
        }

        async function replaceSceneVideo(sceneId, newVideoUrl) {
            console.log(`🔄 Replacing video for scene ${sceneId} with ${newVideoUrl}`);

            const video = document.getElementById(`video-${sceneId}`);
            if (video) {
                // Update video source
                video.src = newVideoUrl;
                video.load(); // Reload the video

                // Reinitialize time displays
                const container = video.closest('[data-scene-id]');
                if (container) {
                    const currentTimeEl = container.querySelector('.current-time');
                    const totalTimeEl = container.querySelector('.total-time');

                    if (currentTimeEl && totalTimeEl) {
                        currentTimeEl.textContent = '0:00';
                        totalTimeEl.textContent = '0:00';
                    }
                }

                // Reinitialize the timeline
                const timeline = window[`timeline_${sceneId}`];
                if (timeline) {
                    // Wait for video to load then reinitialize
                    video.addEventListener('loadedmetadata', () => {
                        timeline.initializeTimeline();

                        // Update time displays with new video duration
                        const container = video.closest('[data-scene-id]');
                        if (container) {
                            const totalTimeEl = container.querySelector('.total-time');
                            if (totalTimeEl) {
                                totalTimeEl.textContent = formatTime(video.duration);
                            }
                        }

                        console.log('✅ Timeline and time displays reinitialized with new video');
                    }, { once: true });
                }
            }
        }

        function showSuccessMessage(message) {
            // Force cleanup any remaining modal issues first
            forceModalCleanup();

            // Create a temporary success alert
            const alert = document.createElement('div');
            alert.className = 'alert alert-success alert-dismissible fade show position-fixed';
            alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
            alert.innerHTML = `
                <i class="bi bi-check-circle me-2"></i>${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;

            document.body.appendChild(alert);

            // Auto-remove after 5 seconds
            setTimeout(() => {
                if (alert.parentNode) {
                    alert.remove();
                }
            }, 5000);
        }

        function showErrorMessage(message) {
            // Force cleanup any remaining modal issues first
            forceModalCleanup();

            // Create a temporary error alert
            const alert = document.createElement('div');
            alert.className = 'alert alert-danger alert-dismissible fade show position-fixed';
            alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
            alert.innerHTML = `
                <i class="bi bi-exclamation-triangle me-2"></i>${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;

            document.body.appendChild(alert);

            // Auto-remove after 8 seconds
            setTimeout(() => {
                if (alert.parentNode) {
                    alert.remove();
                }
            }, 8000);
        }

        function showWarningMessage(message) {
            // Force cleanup any remaining modal issues first
            forceModalCleanup();

            // Create a temporary warning alert
            const alert = document.createElement('div');
            alert.className = 'alert alert-warning alert-dismissible fade show position-fixed';
            alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
            alert.innerHTML = `
                <i class="bi bi-exclamation-triangle me-2"></i>${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;

            document.body.appendChild(alert);

            // Auto-remove after 8 seconds
            setTimeout(() => {
                if (alert.parentNode) {
                    alert.remove();
                }
            }, 8000);
        }

        function showDebugLog(message) {
            try {
                // Create a debug log panel that can be toggled
                let debugPanel = document.getElementById('debug-log-panel');
                let toggleBtn = document.getElementById('debug-toggle-btn');
                
                if (!debugPanel) {
                    debugPanel = document.createElement('div');
                    debugPanel.id = 'debug-log-panel';
                    debugPanel.className = 'position-fixed';
                    debugPanel.style.cssText = 'bottom: 20px; right: 20px; width: 400px; max-height: 300px; z-index: 9998; background: rgba(0,0,0,0.9); color: #fff; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 12px; overflow-y: auto; display: block; border: 2px solid #007bff;';
                    
                    // Add header
                    const header = document.createElement('div');
                    header.style.cssText = 'font-weight: bold; margin-bottom: 10px; color: #007bff; border-bottom: 1px solid #333; padding-bottom: 5px;';
                    header.innerHTML = '🐛 AI Generation Debug Logs';
                    debugPanel.appendChild(header);
                    
                    document.body.appendChild(debugPanel);
                    console.log('🐛 Debug panel created successfully');
                }
                
                if (!toggleBtn) {
                    toggleBtn = document.createElement('button');
                    toggleBtn.id = 'debug-toggle-btn';
                    toggleBtn.innerHTML = '🐛 Debug Logs';
                    toggleBtn.className = 'btn btn-sm btn-secondary position-fixed';
                    toggleBtn.style.cssText = 'bottom: 20px; right: 440px; z-index: 9999;';
                    toggleBtn.onclick = () => {
                        debugPanel.style.display = debugPanel.style.display === 'none' ? 'block' : 'none';
                    };
                    document.body.appendChild(toggleBtn);
                    console.log('🐛 Debug toggle button created successfully');
                }
                
                const timestamp = new Date().toLocaleTimeString();
                const logEntry = document.createElement('div');
                logEntry.style.marginBottom = '8px';
                logEntry.style.borderBottom = '1px solid #333';
                logEntry.style.paddingBottom = '4px';
                logEntry.innerHTML = `<span style="color: #888;">[${timestamp}]</span> ${message}`;
                
                debugPanel.appendChild(logEntry);
                
                // Keep only last 50 entries
                const entries = debugPanel.querySelectorAll('div');
                if (entries.length > 50) {
                    entries[0].remove();
                }
                
                // Auto-scroll to bottom
                debugPanel.scrollTop = debugPanel.scrollHeight;
                
                // Also log to console for backup
                console.log(`🐛 [${timestamp}] ${message}`);
                
                // Auto-hide after 10 seconds if no new entries
                clearTimeout(debugPanel.autoHideTimer);
                debugPanel.autoHideTimer = setTimeout(() => {
                    if (debugPanel.style.display === 'block') {
                        debugPanel.style.display = 'none';
                    }
                }, 10000);
            } catch (error) {
                console.error('🐛 Error in showDebugLog:', error);
                console.log(`🐛 [${new Date().toLocaleTimeString()}] ${message}`);
            }
        }

        // Test function to simulate image-to-video generation
        function testImageToVideoGeneration() {
            showDebugLog('🧪 Starting Image-to-Video Generation Test');
            showDebugLog('📋 Test Parameters:');
            showDebugLog('- Scene ID: 329 (test scene)');
            showDebugLog('- Model: wan2.2-i2v-flash');
            showDebugLog('- Resolution: 832*480');
            showDebugLog('- Generation Type: image-to-video');
            showDebugLog('- Image: test-image.jpg (simulated)');
            showDebugLog('- Prompt: "A beautiful sunset over mountains with birds flying"');
            
            showDebugLog('🔄 Simulating request data preparation...');
            const testRequestData = {
                regeneration_option: 'ai',
                ai_model: 'wan2.2-i2v-flash',
                ai_resolution: '832*480',
                keywords: 'A beautiful sunset over mountains with birds flying',
                ai_prompt: 'A beautiful sunset over mountains with birds flying',
                generation_type: 'image-to-video',
                image_url: 'https://0x0.st/test-image.jpg'
            };
            
            showDebugLog(`📤 Test Request Data: ${JSON.stringify(testRequestData, null, 2)}`);
            showDebugLog('🌐 Test URL: /scenes/329/regenerate-proxy');
            
            showDebugLog('📡 Simulating API response...');
            setTimeout(() => {
                showDebugLog('✅ API Response: {"success":true,"message":"AI video generation job queued successfully","status":"QUEUED","scene_id":329,"polling_required":true}');
                showDebugLog('🔄 Starting polling simulation...');
                
                let pollCount = 0;
                const maxPolls = 5;
                
                const pollInterval = setInterval(() => {
                    pollCount++;
                    showDebugLog(`🔍 Poll ${pollCount}/${maxPolls}: Checking AI status...`);
                    
                    if (pollCount === 3) {
                        showDebugLog('✅ Status Response: {"success":true,"status":"SUCCEEDED","video_url":"https://0x0.st/generated-video.mp4","message":"AI video generation completed successfully"}');
                        showDebugLog('🎉 Test completed successfully!');
                        clearInterval(pollInterval);
                    } else {
                        showDebugLog(`🔄 Status Response: {"success":true,"status":"PENDING","message":"Video generation in progress","progress":${pollCount * 20}}`);
                    }
                }, 2000);
                
            }, 1000);
        }

        // Add test button to debug panel
        function addTestButton() {
            setTimeout(() => {
                const debugPanel = document.getElementById('debug-log-panel');
                if (debugPanel && !document.getElementById('test-btn')) {
                    const testBtn = document.createElement('button');
                    testBtn.id = 'test-btn';
                    testBtn.innerHTML = '🧪 Test Image-to-Video';
                    testBtn.className = 'btn btn-sm btn-primary mt-2';
                    testBtn.style.cssText = 'margin-top: 10px; width: 100%;';
                    testBtn.onclick = testImageToVideoGeneration;
                    debugPanel.appendChild(testBtn);
                }
            }, 1000);
        }

        // Initialize test button when page loads
        document.addEventListener('DOMContentLoaded', function() {
            addTestButton();
            // Test debug panel immediately
            setTimeout(() => {
                showDebugLog('🚀 Debug panel initialized successfully!');
                showDebugLog('✅ Ready to track AI generation process');
                console.log('🐛 Debug panel should be visible now');
            }, 500);
        });

        // Also try to initialize immediately
        setTimeout(() => {
            showDebugLog('🚀 Page loaded - Debug panel ready!');
            showDebugLog('🧪 Click the "Test Image-to-Video" button to test the debug panel');
        }, 1000);

        // Add a simple test function that can be called from console
        window.testDebugPanel = function() {
            showDebugLog('🧪 Manual test - Debug panel is working!');
            showDebugLog('✅ If you can see this message, the debug panel is functioning correctly');
        };

        function forceModalCleanup() {
            // Remove all modal backdrops
            document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
                backdrop.remove();
            });

            // Reset body to normal state
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
            document.body.style.marginRight = '';

            // Hide all modals
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.remove('show');
                modal.style.display = 'none';
                modal.setAttribute('aria-hidden', 'true');
                modal.removeAttribute('aria-modal');
            });
        }

        // Global time formatting function (no decimals for video overlay)
        function formatTime(seconds) {
            if (!seconds || isNaN(seconds)) return '0:00';
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = Math.floor(seconds % 60);
            return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        }

        // Initialize regenerate modal functionality
        function initializeRegenerateModal() {
            // Add Enter key support for keyword input
            const keywordInput = document.getElementById('newKeywordInput');
            if (keywordInput) {
                keywordInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        addKeyword();
                    }
                });
            }

            // Initialize AI model and resolution options
            updateResolutionOptions();
        }

        // Initialize video time displays
        function initializeVideoTimeDisplays() {
            document.querySelectorAll('video').forEach(video => {
                const container = video.closest('[data-scene-id]');
                if (container) {
                    const sceneId = container.dataset.sceneId;
                    const currentTimeEl = container.querySelector('.current-time');
                    const totalTimeEl = container.querySelector('.total-time');

                    if (currentTimeEl && totalTimeEl) {
                        // Set initial values
                        currentTimeEl.textContent = '0:00';
                        totalTimeEl.textContent = video.duration ? formatTime(video.duration) : '0:00';

                        // Update when metadata loads
                        video.addEventListener('loadedmetadata', () => {
                            totalTimeEl.textContent = formatTime(video.duration);
                            currentTimeEl.textContent = formatTime(video.currentTime);
                        });

                        // Update during playback
                        video.addEventListener('timeupdate', () => {
                            currentTimeEl.textContent = formatTime(video.currentTime);
                        });
                    }
                }
            });
        }

        // Initialize video players when page loads
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🎬 Initializing Professional Video Timelines...');
            const players = document.querySelectorAll('.video-player-container');
            console.log(`Found ${players.length} video players`);

            // Initialize video time displays first
            initializeVideoTimeDisplays();

            // Initialize regenerate modal functionality
            initializeRegenerateModal();

            // Initialize image upload and generation type functionality
            initializeImageUploadAndGenerationType();

            players.forEach(player => {
                const sceneId = player.dataset.sceneId;
                console.log(`Initializing timeline for scene ${sceneId}`);
                if (sceneId) {
                    try {
                        const timeline = new ProfessionalVideoTimeline(sceneId);
                        window[`timeline_${sceneId}`] = timeline; // Store globally for reset function
                        console.log(`✅ Timeline initialized for scene ${sceneId}`);
                    } catch (error) {
                        console.error(`❌ Error initializing timeline for scene ${sceneId}:`, error);
                    }
                }
            });

            // Setup video upload functionality
            setupVideoUpload();
        });




        // Progress helper functions
        function getProgressText(status, progress) {
            switch (status) {
                case 'QUEUED':
                    return `AI Job Queued... (${progress || 5}%)`;
                case 'PROCESSING':
                    return `AI Job Running... (${progress || 25}%)`;
                case 'PENDING':
                    return `AI Generation Starting... (${progress || 10}%)`;
                case 'RUNNING':
                    return `AI Generating Video... (${progress || 50}%)`;
                default:
                    return `AI Processing... (${progress || 25}%)`;
            }
        }

        function showProgressMessage(message, progress) {
            // Create or update progress message
            let progressDiv = document.getElementById('ai-progress-message');
            if (!progressDiv) {
                progressDiv = document.createElement('div');
                progressDiv.id = 'ai-progress-message';
                progressDiv.className = 'alert alert-info mt-3';
                progressDiv.style.position = 'fixed';
                progressDiv.style.top = '20px';
                progressDiv.style.right = '20px';
                progressDiv.style.zIndex = '9999';
                progressDiv.style.minWidth = '300px';
                document.body.appendChild(progressDiv);
            }
            
            progressDiv.innerHTML = `
                <div class="d-flex align-items-center">
                    <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                    <div>
                        <strong>AI Video Generation</strong><br>
                        <small>${message}</small>
                        ${progress ? `<div class="progress mt-2" style="height: 4px;">
                            <div class="progress-bar" role="progressbar" style="width: ${progress}%"></div>
                        </div>` : ''}
                    </div>
                </div>
            `;
        }

        function hideProgressMessage() {
            const progressDiv = document.getElementById('ai-progress-message');
            if (progressDiv) {
                progressDiv.remove();
            }
        }

        // Utility Functions
        let currentSceneId = null;
        let currentSceneKeywords = [];

        function regenerateScene(sceneId) {
            console.log('🔄 Opening regenerate modal for scene:', sceneId);
            
            // Store scene ID in the modal for later use
            const modal = document.getElementById('regenerateModal');
            modal.setAttribute('data-current-scene-id', sceneId);
            
            console.log('✅ Modal data attribute set:', modal.getAttribute('data-current-scene-id'));

            // Also update global variables for backward compatibility
            currentSceneId = sceneId;

            // Get scene keywords from the button's data attribute
            const button = document.querySelector(`button[onclick="regenerateScene(${sceneId})"]`);
            const keywordsString = button ? button.getAttribute('data-scene-keywords') : '';

            console.log(`🔍 Raw keywords string for scene ${sceneId}:`, keywordsString);

            // Parse keywords (they are separated by semicolons from n8n response)
            if (keywordsString && keywordsString.trim() && keywordsString !== 'null') {
                currentSceneKeywords = keywordsString.split(';')
                    .map(keyword => keyword.trim())
                    .filter(keyword => keyword.length > 0);
            } else {
                // Fallback to empty array if no keywords
                currentSceneKeywords = [];
            }

            console.log(`🏷️ Parsed keywords for scene ${sceneId}:`, currentSceneKeywords);

            // Populate keywords in the modal
            populateKeywords();

            // Show the regenerate modal
            console.log('🎭 Opening modal with Bootstrap');
            const modalInstance = new bootstrap.Modal(modal);
            modalInstance.show();
            
            // Verify modal is open and data is set
            setTimeout(() => {
                console.log('🔍 Modal verification after opening:', {
                    modalVisible: modal.classList.contains('show'),
                    dataAttribute: modal.getAttribute('data-current-scene-id'),
                    globalSceneId: currentSceneId
                });
            }, 100);
        }

        function populateKeywords() {
            const container = document.getElementById('keywordsContainer');
            container.innerHTML = '';

            if (currentSceneKeywords.length === 0) {
                // Show placeholder when no keywords
                const placeholder = document.createElement('div');
                placeholder.className = 'text-muted text-center py-3';
                placeholder.innerHTML = '<i class="bi bi-tags me-2"></i>No keywords available. Add some keywords below.';
                container.appendChild(placeholder);
            } else {
                // Show keyword tags
                currentSceneKeywords.forEach(keyword => {
                    const tag = document.createElement('div');
                    tag.className = 'keyword-tag';
                    tag.innerHTML = `
                        ${keyword}
                        <button type="button" class="remove-keyword" onclick="removeKeyword('${keyword}')">
                            <i class="bi bi-x"></i>
                        </button>
                    `;
                    container.appendChild(tag);
                });
            }
        }

        function addKeyword() {
            const input = document.getElementById('newKeywordInput');
            const keyword = input.value.trim();

            if (keyword && !currentSceneKeywords.includes(keyword)) {
                currentSceneKeywords.push(keyword);
                populateKeywords();
                input.value = '';
            }
        }

        function removeKeyword(keyword) {
            currentSceneKeywords = currentSceneKeywords.filter(k => k !== keyword);
            populateKeywords();
        }

        function regenerateFromPexels() {
            // Get scene ID from the currently open modal
            const modal = document.getElementById('regenerateModal');
            const sceneId = modal.getAttribute('data-current-scene-id');

            if (!sceneId) {
                console.error('❌ No scene ID found in modal');
                return;
            }

            // Get keywords from the modal's current state
            const keywordsContainer = document.getElementById('keywordsContainer');
            const keywordTags = keywordsContainer.querySelectorAll('.keyword-tag');
            const sceneKeywords = Array.from(keywordTags).map(tag => tag.textContent.replace('×', '').trim());

            console.log(`🎬 [FIXED] Regenerating scene ${sceneId} from Pexels with keywords:`, sceneKeywords);
            console.log(`🔧 Using modal-stored scene ID instead of global variable`);
            console.log(`🎯 Target scene: ${sceneId}, Keywords count: ${sceneKeywords.length}`);

            // Get current scene video URL
            const videoElement = document.querySelector(`#video-${sceneId}`);
            let currentVideoUrl = '';

            if (videoElement) {
                currentVideoUrl = videoElement.src || videoElement.getAttribute('src') || '';

                // If src is empty, try to get from source elements
                if (!currentVideoUrl) {
                    const sourceElement = videoElement.querySelector('source');
                    if (sourceElement) {
                        currentVideoUrl = sourceElement.src || sourceElement.getAttribute('src') || '';
                    }
                }
            }

            // If still empty, try to get from data attribute or other sources
            if (!currentVideoUrl) {
                const sceneContainer = document.querySelector(`[data-scene-id="${sceneId}"]`);
                if (sceneContainer) {
                    currentVideoUrl = sceneContainer.getAttribute('data-video-url') || '';
                }
            }

            console.log(`🎥 Current video URL for scene ${sceneId}:`, currentVideoUrl);

            // Close modal
            const modalInstance = bootstrap.Modal.getInstance(document.getElementById('regenerateModal'));
            modalInstance.hide();

            // Show loading state
            showLoadingState(sceneId, 'Regenerating from Pexels...');

            // Prepare request data for Laravel proxy
            const formData = new FormData();
            formData.append('_token', document.querySelector('meta[name="csrf-token"]').getAttribute('content'));
            formData.append('regeneration_option', 'pexels');
            formData.append('keywords', sceneKeywords.join('; '));

            console.log('🌐 Sending regeneration request via Laravel proxy');
            console.log('🌐 Keywords:', sceneKeywords.join('; '));

            // Make request via Laravel proxy to avoid CORS issues
            // Use the correct base URL for Laragon setup
            const currentPath = window.location.pathname;
            const pathParts = currentPath.split('/');
            const reviewIndex = pathParts.findIndex(part => part === 'review');
            const basePath = pathParts.slice(0, reviewIndex).join('/');
            const regenerateUrl = basePath + '/scenes/' + sceneId + '/regenerate-proxy';
            console.log('🌐 Regenerate URL:', regenerateUrl);
            console.log('📁 Current Path:', currentPath);
            console.log('📁 Path Parts:', pathParts);
            console.log('📁 Review Index:', reviewIndex);
            console.log('📁 Base Path:', basePath);

            fetch(regenerateUrl, {
                method: 'POST',
                body: formData
            })
            .then(async response => {
                console.log('📡 Regeneration response status:', response.status);
                console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

                // Get response text for debugging
                const responseText = await response.text();
                console.log('📡 Response body:', responseText);

                if (!response.ok) {
                    // Try to parse error message from response
                    let errorMessage = `HTTP error! status: ${response.status}`;
                    try {
                        const errorData = JSON.parse(responseText);
                        if (errorData.message) {
                            errorMessage += ` - ${errorData.message}`;
                        }
                        if (errorData.error) {
                            errorMessage += ` - ${errorData.error}`;
                        }
                    } catch (e) {
                        // If response is not JSON, include raw text
                        if (responseText) {
                            errorMessage += ` - ${responseText.substring(0, 200)}`;
                        }
                    }
                    throw new Error(errorMessage);
                }

                // Parse successful response
                return JSON.parse(responseText);
            })
            .then(data => {
                console.log('✅ Regeneration successful:', data);
                console.log('🔍 Response data:', JSON.stringify(data, null, 2));

                if (data.success) {
                    if (data.new_video_url) {
                        console.log('🎥 New video URL received:', data.new_video_url);

                        // Update the video element on the page
                        updateVideoElement(sceneId, data.new_video_url);

                        // Update keywords display
                        updateKeywordsDisplay(sceneId, sceneKeywords);

                        // Hide loading state
                        hideLoadingState(sceneId);

                        // Show success message
                        showSuccessMessage('Scene regenerated successfully from Pexels!');
                    } else {
                        console.error('❌ No new_video_url in successful response:', data);
                        hideLoadingState(sceneId);
                        showErrorMessage('Regeneration completed but no new video URL received');
                    }
                } else {
                    console.error('❌ Regeneration failed:', data);
                    throw new Error(data.message || 'Regeneration failed');
                }
            })
            .catch(error => {
                console.error('❌ Regeneration failed:', error);
                hideLoadingState(sceneId);
                showErrorMessage(`Regeneration failed: ${error.message}`);
            });
        }

        function generateSmartPrompt() {
            console.log('🎯 Generate Prompt button clicked');

            // Get scene ID from the modal
            const modal = document.getElementById('regenerateModal');
            const sceneId = modal.getAttribute('data-current-scene-id');

            console.log('🔍 Modal found:', !!modal);
            console.log('🔍 Scene ID from modal:', sceneId);

            if (!sceneId) {
                console.error('❌ No scene ID found in modal');
                showErrorMessage('Error: No scene ID found. Please close and reopen the regeneration modal.');
                return;
            }

            const button = document.querySelector('.generate-prompt-btn');
            const textarea = document.getElementById('aiPrompt');
            const icon = button.querySelector('i');

            console.log('🔍 Button found:', !!button);
            console.log('🔍 Textarea found:', !!textarea);
            console.log('🔍 Icon found:', !!icon);

            // Get current scene prompt from database (simulate AI generation)
            const sceneButton = document.querySelector(`button[onclick="regenerateScene(${sceneId})"]`);
            let scenePrompt = '';

            // Try to get the prompt from the button's data attribute
            if (sceneButton) {
                scenePrompt = sceneButton.getAttribute('data-scene-prompt') || '';
            }

            // Fallback prompts if no scene prompt exists
            const fallbackPrompts = [
                "A cinematic wide shot with professional lighting, showcasing modern aesthetics and smooth camera movements. The scene should evoke emotion and capture attention with vibrant colors and dynamic composition.",
                "A close-up shot with shallow depth of field, emphasizing the subject with warm, natural lighting. The background should be softly blurred with bokeh effects, creating an intimate and engaging atmosphere.",
                "A dynamic tracking shot with fluid camera movement, featuring contemporary visual elements and balanced composition. The lighting should be dramatic yet natural, highlighting key details and creating visual interest.",
                "An establishing shot with cinematic framing, showcasing the environment with professional color grading. The scene should have depth and layers, with careful attention to lighting and visual storytelling.",
                "A medium shot with artistic composition, featuring modern visual elements and professional production values. The lighting should enhance the mood while maintaining clarity and visual appeal."
            ];

            const promptToUse = scenePrompt || fallbackPrompts[Math.floor(Math.random() * fallbackPrompts.length)];

            // Start loading animation
            button.classList.add('loading');
            icon.className = 'bi bi-arrow-repeat me-1';
            button.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i>Generating...';

            // Placeholder animation phrases
            const placeholders = [
                "Analyzing scene context...",
                "Processing visual elements...",
                "Crafting cinematic description...",
                "Optimizing for AI generation...",
                "Finalizing creative prompt..."
            ];

            let placeholderIndex = 0;
            textarea.value = '';

            // Show placeholder animation
            const placeholderInterval = setInterval(() => {
                textarea.placeholder = placeholders[placeholderIndex];
                textarea.classList.add('placeholder-animation');
                placeholderIndex = (placeholderIndex + 1) % placeholders.length;
            }, 300);

            // After 2 seconds, start typewriter effect
            setTimeout(() => {
                clearInterval(placeholderInterval);
                textarea.classList.remove('placeholder-animation');
                textarea.placeholder = "Click 'Generate Prompt' for AI suggestions or describe the video you want to generate...";

                // Typewriter effect
                let charIndex = 0;
                const typewriterInterval = setInterval(() => {
                    if (charIndex < promptToUse.length) {
                        textarea.value = promptToUse.substring(0, charIndex + 1);
                        charIndex++;
                    } else {
                        clearInterval(typewriterInterval);

                        // Reset button
                        button.classList.remove('loading');
                        icon.className = 'bi bi-magic me-1';
                        button.innerHTML = '<i class="bi bi-magic me-1"></i>Generate Prompt';

                        // Focus textarea for editing
                        textarea.focus();
                        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
                    }
                }, 20); // Fast typing speed
            }, 2000);
        }

        // Image upload and generation type handling
        let uploadedImageFile = null;
        let uploadedImageUrl = null;

        function handleImageUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                showErrorMessage('Please upload a valid image file (JPEG, JPG, PNG, BMP, WEBP)');
                return;
            }

            // Validate file size (10MB max)
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (file.size > maxSize) {
                showErrorMessage('Image file size must be less than 10MB');
                return;
            }

            // Validate image dimensions (360-2000 pixels)
            const img = new Image();
            img.onload = function() {
                if (this.width < 360 || this.width > 2000 || this.height < 360 || this.height > 2000) {
                    showErrorMessage('Image dimensions must be between 360x360 and 2000x2000 pixels');
                    return;
                }

                // Store the file and show preview
                uploadedImageFile = file;
                showImagePreview(file);
            };
            img.src = URL.createObjectURL(file);
        }

        function showImagePreview(file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.getElementById('imagePreview');
                const info = document.getElementById('imageInfo');
                const placeholder = document.querySelector('.upload-placeholder');
                const uploadedDiv = document.getElementById('uploadedImagePreview');

                preview.src = e.target.result;
                info.textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
                
                placeholder.classList.add('d-none');
                uploadedDiv.classList.remove('d-none');
            };
            reader.readAsDataURL(file);
        }

        function removeUploadedImage() {
            uploadedImageFile = null;
            uploadedImageUrl = null;
            
            const placeholder = document.querySelector('.upload-placeholder');
            const uploadedDiv = document.getElementById('uploadedImagePreview');
            const fileInput = document.getElementById('imageUpload');
            
            placeholder.classList.remove('d-none');
            uploadedDiv.classList.add('d-none');
            fileInput.value = '';
        }

        function updateModelOptions(type) {
            const modelSelect = document.getElementById('aiModel');
            
            // Clear and repopulate options based on type
            modelSelect.innerHTML = '';
            
            if (type === 'text-to-video') {
                modelSelect.innerHTML = `
                    <option value="wan2.2-t2v-plus">WAN 2.2 T2V Plus (Best Quality)</option>
                    <option value="wan2.1-t2v-turbo">WAN 2.1 T2V Turbo (Fast)</option>
                    <option value="wan2.1-t2v-plus">WAN 2.1 T2V Plus (Balanced)</option>
                `;
            } else {
                modelSelect.innerHTML = `
                    <option value="wan2.2-i2v-flash">WAN 2.2 I2V Flash (Fast)</option>
                    <option value="wan2.2-i2v-plus">WAN 2.2 I2V Plus (Best Quality)</option>
                    <option value="wan2.1-i2v-turbo">WAN 2.1 I2V Turbo (Fast)</option>
                    <option value="wan2.1-i2v-plus">WAN 2.1 I2V Plus (Balanced)</option>
                `;
            }
            
            // Update resolution options
            updateResolutionOptions();
        }

        function initializeImageUploadAndGenerationType() {
            const textToVideoRadio = document.getElementById('textToVideo');
            const imageToVideoRadio = document.getElementById('imageToVideo');
            const textToVideoSection = document.getElementById('textToVideoSection');
            const imageToVideoSection = document.getElementById('imageToVideoSection');

            function updateGenerationType() {
                if (textToVideoRadio.checked) {
                    textToVideoSection.style.display = 'block';
                    imageToVideoSection.style.display = 'none';
                    updateModelOptions('text-to-video');
                } else {
                    textToVideoSection.style.display = 'none';
                    imageToVideoSection.style.display = 'block';
                    updateModelOptions('image-to-video');
                }
            }

            if (textToVideoRadio && imageToVideoRadio) {
                textToVideoRadio.addEventListener('change', updateGenerationType);
                imageToVideoRadio.addEventListener('change', updateGenerationType);
            }

            // Make upload area clickable
            const uploadArea = document.getElementById('imageUploadArea');
            if (uploadArea) {
                uploadArea.addEventListener('click', function() {
                    document.getElementById('imageUpload').click();
                });
            }
        }

        async function uploadImageToServer(file) {
            try {
                showDebugLog(`📤 Uploading image to server: ${file.name}`);
                showDebugLog(`📊 File details: ${JSON.stringify({
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    lastModified: file.lastModified
                }, null, 2)}`);
                
                const formData = new FormData();
                formData.append('image', file);
                formData.append('_token', document.querySelector('meta[name="csrf-token"]').getAttribute('content'));

                // Use the correct base URL for Laragon setup
                const currentPath = window.location.pathname;
                const pathParts = currentPath.split('/');
                const reviewIndex = pathParts.findIndex(part => part === 'review');
                const basePath = pathParts.slice(0, reviewIndex).join('/');
                const uploadUrl = basePath + '/upload-image';
                
                showDebugLog(`🌐 Upload URL: ${uploadUrl}`);

                const response = await fetch(uploadUrl, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });
                
                showDebugLog(`📡 Upload response status: ${response.status}`);
                showDebugLog(`📡 Upload response headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}`);

                if (!response.ok) {
                    const errorText = await response.text();
                    showDebugLog(`❌ Upload error response: ${errorText}`);
                    throw new Error(`Upload failed: ${response.status} - ${errorText}`);
                }

                const result = await response.json();
                
                if (result.success && result.url) {
                    uploadedImageUrl = result.url;
                    showDebugLog(`✅ Image uploaded to 0x0 successfully: ${uploadedImageUrl}`);
                    return result.url;
                } else {
                    throw new Error('Invalid response from server: ' + JSON.stringify(result));
                }
            } catch (error) {
                showDebugLog(`❌ Image upload failed: ${error.message}`);
                showDebugLog(`❌ Upload error details: ${JSON.stringify({
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                }, null, 2)}`);
                showErrorMessage('Failed to upload image: ' + error.message);
                throw error;
            }
        }

        async function regenerateWithAI() {
            showDebugLog('🤖 Regenerate with AI button clicked');

            const modal = document.getElementById('regenerateModal');
            const generationType = document.querySelector('input[name="aiGenerationType"]:checked').value;
            const aiModel = document.getElementById('aiModel').value;
            const aiResolution = document.getElementById('aiResolution').value;

            // Validate based on generation type and get prompts
            let aiPrompt = '';
            let imagePrompt = '';
            
            if (generationType === 'text-to-video') {
                aiPrompt = document.getElementById('aiPrompt').value.trim();
            if (!aiPrompt) {
                alert('Please enter an AI prompt or use the "Generate Prompt" button.');
                return;
                }
            } else {
                imagePrompt = document.getElementById('imagePrompt').value.trim();
                if (!uploadedImageFile) {
                    alert('Please upload an image for the first frame.');
                    return;
                }
                if (!imagePrompt) {
                    alert('Please describe the motion and action you want in the video.');
                    return;
                }
            }

            // Get current scene ID from the modal or global variable
            const sceneId = modal.dataset.currentSceneId || modal.dataset.sceneId || currentSceneId;
            console.log('🔍 Scene ID sources:', {
                modalCurrentSceneId: modal.dataset.currentSceneId,
                modalSceneId: modal.dataset.sceneId,
                globalCurrentSceneId: currentSceneId,
                finalSceneId: sceneId
            });
            
            if (!sceneId) {
                console.error('❌ No scene ID found in modal or global variable');
                console.error('❌ Modal element:', modal);
                console.error('❌ Modal dataset:', modal.dataset);
                console.error('❌ Global currentSceneId:', currentSceneId);
                alert('Error: Scene ID not found. Please try again.');
                return;
            }

            // Show debug log instead of console log to avoid console spam
            showDebugLog(`🤖 Starting AI generation for scene ${sceneId}`);
            showDebugLog(`Generation Type: ${generationType}`);
            showDebugLog(`Model: ${aiModel}`);
            showDebugLog(`Resolution: ${aiResolution}`);
            showDebugLog(`Text Prompt: ${generationType === 'text-to-video' ? (aiPrompt ? aiPrompt.substring(0, 100) + '...' : 'N/A') : 'N/A'}`);
            showDebugLog(`Image Prompt: ${generationType === 'image-to-video' ? (imagePrompt ? imagePrompt.substring(0, 100) + '...' : 'N/A') : 'N/A'}`);
            showDebugLog(`Has Image: ${!!uploadedImageFile}`);

            // Close modal
            const modalInstance = bootstrap.Modal.getInstance(modal);
            modalInstance.hide();

            // Show loading state
            const button = document.querySelector(`button[onclick="regenerateScene(${sceneId})"]`);
            if (button) {
                button.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Generating AI Video...';
                button.disabled = true;
            }

            // Send AI generation request
            // Use the correct base URL for Laragon setup
            const currentPath = window.location.pathname;
            const pathParts = currentPath.split('/');
            const reviewIndex = pathParts.findIndex(part => part === 'review');
            const basePath = pathParts.slice(0, reviewIndex).join('/');
            const regenerateUrl = basePath + '/scenes/' + sceneId + '/regenerate-proxy';
            showDebugLog(`🌐 AI Regenerate URL: ${regenerateUrl}`);
            showDebugLog(`📁 Current Path: ${currentPath}`);
            showDebugLog(`📁 Base Path: ${basePath}`);
            showDebugLog(`🔍 Scene ID: ${sceneId}`);
            
            // Prepare request data based on generation type
            let requestData = {
                regeneration_option: 'ai',
                ai_model: aiModel,
                ai_resolution: aiResolution
            };

            if (generationType === 'text-to-video') {
                requestData.keywords = aiPrompt;
                requestData.ai_prompt = aiPrompt;
            } else {
                requestData.keywords = imagePrompt; // Required field
                requestData.ai_prompt = imagePrompt;
                requestData.generation_type = 'image-to-video';
                
                // Upload image first if not already uploaded
                if (uploadedImageFile && !uploadedImageUrl) {
                    await uploadImageToServer(uploadedImageFile);
                }
                
                if (uploadedImageUrl) {
                    requestData.image_url = uploadedImageUrl;
                }
            }
            
            showDebugLog(`📤 Request data: ${JSON.stringify(requestData, null, 2)}`);
            showDebugLog(`🌐 Regenerate URL: ${regenerateUrl}`);
            
            fetch(regenerateUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                },
                body: JSON.stringify(requestData),
                credentials: 'same-origin'
            })
            .then(async response => {
                console.log('📡 AI generation response status:', response.status);
                console.log('📡 AI generation response headers:', Object.fromEntries(response.headers.entries()));
                
                // Get response text for debugging
                const responseText = await response.text();
                console.log('📡 AI generation response body:', responseText);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status} - ${responseText}`);
                }
                
                try {
                    return JSON.parse(responseText);
                } catch (parseError) {
                    console.error('❌ Failed to parse JSON response:', parseError);
                    throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}...`);
                }
            })
            .then(data => {
                showDebugLog(`🤖 AI generation response: ${JSON.stringify(data, null, 2)}`);

                if (data.success) {
                    showDebugLog(`✅ AI generation request successful`);
                    if (data.polling_required) {
                        showDebugLog(`🔄 Starting polling for scene ${sceneId}`);
                        // Start polling for completion
                        startAiGenerationPolling(sceneId);
                        showSuccessMessage('AI video generation job queued! This may take a few minutes...');
                        
                        // Show initial progress message
                        showProgressMessage('AI video generation job queued successfully', 5);
                    } else {
                        // Immediate success (shouldn't happen with AI)
                        showDebugLog(`✅ Immediate success - reloading page`);
                        showSuccessMessage('AI video generation completed!');
                        location.reload();
                    }
                } else {
                    showDebugLog(`❌ AI generation failed: ${data.message}`);
                    showDebugLog(`❌ Full error response: ${JSON.stringify(data, null, 2)}`);
                    showErrorMessage(`AI generation failed: ${data.message}`);
                    
                    // Reset button
                    if (button) {
                        button.innerHTML = '<i class="bi bi-arrow-clockwise me-2"></i>Regenerate';
                        button.disabled = false;
                    }
                }
            })
            .catch(error => {
                showDebugLog(`❌ AI generation request failed: ${error.message}`);
                showDebugLog(`❌ Error name: ${error.name}`);
                showDebugLog(`❌ Error stack: ${error.stack}`);
                showErrorMessage(`Failed to start AI generation: ${error.message}`);
                
                // Reset button
                if (button) {
                    button.innerHTML = '<i class="bi bi-arrow-clockwise me-2"></i>Regenerate';
                    button.disabled = false;
                }
            });
        }

        // AI Generation Polling
        function startAiGenerationPolling(sceneId) {
            showDebugLog(`🔄 Starting AI generation polling for scene ${sceneId}`);
            showDebugLog(`⏰ Polling interval: 10 seconds`);
            
            const pollInterval = setInterval(() => {
                showDebugLog(`🔍 Polling iteration for scene ${sceneId}`);
                checkAiGenerationStatus(sceneId, pollInterval);
            }, 10000); // Poll every 10 seconds
        }

        function checkAiGenerationStatus(sceneId, pollInterval) {
            // Use the correct base URL for Laragon setup
            const currentPath = window.location.pathname;
            const pathParts = currentPath.split('/');
            const reviewIndex = pathParts.findIndex(part => part === 'review');
            const basePath = pathParts.slice(0, reviewIndex).join('/');
            const statusUrl = basePath + '/scenes/' + sceneId + '/ai-status';
            showDebugLog(`🔍 Checking AI status: ${statusUrl}`);
            showDebugLog(`📁 Current path: ${currentPath}`);
            showDebugLog(`📁 Base path: ${basePath}`);
            showDebugLog(`🔍 Scene ID: ${sceneId}`);
            
            fetch(statusUrl, {
                method: 'GET',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                },
                credentials: 'same-origin'
            })
            .then(response => {
                showDebugLog(`🔍 Response status: ${response.status}`);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                showDebugLog(`🔍 AI generation status: ${JSON.stringify(data, null, 2)}`);

                if (data.status === 'SUCCEEDED') {
                    showDebugLog(`✅ AI generation completed successfully for scene ${sceneId}`);
                    clearInterval(pollInterval);
                    hideProgressMessage();
                    showSuccessMessage('AI video generation completed successfully!');
                    
                    // Reset button
                    const button = document.querySelector(`button[onclick="regenerateScene(${sceneId})"]`);
                    if (button) {
                        button.innerHTML = '<i class="bi bi-arrow-clockwise me-2"></i>Regenerate';
                        button.disabled = false;
                    }
                    
                    // Reload page to show new video
                    setTimeout(() => {
                        location.reload();
                    }, 2000);
                } else if (data.status === 'FAILED') {
                    showDebugLog(`❌ AI generation failed for scene ${sceneId}: ${data.message}`);
                    clearInterval(pollInterval);
                    hideProgressMessage();
                    
                    // Show more helpful error message based on the error type
                    let errorMessage = data.message;
                    if (data.message && data.message.includes('timeout')) {
                        errorMessage = 'Image download timeout: WAN AI is having trouble accessing the image. This is a known issue with certain image hosting services. Please try: 1) Upload a smaller image (< 2MB), 2) Use JPG format instead of PNG, 3) Try a different image, or 4) Wait a few minutes and try again.';
                    } else if (data.message && data.message.includes('validation failed')) {
                        errorMessage = 'Image validation failed: The image may not be accessible. Please try uploading a new image.';
                    } else if (data.message && data.message.includes('check backend logs')) {
                        errorMessage = 'AI generation failed due to image processing issues. This is often caused by network connectivity between WAN AI and image hosting services. Please try with a different image or wait a few minutes before retrying.';
                    }
                    
                    showErrorMessage(`AI video generation failed: ${errorMessage}`);
                    
                    // Reset button
                    const button = document.querySelector(`button[onclick="regenerateScene(${sceneId})"]`);
                    if (button) {
                        button.innerHTML = '<i class="bi bi-arrow-clockwise me-2"></i>Regenerate';
                        button.disabled = false;
                    }
                } else if (data.status === 'NO_TASK') {
                    showDebugLog(`⚠️ No AI generation task found for scene ${sceneId}`);
                    clearInterval(pollInterval);
                    hideProgressMessage();
                    showWarningMessage('No AI generation task found. Please start a new generation.');
                    
                    // Reset button
                    const button = document.querySelector(`button[onclick="regenerateScene(${sceneId})"]`);
                    if (button) {
                        button.innerHTML = '<i class="bi bi-arrow-clockwise me-2"></i>Regenerate';
                        button.disabled = false;
                    }
                } else {
                    // Still processing - update button text with progress
                    showDebugLog(`🔄 AI generation still processing for scene ${sceneId}: ${data.status}`);
                    const button = document.querySelector(`button[onclick="regenerateScene(${sceneId})"]`);
                    if (button) {
                        const progressText = getProgressText(data.status, data.progress);
                        button.innerHTML = `<i class="bi bi-hourglass-split me-2"></i>${progressText}`;
                    }
                    
                    // Show progress message
                    if (data.message) {
                        showProgressMessage(data.message, data.progress || 25);
                    }
                }
            })
            .catch(error => {
                showDebugLog(`❌ AI status check failed for scene ${sceneId}: ${error.message}`);
                showDebugLog(`❌ Error details: ${JSON.stringify({
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                }, null, 2)}`);
                clearInterval(pollInterval);
                hideProgressMessage();
                
                // Show error message
                showErrorMessage(`AI status check failed: ${error.message}`);
                
                // Reset button
                const button = document.querySelector(`button[onclick="regenerateScene(${sceneId})"]`);
                if (button) {
                    button.innerHTML = '<i class="bi bi-arrow-clockwise me-2"></i>Regenerate';
                    button.disabled = false;
                }
            });
        }

        // Update resolution options based on selected model
        function updateResolutionOptions() {
            const modelSelect = document.getElementById('aiModel');
            const resolutionSelect = document.getElementById('aiResolution');
            const pricingDiv = document.getElementById('modelPricing');
            
            const model = modelSelect.value;
            
            // Model configurations
            const modelConfigs = {
                'wan2.2-t2v-plus': {
                    resolutions: [
                        { value: '832*480', text: '832×480 (16:9)' },
                        { value: '480*832', text: '480×832 (9:16)' },
                        { value: '624*624', text: '624×624 (1:1)' },
                        { value: '1920*1080', text: '1920×1080 (16:9)' },
                        { value: '1080*1920', text: '1080×1920 (9:16)' },
                        { value: '1440*1440', text: '1440×1440 (1:1)' },
                        { value: '1632*1248', text: '1632×1248 (4:3)' },
                        { value: '1248*1632', text: '1248×1632 (3:4)' }
                    ],
                    pricing: '480P: $0.02/second • 1080P: $0.10/second'
                },
                'wan2.1-t2v-turbo': {
                    resolutions: [
                        { value: '832*480', text: '832×480 (16:9)' },
                        { value: '480*832', text: '480×832 (9:16)' },
                        { value: '624*624', text: '624×624 (1:1)' },
                        { value: '1280*720', text: '1280×720 (16:9)' },
                        { value: '720*1280', text: '720×1280 (9:16)' },
                        { value: '960*960', text: '960×960 (1:1)' },
                        { value: '1088*832', text: '1088×832 (4:3)' },
                        { value: '832*1088', text: '832×1088 (3:4)' }
                    ],
                    pricing: '480P: $0.036/second • 720P: $0.036/second'
                },
                'wan2.1-t2v-plus': {
                    resolutions: [
                        { value: '1280*720', text: '1280×720 (16:9)' },
                        { value: '720*1280', text: '720×1280 (9:16)' },
                        { value: '960*960', text: '960×960 (1:1)' },
                        { value: '1088*832', text: '1088×832 (4:3)' },
                        { value: '832*1088', text: '832×1088 (3:4)' }
                    ],
                    pricing: '720P: $0.10/second'
                },
                'wan2.2-i2v-flash': {
                    resolutions: [
                        { value: '832*480', text: '832×480 (16:9)' },
                        { value: '480*832', text: '480×832 (9:16)' },
                        { value: '624*624', text: '624×624 (1:1)' },
                        { value: '1280*720', text: '1280×720 (16:9)' },
                        { value: '720*1280', text: '720×1280 (9:16)' },
                        { value: '960*960', text: '960×960 (1:1)' },
                        { value: '1088*832', text: '1088×832 (4:3)' },
                        { value: '832*1088', text: '832×1088 (3:4)' }
                    ],
                    pricing: '480P: $0.015/second • 720P: $0.036/second'
                },
                'wan2.2-i2v-plus': {
                    resolutions: [
                        { value: '832*480', text: '832×480 (16:9)' },
                        { value: '480*832', text: '480×832 (9:16)' },
                        { value: '624*624', text: '624×624 (1:1)' },
                        { value: '1920*1080', text: '1920×1080 (16:9)' },
                        { value: '1080*1920', text: '1080×1920 (9:16)' },
                        { value: '1440*1440', text: '1440×1440 (1:1)' },
                        { value: '1632*1248', text: '1632×1248 (4:3)' },
                        { value: '1248*1632', text: '1248×1632 (3:4)' }
                    ],
                    pricing: '480P: $0.02/second • 1080P: $0.10/second'
                },
                'wan2.1-i2v-turbo': {
                    resolutions: [
                        { value: '832*480', text: '832×480 (16:9)' },
                        { value: '480*832', text: '480×832 (9:16)' },
                        { value: '624*624', text: '624×624 (1:1)' },
                        { value: '1280*720', text: '1280×720 (16:9)' },
                        { value: '720*1280', text: '720×1280 (9:16)' },
                        { value: '960*960', text: '960×960 (1:1)' },
                        { value: '1088*832', text: '1088×832 (4:3)' },
                        { value: '832*1088', text: '832×1088 (3:4)' }
                    ],
                    pricing: '480P: $0.036/second • 720P: $0.036/second'
                },
                'wan2.1-i2v-plus': {
                    resolutions: [
                        { value: '1280*720', text: '1280×720 (16:9)' },
                        { value: '720*1280', text: '720×1280 (9:16)' },
                        { value: '960*960', text: '960×960 (1:1)' },
                        { value: '1088*832', text: '1088×832 (4:3)' },
                        { value: '832*1088', text: '832×1088 (3:4)' }
                    ],
                    pricing: '720P: $0.10/second'
                }
            };
            
            const config = modelConfigs[model];
            if (config) {
                // Update resolution options
                resolutionSelect.innerHTML = '';
                config.resolutions.forEach(resolution => {
                    const option = document.createElement('option');
                    option.value = resolution.value;
                    option.textContent = resolution.text;
                    resolutionSelect.appendChild(option);
                });
                
                // Update pricing info
                pricingDiv.textContent = config.pricing;
            }
        }

        function showComingSoonMessage() {
            // Create a coming soon modal
            const comingSoonModal = document.createElement('div');
            comingSoonModal.className = 'modal fade';
            comingSoonModal.id = 'comingSoonModal';
            comingSoonModal.setAttribute('tabindex', '-1');
            comingSoonModal.innerHTML = `
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header border-0 text-center">
                            <div class="w-100">
                                <div class="mb-3">
                                    <i class="bi bi-robot text-primary" style="font-size: 3rem;"></i>
                                </div>
                                <h4 class="modal-title text-primary">AI Video Regeneration</h4>
                            </div>
                        </div>
                        <div class="modal-body text-center py-4">
                            <h5 class="mb-3">🚀 Coming Soon!</h5>
                            <p class="text-muted mb-4">
                                AI-powered video regeneration is currently in development.
                                This exciting feature will allow you to regenerate scenes using
                                advanced AI technology with custom prompts.
                            </p>
                            <div class="d-flex justify-content-center gap-3 mb-3">
                                <div class="feature-item">
                                    <i class="bi bi-magic text-primary"></i>
                                    <small class="d-block text-muted">Smart Prompts</small>
                                </div>
                                <div class="feature-item">
                                    <i class="bi bi-lightning text-primary"></i>
                                    <small class="d-block text-muted">Fast Generation</small>
                                </div>
                                <div class="feature-item">
                                    <i class="bi bi-palette text-primary"></i>
                                    <small class="d-block text-muted">Custom Styles</small>
                                </div>
                            </div>
                            <p class="small text-muted">
                                In the meantime, you can use <strong>Pexels regeneration</strong>
                                to get new videos with different keywords and variations.
                            </p>
                        </div>
                        <div class="modal-footer border-0 justify-content-center">
                            <button type="button" class="btn btn-primary" data-bs-dismiss="modal">
                                <i class="bi bi-check me-2"></i>Got it!
                            </button>
                        </div>
                    </div>
                </div>
            `;

            // Add to body
            document.body.appendChild(comingSoonModal);

            // Show modal
            const modalInstance = new bootstrap.Modal(comingSoonModal);
            modalInstance.show();

            // Remove modal from DOM when hidden
            comingSoonModal.addEventListener('hidden.bs.modal', function () {
                comingSoonModal.remove();
            });
        }

        function showLoadingState(sceneId, message) {
            const button = document.querySelector(`button[onclick="regenerateScene(${sceneId})"]`);
            if (button) {
                button.innerHTML = `<i class="bi bi-arrow-clockwise spin"></i> ${message}`;
                button.disabled = true;
            }
        }

        function hideLoadingState(sceneId) {
            const button = document.querySelector(`button[onclick="regenerateScene(${sceneId})"]`);
            if (button) {
                button.innerHTML = '<i class="bi bi-arrow-clockwise me-2"></i>Regenerate';
                button.disabled = false;
            }
        }



        function updateVideoElement(sceneId, newVideoUrl) {
            console.log(`🎥 Starting video update for scene ${sceneId}`);
            console.log(`🎥 New URL: ${newVideoUrl}`);

            if (!newVideoUrl || newVideoUrl.trim() === '') {
                console.error(`❌ Invalid video URL provided: "${newVideoUrl}"`);
                return;
            }

            // Find ONLY the specific video element for this scene
            const videoSelectors = [
                `#video-${sceneId}`, // Primary selector based on HTML structure
                `[data-scene-id="${sceneId}"] video` // Backup selector with scene ID
            ];

            let videoFound = false;

            videoSelectors.forEach(selector => {
                const videoElements = document.querySelectorAll(selector); // Use querySelectorAll to see all matches
                console.log(`🔍 Selector "${selector}" found ${videoElements.length} elements`);

                videoElements.forEach((videoElement, index) => {
                    const elementId = videoElement.id || 'no-id';
                    const parentSceneId = videoElement.closest('[data-scene-id]')?.getAttribute('data-scene-id') || 'no-parent-scene';

                    console.log(`🎥 Element ${index + 1}: ID="${elementId}", Parent Scene="${parentSceneId}"`);

                    // Only update if this is actually the target scene
                    if (elementId === `video-${sceneId}` || parentSceneId === sceneId) {
                        videoFound = true;
                        console.log(`✅ MATCH! Updating video for scene ${sceneId}`);
                        console.log(`🎥 Old URL: ${videoElement.src}`);

                        // Pause the video first
                        videoElement.pause();

                        // Update the src attribute
                        videoElement.src = newVideoUrl;

                        // Update any source elements inside the video
                        const sourceElements = videoElement.querySelectorAll('source');
                        sourceElements.forEach(source => {
                            source.src = newVideoUrl;
                        });

                        // Force reload the video element
                        videoElement.load();

                        // Update any data attributes that might store the URL
                        videoElement.setAttribute('data-video-url', newVideoUrl);

                        console.log(`✅ Updated video element: ${selector} (${elementId})`);
                    } else {
                        console.log(`❌ SKIP! Element ${elementId} doesn't match target scene ${sceneId}`);
                    }
                });
            });

            if (!videoFound) {
                console.error(`❌ No video element found for scene ${sceneId}`);
                console.log('Available video elements:', document.querySelectorAll('video'));
            }

            // Reinitialize the timeline for this scene after video update
            if (videoFound) {
                setTimeout(() => {
                    const timeline = window[`timeline_${sceneId}`];
                    if (timeline) {
                        console.log(`🔄 Reinitializing timeline for scene ${sceneId}`);
                        timeline.initializeTimeline();
                        timeline.updateTimeDisplays();
                    }
                }, 500); // Wait for video to load
            }

            // Also update any video player instances if using a video library
            if (typeof players !== 'undefined' && players) {
                players.forEach(player => {
                    if (player.media && player.media.getAttribute('data-scene-id') == sceneId) {
                        player.source = {
                            type: 'video',
                            sources: [{
                                src: newVideoUrl,
                                type: 'video/mp4'
                            }]
                        };
                        console.log(`✅ Updated player for scene ${sceneId}`);
                    }
                });
            }
        }

        function updateKeywordsDisplay(sceneId, keywords) {
            console.log(`🏷️ Updating keywords for scene ${sceneId}:`, keywords);

            // Find ALL buttons with regenerateScene onclick to see what we're dealing with
            const allButtons = document.querySelectorAll(`button[onclick*="regenerateScene"]`);
            console.log(`🔍 Found ${allButtons.length} regenerate buttons total`);

            // Update the specific regenerate button's data attribute
            const targetButton = document.querySelector(`button[onclick="regenerateScene(${sceneId})"]`);
            if (targetButton) {
                const oldKeywords = targetButton.getAttribute('data-scene-keywords');
                targetButton.setAttribute('data-scene-keywords', keywords.join('; '));
                console.log(`✅ Updated keywords for scene ${sceneId}`);
                console.log(`   Old: "${oldKeywords}"`);
                console.log(`   New: "${keywords.join('; ')}"`);
            } else {
                console.error(`❌ No regenerate button found for scene ${sceneId}`);

                // Debug: show all available buttons
                allButtons.forEach((btn, index) => {
                    const onclick = btn.getAttribute('onclick');
                    console.log(`   Button ${index + 1}: ${onclick}`);
                });
            }
        }

        function showErrorMessage(message) {
            // Force cleanup any remaining modal issues first
            forceModalCleanup();

            // Create a temporary error alert
            const alert = document.createElement('div');
            alert.className = 'alert alert-danger alert-dismissible fade show position-fixed';
            alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
            alert.innerHTML = `
                <i class="bi bi-exclamation-triangle me-2"></i>${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;

            document.body.appendChild(alert);

            // Auto-remove after 8 seconds (longer for errors)
            setTimeout(() => {
                if (alert.parentNode) {
                    alert.remove();
                }
            }, 8000);
        }

        // Overlay Control Functions
        function toggleOverlayControls(sceneId) {
            const controls = document.getElementById(`overlay-controls-${sceneId}`);
            if (controls.style.display === 'none') {
                controls.style.display = 'block';
            } else {
                controls.style.display = 'none';
            }
        }

        function toggleOverlay(sceneId, overlayType, isEnabled) {
            const overlay = document.getElementById(`${overlayType}-overlay-${sceneId}`);
            if (overlay) {
                overlay.style.display = isEnabled ? 'block' : 'none';

                // Show/hide text input for text overlay
                if (overlayType === 'text') {
                    const textInput = document.getElementById(`text-input-${sceneId}`);
                    if (textInput) {
                        textInput.style.display = isEnabled ? 'block' : 'none';
                    }
                }

                console.log(`${overlayType} overlay for scene ${sceneId}: ${isEnabled ? 'enabled' : 'disabled'}`);
            }
        }

        function updateOverlayText(sceneId, text) {
            const textElement = document.querySelector(`#text-overlay-${sceneId} .overlay-text`);
            if (textElement) {
                textElement.textContent = text || 'Your Text Here';
                console.log(`Updated text overlay for scene ${sceneId}: "${text}"`);
            }
        }

        function viewTranscript() {
            // Open transcript in a new window/modal
            const transcriptUrl = `/projects/{{ $project->id }}/transcript`;

            fetch(transcriptUrl)
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        showTranscriptModal(data.data);
                    } else {
                        alert('Error: ' + data.message);
                    }
                })
                .catch(error => {
                    console.error('Error fetching transcript:', error);
                    alert('Failed to load transcript data.');
                });
        }

        function showTranscriptModal(transcriptData) {
            // Create modal HTML
            const modalHtml = `
                <div class="modal fade" id="transcriptModal" tabindex="-1" aria-labelledby="transcriptModalLabel" aria-hidden="true">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="transcriptModalLabel">
                                    <i class="bi bi-file-text"></i> Voiceover Transcript
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <div class="mb-3">
                                    <strong>Project:</strong> ${transcriptData.project_name}<br>
                                    <strong>Words:</strong> ${transcriptData.words_count}<br>
                                    <strong>Duration:</strong> ${transcriptData.duration_seconds.toFixed(2)} seconds
                                </div>
                                <div class="transcript-container" style="max-height: 400px; overflow-y: auto; border: 1px solid #dee2e6; padding: 15px; border-radius: 5px; background-color: #f8f9fa;">
                                    ${transcriptData.transcript.map(word =>
                                        `<span class="transcript-word" data-start="${word.start}" data-end="${word.end}"
                                              style="margin-right: 5px; padding: 2px 4px; border-radius: 3px; cursor: pointer;
                                                     background-color: ${word.confidence > 0.95 ? '#d4edda' : word.confidence > 0.8 ? '#fff3cd' : '#f8d7da'};"
                                              title="Start: ${word.start.toFixed(2)}s, End: ${word.end.toFixed(2)}s, Confidence: ${(word.confidence * 100).toFixed(1)}%">
                                            ${word.word}
                                        </span>`
                                    ).join('')}
                                </div>
                                <div class="mt-3">
                                    <small class="text-muted">
                                        <i class="bi bi-info-circle"></i>
                                        Words are color-coded by confidence:
                                        <span style="background-color: #d4edda; padding: 2px 4px; border-radius: 3px;">High (95%+)</span>
                                        <span style="background-color: #fff3cd; padding: 2px 4px; border-radius: 3px;">Medium (80-95%)</span>
                                        <span style="background-color: #f8d7da; padding: 2px 4px; border-radius: 3px;">Low (<80%)</span>
                                    </small>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Remove existing modal if any
            const existingModal = document.getElementById('transcriptModal');
            if (existingModal) {
                existingModal.remove();
            }

            // Add modal to body
            document.body.insertAdjacentHTML('beforeend', modalHtml);

            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('transcriptModal'));
            modal.show();

            // Add click handlers for transcript words
            document.querySelectorAll('.transcript-word').forEach(wordElement => {
                wordElement.addEventListener('click', function() {
                    const start = this.dataset.start;
                    const end = this.dataset.end;
                    const word = this.textContent;
                    alert(`Word: "${word}"\nStart: ${start}s\nEnd: ${end}s`);
                });
            });
        }

        function confirmAllScenes() {
            if (!confirm('Are you sure you want to confirm all scenes and proceed to subtitle selection?')) {
                return;
            }

            // Collect all scene data with trim information
            const scenesData = [];
            const invalidScenes = [];

            // Get all scenes
            console.log('🔍 Starting scene detection...');
            const sceneCards = document.querySelectorAll('.scene-card');
            console.log(`📊 Found ${sceneCards.length} scene cards`);

            sceneCards.forEach((sceneCard, index) => {
                const sceneContainer = sceneCard.querySelector('[data-scene-id]');
                const sceneId = sceneContainer?.getAttribute('data-scene-id');

                console.log(`🎬 Scene Card ${index + 1}:`, {
                    hasContainer: !!sceneContainer,
                    sceneId: sceneId,
                    containerElement: sceneContainer
                });

                if (!sceneId) {
                    console.warn(`⚠️ Scene card ${index + 1} has no scene ID`);
                    return;
                }

                const timeline = window[`timeline_${sceneId}`];
                // Let's also check the actual video element in the DOM
                const videoElement = document.getElementById(`video-${sceneId}`);
                const videoContainer = document.querySelector(`[data-scene-id="${sceneId}"]`);

                console.log(`🎯 Timeline for scene ${sceneId}:`, {
                    exists: !!timeline,
                    hasVideo: timeline?.video ? true : false,
                    timelineVideoSrc: timeline?.video?.src || 'No timeline video src',
                    timelineVideoDuration: timeline?.video?.duration || 'No timeline duration'
                });

                console.log(`🎥 DOM Video Element for scene ${sceneId}:`, {
                    videoElement: videoElement,
                    videoElementSrc: videoElement?.src || 'No DOM video src',
                    videoElementCurrentSrc: videoElement?.currentSrc || 'No DOM currentSrc',
                    hasSource: videoElement?.querySelector('source') ? true : false,
                    sourceSrc: videoElement?.querySelector('source')?.src || 'No source src',
                    videoContainer: videoContainer,
                    containerDataDuration: videoContainer?.getAttribute('data-duration') || 'No data-duration'
                });

                if (!timeline || !timeline.video) {
                    invalidScenes.push(`Scene ${sceneId}: No timeline or video found`);
                    console.error(`❌ Scene ${sceneId}: Missing timeline or video`);
                    return;
                }

                // Use currentSrc if src is empty (this handles <source> elements)
                const videoUrl = timeline.video.src || timeline.video.currentSrc;
                const videoDuration = timeline.video.duration;

                console.log(`📹 Scene ${sceneId} video details:`, {
                    src: timeline.video.src,
                    currentSrc: timeline.video.currentSrc,
                    finalUrl: videoUrl,
                    duration: videoDuration,
                    isEmpty: !videoUrl || videoUrl.trim() === '' || videoUrl === 'about:blank'
                });

                // Check if video URL is valid and not empty
                if (!videoUrl || videoUrl.trim() === '' || videoUrl === 'about:blank') {
                    invalidScenes.push(`Scene ${sceneId}: Empty or invalid video URL`);
                    console.error(`❌ Scene ${sceneId}: Invalid video URL`);
                    return;
                }

                // Check if video duration is valid
                if (!videoDuration || isNaN(videoDuration) || videoDuration <= 0) {
                    invalidScenes.push(`Scene ${sceneId}: Invalid video duration (${videoDuration})`);
                    return;
                }

                // Calculate actual start and end times based on trim selection
                let startTime, endTime, trimmedDuration;
                
                // Use actual scene percentage for accurate timing when available
                if (timeline.actualScenePercent && timeline.trimStart === 0 && Math.abs(timeline.trimEnd - timeline.actualScenePercent) < 1.0) {
                    // This is the initial scene duration display - use accurate scene timing
                    startTime = 0; // Scene always starts at 0
                    endTime = (timeline.actualScenePercent / 100) * videoDuration;
                    trimmedDuration = parseFloat(timeline.trimSelection.dataset.sceneDuration) || 5;
                    console.log(`🎯 Using actual scene timing: Start: 0s, End: ${endTime.toFixed(2)}s, Duration: ${trimmedDuration}s (${timeline.actualScenePercent.toFixed(2)}%)`);
                } else {
                    // This is user-modified trim - use visual trim timing
                    startTime = (timeline.trimStart / 100) * videoDuration;
                    endTime = (timeline.trimEnd / 100) * videoDuration;
                    trimmedDuration = endTime - startTime;
                    console.log(`📏 Using trim timing: Start: ${startTime.toFixed(2)}s, End: ${endTime.toFixed(2)}s, Duration: ${trimmedDuration}s (${timeline.trimStart}% - ${timeline.trimEnd}%)`);
                }

                // Use original video duration for n8n processing
                const originalDuration = videoDuration;

                // Collect overlay settings (ensure all values are proper types)
                const logoToggle = document.getElementById(`logo-toggle-${sceneId}`);
                const ctaToggle = document.getElementById(`cta-toggle-${sceneId}`);
                const textToggle = document.getElementById(`text-toggle-${sceneId}`);
                const textInput = document.querySelector(`#text-input-${sceneId} input`);

                const overlays = {
                    logo: logoToggle ? logoToggle.checked : false,
                    cta: ctaToggle ? ctaToggle.checked : false,
                    text: textToggle ? textToggle.checked : false,
                    text_content: textInput && textInput.value ? String(textInput.value) : ''
                };

                console.log(`🎨 Scene ${sceneId} overlays:`, overlays);

                scenesData.push({
                    scene_id: parseInt(sceneId),
                    video_url: videoUrl,
                    duration: originalDuration,
                    trimmed_duration: trimmedDuration,
                    start_time: startTime,
                    end_time: endTime,
                    overlays: overlays
                });

                console.log(`📊 Scene ${sceneId} data:`, {
                    video_url: videoUrl,
                    original_duration: originalDuration.toFixed(2),
                    trimmed_duration: trimmedDuration.toFixed(2),
                    start_time: startTime.toFixed(2),
                    end_time: endTime.toFixed(2)
                });
            });

            // Show validation errors if any
            if (invalidScenes.length > 0) {
                console.error('❌ Invalid scenes found:', invalidScenes);
                alert(`Cannot process scenes due to the following issues:\n\n${invalidScenes.join('\n')}\n\nPlease regenerate the problematic scenes or upload custom videos.`);
                return;
            }

            if (scenesData.length === 0) {
                alert('No valid scenes found to process. Please check that all scenes have valid videos.');
                return;
            }

            console.log(`✅ Processing ${scenesData.length} valid scenes`);

            // Show loading state
            const confirmBtn = document.getElementById('confirm-btn');
            const originalText = confirmBtn.innerHTML;
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Processing...';

            // Send data to confirm endpoint
            fetch('{{ route("projects.confirm-scenes", $project) }}', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    scenes: scenesData
                })
            })
            .then(response => {
                console.log('📡 Response status:', response.status);
                console.log('📡 Response headers:', response.headers);

                // Check if response is JSON
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error(`Server returned ${response.status}: Expected JSON but got ${contentType}`);
                }

                return response.json();
            })
            .then(data => {
                console.log('📡 Response data:', data);

                if (data.success) {
                    if (data.redirect_to_subtitles) {
                        // Redirect to subtitle selection
                        console.log('✅ Scenes confirmed, redirecting to subtitle selection...');
                        window.location.href = `{{ route('projects.subtitle-styles', $project) }}`;
                    } else if (data.redirect_to_final) {
                        // Project already completed, redirect to final page
                        console.log('✅ Project already completed, redirecting to final page...');
                        window.location.href = `{{ route('projects.final', $project) }}`;
                    } else if (data.redirect_url) {
                        window.location.href = data.redirect_url;
                    } else {
                        alert(data.message);
                    }
                } else {
                    alert('Error: ' + (data.message || 'Unknown error occurred'));
                    confirmBtn.disabled = false;
                    confirmBtn.innerHTML = originalText;
                }
            })
            .catch(error => {
                console.error('❌ Request failed:', error);

                // Provide more specific error messages
                let errorMessage = 'An error occurred while processing scenes.';
                if (error.message.includes('JSON')) {
                    errorMessage = 'Server error: The server returned an invalid response. Please check the server logs.';
                } else if (error.message.includes('NetworkError')) {
                    errorMessage = 'Network error: Please check your internet connection.';
                } else if (error.message.includes('500')) {
                    errorMessage = 'Server error: Internal server error occurred. Please try again.';
                }

                alert(errorMessage + '\n\nCheck the browser console for more details.');
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = originalText;
            });
        }

        // Force refresh all time displays when page loads
        function forceRefreshAllTimeDisplays() {
            console.log('🔄 Force refreshing all time displays...');
            
            // Get all scenes
            const sceneElements = document.querySelectorAll('[data-scene-id]');
            sceneElements.forEach(sceneElement => {
                const sceneId = sceneElement.dataset.sceneId;
                const timeline = window[`timeline_${sceneId}`];
                
                if (timeline && timeline.updateTimeDisplays) {
                    console.log(`🔄 Refreshing time display for scene ${sceneId}`);
                    timeline.updateTimeDisplays();
                }
            });
        }

        // Manual refresh for a specific scene
        function refreshTimeDisplay(sceneId) {
            console.log(`🔄 Manual refresh requested for scene ${sceneId}`);
            
            const timeline = window[`timeline_${sceneId}`];
            if (timeline && timeline.updateTimeDisplays) {
                timeline.updateTimeDisplays();
                console.log(`✅ Time display refreshed for scene ${sceneId}`);
            } else {
                console.error(`❌ Timeline not found for scene ${sceneId}`);
            }
        }

        // Direct time display fix - bypasses complex logic
        function fixTimeDisplayDirectly(sceneId) {
            console.log(`🔧 Direct fix requested for scene ${sceneId}`);
            
            // Get the scene duration from the data attribute
            const sceneElement = document.querySelector(`[data-scene-id="${sceneId}"]`);
            if (!sceneElement) {
                console.error(`❌ Scene element not found for scene ${sceneId}`);
                return;
            }
            
            const trimSelection = sceneElement.querySelector('.trim-selection');
            if (!trimSelection) {
                console.error(`❌ Trim selection not found for scene ${sceneId}`);
                return;
            }
            
            const sceneDuration = parseFloat(trimSelection.dataset.sceneDuration);
            if (!sceneDuration) {
                console.error(`❌ Scene duration not found for scene ${sceneId}`);
                return;
            }
            
            console.log(`📏 Scene ${sceneId} duration: ${sceneDuration}s`);
            
            // Get time display elements
            const startTimeDisplay = sceneElement.querySelector('.start-time-display');
            const endTimeDisplay = sceneElement.querySelector('.end-time-display');
            
            if (startTimeDisplay && endTimeDisplay) {
                // Set start time to 0, end time to scene duration
                startTimeDisplay.textContent = '0:00.0';
                endTimeDisplay.textContent = formatTime(sceneDuration);
                
                console.log(`✅ Direct fix applied: Start: 0:00.0, End: ${formatTime(sceneDuration)}`);
            } else {
                console.error(`❌ Time display elements not found for scene ${sceneId}`);
            }
        }

        // Global formatTime function
        function formatTime(seconds) {
            if (!seconds || isNaN(seconds)) return '0:00.0';
            const mins = Math.floor(seconds / 60);
            const wholeSecs = Math.floor(seconds % 60);
            const decimal = Math.floor((seconds % 1) * 10);
            return `${mins}:${wholeSecs.toString().padStart(2, '0')}.${decimal}`;
        }

        // Call this when page loads
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🚀 Page loaded, setting up time display refresh...');
            
            // Wait a bit for timelines to initialize, then refresh
            setTimeout(() => {
                forceRefreshAllTimeDisplays();
                
                // Also apply direct fix to all scenes
                console.log('🔧 Applying direct fix to all scenes...');
                const sceneElements = document.querySelectorAll('[data-scene-id]');
                sceneElements.forEach(sceneElement => {
                    const sceneId = sceneElement.dataset.sceneId;
                    fixTimeDisplayDirectly(sceneId);
                });
            }, 1000);
        });




    </script>

@push('scripts')
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
@endpush

@endsection
