# 🚀 Backend Workflow Implementation

## Overview
This document describes the implementation of backend services that replace the n8n webhook workflows. All video processing operations now happen directly in the Laravel backend instead of relying on external n8n workflows.

## 📁 Service Structure

### **Services Directory**: `app/Services/`

1. **SceneGenerationService.php** - Handles scene generation from uploaded voiceover
2. **SceneRegenerationService.php** - Handles individual scene regeneration
3. **SceneTrimmingService.php** - Handles video trimming operations
4. **SubtitleGenerationService.php** - Handles subtitle generation and video merging

## 🔧 Configuration

### **Environment Variables** (`config/services.php`)

```php
// Gemini AI for scene generation
'gemini' => [
    'api_key' => env('GEMINI_API_KEY', 'AIzaSyDO6P2zGiIEhg2zhoKr1b_gMnOXH-CgL9k'),
    'base_url' => env('GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent'),
],

// Pexels for video search
'pexels' => [
    'api_key' => env('PEXELS_API_KEY', 'zXukdqhgYGWOiFYl5cJHEJ3s1DWMFQLc8UXolQxN73dyltqKgnmU2AD7'),
    'base_url' => env('PEXELS_BASE_URL', 'https://api.pexels.com/videos/search'),
],

// Deepgram for audio transcription
'deepgram' => [
    'api_key' => env('DEEPGRAM_API_KEY', 'bbb834ee2c7055e22a947593c4d00540d0490cde'),
    'base_url' => env('DEEPGRAM_BASE_URL', 'https://api.deepgram.com/v1/listen'),
],

// Video trimming service
'video_trim' => [
    'base_url' => env('VIDEO_TRIM_BASE_URL', 'https://0b62430b60e5.ngrok-free.app'),
    'trim_endpoint' => env('VIDEO_TRIM_ENDPOINT', '/trim'),
    'status_endpoint' => env('VIDEO_TRIM_STATUS_ENDPOINT', '/status'),
],

// Video rendering service
'video_render' => [
    'base_url' => env('VIDEO_RENDER_BASE_URL', 'https://96fc1870359f.ngrok-free.app'),
    'render_endpoint' => env('VIDEO_RENDER_ENDPOINT', '/render'),
    'status_endpoint' => env('VIDEO_RENDER_STATUS_ENDPOINT', '/status'),
],
```

## 🔄 Workflow Implementations

### **1. Scene Generation from Voice (Uploaded Voiceover)**

**Service**: `SceneGenerationService`

**Workflow Steps**:
1. **Audio Transcription** - Uses Deepgram API to transcribe uploaded voiceover
2. **Scene Phrase Generation** - Uses Gemini AI to split script into phrases with timing
3. **Video Search** - Uses Pexels API to find videos for each phrase
4. **Response Formatting** - Returns structured data with videos, transcript, and subtitles

**Key Features**:
- Word-level timing from transcript
- Intelligent phrase splitting
- Keyword-based video search
- Quality-based video selection (HD preferred)
- Comprehensive error handling

### **2. Scene Regeneration**

**Service**: `SceneRegenerationService`

**Workflow Steps**:
1. **Keyword Extraction** - Extracts keywords from scene script
2. **Video Search** - Searches Pexels for new videos
3. **Random Selection** - Randomly selects from top 5 videos
4. **Quality Filtering** - Prioritizes 720p-1080p videos

**Key Features**:
- Supports both Pexels and AI regeneration options
- Random video selection for variety
- Quality-based filtering
- Fallback mechanisms

### **3. Scene Trimming**

**Service**: `SceneTrimmingService`

**Workflow Steps**:
1. **Trim Request** - Sends trim request to external service
2. **Status Polling** - Polls for completion status
3. **Result Processing** - Processes trimmed video URLs

**Key Features**:
- Async processing with status polling
- Timeout handling (3.5 minutes max)
- Comprehensive error handling
- Retry mechanisms

### **4. Subtitle Generation & Video Merging**

**Service**: `SubtitleGenerationService`

**Workflow Steps**:
1. **Render Request** - Sends video data to render service
2. **Status Polling** - Polls for completion status
3. **Result Processing** - Processes final merged video URL

**Key Features**:
- Async processing with status polling
- Extended timeout handling (7 minutes max)
- Comprehensive error handling
- Retry mechanisms

## 🔄 Updated Jobs

### **GenerateScenesFromVoiceJob**
- Now uses `SceneGenerationService` instead of n8n webhook
- Maintains same response format for compatibility
- Enhanced error handling and logging

### **ProcessTrimScenesJob**
- Now uses `SceneTrimmingService` instead of n8n webhook
- Maintains same response format for compatibility
- Enhanced error handling and logging

## 🔄 Updated Controller Methods

### **ProjectController Updates**:

1. **`triggerVideoGeneration()`** - Simplified for AI/no voiceover projects
2. **`triggerSceneRegeneration()`** - Now uses `SceneRegenerationService`
3. **`regenerateSceneProxy()`** - Now uses `SceneRegenerationService`
4. **`generateSubtitles()`** - Now uses `SubtitleGenerationService`

## 📊 Response Formats

### **Scene Generation Response**
```json
{
  "all_videos": [
    {
      "phrase": "Discover EcoSip",
      "video_url": "https://0x0.st/abc123.mp4",
      "keywords": ["eco", "bottle"],
      "duration_seconds": 4.8,
      "prompt": "A cinematic scene...",
      "subtitles_script": ["Discover EcoSip"]
    }
  ],
  "voice_over_transcript": [
    {
      "word": "discover",
      "start": 0.35951087,
      "end": 0.6790761,
      "confidence": 0.99365234
    }
  ],
  "subtitles_script": [
    "Discover EcoSip",
    "the reusable water bottle"
  ],
  "total": 5,
  "collected_at": "2025-07-24T15:54:02.962Z"
}
```

### **Scene Regeneration Response**
```json
{
  "success": true,
  "message": "Scene regenerated successfully",
  "new_video_url": "https://0x0.st/new-video.mp4",
  "new_keywords": ["eco", "bottle"],
  "video_data": {
    "url": "https://0x0.st/new-video.mp4",
    "duration": 5.2,
    "preview": "https://images.pexels.com/...",
    "resolution": "1920x1080"
  }
}
```

### **Scene Trimming Response**
```json
{
  "all_videos": [
    {
      "scene_id": "65",
      "video_url": "https://0x0.st/8n6a.mp4"
    }
  ],
  "total": 5,
  "collected_at": "2025-07-24T15:54:02.962Z",
  "failed_scenes": []
}
```

### **Subtitle Generation Response**
```json
{
  "merged video url": "https://0x0.st/87Yi.mp4",
  "completed_at": "2025-08-03T01:12:21.383Z"
}
```

## 🔧 Easy Configuration Updates

### **API Keys**
All API keys are stored in environment variables and can be easily updated:

```bash
# .env file
GEMINI_API_KEY=your_new_gemini_key
PEXELS_API_KEY=your_new_pexels_key
DEEPGRAM_API_KEY=your_new_deepgram_key
```

### **Service URLs**
All service URLs can be updated via environment variables:

```bash
# .env file
VIDEO_TRIM_BASE_URL=https://your-new-trim-service.com
VIDEO_RENDER_BASE_URL=https://your-new-render-service.com
```

### **Service Endpoints**
Individual endpoints can be customized:

```bash
# .env file
VIDEO_TRIM_ENDPOINT=/custom-trim
VIDEO_RENDER_ENDPOINT=/custom-render
```

## 🛡️ Error Handling

### **Comprehensive Error Handling**
- Network timeouts
- API failures
- Invalid responses
- Service unavailability
- Retry mechanisms

### **Logging**
- Detailed logging for debugging
- Error tracking
- Performance monitoring
- Status updates

## 🚀 Benefits

### **1. Independence from n8n**
- No dependency on external workflow platform
- Direct control over all operations
- Faster execution
- Better error handling

### **2. Easy Maintenance**
- All code in one place
- Easy to modify and extend
- Better debugging capabilities
- Version control friendly

### **3. Cost Effective**
- No external service costs for workflow execution
- Reduced API calls
- Better resource utilization

### **4. Scalability**
- Can easily add new services
- Can modify individual steps
- Can add caching and optimization
- Can implement custom logic

## 🔄 Migration Notes

### **Backward Compatibility**
- All existing response formats maintained
- No changes required in frontend
- Database structure unchanged
- API endpoints unchanged

### **Testing**
- All services include comprehensive error handling
- Logging for debugging
- Retry mechanisms for reliability
- Timeout handling for long operations

## 📝 Usage Examples

### **Scene Generation**
```php
$sceneGenerationService = new SceneGenerationService();
$result = $sceneGenerationService->generateScenesFromVoice($project);
```

### **Scene Regeneration**
```php
$sceneRegenerationService = new SceneRegenerationService();
$result = $sceneRegenerationService->regenerateScene($scene, 'pexels');
```

### **Scene Trimming**
```php
$sceneTrimmingService = new SceneTrimmingService();
$result = $sceneTrimmingService->trimScenes($project, $scenesData);
```

### **Subtitle Generation**
```php
$subtitleGenerationService = new SubtitleGenerationService();
$result = $subtitleGenerationService->generateSubtitlesAndMerge($project, $videoData, $projectInfo);
```

This implementation provides a robust, maintainable, and scalable solution that replaces the n8n webhook dependencies while maintaining all existing functionality.
