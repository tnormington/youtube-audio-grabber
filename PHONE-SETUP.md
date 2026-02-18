# 📱 Motorola Phone Setup Instructions

## Current Status: ✅ Ready for Phone Connection

Your music files are ready in: `C:\Users\timjn\Music\YouTube Downloads (Phone Ready)`

## 📲 Connect Your Motorola Phone

### Step 1: Connect Phone to PC
1. Connect Motorola Edge 5G UW via USB cable
2. On your phone, select **"File Transfer (MTP)"** mode
3. In Windows Explorer, you should see: **"motorola edge 5G UW (2021)"**

### Step 2: Test Direct Transfer
Once connected, run:
```bash
node src/cli.js move --all
```

The tool will automatically detect your phone and transfer directly to:
`motorola edge 5G UW (2021)\Internal shared storage\Music`

### Step 3: Manual Transfer (If Auto-Detection Fails)
1. Open Windows Explorer
2. Navigate to: `C:\Users\timjn\Music\YouTube Downloads (Phone Ready)`
3. Select all music files (Ctrl+A)
4. Copy them (Ctrl+C)
5. Navigate to: **This PC** → **motorola edge 5G UW (2021)** → **Internal shared storage** → **Music**
6. Paste files (Ctrl+V)

## 🎵 Verify on Phone

### Option 1: Using Default Music App
1. Open your default **Music** or **Google Play Music** app
2. Files should appear automatically in your library

### Option 2: Using VLC
1. Open **VLC** app
2. Go to **Audio** tab
3. Files should be listed in your music library

### Option 3: Using Poweramp
1. Open **Poweramp**
2. Go to **Settings** → **Folders and Library**
3. Ensure **/storage/emulated/0/Music** is being scanned
4. Tap **"Rescan"** if needed

## 🔄 Automated Workflow (Once Phone is Connected)

```bash
# Download and transfer to phone in one step
node src/cli.js download "https://youtube.com/watch?v=VIDEO_ID" --device

# Or download first, then transfer
node src/cli.js download "https://youtube.com/watch?v=VIDEO_ID"
node src/cli.js move --all
```

## ✅ Current Files Ready for Transfer:
- Billy Strings concert (186 minutes)
- Rick Astley - Never Gonna Give You Up (3:33)

**Total:** 2 files, ~185MB ready to transfer to your phone!