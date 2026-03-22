@extends('layouts.app')

@section('title', 'Subtitle Styles - ' . $project->name)

@push('styles')
<meta name="csrf-token" content="{{ csrf_token() }}">
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700;900&family=Open+Sans:wght@400;600;700&family=Cairo:wght@400;700;900&family=Amiri:wght@400;700&family=Scheherazade+New:wght@400;700&display=swap" rel="stylesheet">
<style>
    .subtitle-styles-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem;
    }

    .video-preview-section {
        background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
        border-radius: 20px;
        padding: 2rem;
        margin-bottom: 2rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }

    .video-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
    }

    .video-card {
        background: white;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
        border: 1px solid #e5e7eb;
    }

    .video-card:hover {
        transform: translateY(-8px);
        box-shadow: 0 12px 35px rgba(0, 0, 0, 0.15);
        border-color: #3b82f6;
    }

    .video-wrapper {
        position: relative;
        width: 100%;
        height: 220px;
        background: linear-gradient(135deg, #1f2937, #374151);
        overflow: hidden;
    }

    .video-element {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 0;
    }

    .video-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 100%);
        pointer-events: none;
    }

    .video-controls {
        position: absolute;
        bottom: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.7);
        border-radius: 20px;
        padding: 5px 10px;
        font-size: 0.75rem;
        color: white;
        backdrop-filter: blur(5px);
    }

    .video-info {
        padding: 1.25rem;
        background: linear-gradient(135deg, #f8fafc, #ffffff);
    }

    .scene-title {
        font-weight: 700;
        color: #1f2937;
        margin-bottom: 0.75rem;
        font-size: 1.1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .scene-badge {
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        color: white;
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
    }

    .scene-duration {
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
    }

    .scene-description {
        color: #6b7280;
        font-size: 0.875rem;
        margin: 0.5rem 0;
        line-height: 1.4;
    }

    .trim-timeline {
        margin-top: 0.75rem;
    }

    .timeline-bar {
        width: 100%;
        height: 8px;
        background: #e5e7eb;
        border-radius: 4px;
        position: relative;
        margin-bottom: 0.5rem;
    }

    .trim-indicator {
        position: absolute;
        height: 100%;
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        border-radius: 4px;
        transition: all 0.3s ease;
    }

    .animation-selection {
        margin-top: 1rem;
        padding-top: 0.75rem;
        border-top: 1px solid #e5e7eb;
    }

    .animation-selection .form-label {
        color: #374151;
        font-size: 0.875rem;
        margin-bottom: 0.5rem;
        font-weight: 600;
    }

    .animation-selection .form-select {
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 0.875rem;
        padding: 0.5rem 0.75rem;
        background: white;
        transition: all 0.2s ease;
    }

    .animation-selection .form-select:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        outline: none;
    }

    .animation-selection .form-select:hover {
        border-color: #9ca3af;
    }

    .scene-url {
        font-size: 0.875rem;
        color: #6b7280;
        word-break: break-all;
        background: #f3f4f6;
        padding: 0.5rem;
        border-radius: 6px;
        font-family: 'Courier New', monospace;
        margin-bottom: 0.75rem;
    }

    .video-stats {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.875rem;
        color: #6b7280;
    }

    .video-status {
        display: flex;
        align-items: center;
        gap: 0.25rem;
    }

    .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #10b981;
    }

    .video-loading {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: white;
        font-size: 0.875rem;
        display: none;
    }

    .video-error {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #ef4444;
        text-align: center;
        display: none;
    }

    .styles-section {
        background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
        border-radius: 20px;
        padding: 2rem;
        margin-bottom: 2rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }

    /* Position Selector Styles */
    .position-selector-section {
        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        border-radius: 15px;
        padding: 1.5rem;
        margin-bottom: 2rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    .position-options {
        display: flex;
        justify-content: center;
        gap: 1.5rem;
        flex-wrap: wrap;
    }

    .position-option {
        cursor: pointer;
        text-align: center;
        transition: all 0.3s ease;
        padding: 0.5rem;
        border-radius: 10px;
    }

    .position-option:hover {
        transform: translateY(-2px);
    }

    .position-option.selected {
        background: rgba(59, 130, 246, 0.1);
        border: 2px solid #3b82f6;
    }

    .position-preview {
        width: 80px;
        height: 60px;
        background: #1f2937;
        border-radius: 8px;
        position: relative;
        margin: 0 auto 0.5rem;
        border: 2px solid transparent;
        transition: all 0.3s ease;
    }

    .position-option.selected .position-preview {
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
    }

    .position-indicator {
        position: absolute;
        background: #3b82f6;
        color: white;
        font-size: 0.75rem;
        font-weight: 600;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        white-space: nowrap;
    }

    .position-bottom .position-indicator {
        bottom: 5px;
        left: 50%;
        transform: translateX(-50%);
    }

    .position-center .position-indicator {
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
    }

    .position-top .position-indicator {
        top: 5px;
        left: 50%;
        transform: translateX(-50%);
    }

    .position-name {
        font-size: 0.875rem;
        font-weight: 600;
        color: #374151;
    }

    .position-option.selected .position-name {
        color: #3b82f6;
    }

    /* Modern Music Selection Styles */
    .music-selection-section {
        background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
        border-radius: 20px;
        padding: 2rem;
        margin-bottom: 2rem;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.2);
    }

    /* Header Section */
    .music-header {
        margin-bottom: 2rem;
        text-align: center;
    }

    .music-title-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
    }

    .music-main-title {
        font-size: 1.75rem;
        font-weight: 700;
        color: #1f2937;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin: 0;
    }

    .music-main-title i {
        color: #3b82f6;
        font-size: 1.5rem;
    }

    .music-subtitle {
        color: #6b7280;
        font-size: 1rem;
        margin: 0;
        font-weight: 400;
    }

    /* Controls Section */
    .music-controls-section {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        margin-bottom: 2rem;
    }

    .music-search-wrapper {
        display: flex;
        justify-content: center;
    }

    .search-input-container {
        position: relative;
        width: 100%;
        max-width: 500px;
    }

    .search-icon {
        position: absolute;
        left: 1rem;
        top: 50%;
        transform: translateY(-50%);
        color: #9ca3af;
        font-size: 1.1rem;
        z-index: 2;
    }

    .modern-search-input {
        width: 100%;
        padding: 0.875rem 3rem 0.875rem 2.75rem;
        border: 2px solid #e5e7eb;
        border-radius: 50px;
        font-size: 1rem;
        background: white;
        transition: all 0.3s ease;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }

    .modern-search-input:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1), 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .clear-search-btn {
        position: absolute;
        right: 0.75rem;
        top: 50%;
        transform: translateY(-50%);
        background: #f3f4f6;
        border: none;
        border-radius: 50%;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
        color: #6b7280;
    }

    .clear-search-btn:hover {
        background: #e5e7eb;
        color: #374151;
    }

    /* Categories */
    .music-categories-wrapper {
        display: flex;
        justify-content: center;
    }

    .categories-scroll-container {
        overflow-x: auto;
        padding: 0.25rem;
        max-width: 100%;
    }

    .music-categories {
        display: flex;
        gap: 0.75rem;
        padding: 0.25rem;
        min-width: max-content;
    }

    .category-btn {
        padding: 0.625rem 1.25rem;
        background: white;
        border: 2px solid #e5e7eb;
        border-radius: 50px;
        color: #374151;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 0.875rem;
        font-weight: 500;
        white-space: nowrap;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }

    .category-btn:hover {
        border-color: #3b82f6;
        color: #3b82f6;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }

    .category-btn.active {
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        color: white;
        border-color: #3b82f6;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }

    /* Results Section */
    .music-results-section {
        margin-bottom: 2rem;
    }

    .music-section {
        margin-bottom: 2rem;
    }

    .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1.5rem;
        padding-bottom: 0.75rem;
        border-bottom: 2px solid #f1f5f9;
    }

    .section-title {
        font-size: 1.25rem;
        font-weight: 600;
        color: #1f2937;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin: 0;
    }

    .section-title i {
        color: #3b82f6;
    }

    .section-badge {
        background: linear-gradient(135deg, #f59e0b, #d97706);
        color: white;
        padding: 0.25rem 0.75rem;
        border-radius: 50px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .results-info {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .results-count {
        background: #f1f5f9;
        color: #64748b;
        padding: 0.25rem 0.75rem;
        border-radius: 50px;
        font-size: 0.875rem;
        font-weight: 500;
    }

    .pagination-info {
        background: #e0f2fe;
        color: #0369a1;
        padding: 0.25rem 0.75rem;
        border-radius: 50px;
        font-size: 0.875rem;
        font-weight: 500;
    }

    /* Pagination Styles */
    .pagination-controls {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        margin-top: 2rem;
        padding: 1.5rem 0;
    }

    .pagination-btn {
        background: white;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        padding: 0.75rem 1rem;
        color: #374151;
        cursor: pointer;
        transition: all 0.3s ease;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .pagination-btn:hover:not(:disabled) {
        border-color: #3b82f6;
        color: #3b82f6;
        transform: translateY(-1px);
    }

    .pagination-btn:disabled,
    .pagination-btn.disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
        background: #f9fafb;
        color: #9ca3af;
    }

    .page-numbers {
        display: flex;
        gap: 0.5rem;
    }

    .page-number {
        background: white;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s ease;
        font-weight: 500;
        color: #374151;
    }

    .page-number:hover {
        border-color: #3b82f6;
        color: #3b82f6;
    }

    .page-number.active {
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        border-color: #3b82f6;
        color: white;
    }

    /* Music Grid */
    .music-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1rem;
    }

    @media (max-width: 768px) {
        .music-grid {
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 0.875rem;
        }
    }

    @media (max-width: 480px) {
        .music-grid {
            grid-template-columns: 1fr;
            gap: 0.75rem;
        }
    }

    /* Loading Placeholder */
    .loading-placeholder {
        grid-column: 1 / -1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3rem;
        color: #6b7280;
        gap: 1rem;
    }

    .loading-spinner {
        width: 32px;
        height: 32px;
        border: 3px solid #e5e7eb;
        border-top: 3px solid #3b82f6;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    .loading-spinner-large {
        width: 48px;
        height: 48px;
        border: 4px solid #e5e7eb;
        border-top: 4px solid #3b82f6;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    /* Modern Professional Loading States */
    .modern-loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 400px;
        padding: 4rem 2rem;
        background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        border-radius: 16px;
        border: 1px solid #e2e8f0;
        margin: 2rem auto;
        position: relative;
        overflow: hidden;
        width: 100%;
        max-width: 800px;
    }

    .modern-loading-container::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.1), transparent);
        animation: shimmer 2s infinite;
    }

    .modern-spinner {
        width: 60px;
        height: 60px;
        position: relative;
        margin-bottom: 1.5rem;
    }

    .modern-spinner::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border: 3px solid #e2e8f0;
        border-radius: 50%;
    }

    .modern-spinner::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border: 3px solid transparent;
        border-top: 3px solid #3b82f6;
        border-right: 3px solid #3b82f6;
        border-radius: 50%;
        animation: modernSpin 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    }

    .loading-text {
        color: #475569;
        font-size: 1.1rem;
        font-weight: 500;
        margin-bottom: 0.5rem;
        text-align: center;
    }

    .loading-subtext {
        color: #64748b;
        font-size: 0.875rem;
        text-align: center;
        opacity: 0.8;
    }

    .loading-dots {
        display: inline-flex;
        gap: 4px;
        margin-left: 4px;
    }

    .loading-dots span {
        width: 4px;
        height: 4px;
        background: #64748b;
        border-radius: 50%;
        animation: loadingDots 1.4s infinite ease-in-out;
    }

    .loading-dots span:nth-child(1) { animation-delay: -0.32s; }
    .loading-dots span:nth-child(2) { animation-delay: -0.16s; }
    .loading-dots span:nth-child(3) { animation-delay: 0s; }

    @keyframes modernSpin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    @keyframes shimmer {
        0% { left: -100%; }
        100% { left: 100%; }
    }

    @keyframes loadingDots {
        0%, 80%, 100% {
            transform: scale(0.8);
            opacity: 0.5;
        }
        40% {
            transform: scale(1);
            opacity: 1;
        }
    }

    /* Hide pagination during loading */
    .loading-active .pagination-container {
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
    }

    /* Ensure loading container takes full section space */
    .music-grid:has(.modern-loading-container) {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 400px;
    }

    #searchResultsTracks:has(.modern-loading-container) {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 400px;
    }

    /* Selected Track Section */
    .selected-track-section {
        margin-bottom: 2rem;
        padding: 1.5rem;
        background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
        border: 2px solid #3b82f6;
        border-radius: 16px;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
    }

    .selected-track-card {
        background: white;
        border-radius: 12px;
        padding: 1.5rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        display: flex;
        align-items: center;
        gap: 1rem;
        position: relative;
    }

    .selected-track-info {
        flex: 1;
    }

    .selected-track-name {
        font-size: 1.1rem;
        font-weight: 600;
        color: #1e293b;
        margin-bottom: 0.5rem;
    }

    .selected-track-details {
        display: flex;
        gap: 1rem;
        color: #64748b;
        font-size: 0.875rem;
    }

    .selected-track-actions {
        display: flex;
        gap: 0.75rem;
        align-items: center;
    }

    .download-btn {
        padding: 0.5rem 1rem;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .download-btn:hover {
        background: #2563eb;
        transform: translateY(-1px);
    }

    .remove-track-btn {
        padding: 0.5rem;
        background: #ef4444;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .remove-track-btn:hover {
        background: #dc2626;
        transform: translateY(-1px);
    }

    /* Notification Styles */
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        gap: 0.75rem;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    }

    .notification-success {
        border-left: 4px solid #10b981;
        color: #065f46;
    }

    .notification-success i {
        color: #10b981;
    }

    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    /* Transitions Section */
    .transitions-section {
        background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
        border-radius: 20px;
        padding: 2rem;
        margin-bottom: 2rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }

    .transitions-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1.5rem;
        margin-top: 1rem;
    }

    @media (max-width: 1200px) {
        .transitions-grid {
            grid-template-columns: repeat(3, 1fr);
        }
    }

    @media (max-width: 1024px) {
        .transitions-grid {
            grid-template-columns: repeat(2, 1fr);
        }
    }

    @media (max-width: 640px) {
        .transitions-grid {
            grid-template-columns: 1fr;
        }
    }

    .transition-card {
        background: white;
        border-radius: 12px;
        padding: 1.5rem;
        border: 2px solid #e2e8f0;
        cursor: pointer;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
    }

    .transition-card:hover {
        border-color: #3b82f6;
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(59, 130, 246, 0.15);
    }

    .transition-card.selected {
        border-color: #3b82f6;
        background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
        box-shadow: 0 8px 25px rgba(59, 130, 246, 0.2);
    }

    .transition-preview {
        height: 120px;
        background: #f1f5f9;
        border-radius: 8px;
        margin-bottom: 1rem;
        position: relative;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .transition-demo {
        width: 100%;
        height: 100%;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .demo-clip {
        width: 60px;
        height: 40px;
        border-radius: 4px;
        position: absolute;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 600;
        color: white;
    }

    .demo-clip.clip-1 {
        background: linear-gradient(45deg, #3b82f6, #1d4ed8);
        left: 30px;
    }

    .demo-clip.clip-2 {
        background: linear-gradient(45deg, #10b981, #059669);
        right: 30px;
    }

    .demo-clip::before {
        content: attr(data-label);
        font-size: 10px;
    }

    .transition-name {
        font-size: 1.1rem;
        font-weight: 600;
        color: #1e293b;
        margin-bottom: 0.5rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .transition-description {
        color: #64748b;
        font-size: 0.875rem;
        line-height: 1.4;
    }

    /* Transition Animations */
    .transition-card:hover .fade-demo .clip-1 {
        animation: fadeOut 2s infinite;
    }

    .transition-card:hover .fade-demo .clip-2 {
        animation: fadeIn 2s infinite;
    }

    .transition-card:hover .slide-demo .clip-1 {
        animation: slideOutLeft 2s infinite;
    }

    .transition-card:hover .slide-demo .clip-2 {
        animation: slideInRight 2s infinite;
    }

    .transition-card:hover .zoom-demo .clip-1 {
        animation: zoomOut 2s infinite;
    }

    .transition-card:hover .zoom-demo .clip-2 {
        animation: zoomIn 2s infinite;
    }

    .transition-card:hover .none-demo .clip-1 {
        animation: instantCut1 2s infinite;
    }

    .transition-card:hover .none-demo .clip-2 {
        animation: instantCut2 2s infinite;
    }

    /* Animation Keyframes */
    @keyframes fadeOut {
        0%, 40% { opacity: 1; }
        50%, 90% { opacity: 0; }
        100% { opacity: 1; }
    }

    @keyframes fadeIn {
        0%, 40% { opacity: 0; }
        50%, 90% { opacity: 1; }
        100% { opacity: 0; }
    }

    @keyframes slideOutLeft {
        0%, 40% { transform: translateX(0); }
        50%, 90% { transform: translateX(-100px); }
        100% { transform: translateX(0); }
    }

    @keyframes slideInRight {
        0%, 40% { transform: translateX(100px); }
        50%, 90% { transform: translateX(0); }
        100% { transform: translateX(100px); }
    }

    @keyframes zoomOut {
        0%, 40% { transform: scale(1); }
        50%, 90% { transform: scale(0); }
        100% { transform: scale(1); }
    }

    @keyframes zoomIn {
        0%, 40% { transform: scale(0); }
        50%, 90% { transform: scale(1); }
        100% { transform: scale(0); }
    }

    @keyframes instantCut1 {
        0%, 45% { opacity: 1; }
        50%, 95% { opacity: 0; }
        100% { opacity: 1; }
    }

    @keyframes instantCut2 {
        0%, 45% { opacity: 0; }
        50%, 95% { opacity: 1; }
        100% { opacity: 0; }
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    /* Compact Modern Track Cards */

    /* Blue Wave Card Styles (from Corporate Success Story) */
    .blue-wave-card {
        border-radius: 16px;
        padding: 1.5rem;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
        background: white;
        border: 1px solid #e2e8f0;
        color: #2d3748;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }
    .blue-wave-card:hover {
        border-color: #3b82f6;
        box-shadow: 0 15px 40px rgba(59, 130, 246, 0.15);
        transform: translateY(-3px);
    }
    .blue-wave-card .track-name {
        font-weight: 600;
        font-size: 1rem;
        margin-bottom: 0.5rem;
        position: relative;
        z-index: 2;
    }
    .blue-wave-card .track-info-line {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        margin-bottom: 1rem;
        position: relative;
        z-index: 2;
        flex-wrap: wrap;
    }
    .blue-wave-card .track-artist {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        color: #718096;
    }
    .blue-wave-card .track-duration {
        background: #f7fafc;
        color: #4a5568;
        padding: 0.2rem 0.5rem;
        border-radius: 10px;
        font-size: 0.7rem;
        font-weight: 500;
    }
    .blue-wave-card .track-genre {
        background: #dbeafe;
        color: #1e40af;
        padding: 0.2rem 0.5rem;
        border-radius: 10px;
        font-size: 0.7rem;
        font-weight: 600;
    }
    .blue-wave-card .info-separator {
        width: 3px;
        height: 3px;
        border-radius: 50%;
        opacity: 0.5;
        background: #94a3b8;
    }
    .blue-wave-card .waveform {
        display: flex;
        align-items: center;
        gap: 2px;
        height: 16px;
        margin-bottom: 1rem;
        position: relative;
        z-index: 2;
    }
    .blue-wave-card .wave-bar {
        border-radius: 2px;
        width: 3px;
        background: linear-gradient(135deg, #60a5fa, #3b82f6);
        transition: all 0.3s ease;
    }
    .blue-wave-card.playing .wave-bar {
        animation: wave-pulse 0.7s ease-in-out infinite alternate;
    }
    .blue-wave-card.playing .wave-bar:nth-child(1) { animation-delay: 0.05s; animation-duration: 0.6s; }
    .blue-wave-card.playing .wave-bar:nth-child(2) { animation-delay: 0.12s; animation-duration: 0.5s; }
    .blue-wave-card.playing .wave-bar:nth-child(3) { animation-delay: 0.18s; animation-duration: 0.7s; }
    .blue-wave-card.playing .wave-bar:nth-child(4) { animation-delay: 0.09s; animation-duration: 0.4s; }
    .blue-wave-card.playing .wave-bar:nth-child(5) { animation-delay: 0.15s; animation-duration: 0.8s; }
    .blue-wave-card.playing .wave-bar:nth-child(6) { animation-delay: 0.22s; animation-duration: 0.6s; }
    .blue-wave-card.playing .wave-bar:nth-child(7) { animation-delay: 0.11s; animation-duration: 0.5s; }
    .blue-wave-card.playing .wave-bar:nth-child(8) { animation-delay: 0.19s; animation-duration: 0.7s; }
    .blue-wave-card.playing .wave-bar:nth-child(9) { animation-delay: 0.07s; animation-duration: 0.4s; }
    .blue-wave-card.playing .wave-bar:nth-child(10) { animation-delay: 0.16s; animation-duration: 0.8s; }
    .blue-wave-card.playing .wave-bar:nth-child(11) { animation-delay: 0.23s; animation-duration: 0.6s; }
    .blue-wave-card.playing .wave-bar:nth-child(12) { animation-delay: 0.13s; animation-duration: 0.5s; }
    .blue-wave-card .track-controls {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        position: relative;
        z-index: 2;
    }
    .blue-wave-card .play-btn {
        border: none;
        border-radius: 50%;
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s ease;
        position: relative;
        background: #3b82f6;
        color: white;
        box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
        z-index: 2;
    }
    .blue-wave-card .play-btn:hover {
        transform: scale(1.05);
    }
    .blue-wave-card .progress-ring {
        position: absolute;
        top: -4px;
        left: -4px;
        width: 52px;
        height: 52px;
        border-radius: 50%;
        pointer-events: auto;
        z-index: 2;
        background: none;
        transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
        border: 2px solid transparent;
        box-sizing: border-box;
        cursor: pointer;
    }

    .blue-wave-card .progress-ring:hover {
        border-color: #3b82f6 !important;
        transform: scale(1.05);
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }

    .blue-wave-card.playing .progress-ring:hover::after {
        content: "Click to scrub";
        position: absolute;
        top: -30px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 10px;
        white-space: nowrap;
        pointer-events: none;
        z-index: 1000;
    }
    .blue-wave-card.playing .progress-ring {
        border-color: #3b82f6;
    }
    .blue-wave-card .play-btn.playing {
        background: #ef4444 !important;
    }
    .blue-wave-card .select-btn {
        padding: 0.5rem 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        flex: 1;
        border: 1px solid #3b82f6;
        background: #f7fafc;
        color: #3b82f6;
        border-radius: 20px;
    }

    .blue-wave-card .select-btn:hover {
        background: #3b82f6;
        color: white;
    }

    .blue-wave-card.selected {
        border: 2px solid #3b82f6;
        background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(59, 130, 246, 0.2);
    }

    .blue-wave-card.selected .select-btn {
        background: #3b82f6 !important;
        color: white !important;
        border-color: #3b82f6 !important;
    }

    .blue-wave-card.selected .select-btn:hover {
        background: #2563eb !important;
    }
    @keyframes wave-pulse {
        0% {
            transform: scaleY(1);
            opacity: 0.7;
        }
        100% {
            transform: scaleY(1.8);
            opacity: 1;
        }
    }
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }

    /* Selected Music Section */
    .selected-music-section {
        background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%);
        border: 2px solid #10b981;
        border-radius: 16px;
        padding: 1.5rem;
        margin-top: 2rem;
    }

    .selected-header {
        margin-bottom: 1rem;
    }

    .selected-title {
        font-size: 1.1rem;
        font-weight: 600;
        color: #065f46;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin: 0;
    }

    .selected-title i {
        color: #10b981;
    }

    .selected-music-card {
        background: white;
        border: 1px solid #d1fae5;
        border-radius: 12px;
        padding: 1.25rem;
        display: flex;
        align-items: center;
        gap: 1rem;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.1);
    }

    .selected-music-info {
        flex: 1;
        min-width: 0;
    }

    .selected-track-name {
        font-weight: 700;
        color: #065f46;
        font-size: 1.1rem;
        margin-bottom: 0.25rem;
        line-height: 1.3;
    }

    .selected-track-artist {
        color: #047857;
        font-size: 0.9rem;
        font-weight: 500;
        margin-bottom: 0.5rem;
    }

    .selected-track-actions {
        display: flex;
        gap: 0.75rem;
        align-items: center;
    }

    .download-btn {
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        color: white;
        border: none;
        border-radius: 8px;
        padding: 0.5rem 1rem;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        text-decoration: none;
    }

    .download-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        color: white;
        text-decoration: none;
    }

    .remove-selection-btn {
        background: #ef4444;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 0.5rem 1rem;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .remove-selection-btn:hover {
        background: #dc2626;
        transform: translateY(-1px);
    }

    /* Responsive Design */
    @media (max-width: 768px) {
        .music-selection-section {
            padding: 1.5rem;
        }

        .music-main-title {
            font-size: 1.5rem;
        }

        .music-controls-section {
            gap: 1rem;
        }

        .search-input-container {
            max-width: 100%;
        }

        .categories-scroll-container {
            overflow-x: auto;
        }

        .selected-music-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
        }

        .selected-track-actions {
            width: 100%;
            justify-content: space-between;
        }
    }

    @media (max-width: 480px) {
        .track-controls {
            flex-direction: column;
            gap: 0.5rem;
        }

        .select-btn {
            width: 100%;
        }
    }

    .style-categories {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 2rem;
        margin-bottom: 2rem;
    }

    .style-category {
        border: 2px solid #e5e7eb;
        border-radius: 12px;
        padding: 1.5rem;
        transition: all 0.3s ease;
        cursor: pointer;
    }

    .style-category:hover {
        border-color: #3b82f6;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
    }

    .style-category.selected {
        border-color: #3b82f6;
        background: #eff6ff;
    }

    .style-preview {
        width: 100%;
        height: 80px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 1rem;
        position: relative;
        overflow: hidden;
    }

    .style-text {
        font-weight: 600;
        text-align: center;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        position: relative;
        z-index: 2;
    }

    .style-name {
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 0.5rem;
    }

    .style-description {
        font-size: 0.875rem;
        color: #6b7280;
        line-height: 1.4;
    }

    .action-buttons {
        display: flex;
        gap: 1rem;
        justify-content: center;
        margin-top: 2rem;
    }

    .btn-primary {
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        color: white;
        border: none;
        padding: 0.75rem 2rem;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .btn-primary:hover {
        background: linear-gradient(135deg, #1d4ed8, #1e40af);
        transform: translateY(-2px);
    }

    .btn-secondary {
        background: #f3f4f6;
        color: #374151;
        border: 1px solid #d1d5db;
        padding: 0.75rem 2rem;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .btn-secondary:hover {
        background: #e5e7eb;
    }

    /* TikTok Trending Style - EXACT MATCH from HTML */
    .tiktok-trending-style {
        background: linear-gradient(135deg, #1a1a1a, #333);
        border-radius: 8px;
        padding: 15px 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 120px;
        width: 100%;
        overflow: hidden;
    }

    .tiktok-preview {
        font-family: 'Roboto', 'Segoe UI', Arial, sans-serif;
        font-weight: 700;
        font-size: 18px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        animation: tiktokEntrance 2s ease-out infinite;
        max-width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .tiktok-top {
        color: #fff;
        text-transform: uppercase;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        letter-spacing: 0;
        line-height: 1.2;
        margin-bottom: 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 200px;
    }

    .tiktok-bottom {
        color: #ffe600;
        text-transform: uppercase;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        letter-spacing: 0;
        line-height: 1.2;
        margin-top: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 200px;
    }

    /* Progressive Highlight Style - EXACT MATCH */
    .progressive-highlight-style {
        background: linear-gradient(135deg, #1a1a1a, #333);
        border-radius: 8px;
        padding: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 120px;
    }

    .progressive-words {
        font-family: 'Roboto', 'Segoe UI', Arial, sans-serif;
        font-weight: 700;
        font-size: 24px;
        color: #ffffff;
        text-align: center;
        line-height: 1.2;
    }

    .progressive-word {
        display: inline-block;
        padding: 4px 6px;
        margin: 0 0.5px;
        border-radius: 1px;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        transition: all 0.2s ease;
        transform: scale(1);
    }

    .progressive-word.active {
        background-color: #007acc !important;
        transform: scale(1.05);
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    }

    /* Rectangular Style - EXACT MATCH */
    .rectangular-style {
        background: linear-gradient(135deg, #1a1a1a, #333);
        border-radius: 8px;
        padding: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 120px;
    }

    .rectangular-style .style-text {
        font-family: 'Roboto', Arial, sans-serif;
        font-weight: 700;
        font-size: 18px;
        color: #ffffff;
        background-color: #dc2626;
        padding: 8px 20px;
        border-radius: 0;
        text-align: center;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        letter-spacing: 1px;
        white-space: nowrap;
        animation: rectangularEntrance 4s ease-out infinite;
        margin: 0 auto;
        display: inline-block;
    }

    /* Rounded Progressive Style - EXACT MATCH */
    .rounded-progressive-style {
        background: linear-gradient(135deg, #1a1a1a, #333);
        border-radius: 8px;
        padding: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 120px;
    }

    .rounded-words {
        font-family: 'Roboto', 'Segoe UI', Arial, sans-serif;
        font-weight: 700;
        font-size: 24px;
        color: #ffffff;
        text-align: center;
        line-height: 1.2;
    }

    .rounded-word {
        display: inline-block;
        padding: 4px 6px;
        margin: 0 0.5px;
        border-radius: 8px;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        transition: all 0.2s ease;
        transform: scale(1);
    }

    .rounded-word.active {
        background-color: #8b5cf6 !important;
        transform: scale(1.05);
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    }

    /* Arabic Banner Style - EXACT MATCH */
    .arabic-banner-style {
        background: linear-gradient(135deg, #1a1a1a, #333);
        border-radius: 8px;
        padding: 15px 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 120px;
        width: 100%;
        overflow: hidden;
    }

    .arabic-banner-preview {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
    }

    .arabic-first {
        font-family: 'Cairo', 'Noto Sans Arabic', sans-serif;
        font-weight: 900;
        font-size: 14px;
        color: #ffffff;
        background-color: #ff8800;
        border-radius: 32px;
        padding: 4px 16px;
        text-align: center;
        box-shadow: 0 2px 12px rgba(0,0,0,0.18);
        letter-spacing: 1px;
        animation: bannerEntrance 2s ease-out infinite;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 180px;
    }

    .arabic-second {
        font-family: 'Cairo', 'Noto Sans Arabic', sans-serif;
        font-weight: 900;
        font-size: 14px;
        color: #ff8800;
        background-color: #ffffff;
        border-radius: 32px;
        padding: 4px 16px;
        text-align: center;
        box-shadow: 0 2px 12px rgba(0,0,0,0.18);
        letter-spacing: 1px;
        animation: bannerEntranceDelayed 2s ease-out infinite;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 180px;
    }

    /* Rectangular Banner Style - EXACT MATCH */
    .rectangular-banner-style {
        background: linear-gradient(135deg, #1a1a1a, #333);
        border-radius: 8px;
        padding: 15px 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 120px;
        width: 100%;
        overflow: hidden;
    }

    .rectangular-banner-preview {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
    }

    .rect-first {
        font-family: 'Roboto', Arial, sans-serif;
        font-weight: 900;
        font-size: 14px;
        color: #ffffff;
        background-color: #10b981;
        border-radius: 0;
        padding: 6px 18px;
        text-align: center;
        text-transform: uppercase;
        box-shadow: 0 2px 12px rgba(0,0,0,0.18);
        letter-spacing: 1px;
        animation: bannerEntrance 2s ease-out infinite;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 180px;
    }

    .rect-second {
        font-family: 'Roboto', Arial, sans-serif;
        font-weight: 900;
        font-size: 14px;
        color: #10b981;
        background-color: #ffffff;
        border-radius: 0;
        padding: 6px 18px;
        text-align: center;
        text-transform: uppercase;
        box-shadow: 0 2px 12px rgba(0,0,0,0.18);
        letter-spacing: 1px;
        animation: bannerEntranceDelayed 2s ease-out infinite;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 180px;
    }

    /* Animation keyframes matching HTML file specifications */
    @keyframes tiktokEntrance {
        0% { opacity: 0; transform: scale(0.8) translateY(-20px); }
        12.5% { opacity: 1; transform: scale(1) translateY(0px); }
        75% { opacity: 1; transform: scale(1) translateY(0px); }
        100% { opacity: 0; transform: scale(0.8) translateY(20px); }
    }

    @keyframes rectangularEntrance {
        0% { opacity: 0; transform: scale(0.8) translateY(-20px); }
        10% { opacity: 1; transform: scale(1) translateY(0px); }
        80% { opacity: 1; transform: scale(1) translateY(0px); }
        100% { opacity: 0; transform: scale(0.8) translateY(20px); }
    }

    @keyframes bannerEntrance {
        0% { opacity: 0; transform: translateY(-25px); }
        25% { opacity: 1; transform: translateY(0px); }
        75% { opacity: 1; transform: translateY(0px); }
        100% { opacity: 0; transform: translateY(-25px); }
    }

    @keyframes bannerEntranceDelayed {
        0% { opacity: 0; transform: translateY(-25px); }
        40% { opacity: 0; transform: translateY(-25px); }
        65% { opacity: 1; transform: translateY(0px); }
        75% { opacity: 1; transform: translateY(0px); }
        100% { opacity: 0; transform: translateY(-25px); }
    }

    @keyframes rainbow {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
    }

    /* Progressive word highlighting animations */
    @keyframes progressiveWordHighlight {
        0% {
            background-color: transparent;
            transform: scale(1);
        }
        20% {
            background-color: #007acc;
            transform: scale(1.05);
        }
        80% {
            background-color: #007acc;
            transform: scale(1.05);
        }
        100% {
            background-color: transparent;
            transform: scale(1);
        }
    }

    @keyframes roundedWordHighlight {
        0% {
            background-color: transparent;
            transform: scale(1);
        }
        20% {
            background-color: #8b5cf6;
            transform: scale(1.05);
        }
        80% {
            background-color: #8b5cf6;
            transform: scale(1.05);
        }
        100% {
            background-color: transparent;
            transform: scale(1);
        }
    }

    .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    }

    .loading-content {
        background: white;
        padding: 2rem;
        border-radius: 12px;
        text-align: center;
    }
</style>
@endpush

@section('content')
<div class="subtitle-styles-container" style="max-width: 100%; margin: 0; padding: 0;">
    <!-- Two-column layout: Controls (left) + Live preview (right) -->
    <div style="display:grid; grid-template-columns:1fr 1fr; width:100%;">
        <!-- LEFT COLUMN — Existing controls -->
        <div style="min-width:0; overflow:hidden; height:100vh; overflow-y:auto; padding:20px;">
    <!-- Header -->
    <div class="text-center mb-4">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">
            <i class="bi bi-fonts me-2"></i>Choose Subtitle Style
        </h1>
        <p class="text-gray-600">Select a subtitle style for your video scenes</p>
        @if($project->edit_state)
        <a href="{{ route('projects.preview', $project) }}"
           target="_blank"
           class="btn btn-outline-info mt-3">
            ▶ Preview Current Edit
        </a>
        @endif
    </div>

    <!-- Video Preview Section -->
    <div class="video-preview-section">
        <div class="music-header">
            <div class="music-title-section">
                <h2 class="music-main-title">
                    <i class="bi bi-play-circle"></i>
                    Your Trimmed Videos
                </h2>
                <p class="music-subtitle">Review your video clips before adding transitions and subtitles</p>
            </div>
        </div>
        <div class="video-grid" id="videoGrid">
            <!-- Videos will be loaded here by JavaScript -->
        </div>
    </div>

    <!-- Transitions Section -->
    <div class="transitions-section">
        <div class="music-header">
            <div class="music-title-section">
                <h2 class="music-main-title">
                    <i class="bi bi-arrow-left-right"></i>
                    Choose Transition Effect
                </h2>
                <p class="music-subtitle">Select how your video clips will transition between each other</p>
            </div>
        </div>

        <div class="transitions-grid">
            <!-- Fade Transition -->
            <div class="transition-card" data-transition="fade" onclick="selectTransition('fade')">
                <div class="transition-preview">
                    <div class="transition-demo fade-demo">
                        <div class="demo-clip clip-1"></div>
                        <div class="demo-clip clip-2"></div>
                    </div>
                </div>
                <div class="transition-info">
                    <h3 class="transition-name">
                        <i class="bi bi-circle-half"></i>
                        Fade
                    </h3>
                    <p class="transition-description">Smooth fade-out/fade-in effect for professional, seamless transitions</p>
                </div>
            </div>

            <!-- Slide Left Transition -->
            <div class="transition-card" data-transition="slide-left" onclick="selectTransition('slide-left')">
                <div class="transition-preview">
                    <div class="transition-demo slide-demo">
                        <div class="demo-clip clip-1"></div>
                        <div class="demo-clip clip-2"></div>
                    </div>
                </div>
                <div class="transition-info">
                    <h3 class="transition-name">
                        <i class="bi bi-arrow-left"></i>
                        Slide Left
                    </h3>
                    <p class="transition-description">Slide from right to left for dynamic motion</p>
                </div>
            </div>

            <!-- Slide Right Transition -->
            <div class="transition-card" data-transition="slide-right" onclick="selectTransition('slide-right')">
                <div class="transition-preview">
                    <div class="transition-demo slide-demo">
                        <div class="demo-clip clip-1"></div>
                        <div class="demo-clip clip-2"></div>
                    </div>
                </div>
                <div class="transition-info">
                    <h3 class="transition-name">
                        <i class="bi bi-arrow-right"></i>
                        Slide Right
                    </h3>
                    <p class="transition-description">Slide from left to right for engaging content</p>
                </div>
            </div>

            <!-- Slide Up Transition -->
            <div class="transition-card" data-transition="slide-up" onclick="selectTransition('slide-up')">
                <div class="transition-preview">
                    <div class="transition-demo slide-demo">
                        <div class="demo-clip clip-1"></div>
                        <div class="demo-clip clip-2"></div>
                    </div>
                </div>
                <div class="transition-info">
                    <h3 class="transition-name">
                        <i class="bi bi-arrow-up"></i>
                        Slide Up
                    </h3>
                    <p class="transition-description">Slide from bottom to top for upward motion</p>
                </div>
            </div>

            <!-- Slide Down Transition -->
            <div class="transition-card" data-transition="slide-down" onclick="selectTransition('slide-down')">
                <div class="transition-preview">
                    <div class="transition-demo slide-demo">
                        <div class="demo-clip clip-1"></div>
                        <div class="demo-clip clip-2"></div>
                    </div>
                </div>
                <div class="transition-info">
                    <h3 class="transition-name">
                        <i class="bi bi-arrow-down"></i>
                        Slide Down
                    </h3>
                    <p class="transition-description">Slide from top to bottom for downward motion</p>
                </div>
            </div>

            <!-- Zoom In Transition -->
            <div class="transition-card" data-transition="zoom-in" onclick="selectTransition('zoom-in')">
                <div class="transition-preview">
                    <div class="transition-demo zoom-demo">
                        <div class="demo-clip clip-1"></div>
                        <div class="demo-clip clip-2"></div>
                    </div>
                </div>
                <div class="transition-info">
                    <h3 class="transition-name">
                        <i class="bi bi-zoom-in"></i>
                        Zoom In
                    </h3>
                    <p class="transition-description">Zoom in effect that adds excitement and drama</p>
                </div>
            </div>

            <!-- Zoom Out Transition -->
            <div class="transition-card" data-transition="zoom-out" onclick="selectTransition('zoom-out')">
                <div class="transition-preview">
                    <div class="transition-demo zoom-demo">
                        <div class="demo-clip clip-1"></div>
                        <div class="demo-clip clip-2"></div>
                    </div>
                </div>
                <div class="transition-info">
                    <h3 class="transition-name">
                        <i class="bi bi-zoom-out"></i>
                        Zoom Out
                    </h3>
                    <p class="transition-description">Zoom out effect for dramatic reveals</p>
                </div>
            </div>

            <!-- Crossfade Transition -->
            <div class="transition-card" data-transition="crossfade" onclick="selectTransition('crossfade')">
                <div class="transition-preview">
                    <div class="transition-demo fade-demo">
                        <div class="demo-clip clip-1"></div>
                        <div class="demo-clip clip-2"></div>
                    </div>
                </div>
                <div class="transition-info">
                    <h3 class="transition-name">
                        <i class="bi bi-arrow-left-right"></i>
                        Crossfade
                    </h3>
                    <p class="transition-description">Crossfade effect (same as fade) for smooth transitions</p>
                </div>
            </div>

            <!-- Wipe Left Transition -->
            <div class="transition-card" data-transition="wipe-left" onclick="selectTransition('wipe-left')">
                <div class="transition-preview">
                    <div class="transition-demo slide-demo">
                        <div class="demo-clip clip-1"></div>
                        <div class="demo-clip clip-2"></div>
                    </div>
                </div>
                <div class="transition-info">
                    <h3 class="transition-name">
                        <i class="bi bi-arrow-left"></i>
                        Wipe Left
                    </h3>
                    <p class="transition-description">Wipe from right to left for sharp transitions</p>
                </div>
            </div>

            <!-- Wipe Right Transition -->
            <div class="transition-card" data-transition="wipe-right" onclick="selectTransition('wipe-right')">
                <div class="transition-preview">
                    <div class="transition-demo slide-demo">
                        <div class="demo-clip clip-1"></div>
                        <div class="demo-clip clip-2"></div>
                    </div>
                </div>
                <div class="transition-info">
                    <h3 class="transition-name">
                        <i class="bi bi-arrow-right"></i>
                        Wipe Right
                    </h3>
                    <p class="transition-description">Wipe from left to right for sharp transitions</p>
                </div>
            </div>

            <!-- Bounce Transition -->
            <div class="transition-card" data-transition="bounce" onclick="selectTransition('bounce')">
                <div class="transition-preview">
                    <div class="transition-demo zoom-demo">
                        <div class="demo-clip clip-1"></div>
                        <div class="demo-clip clip-2"></div>
                    </div>
                </div>
                <div class="transition-info">
                    <h3 class="transition-name">
                        <i class="bi bi-arrow-clockwise"></i>
                        Bounce
                    </h3>
                    <p class="transition-description">Bounce effect with spring animation for playful content</p>
                </div>
            </div>

            <!-- None Transition -->
            <div class="transition-card" data-transition="none" onclick="selectTransition('none')">
                <div class="transition-preview">
                    <div class="transition-demo none-demo">
                        <div class="demo-clip clip-1"></div>
                        <div class="demo-clip clip-2"></div>
                    </div>
                </div>
                <div class="transition-info">
                    <h3 class="transition-name">
                        <i class="bi bi-scissors"></i>
                        None
                    </h3>
                    <p class="transition-description">Instant cuts for fast-paced content and quick montages</p>
                </div>
            </div>
        </div>
    </div>

    <!-- Processing Section (Initially visible for uploaded voiceovers) -->
    <div class="processing-section" id="processingSection" style="display: {{ $project->voiceover_option === 'upload' && !$project->voiceover_url ? 'block' : 'none' }};">
        <div class="text-center py-5">
            <div class="spinner-border text-primary mb-3" role="status" style="width: 3rem; height: 3rem;">
                <span class="visually-hidden">Loading...</span>
            </div>
            <h3 class="text-xl font-semibold mb-2">Preparing Voiceover</h3>
            <p class="text-gray-600 mb-3">Uploading your voiceover file and preparing for subtitle generation...</p>
            <div class="progress" style="height: 8px;">
                <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style="width: 100%"></div>
            </div>
        </div>
    </div>

    <!-- Music Selection Section -->
    <div class="music-selection-section" id="musicSection" style="display: {{ $project->voiceover_option === 'upload' && !$project->voiceover_url ? 'none' : 'block' }};">
        <div class="music-header">
            <div class="music-title-section">
                <h2 class="music-main-title">
                    <i class="bi bi-music-note-beamed"></i>
                    Background Music
                </h2>
                <p class="music-subtitle">Choose the perfect soundtrack for your video</p>
            </div>
        </div>

        <!-- Search and Filter Controls -->
        <div class="music-controls-section">
            <!-- Search Bar -->
            <div class="music-search-wrapper">
                <div class="search-input-container">
                    <i class="bi bi-search search-icon"></i>
                    <input type="text" id="musicSearchInput" class="modern-search-input" placeholder="Search for music..." />
                    <button type="button" id="clearSearchBtn" class="clear-search-btn" style="display: none;">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
            </div>

            <!-- Categories Pills -->
            <div class="music-categories-wrapper">
                <div class="categories-scroll-container">
                    <div class="music-categories" id="musicCategories">
                        <!-- Categories will be loaded here -->
                    </div>
                </div>
            </div>
        </div>

        <!-- Music Results -->
        <div class="music-results-section">
            <!-- Trending Tracks -->
            <div class="music-section" id="trendingSection">
                <div class="section-header">
                    <h3 class="section-title">
                        <i class="bi bi-music-note-beamed"></i>
                        Featured Music Mix
                    </h3>
                    <div class="section-badge">4 Corporate + 5 Energetic</div>
                </div>
                <div class="music-grid" id="trendingTracks">
                    <div class="loading-placeholder">
                        <div class="loading-spinner"></div>
                        <span>Loading corporate music...</span>
                    </div>
                </div>
            </div>

            <!-- Search Results -->
            <div class="music-section" id="searchSection" style="display: none;">
                <div class="section-header">
                    <h3 class="section-title">
                        <i class="bi bi-search"></i>
                        Search Results
                    </h3>
                    <div class="results-info">
                        <div class="results-count" id="resultsCount">0 tracks</div>
                        <div class="pagination-info" id="paginationInfo" style="display: none;">
                            Page <span id="currentPage">1</span> of <span id="totalPages">1</span>
                        </div>
                    </div>
                </div>
                <div class="music-grid" id="searchResultsTracks">
                    <!-- Search results will be loaded here -->
                </div>
                <!-- Pagination Controls -->
                <div class="pagination-controls" id="paginationControls" style="display: none;">
                    <button class="pagination-btn" id="prevPageBtn" onclick="changePage(-1)">
                        <i class="bi bi-chevron-left"></i>
                        Previous
                    </button>
                    <div class="page-numbers" id="pageNumbers">
                        <!-- Page numbers will be generated here -->
                    </div>
                    <button class="pagination-btn" id="nextPageBtn" onclick="changePage(1)">
                        Next
                        <i class="bi bi-chevron-right"></i>
                    </button>
                </div>
            </div>
        </div>

        <!-- Selected Music Track -->
        <div class="selected-track-section" id="selectedTrackSection" style="display: none;">
            <div class="section-header">
                <h3 class="section-title">
                    <i class="bi bi-music-note-beamed"></i>
                    Selected Background Music
                </h3>
            </div>
            <div class="selected-track-card" id="selectedTrackCard">
                <!-- Selected track will be displayed here -->
            </div>
        </div>

    </div>

    <!-- Subtitle Styles Section -->
    <div class="styles-section" id="stylesSection" style="display: {{ $project->voiceover_option === 'upload' && !$project->voiceover_url ? 'none' : 'block' }};">
        <div class="music-header">
            <div class="music-title-section">
                <h2 class="music-main-title">
                    <i class="bi bi-palette"></i>
                    Subtitle Styles
                </h2>
                <p class="music-subtitle">Choose the perfect text style for your video subtitles</p>
            </div>
        </div>
        
        <!-- Subtitle Position Selector -->
        <div class="position-selector-section mb-4">
            <div class="music-header">
                <div class="music-title-section">
                    <h3 class="music-main-title" style="font-size: 1.25rem;">
                        <i class="bi bi-arrows-move"></i>
                        Subtitle Position
                    </h3>
                    <p class="music-subtitle">Choose where to display subtitles on the video</p>
                </div>
            </div>
            
            <div class="position-options d-flex justify-content-center gap-3">
                <div class="position-option" data-position="bottom">
                    <div class="position-preview position-bottom">
                        <div class="position-indicator">Bottom</div>
                    </div>
                    <div class="position-name">Bottom</div>
                </div>
                <div class="position-option" data-position="center">
                    <div class="position-preview position-center">
                        <div class="position-indicator">Center</div>
                    </div>
                    <div class="position-name">Center</div>
                </div>
                <div class="position-option" data-position="top">
                    <div class="position-preview position-top">
                        <div class="position-indicator">Top</div>
                    </div>
                    <div class="position-name">Top</div>
                </div>
            </div>
        </div>

        <div class="style-categories" id="styleCategories">
            <!-- TikTok Trending Style -->
            <div class="style-category" data-style="tiktok_trending">
                <div class="style-preview tiktok-trending-style">
                    <div class="tiktok-preview">
                        <span class="tiktok-top">VIRAL CONTENT</span>
                        <span class="tiktok-bottom">TRENDING NOW</span>
                    </div>
                </div>
                <div class="style-name">TikTok Trending</div>
                <div class="style-description">Two-line format with white top text and yellow bottom text. Perfect for viral social media content.</div>
            </div>

            <!-- Progressive Highlight Style -->
            <div class="style-category" data-style="progressive_highlight">
                <div class="style-preview progressive-highlight-style">
                    <div class="progressive-words">
                        <span class="progressive-word">WORD</span>
                        <span class="progressive-word active">BY</span>
                        <span class="progressive-word">WORD</span>
                        <span class="progressive-word">HIGHLIGHTING</span>
                    </div>
                </div>
                <div class="style-name">Progressive Highlight</div>
                <div class="style-description">Word-by-word highlighting with blue background. One word at a time with scale effect.</div>
            </div>

            <!-- Rectangular Style -->
            <div class="style-category" data-style="rectangular">
                <div class="style-preview rectangular-style">
                    <div class="style-text">COOL SUBTITLE</div>
                </div>
                <div class="style-name">Rectangular</div>
                <div class="style-description">Single line with red background and sharp corners. Centered vertically with entrance animation.</div>
            </div>

            <!-- Rounded Progressive Style -->
            <div class="style-category" data-style="rounded_progressive">
                <div class="style-preview rounded-progressive-style">
                    <div class="rounded-words">
                        <span class="rounded-word">ROUNDED</span>
                        <span class="rounded-word active">PROGRESSIVE</span>
                        <span class="rounded-word">HIGHLIGHTING</span>
                    </div>
                </div>
                <div class="style-name">Rounded Progressive</div>
                <div class="style-description">Word-by-word highlighting with purple background and 8px rounded corners.</div>
            </div>

            <!-- Arabic Banner Style -->
            <div class="style-category" data-style="arabic_banner">
                <div class="style-preview arabic-banner-style">
                    <div class="arabic-banner-preview">
                        <div class="arabic-first">مرحباً بكم</div>
                        <div class="arabic-second">اشتركوا الآن</div>
                    </div>
                </div>
                <div class="style-name">Arabic Banner</div>
                <div class="style-description">Two banners with 32px rounded corners. First: orange bg/white text, Second: white bg/orange text.</div>
            </div>

            <!-- Rectangular Banner Style -->
            <div class="style-category" data-style="rectangular_banner">
                <div class="style-preview rectangular-banner-style">
                    <div class="rectangular-banner-preview">
                        <div class="rect-first">SHARP BANNER</div>
                        <div class="rect-second">SUBSCRIBE NOW</div>
                    </div>
                </div>
                <div class="style-name">Rectangular Banner</div>
                <div class="style-description">Two banners with sharp corners. First: green bg/white text, Second: white bg/green text.</div>
            </div>
        </div>



        <!-- Action Buttons -->
        <div class="action-buttons">
            <button type="button" class="btn-secondary" onclick="goBack()">
                <i class="bi bi-arrow-left me-2"></i>Back to Review
            </button>
            <button type="button" class="btn-secondary" onclick="goToDashboard()">
                <i class="bi bi-house me-2"></i>Dashboard
            </button>
            <button type="button" class="btn-primary" onclick="generateSubtitles()" id="generateBtn">
                <i class="bi bi-magic me-2"></i>Generate Subtitles
            </button>
            <button type="button" class="btn-outline-info btn-sm ms-2" onclick="testRoute()">
                <i class="bi bi-bug me-2"></i>Test Route
            </button>
            <button type="button" class="btn-outline-warning btn-sm ms-2" onclick="testSimpleGeneration()">
                <i class="bi bi-lightning me-2"></i>Test Simple
            </button>
        </div>
    </div>
        </div><!-- Close left column -->

        <!-- RIGHT COLUMN — Live preview panel -->
        <div style="
            position: sticky;
            top: 0;
            height: 100vh;
            display: flex;
            flex-direction: column;
            background: #0D1117;
            border-left: 1px solid #1E2D40;
            overflow: hidden;
        ">
            {{-- Header --}}
            <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 14px 20px;
                border-bottom: 1px solid #1E2D40;
                flex-shrink: 0;
            ">
                <span style="color:#F1F5F9; font-size:15px; font-weight:700;">Live Preview</span>
                <span id="preview-status" style="color:#475569; font-size:12px;">Waiting...</span>
            </div>

            {{-- Player area --}}
            <div style="
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #080B11;
                overflow: hidden;
                padding: 16px;
                min-height: 0;
            ">
                <div id="vidsai-preview-root" style="
                    width: 100%;
                    height: 100%;
                    min-height: 400px;
                    color: #475569;
                    font-size: 13px;
                    font-family: Arial;
                    text-align: center;
                ">
                    Loading preview...
                </div>
            </div>

            {{-- Selections summary --}}
            <div style="
                padding: 14px 20px;
                border-top: 1px solid #1E2D40;
                display: flex;
                flex-direction: column;
                gap: 6px;
                flex-shrink: 0;
                background: #0D1117;
            ">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="color:#475569; font-size:12px;">Style</span>
                    <span id="preview-style-label" style="color:#F1F5F9; font-size:12px; font-weight:600;">—</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="color:#475569; font-size:12px;">Transition</span>
                    <span id="preview-transition-label" style="color:#F1F5F9; font-size:12px; font-weight:600;">—</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="color:#475569; font-size:12px;">Music</span>
                    <span id="preview-music-label" style="color:#F1F5F9; font-size:12px; font-weight:600;">—</span>
                </div>
            </div>

            {{-- Render button --}}
            <div style="padding: 14px 20px; flex-shrink: 0; border-top: 1px solid #1E2D40;">
                <button
                    onclick="generateSubtitles()"
                    style="
                        width: 100%;
                        padding: 13px;
                        background: #2563EB;
                        color: #F1F5F9;
                        border: none;
                        border-radius: 8px;
                        font-size: 14px;
                        font-weight: 700;
                        cursor: pointer;
                        font-family: Arial;
                    "
                >
                    🚀 Start Rendering
                </button>
                <button onclick="openEditor()" style="
                    display:block; width:100%; padding:11px; margin-top:8px;
                    background:#1E2D40; color:#F1F5F9;
                    border:1px solid #2D3F55; border-radius:8px;
                    font-size:13px; font-weight:600; cursor:pointer;
                    font-family:Arial; text-align:center;
                ">
                    ✏️ Open Editor
                </button>
            </div>
        </div><!-- Close right column -->
    </div><!-- Close grid row -->
</div>

<!-- Loading Overlay -->
<div class="loading-overlay" id="loadingOverlay">
    <div class="loading-content">
        <div class="spinner-border text-primary mb-3" role="status">
            <span class="visually-hidden">Loading...</span>
        </div>
        <h5>Generating Subtitles...</h5>
        <p class="text-muted">This may take a few moments</p>
    </div>
</div>
@endsection

<script>
// Immediate trending music loader - bypasses cache
document.addEventListener('DOMContentLoaded', function() {







            // Ripple effect for all buttons
            document.addEventListener('click', function(e) {
                const button = e.target.closest('button');
                if (!button) return;
                const ripple = document.createElement('span');
                const rect = button.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;
                ripple.style.cssText = `
                    position: absolute;
                    width: ${size}px;
                    height: ${size}px;
                    left: ${x}px;
                    top: ${y}px;
                    background: rgba(255, 255, 255, 0.5);
                    border-radius: 50%;
                    transform: scale(0);
                    animation: ripple 0.6s linear;
                    pointer-events: none;
                `;
                button.style.position = 'relative';
                button.style.overflow = 'hidden';
                button.appendChild(ripple);
                setTimeout(() => {
                    ripple.remove();
                }, 600);
            });
}); // <--- FIX FOR UNEXPECTED END OF INPUT
</script>

@push('scripts')
<script>
    let trimmedVideos = [];
    let selectedStyle = 'tiktok_trending'; // Default style - first in HTML file
    let currentStyleConfig = null; // Current style configuration - will be set after styleConfigs is defined
    let selectedMusicTrack = null; // Selected music track
    let selectedTransition = 'fade'; // Default transition
    let selectedPosition = 'bottom'; // Default position

    window.selectedStyle = selectedStyle;
    window.selectedTransition = selectedTransition;
    window.selectedMusicTrack = selectedMusicTrack;
    window.currentStyleConfig = currentStyleConfig;

    // Project scene videos data
    const projectSceneVideos = @json($sceneVideos);
    
    // Live preview state injection
    window.__EDIT_STATE__ = @json($project->edit_state ?? null);
    window.__PROJECT_ID__ = {{ $project->id }};
    
    // Debug: Log the scene videos data immediately
    console.log('🔍 DEBUG: projectSceneVideos from PHP:', projectSceneVideos);
    console.log('🔍 DEBUG: projectSceneVideos type:', typeof projectSceneVideos);
    console.log('🔍 DEBUG: projectSceneVideos length:', projectSceneVideos ? projectSceneVideos.length : 'null');
    if (projectSceneVideos && projectSceneVideos.length > 0) {
        console.log('🔍 DEBUG: First scene:', projectSceneVideos[0]);
    }
    
    // Debug: Check if videoGrid element exists
    document.addEventListener('DOMContentLoaded', function() {
        const videoGrid = document.getElementById('videoGrid');
        console.log('🔍 DEBUG: videoGrid element found:', !!videoGrid);
        if (videoGrid) {
            console.log('🔍 DEBUG: videoGrid innerHTML:', videoGrid.innerHTML);
        }
    });

    // Global audio playback variables and functions
    let currentAudio = null;
    let currentButton = null;
    let currentCard = null;
    let progressInterval = null;
    let startTime = null;

    function togglePlayback(button, url, durationSeconds, trackId) {
        const icon = button.querySelector('i');
        const card = button.closest('.blue-wave-card');

        if (currentButton && currentButton !== button) {
            stopCurrentAudio();
        }

        if (button.classList.contains('playing')) {
            pauseCurrentAudio();
        } else {
            currentButton = button;
            currentCard = card;
            button.classList.add('playing');
            card.classList.add('playing');
            icon.className = 'bi bi-pause-fill';
            startProgressAnimation(button, durationSeconds);
            currentAudio = new Audio(url);
            currentAudio.volume = 0.7;
            currentAudio.play().catch(e => console.log('Audio play failed:', e));
            currentAudio.addEventListener('ended', () => {
                stopCurrentAudio();
            });
        }
    }

    function startProgressAnimation(button, durationSeconds) {
        startTime = Date.now();
        const totalDuration = durationSeconds * 1000;
        const trackId = button.getAttribute('data-track-id') || button.closest('.blue-wave-card').getAttribute('data-track-id');
        const ring = document.getElementById('progress-ring-' + trackId);
        if (ring) {
            ring.style.borderColor = '#3b82f6';
        }
        progressInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min((elapsed / totalDuration) * 360, 360);
            if (progress >= 360) {
                stopCurrentAudio();
                return;
            }
            updateProgressRing(trackId, progress);
        }, 50);
    }

    function pauseCurrentAudio() {
        if (currentAudio) {
            currentAudio.pause();
        }
        if (currentButton) {
            currentButton.classList.remove('playing');
            currentButton.querySelector('i').className = 'bi bi-play-fill';
        }
        if (currentCard) {
            currentCard.classList.remove('playing');
            // Remove ring progress and outline
            const trackId = currentCard.getAttribute('data-track-id');
            const ring = document.getElementById('progress-ring-' + trackId);
            if (ring) {
                ring.style.background = '';
                ring.style.borderColor = 'transparent';
            }
        }
        if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
        }
    }

    function stopCurrentAudio() {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
            currentAudio = null;
        }
        if (currentButton) {
            currentButton.classList.remove('playing');
            currentButton.querySelector('i').className = 'bi bi-play-fill';
        }
        if (currentCard) {
            // Remove ring progress and outline
            const trackId = currentCard.getAttribute('data-track-id');
            const ring = document.getElementById('progress-ring-' + trackId);
            if (ring) {
                ring.style.background = '';
                ring.style.borderColor = 'transparent';
            }
            currentCard.classList.remove('playing');
            currentCard = null;
        }
        if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
        }
        startTime = null;
    }

    function initializeTransitionSelection() {
        // Set default transition as selected
        selectTransition('fade');
    }

    function selectTransition(transitionType) {
        console.log('🎬 Selecting transition:', transitionType);

        selectedTransition = transitionType;
        window.selectedTransition = selectedTransition;

        // Update visual selection
        document.querySelectorAll('.transition-card').forEach(card => {
            card.classList.remove('selected');
        });

        const selectedCard = document.querySelector(`[data-transition="${transitionType}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }

        // Show selection feedback
        showTransitionFeedback(transitionType);
    }

    function showTransitionFeedback(transitionType) {
        const transitionNames = {
            'fade': 'Fade Transition',
            'slide-left': 'Slide Left Transition',
            'slide-right': 'Slide Right Transition',
            'slide-up': 'Slide Up Transition',
            'slide-down': 'Slide Down Transition',
            'zoom-in': 'Zoom In Transition',
            'zoom-out': 'Zoom Out Transition',
            'crossfade': 'Crossfade Transition',
            'wipe-left': 'Wipe Left Transition',
            'wipe-right': 'Wipe Right Transition',
            'bounce': 'Bounce Transition',
            'none': 'No Transition'
        };

        const transitionDescriptions = {
            'fade': 'Smooth opacity transition from 0 to 100% over 0.5 seconds, creating a gentle crossfade',
            'slide-left': 'Next clip slides in from the right edge over 0.5 seconds, pushing current clip out to the left',
            'slide-right': 'Next clip slides in from the left edge over 0.5 seconds, pushing current clip out to the right',
            'slide-up': 'Next clip slides in from the bottom edge over 0.5 seconds, pushing current clip up and out',
            'slide-down': 'Next clip slides in from the top edge over 0.5 seconds, pushing current clip down and out',
            'zoom-in': 'Next clip starts at 80% scale and zooms to 100% over 0.5 seconds with dramatic entrance',
            'zoom-out': 'Next clip starts at 120% scale and zooms down to 100% over 0.5 seconds with dramatic reveal',
            'crossfade': 'Identical to fade transition, providing smooth opacity transition over 0.5 seconds',
            'wipe-left': 'Next clip revealed by wiping motion from right to left over 0.5 seconds like drawing a curtain',
            'wipe-right': 'Next clip revealed by wiping motion from left to right over 0.5 seconds creating curtain effect',
            'bounce': 'Next clip bounces in with spring-like oscillation over 0.5 seconds for playful, energetic effect',
            'none': 'Instant switch between clips with no transition effect for fast-paced content'
        };

        console.log(`✅ Selected: ${transitionNames[transitionType]} - ${transitionDescriptions[transitionType]}`);
    }

    function showSelectedTrackInfo(track) {
        const section = document.getElementById('selectedTrackSection');
        const card = document.getElementById('selectedTrackCard');

        if (!section || !card) return;

        const duration = formatDuration(track.duration);
        const genre = track.tags ? track.tags.split(',')[0].trim() : 'Music';

        card.innerHTML = `
            <div class="selected-track-info">
                <div class="selected-track-name">${track.name}</div>
                <div class="selected-track-details">
                    <span><i class="bi bi-person-fill"></i> ${track.artist}</span>
                    <span><i class="bi bi-clock"></i> ${duration}</span>
                    <span><i class="bi bi-tag"></i> ${genre}</span>
                </div>
            </div>
            <div class="selected-track-actions">
                <button type="button" class="download-btn" onclick="downloadTrack('${track.preview_url}', '${track.name}')">
                    <i class="bi bi-download"></i>
                    Download
                </button>
                <button type="button" class="remove-track-btn" onclick="removeSelectedTrack()" title="Remove track">
                    <i class="bi bi-x-lg"></i>
                </button>
            </div>
        `;

        section.style.display = 'block';

        // Scroll to selected track section
        section.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function removeSelectedTrack() {
        selectedMusicTrack = null;
        window.selectedMusicTrack = selectedMusicTrack;
        const section = document.getElementById('selectedTrackSection');
        if (section) {
            section.style.display = 'none';
        }

        // Remove selection from all track cards
        document.querySelectorAll('.blue-wave-card').forEach(card => {
            card.classList.remove('selected');
            const selectBtn = card.querySelector('.select-btn');
            if (selectBtn) {
                selectBtn.classList.remove('selected');
                selectBtn.textContent = 'Select Track';
                selectBtn.disabled = false;
            }
        });

        console.log('🎵 Track selection removed');
    }

    function downloadTrack(url, filename) {
        console.log('🎵 Downloading track:', filename);

        // Create a temporary link element
        const link = document.createElement('a');
        link.href = url;
        link.download = filename.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.mp3';
        link.target = '_blank';

        // Append to body, click, and remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Show success message
        showNotification('Track download started!', 'success');
    }

    function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="bi bi-check-circle-fill"></i>
            <span>${message}</span>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    function scrubTrack(event, trackId, durationSeconds) {
        event.stopPropagation(); // Prevent triggering play button

        // Only allow scrubbing if this track is currently playing
        if (!currentAudio || !currentButton || currentButton.getAttribute('data-track-id') !== trackId) {
            return;
        }

        const ring = event.currentTarget;
        const rect = ring.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Calculate angle from center of ring
        const mouseX = event.clientX - centerX;
        const mouseY = event.clientY - centerY;
        let angle = Math.atan2(mouseY, mouseX) * (180 / Math.PI);

        // Convert to 0-360 range starting from top (12 o'clock position)
        angle = (angle + 90 + 360) % 360;

        // Calculate the time position based on angle
        const progress = angle / 360;
        const newTime = progress * durationSeconds;

        console.log(`🎵 Scrubbing to ${newTime.toFixed(1)}s (${(progress * 100).toFixed(1)}%)`);

        // Update audio current time
        if (currentAudio) {
            currentAudio.currentTime = newTime;
        }

        // Update visual progress immediately
        updateProgressRing(trackId, progress * 360);

        // Update the start time for continued progress tracking
        startTime = Date.now() - (newTime * 1000);
    }

    function updateProgressRing(trackId, progressDegrees) {
        const ring = document.getElementById('progress-ring-' + trackId);
        if (ring) {
            const progressRing = `conic-gradient(from 0deg, #3b82f6 0deg, #3b82f6 ${progressDegrees}deg, transparent ${progressDegrees}deg)`;
            ring.style.background = progressRing;
        }
    }

    // Style configurations matching HTML file specifications - 6 styles only
    const styleConfigs = {
        tiktok_trending: {
            style: "tiktok_trending",
            fontFamily: "Roboto", // Roboto, Segoe UI, Arial, sans-serif
            position: "bottom", // Will be updated dynamically
            backgroundColor: "#ff8800", // Optional background
            topTextColor: "#ffffff", // White top line
            bottomTextColor: "#ffe600" // Yellow bottom line
            // Two-line format: top line white, bottom line yellow (#ffe600)
        },
        progressive_highlight: {
            style: "progressive_highlight",
            backgroundColor: "#007acc", // Blue highlight color
            fontFamily: "Roboto", // Roboto, Segoe UI, Arial, sans-serif for English; Cairo, Noto Sans Arabic for Arabic
            position: "bottom", // Will be updated dynamically
            borderRadius: "1px", // 1px border radius
            textColor: "#ffffff"
            // 1px border radius, scale(1.05) on highlight, ONE word at a time
        },
        rectangular: {
            style: "rectangular",
            backgroundColor: "#dc2626", // Cool red background
            textColor: "#ffffff",
            fontFamily: "Roboto", // Roboto, Arial, sans-serif
            position: "bottom", // Will be updated dynamically
            borderRadius: "0px" // Sharp corners, no border radius
            // Sharp corners, no border radius, one line
        },
        rounded_progressive: {
            style: "rounded_progressive",
            backgroundColor: "#8b5cf6", // Cool purple highlight color
            fontFamily: "Roboto", // Roboto, Segoe UI, Arial, sans-serif for English; Cairo, Noto Sans Arabic for Arabic
            position: "bottom", // Will be updated dynamically
            borderRadius: "8px", // 8px border radius
            textColor: "#ffffff"
            // 8px border radius, scale(1.05) on highlight, ONE word at a time
        },
        arabic_banner: {
            style: "arabic_banner",
            backgroundColor: "#ff8800", // First banner color (orange)
            fontFamily: "Cairo", // Cairo, Noto Sans Arabic, sans-serif
            position: "bottom", // Will be updated dynamically
            borderRadius: "32px", // 32px border radius (rounded corners)
            firstBannerBg: "#ff8800", // Orange background
            firstBannerText: "#ffffff", // White text
            secondBannerBg: "#ffffff", // White background
            secondBannerText: "#ff8800" // Orange text
            // First: Orange background, white text
            // Second: White background, orange text (appears after 1s)
            // 32px border radius (rounded corners), smaller size
        },
        rectangular_banner: {
            style: "rectangular_banner",
            backgroundColor: "#10b981", // Cool green background
            fontFamily: "Roboto", // Roboto, Arial, sans-serif
            position: "bottom", // Will be updated dynamically
            borderRadius: "0px", // 0px border radius (sharp corners)
            firstBannerBg: "#10b981", // Green background
            firstBannerText: "#ffffff", // White text
            secondBannerBg: "#ffffff", // White background
            secondBannerText: "#10b981" // Green text
            // First: Green background, white text
            // Second: White background, green text (appears after 1s)
            // 0px border radius (sharp corners)
        }
    };

    // Project subtitle data for previews
    const projectSubtitleData = {
        @if($project->hasSubtitlesScript())
            subtitles: @json($project->getSubtitlesScript()),
            type: 'subtitles_script'
        @elseif($project->hasVoiceoverTranscript())
            transcript: @json($project->voiceover_transcript),
            type: 'transcript'
        @elseif($project->scenes()->count() > 0)
            scenes: @json($project->scenes()->select('script_text')->get()->pluck('script_text')->filter()->values()),
            type: 'scenes'
        @else
            fallback: true,
            type: 'fallback'
        @endif
    };

    const projectLanguage = @json($project->language);

    // Function to detect if text contains Arabic characters
    function isArabicText(text) {
        const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
        return arabicRegex.test(text);
    }

    // Function to get appropriate font family based on text content
    function getFontFamily(text, style) {
        // For Arabic banner style, always use Cairo
        if (style === 'arabic_banner') {
            return 'Cairo';
        }

        // Check if text contains Arabic characters or project language is Arabic
        if (isArabicText(text) || projectLanguage === 'arabic') {
            return 'Cairo';
        }

        return 'Roboto';
    }

    // Function to get sample subtitle text from project data
    function getProjectSubtitleSamples() {
        let samples = [];

        if (projectSubtitleData.type === 'subtitles_script' && projectSubtitleData.subtitles) {
            // Use first few subtitles from subtitles_script
            samples = projectSubtitleData.subtitles.slice(0, 4).map(sub => sub.text || sub);
        } else if (projectSubtitleData.type === 'transcript' && projectSubtitleData.transcript) {
            // Use first few words from transcript
            const words = projectSubtitleData.transcript.slice(0, 8).map(word => word.word || word);
            samples = [words.slice(0, 4).join(' '), words.slice(4, 8).join(' ')];
        } else if (projectSubtitleData.type === 'scenes' && projectSubtitleData.scenes) {
            // Use first few scenes
            samples = projectSubtitleData.scenes.slice(0, 3);
        } else {
            // Fallback samples based on project language
            if (projectLanguage === 'arabic') {
                samples = ['مرحباً بكم', 'اشتركوا الآن', 'محتوى رائع', 'شاهد الآن'];
            } else {
                samples = ['Welcome to our channel', 'Subscribe now', 'Amazing content', 'Watch now'];
            }
        }

        // Filter and limit text length to prevent line breaks
        return samples.filter(sample => sample && sample.trim().length > 0).map(sample => {
            // Limit each sample to prevent line wrapping
            const text = sample.trim();
            if (text.length > 20) {
                return text.substring(0, 17) + '...';
            }
            return text;
        });
    }

    document.addEventListener('DOMContentLoaded', function() {
        try {
            console.log('🚀 DOM Content Loaded - Starting initialization...');
            
            // Initialize currentStyleConfig now that styleConfigs is defined
            currentStyleConfig = styleConfigs[selectedStyle];
            window.currentStyleConfig = currentStyleConfig;
            console.log('✅ currentStyleConfig initialized');

            // Update preview content with project data
            console.log('🔄 Updating preview content...');
            updatePreviewContent();
            console.log('✅ Preview content updated');

            console.log('🔄 Loading scene videos...');
            loadSceneVideos();
            console.log('✅ Scene videos loaded');

            console.log('🔄 Initializing style selection...');
            initializeStyleSelection();
            console.log('✅ Style selection initialized');

            console.log('🔄 Initializing position selection...');
            initializePositionSelection();
            console.log('✅ Position selection initialized');

            console.log('🔄 Initializing music selection...');
            initializeMusicSelection();
            console.log('✅ Music selection initialized');

            console.log('🔄 Initializing transition selection...');
            initializeTransitionSelection();
            console.log('✅ Transition selection initialized');

            // Load trending corporate music
            console.log('🔄 Loading trending music...');
            loadTrendingMusic();
            console.log('✅ Trending music loaded');

            // Check if we need to prepare voiceover for uploaded files
            @if($project->voiceover_option === 'upload' && !$project->voiceover_url)
                console.log('🔄 Preparing voiceover...');
                prepareVoiceover();
                console.log('✅ Voiceover prepared');
            @endif

            // Start progressive word highlighting animations for preview
            console.log('🔄 Starting progressive animations...');
            startProgressiveAnimations();
            console.log('✅ Progressive animations started');
            
            console.log('🎉 All initialization completed successfully!');
            
        } catch (error) {
            console.error('❌ Error during initialization:', error);
            console.error('❌ Error stack:', error.stack);
        }
    });

    // Function to update preview content with project data
    function updatePreviewContent() {
        const samples = getProjectSubtitleSamples();

        if (samples.length === 0) return;

        // Update TikTok Trending preview
        const tiktokTop = document.querySelector('.tiktok-top');
        const tiktokBottom = document.querySelector('.tiktok-bottom');
        if (tiktokTop && tiktokBottom && samples.length >= 2) {
            // Limit text length for TikTok style to prevent wrapping
            const topText = samples[0].length > 15 ? samples[0].substring(0, 12) + '...' : samples[0];
            const bottomText = samples[1].length > 15 ? samples[1].substring(0, 12) + '...' : samples[1];

            tiktokTop.textContent = topText.toUpperCase();
            tiktokBottom.textContent = bottomText.toUpperCase();

            // Update font family based on content
            const fontFamily = getFontFamily(topText + ' ' + bottomText, 'tiktok_trending');
            tiktokTop.style.fontFamily = fontFamily === 'Cairo' ? "'Cairo', 'Noto Sans Arabic', sans-serif" : "'Roboto', 'Segoe UI', Arial, sans-serif";
            tiktokBottom.style.fontFamily = fontFamily === 'Cairo' ? "'Cairo', 'Noto Sans Arabic', sans-serif" : "'Roboto', 'Segoe UI', Arial, sans-serif";
        }

        // Update Progressive Highlight preview
        const progressiveWords = document.querySelector('.progressive-words');
        if (progressiveWords && samples.length >= 1) {
            const words = samples[0].split(' ').slice(0, 4); // Take first 4 words
            const fontFamily = getFontFamily(samples[0], 'progressive_highlight');

            progressiveWords.innerHTML = words.map((word, index) =>
                `<span class="progressive-word ${index === 1 ? 'active' : ''}">${word.toUpperCase()}</span>`
            ).join(' ');

            progressiveWords.style.fontFamily = fontFamily === 'Cairo' ? "'Cairo', 'Noto Sans Arabic', sans-serif" : "'Roboto', 'Segoe UI', Arial, sans-serif";
        }

        // Update Rectangular preview
        const rectangularText = document.querySelector('.style-text');
        if (rectangularText && samples.length >= 1) {
            const text = samples[0].toUpperCase();
            rectangularText.textContent = text;

            const fontFamily = getFontFamily(text, 'rectangular');
            rectangularText.style.fontFamily = fontFamily === 'Cairo' ? "'Cairo', 'Noto Sans Arabic', sans-serif" : "'Roboto', Arial, sans-serif";
        }

        // Update Rounded Progressive preview
        const roundedWords = document.querySelector('.rounded-words');
        if (roundedWords && samples.length >= 1) {
            const words = samples[0].split(' ').slice(0, 3); // Take first 3 words
            const fontFamily = getFontFamily(samples[0], 'rounded_progressive');

            roundedWords.innerHTML = words.map((word, index) =>
                `<span class="rounded-word ${index === 1 ? 'active' : ''}">${word.toUpperCase()}</span>`
            ).join(' ');

            roundedWords.style.fontFamily = fontFamily === 'Cairo' ? "'Cairo', 'Noto Sans Arabic', sans-serif" : "'Roboto', 'Segoe UI', Arial, sans-serif";
        }

        // Update Arabic Banner preview
        const arabicFirst = document.querySelector('.arabic-first');
        const arabicSecond = document.querySelector('.arabic-second');
        if (arabicFirst && arabicSecond && samples.length >= 2) {
            // Limit text length for Arabic banners to prevent wrapping
            const firstText = samples[0].length > 12 ? samples[0].substring(0, 10) + '...' : samples[0];
            const secondText = samples[1].length > 12 ? samples[1].substring(0, 10) + '...' : samples[1];

            arabicFirst.textContent = firstText;
            arabicSecond.textContent = secondText;

            // Arabic banner always uses Cairo font
            arabicFirst.style.fontFamily = "'Cairo', 'Noto Sans Arabic', sans-serif";
            arabicSecond.style.fontFamily = "'Cairo', 'Noto Sans Arabic', sans-serif";
        }

        // Update Rectangular Banner preview
        const rectFirst = document.querySelector('.rect-first');
        const rectSecond = document.querySelector('.rect-second');
        if (rectFirst && rectSecond && samples.length >= 2) {
            // Limit text length for rectangular banners to prevent wrapping
            const firstText = samples[0].length > 12 ? samples[0].substring(0, 10) + '...' : samples[0];
            const secondText = samples[1].length > 12 ? samples[1].substring(0, 10) + '...' : samples[1];

            rectFirst.textContent = firstText.toUpperCase();
            rectSecond.textContent = secondText.toUpperCase();

            const fontFamily = getFontFamily(firstText + ' ' + secondText, 'rectangular_banner');
            rectFirst.style.fontFamily = fontFamily === 'Cairo' ? "'Cairo', 'Noto Sans Arabic', sans-serif" : "'Roboto', Arial, sans-serif";
            rectSecond.style.fontFamily = fontFamily === 'Cairo' ? "'Cairo', 'Noto Sans Arabic', sans-serif" : "'Roboto', Arial, sans-serif";
        }
    }

    // Function to start progressive word highlighting animations
    function startProgressiveAnimations() {
        // Progressive Highlight Animation
        const progressiveWords = document.querySelectorAll('.progressive-word');
        if (progressiveWords.length > 0) {
            let currentIndex = 0;
            setInterval(() => {
                // Remove active class from all words
                progressiveWords.forEach(word => word.classList.remove('active'));
                // Add active class to current word
                progressiveWords[currentIndex].classList.add('active');
                // Move to next word
                currentIndex = (currentIndex + 1) % progressiveWords.length;
            }, 800); // 800ms per word
        }

        // Rounded Progressive Animation
        const roundedWords = document.querySelectorAll('.rounded-word');
        if (roundedWords.length > 0) {
            let currentIndex = 0;
            setInterval(() => {
                // Remove active class from all words
                roundedWords.forEach(word => word.classList.remove('active'));
                // Add active class to current word
                roundedWords[currentIndex].classList.add('active');
                // Move to next word
                currentIndex = (currentIndex + 1) % roundedWords.length;
            }, 900); // 900ms per word (slightly different timing)
        }
    }

    // Function to update font families in style configs based on project content
    function updateStyleFontFamilies(selectedStyleName) {
        const samples = getProjectSubtitleSamples();
        if (samples.length === 0) return;

        // Get sample text for font detection
        const sampleText = samples.join(' ');

        // Update the current style config font family
        const detectedFont = getFontFamily(sampleText, selectedStyleName);

        // Update the styleConfigs object
        if (styleConfigs[selectedStyleName]) {
            styleConfigs[selectedStyleName].fontFamily = detectedFont;
            currentStyleConfig.fontFamily = detectedFont;

            console.log(`🔤 Updated font family for ${selectedStyleName}:`, detectedFont);
        }
    }



    function displayVideos() {
        console.log('🎬 displayVideos() called');
        console.log('🎬 trimmedVideos:', trimmedVideos);
        console.log('🎬 trimmedVideos.length:', trimmedVideos.length);
        
        const videoGrid = document.getElementById('videoGrid');
        console.log('🎬 videoGrid element:', videoGrid);
        
        if (!videoGrid) {
            console.error('❌ videoGrid element not found!');
            return;
        }
        
        videoGrid.innerHTML = '';

        if (trimmedVideos.length === 0) {
            console.warn('⚠️ No trimmed videos to display');
            videoGrid.innerHTML = `
                <div class="text-center text-gray-500 p-8">
                    <i class="bi bi-film fs-1 mb-3"></i>
                    <h5>No videos to display</h5>
                    <p>No scene videos were found.</p>
                </div>
            `;
            return;
        }

        trimmedVideos.forEach((videoData, index) => {
            // Use actual trimmed duration from review page
            const originalDuration = videoData.duration || 10;
            const trimStart = videoData.start_time || 0;
            const trimEnd = videoData.end_time || originalDuration;
            const trimmedDuration = videoData.trimmed_duration || (trimEnd - trimStart);

            // Update the video data with actual trimming from review page
            videoData.start_time = trimStart;
            videoData.end_time = trimEnd;
            videoData.trimmed_duration = trimmedDuration;

            const videoCard = document.createElement('div');
            videoCard.className = 'video-card';
            videoCard.innerHTML = `
                <div class="video-wrapper">
                    <video class="video-element" preload="metadata" data-scene-id="${videoData.scene_id}">
                        <source src="${videoData.video_url}" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
                    <div class="video-overlay"></div>
                    <div class="video-controls">
                        <span class="trim-info">Trimmed: ${trimmedDuration.toFixed(1)}s</span>
                    </div>
                </div>
                <div class="video-info">
                    <div class="scene-title">
                        <span class="scene-badge">Scene ${videoData.scene_number}</span>
                        <span class="scene-duration">${trimmedDuration.toFixed(1)}s</span>
                    </div>
                    <p class="scene-description">${videoData.script_text || 'Scene description'}</p>
                    <div class="trim-timeline">
                        <div class="timeline-bar">
                            <div class="trim-indicator" style="left: ${(trimStart / originalDuration) * 100}%; width: ${(trimmedDuration / originalDuration) * 100}%;"></div>
                        </div>
                        <small class="text-muted">Trimmed from ${trimStart.toFixed(1)}s to ${trimEnd.toFixed(1)}s</small>
                    </div>
                    <div class="animation-selection mt-3">
                        <label class="form-label small fw-bold">Animation Style:</label>
                        <select class="form-select form-select-sm animation-select" data-scene-id="${videoData.scene_id}" data-scene-index="${index}">
                            <option value="none">No Animation</option>
                            <option value="zoom-in">Zoom In</option>
                            <option value="zoom-out">Zoom Out</option>
                        </select>
                    </div>
                </div>
            `;

            videoGrid.appendChild(videoCard);
        });

        console.log(`✅ Displayed ${trimmedVideos.length} scene videos with simulated trimming`);
    }

    // Video loading handlers
    function handleVideoLoadStart(video) {
        const wrapper = video.closest('.video-wrapper');
        const loading = wrapper.querySelector('.video-loading');
        const error = wrapper.querySelector('.video-error');

        loading.style.display = 'block';
        error.style.display = 'none';

        console.log('📹 Video loading started:', video.src);
    }

    function handleVideoLoaded(video) {
        const wrapper = video.closest('.video-wrapper');
        const loading = wrapper.querySelector('.video-loading');
        const error = wrapper.querySelector('.video-error');

        loading.style.display = 'none';
        error.style.display = 'none';

        console.log('✅ Video loaded successfully:', video.src);

        // Update video stats with duration
        const videoInfo = wrapper.closest('.video-card').querySelector('.video-stats');
        const duration = Math.round(video.duration);
        if (duration && !isNaN(duration)) {
            const durationElement = document.createElement('div');
            durationElement.innerHTML = `<i class="bi bi-clock me-1"></i>${duration}s`;
            videoInfo.appendChild(durationElement);
        }
    }

    function handleVideoError(video) {
        const wrapper = video.closest('.video-wrapper');
        const loading = wrapper.querySelector('.video-loading');
        const error = wrapper.querySelector('.video-error');

        loading.style.display = 'none';
        error.style.display = 'block';

        console.error('❌ Video failed to load:', video.src);

        // Update status
        const statusElement = wrapper.closest('.video-card').querySelector('.video-status span');
        const statusDot = wrapper.closest('.video-card').querySelector('.status-dot');
        if (statusElement && statusDot) {
            statusElement.textContent = 'Error';
            statusDot.style.background = '#ef4444';
        }
    }

    function initializeStyleSelection() {
        const styleCategories = document.querySelectorAll('.style-category');

        // Set default selection to tiktok_trending style
        const defaultStyle = document.querySelector('[data-style="tiktok_trending"]');
        if (defaultStyle) {
            defaultStyle.classList.add('selected');
            selectedStyle = 'tiktok_trending';
            window.selectedStyle = selectedStyle;
            currentStyleConfig = styleConfigs['tiktok_trending'];
            window.currentStyleConfig = currentStyleConfig;
            console.log('🎨 Default style initialized:', selectedStyle, currentStyleConfig);
        }

        styleCategories.forEach(category => {
            category.addEventListener('click', function() {
                // Remove selected class from all categories
                styleCategories.forEach(cat => cat.classList.remove('selected'));

                // Add selected class to clicked category
                this.classList.add('selected');

                // Update selected style
                selectedStyle = this.getAttribute('data-style');
                window.selectedStyle = selectedStyle;
                console.log('🎨 Selected style:', selectedStyle);

                // Update current style config
                currentStyleConfig = styleConfigs[selectedStyle];
                window.currentStyleConfig = currentStyleConfig;
                console.log('🎨 Style config:', currentStyleConfig);

                // Update font families based on selected style and project content
                updateStyleFontFamilies(selectedStyle);
            });
        });
    }

    function initializePositionSelection() {
        console.log('📍 Initializing position selection...');
        
        // Set initial position (bottom is default)
        const initialPosition = document.querySelector('.position-option[data-position="bottom"]');
        if (initialPosition) {
            initialPosition.classList.add('selected');
        }
        
        // Add click event listeners to position options
        const positionOptions = document.querySelectorAll('.position-option');
        positionOptions.forEach(option => {
            option.addEventListener('click', function() {
                // Remove selected class from all options
                positionOptions.forEach(opt => opt.classList.remove('selected'));
                
                // Add selected class to clicked option
                this.classList.add('selected');
                
                // Update selected position
                selectedPosition = this.getAttribute('data-position');
                console.log('📍 Selected position:', selectedPosition);
                
                // Update all style configs with the new position
                Object.keys(styleConfigs).forEach(styleKey => {
                    styleConfigs[styleKey].position = selectedPosition;
                });
                
                // Update current style config if it exists
                if (currentStyleConfig) {
                    currentStyleConfig.position = selectedPosition;
                    window.currentStyleConfig = currentStyleConfig;
                }
                
                console.log('📍 Updated all style configs with position:', selectedPosition);
            });
        });
    }

    function generateSubtitles() {
        console.log('🚀 generateSubtitles function called');
        
        if (trimmedVideos.length === 0) {
            alert('No videos available for subtitle generation');
            return;
        }

        console.log('🎬 Generating subtitles with style:', selectedStyle);
        console.log('📹 Videos:', trimmedVideos);
        console.log('🎵 Selected music track:', selectedMusicTrack);
        console.log('🎬 Selected transition:', selectedTransition);
        
        console.log('🔍 Step 1: Basic data logging completed');

        // Show loading overlay with progress message
        console.log('🔍 Step 2: Getting DOM elements');
        const loadingOverlay = document.getElementById('loadingOverlay');
        const loadingMessage = document.getElementById('loadingMessage');
        
        console.log('🔍 Loading overlay element:', loadingOverlay);
        console.log('🔍 Loading message element:', loadingMessage);
        
        if (!loadingOverlay) {
            console.error('❌ Loading overlay not found!');
            alert('Loading overlay not found. Please refresh the page.');
            return;
        }
        
        loadingOverlay.style.display = 'flex';
        if (loadingMessage) {
            loadingMessage.textContent = 'Generating video with subtitles... This may take 5-20 minutes.';
        }
        
        console.log('🔍 Step 3: Loading overlay displayed');

        // Disable generate button
        console.log('🔍 Step 4: Disabling generate button');
        const generateBtn = document.getElementById('generateBtn');
        console.log('🔍 Generate button element:', generateBtn);
        
        if (!generateBtn) {
            console.error('❌ Generate button not found!');
            alert('Generate button not found. Please refresh the page.');
            return;
        }
        
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Generating...';
        
        console.log('🔍 Step 5: Generate button disabled');

        // Prepare subtitle generation data with selected transition
        console.log('🔍 Step 6: Preparing subtitle data');
        const currentStyleConfig = { ...styleConfigs[selectedStyle] };
        currentStyleConfig.transition = selectedTransition; // Use selected transition

        console.log('🔍 Style configs object:', styleConfigs);
        console.log('🔍 Selected style:', selectedStyle);
        console.log('🔍 Current style config:', currentStyleConfig);

        // Collect animation selections for each clip
        const animations = [];
        const animationSelects = document.querySelectorAll('.animation-select');
        animationSelects.forEach(select => {
            animations.push(select.value);
        });

        console.log('🎬 Collected animations:', animations);

        const subtitleData = {
            project_id: {{ $project->id }},
            style: selectedStyle,
            style_config: currentStyleConfig,
            position: selectedPosition, // Include selected position
            videos: trimmedVideos,
            clips_duration: trimmedVideos.map(video => video.duration),
            animations: animations,
            aspect_ratio: "16:9", // Default aspect ratio
            voiceOver: window.voiceoverUrl || @json($project->voiceover_url),
            voiceOverVolume: 1.3,
            music: selectedMusicTrack ? selectedMusicTrack.preview_url : null,
            musicVolume: 0.2
        };
        
        console.log('🔍 Step 7: Subtitle data prepared');

        console.log('📤 Subtitle generation data:', subtitleData);
        console.log('🎤 Voiceover URL:', subtitleData.voiceOver);
        console.log('📹 Video count:', subtitleData.videos.length);
        console.log('🎵 Music URL:', subtitleData.music);
        
        // Additional validation logging
        console.log('🔍 Validation check:');
        console.log('- Voiceover exists:', !!subtitleData.voiceOver);
        console.log('- Videos array exists:', !!subtitleData.videos);
        console.log('- Videos length > 0:', subtitleData.videos.length > 0);
        console.log('- Style config exists:', !!subtitleData.style_config);
        console.log('- CSRF token exists:', !!document.querySelector('meta[name="csrf-token"]'));

        console.log('🔍 Step 8: Starting validation');
        
        // Validate required data
        if (!subtitleData.voiceOver) {
            console.error('❌ Validation failed: No voiceover URL');
            alert('Voiceover URL is required for subtitle generation. Please ensure you have uploaded a voiceover or selected a voice option.');
            // Re-enable button
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="bi bi-magic me-2"></i>Generate Subtitles';
            document.getElementById('loadingOverlay').style.display = 'none';
            return;
        }

        // Validate video URLs
        if (!subtitleData.videos || subtitleData.videos.length === 0) {
            console.error('❌ Validation failed: No videos available');
            alert('No videos available for subtitle generation. Please ensure you have trimmed videos.');
            // Re-enable button
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="bi bi-magic me-2"></i>Generate Subtitles';
            document.getElementById('loadingOverlay').style.display = 'none';
            return;
        }
        
        console.log('🔍 Step 9: Validation passed');

        console.log('🔍 Step 10: Preparing fetch request');
        const generateUrl = `{{ route('projects.generate-subtitles', $project) }}`;
        console.log('🔗 Generate URL:', generateUrl);
        
        console.log('🔍 Step 11: About to start fetch request');

        // Set up timeout warnings
        let timeoutWarning1 = setTimeout(() => {
            if (loadingMessage) {
                loadingMessage.textContent = 'Still processing... This is normal for complex videos. Please wait.';
            }
        }, 60000); // Show warning after 1 minute
        
        let timeoutWarning2 = setTimeout(() => {
            if (loadingMessage) {
                loadingMessage.textContent = 'Processing is taking longer than usual... Please be patient.';
            }
        }, 300000); // Show second warning after 5 minutes

        // Send POST request to generate subtitles
        console.log('🚀 Sending request to:', generateUrl);
        console.log('📤 Request headers:', {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
        });
        
        // Add a timeout to the fetch request
        console.log('🔍 Step 12: Setting up AbortController');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            console.log('⏰ 20-minute timeout reached, aborting request');
            controller.abort();
        }, 1200000); // 20 minutes timeout (1200 seconds)
        
        console.log('🔍 Step 13: Starting fetch request');
        console.log('🔍 Fetch URL:', generateUrl);
        console.log('🔍 Fetch method: POST');
        console.log('🔍 Fetch body length:', JSON.stringify(subtitleData).length);
        
        try {
            fetch(generateUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                },
                body: JSON.stringify(subtitleData),
                signal: controller.signal
            })
        .then(async response => {
            clearTimeout(timeoutId); // Clear the timeout
            console.log('📥 Response received:', response);
            console.log('📊 Response status:', response.status);
            // Try to log raw response text for debugging
            let rawText = '';
            try {
                rawText = await response.text();
                console.log('📋 Raw response text:', rawText);
            } catch (e) {
                console.error('❌ Error reading response text:', e);
            }
            // Try to parse JSON
            let data = null;
            try {
                data = JSON.parse(rawText);
                console.log('📥 Parsed JSON data:', data);
            } catch (jsonError) {
                console.error('❌ JSON parsing error:', jsonError);
                console.log('📋 Response text (unparsed):', rawText);
                throw new Error('Invalid JSON response from server');
            }
            // Check response.ok and log if not
            if (!response.ok) {
                console.error('❌ Response not OK:', response.status, response.statusText);
                // Log parsed data for debugging
                console.log('❌ Response data:', data);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return data;
        })
        .then(data => {
            console.log('📥 JSON data received:', data);
            
            // Clear timeout warnings
            clearTimeout(timeoutWarning1);
            clearTimeout(timeoutWarning2);
            
            // Hide loading overlay
            document.getElementById('loadingOverlay').style.display = 'none';

            // Re-enable button
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="bi bi-magic me-2"></i>Generate Subtitles';

            if (data.success) {
                console.log('✅ Subtitle generation response received:', data);

                // Check if we need to redirect to processing page
                if (data.redirect_to_processing) {
                    console.log('🔄 Redirecting to processing page...');
                    // Redirect to processing page
                    window.location.href = `{{ route('projects.processing', $project) }}`;
                    return;
                }

                // If not redirecting to processing, show success message (for immediate completion)
                console.log('✅ Video with subtitles generated successfully:', data);

                // Show success message with merged video info
                let successMessage = `Video with subtitles generated successfully with ${selectedStyle} style!`;
                if (data.merged_video_url) {
                    successMessage += `\n\nMerged video URL: ${data.merged_video_url}`;
                }
                if (data.completed_at) {
                    successMessage += `\nCompleted at: ${data.completed_at}`;
                }

                // Show success message
                alert(successMessage);

                // Redirect to final page
                if (data.redirect_url) {
                    window.location.href = data.redirect_url;
                }
            } else {
                console.error('❌ Subtitle generation failed:', data);
                
                // Show more detailed error message
                let errorMessage = data.message || 'An unknown error occurred';
                
                // Add additional details if available
                if (data.status_code) {
                    errorMessage += ` (Status: ${data.status_code})`;
                }
                
                if (data.details) {
                    console.log('Error details:', data.details);
                }
                
                alert(`Error: ${errorMessage}`);
            }
        })
        .catch(error => {
            clearTimeout(timeoutId); // Clear the timeout
            console.error('❌ Network error:', error);

            // Clear timeout warnings
            clearTimeout(timeoutWarning1);
            clearTimeout(timeoutWarning2);

            // Hide loading overlay
            document.getElementById('loadingOverlay').style.display = 'none';

            // Re-enable button
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="bi bi-magic me-2"></i>Generate Subtitles';

            // Provide more specific error message based on error type
            let errorMessage = 'Network error occurred. Please try again.';
            
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                errorMessage = 'Connection failed. Please check your internet connection and try again.';
            } else if (error.message.includes('timeout')) {
                errorMessage = 'Request timed out. The subtitle generation is taking longer than expected. Please try again.';
            }
            
            alert(errorMessage);
        });
        } catch (error) {
            console.error('❌ Error before fetch:', error);
            clearTimeout(timeoutId);
            clearTimeout(timeoutWarning1);
            clearTimeout(timeoutWarning2);
            
            // Hide loading overlay
            document.getElementById('loadingOverlay').style.display = 'none';
            
            // Re-enable button
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="bi bi-magic me-2"></i>Generate Subtitles';
            
            alert('Error preparing request: ' + error.message);
        }
    }

    async function openEditor() {
        const editorUrl = '{{ route('projects.editor', $project) }}';
        const saveMusicUrl = '{{ route('projects.save-music', $project) }}';
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content
            || '{{ csrf_token() }}';

        // Get current music selection from the page
        const music = window.selectedMusicTrack || null;
        const musicUrl = music?.preview_url || music?.url || null;
        const musicName = music?.name || music?.title || '';
        const musicVolume = 0.3;

        try {
            // Save music selection before navigating
            await fetch(saveMusicUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    music_url: musicUrl,
                    music_volume: musicVolume,
                    music_name: musicName,
                }),
            });
        } catch (err) {
            console.warn('[openEditor] Music save failed, navigating anyway:', err);
        }

        // Navigate to editor regardless of whether music save succeeded
        window.location.href = editorUrl;
    }

    function goBack() {
        // Go back to review page
        window.location.href = `{{ route('projects.review', $project) }}`;
    }

    function goToDashboard() {
        // Go to dashboard
        window.location.href = `{{ route('dashboard') }}`;
    }

    function testRoute() {
        console.log('🧪 Testing route connectivity...');
        
        // Test 1: Health check route
        const healthUrl = `{{ route('health.check') }}`;
        console.log('🔗 Health check URL:', healthUrl);
        
        fetch(healthUrl, {
            method: 'GET'
        })
        .then(response => {
            console.log('📥 Health check response:', response);
            console.log('📊 Health check status:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('📋 Health check data:', data);
            alert(`Health check: Status ${data.status} - Laravel ${data.laravel_version}`);
        })
        .catch(error => {
            console.error('❌ Health check error:', error);
            alert(`Health check failed: ${error.message}`);
        });
        
        // Test 2: Check if we can reach the base URL
        fetch(window.location.origin, {
            method: 'GET'
        })
        .then(response => {
            console.log('🏠 Base URL test:', response.status);
        })
        .catch(error => {
            console.error('❌ Base URL test failed:', error);
        });
    }

    function testSimpleGeneration() {
        console.log('🧪 Testing simple generation route...');
        
        const testUrl = `{{ route('test.subtitle.generation.simple', $project) }}`;
        console.log('🔗 Simple test URL:', testUrl);
        
        // Show loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        const loadingMessage = document.getElementById('loadingMessage');
        loadingOverlay.style.display = 'flex';
        if (loadingMessage) {
            loadingMessage.textContent = 'Testing simple route...';
        }
        
        fetch(testUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            },
            body: JSON.stringify({
                test: true,
                project_id: {{ $project->id }}
            })
        })
        .then(response => {
            console.log('📥 Simple test response:', response);
            console.log('📊 Simple test status:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('📋 Simple test data:', data);
            alert(`Simple test: ${data.message}`);
            
            // Hide loading overlay
            loadingOverlay.style.display = 'none';
        })
        .catch(error => {
            console.error('❌ Simple test error:', error);
            alert(`Simple test failed: ${error.message}`);
            
            // Hide loading overlay
            loadingOverlay.style.display = 'none';
        });
    }

    function showError(message) {
        const videoGrid = document.getElementById('videoGrid');
        videoGrid.innerHTML = `
            <div class="col-span-full">
                <div class="text-center p-8 bg-red-50 border border-red-200 rounded-lg">
                    <i class="bi bi-exclamation-triangle text-red-500 fs-1 mb-3"></i>
                    <h5 class="text-red-700 mb-2">Error Loading Videos</h5>
                    <p class="text-red-600 mb-4">${message}</p>
                    <div class="flex gap-3 justify-center">
                        <button class="btn-secondary" onclick="goBack()">
                            <i class="bi bi-arrow-left me-2"></i>Go Back
                        </button>
                        <button class="btn-primary" onclick="location.reload()">
                            <i class="bi bi-arrow-clockwise me-2"></i>Retry
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    function prepareVoiceover() {
        console.log('🎤 Preparing voiceover for subtitle generation...');

        // Show processing section
        document.getElementById('processingSection').style.display = 'block';
        document.getElementById('stylesSection').style.display = 'none';

        // Generate prepare URL
        const prepareUrl = `{{ route('projects.prepare-voiceover', $project->id) }}`;
        console.log('🔗 Prepare URL:', prepareUrl);

        fetch(prepareUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            },
            body: JSON.stringify({})
        })
        .then(response => response.json())
        .then(data => {
            console.log('🎤 Voiceover preparation response:', data);

            if (data.success) {
                console.log('✅ Voiceover prepared successfully:', data.voiceover_url);

                // Hide processing section and show subtitle styles
                document.getElementById('processingSection').style.display = 'none';
                document.getElementById('stylesSection').style.display = 'block';

                // Store the voiceover URL for later use
                window.voiceoverUrl = data.voiceover_url;

                console.log('🎨 Subtitle styles are now available for selection');
            } else {
                console.error('❌ Voiceover preparation failed:', data);

                // Show error in processing section
                document.getElementById('processingSection').innerHTML = `
                    <div class="text-center py-5">
                        <i class="bi bi-exclamation-triangle text-danger fs-1 mb-3"></i>
                        <h3 class="text-xl font-semibold mb-2 text-danger">Voiceover Preparation Failed</h3>
                        <p class="text-gray-600 mb-3">${data.message}</p>
                        <button class="btn btn-primary" onclick="prepareVoiceover()">
                            <i class="bi bi-arrow-clockwise me-2"></i>Retry
                        </button>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('❌ Network error during voiceover preparation:', error);

            // Show error in processing section
            document.getElementById('processingSection').innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-wifi-off text-danger fs-1 mb-3"></i>
                    <h3 class="text-xl font-semibold mb-2 text-danger">Network Error</h3>
                    <p class="text-gray-600 mb-3">Failed to prepare voiceover. Please check your connection and try again.</p>
                    <button class="btn btn-primary" onclick="prepareVoiceover()">
                        <i class="bi bi-arrow-clockwise me-2"></i>Retry
                    </button>
                </div>
            `;
        });
    }

    // Music Selection Variables
    let selectedMusic = null;
    let currentlyPlayingAudio = null;
    let currentlyPlayingTrackId = null;
    let searchTimeout = null;
    let currentPage = 1;
    let totalPages = 1;
    let currentQuery = '';
    let currentCategory = '';
    let tracksPerPage = 12;

    function initializeMusicSelection() {
        console.log('🎵 Initializing music selection...');

        // Check if music section exists
        const musicSection = document.getElementById('musicSection');
        if (!musicSection || musicSection.style.display === 'none') {
            console.log('🎵 Music section not visible, skipping initialization');
            return;
        }

        loadMusicCategories();
        loadTrendingMusic();
        setupMusicSearchHandlers();
    }

    function setupMusicSearchHandlers() {
        const searchInput = document.getElementById('musicSearchInput');
        const clearBtn = document.getElementById('clearSearchBtn');

        if (searchInput) {
            searchInput.addEventListener('input', function() {
                const query = this.value.trim();

                if (query.length > 0) {
                    clearBtn.style.display = 'block';

                    // Debounce search
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(() => {
                        searchMusic(query, '', 1);
                    }, 500);
                } else {
                    clearBtn.style.display = 'none';
                    showTrendingMusic();
                }
            });

            searchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const query = this.value.trim();
                    if (query.length > 0) {
                        searchMusic(query, '', 1);
                    }
                }
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', function() {
                searchInput.value = '';
                this.style.display = 'none';

                // Reset pagination state
                currentQuery = '';
                currentCategory = '';
                currentPage = 1;
                totalPages = 1;

                showTrendingMusic();
            });
        }
    }

    function loadMusicCategories() {
        fetch('../api/music/categories', {
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
                'Accept': 'application/json'
            }
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    displayMusicCategories(data.categories);
                } else {
                    console.error('Failed to load music categories:', data.message);
                    showMusicError('Failed to load music categories');
                }
            })
            .catch(error => {
                console.error('Error loading music categories:', error);
                showMusicError('Failed to load music categories');
            });
    }

    function displayMusicCategories(categories) {
        const container = document.getElementById('musicCategories');
        if (!container) return;

        // Add Featured Music Mix as the first category
        const featuredMixButton = `
            <button type="button" class="category-btn" data-category="featured-mix" onclick="selectCategory('featured-mix')">
                <i class="bi bi-music-note-beamed me-1"></i>Featured Mix
            </button>
        `;

        const categoryButtons = categories.map(category => `
            <button type="button" class="category-btn" data-category="${category.id}" onclick="selectCategory('${category.id}')">
                ${category.name}
            </button>
        `).join('');

        container.innerHTML = featuredMixButton + categoryButtons;
    }

    function selectCategory(categoryId) {
        // Update active category button
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-category="${categoryId}"]`).classList.add('active');

        // Show loading state
        showCategoryLoadingState();

        // Reset pagination and search by category
        currentPage = 1;
        currentQuery = '';
        currentCategory = categoryId;

        // Handle special "featured-mix" category
        if (categoryId === 'featured-mix') {
            // Show trending section and hide search section
            const trendingSection = document.getElementById('trendingSection');
            const searchSection = document.getElementById('searchSection');
            if (trendingSection) trendingSection.style.display = 'block';
            if (searchSection) searchSection.style.display = 'none';

            loadTrendingMusic();
            return;
        }

        // Search music by category with pagination support
        searchMusic('', categoryId, 1);
    }

    function searchMusicByCategory(category, page = 1) {
        console.log('🔍 Searching music by category:', { category, page });

        // Update global state
        currentCategory = category;
        currentQuery = '';
        currentPage = page;

        const params = new URLSearchParams({
            category: encodeURIComponent(category),
            per_page: tracksPerPage,
            page: page
        });

        fetch(`../api/music/search?${params.toString()}`, {
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
                'Accept': 'application/json'
            }
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    displaySearchResults(data.tracks, category, data.total || data.tracks.length, page);
                } else {
                    console.error('Failed to search music by category:', data.message);
                    showSearchError('Failed to search music by category. Please try again.');
                }
            })
            .catch(error => {
                console.error('Error searching music by category:', error);
                showSearchError('Network error occurred. Please try again.');
            });
    }

    // Remove old loadPopularTracks function - replaced by loadTrendingMusic

    function loadTrendingMusic() {
        console.log('🎵 Loading mixed music tracks (4 corporate + 5 energetic)...');

        // Show loading state
        const container = document.getElementById('trendingTracks');
        if (!container) {
            console.error('🎵 Trending tracks container not found!');
            return;
        }

        container.innerHTML = `
            <div class="modern-loading-container">
                <div class="modern-spinner"></div>
                <div class="loading-text">
                    Loading Featured Mix
                    <div class="loading-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
                <div class="loading-subtext">Curating 4 corporate + 5 energetic tracks</div>
            </div>
        `;

        // Fetch both corporate and energetic tracks simultaneously
        const corporateParams = new URLSearchParams({
            category: 'corporate',
            per_page: 30, // Get 30 corporate tracks to choose from
            page: 1
        });

        const energeticParams = new URLSearchParams({
            category: 'energetic',
            per_page: 30, // Get 30 energetic tracks to choose from
            page: 1
        });

        // Make both API calls simultaneously
        Promise.all([
            fetch(`{{ route("api.music.search") }}?${corporateParams.toString()}`, {
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
                    'Accept': 'application/json'
                }
            }).then(response => response.json()),

            fetch(`{{ route("api.music.search") }}?${energeticParams.toString()}`, {
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
                    'Accept': 'application/json'
                }
            }).then(response => response.json())
        ])
        .then(([corporateData, energeticData]) => {
            console.log('🎵 Corporate API response:', corporateData);
            console.log('🎵 Energetic API response:', energeticData);

            let mixedTracks = [];

            // Get 4 random corporate tracks
            if (corporateData.success && corporateData.tracks && corporateData.tracks.length > 0) {
                const shuffledCorporate = [...corporateData.tracks].sort(() => Math.random() - 0.5);
                const randomCorporate = shuffledCorporate.slice(0, 4);
                mixedTracks.push(...randomCorporate);
                console.log(`🎵 Selected 4 random corporate tracks from ${corporateData.tracks.length} available`);
            }

            // Get 5 random energetic tracks
            if (energeticData.success && energeticData.tracks && energeticData.tracks.length > 0) {
                const shuffledEnergetic = [...energeticData.tracks].sort(() => Math.random() - 0.5);
                const randomEnergetic = shuffledEnergetic.slice(0, 5);
                mixedTracks.push(...randomEnergetic);
                console.log(`🎵 Selected 5 random energetic tracks from ${energeticData.tracks.length} available`);
            }

            if (mixedTracks.length > 0) {
                // Shuffle the final mixed array for better variety in display order
                const finalMixedTracks = [...mixedTracks].sort(() => Math.random() - 0.5);
                console.log(`🎵 Displaying ${finalMixedTracks.length} mixed tracks (corporate + energetic)`);
                displayTrendingTracks(finalMixedTracks);
            } else {
                console.error('🎵 No music tracks found');
                showTrendingError('No music tracks found. Please try again later.');
            }
        })
        .catch(error => {
            console.error('🎵 Error loading mixed music:', error);
            showTrendingError('Failed to load music. Please check your connection and try again.');
        });
    }



    function displayTrendingTracks(tracks) {
        const container = document.getElementById('trendingTracks');
        if (!container) return;

        if (tracks.length === 0) {
            container.innerHTML = `
                <div class="loading-placeholder">
                    <i class="bi bi-music-note text-4xl text-gray-400"></i>
                    <span>No trending music found</span>
                </div>
            `;
            return;
        }

        container.innerHTML = tracks.map(track => createModernTrackCard(track)).join('');
    }

    function showTrendingError(message) {
        const container = document.getElementById('trendingTracks');
        if (container) {
            container.innerHTML = `
                <div class="loading-placeholder">
                    <i class="bi bi-exclamation-triangle text-4xl text-yellow-500"></i>
                    <span>${message}</span>
                </div>
            `;
        }
    }

    function searchMusic(query = '', category = '', page = 1) {
        console.log('🔍 Searching music:', { query, category, page });

        // Show loading state
        if (query) {
            showSearchLoadingState();
        } else {
            showCategoryLoadingState();
        }

        // Update global state
        currentQuery = query;
        currentCategory = category;
        currentPage = page;

        const params = new URLSearchParams({
            per_page: tracksPerPage,
            page: page
        });

        if (query) params.append('q', query);
        if (category) params.append('category', category);

        fetch(`../api/music/search?${params.toString()}`, {
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
                'Accept': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            console.log('🎵 Search API response:', data);

            if (data.success) {
                const searchTerm = query || category;
                console.log('📊 Pagination data:', {
                    total: data.total,
                    tracks_count: data.tracks.length,
                    page,
                    tracksPerPage
                });
                displaySearchResults(data.tracks, searchTerm, data.total || data.tracks.length, page);
            } else {
                console.error('Failed to search music:', data.message);
                showSearchError('Failed to search music. Please try again.');
            }
        })
        .catch(error => {
            console.error('Error searching music:', error);
            showSearchError('Network error occurred. Please try again.');
        });
    }

    function displaySearchResults(tracks, query, total = 0, page = 1) {
        const searchSection = document.getElementById('searchSection');
        const trendingSection = document.getElementById('trendingSection');
        const container = document.getElementById('searchResultsTracks');
        const resultsCount = document.getElementById('resultsCount');
        const paginationInfo = document.getElementById('paginationInfo');
        const paginationControls = document.getElementById('paginationControls');
        const musicResultsSection = document.querySelector('.music-results-section');

        if (!container || !searchSection) return;

        // Remove loading class to show pagination
        if (musicResultsSection) musicResultsSection.classList.remove('loading-active');

        if (query && query.trim()) {
            searchSection.style.display = 'block';
            trendingSection.style.display = 'none';

            // Update pagination info
            currentPage = page;
            totalPages = Math.ceil(total / tracksPerPage);

            console.log('📄 Pagination calculation:', {
                total,
                tracksPerPage,
                totalPages,
                currentPage
            });

            // Update results count
            if (resultsCount) {
                resultsCount.textContent = `${total} tracks`;
            }

            // Update pagination info
            if (paginationInfo && totalPages > 1) {
                paginationInfo.style.display = 'block';
                document.getElementById('currentPage').textContent = currentPage;
                document.getElementById('totalPages').textContent = totalPages;
            } else if (paginationInfo) {
                paginationInfo.style.display = 'none';
            }

            if (tracks.length === 0) {
                container.innerHTML = `
                    <div class="loading-placeholder">
                        <i class="bi bi-search text-4xl text-gray-400"></i>
                        <span>No tracks found for "${query}"</span>
                        <p style="font-size: 0.875rem; color: #9ca3af; margin-top: 0.5rem;">Try different keywords or browse categories</p>
                    </div>
                `;
                if (paginationControls) paginationControls.style.display = 'none';
            } else {
                container.innerHTML = tracks.map(track => createModernTrackCard(track)).join('');

                // Show pagination if needed
                if (totalPages > 1 && paginationControls) {
                    paginationControls.style.display = 'flex';
                    updatePaginationControls();
                } else if (paginationControls) {
                    paginationControls.style.display = 'none';
                }
            }
        } else {
            searchSection.style.display = 'none';
            trendingSection.style.display = 'block';
            if (paginationControls) paginationControls.style.display = 'none';
        }
    }

    function updatePaginationControls() {
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        const pageNumbers = document.getElementById('pageNumbers');

        console.log('🔧 Updating pagination controls:', { currentPage, totalPages });

        // Update button states with visual feedback
        if (prevBtn) {
            prevBtn.disabled = currentPage <= 1;
            prevBtn.classList.toggle('disabled', currentPage <= 1);
        }
        if (nextBtn) {
            nextBtn.disabled = currentPage >= totalPages;
            nextBtn.classList.toggle('disabled', currentPage >= totalPages);
        }

        // Generate page numbers
        if (pageNumbers) {
            let pagesHtml = '';
            const maxVisiblePages = 5;
            let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
            let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

            if (endPage - startPage + 1 < maxVisiblePages) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
            }

            for (let i = startPage; i <= endPage; i++) {
                pagesHtml += `
                    <button class="page-number ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">
                        ${i}
                    </button>
                `;
            }

            pageNumbers.innerHTML = pagesHtml;
        }
    }

    function changePage(direction) {
        const newPage = currentPage + direction;
        console.log('📄 Changing page:', { direction, currentPage, newPage, totalPages });

        if (newPage >= 1 && newPage <= totalPages) {
            goToPage(newPage);
        } else {
            console.log('⚠️ Page out of bounds:', { newPage, totalPages });
        }
    }

    function goToPage(page) {
        if (page === currentPage) return;

        console.log('🔄 Going to page:', { page, currentQuery, currentCategory });

        currentPage = page;

        // Handle both search queries and category searches
        if (currentQuery || currentCategory) {
            searchMusic(currentQuery, currentCategory, page);
        }
    }

    function showTrendingMusic() {
        const searchSection = document.getElementById('searchSection');
        const trendingSection = document.getElementById('trendingSection');
        const paginationControls = document.getElementById('paginationControls');

        if (searchSection) searchSection.style.display = 'none';
        if (trendingSection) trendingSection.style.display = 'block';
        if (paginationControls) paginationControls.style.display = 'none';

        // Reset search and pagination state
        currentQuery = '';
        currentCategory = '';
        currentPage = 1;
        totalPages = 1;

        // Clear active category buttons
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
    }

    function hideSearchResults() {
        showTrendingMusic();
    }

    function showSearchError(message) {
        const container = document.getElementById('searchResultsTracks');
        const musicResultsSection = document.querySelector('.music-results-section');

        // Remove loading class
        if (musicResultsSection) musicResultsSection.classList.remove('loading-active');

        if (container) {
            container.innerHTML = `
                <div class="col-span-full text-center py-8">
                    <i class="bi bi-exclamation-triangle text-4xl text-yellow-500 mb-3"></i>
                    <p class="text-gray-600">${message}</p>
                </div>
            `;
            document.getElementById('searchResults').style.display = 'block';
        }
    }

    function showTrendingError(message) {
        const container = document.getElementById('trendingTracks');
        if (container) {
            container.innerHTML = `
                <div class="col-span-full text-center py-8">
                    <i class="bi bi-exclamation-triangle text-4xl text-yellow-500 mb-3"></i>
                    <p class="text-gray-600 mb-4">${message}</p>
                    <button onclick="loadTrendingMusic()" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                        <i class="bi bi-arrow-clockwise me-2"></i>Retry
                    </button>
                </div>
            `;
        }
    }

    function showCategoryLoadingState() {
        const searchSection = document.getElementById('searchSection');
        const trendingSection = document.getElementById('trendingSection');
        const searchResultsTracks = document.getElementById('searchResultsTracks');
        const musicResultsSection = document.querySelector('.music-results-section');

        // Hide trending section and show search section
        if (trendingSection) trendingSection.style.display = 'none';
        if (searchSection) searchSection.style.display = 'block';

        // Add loading class to hide pagination
        if (musicResultsSection) musicResultsSection.classList.add('loading-active');

        // Show modern loading in search results
        if (searchResultsTracks) {
            searchResultsTracks.innerHTML = `
                <div class="modern-loading-container">
                    <div class="modern-spinner"></div>
                    <div class="loading-text">
                        Loading Music Tracks
                        <div class="loading-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                    <div class="loading-subtext">Fetching the best tracks for you</div>
                </div>
            `;
        }
    }

    function showSearchLoadingState() {
        const searchResultsTracks = document.getElementById('searchResultsTracks');
        const musicResultsSection = document.querySelector('.music-results-section');

        // Add loading class to hide pagination
        if (musicResultsSection) musicResultsSection.classList.add('loading-active');

        if (searchResultsTracks) {
            searchResultsTracks.innerHTML = `
                <div class="modern-loading-container">
                    <div class="modern-spinner"></div>
                    <div class="loading-text">
                        Searching Music
                        <div class="loading-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                    <div class="loading-subtext">Finding tracks that match your search</div>
                </div>
            `;
        }
    }

    // Use the new blue wave card design for all music cards
    function createModernTrackCard(track) {
        const duration = formatDuration(track.duration);
        const genre = track.tags ? track.tags.split(',')[0].trim() : 'Music';
        const waveformHeights = [8,12,5,14,9,16,8,12,18,9,14,8];
        return `
        <div class="blue-wave-card light-blue-wave light-blue-wave-bars" data-track-id="${track.id}">
            <div class="track-name">${track.name}</div>
            <div class="track-info-line">
                <div class="track-genre">${genre}</div>
                <div class="info-separator"></div>
                <div class="track-artist"><i class="bi bi-person-fill"></i> ${track.artist}</div>
                <div class="info-separator"></div>
                <div class="track-duration">${duration}</div>
            </div>
            <div class="waveform">
                ${waveformHeights.map(h => `<div class='wave-bar' style='height:${h}px;'></div>`).join('')}
            </div>
            <div class="track-controls" style="position:relative;">
                <span class="progress-ring" id="progress-ring-${track.id}" onclick="scrubTrack(event, '${track.id}', ${track.duration})"></span>
                <button type="button" class="play-btn" onclick="togglePlayback(this, '${track.preview_url}', ${track.duration}, '${track.id}')" data-track-id="${track.id}">
                    <i class="bi bi-play-fill" id="play-icon-${track.id}"></i>
                </button>
                <button type="button" class="select-btn" onclick="selectTrack(${JSON.stringify(track).replace(/"/g, '&quot;')})">Select Track</button>
            </div>
        </div>
        `;
    }

    // Keep the old function for backward compatibility
    function createTrackCard(track) {
        return createModernTrackCard(track);
    }

    function formatDuration(seconds) {
        if (!seconds) return '0:00';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function toggleTrackPlayback(trackId, previewUrl) {
        const playIcon = document.getElementById(`play-icon-${trackId}`);
        const playBtn = playIcon.parentElement;

        // Check if this is the currently playing track
        if (currentlyPlayingAudio && currentlyPlayingTrackId === trackId) {
            if (currentlyPlayingAudio.paused) {
                // Resume playing
                currentlyPlayingAudio.play().then(() => {
                    playIcon.className = 'bi bi-pause-fill';
                    playBtn.classList.add('playing');
                }).catch(error => {
                    console.error('Error resuming audio:', error);
                    playIcon.className = 'bi bi-exclamation-triangle';
                    playBtn.classList.remove('playing');
                });
            } else {
                // Pause current track
                currentlyPlayingAudio.pause();
                playIcon.className = 'bi bi-play-fill';
                playBtn.classList.remove('playing');
            }
            return;
        }

        // Stop any currently playing audio
        if (currentlyPlayingAudio && !currentlyPlayingAudio.paused) {
            currentlyPlayingAudio.pause();
            currentlyPlayingAudio.currentTime = 0;

            // Reset previous play button
            if (currentlyPlayingTrackId) {
                const prevPlayIcon = document.getElementById(`play-icon-${currentlyPlayingTrackId}`);
                if (prevPlayIcon) {
                    prevPlayIcon.className = 'bi bi-play-fill';
                    prevPlayIcon.parentElement.classList.remove('playing');
                }
            }
        }

        // Play new track
        if (previewUrl) {
            currentlyPlayingTrackId = trackId;
            currentlyPlayingAudio = new Audio(previewUrl);
            currentlyPlayingAudio.volume = 0.7;

            // Show loading state
            playIcon.className = 'bi bi-hourglass-split';
            playBtn.classList.add('loading');

            currentlyPlayingAudio.addEventListener('loadstart', () => {
                playIcon.className = 'bi bi-hourglass-split';
                playBtn.classList.add('loading');
            });

            currentlyPlayingAudio.addEventListener('canplay', () => {
                playIcon.className = 'bi bi-pause-fill';
                playBtn.classList.remove('loading');
                playBtn.classList.add('playing');
            });

            currentlyPlayingAudio.addEventListener('ended', () => {
                playIcon.className = 'bi bi-play-fill';
                playBtn.classList.remove('playing');
                currentlyPlayingTrackId = null;
            });

            currentlyPlayingAudio.addEventListener('error', () => {
                playIcon.className = 'bi bi-exclamation-triangle';
                playBtn.classList.remove('playing', 'loading');
                currentlyPlayingTrackId = null;
                console.error('Error playing audio:', previewUrl);
            });

            currentlyPlayingAudio.play().catch(error => {
                console.error('Error playing audio:', error);
                playIcon.className = 'bi bi-exclamation-triangle';
                playBtn.classList.remove('playing', 'loading');
                currentlyPlayingTrackId = null;
            });
        }
    }

    function selectTrack(track) {
        console.log('🎵 Selecting track:', track);

        selectedMusicTrack = track;
        window.selectedMusicTrack = selectedMusicTrack;

        // Show selected track info
        showSelectedTrackInfo(track);

        // Update all track cards
        document.querySelectorAll('.blue-wave-card, .music-track-card, .track-card').forEach(card => {
            const trackId = card.dataset.trackId;
            const selectBtn = card.querySelector('.select-btn');

            if (trackId === track.id.toString()) {
                card.classList.add('selected');
                if (selectBtn) {
                    selectBtn.classList.add('selected');
                    selectBtn.textContent = 'Selected';
                    selectBtn.disabled = true;
                }
            } else {
                card.classList.remove('selected');
                if (selectBtn) {
                    selectBtn.classList.remove('selected');
                    selectBtn.textContent = 'Select Track';
                    selectBtn.disabled = false;
                }
            }
        });

        // Display selected music
        displaySelectedMusic(track);
    }





    function showMusicError(message) {
        console.error('🎵 Music error:', message);

        // Show error in popular tracks section
        const popularContainer = document.getElementById('popularTracks');
        if (popularContainer) {
            popularContainer.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="bi bi-exclamation-triangle text-3xl mb-2"></i>
                    <p>${message}</p>
                    <button type="button" class="btn btn-sm btn-outline-primary mt-2" onclick="initializeMusicSelection()">
                        <i class="bi bi-arrow-clockwise me-1"></i>Retry
                    </button>
                </div>
            `;
        }
    }

    function loadSceneVideos() {
        console.log('📹 Loading scene videos from project data...');
        console.log('📹 projectSceneVideos variable:', projectSceneVideos);
        
        // Debug logging
        console.log('📹 loadSceneVideos() called! projectSceneVideos length: ' + (projectSceneVideos ? projectSceneVideos.length : 'null'));

        // Get scene videos directly from the project
        const sceneVideos = projectSceneVideos;

        console.log('✅ Loaded scene videos:', sceneVideos);
        console.log('✅ Scene videos length:', sceneVideos ? sceneVideos.length : 'null');

        if (sceneVideos && sceneVideos.length > 0) {
            console.log('✅ Setting trimmedVideos and calling displayVideos()');
            trimmedVideos = sceneVideos; // Use the same variable for compatibility
            displayVideos();
        } else {
            console.warn('⚠️ No scene videos found');
            console.warn('⚠️ sceneVideos:', sceneVideos);
            showError('No scene videos found. Please go back and generate scenes first.');
        }
    }

</script>

{{-- Remotion Player IIFE bundle --}}
<script src="{{ asset('js/remotion-player/vidsai-player.iife.js') }}"></script>

<script>
(function() {
    'use strict';

    // ── State ─────────────────────────────────────────────────────────────────
    const raw = window.__EDIT_STATE__;
    let editState = raw ? JSON.parse(JSON.stringify(raw)) : null;
    let playerRoot = null;

    // ── Mount / update player ─────────────────────────────────────────────────
    function mountPlayer() {
        const P = window.VidsAIPlayer;
        const el = document.getElementById('vidsai-preview-root');
        if (!P || !el || !editState) return;

        try {
            if (!playerRoot) {
                el.innerHTML = '';
                playerRoot = P.ReactDOM.createRoot(el);
            }
            playerRoot.render(P.React.createElement(P.VideoPreviewPlayer, {
                editState: editState,
                projectId: window.__PROJECT_ID__,
                acknowledgeRemotionLicense: true,
            }));
            setStatus('Live');
        } catch(e) {
            console.error('[Preview]', e);
            setStatus('Error');
        }
    }

    // ── Edit state mutations ──────────────────────────────────────────────────
    function applySubtitleStyle(style, config) {
        if (!editState || !style) return;
        config = config || {};

        const fps = editState.fps || 30;
        const clips = editState.tracks.video || [];

        // Generate one subtitle placeholder per scene clip
        const placeholderTexts = [
            'Every idea starts with a vision',
            'But turning that vision into reality takes creativity',
            'This is where innovation begins',
            'Welcome to the future of possibilities',
            'Your story starts here',
            'The journey of a thousand miles',
            'Make every moment count',
            'Transform your vision into reality',
        ];

        if (!editState.tracks.subtitles || editState.tracks.subtitles.length === 0) {
            // Create one subtitle per clip based on clip timing
            if (clips.length > 0) {
                editState.tracks.subtitles = clips.map(function(clip, i) {
                    const startFrame = clip.start_frame + Math.round(fps * 0.2);
                    const endFrame = clip.end_frame - Math.round(fps * 0.2);
                    return {
                        id: 'preview_sub_' + i,
                        text: placeholderTexts[i % placeholderTexts.length],
                        start_frame: Math.max(startFrame, clip.start_frame),
                        end_frame: Math.max(Math.min(endFrame, clip.end_frame), startFrame + fps),
                        style: style,
                        position: config.position || 'bottom',
                        config: config,
                    };
                });
            }
        } else {
            // Real subtitles exist — just update the style
            editState.tracks.subtitles = editState.tracks.subtitles.map(function(s) {
                return Object.assign({}, s, { style: style, config: config });
            });
        }

        window.__EDIT_STATE__ = editState;
        editState.version = (editState.version || 1) + 1;
        setLabel('preview-style-label', style.replace(/_/g, ' '));
        mountPlayer();
    }

    function applyTransition(type) {
        if (!editState || !type) return;
        const clips = editState.tracks.video || [];
        editState.tracks.video = clips.map((clip, i) => Object.assign({}, clip, {
            transition_out: i < clips.length - 1
                ? { type: type, duration_frames: 15 }
                : null
        }));
        editState.version = (editState.version || 1) + 1;
        setLabel('preview-transition-label', type);
        mountPlayer();
    }

    function applyMusic(url, name) {
        if (!editState) return;
        editState.tracks.audio = (editState.tracks.audio || []).filter(a => a.type !== 'music');
        if (url) {
            editState.tracks.audio.push({
                id: 'music', url: url, type: 'music',
                start_frame: 0,
                end_frame: editState.total_frames || 300,
                volume: 0.3,
                fade_in_frames: 15,
                fade_out_frames: 15,
            });
        }
        editState.version = (editState.version || 1) + 1;
        setLabel('preview-music-label', name || 'Selected');
        mountPlayer();
    }

    // ── Hook into existing page functions ─────────────────────────────────────
    function patchFunctions() {
        // Style cards — delegated listener
        document.addEventListener('click', function(e) {
            const card = e.target.closest('[data-style]');
            if (card) {
                setTimeout(() => {
                    // Read from the card attribute directly — more reliable than window variable
                    const style = card.getAttribute('data-style') || window.selectedStyle;
                    // Read the style config that the existing page JS sets
                    const config = window.currentStyleConfig || window.selectedStyleConfig || {};
                    if (style) applySubtitleStyle(style, config);
                }, 30);
            }
        });

        // Transition function wrap
        if (typeof window.selectTransition === 'function') {
            const orig = window.selectTransition;
            window.selectTransition = function(t, el) {
                orig.call(this, t, el);
                applyTransition(t);
            };
        }

        // Music track function wrap
        if (typeof window.selectTrack === 'function') {
            const orig = window.selectTrack;
            window.selectTrack = function(track) {
                try {
                    orig.call(this, track);
                } catch (e) {
                    console.warn('[Preview] selectTrack logic threw an error:', e);
                }
                if (track && track.preview_url) {
                    applyMusic(track.preview_url, track.name || track.title);
                }
            };
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    function setStatus(t) {
        const el = document.getElementById('preview-status');
        if (el) el.textContent = t;
    }
    function setLabel(id, t) {
        const el = document.getElementById(id);
        if (el) el.textContent = t || '—';
    }

    // ── Wait for bundle then init ─────────────────────────────────────────────
    function waitAndInit() {
        if (window.VidsAIPlayer) {
            setStatus('Loading...');
            
            // Set initial labels
            setLabel('preview-style-label', (window.selectedStyle || '').replace(/_/g, ' ') || '—');
            setLabel('preview-transition-label', window.selectedTransition || '—');
            setLabel('preview-music-label', (window.selectedMusicTrack && window.selectedMusicTrack.name) ? window.selectedMusicTrack.name : '—');
            
            mountPlayer();
        } else {
            setTimeout(waitAndInit, 200);
        }
    }

    window.addEventListener('load', function() {
        patchFunctions();
        waitAndInit();
    });

})();
</script>
@endpush
