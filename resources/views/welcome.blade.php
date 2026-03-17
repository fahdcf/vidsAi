<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>VidsAI — AI-Powered Video Ad Generator</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
    <style>
        /* ============================================
           VidsAI Design System
           DNA: Linear.app / Vercel aesthetic
           Base: #0F1117 | Blue: #2563EB | Amber: #F59E0B
           ============================================ */
        :root {
            --bg:          #0F1117;
            --surface:     #161B27;
            --surface-2:   #1C2233;
            --border:      rgba(255,255,255,0.08);
            --border-hover:rgba(255,255,255,0.14);
            --blue:        #2563EB;
            --blue-glow:   rgba(37,99,235,0.25);
            --amber:       #F59E0B;
            --amber-glow:  rgba(245,158,11,0.15);
            --white:       #FFFFFF;
            --white-60:    rgba(255,255,255,0.6);
            --white-40:    rgba(255,255,255,0.4);
            --white-08:    rgba(255,255,255,0.08);
            --radius-sm:   8px;
            --radius-md:   12px;
            --radius-lg:   16px;
            --radius-xl:   20px;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            background: var(--bg);
            color: var(--white);
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            line-height: 1.6;
            overflow-x: hidden;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        /* Utility */
        .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
        .container-narrow { max-width: 800px; margin: 0 auto; padding: 0 24px; }

        /* ============================================
           SECTION 1: Navigation Bar
           72px height, frosted glass, sticky
           ============================================ */
        .nav-bar {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 72px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 40px;
            background: rgba(15,17,23,0.7);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-bottom: 1px solid var(--border);
            z-index: 1000;
            transition: background 0.3s ease;
        }
        .nav-bar.scrolled {
            background: rgba(15,17,23,0.92);
        }

        .nav-logo {
            display: flex;
            align-items: center;
            gap: 10px;
            text-decoration: none;
            color: var(--white);
        }
        .nav-logo-icon {
            width: 36px;
            height: 36px;
            background: var(--blue);
            border-radius: var(--radius-sm);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 16px;
            color: var(--white);
        }
        .nav-logo-text {
            font-size: 20px;
            font-weight: 700;
            letter-spacing: -0.02em;
        }

        .nav-links {
            display: flex;
            align-items: center;
            gap: 32px;
            list-style: none;
        }
        .nav-links a {
            color: var(--white-60);
            text-decoration: none;
            font-size: 14px;
            font-weight: 500;
            transition: color 0.2s ease;
        }
        .nav-links a:hover { color: var(--white); }

        .nav-actions {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .btn-ghost {
            background: transparent;
            border: 1px solid var(--border);
            color: var(--white-60);
            padding: 8px 20px;
            border-radius: var(--radius-sm);
            font-size: 14px;
            font-weight: 500;
            font-family: inherit;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
        }
        .btn-ghost:hover {
            color: var(--white);
            border-color: var(--border-hover);
            background: var(--white-08);
        }

        .btn-primary {
            background: var(--blue);
            border: none;
            color: var(--white);
            padding: 8px 20px;
            border-radius: var(--radius-sm);
            font-size: 14px;
            font-weight: 600;
            font-family: inherit;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            box-shadow: 0 0 20px var(--blue-glow);
        }
        .btn-primary:hover {
            background: #3B82F6;
            box-shadow: 0 0 30px rgba(37,99,235,0.35);
            transform: translateY(-1px);
        }

        .btn-primary-lg {
            padding: 14px 32px;
            font-size: 15px;
            border-radius: var(--radius-md);
        }

        .btn-outline-lg {
            background: transparent;
            border: 1px solid var(--border);
            color: var(--white);
            padding: 14px 32px;
            border-radius: var(--radius-md);
            font-size: 15px;
            font-weight: 500;
            font-family: inherit;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }
        .btn-outline-lg:hover {
            border-color: var(--border-hover);
            background: var(--white-08);
        }

        /* ============================================
           SECTION 2: Hero Section
           Full viewport, centered, gradient orb
           ============================================ */
        .hero {
            position: relative;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 72px 24px 80px;
            overflow: hidden;
        }

        /* Studio lighting gradient orb — top-left directional */
        .hero::before {
            content: '';
            position: absolute;
            top: -20%;
            left: -10%;
            width: 700px;
            height: 700px;
            background: radial-gradient(circle, var(--blue-glow) 0%, transparent 70%);
            border-radius: 50%;
            pointer-events: none;
            animation: heroOrb 8s ease-in-out infinite;
        }
        .hero::after {
            content: '';
            position: absolute;
            bottom: -10%;
            right: -5%;
            width: 500px;
            height: 500px;
            background: radial-gradient(circle, var(--amber-glow) 0%, transparent 70%);
            border-radius: 50%;
            pointer-events: none;
            animation: heroOrb 10s ease-in-out infinite reverse;
        }
        @keyframes heroOrb {
            0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
            50% { transform: translate(30px, -20px) scale(1.1); opacity: 1; }
        }

        .hero-content {
            position: relative;
            z-index: 1;
            max-width: 800px;
        }

        .hero-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 16px;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 100px;
            font-size: 13px;
            font-weight: 500;
            color: var(--white-60);
            margin-bottom: 32px;
        }
        .hero-badge-dot {
            width: 6px;
            height: 6px;
            background: var(--amber);
            border-radius: 50%;
            animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
        }

        .hero h1 {
            font-size: clamp(40px, 6vw, 72px);
            font-weight: 800;
            line-height: 1.05;
            letter-spacing: -0.03em;
            margin-bottom: 24px;
        }
        .hero h1 .text-blue {
            color: var(--blue);
        }

        .hero-sub {
            font-size: 18px;
            color: var(--white-60);
            line-height: 1.7;
            max-width: 560px;
            margin: 0 auto 40px;
        }

        .hero-actions {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
            margin-bottom: 48px;
        }

        .hero-visual {
            position: relative;
            margin-top: 20px;
        }

        /* Browser mockup frame */
        .browser-frame {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
            overflow: hidden;
            box-shadow: 0 40px 80px rgba(0,0,0,0.4), 0 0 60px var(--blue-glow);
            max-width: 700px;
            margin: 0 auto;
        }
        .browser-frame-bar {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 16px;
            background: var(--surface-2);
            border-bottom: 1px solid var(--border);
        }
        .browser-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: var(--white-08);
        }
        .browser-dot:nth-child(1) { background: #FF5F57; }
        .browser-dot:nth-child(2) { background: #FEBC2E; }
        .browser-dot:nth-child(3) { background: #28C840; }
        .browser-frame-body {
            padding: 32px;
            min-height: 200px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .browser-frame-body img {
            width: 100%;
            height: auto;
            border-radius: var(--radius-sm);
        }
        .browser-frame-placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
            color: var(--white-40);
        }
        .browser-frame-placeholder i {
            font-size: 48px;
            color: var(--blue);
        }

        /* ============================================
           SECTION 10: CTA Banner + Footer
           ============================================ */
        .cta-section {
            padding: 120px 0;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        .cta-section::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 600px;
            height: 600px;
            background: radial-gradient(circle, var(--blue-glow) 0%, transparent 70%);
            border-radius: 50%;
            pointer-events: none;
        }
        .cta-box {
            position: relative;
            z-index: 1;
            max-width: 640px;
            margin: 0 auto;
        }
        .cta-box h2 {
            font-size: clamp(28px, 4vw, 44px);
            font-weight: 800;
            letter-spacing: -0.02em;
            line-height: 1.15;
            margin-bottom: 16px;
        }
        .cta-box p {
            font-size: 16px;
            color: var(--white-60);
            margin-bottom: 36px;
            line-height: 1.7;
        }
        .cta-actions {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
        }
        .cta-note {
            font-size: 13px;
            color: var(--white-40);
            margin-top: 20px;
        }

        /* Footer */
        .footer {
            border-top: 1px solid var(--border);
            padding: 64px 0 32px;
            background: var(--surface);
        }
        .footer-grid {
            display: grid;
            grid-template-columns: 2fr 1fr 1fr 1fr;
            gap: 48px;
            margin-bottom: 48px;
        }
        .footer-brand p {
            font-size: 14px;
            color: var(--white-40);
            line-height: 1.7;
            margin-top: 16px;
            max-width: 280px;
        }
        .footer-col h4 {
            font-size: 13px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: var(--white-60);
            margin-bottom: 16px;
        }
        .footer-col ul {
            list-style: none;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .footer-col a {
            color: var(--white-40);
            text-decoration: none;
            font-size: 14px;
            transition: color 0.2s;
        }
        .footer-col a:hover { color: var(--white); }
        .footer-bottom {
            border-top: 1px solid var(--border);
            padding-top: 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .footer-bottom span {
            font-size: 13px;
            color: var(--white-40);
        }
        .footer-socials {
            display: flex;
            gap: 16px;
        }
        .footer-socials a {
            color: var(--white-40);
            font-size: 18px;
            text-decoration: none;
            transition: color 0.2s;
        }
        .footer-socials a:hover { color: var(--white); }

        /* ============================================
           SECTION 9: Testimonials
           3 quote cards, avatar, name, role, stars
           ============================================ */
        .testimonials {
            padding: 120px 0;
            background: var(--surface);
            border-top: 1px solid var(--border);
            border-bottom: 1px solid var(--border);
        }
        .test-header {
            text-align: center;
            margin-bottom: 64px;
        }
        .test-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 24px;
        }
        .test-card {
            background: var(--surface-2);
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
            padding: 32px;
            transition: border-color 0.3s ease;
        }
        .test-card:hover {
            border-color: var(--border-hover);
        }
        .test-stars {
            display: flex;
            gap: 2px;
            margin-bottom: 16px;
        }
        .test-stars i { color: var(--amber); font-size: 14px; }
        .test-quote {
            font-size: 15px;
            color: var(--white-60);
            line-height: 1.7;
            margin-bottom: 24px;
            font-style: italic;
        }
        .test-author {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .test-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--blue), #8B5CF6);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            font-weight: 700;
            color: var(--white);
            flex-shrink: 0;
        }
        .test-author-info h4 {
            font-size: 14px;
            font-weight: 600;
        }
        .test-author-info span {
            font-size: 12px;
            color: var(--white-40);
        }

        /* ============================================
           SECTION 8: Use Cases — 3 Cards
           Top accent border, icon, title, bullets
           ============================================ */
        .use-cases {
            padding: 120px 0;
        }
        .uc-header {
            text-align: center;
            margin-bottom: 64px;
        }
        .uc-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 24px;
        }
        .uc-card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
            padding: 36px 28px;
            position: relative;
            overflow: hidden;
            transition: border-color 0.3s ease, transform 0.3s ease;
        }
        .uc-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
        }
        .uc-card:hover {
            border-color: var(--border-hover);
            transform: translateY(-4px);
        }
        .uc-card.uc-blue::before { background: var(--blue); }
        .uc-card.uc-amber::before { background: var(--amber); }
        .uc-card.uc-green::before { background: #34D399; }
        .uc-card-icon {
            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: var(--radius-md);
            font-size: 22px;
            margin-bottom: 20px;
        }
        .uc-card h3 {
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 12px;
        }
        .uc-card p {
            font-size: 14px;
            color: var(--white-60);
            line-height: 1.6;
            margin-bottom: 16px;
        }
        .uc-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        .uc-tag {
            font-size: 12px;
            font-weight: 500;
            padding: 4px 12px;
            border-radius: 100px;
            border: 1px solid var(--border);
            color: var(--white-40);
            background: var(--surface-2);
        }

        /* ============================================
           SECTION 7: How It Works — 4 Steps
           Horizontal numbered steps with connecting line
           ============================================ */
        .how-it-works {
            padding: 120px 0;
            background: var(--surface);
            border-top: 1px solid var(--border);
            border-bottom: 1px solid var(--border);
        }
        .hiw-header {
            text-align: center;
            margin-bottom: 72px;
        }
        .hiw-steps {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 32px;
            position: relative;
        }
        /* Connecting line behind steps */
        .hiw-steps::before {
            content: '';
            position: absolute;
            top: 36px;
            left: 10%;
            right: 10%;
            height: 2px;
            background: linear-gradient(90deg, var(--border), var(--blue), var(--border));
            z-index: 0;
        }
        .hiw-step {
            text-align: center;
            position: relative;
            z-index: 1;
        }
        .hiw-number {
            width: 72px;
            height: 72px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: 800;
            margin: 0 auto 20px;
            background: var(--bg);
            border: 2px solid var(--border);
            color: var(--white-60);
            transition: all 0.3s ease;
        }
        .hiw-step:hover .hiw-number {
            border-color: var(--blue);
            color: var(--blue);
            box-shadow: 0 0 30px var(--blue-glow);
        }
        .hiw-step h3 {
            font-size: 16px;
            font-weight: 700;
            margin-bottom: 8px;
        }
        .hiw-step p {
            font-size: 14px;
            color: var(--white-40);
            line-height: 1.6;
            max-width: 220px;
            margin: 0 auto;
        }

        /* ============================================
           SECTION 6: Product Showcase
           Large centered mockup with floating cards
           ============================================ */
        .showcase {
            padding: 120px 0;
            position: relative;
            overflow: hidden;
        }
        .showcase-header {
            text-align: center;
            margin-bottom: 64px;
        }
        .showcase-frame {
            position: relative;
            max-width: 960px;
            margin: 0 auto;
        }
        .showcase-screen {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: var(--radius-xl);
            overflow: hidden;
            box-shadow: 0 60px 120px rgba(0,0,0,0.4), 0 0 80px var(--blue-glow);
        }
        .showcase-screen-bar {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 16px 20px;
            background: var(--surface-2);
            border-bottom: 1px solid var(--border);
        }
        .showcase-screen-body {
            padding: 40px;
            min-height: 360px;
            position: relative;
        }
        /* Pipeline visualization inside showcase */
        .pipeline-visual {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 24px;
            flex-wrap: wrap;
        }
        .pipeline-step {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
            text-align: center;
        }
        .pipeline-icon {
            width: 64px;
            height: 64px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: var(--radius-md);
            font-size: 28px;
            background: var(--surface);
            border: 1px solid var(--border);
            transition: all 0.3s ease;
        }
        .pipeline-icon.active {
            border-color: var(--blue);
            box-shadow: 0 0 20px var(--blue-glow);
        }
        .pipeline-step span {
            font-size: 12px;
            color: var(--white-40);
            font-weight: 500;
        }
        .pipeline-arrow {
            color: var(--white-40);
            font-size: 20px;
        }
        /* Floating annotations */
        .showcase-float {
            position: absolute;
            background: var(--surface-2);
            border: 1px solid var(--border);
            border-radius: var(--radius-md);
            padding: 14px 18px;
            font-size: 13px;
            font-weight: 500;
            color: var(--white-60);
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 12px 32px rgba(0,0,0,0.3);
            white-space: nowrap;
            z-index: 2;
        }
        .showcase-float i { color: var(--blue); font-size: 18px; }
        .sf-top-right { top: -20px; right: -40px; }
        .sf-bottom-left { bottom: -20px; left: -40px; }
        .sf-bottom-right { bottom: 40px; right: -60px; }

        /* ============================================
           SECTION 5: Feature Grid
           3x2 frosted glass cards, icon+title+desc
           ============================================ */
        .features {
            padding: 120px 0;
            background: var(--surface);
            border-top: 1px solid var(--border);
            border-bottom: 1px solid var(--border);
        }
        .section-label {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--blue);
            margin-bottom: 16px;
        }
        .section-heading {
            font-size: clamp(28px, 4vw, 40px);
            font-weight: 800;
            letter-spacing: -0.02em;
            line-height: 1.15;
            margin-bottom: 16px;
        }
        .section-sub {
            font-size: 16px;
            color: var(--white-60);
            max-width: 560px;
            line-height: 1.7;
            margin-bottom: 56px;
        }
        .feature-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 24px;
        }
        .feature-card {
            background: var(--surface-2);
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
            padding: 32px;
            transition: border-color 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease;
        }
        .feature-card:hover {
            border-color: var(--border-hover);
            transform: translateY(-4px);
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        }
        .feature-icon {
            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: var(--radius-md);
            font-size: 22px;
            margin-bottom: 20px;
        }
        .fi-blue {
            background: rgba(37,99,235,0.12);
            color: var(--blue);
        }
        .fi-amber {
            background: var(--amber-glow);
            color: var(--amber);
        }
        .fi-green {
            background: rgba(52,211,153,0.12);
            color: #34D399;
        }
        .feature-card h3 {
            font-size: 17px;
            font-weight: 700;
            margin-bottom: 8px;
            letter-spacing: -0.01em;
        }
        .feature-card p {
            font-size: 14px;
            color: var(--white-60);
            line-height: 1.6;
        }

        /* ============================================
           SECTION 4: Problem / Solution
           Two-column, pain vs. gain
           ============================================ */
        .problem-solution {
            padding: 120px 0;
        }
        .ps-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 64px;
            align-items: start;
        }
        .ps-column-label {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-bottom: 24px;
            padding: 6px 14px;
            border-radius: 100px;
        }
        .ps-label-problem {
            color: #F87171;
            background: rgba(248,113,113,0.1);
            border: 1px solid rgba(248,113,113,0.2);
        }
        .ps-label-solution {
            color: #34D399;
            background: rgba(52,211,153,0.1);
            border: 1px solid rgba(52,211,153,0.2);
        }
        .ps-heading {
            font-size: 32px;
            font-weight: 700;
            letter-spacing: -0.02em;
            line-height: 1.2;
            margin-bottom: 24px;
        }
        .ps-list {
            list-style: none;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }
        .ps-list li {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            font-size: 15px;
            color: var(--white-60);
            line-height: 1.6;
        }
        .ps-list li i {
            font-size: 18px;
            margin-top: 2px;
            flex-shrink: 0;
        }
        .ps-list-problem li i { color: #F87171; }
        .ps-list-solution li i { color: #34D399; }

        /* ============================================
           SECTION 3: Social Proof Metrics Strip
           80px, border-top/bottom, 4 metrics
           ============================================ */
        .social-proof {
            border-top: 1px solid var(--border);
            border-bottom: 1px solid var(--border);
            background: var(--surface);
            padding: 24px 0;
        }
        .social-proof-inner {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 64px;
            flex-wrap: wrap;
        }
        .proof-item {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .proof-number {
            font-size: 28px;
            font-weight: 800;
            letter-spacing: -0.02em;
            color: var(--white);
        }
        .proof-number .accent { color: var(--blue); }
        .proof-label {
            font-size: 13px;
            color: var(--white-40);
            font-weight: 500;
            line-height: 1.3;
        }
        .proof-divider {
            width: 1px;
            height: 32px;
            background: var(--border);
        }

        /* ============================================
           Responsive
           ============================================ */
        @media (max-width: 768px) {
            .nav-bar { padding: 0 20px; }
            .nav-links { display: none; }
            .hero { padding: 72px 16px 60px; }
            .hero-actions { flex-direction: column; }
            .browser-frame { max-width: 100%; }
            .social-proof-inner { gap: 32px; }
            .proof-divider { display: none; }
            .ps-grid { grid-template-columns: 1fr; gap: 48px; }
            .feature-grid { grid-template-columns: 1fr; }
            .showcase-float { display: none; }
            .pipeline-arrow { display: none; }
            .pipeline-visual { gap: 16px; }
            .hiw-steps { grid-template-columns: repeat(2, 1fr); }
            .hiw-steps::before { display: none; }
            .uc-grid { grid-template-columns: 1fr; }
            .test-grid { grid-template-columns: 1fr; }
            .cta-actions { flex-direction: column; }
            .footer-grid { grid-template-columns: 1fr 1fr; }
        }
    </style>
</head>
<body>

    <!-- SECTION 1: Navigation -->
    <nav class="nav-bar" id="navbar">
        <a href="{{ route('home') }}" class="nav-logo">
            <div class="nav-logo-icon">V</div>
            <span class="nav-logo-text">VidsAI</span>
        </a>

        <ul class="nav-links">
            <li><a href="#features">Features</a></li>
            <li><a href="#how-it-works">How It Works</a></li>
            <li><a href="#use-cases">Use Cases</a></li>
            <li><a href="{{ route('pricing') }}">Pricing</a></li>
        </ul>

        <div class="nav-actions">
            @auth
                <a href="{{ route('dashboard') }}" class="btn-primary">Dashboard</a>
            @else
                <a href="{{ route('login') }}" class="btn-ghost">Log In</a>
                <a href="{{ route('register') }}" class="btn-primary">Get Started</a>
            @endauth
        </div>
    </nav>

    <!-- SECTION 2: Hero -->
    <section class="hero">
        <div class="hero-content">
            <div class="hero-badge">
                <span class="hero-badge-dot"></span>
                Now with AI-powered scene generation
            </div>

            <h1>Create Stunning<br>Video Ads <span class="text-blue">in Minutes</span></h1>

            <p class="hero-sub">
                AI-generated scripts, voiceovers, and scenes — assembled into
                professional video advertisements ready for every platform.
            </p>

            <div class="hero-actions">
                @auth
                    <a href="{{ route('projects.create') }}" class="btn-primary btn-primary-lg">
                        Start Creating
                    </a>
                @else
                    <a href="{{ route('register') }}" class="btn-primary btn-primary-lg">
                        Start Creating — Free
                    </a>
                @endauth
                <a href="#how-it-works" class="btn-outline-lg">
                    <i class="bi bi-play-circle"></i>
                    See How It Works
                </a>
            </div>

            <div class="hero-visual">
                <div class="browser-frame">
                    <div class="browser-frame-bar">
                        <span class="browser-dot"></span>
                        <span class="browser-dot"></span>
                        <span class="browser-dot"></span>
                    </div>
                    <div class="browser-frame-body">
                        <div class="browser-frame-placeholder">
                            <i class="bi bi-film"></i>
                            <span>AI Video Generation Pipeline</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- SECTION 3: Social Proof Metrics Strip -->
    <section class="social-proof">
        <div class="container">
            <div class="social-proof-inner">
                <div class="proof-item">
                    <span class="proof-number">10<span class="accent">K+</span></span>
                    <span class="proof-label">Videos<br>Generated</span>
                </div>
                <div class="proof-divider"></div>
                <div class="proof-item">
                    <span class="proof-number">2<span class="accent">K+</span></span>
                    <span class="proof-label">Active<br>Creators</span>
                </div>
                <div class="proof-divider"></div>
                <div class="proof-item">
                    <span class="proof-number">50<span class="accent">+</span></span>
                    <span class="proof-label">Languages<br>Supported</span>
                </div>
                <div class="proof-divider"></div>
                <div class="proof-item">
                    <span class="proof-number">4.9<span class="accent">★</span></span>
                    <span class="proof-label">Average<br>Rating</span>
                </div>
            </div>
        </div>
    </section>

    <!-- SECTION 4: Problem / Solution -->
    <section class="problem-solution">
        <div class="container">
            <div class="ps-grid">
                <!-- Problem Column -->
                <div>
                    <div class="ps-label-problem ps-column-label">
                        <i class="bi bi-x-circle-fill"></i> The Old Way
                    </div>
                    <h2 class="ps-heading">Video production is slow, expensive, and complex</h2>
                    <ul class="ps-list ps-list-problem">
                        <li>
                            <i class="bi bi-x-lg"></i>
                            Hiring videographers, editors, and voiceover artists costs thousands per video
                        </li>
                        <li>
                            <i class="bi bi-x-lg"></i>
                            Weeks of back-and-forth revisions before a single ad goes live
                        </li>
                        <li>
                            <i class="bi bi-x-lg"></i>
                            Managing multiple tools for script, audio, subtitles, and editing
                        </li>
                        <li>
                            <i class="bi bi-x-lg"></i>
                            Scaling content across languages and platforms is nearly impossible
                        </li>
                    </ul>
                </div>

                <!-- Solution Column -->
                <div>
                    <div class="ps-label-solution ps-column-label">
                        <i class="bi bi-check-circle-fill"></i> The VidsAI Way
                    </div>
                    <h2 class="ps-heading">One prompt. Professional video. Every platform.</h2>
                    <ul class="ps-list ps-list-solution">
                        <li>
                            <i class="bi bi-check-lg"></i>
                            AI generates scripts, voiceovers, and scenes — all from a single brief
                        </li>
                        <li>
                            <i class="bi bi-check-lg"></i>
                            Go from idea to finished video ad in under 10 minutes
                        </li>
                        <li>
                            <i class="bi bi-check-lg"></i>
                            One integrated pipeline: script → voice → scenes → subtitles → export
                        </li>
                        <li>
                            <i class="bi bi-check-lg"></i>
                            50+ languages with dialect-aware voiceover and subtitle alignment
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </section>

    <!-- SECTION 5: Feature Grid -->
    <section class="features" id="features">
        <div class="container">
            <div class="section-label">
                <i class="bi bi-grid-3x3-gap-fill"></i> Core Features
            </div>
            <h2 class="section-heading">Everything you need<br>to create video ads</h2>
            <p class="section-sub">
                A complete AI pipeline that handles every step — from the first word of your script to the final rendered export.
            </p>

            <div class="feature-grid">
                <div class="feature-card">
                    <div class="feature-icon fi-blue"><i class="bi bi-pencil-square"></i></div>
                    <h3>AI Script Generation</h3>
                    <p>Gemini-powered scripts tailored to your product, audience, and platform with keyword optimization built in.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon fi-amber"><i class="bi bi-mic-fill"></i></div>
                    <h3>Natural Voiceovers</h3>
                    <p>ElevenLabs & Google TTS voices in 50+ languages — including Arabic dialect-aware synthesis.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon fi-green"><i class="bi bi-images"></i></div>
                    <h3>Smart Scene Builder</h3>
                    <p>AI analyzes your script to generate scene-by-scene visuals via Pexels, Pixabay, or custom uploads.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon fi-blue"><i class="bi bi-badge-cc-fill"></i></div>
                    <h3>Auto Subtitles</h3>
                    <p>Deepgram-powered word-level timing with multiple styles — pop-up, karaoke, highlight, and more.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon fi-amber"><i class="bi bi-music-note-beamed"></i></div>
                    <h3>Background Music</h3>
                    <p>Curated music library with intelligent volume ducking to match voiceover energy and pacing.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon fi-green"><i class="bi bi-download"></i></div>
                    <h3>One-Click Export</h3>
                    <p>Render in 1080p with FFmpeg — optimized for YouTube, TikTok, Instagram Reels, and Facebook Ads.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- SECTION 6: Product Showcase -->
    <section class="showcase">
        <div class="container">
            <div class="showcase-header">
                <div class="section-label">
                    <i class="bi bi-rocket-takeoff-fill"></i> The Pipeline
                </div>
                <h2 class="section-heading">See the full AI workflow</h2>
                <p class="section-sub" style="margin: 0 auto 0;">
                    From a single product brief to a ready-to-publish video — every step handled automatically.
                </p>
            </div>

            <div class="showcase-frame">
                <!-- Floating annotations -->
                <div class="showcase-float sf-top-right">
                    <i class="bi bi-lightning-charge-fill"></i> ~3 min generation
                </div>
                <div class="showcase-float sf-bottom-left">
                    <i class="bi bi-translate"></i> 50+ languages
                </div>
                <div class="showcase-float sf-bottom-right">
                    <i class="bi bi-film"></i> 1080p export
                </div>

                <div class="showcase-screen">
                    <div class="showcase-screen-bar">
                        <span class="browser-dot"></span>
                        <span class="browser-dot"></span>
                        <span class="browser-dot"></span>
                    </div>
                    <div class="showcase-screen-body">
                        <div class="pipeline-visual">
                            <div class="pipeline-step">
                                <div class="pipeline-icon active"><i class="bi bi-chat-text-fill"></i></div>
                                <span>Brief</span>
                            </div>
                            <div class="pipeline-arrow">→</div>
                            <div class="pipeline-step">
                                <div class="pipeline-icon"><i class="bi bi-pencil-fill"></i></div>
                                <span>Script</span>
                            </div>
                            <div class="pipeline-arrow">→</div>
                            <div class="pipeline-step">
                                <div class="pipeline-icon"><i class="bi bi-mic-fill"></i></div>
                                <span>Voiceover</span>
                            </div>
                            <div class="pipeline-arrow">→</div>
                            <div class="pipeline-step">
                                <div class="pipeline-icon"><i class="bi bi-images"></i></div>
                                <span>Scenes</span>
                            </div>
                            <div class="pipeline-arrow">→</div>
                            <div class="pipeline-step">
                                <div class="pipeline-icon"><i class="bi bi-badge-cc-fill"></i></div>
                                <span>Subtitles</span>
                            </div>
                            <div class="pipeline-arrow">→</div>
                            <div class="pipeline-step">
                                <div class="pipeline-icon active"><i class="bi bi-play-btn-fill"></i></div>
                                <span>Video</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- SECTION 7: How It Works -->
    <section class="how-it-works" id="how-it-works">
        <div class="container">
            <div class="hiw-header">
                <div class="section-label">
                    <i class="bi bi-signpost-split-fill"></i> How It Works
                </div>
                <h2 class="section-heading">Four steps to your first video</h2>
                <p class="section-sub" style="margin: 0 auto;">
                    No editing skills required. Just describe what you want and let VidsAI handle the rest.
                </p>
            </div>

            <div class="hiw-steps">
                <div class="hiw-step">
                    <div class="hiw-number">1</div>
                    <h3>Describe Your Ad</h3>
                    <p>Enter your product name, target audience, platform, and preferred tone or language.</p>
                </div>
                <div class="hiw-step">
                    <div class="hiw-number">2</div>
                    <h3>AI Generates Content</h3>
                    <p>Our AI writes the script, generates voiceover, and selects matching scenes automatically.</p>
                </div>
                <div class="hiw-step">
                    <div class="hiw-number">3</div>
                    <h3>Review &amp; Customize</h3>
                    <p>Preview every scene, swap visuals, adjust subtitles, trim clips, and add overlays or music.</p>
                </div>
                <div class="hiw-step">
                    <div class="hiw-number">4</div>
                    <h3>Export &amp; Publish</h3>
                    <p>Render in 1080p and download — ready for YouTube, TikTok, Instagram, or Facebook Ads.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- SECTION 8: Use Cases -->
    <section class="use-cases" id="use-cases">
        <div class="container">
            <div class="uc-header">
                <div class="section-label">
                    <i class="bi bi-bullseye"></i> Use Cases
                </div>
                <h2 class="section-heading">Built for every content format</h2>
                <p class="section-sub" style="margin: 0 auto;">
                    Whether you're running paid ads, growing social channels, or selling products — VidsAI adapts.
                </p>
            </div>

            <div class="uc-grid">
                <div class="uc-card uc-blue">
                    <div class="uc-card-icon fi-blue"><i class="bi bi-youtube"></i></div>
                    <h3>YouTube & Facebook Ads</h3>
                    <p>Generate high-converting video ads with AI scripts optimized for attention hooks and CTAs.</p>
                    <div class="uc-tags">
                        <span class="uc-tag">Pre-roll</span>
                        <span class="uc-tag">In-feed</span>
                        <span class="uc-tag">Discovery</span>
                    </div>
                </div>

                <div class="uc-card uc-amber">
                    <div class="uc-card-icon fi-amber"><i class="bi bi-phone"></i></div>
                    <h3>Social Media Reels</h3>
                    <p>Vertical-first content for TikTok, Instagram Reels, and YouTube Shorts with trending formats.</p>
                    <div class="uc-tags">
                        <span class="uc-tag">TikTok</span>
                        <span class="uc-tag">Reels</span>
                        <span class="uc-tag">Shorts</span>
                    </div>
                </div>

                <div class="uc-card uc-green">
                    <div class="uc-card-icon fi-green"><i class="bi bi-shop"></i></div>
                    <h3>E-Commerce Product Videos</h3>
                    <p>Showcase products with dynamic scenes, voiceover descriptions, and auto-generated subtitles.</p>
                    <div class="uc-tags">
                        <span class="uc-tag">Shopify</span>
                        <span class="uc-tag">Amazon</span>
                        <span class="uc-tag">Landing pages</span>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- SECTION 9: Testimonials -->
    <section class="testimonials">
        <div class="container">
            <div class="test-header">
                <div class="section-label">
                    <i class="bi bi-chat-quote-fill"></i> Testimonials
                </div>
                <h2 class="section-heading">Loved by creators worldwide</h2>
                <p class="section-sub" style="margin: 0 auto;">
                    See what content creators and marketers are saying about VidsAI.
                </p>
            </div>

            <div class="test-grid">
                <div class="test-card">
                    <div class="test-stars">
                        <i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i>
                    </div>
                    <p class="test-quote">"I used to spend $2K per video ad. VidsAI does it in minutes for a fraction of the cost. The Arabic voiceover quality is incredible."</p>
                    <div class="test-author">
                        <div class="test-avatar">A</div>
                        <div class="test-author-info">
                            <h4>Ahmed K.</h4>
                            <span>E-Commerce Founder</span>
                        </div>
                    </div>
                </div>

                <div class="test-card">
                    <div class="test-stars">
                        <i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i>
                    </div>
                    <p class="test-quote">"The AI-generated scripts are surprisingly good. I just tweak a few lines and export — the whole workflow feels like magic."</p>
                    <div class="test-author">
                        <div class="test-avatar">S</div>
                        <div class="test-author-info">
                            <h4>Sarah M.</h4>
                            <span>Social Media Manager</span>
                        </div>
                    </div>
                </div>

                <div class="test-card">
                    <div class="test-stars">
                        <i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i>
                    </div>
                    <p class="test-quote">"We scaled our YouTube ad output from 2 videos/month to 20. The subtitle alignment and scene matching are top-tier."</p>
                    <div class="test-author">
                        <div class="test-avatar">R</div>
                        <div class="test-author-info">
                            <h4>Ryan L.</h4>
                            <span>Performance Marketer</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- SECTION 10: CTA + Footer -->
    <section class="cta-section">
        <div class="container">
            <div class="cta-box">
                <h2>Ready to create your<br>first video ad?</h2>
                <p>Join thousands of creators using AI to produce professional video advertisements in minutes, not weeks.</p>
                <div class="cta-actions">
                    @auth
                        <a href="{{ route('projects.create') }}" class="btn-primary btn-primary-lg">
                            Create Your First Video
                        </a>
                    @else
                        <a href="{{ route('register') }}" class="btn-primary btn-primary-lg">
                            Get Started — It's Free
                        </a>
                    @endauth
                    <a href="{{ route('pricing') }}" class="btn-outline-lg">View Pricing</a>
                </div>
                <p class="cta-note">No credit card required &bull; Free tier available</p>
            </div>
        </div>
    </section>

    <footer class="footer">
        <div class="container">
            <div class="footer-grid">
                <div class="footer-brand">
                    <a href="{{ route('home') }}" class="nav-logo" style="margin-bottom: 0;">
                        <div class="nav-logo-icon">V</div>
                        <span class="nav-logo-text">VidsAI</span>
                    </a>
                    <p>AI-powered video advertisement generator. From script to screen in minutes.</p>
                </div>
                <div class="footer-col">
                    <h4>Product</h4>
                    <ul>
                        <li><a href="#features">Features</a></li>
                        <li><a href="#how-it-works">How It Works</a></li>
                        <li><a href="#use-cases">Use Cases</a></li>
                        <li><a href="{{ route('pricing') }}">Pricing</a></li>
                    </ul>
                </div>
                <div class="footer-col">
                    <h4>Resources</h4>
                    <ul>
                        <li><a href="#">Documentation</a></li>
                        <li><a href="#">API Reference</a></li>
                        <li><a href="#">Changelog</a></li>
                    </ul>
                </div>
                <div class="footer-col">
                    <h4>Company</h4>
                    <ul>
                        <li><a href="#">About</a></li>
                        <li><a href="#">Contact</a></li>
                        <li><a href="#">Privacy</a></li>
                        <li><a href="#">Terms</a></li>
                    </ul>
                </div>
            </div>
            <div class="footer-bottom">
                <span>&copy; {{ date('Y') }} VidsAI. All rights reserved.</span>
                <div class="footer-socials">
                    <a href="#"><i class="bi bi-twitter-x"></i></a>
                    <a href="#"><i class="bi bi-github"></i></a>
                    <a href="#"><i class="bi bi-youtube"></i></a>
                </div>
            </div>
        </div>
    </footer>

    <script>
        // Navbar scroll effect
        window.addEventListener('scroll', () => {
            const nav = document.getElementById('navbar');
            nav.classList.toggle('scrolled', window.scrollY > 20);
        });

        // Smooth scroll for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });

        // Intersection Observer for fade-in animations
        const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -40px 0px' };
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        document.querySelectorAll('.feature-card, .uc-card, .test-card, .hiw-step, .ps-grid > div').forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(el);
        });
    </script>
</body>
</html>
