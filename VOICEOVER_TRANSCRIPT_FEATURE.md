# 🎙️ Voiceover Transcript Feature

## Overview
The Voiceover Transcript feature automatically captures and stores the word-level transcript data returned by the n8n API when processing uploaded voiceover files. This provides detailed timing and confidence information for each spoken word.

## ✨ Features

### 1. **Automatic Transcript Storage**
- Captures `voice_over_transcript` data from n8n API responses
- Stores word-level timing and confidence data in the database
- Preserves transcript data for future reference and analysis

### 2. **Rich Transcript Data**
Each transcript entry contains:
- **Word**: The spoken word
- **Start Time**: When the word begins (in seconds)
- **End Time**: When the word ends (in seconds)  
- **Confidence**: Speech recognition confidence score (0-1)

### 3. **Project Integration**
- Transcript data is linked to each project
- Accessible through the Project model methods
- Displayed in the review interface

### 4. **Interactive Transcript Viewer**
- Professional modal interface for viewing transcripts
- Color-coded confidence levels (High/Medium/Low)
- Clickable words showing timing information
- Word count and total duration display

## 🛠️ Technical Implementation

### **Database Schema**
```sql
ALTER TABLE projects ADD COLUMN voiceover_transcript JSON NULL;
```

### **Project Model Methods**
```php
// Check if project has transcript
$project->hasVoiceoverTranscript(): bool

// Get transcript data
$project->getVoiceoverTranscript(): ?array

// Get word count
$project->getTranscriptWordsCount(): int

// Get total duration
$project->getTranscriptDuration(): float
```

### **API Endpoint**
```
GET /projects/{project}/transcript
```
Returns JSON with transcript data, word count, and duration.

### **n8n API Response Format**
```json
[
  {
    "all_videos": [...],
    "voice_over_transcript": [
      {
        "word": "discover",
        "start": 0.35951087,
        "end": 0.6790761,
        "confidence": 0.99365234
      },
      {
        "word": "eco",
        "start": 0.6790761,
        "end": 1.0785326,
        "confidence": 0.97216797
      }
    ]
  }
]
```

## 🎯 How to Use

### **For Users**
1. **Upload Voiceover**: Upload an audio file when creating a project
2. **Processing**: The system automatically extracts transcript during processing
3. **View Transcript**: Click "View Transcript" button on the review page
4. **Interactive Viewing**: Click on words to see timing details

### **For Developers**
1. **Access Transcript**: Use `$project->getVoiceoverTranscript()`
2. **Check Availability**: Use `$project->hasVoiceoverTranscript()`
3. **Get Statistics**: Use word count and duration methods
4. **API Integration**: Call `/projects/{id}/transcript` endpoint

## 📊 Data Flow

1. **User uploads voiceover** → Project created with audio file
2. **GenerateScenesFromVoiceJob runs** → Calls n8n API with audio
3. **n8n processes audio** → Returns scenes + transcript data
4. **Job stores transcript** → Saves to `voiceover_transcript` column
5. **User views transcript** → Interactive modal with timing data

## 🎨 UI Features

### **Transcript Button**
- Appears in review page header when transcript is available
- Shows word count: "View Transcript (45 words)"
- Only visible for projects with transcript data

### **Transcript Modal**
- **Header**: Project name and statistics
- **Content**: Color-coded words with confidence levels
- **Interactions**: Click words for timing details
- **Legend**: Confidence level color guide

### **Confidence Color Coding**
- 🟢 **High (95%+)**: Green background - highly confident
- 🟡 **Medium (80-95%)**: Yellow background - moderately confident  
- 🔴 **Low (<80%)**: Red background - low confidence

## 🔧 Configuration

### **Database Migration**
```bash
php artisan migrate
```
Adds the `voiceover_transcript` JSON column to projects table.

### **Model Updates**
- Added `voiceover_transcript` to `$fillable` array
- Added `voiceover_transcript` to `$casts` as 'array'
- Added helper methods for transcript access

### **Job Updates**
- Modified `GenerateScenesFromVoiceJob` to extract transcript
- Updated response handling for new n8n format
- Added transcript storage logic

## 📈 Benefits

### **For Content Creators**
- **Accuracy Verification**: See exactly what was transcribed
- **Timing Analysis**: Understand speech pacing and timing
- **Quality Control**: Identify low-confidence words for review

### **For Developers**
- **Data Persistence**: Transcript data is permanently stored
- **API Access**: Programmatic access to transcript data
- **Integration Ready**: Easy to integrate with other features

### **For Analytics**
- **Speech Patterns**: Analyze speaking patterns and timing
- **Confidence Metrics**: Track transcription accuracy
- **Content Analysis**: Word-level content analysis capabilities

## 🚀 Future Enhancements

### **Potential Features**
- **Subtitle Generation**: Auto-generate subtitles from transcript
- **Search Functionality**: Search within transcript text
- **Export Options**: Export transcript as SRT, VTT, or text
- **Editing Interface**: Allow manual transcript corrections
- **Synchronization**: Sync transcript with video playback

### **Advanced Analytics**
- **Speaking Rate Analysis**: Words per minute calculations
- **Pause Detection**: Identify natural speech breaks
- **Confidence Reporting**: Overall transcription quality metrics

## 💡 Usage Examples

### **Basic Usage**
```php
// Check if project has transcript
if ($project->hasVoiceoverTranscript()) {
    $transcript = $project->getVoiceoverTranscript();
    $wordCount = $project->getTranscriptWordsCount();
    $duration = $project->getTranscriptDuration();
}
```

### **API Usage**
```javascript
// Fetch transcript data
fetch(`/projects/${projectId}/transcript`)
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('Transcript:', data.data.transcript);
            console.log('Word count:', data.data.words_count);
            console.log('Duration:', data.data.duration_seconds);
        }
    });
```

The Voiceover Transcript feature enhances the VidsAI platform by providing detailed speech analysis and timing data, enabling better content creation and quality control workflows!
