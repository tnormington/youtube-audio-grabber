# YouTube Audio Grabber

Download audio from YouTube videos with a web UI for managing your library, editing metadata, and fetching album artwork.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) — place `yt-dlp.exe` in the project root or parent directory
- [FFmpeg](https://ffmpeg.org/) — place `ffmpeg.exe` in the project root
- An [Anthropic API key](https://console.anthropic.com/settings/keys) (optional, for AI metadata generation)

## Installation

```bash
git clone https://github.com/tnormington/youtube-audio-grabber.git
cd youtube-audio-grabber
npm install
npm --prefix web install
```

If you want AI metadata generation, create a `.env` file in the project root:

```
ANTHROPIC_API_KEY=sk-ant-...
```

## Running

### Development

Starts both the backend server and the Vite dev server with hot reload:

```bash
npm run dev
```

Then open **http://localhost:5173** in your browser.

### Production

Builds the frontend and serves everything from the Express server:

```bash
npm run prod
```

Then open **http://localhost:3001**.

## Using the Web UI

### Downloading audio

1. Paste a YouTube URL into the input field at the top
2. Click **Fetch Info** to preview the video title, duration, and thumbnail
3. Click **Download** to grab the audio (M4A format)
4. A progress bar shows the download status
5. When complete, the file appears in your library below

Playlist URLs are also supported — the app detects them and lets you download all entries at once.

### Library

The library table shows all your downloaded files with columns for artwork, filename, title, artist, album, length, and size.

### Editing metadata

1. Click **Edit** on any row in the library
2. The metadata editor opens inline below that entry
3. Fill in or modify the title, artist, album, and year fields
4. Click **Save** to write the metadata into the audio file
5. Click **Close** to collapse the editor

### AI metadata generation

Requires `ANTHROPIC_API_KEY` in your `.env` file.

- **Single file** — Open the editor for a file and click **Generate with AI**. The AI populates the fields based on the filename. Review the suggestions, then save.
- **Bulk generate** — If any entries in your library are missing metadata, a **Generate All AI Metadata** button appears in the library header. Click it to auto-generate and save metadata for all empty entries. Progress is shown as it works through the list.

### Album artwork

In the metadata editor, you can manage album artwork:

- **Upload Image** — Upload a local image file as album art
- **Fetch from YouTube** — Searches YouTube for the video matching your filename and embeds its thumbnail as artwork. Optionally paste a specific YouTube URL in the input field for an exact match.

## Project Structure

```
youtube-audio-grabber/
  server/
    index.js              Express API server
    services/
      downloadManager.js  Download, metadata, artwork logic
  web/
    src/
      App.jsx             Main app layout
      lib/api.js          Frontend API client
      components/
        UrlInput.jsx      URL input + video preview
        DownloadProgress.jsx  Download progress bars
        DownloadsList.jsx     Library table
        MetadataEditor.jsx    Inline metadata + artwork editor
  src/
    cli.js                CLI interface (alternative to web UI)
    metadataParser.js     Regex-based metadata parser
    utils.js              Shared utilities
```

## License

MIT
