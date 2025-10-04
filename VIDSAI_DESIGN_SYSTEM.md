# 🎨 VidsAI Design System

## Overview
This document contains the complete color palette, styling system, and design components used in VidsAI. Use this as a reference to maintain consistent design across all pages.

## 📁 Files
- **CSS File**: `public/css/vidsai-theme.css`
- **Usage**: Include in your Blade templates or other pages

## 🎨 Color Palette

### Primary Colors
```css
--dark-bg: #0a0e16;                    /* Main background */
--dark-surface: #151b26;               /* Cards, surfaces */
--dark-surface-2: #1e2633;             /* Secondary surfaces */
--dark-border: #2d3748;                /* Borders */
--dark-text: #f7fafc;                  /* Primary text */
--dark-text-secondary: #a0aec0;        /* Secondary text */
```

### Accent Colors
```css
--accent-blue: #4299e1;                /* Primary brand color */
--accent-purple: #9f7aea;              /* Secondary brand color */
--accent-green: #48bb78;               /* Success, positive actions */
--accent-orange: #ed8936;              /* Warnings, highlights */
```

### Glass Effects
```css
--glass-bg: rgba(255, 255, 255, 0.05); /* Glass background */
--glass-border: rgba(255, 255, 255, 0.1); /* Glass borders */
```

## 🌈 Gradient Combinations

### Pre-defined Gradients
```css
--gradient-primary: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
--gradient-secondary: linear-gradient(135deg, var(--accent-purple), var(--accent-green));
--gradient-tertiary: linear-gradient(135deg, var(--accent-green), var(--accent-orange));
--gradient-quaternary: linear-gradient(135deg, var(--accent-orange), var(--accent-blue));
--gradient-success: linear-gradient(135deg, var(--accent-green), var(--accent-blue));
--gradient-warning: linear-gradient(135deg, var(--accent-orange), var(--accent-purple));
```

### Background Gradients
```css
--bg-gradient-main: linear-gradient(135deg, var(--dark-bg) 0%, #0f1419 50%, var(--dark-bg) 100%);
--bg-gradient-surface: linear-gradient(145deg, var(--dark-surface), var(--dark-surface-2));
--bg-gradient-glass: linear-gradient(135deg, rgba(0,0,0,0.9), rgba(30,30,30,0.9));
```

## 🔧 Component Classes

### Buttons
```html
<!-- Primary Enhanced Button -->
<button class="btn btn-primary-enhanced">
    <i class="bi bi-play-circle me-2"></i>Start Creating
</button>

<!-- Outline Enhanced Button -->
<button class="btn btn-outline-enhanced">
    View Pricing <i class="bi bi-arrow-right ms-2"></i>
</button>
```

### Feature Cards
```html
<div class="feature-card-enhanced h-100">
    <div class="feature-icon feature-icon-1">
        <i class="bi bi-robot text-white" style="font-size: 1.5rem;"></i>
    </div>
    <h4 class="fw-bold mb-3">AI Scene Generation</h4>
    <p class="text-muted">Description text here...</p>
</div>
```

### Floating Badges
```html
<div class="floating-badge floating-badge-1 position-absolute" style="top: 10%; right: -5%;">
    <div class="badge-content" style="background: var(--gradient-warning); color: white;">
        <i class="bi bi-lightning-fill me-1"></i>
        <small class="fw-bold">300% Faster</small>
    </div>
</div>
```

### Glass Navigation
```html
<nav class="navbar navbar-expand-lg navbar-dark glass-nav fixed-top">
    <div class="container">
        <a class="navbar-brand d-flex align-items-center" href="#">
            <i class="bi bi-camera-video-fill text-primary me-2"></i>
            <span class="fw-bold fs-4">VidsAI</span>
        </a>
    </div>
</nav>
```

## 🎭 Animation Classes

### Fade Animations
```html
<!-- Fade in from bottom -->
<div class="fade-in-up">Content</div>

<!-- Fade in from left -->
<div class="fade-in-left">Content</div>

<!-- Fade in from right -->
<div class="fade-in-right">Content</div>
```

### Gradient Text
```html
<h1 class="display-3 fw-bold mb-4">
    Create Stunning Video Ads 
    <span class="gradient-text-enhanced">in Minutes</span>
</h1>
```

### Stats Counter
```html
<div class="stats-item">
    <div class="stats-number" data-count="10000">0</div>
    <small class="text-muted">Videos Created</small>
</div>
```

## 🛠️ Utility Classes

### Text Colors
```html
<p class="text-primary-accent">Blue accent text</p>
<p class="text-secondary-accent">Purple accent text</p>
<p class="text-success-accent">Green accent text</p>
<p class="text-warning-accent">Orange accent text</p>
<p class="text-muted">Muted secondary text</p>
```

### Backgrounds
```html
<div class="bg-surface">Surface background</div>
<div class="bg-surface-2">Secondary surface</div>
<div class="bg-gradient-primary">Primary gradient</div>
<div class="bg-gradient-secondary">Secondary gradient</div>
```

### Effects
```html
<div class="glass-effect">Glass morphism effect</div>
<div class="shadow-enhanced">Enhanced shadow</div>
<div class="shadow-glow">Glowing shadow</div>
```

## 📱 Usage in Blade Templates

### Include the CSS
```blade
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Page - VidsAI</title>
    
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Bootstrap Icons -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
    <!-- VidsAI Theme -->
    <link rel="stylesheet" href="{{ asset('css/vidsai-theme.css') }}">
</head>
<body class="animated-background">
    <!-- Your content here -->
</body>
</html>
```

### Example Page Structure
```blade
<body class="animated-background">
    <!-- Navigation -->
    <nav class="navbar navbar-expand-lg navbar-dark glass-nav fixed-top">
        <!-- Nav content -->
    </nav>

    <!-- Hero Section -->
    <section class="min-vh-100 d-flex align-items-center">
        <div class="container">
            <div class="row">
                <div class="col-lg-6 fade-in-left">
                    <h1 class="display-3 fw-bold mb-4">
                        Your Page Title
                        <span class="gradient-text-enhanced">with Accent</span>
                    </h1>
                    <p class="lead mb-5 text-muted">Description text here...</p>
                    <div class="d-flex gap-4">
                        <a href="#" class="btn btn-primary-enhanced btn-lg">
                            <i class="bi bi-play-circle me-2"></i>Primary Action
                        </a>
                        <a href="#" class="btn btn-outline-enhanced btn-lg">
                            Secondary Action
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Features Section -->
    <section class="py-5">
        <div class="container">
            <div class="row g-4">
                <div class="col-md-6 col-lg-4 fade-in-up">
                    <div class="feature-card-enhanced h-100">
                        <div class="feature-icon feature-icon-1">
                            <i class="bi bi-star text-white"></i>
                        </div>
                        <h4 class="fw-bold mb-3">Feature Title</h4>
                        <p class="text-muted">Feature description...</p>
                    </div>
                </div>
            </div>
        </div>
    </section>
</body>
```

## 🎨 Color Usage Guidelines

### Primary Actions
- Use `--gradient-primary` (blue to purple) for main CTAs
- Use `--accent-blue` for links and interactive elements

### Success States
- Use `--accent-green` or `--gradient-success` for positive feedback
- Use for completed states, success messages

### Warnings/Highlights
- Use `--accent-orange` or `--gradient-warning` for attention-grabbing elements
- Use for important notifications, highlights

### Backgrounds
- Use `--dark-bg` for main page background
- Use `--dark-surface` for cards and containers
- Use `--dark-surface-2` for nested elements

### Text
- Use `--dark-text` for primary text
- Use `--dark-text-secondary` for less important text
- Use accent colors sparingly for emphasis

## 🔄 Animations & Interactions

### Hover Effects
Most components include hover effects:
- Buttons: lift up and glow
- Cards: lift up and scale slightly
- Icons: scale and rotate

### Loading States
Use Bootstrap spinners with primary color:
```html
<div class="spinner-border text-primary" role="status">
    <span class="visually-hidden">Loading...</span>
</div>
```

### Transitions
All interactive elements use smooth transitions:
- Fast: `--transition-fast` (0.3s)
- Medium: `--transition-medium` (0.4s cubic-bezier)
- Slow: `--transition-slow` (0.5s)

## 📐 Spacing & Layout

### Border Radius
- Small: `--border-radius-sm` (8px)
- Medium: `--border-radius-md` (12px)
- Large: `--border-radius-lg` (16px)
- Extra Large: `--border-radius-xl` (20px)
- 2X Large: `--border-radius-2xl` (24px)

### Shadows
- Small: `--shadow-sm` - subtle glow
- Medium: `--shadow-md` - standard depth
- Large: `--shadow-lg` - elevated elements
- Extra Large: `--shadow-xl` - prominent elements

## 🚀 Best Practices

1. **Consistency**: Always use CSS variables instead of hardcoded colors
2. **Accessibility**: Maintain good contrast ratios
3. **Performance**: Use CSS transforms for animations
4. **Responsive**: Test on mobile devices
5. **Semantic**: Use appropriate HTML elements and ARIA labels

## 📱 Mobile Considerations

The design system is fully responsive:
- Buttons adjust size on mobile
- Cards have reduced padding
- Animations are optimized for touch devices
- Glass effects work across all browsers

---

**Happy Designing! 🎨**

Use this design system to create consistent, beautiful pages across your VidsAI application.

