import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { DownloadManager } from './services/downloadManager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3001;
const dm = new DownloadManager();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve React build in production
const webDist = path.join(__dirname, '..', 'web', 'dist');
app.use(express.static(webDist));

// --- API Routes ---

// Fetch video info + parsed metadata
app.get('/api/video-info', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url query parameter required' });
  try {
    const info = await dm.getVideoInfo(url);
    res.json(info);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start a download, returns jobId
app.post('/api/download', (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required in body' });
  const jobId = dm.startDownload(url);
  res.json({ jobId });
});

// SSE stream for download progress
app.get('/api/download/:jobId/progress', (req, res) => {
  const { jobId } = req.params;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const send = (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
    if (event.type === 'complete' || event.type === 'error') {
      res.end();
    }
  };

  const ok = dm.addListener(jobId, send);
  if (!ok) {
    res.write(`data: ${JSON.stringify({ type: 'error', error: 'Job not found' })}\n\n`);
    res.end();
    return;
  }

  req.on('close', () => {
    dm.removeListener(jobId, send);
  });
});

// List all downloaded files
app.get('/api/downloads', async (_req, res) => {
  try {
    const list = await dm.listDownloads();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Read metadata from an existing file
app.get('/api/downloads/:filename/metadata', async (req, res) => {
  try {
    const metadata = await dm.readMetadata(req.params.filename);
    res.json(metadata);
  } catch (err) {
    res.status(err.message === 'File not found' ? 404 : 500).json({ error: err.message });
  }
});

// Get artwork from an existing file
app.get('/api/downloads/:filename/artwork', async (req, res) => {
  try {
    const result = await dm.extractArtwork(req.params.filename);
    if (!result) return res.status(404).json({ error: 'No artwork found' });
    res.set('Content-Type', result.contentType);
    res.send(result.buffer);
  } catch (err) {
    res.status(err.message === 'File not found' ? 404 : 500).json({ error: err.message });
  }
});

// Upload artwork to an existing file
app.post('/api/downloads/:filename/artwork', async (req, res) => {
  try {
    let imageBuffer;
    if (req.body.url) {
      const imgRes = await fetch(req.body.url);
      if (!imgRes.ok) throw new Error('Failed to download image from URL');
      imageBuffer = Buffer.from(await imgRes.arrayBuffer());
    } else if (req.body.data) {
      imageBuffer = Buffer.from(req.body.data, 'base64');
    } else {
      return res.status(400).json({ error: 'Provide "url" or "data" (base64) in body' });
    }
    await dm.embedArtwork(req.params.filename, imageBuffer);
    res.json({ success: true });
  } catch (err) {
    res.status(err.message === 'File not found' ? 404 : 500).json({ error: err.message });
  }
});

// Fetch artwork from YouTube by URL or by searching the filename
app.post('/api/downloads/:filename/artwork/youtube', async (req, res) => {
  try {
    const query = req.body?.url || req.params.filename.replace(/\.(m4a|mp3|webm)$/, '').replace(/[_-]/g, ' ');
    const imageBuffer = await dm.searchYouTubeThumbnail(query);
    await dm.embedArtwork(req.params.filename, imageBuffer);
    res.json({ success: true });
  } catch (err) {
    res.status(err.message === 'File not found' ? 404 : 500).json({ error: err.message });
  }
});

// Write metadata to an existing file
app.put('/api/metadata/:filename', async (req, res) => {
  try {
    await dm.writeMetadata(req.params.filename, req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(err.message === 'File not found' ? 404 : 500).json({ error: err.message });
  }
});

// SPA fallback — serve index.html for non-API routes in production
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(webDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
