# 🎬 FFmpeg Setup Instructions

## Overview
FFmpeg tools have been removed from Git to reduce repository size. Follow these instructions to set up FFmpeg on your local development environment.

## 🚀 Quick Setup

### **Option 1: Download and Extract (Recommended)**

1. **Download FFmpeg**: Go to https://ffmpeg.org/download.html#build-windows
2. **Download Essentials**: Get the "essentials" build (smaller size)
3. **Extract**: Extract the downloaded zip to `storage/tools/ffmpeg/`
4. **Verify**: The structure should be:
   ```
   storage/tools/ffmpeg/
   ├── bin/
   │   ├── ffmpeg.exe
   │   ├── ffprobe.exe
   │   └── ffplay.exe
   ├── doc/
   └── presets/
   ```

### **Option 2: Use System FFmpeg**

If you have FFmpeg installed system-wide, update your `.env` file:

```env
FFMPEG_PATH=ffmpeg
FFPROBE_PATH=ffprobe
```

### **Option 3: Docker (For Production)**

For production environments, use the Docker approach:

```bash
# Pull the FFmpeg Docker image
docker pull jrottenberg/ffmpeg

# Use in your application
docker run --rm -v /path/to/videos:/videos jrottenberg/ffmpeg [commands]
```

## 🔧 Configuration

After setting up FFmpeg, your application will automatically detect the tools in:
- `storage/tools/ffmpeg/bin/ffmpeg.exe`
- `storage/tools/ffmpeg/bin/ffprobe.exe`

## ✅ Verification

Test FFmpeg installation:

```bash
# Test from your project root
storage/tools/ffmpeg/bin/ffmpeg.exe -version
storage/tools/ffmpeg/bin/ffprobe.exe -version
```

## 🚨 Important Notes

- **Do NOT commit** FFmpeg files to Git
- **Add to .gitignore** (already done)
- **Share setup instructions** with team members
- **Use Docker** for production deployments

## 📁 File Structure

Your `storage/tools/` directory should look like:
```
storage/tools/
└── ffmpeg/           # ← This directory is now gitignored
    ├── bin/
    ├── doc/
    └── presets/
```

## 🔄 Team Setup

When team members clone the repository:

1. **Clone the repo** (FFmpeg files won't be included)
2. **Follow this setup guide** to install FFmpeg locally
3. **Verify installation** works with your application

This approach keeps the repository lightweight while ensuring all team members can run the application locally.
