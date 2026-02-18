# 🎵 FFmpeg Setup for Metadata Embedding

## Why This is Needed:
Without ffmpeg, downloaded music shows as "Unknown Artist" in Poweramp because metadata isn't embedded in the audio files.

## 📥 Quick Setup (5 minutes):

### Option 1: Download to Project Folder (Recommended)
1. **Go to:** https://www.gyan.dev/ffmpeg/builds/
2. **Download:** `ffmpeg-release-essentials.zip`
3. **Extract** the zip file
4. **Copy** the `ffmpeg.exe` file to: `C:\Users\timjn\Workspace\youtube-audio-grabber\`
5. **Done!** The tool will auto-detect it

### Option 2: System-wide Installation
1. **Download** from above link
2. **Extract** to `C:\ffmpeg\`
3. **Add** `C:\ffmpeg\bin\` to your Windows PATH
4. **Restart** command prompt

## ✅ Test Installation:
```bash
# Test if ffmpeg is working:
C:\Users\timjn\Workspace\youtube-audio-grabber\ffmpeg.exe -version
```

## 🎵 After Setup:
Once ffmpeg is installed, your downloads will automatically include:
- ✅ **Artist name** (parsed from video title/description)
- ✅ **Album info** (from uploader or description)
- ✅ **Release year**
- ✅ **Song title** (cleaned up)
- ✅ **Full metadata** visible in Poweramp!

## 📱 Result:
Instead of "Unknown Artist", you'll see proper artist names, albums, and track info in Poweramp for all your YouTube downloads!