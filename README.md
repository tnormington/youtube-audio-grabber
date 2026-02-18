# YouTube Audio Grabber 🎵

A command-line tool to download audio from YouTube videos and automatically sync to your phone via cloud storage.

## 🚀 Quick Setup for Phone Sync

### 1. Prerequisites
- Download `yt-dlp.exe` and place it in your system (already configured in this project)
- Have Google Drive installed and synced on your computer

### 2. Installation
```bash
git clone <this-repo>
cd youtube-audio-grabber
npm install
```

### 3. Google Drive Setup (One-time)
**On your computer:**
1. Install Google Drive for Desktop (if not already installed)
2. After first download, go to: `C:\Users\[your-username]\Music\YouTube Downloads (Google Drive Sync)`
3. Right-click the folder → **"Add to Google Drive"** (this syncs it to cloud)

### 4. Phone Setup (One-time)
**On your phone:**
1. Install a music player with Google Drive support:
   - **Android**: Poweramp, PlayerPro, VLC, or Google Play Music
   - **iPhone**: VLC, Documents by Readdle
2. In Poweramp: Settings → Folders → Add → Navigate to Google Drive folder
3. Enable auto-scan in your music player

## 📱 Usage - Download to Phone

```bash
# Download YouTube audio - automatically syncs to phone!
node src/cli.js "https://youtube.com/watch?v=VIDEO_ID"

# Wait 30-60 seconds for cloud sync
# Audio now appears in your phone's music library
```

## 📂 Download Location

Files are saved to:
`C:\Users\[username]\Music\YouTube Downloads (Google Drive Sync)`

This folder can be easily added to Google Drive for automatic cloud sync.

## ⚡ Features

- ✅ Downloads high-quality audio (M4A format, works on all phones)
- ✅ Auto-names files with video titles
- ✅ Saves to Google Drive sync-ready folder
- ✅ FREE cloud storage (15GB Google Drive)
- ✅ Better Android integration than Dropbox

## 🎯 User Workflow

```bash
# 1. Download from YouTube
node src/cli.js "https://youtube.com/watch?v=dQw4w9WgXcQ"

# 2. Wait for cloud sync (30-60 seconds)

# 3. Open music app on phone - new song is ready to play!
```

## 🛠️ Advanced Options

```bash
# Download with different quality
node src/cli.js -q best "https://youtube.com/watch?v=VIDEO_ID"

# Get help
node src/cli.js --help
```

No more manual file transfers - your YouTube downloads automatically appear in your phone's music library! 🎧