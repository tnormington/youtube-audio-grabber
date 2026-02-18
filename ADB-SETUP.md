# 🚀 ADB Setup for Automatic File Transfer

## What This Enables:
✅ **Fully automated file transfer** - no more drag & drop!  
✅ **One command** downloads and transfers to phone  
✅ **Files appear instantly** in your music apps  

## 📱 Step 1: Enable USB Debugging on Your Phone

### On Your Motorola Edge 5G UW:
1. **Settings** → **About phone** 
2. Tap **Build number** 7 times (enables Developer options)
3. Go back → **Settings** → **System** → **Developer options**
4. Enable **USB debugging**
5. When prompted, **Allow USB debugging** from this computer

## 💻 Step 2: Install ADB on Your PC

### Option A: Quick Install (Recommended)
```bash
# Download ADB tools to your Workspace folder
# Go to: https://developer.android.com/studio/releases/platform-tools
# Download "SDK Platform-Tools for Windows"
# Extract to C:\Users\timjn\Workspace\platform-tools\
```

### Option B: Add to PATH
1. Download SDK Platform-Tools from Android Developer site
2. Extract to `C:\adb\`
3. Add `C:\adb\` to your Windows PATH environment variable

## 🔧 Step 3: Test ADB Connection

```bash
# Connect phone via USB, then test:
C:\Users\timjn\Workspace\platform-tools\adb devices

# Should show your phone like:
# List of devices attached
# ABC123DEF456    device
```

## ✅ Step 4: Test Automatic Transfer

```bash
# Download and automatically transfer to phone:
node src/cli.js download "https://youtube.com/watch?v=VIDEO_ID" --device

# Or transfer existing files:
node src/cli.js move --all
```

## 🎵 What Happens:
1. **Tool detects ADB** ✓
2. **Automatically copies files** to `/sdcard/Music/` ✓  
3. **Files appear in VLC/Poweramp** instantly ✓
4. **No manual steps required** ✓

## 🔧 Troubleshooting:

**"ADB not found"**
- Install ADB tools and add to PATH

**"No devices found"** 
- Enable USB Debugging on phone
- Allow computer when phone prompts

**"Push failed"**
- Check phone storage space
- Ensure Music folder exists on phone

**"Device unauthorized"**
- Check phone screen for authorization prompt
- Re-enable USB debugging if needed

## 🎯 Once Setup Complete:
Your workflow becomes: **Download → Automatic transfer → Music ready on phone!**

No more Windows Explorer, no more drag & drop - just pure automation! 🎵📱