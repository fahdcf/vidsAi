================================================================================
                    VIDSAI — TECHNICAL ARCHITECTURE & ENGINEERING REPORT
                         Version 1.0  |  March 2026  |  Confidential
================================================================================


================================================================================
TABLE OF CONTENTS
================================================================================

  1.  Executive Summary
  2.  System Architecture
  3.  Data Model
  4.  Core Services & Components
  5.  External Integrations
  6.  Critical Production Risks
  7.  Technical Debt Inventory
  8.  Performance Analysis
  9.  Phased Improvement Roadmap
  10. Security Considerations
  11. Testing Strategy
  12. Recommended Target Architecture
  13. Appendix — Complete File Map
  14. Conclusion


================================================================================
1. EXECUTIVE SUMMARY
================================================================================

VidsAI is a full-stack AI-powered video generation platform designed for social
media content creators, performance marketers, and agencies. The platform
transforms written scripts or uploaded voiceovers into polished, multi-scene
video ads with synchronized subtitles, background music, and scene transitions.

The system is architected as two decoupled services communicating over HTTP:
a Laravel 12 PHP backend handling all business logic, user state, and
orchestration; and a Node.js + Express rendering backend powered by the
Remotion React-based video composition library.

  ★  Target output: TikTok, Instagram Reels, YouTube Shorts, and long-form ads
  ★  Core differentiator: AI-driven scene generation + animated subtitle styles
     + Arabic RTL support
  ★  Current stage: Functional MVP with production-readiness gaps in rendering

--------------------------------------------------------------------------------
TECHNOLOGY STACK SUMMARY
--------------------------------------------------------------------------------

  Layer               Technology                      Role
  ──────────────────────────────────────────────────────────────────────────────
  Backend / API       Laravel 12, PHP 8.2+            Business logic, auth,
                                                      queue, orchestration
  Render Service      Node.js 18, Express 4,          Video composition and
                      Remotion 4                      encoding
  AI / NLP            Google Gemini API               Script analysis, scene
                                                      generation
  Transcription       Deepgram API                    Voiceover-to-subtitle
                                                      alignment
  Subtitle Timing     Aeneas (Python/Docker)          Forced alignment for
                                                      Arabic & English
  Stock Media         Pexels API                      Background clip sourcing
  AI Video Gen        WAN AI                          Generative video clips
                                                      from prompts
  Music               Freesound API                   Background music sourcing
  Database (local)    SQLite                          Active local dev DB
  Queue               Laravel Database Queue          Async job processing
  Frontend            Blade + Bootstrap + Vite        Server-rendered UI
  File Output         0x0.st (temp host)              Temporary render sharing
                                                      ⚠ NOT PRODUCTION SAFE


================================================================================
2. SYSTEM ARCHITECTURE
================================================================================

2.1 HIGH-LEVEL ARCHITECTURE
--------------------------------------------------------------------------------

VidsAI is split into two independently deployable services connected by
synchronous HTTP calls. This separation was a sound architectural decision —
it isolates CPU-intensive video rendering from web request handling, allows
independent scaling, and keeps PHP and JavaScript ecosystems cleanly separated.

  User Browser
       ↓  HTTP (Blade SSR)
  Laravel App  (port 80/443)
       ↓  Queue Jobs (database driver)
  Laravel Workers  →  POST /render  →  Node/Express Render Service (port 5001)
                                            ↓
                                      Remotion + Headless Chrome
                                            ↓
                                      Output .mp4  →  0x0.st upload
                                            ↓
                                      GET /status/:id  ←  Laravel polls


2.2 LARAVEL BACKEND ARCHITECTURE
--------------------------------------------------------------------------------

Request Lifecycle:
  - Route entry:       routes/web.php
  - Primary controller: app/Http/Controllers/ProjectController.php
  - Queue driver:      database (jobs stored in SQLite jobs table)
  - Workers:           php artisan queue:work (must be running separately)

Project State Machine:

  Status                  Trigger                     Next Action
  ──────────────────────────────────────────────────────────────────────────────
  pending                 Project created             Begin scene generation
  processing              Job dispatched              GenerateScenesFromVoiceJob
  reviewing               Scenes generated            User reviews/edits scenes
  subtitle_selection      User confirms scenes        User picks style + music
  subtitle_generating     User confirms style         ProcessSubtitleGenerationJob
  completed               Render finished             Final video URL stored
  failed                  Any job error               Error stored, user notified


2.3 RENDERING SERVICE ARCHITECTURE
--------------------------------------------------------------------------------

The rendering service is a Node.js/Express server that accepts a JSON payload
describing the video (clips, subtitles, transitions, audio) and returns a job ID
immediately. Rendering happens asynchronously. Laravel polls /status/:id.

Render Pipeline Steps:
  1.  POST /render received → jobId created → stored in-memory jobStatus map
  2.  Clips normalized: URL patterns + file extension → media type guess
  3.  Remote clips downloaded and cached to public/video-cache/ via videoCache.js
  4.  Magic byte inspection corrects type misidentification (image vs video)
  5.  Duration resolved: clipDurations[] → ffprobe → heuristic fallback
  6.  Final duration = max(sum clip durations, latest subtitle end) × 30fps
  7.  renderMedia() called on VideoMerger Remotion composition
  8.  H264 output written to renders/<jobId>.mp4
  9.  Optional upload to 0x0.st, optional local file deletion
  10. jobStatus updated to completed with outputUrl, or failed with error


================================================================================
3. DATA MODEL
================================================================================

3.1 PROJECT MODEL
--------------------------------------------------------------------------------

The Project model is the central entity storing all metadata, configuration,
processing state, and references to generated assets.

  Field Group             Type            Description
  ──────────────────────────────────────────────────────────────────────────────
  User linkage            FK / string     Owner reference, business metadata
  language                string          Target language — drives Arabic RTL
  formats                 JSON            Platform output presets
  voiceover_file / url    string          Uploaded audio path or remote URL
  transcript              JSON array      Word-level transcript from Deepgram
  subtitles_script        JSON array      Timed subtitle segments for rendering
  status                  enum string     Current processing state
  final_video_path / url  string          Output render location after complete
  error fields            text            Failure reason storage for debugging
  Processing timestamps   timestamps      started_at, completed_at, failed_at


3.2 SCENE MODEL
--------------------------------------------------------------------------------

Each project contains multiple Scene records mapping to individual video clips.

  Field                   Type            Notes
  ──────────────────────────────────────────────────────────────────────────────
  scene_number            integer         Ordering index
  text                    text            Script content for this scene
  source_media_url        string          Remote URL of the clip/image
  source_media_path       string          Local cached copy path
  duration_seconds        float           Base duration from generation
  gemini_duration         float           Duration as estimated by Gemini
  trimmed_duration        float           User-adjusted duration after trim
  start_time / end_time   float           Trim bounds for clip extraction
  keywords / prompt       string          Used for media search and AI generation
  status                  string          Scene-level processing status
  type                    string          image | video | generated
  job_id                  string          WAN AI generation job reference


================================================================================
4. CORE SERVICES & COMPONENTS
================================================================================

4.1 LARAVEL SERVICES
--------------------------------------------------------------------------------

  Service                         Responsibility
  ──────────────────────────────────────────────────────────────────────────────
  SceneGenerationService          Calls Gemini to analyze voiceover transcript
                                  and produce scene descriptions, keywords, and
                                  timing

  SceneRegenerationService        Re-runs generation for individual scenes
                                  without reprocessing the full project

  SubtitleGenerationService       Orchestrates Deepgram transcription → Aeneas
                                  alignment → subtitle segment construction.
                                  Contains critical Arabic timing logic.
                                  ⚠ HIGH REGRESSION RISK

  WanAiVideoGenerationService     Submits prompts to WAN AI for generative video
                                  clips and polls for job completion


4.2 LARAVEL QUEUE JOBS
--------------------------------------------------------------------------------

  Job                             Trigger & Behavior
  ──────────────────────────────────────────────────────────────────────────────
  GenerateScenesFromVoiceJob      Dispatched on project create with voiceover.
                                  Runs transcription then scene generation.
                                  Sets status to reviewing on success.

  ProcessSubtitleGenerationJob    Dispatched after user confirms subtitle style.
                                  Builds subtitle payload and triggers final
                                  render via POST /render.

  WanAiVideoGenerationJob         Dispatched per scene when AI video generation
                                  is requested. Polls WAN AI until clip URL
                                  is ready.


4.3 REMOTION COMPOSITION SYSTEM
--------------------------------------------------------------------------------

The VideoMerger composition in remotion/VideoMerger.tsx is the core of the
rendering service. It is a React component tree rendered frame-by-frame using
headless Chromium.

Supported Transitions:
  - zoom-in, zoom-out     Scale transform with spring interpolation
  - fade                  Opacity interpolation between 0 and 1
  - slide-left/right      translateX transform
  - slide-up/down         translateY transform
  - none                  Hard cut

Subtitle Style System (key differentiator):

  Style Key               Visual Behavior
  ──────────────────────────────────────────────────────────────────────────────
  progressive_highlight   Words highlighted one by one in sync with audio timing
  tiktok_trending         Bold pop-in style mimicking viral TikTok captions
  arabic_banner           RTL banner layout with Arabic-specific font loading
  rectangular             Classic solid background rectangle behind text
  rounded_progressive     Progressive highlight with rounded pill per word
  rectangular_banner      Full-width banner variant of rectangular style
  default                 Standard centered subtitle with shadow

Arabic & RTL Support:
  The system includes automatic Arabic character detection in subtitle text,
  dynamic RTL layout switching in React components, a large curated Arabic
  font catalog with Google Fonts dynamic loading, and a custom Aeneas-based
  forced alignment pipeline for accurate Arabic subtitle timing.

  ⚠ This is a genuine competitive differentiator. Treat as high-risk for
    regressions. Never modify SubtitleGenerationService without a
    golden-output test in place first.


================================================================================
5. EXTERNAL INTEGRATIONS
================================================================================

VidsAI depends on seven external third-party APIs and services. Each represents
a potential failure point in the production pipeline.

  Service         Type              Config Key      Role & Risk
  ──────────────────────────────────────────────────────────────────────────────
  Google Gemini   REST API          gemini.*        Scene generation from
                                                    transcript. Quota limits
                                                    could block all new projects.

  Deepgram        REST API          deepgram.*      Primary transcription engine.
                                                    Fallback key configured.
                                                    Failure breaks subtitle
                                                    pipeline entirely.

  Aeneas          Local Python/     aeneas.*        Subtitle forced alignment.
                  Docker                            Requires Docker or local
                                                    Python. Hardest to scale.

  Pexels          REST API          pexels.*        Stock video search for scene
                                                    backgrounds. Rate limits.

  WAN AI          Async REST        wan_ai.*        AI video clip generation.
                                                    Async job pattern; failure
                                                    leaves scenes in limbo.

  Freesound       REST API          freesound.*     Background music search
                                                    and download.

  0x0.st          Public upload     —               !! CRITICAL RISK !!
                                                    Public temp host. Files
                                                    expire. Not suitable for
                                                    production use at all.


================================================================================
6. CRITICAL PRODUCTION RISKS
================================================================================

The following issues will cause production failures under real user load.
Ordered by severity.

--------------------------------------------------------------------------------
🔴 RISK 1 — IN-MEMORY JOB STATE  [Severity: CRITICAL]
--------------------------------------------------------------------------------

The Node.js rendering service stores all job status in a JavaScript object in
RAM. There is no persistence layer whatsoever.

Current behavior:
  jobStatus[jobId] = { status: 'processing' }  // lives only in process memory

What happens in production:
  • Server restart (deploy, crash, OOM kill) → all job states wiped
  • Laravel polls /status/:id → receives 404 or stale response
  • User's video appears "lost" even if the .mp4 file exists on disk
  • No recovery mechanism exists

Impact: Any deployment or crash during a render = silent data loss for the user.

Fix: Persist job state to SQLite using better-sqlite3.
Estimated effort: 3-4 hours.

--------------------------------------------------------------------------------
🔴 RISK 2 — NO RENDER QUEUE OR CONCURRENCY CONTROL  [Severity: CRITICAL]
--------------------------------------------------------------------------------

Every POST /render immediately spawns a background render process. There is
no limit on concurrent renders.

  • Each Remotion render spawns a headless Chromium instance
  • Memory per render: approximately 1-2 GB RAM + 1-4 CPU cores
  • 5 simultaneous users = 5 Chrome instances = likely OOM or server death
  • maxConcurrency: 1 in Remotion config helps per-render but not across renders

Fix: Implement a simple in-process render queue with MAX_CONCURRENT=2 limit.
Estimated effort: 2-3 hours.

--------------------------------------------------------------------------------
🔴 RISK 3 — 0x0.ST AS FILE HOST  [Severity: CRITICAL]
--------------------------------------------------------------------------------

Completed render outputs are uploaded to 0x0.st, a public anonymous file host.

  • Files on 0x0.st expire after days to weeks depending on size and traffic
  • Files can be deleted by anyone with the URL
  • No SLA, no uptime guarantees, no rate limit documentation
  • Final video URLs stored on Project model will become broken links

Fix: Replace with Cloudflare R2 (free egress, S3-compatible) or AWS S3.
Estimated effort: 4-5 hours.

--------------------------------------------------------------------------------
🟠 RISK 4 — TEMP FILE CLEANUP BUG  [Severity: HIGH]
--------------------------------------------------------------------------------

A type mismatch in the cleanup utility causes temp files to accumulate forever.

  cleanupFiles() expects:  string[]  (array of file paths)
  Caller passes:           string    (directory path)

Result: No files are ever cleaned up. No error is thrown (error is swallowed).
Disk usage grows with every render until the server runs out of space.

Fix: Replace cleanupFiles(TEMP_OUT) with explicit directory enumeration.
Estimated effort: 30 minutes.

--------------------------------------------------------------------------------
🟠 RISK 5 — NO REQUEST VALIDATION ON /render  [Severity: HIGH]
--------------------------------------------------------------------------------

The POST /render endpoint accepts any JSON body without schema validation.
Malformed or incomplete payloads cause confusing internal errors rather than
clean 400 responses.

Fix: Add Zod schema validation at the API boundary.
Estimated effort: 2-3 hours.

--------------------------------------------------------------------------------
🟡 RISK 6 — DEBUG ROUTES IN PRODUCTION  [Severity: MEDIUM]
--------------------------------------------------------------------------------

routes/web.php contains multiple test and debug endpoints mixed with production
routes. These are not gated by environment checks and expose internal
functionality to any user who discovers the URLs.

Fix: Wrap in App::environment(['local', 'staging']) middleware.
Estimated effort: 1 hour.

--------------------------------------------------------------------------------
🟡 RISK 7 — PROJECTCONTROLLER MONOLITH  [Severity: MEDIUM]
--------------------------------------------------------------------------------

ProjectController.php handles project CRUD, scene operations, subtitle
generation, music search, and debug helpers in a single file. Makes the
codebase difficult to maintain and impossible to write focused unit tests.

Fix: Extract SceneReviewController as the first split.
Estimated effort: 4 hours.


================================================================================
7. TECHNICAL DEBT INVENTORY
================================================================================

  Issue                       Location              Severity    Recommended Fix
  ──────────────────────────────────────────────────────────────────────────────
  In-memory job state         server.js             🔴 Critical SQLite persistence
  No render concurrency       server.js             🔴 Critical In-process queue
  0x0.st file storage         uploadTo0x0.js        🔴 Critical Cloudflare R2 / S3
  Temp cleanup type bug       mergeVideos.js        🟠 High     Pass file array
  No API input validation     server.js             🟠 High     Zod schema
  Dual server implementations server/ vs server.js  🟠 High     Delete legacy path
  ProjectController monolith  ProjectController.php 🟡 Medium   Extract controllers
  Debug routes in web.php     routes/web.php        🟡 Medium   Environment gate
  Inline JS in review.blade   review.blade.php      🟡 Medium   Extract to review.js
  Subtitle style fragmented   VideoMerger.tsx       🟡 Medium   Unified registry
  No request DTOs (Laravel)   ProjectController.php 🟡 Medium   Form Request classes
  No centralized API clients  ProjectController.php 🟡 Medium   Services/Clients/
  Mixed TS/JS boundary        server.js vs *.ts     🟢 Low      Migrate to TS
  No structured logging       All services          🟢 Low      jobId correlation
  n8n legacy references       config + docs         🟢 Low      Remove or document


================================================================================
8. PERFORMANCE ANALYSIS
================================================================================

8.1 RENDERING PERFORMANCE
--------------------------------------------------------------------------------

Video rendering is the primary performance bottleneck. The system uses Remotion
with headless Chromium for frame-by-frame rendering, which is CPU intensive.

  Scenario                        Estimated Time    Bottleneck
  ──────────────────────────────────────────────────────────────────────────────
  Single 30s video, 1080p         2-4 minutes       Chromium rendering, CPU bound
  3 concurrent renders            8-15 minutes      RAM contention, potential OOM
  Remote clip caching (5 clips)   15-45 seconds     Network I/O, sequential DL
  Deepgram transcription          3-10 seconds      Network latency, audio length
  Aeneas alignment                10-60 seconds     Python startup, audio complexity
  Gemini scene generation         5-15 seconds      API latency, prompt complexity
  Full pipeline (no queue wait)   4-8 minutes       Sum of all above stages


8.2 SCALING LIMITS
--------------------------------------------------------------------------------

With the current architecture, the system has hard scaling ceilings:

  • Single Node.js process handles all renders — no horizontal scaling
  • Render output stored locally — cannot serve from multiple nodes
  • Laravel queue workers compete for same DB as web requests (SQLite BUSY risk)
  • Aeneas requires local Docker/Python — cannot run on serverless


================================================================================
9. PHASED IMPROVEMENT ROADMAP
================================================================================

--------------------------------------------------------------------------------
PHASE 0 — PRODUCTION SAFETY  (Week 1-2)
--------------------------------------------------------------------------------

Stop critical failures before any feature work. Zero user-facing impact.

  Task                                Files                   Effort  Risk
  ──────────────────────────────────────────────────────────────────────────────
  Add render queue + concurrency      server.js               2-3h    Very Low
  Persist job state to SQLite         server.js               3-4h    Very Low
  Replace 0x0.st with Cloudflare R2   uploadTo0x0.js          4-5h    Low
  Fix temp cleanup bug                mergeVideos.js          30min   Very Low
  Gate debug routes                   routes/web.php          1h      Very Low
  Add Zod validation to /render       server.js               2-3h    Low

--------------------------------------------------------------------------------
PHASE 1 — ARCHITECTURE CLEANUP  (Week 3-4)
--------------------------------------------------------------------------------

Improve maintainability and reduce regression risk.

  Task                                Files                   Effort  Risk
  ──────────────────────────────────────────────────────────────────────────────
  Extract SceneReviewController       ProjectController.php   4h      Low
  Move review.blade.php inline JS     review.blade → .js      3h      Low
  Add Form Request classes            app/Http/Requests/      3h      Very Low
  Centralize external API clients     app/Services/Clients/   5h      Low
  Unify subtitle style registry       remotion/subtitles/     3h      Medium
  Delete/isolate legacy server/       server/index.ts         1h      Very Low
  Add feature tests                   tests/Feature/          5h      None

--------------------------------------------------------------------------------
PHASE 2 — QUALITY & SCALE  (Month 2)
--------------------------------------------------------------------------------

  • Migrate SQLite to MySQL/Postgres for production
  • Separate render workers from web server (dedicated worker VPS or containers)
  • Implement S3 for all media storage (clips, renders, voiceovers)
  • Add platform presets: TikTok 9:16, Reels, YouTube 16:9, Square 1:1
  • Add beat-sync cut capability using Remotion useAudioData() hook
  • Implement retry/backoff consistency across all external API clients
  • Add structured logging with jobId correlation across both services

--------------------------------------------------------------------------------
PHASE 3 — STUDIO-GRADE OUTPUT  (Month 3+)
--------------------------------------------------------------------------------

  • Motion graphics overlay system (Lottie + custom Remotion components)
  • Speed ramp / slow-motion using Remotion interpolate() on playback rate
  • Branded template library (per-brand color/font/layout presets)
  • Hook optimization AI: Gemini analysis to suggest strongest opening 3 seconds
  • CTA placement intelligence: auto-suggest call-to-action timing
  • Multi-track audio: independent voiceover, music, and SFX level control
  • Remotion Lambda integration for burst render capacity


================================================================================
10. SECURITY CONSIDERATIONS
================================================================================

  Issue                           Severity    Recommendation
  ──────────────────────────────────────────────────────────────────────────────
  Debug routes publicly           🟠 High     Gate with environment middleware
  accessible                                  immediately

  API keys in config/             🟡 Medium   Confirm all values read from .env,
  services.php                                never hardcoded

  0x0.st URLs are public          🟡 Medium   Anyone with URL can access user
                                              videos — migrate to private S3

  No rate limiting on /render     🟡 Medium   Add rate limiting middleware

  SSRF via clip URLs              🟡 Medium   Validate clip URLs against
                                              allowlist before fetching

  No auth on Node.js render       🟠 High     Add shared secret header
  service                                     verification between Laravel→Node

  SQLite in production            🟡 Medium   Acceptable for single-node; must
                                              migrate before multi-server deploy


================================================================================
11. TESTING STRATEGY
================================================================================

VidsAI currently has no documented test coverage. Given the complexity of the
async pipeline and the fragility of subtitle timing logic, this is a
high-priority investment.

11.1 RECOMMENDED TEST PYRAMID
--------------------------------------------------------------------------------

  Level               Focus                       Priority Cases
  ──────────────────────────────────────────────────────────────────────────────
  Unit tests          Individual service methods   SubtitleGenerationService
                                                   timing math, Scene duration
                                                   calculations, Arabic detection

  Feature tests       HTTP endpoints + DB state    Status transitions, confirm
                                                   scenes validation, subtitle
                                                   generation start, project CRUD

  Integration tests   Job → service → DB flows     GenerateScenesFromVoiceJob
                                                   happy path, failure state,
                                                   WAN AI polling

  Render smoke tests  Node.js render service        POST /render minimal payload,
                                                   each subtitle style, Arabic
                                                   RTL, all transitions

  Golden output       Visual regression             Reference renders per subtitle
  tests                                            style — fail on visual diff


11.2 CRITICAL TEST CASES (IMPLEMENT FIRST)
--------------------------------------------------------------------------------

  1. Project status transition: pending → processing → reviewing
     (with mocked Gemini/Deepgram)

  2. Confirm scenes endpoint: validates scene count, rejects invalid status

  3. Subtitle generation start: correct payload for Arabic vs English

  4. Arabic timing: subtitle segments are valid and non-overlapping

  5. Render service: POST /render returns jobId, GET /status/:id returns
     processing then completed

  6. Cleanup: temp files are removed after successful render

  7. Job persistence: render service restart does not lose completed status


================================================================================
12. RECOMMENDED TARGET ARCHITECTURE
================================================================================

The following architecture addresses all critical production risks and is
achievable in 6-8 weeks while preserving existing technology choices.

  USER BROWSER
       ↓  HTTPS
  NGINX / Load Balancer
       ↓
  LARAVEL APP SERVERS  (stateless, horizontally scalable)
       ↓  dispatches to
  LARAVEL QUEUE WORKERS  (dedicated servers)
       ↓  POST /render with shared secret header
  NODE/EXPRESS RENDER SERVICE
       ↓  in-process queue (MAX 2 concurrent renders)
  REMOTION + CHROMIUM
       ↓  output
  CLOUDFLARE R2 / AWS S3  ←→  CloudFront CDN
       ↓  permanent URL stored on Project model
  MYSQL (production)  /  SQLITE (local dev)
       ↑  job state persisted here too (both Laravel + Node)

Key Architecture Changes:

  Decision              Current                     Target
  ──────────────────────────────────────────────────────────────────────────────
  Job persistence       RAM only (lost on restart)  SQLite/MySQL — survives
  Render concurrency    Unlimited (server killer)   Capped at 2 with queue API
  File storage          0x0.st (expires)            Cloudflare R2 (permanent)
  Service auth          None between layers         Shared secret header
  Database              SQLite everywhere           SQLite local, MySQL prod
  Render scaling        Single server ceiling       Remotion Lambda (Phase 3)


================================================================================
13. APPENDIX — COMPLETE FILE MAP
================================================================================

13.1 LARAVEL BACKEND
--------------------------------------------------------------------------------

  File / Path                                     Purpose
  ──────────────────────────────────────────────────────────────────────────────
  routes/web.php                                  All HTTP routes — production
                                                  + ungated debug routes mixed

  app/Http/Controllers/ProjectController.php      Primary monolith controller —
                                                  CRUD + processing + scenes +
                                                  subtitles + debug helpers

  app/Models/Project.php                          Project Eloquent model with
                                                  status constants

  app/Models/Scene.php                            Scene Eloquent model with
                                                  duration/trim fields

  app/Services/SceneGenerationService.php         Gemini API integration for
                                                  scene analysis

  app/Services/SceneRegenerationService.php       Per-scene regeneration without
                                                  full reprocess

  app/Services/SubtitleGenerationService.php      Deepgram → Aeneas → subtitle
                                                  payload
                                                  !! HIGH RISK TO CHANGE !!

  app/Services/WanAiVideoGenerationService.php    WAN AI async job submission
                                                  and polling

  app/Jobs/GenerateScenesFromVoiceJob.php         Async scene generation from
                                                  voiceover

  app/Jobs/ProcessSubtitleGenerationJob.php       Async subtitle generation +
                                                  render trigger

  app/Jobs/WanAiVideoGenerationJob.php            Async WAN AI clip generation
                                                  per scene

  resources/views/projects/create.blade.php       Project creation form

  resources/views/projects/processing.blade.php   Status polling UI

  resources/views/projects/review.blade.php       Scene review + edit UI
                                                  (LARGE — contains inline JS)

  resources/views/projects/subtitle-styles.blade  Subtitle style + music picker

  resources/views/projects/final.blade.php        Final video display + download

  config/services.php                             All external API config —
                                                  must read from .env only


13.2 NODE.JS RENDERING SERVICE
--------------------------------------------------------------------------------

  File / Path                                     Purpose
  ──────────────────────────────────────────────────────────────────────────────
  server.js                                       Express server — ACTIVE
                                                  runtime entry point

  srv/video/mergeVideos.js                        Render orchestration, Remotion
                                                  call, clip preprocessing

  srv/utils/videoCache.js                         Remote clip download, caching,
                                                  retry, magic byte validation

  srv/utils/videoProxy.js                         Fallback proxy for uncacheable
                                                  remote media

  srv/utils/uploadTo0x0.js                        Output upload
                                                  !! REPLACE WITH R2/S3 !!

  srv/utils/cleanupTemp.js                        Temp file cleanup
                                                  !! BUG: expects array,
                                                  receives string !!

  remotion/Root.tsx                               Composition registration +
                                                  test compositions

  remotion/VideoMerger.tsx                        Main composition — clips,
                                                  transitions, subtitles,
                                                  overlays, audio

  remotion/AnimatedMediaClip.tsx                  Per-clip renderer —
                                                  image/video + animation

  remotion/subtitles/                             Subtitle style components —
                                                  fragmented, needs unified
                                                  registry

  remotion/utils/fontLoader.ts                    Dynamic Google Fonts +
                                                  Arabic font catalog loading

  remotion/styles/arabic-fonts.css                Arabic font-face definitions

  server/index.ts + render-queue.ts               LEGACY — unused template path
                                                  Should be deleted or isolated


================================================================================
14. CONCLUSION
================================================================================

VidsAI has a technically sound foundation. The choice of Laravel for backend
orchestration, Remotion for video rendering, Deepgram for transcription, and the
investment in Arabic RTL support are all strong, differentiated decisions that
position the product well against competitors.

The critical work remaining is not about adding features — it is about making
the existing pipeline production-safe. The three zero-cost-to-fix issues (job
persistence, render queue, and file storage) can be resolved in a single focused
engineering week and will transform the system from a promising prototype into a
deployable production service.

The Remotion composition system in particular has a very high quality ceiling.
Once the infrastructure layer is stabilized, the path to cinematic, studio-grade
video output is achievable through incremental React component development —
no architectural rewrites required.

  ┌─────────────────────────────────────────────────────────────────────────┐
  │  IMMEDIATE PRIORITY:  Fix 3 critical risks in server.js                 │
  │                       (job state + render queue + file storage)         │
  │  SECOND PRIORITY:     Gate debug routes + fix temp cleanup bug          │
  │  THIRD PRIORITY:      Begin controller/service refactoring with tests   │
  │  QUALITY GOAL:        Remotion Lambda integration for cinematic output  │
  └─────────────────────────────────────────────────────────────────────────┘


================================================================================
                    END OF REPORT — VidsAI Technical Architecture v1.0
                              Confidential  |  March 2026
================================================================================