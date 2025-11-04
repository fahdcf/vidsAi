# 🎬 VidsAI - Complete Project Analysis

## Executive Summary

**VidsAI** is a sophisticated, AI-powered video advertisement generation platform built with Laravel 12 and modern web technologies. It automates the entire video creation pipeline, allowing users to transform scripts into professional video advertisements in multiple formats and languages.

### Key Statistics
- **Framework**: Laravel 12 (PHP 8.2+)
- **Frontend**: Tailwind CSS 4.0, Bootstrap 5.3, Vite
- **Database**: MySQL/SQLite with Eloquent ORM
- **AI Services**: Gemini, Deepgram, Aeneas, WAN AI, Pexels, Freesound
- **Multi-language**: English, Arabic (7+ dialects)
- **Total Project Files**: 100+ blade templates, controllers, models, and services

---

## 🏗️ Project Architecture

### Technology Stack

```
Backend:
├── Laravel 12.x
├── PHP 8.2+
├── MySQL Database
├── Queue System (Laravel Jobs)
├── Eloquent ORM
└── REST APIs

Frontend:
├── Blade Templates (HTML5)
├── Tailwind CSS 4.0
├── Bootstrap 5.3
├── JavaScript (ES6+)
├── Vite Build Tool
└── Axios HTTP Client

AI/ML Integration:
├── Google Gemini API (Scene generation, prompts)
├── Deepgram API (Audio transcription)
├── Aeneas (Arabic audio alignment)
├── WAN AI (Video generation)
├── Pexels API (Stock video footage)
└── Freesound API (Background music)

External Services:
├── N8N (Workflow automation)
├── 0x0.st (File upload service)
├── Video Trim Service (Custom API)
└── Video Render Service (Custom API)
```

### Directory Structure

```
vidsAi/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── ProjectController.php (Main project logic)
│   │   │   ├── DashboardController.php
│   │   │   ├── HomeController.php
│   │   │   ├── ProfileController.php
│   │   │   └── Auth/ (Authentication)
│   │   └── Requests/ (Validation)
│   ├── Models/
│   │   ├── Project.php (Main project model)
│   │   ├── Scene.php (Individual video scenes)
│   │   └── User.php
│   ├── Jobs/
│   │   └── GenerateScenesFromVoiceJob.php (Queue jobs)
│   ├── Services/
│   │   ├── SceneGenerationService.php
│   │   ├── SceneRegenerationService.php
│   │   ├── SubtitleGenerationService.php
│   │   └── WanAiVideoGenerationService.php
│   └── Policies/
├── resources/
│   ├── views/
│   │   ├── projects/
│   │   │   ├── create.blade.php (Project creation wizard)
│   │   │   ├── review.blade.php (Main review/edit page) ⭐
│   │   │   ├── processing.blade.php (Status tracking)
│   │   │   ├── subtitle-styles.blade.php (Subtitle selection)
│   │   │   └── final.blade.php (Download page)
│   │   ├── dashboard.blade.php (User dashboard)
│   │   ├── layouts/ (HTML layouts)
│   │   ├── auth/ (Authentication pages)
│   │   └── profile/ (User profile)
│   ├── js/ (JavaScript files)
│   └── css/ (Stylesheets)
├── config/
│   ├── services.php (API credentials, N8N endpoints)
│   ├── database.php
│   ├── cache.php
│   ├── auth.php
│   └── app.php
├── database/
│   ├── migrations/ (Schema changes)
│   ├── factories/ (Test data generators)
│   └── seeders/ (Database seeds)
├── routes/
│   ├── web.php (Web routes)
│   ├── auth.php (Auth routes)
│   └── console.php (CLI commands)
├── storage/
│   ├── app/ (File storage)
│   ├── logs/ (Application logs)
│   └── tools/ (FFmpeg, etc.)
└── tests/ (Unit & feature tests)
```

---

## 🎯 Core Features & Workflow

### 1. **Project Creation Workflow**

```
User Input
    ↓
Project Type Selection (Product/Service)
    ↓
Project Details & Description
    ↓
Video Format Selection (16:9, 1:1, 9:16, All)
    ↓
Script Input (Custom or AI-generated)
    ↓
Voiceover Option (Upload, AI, None)
    ↓
If Upload: Store audio file → Dispatch job
If AI/None: Trigger video generation
    ↓
Redirect to Processing Page
```

### 2. **Scene Generation Process**

**For Uploaded Voiceovers:**
1. Audio file stored in `storage/app/public/voiceovers/`
2. `GenerateScenesFromVoiceJob` dispatched to queue
3. Audio transcribed using Deepgram API
4. Transcript sent to Gemini AI for scene generation
5. Keywords extracted from script
6. Videos fetched from Pexels for each scene
7. Scenes stored with video URLs and metadata

**For AI/No Voiceover:**
1. Direct N8N webhook trigger
2. Scene generation via Gemini AI
3. Video fetching from Pexels

### 3. **Database Models**

#### **Project Model** (`app/Models/Project.php`)
```php
Attributes:
- user_id: Foreign key to User
- name: Project name
- type: 'product' or 'service'
- category: Product category
- description: Project description
- language: Language code (english, darija, etc.)
- video_format: Array of formats [16:9, 1:1, 9:16]
- script_option: 'paste' or 'generate'
- custom_script: User-provided script text
- voiceover_option: 'upload', 'ai', or 'none'
- voiceover_file: Path to uploaded audio
- voiceover_transcript: Array of word objects with timing
- subtitles_script: Array of subtitle lines
- status: 'pending', 'processing', 'reviewing', 
          'subtitle_selection', 'subtitle_generating', 
          'completed', 'failed'
- job_id: N8N or internal job ID for tracking
- final_video_path: URL to final merged video
- processing_started_at: Timestamp
- processing_completed_at: Timestamp
- error_message: Error details if failed

Relations:
- belongsTo(User) - The project owner
- hasMany(Scene) - Individual video scenes
```

#### **Scene Model** (`app/Models/Scene.php`)
```php
Attributes:
- project_id: Foreign key to Project
- scene_number: Order in video (1, 2, 3...)
- script_text: Text for this scene
- video_url: URL to video (Pexels or custom)
- video_path: Local storage path
- thumbnail_path: Preview image path
- duration_seconds: Actual video file duration
- gemini_duration: Duration from script analysis
- trimmed_duration: User-set trim duration
- start_time: Trim start point (seconds)
- end_time: Trim end point (seconds)
- keywords: Search keywords for video
- prompt: AI generation prompt
- status: 'pending', 'generating', 'regenerating', 'ready'
- job_id: Regeneration job ID
- approved: Boolean (user approval)
- type: 'video' or 'image'

Relations:
- belongsTo(Project) - Parent project
```

---

## 📄 **REVIEW PAGE - DEEP DIVE** ⭐

### Location
**File**: `resources/views/projects/review.blade.php`
**Route**: `GET /review/{project}` → `ProjectController@review()`
**Size**: 5,260 lines (comprehensive scene editing interface)

### Purpose
The review page is the **core editing interface** where users:
- Preview all generated scenes with videos
- Trim videos to exact timing requirements
- Replace scenes with custom media or regenerate
- Preview overlays (logo, CTA, text)
- Customize subtitle placement and styling
- Approve scenes before final processing

### Key Sections

#### **1. Header Section**
```blade
- Project Title & Description
- Format Badge (displays selected video formats)
- Total Duration Display (sum of all scenes)
- View Transcript Button (for uploaded voiceovers)
- Dashboard Navigation Link
```

#### **2. Progress Indicator**
```
Step 1: ✓ Generation Complete
Step 2: 2 Review Scenes (ACTIVE)
Step 3: 3 Final Video
```

#### **3. Scene Cards** (Loop through each scene)

Each scene card contains:

**A. Scene Header**
- Scene number and type badge (Video/Image)
- Visual indicator for scene type

**B. Script Display**
- Shows the exact script text for that scene
- Helps users understand what's happening

**C. Video Player**
```
┌─────────────────────────────────────┐
│         Video Preview               │
│     (with play button overlay)       │
├─────────────────────────────────────┤
│  Time: 0:00 / 2:15                  │
└─────────────────────────────────────┘
```

Features:
- Full video playback with controls
- Play button on hover
- Time display (current/total)
- Overlay preview zones (logo, CTA, text)

**D. Professional Timeline Editor**

```
├─ Timeline Header
│  ├─ "Trim Duration: 2.5s" (editable)
│  ├─ Icons and info display
│  └─ Visual layout indicator
│
├─ Timeline Slider
│  ├─ Track background (striped pattern)
│  ├─ Trim Selection Box
│  │  ├─ Left Handle (drag to adjust start)
│  │  ├─ Duration Badge (center, clickable)
│  │  └─ Right Handle (drag to adjust end)
│  ├─ Playhead (red line showing current position)
│  └─ Time Markers (0s, 5s, 10s, etc.)
│
└─ Timeline Controls
   ├─ Reset Button
   ├─ Refresh Time Button
   ├─ Fix Time Button
   └─ Start/End Time Display
```

**Key Features:**
- **Drag-to-Trim**: Users drag handles to set start/end points
- **Editable Duration**: Click the duration badge to type exact time
- **Visual Feedback**: Hover effects and animations on all controls
- **Playhead Sync**: Red playhead tracks video playback in real-time
- **Time Markers**: Visual timeline markings every 5 seconds
- **Keyboard Support**: Editable input fields for precise control

**E. Action Buttons**

```
[🔄 Regenerate] [⬆️ Upload Custom] [🎨 Overlays]
```

- **Regenerate**: Opens modal to regenerate from Pexels or AI
- **Upload Custom**: Upload custom video/image to replace
- **Overlays**: Toggle overlay controls (logo, CTA, text)

**F. Overlay Controls** (Initially Hidden)

Toggles for:
- **Logo**: Top-right corner overlay with transparency
- **CTA (Call-to-Action)**: Bottom-center button overlay
- **Custom Text**: Bottom overlay with custom text input

#### **4. Regenerate Scene Modal**

Two-tab interface:

**Tab 1: Generate from Pexels**
- Show existing keywords from scene
- Edit keywords and add new ones
- Keyword tags display with remove button
- "Regenerate Video from Pexels" button

**Tab 2: Regenerate with AI**
- **Generation Type Toggle**:
  - Text-to-Video (default)
  - Image-to-Video
  
- **For Text-to-Video**:
  - AI Prompt textarea
  - "Generate Prompt" button (AI-suggestions)
  - AI Model selector (7 options: WAN 2.2 T2V Plus, WAN 2.1 T2V Turbo, etc.)
  - Resolution selector (1920×1080, 1080×1920, 1440×1440, etc.)
  
- **For Image-to-Video**:
  - Image upload area
  - Video prompt textarea
  - Same model/resolution options

#### **5. Upload Modal**

For each scene:
- Media Type selector (Video/Image)
- File input with size/format requirements
- Upload progress indicator with progress bar
- Video/Image preview after selection
- File info display (dimensions, size)
- Validation messages
- Upload & Replace button

#### **6. Final Approval Section**

```
┌─ Green approval card
├─ "Ready to proceed?"
├─ Status message
└─ [✓ Confirm All Scenes] Button
```

All scenes must be reviewed before moving to subtitle selection.

### Styling & Design System

**Color Palette:**
- Primary Blue: `#3b82f6` - Buttons, active states
- Success Green: `#10b981` - Approval, confirm actions
- Warning Orange: `#f59e0b` - Regenerate actions
- Cyan: `#06b6d4` - Upload actions
- Background Gray: `#f8fafc` - Card backgrounds
- Border Gray: `#e2e8f0` - Subtle borders

**Key CSS Classes:**
- `.scene-card` - Main container for each scene
- `.professional-timeline` - Timeline slider container
- `.trim-selection` - Draggable trim box
- `.trim-handle` - Left/right resize handles
- `.playhead` - Red playhead indicator
- `.video-player-container` - Video wrapper
- `.action-btn` - Action buttons
- `.approval-card` - Green approval section

**Responsive Breakpoints:**
- Mobile: < 768px - Reduced video height, simplified timeline
- Tablet: 768px - 1024px - Stacked layout options
- Desktop: > 1024px - Full layout

### JavaScript Functionality

**Main Class: `ProfessionalVideoTimeline`**

```javascript
class ProfessionalVideoTimeline {
  constructor(sceneId)
  init()
  setupEventListeners()
  initializeTimeline()
  setInitialTrimFromSceneDuration()
  
  // Trim controls
  startTrimDrag(event, type)
  onTrimDrag(event)
  endTrimDrag()
  updateTrimSelection()
  
  // Playhead
  updatePlayheadPosition()
  onPlayheadDrag(event)
  
  // Time display
  updateTimeDisplays()
  forceUpdateDurationDisplay(sceneDuration)
  
  // Video events
  onTimeUpdate()
  onVideoEnded()
  
  // Utilities
  generateTimeMarkers()
  showDurationWarning(sceneDuration, videoDuration)
  
  // Format time
  formatTime(seconds)
}
```

**Key Functions:**
- `regenerateScene(sceneId)` - Opens regenerate modal
- `regenerateFromPexels()` - Trigger Pexels regeneration
- `regenerateWithAI()` - Trigger WAN AI regeneration
- `uploadCustomMedia(sceneId)` - Upload custom video/image
- `toggleOverlay(sceneId, type, state)` - Show/hide overlays
- `confirmAllScenes()` - Move to subtitle selection
- `resetTrim(sceneId)` - Reset to original duration
- `refreshTimeDisplay(sceneId)` - Sync time displays with video

**Event Handlers:**
- `mousedown` on trim handles → Start dragging
- `mousemove` during drag → Update trim position in real-time
- `mouseup` → Finalize trim position
- `video timeupdate` → Sync playhead position
- `dblclick` on duration → Enable edit mode
- `keypress` in duration input → Validate number input
- Form submissions → AJAX requests to backend

### Data Flow

```
User Actions
    ↓
JavaScript Event Handler (onclick, drag, input)
    ↓
Update UI State (trim position, duration display, etc.)
    ↓
AJAX Request to Backend (if needed)
    ↓
ProjectController Method
    ↓
Scene Model Update / Service Call
    ↓
Database Update
    ↓
Response with Updated Data
    ↓
JavaScript Updates UI
```

### Related Routes & Controllers

**Routes** (`routes/web.php`):
```php
Route::get('/review/{project}', 'ProjectController@review')
     ->name('projects.review');

Route::post('/review/{project}/scenes/{scene}/regenerate', 'ProjectController@regenerateScene')
     ->name('projects.regenerate-scene');

Route::post('/review/{project}/scenes/{scene}/upload', 'ProjectController@uploadCustomMedia')
     ->name('projects.upload-custom');

Route::put('/scenes/{scene}/update', 'ProjectController@updateScene')
     ->name('scenes.update');

Route::post('/review/{project}/confirm', 'ProjectController@confirmScenes')
     ->name('projects.confirm-scenes');
```

**ProjectController Methods**:
- `review(Project $project)` - Display review page with scenes
- `regenerateScene(Project $project, Scene $scene)` - Handle regeneration
- `uploadCustomMedia(Project $project, Scene $scene)` - Handle custom uploads
- `updateScene(Scene $scene)` - Update scene trim/duration
- `confirmScenes(Project $project)` - Move to subtitle stage

### Error Handling & Validation

**Client-side:**
- File size validation (150MB for video, 50MB for images)
- File type validation (MP4, WebM, MOV, JPG, PNG, etc.)
- Duration warnings for mismatched scene/video timings
- Real-time validation during trim input

**Server-side:**
- Request validation in `ProjectController`
- Scene ownership verification (Policy)
- Project status verification
- File size/type verification
- Storage availability checks

### Performance Considerations

**Optimization Techniques:**
1. **Lazy Loading**: Videos load on demand via preload="metadata"
2. **Caching**: Timeline data cached in data attributes
3. **Debouncing**: Trim drag events debounced to prevent excessive updates
4. **Image Optimization**: Thumbnails generated for previews
5. **AJAX**: All updates use AJAX to avoid full page reloads
6. **CSS Animations**: GPU-accelerated transitions and transforms

**Known Warnings/Issues:**
- Duration mismatch warning when scene duration > video duration
- Fallback checks for video metadata loading
- Multiple checks ensure accurate duration display

---

## 🔄 Complete Workflow Stages

### Stage 1: **Project Creation** ✓
- User inputs project details
- Selects video formats and script source
- Uploads voiceover or selects AI voiceover
- Project stored with status `pending`

### Stage 2: **Scene Generation** ✓
- Job dispatched to queue
- Audio transcribed (Deepgram)
- Script analyzed (Gemini)
- Keywords extracted
- Videos fetched (Pexels)
- Scenes stored with URLs
- Status → `processing`

### Stage 3: **Review & Edit** ← YOU ARE HERE
- User reviews scenes on review page
- Can regenerate individual scenes (Pexels or AI)
- Can upload custom media
- Can trim videos to exact timing
- Can preview overlays
- Approves all scenes
- Status → `reviewing`

### Stage 4: **Subtitle Selection**
- User chooses subtitle style (6 options)
- Selects background music (optional)
- Preview with subtitles
- Status → `subtitle_selection`

### Stage 5: **Subtitle Generation**
- Subtitles generated from transcript or script
- Videos merged with subtitles
- Overlays applied (if selected)
- Status → `subtitle_generating`

### Stage 6: **Final Video Download**
- Merged video ready
- Multiple format downloads available
- Status → `completed`

---

## 🔌 API Integrations

### 1. **Google Gemini API**
**Purpose**: Scene generation, script analysis, prompt generation
**Endpoints**: 
- `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent`

### 2. **Deepgram API**
**Purpose**: Audio transcription to text with word-level timing
**Endpoints**:
- `https://api.deepgram.com/v1/listen`
**Returns**: Word objects with start/end times and confidence scores

### 3. **Pexels API**
**Purpose**: Stock video footage search
**Endpoints**:
- `https://api.pexels.com/videos/search`
**Returns**: Video URLs, thumbnails, metadata

### 4. **WAN AI API**
**Purpose**: AI video generation (text-to-video, image-to-video)
**Endpoints**:
- `https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis`
- `https://dashscope-intl.aliyuncs.com/api/v1/tasks` (status checking)

### 5. **Freesound API**
**Purpose**: Background music selection
**Endpoints**: Freesound API for music/sound effects

### 6. **Aeneas**
**Purpose**: Arabic language audio-text alignment (precise timing)
**Method**: Local Python script or Docker container

### 7. **N8N Webhooks**
**Purpose**: Workflow automation and scene generation
**Endpoints**:
- Generate scenes from voice: `{N8N_VOICE_SCENES_URL}`
- Regenerate scenes: `{N8N_REGENERATE_URL}`
- Trim scenes: `{N8N_TRIM_SCENES_URL}`
- Merge subtitles: `{N8N_MERGE_SUBTITLES_URL}`

### 8. **0x0.st**
**Purpose**: Quick file upload service for voiceover files
**Endpoints**: `https://0x0.st`

---

## 📊 Database Schema Overview

### projects table
```sql
id, user_id, name, type, category, description, language,
video_format (JSON), script_option, custom_script,
voiceover_option, voiceover_file, voiceover_url,
status, job_id, final_video_path, scenes_data (JSON),
processing_started_at, processing_completed_at,
error_message, trim_response (JSON),
voiceover_transcript (JSON), subtitles_script (JSON),
last_scene_config (JSON), selected_music (JSON),
created_at, updated_at
```

### scenes table
```sql
id, project_id, scene_number, script_text,
video_url, video_path, thumbnail_path,
duration_seconds, gemini_duration, trimmed_duration,
start_time, end_time, keywords (JSON), prompt,
status, job_id, approved (boolean), type,
created_at, updated_at
```

### users table
```sql
id, name, email, email_verified_at, password,
remember_token, created_at, updated_at
```

---

## 🛠️ Configuration Files

### `config/services.php`
Stores all third-party API credentials and endpoints:
```php
- n8n: N8N webhook URLs
- freesound: API key
- gemini: API key and base URL
- pexels: API key and base URL
- deepgram: API keys and base URL
- aeneas: Settings for Arabic alignment
- video_trim: Trim service endpoints
- video_render: Render service endpoints
- wan_ai: AI video generation settings with 7 models
- imgbb: Image upload service
```

### `.env` File (Not included, but referenced)
```
APP_NAME=VidsAI
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost

DB_CONNECTION=sqlite (or mysql)
DB_DATABASE=vidsai

N8N_WEBHOOK_URL=...
N8N_VOICE_SCENES_URL=...
N8N_REGENERATE_URL=...
N8N_TRIM_SCENES_URL=...
N8N_MERGE_SUBTITLES_URL=...

GEMINI_API_KEY=...
DEEPGRAM_API_KEY=...
PEXELS_API_KEY=...
FREESOUND_API_KEY=...
WAN_AI_API_KEY=...
```

---

## 🎨 UI/UX Highlights

### Design Language
- **Modern & Professional**: Clean, minimal interface
- **Gradient Accents**: Blue gradients for primary actions
- **Micro-interactions**: Hover effects, smooth transitions
- **Accessibility**: ARIA labels, keyboard navigation support
- **Responsive**: Mobile-first design approach

### Key UI Components
1. **Scene Cards** - Organized, card-based layout with shadow effects
2. **Professional Timeline** - Smooth, intuitive video trimming
3. **Action Buttons** - Color-coded for different actions
4. **Modal Dialogs** - Smooth overlays for regenerate/upload
5. **Progress Indicators** - Visual workflow progress
6. **Duration Warnings** - Alert users to timing issues
7. **Badge System** - Format, type, and status indicators

### Responsive Breakpoints
- Mobile: `< 768px` - Single column, simplified controls
- Tablet: `768px - 1024px` - Adjusted spacing
- Desktop: `> 1024px` - Full layout with all features

---

## 📈 Scaling Considerations

### Current Capabilities
- Handle multiple concurrent projects per user
- Process videos up to 1 minute duration
- Support 7 Arabic dialects + English
- Generate multiple video formats simultaneously
- Process 3+ scenes per project

### Bottlenecks & Optimization Opportunities
1. **Video Processing**: Consider ffmpeg optimization
2. **AI API Costs**: Implement caching for duplicate requests
3. **Database**: Add indexing on frequently queried fields
4. **Storage**: Implement cleanup for old temporary files
5. **Queue Processing**: Monitor job queue depth
6. **Audio Transcription**: Batch Deepgram requests when possible

---

## 🔐 Security Features

### Authentication & Authorization
- Laravel's built-in authentication system
- User policy for resource access
- Project ownership verification
- CSRF token protection on all forms

### Data Protection
- Sensitive API keys stored in `.env`
- File uploads validated and stored securely
- SQL injection prevention (Eloquent ORM)
- XSS protection (Blade templating)
- HTTPS recommended for production

### File Handling
- File size limits enforced
- MIME type validation
- Secure file storage paths
- Automatic cleanup of temporary files

---

## 🚀 Deployment & Running

### Local Development
```bash
# Install dependencies
composer install
npm install

# Setup environment
cp .env.example .env
php artisan key:generate

# Database
php artisan migrate

# Run development server
composer run dev
# Starts: Laravel server, queue listener, Vite build tool concurrently
```

### Queue Processing
```bash
# Listen for jobs
php artisan queue:listen --tries=1

# Process specific job
php artisan queue:work
```

### Environment Variables
See `.env` setup with N8N endpoints, API keys for Gemini, Deepgram, Pexels, WAN AI, Freesound, etc.

---

## 📝 Key Files Summary

| File | Purpose | Lines |
|------|---------|-------|
| `resources/views/projects/review.blade.php` | Main review/edit interface | 5,260 |
| `app/Http/Controllers/ProjectController.php` | Main business logic | 3,245 |
| `app/Models/Project.php` | Project data model | 182 |
| `app/Models/Scene.php` | Scene data model | 48 |
| `app/Services/SceneGenerationService.php` | Scene generation logic | TBD |
| `app/Services/SubtitleGenerationService.php` | Subtitle generation | TBD |
| `config/services.php` | API configuration | 150+ |
| `routes/web.php` | Web routes definition | 150+ |

---

## 🎯 Next Steps & Recommendations

### For Development
1. Implement unit/feature tests for critical paths
2. Add comprehensive error logging and monitoring
3. Implement rate limiting for AI API calls
4. Add user analytics and tracking
5. Optimize video processing pipeline

### For Features
1. Implement team collaboration features
2. Add advanced video editing timeline
3. Implement social media direct posting
4. Add project templates and presets
5. Implement video analytics dashboard

### For Production
1. Set up monitoring and alerting
2. Implement backup and disaster recovery
3. Add CDN for faster video delivery
4. Implement load balancing
5. Set up comprehensive logging system

---

## 📞 Support & Documentation

### Related Documents
- `README.md` - Project overview
- `BACKEND_WORKFLOW_IMPLEMENTATION.md` - Backend workflow details
- `SUBTITLE_GENERATION_WORKFLOW.md` - Subtitle generation details
- `VOICEOVER_UPLOAD_WORKFLOW.md` - Voice upload workflow
- Multiple feature documentation files

### API Documentation
- Gemini API: https://ai.google.dev/
- Deepgram API: https://developers.deepgram.com/
- Pexels API: https://www.pexels.com/api/
- WAN AI: https://www.aliyun.com/product/alibabacloud-dashscope
- Freesound: https://www.freesound.org/docs/api/

---

**Last Updated**: November 4, 2025
**Version**: 1.0
**Status**: Active Development
