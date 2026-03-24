# VidsAI — Master Project Document · March 2026

## 1. What Is VidsAI
VidsAI is a full-stack AI-powered video generation platform built for social media content creators, performance marketers, and creative agencies. The platform takes a written script or an uploaded voiceover audio file as input and produces a finished, platform-ready video as output — complete with synchronized subtitles, scene transitions, background music, and optional overlays.

The entire pipeline from raw audio to exported MP4 is automated. The user's role is to review and direct the output, not to edit manually. VidsAI is specifically designed for the content formats that dominate modern social media: TikTok, Instagram Reels, YouTube Shorts, and performance marketing ad creatives.

**Core value proposition:** Turn a script or voiceover into a professionally edited video in under 5 minutes
**Key differentiators:** AI-driven scene generation, 7 animated subtitle styles, full Arabic RTL support
**Target users:** Content creators, performance marketers, social media agencies
**Target formats:** TikTok 9:16, Instagram Reels, YouTube Shorts 9:16, Square 1:1, Widescreen 16:9

---

## 2. Technical Architecture

### 2.1 Two-Service Architecture
VidsAI is split into two independently deployable services. This separation isolates CPU-intensive video rendering from web request handling, allows each service to scale independently, and keeps the PHP and JavaScript ecosystems cleanly separated.

**Service 1 — Laravel Backend (PHP 8.2+, Laravel 12)**
- Handles: business logic, project state, AI orchestration, subtitle timing, user auth
- Database: SQLite (local dev) / MySQL (production rollback)
- Queue: Laravel database queue driver
- Frontend: Blade templates + Bootstrap + Vite

**Service 2 — Node.js Render Service (Node.js 18, Express 4, Remotion 4)**
- Handles: video composition, frame rendering, media caching, output encoding
- Port: 5001
- Entry point: `server.js`
- Render engine: Remotion 4 + headless Chromium

### 2.2 Full Data Flow
1. User uploads voiceover.mp3 or pastes a script
2. Deepgram transcribes audio → word-level timestamps (millisecond precision)
3. Google Gemini analyzes transcript → scene list with keywords + durations
4. Pexels API searched per scene → stock clip URLs returned (OR: WAN AI generates clips from prompts)
5. User reviews scenes on `/review` page → confirms, trims, regenerates as needed
6. User picks subtitle style + music from Freesound API
7. Aeneas (Python/Docker) aligns transcript → precise subtitle timing segments
8. `EditStateBuilder` constructs complete `EditState` JSON payload
9. Laravel POSTs EditState to Node.js render service `POST /render`
10. `videoCache.js` downloads + validates all clips (magic byte verification)
11. Duration resolved per clip via `ffprobe`
12. Remotion renders `VideoMerger` frame-by-frame via headless Chromium
13. H264 MP4 written to disk
14. Output uploaded to 0x0.st (TEMPORARY — to be replaced with R2)
15. Laravel stores URL on Project → status = `completed`
16. User downloads finished video

### 2.3 Project Status State Machine
- `pending`: GenerateScenesFromVoiceJob dispatched
- `processing`: Deepgram transcription + Gemini scene generation running
- `reviewing`: Scenes generated successfully. User reviews/edits on /review
- `subtitle_selection`: User confirms scenes, picks subtitle style + music
- `subtitle_generating`: ProcessSubtitleGenerationJob + render trigger running
- `completed`: Render finished, final video URL stored
- `failed`: Any job throws error

---

## 3. Current System Capabilities

### 3.1 What the System Can Do Today
- **Video Transitions (7 types)**: zoom-in, zoom-out, fade, slide-left, slide-right, slide-up, slide-down, none.
- **Per-Clip Animations (Ken Burns)**: zoom-in, zoom-out, none.
- **Subtitle Animation Styles (7 styles)**: progressive_highlight, tiktok_trending, arabic_banner, rectangular, rounded_progressive, rectangular_banner, default.
- **Arabic and RTL Support**: Automatic Arabic character detection, dynamic RTL layout switching, Aeneas alignment, `arabic_banner` style.
- **Audio System**: Dual audio tracks (voiceover + music), ducking controls, fades.
- **Overlay System**: Positioning, opacity, fade animations, width control.
- **Output Formats**: 9:16, 1:1, 16:9 (H264 codec, 30fps).

### 3.2 What the System Cannot Do Yet
- Beat-sync cuts (planned via Remotion useAudioData)
- Speed ramps / slow-mo (planned)
- Motion graphics / Lottie (stub exists)
- Branded templates
- Platform export presets
- Hook optimization AI & CTA placement AI
- Remotion Lambda (cloud burst rendering)
- S3 / R2 storage (Phase 0 priority)
- AI agent director (core new vision)

---

## 4. Critical Production Risks
1. **BUG 1 — In-Memory Job State [server.js]**: Render jobs stored in RAM. Wipe on restart. Needs SQLite persistence (`better-sqlite3`).
2. **BUG 2 — No Render Queue or Concurrency Control [server.js]**: Unlimited Chrome instances will OOM server. Needs `MAX_CONCURRENT=2`.
3. **BUG 3 — 0x0.st as File Host [srv/utils/uploadTo0x0.js]**: Public temp files expire. Needs Cloudflare R2 replacement.
4. **BUG 4 — Temp File Cleanup Bug [srv/video/mergeVideos.js]**: `cleanupFiles()` called with string instead of array. Disk fills up.
5. **BUG 5 — No Request Validation on /render [server.js]**: Missing Zod schemas.
6. **DEBT 1 — Debug Routes in Production [routes/web.php]**: Needs env gating.
7. **DEBT 2 — ProjectController Monolith**: Needs splitting (e.g., `SceneReviewController`).

---

## 5. Work Already Completed

### 5.1 Timeline Data Model Refactor — DONE ✅
The entire Remotion render service now operates on a unified `EditState` data structure instead of flat props.
- `remotion/types/timeline.ts` constructed
- `remotion/utils/legacyAdapter.ts` handles backward compatibility
- Fully verified with 0 TypeScript errors and verified renders.

### 5.2 The EditState Schema
JSON object that fully describes the video edit (width, height, tracks for video, subtitles, overlays, motion_graphics, audio). It is the single source of truth.

---

## 6. The New Vision — AI Agent Director

### 6.1 The Core Idea
Shift from hardcoded generic templates to an LLM AI Agent. The AI queries a RAG system of editing rules, builds a creative strategy, executes tools sequentially, and observes the results.

### 6.2 The Tool Belt System
Every action is a tool: `cut_clip`, `add_transition`, `set_subtitle_style`, `create_motion_graphic` (LLM writes Remotion TSX component on demand), `find_stock_clip`, etc.

### 6.3 The RAG Strategy System
Contains 50+ detailed breakdowns of viral strategies, pacing guides, emotion-technique mappings, hook patterns, color mood associations. 

### 6.4 The Agent Execution Loop
ANALYZE → CLARIFY (ask user specs) → PLAN (output strategy) → EXECUTE (call tools) → REVIEW (score output) → PRESENT.

### 6.5 Style Cloning
User uploads reference video -> frames to Gemini Vision -> exact fingerprint (cut freq, transitions) -> Agent applies to new clip.

---

## 7. Chat Editing and Fast Iteration Architecture
- **Tier 1 — Instant Browser Preview**: Websocket pushes EditState updates to `@remotion/player` running live in browser. (0-2s)
- **Tier 2 — Scene Preview**: Renders single scene at 480p. (10-30s)
- **Tier 3 — Full Export**: True export wait time (4-8 mins).

---

## 8. Future Manual Editing Interface
The `EditState` already fully supports a CapCut-style manual timeline interface natively.

---

## 9. Immediate Next Steps (Phase 0)
*These must happen before any feature work, preventing server crashes under load.*
1. Fix temp cleanup bug (`srv/video/mergeVideos.js`)
2. Render queue with `MAX_CONCURRENT=2` (`server.js`)
3. SQLite job persistence (`srv/utils/jobStore.js`)
4. Replace 0x0.st with Cloudflare R2 (`srv/utils/uploadToR2.js`)
5. Gate debug routes (`routes/web.php`)
6. Add Zod validate on `/render` (`server.js`)
