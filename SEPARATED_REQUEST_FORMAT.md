# 🎬 Separated Request Format for n8n API

## Overview
Updated the subtitle generation request to send data in two separate objects as requested: `videoData` for clips/durations/subtitles and `projectInfo` for additional project information.

## ✅ New Request Structure

### **Complete Request Body**
```json
{
  "videoData": {
    "clips": [
      "https://0x0.st/8n7Z.mp4",
      "https://0x0.st/8n7N.mp4", 
      "https://0x0.st/8n7q.mp4",
      "https://0x0.st/8nEJ.mp4",
      "https://0x0.st/8n7b.mp4",
      "https://0x0.st/8n7c.mp4",
      "https://0x0.st/8nRv.mp4",
      "https://0x0.st/8nUA.mp4"
    ],
    "clipDurations": [1.0, 3.8, 1.2, 1.6, 2.7, 0.7, 0.6, 1.4],
    "aspectRatio": "1:1",
    "transition": "fade",
    "subtitles": [
      {
        "text": "Discover eco sip the reusable water bottle that",
        "start": 0.35951087,
        "end": 3.8747282,
        "position": "bottom",
        "backgroundColor": "linear-gradient(135deg, rgba(0,0,0,0.9), rgba(30,30,30,0.9))",
        "textColor": "#ffffff",
        "fontSize": 56,
        "transition": "fade",
        "transitionDuration": 0.5
      }
    ]
  },
  "projectInfo": {
    "project_id": 17,
    "project_name": "qsdfgh",
    "script": "Discover EcoSip, the reusable water bottle...",
    "voiceover_option": "upload",
    "style": "professional",
    "style_config": {
      "backgroundColor": "linear-gradient(135deg, rgba(0,0,0,0.9), rgba(30,30,30,0.9))",
      "textColor": "#ffffff",
      "fontSize": 56,
      "position": "bottom",
      "transition": "fade",
      "transitionDuration": 0.5
    },
    "language": "english",
    "category": "tech",
    "created_at": "2025-07-24T16:36:26.000Z",
    "total_scenes": 8,
    "total_duration": 12.0
  }
}
```

## 🎯 Data Separation

### **videoData Object** (Core Video Processing)
Contains only the essential data needed for video processing:

- **`clips`**: Array of video URLs (strings)
- **`clipDurations`**: Array of exact durations (floats) 
- **`aspectRatio`**: Video aspect ratio (string)
- **`transition`**: Video transition type (string)
- **`subtitles`**: Array of subtitle objects with timing and styling

### **projectInfo Object** (Additional Context)
Contains supplementary project information:

- **`project_id`**: Database project ID
- **`project_name`**: User-defined project name
- **`script`**: Full project script text
- **`voiceover_option`**: Type of voiceover (upload/ai/none)
- **`style`**: Selected subtitle style name
- **`style_config`**: Complete style configuration object
- **`language`**: Project language
- **`category`**: Project category
- **`created_at`**: Project creation timestamp
- **`total_scenes`**: Number of video clips
- **`total_duration`**: Total video duration in seconds

## 🛠️ Technical Implementation

### **Backend Changes**
**File**: `app/Http/Controllers/ProjectController.php`

**Updated `prepareSubtitleData` method:**
```php
private function prepareSubtitleData(Project $project, array $validated): array
{
    // Extract video URLs and durations separately
    $clipUrls = [];
    $clipDurations = [];
    $scenes = $project->scenes()->orderBy('scene_number')->get()->keyBy('id');
    
    foreach ($validated['videos'] as $video) {
        if (isset($video['video_url']) && isset($video['scene_id'])) {
            $scene = $scenes->get($video['scene_id']);
            
            $clipUrls[] = $video['video_url'];
            $clipDurations[] = $scene ? (float) $scene->duration_seconds : 0;
        }
    }

    // Main video data object
    $videoData = [
        'clips' => $clipUrls,
        'clipDurations' => $clipDurations,
        'aspectRatio' => $aspectRatio,
        'transition' => $validated['style_config']['transition'] ?? 'fade',
        'subtitles' => $subtitles
    ];

    // Additional project information object
    $projectInfo = [
        'project_id' => $project->id,
        'project_name' => $project->name,
        'script' => $project->custom_script,
        'voiceover_option' => $project->voiceover_option,
        'style' => $validated['style'],
        'style_config' => $validated['style_config'],
        'language' => $project->language,
        'category' => $project->category,
        'created_at' => $project->created_at->toISOString(),
        'total_scenes' => count($clipUrls),
        'total_duration' => array_sum($clipDurations)
    ];

    return [
        'videoData' => $videoData,
        'projectInfo' => $projectInfo
    ];
}
```

**Updated request sending:**
```php
// Send request to n8n API with separated data structure
$requestBody = [
    'videoData' => $videoData,
    'projectInfo' => $projectInfo
];

$response = Http::withOptions([
    'verify' => false,
    'timeout' => 120,
])->post('https://n8n-projects-jqkw.onrender.com/webhook-test/merge-scenes-with-subtitles', $requestBody);
```

## 📊 Project 17 Example

### **videoData Object**
```json
{
  "clips": [
    "https://0x0.st/8n7Z.mp4",
    "https://0x0.st/8n7N.mp4",
    "https://0x0.st/8n7q.mp4",
    "https://0x0.st/8nEJ.mp4",
    "https://0x0.st/8n7b.mp4",
    "https://0x0.st/8n7c.mp4",
    "https://0x0.st/8nRv.mp4",
    "https://0x0.st/8nUA.mp4"
  ],
  "clipDurations": [1.0, 3.8, 1.2, 1.6, 2.7, 0.7, 0.6, 1.4],
  "aspectRatio": "1:1",
  "transition": "fade",
  "subtitles": [
    {
      "text": "Discover eco sip the reusable water bottle that",
      "start": 0.35951087,
      "end": 3.8747282,
      "position": "bottom",
      "backgroundColor": "linear-gradient(135deg, rgba(0,0,0,0.9), rgba(30,30,30,0.9))",
      "textColor": "#ffffff",
      "fontSize": 56,
      "transition": "fade",
      "transitionDuration": 0.5
    }
  ]
}
```

### **projectInfo Object**
```json
{
  "project_id": 17,
  "project_name": "qsdfgh",
  "script": "Discover EcoSip, the reusable water bottle that keeps your drinks cold for 24 hours and hot for 12 hours. Made from sustainable materials, EcoSip is perfect for your daily adventures. Stay hydrated, stay green, and make a difference with EcoSip",
  "voiceover_option": "upload",
  "style": "professional",
  "style_config": {
    "backgroundColor": "linear-gradient(135deg, rgba(0,0,0,0.9), rgba(30,30,30,0.9))",
    "textColor": "#ffffff",
    "fontSize": 56,
    "position": "bottom",
    "transition": "fade",
    "transitionDuration": 0.5
  },
  "language": "english",
  "category": "tech",
  "created_at": "2025-07-24T16:36:26.000Z",
  "total_scenes": 8,
  "total_duration": 12.0
}
```

## 🎯 Benefits

### **For n8n Processing**
1. **Clean Separation**: Core video data separated from metadata
2. **Focused Processing**: `videoData` contains only what's needed for video generation
3. **Rich Context**: `projectInfo` provides additional context for logging/analytics
4. **Flexible Structure**: Easy to extend either object independently

### **For Development**
1. **Clear Structure**: Logical separation of concerns
2. **Enhanced Logging**: Detailed information for debugging
3. **Maintainable**: Easy to modify data structure
4. **Scalable**: Can add new fields to appropriate object

### **For API Design**
1. **Consistent Format**: Predictable structure for n8n processing
2. **Backward Compatible**: Can be easily adapted if needed
3. **Well-Documented**: Clear purpose for each data section
4. **Efficient**: No redundant data in core processing object

## 🔍 Enhanced Logging

### **New Log Structure**
```
[2025-07-24 17:30:00] local.INFO: 📤 Sending subtitle generation request to n8n {
  "project_id": 17,
  "clips_count": 8,
  "subtitles_count": 6,
  "total_duration": 12.0,
  "video_data_keys": ["clips", "clipDurations", "aspectRatio", "transition", "subtitles"],
  "project_info_keys": ["project_id", "project_name", "script", "voiceover_option", "style", "style_config", "language", "category", "created_at", "total_scenes", "total_duration"]
}
```

## ✅ Ready for Production

The separated request format is now implemented and ready for testing with the n8n API. The structure provides clean separation between core video processing data and supplementary project information, making it easier for the n8n workflow to process the request efficiently.
