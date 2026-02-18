import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { randomUUID } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { MetadataParser } from '../../src/metadataParser.js';
import {
  sanitizeFilename,
  sanitizeYouTubeUrl,
  getDownloadDirectory,
  ensureDownloadDirectory,
} from '../../src/utils.js';

const YT_DLP_PATH = 'C:\\Users\\timjn\\Workspace\\yt-dlp.exe';
const FFMPEG_PATH = 'C:\\Users\\timjn\\Workspace\\youtube-audio-grabber\\ffmpeg.exe';

export class DownloadManager {
  constructor() {
    this.jobs = new Map();
    this.metadataParser = new MetadataParser();
  }

  async getVideoInfo(url) {
    const cleanUrl = sanitizeYouTubeUrl(url);
    const output = await this._execYtDlp(['--dump-json', '--no-playlist', cleanUrl]);
    const info = JSON.parse(output.trim());
    const parsed = this.metadataParser.parseVideoInfo(info);
    return {
      title: info.title,
      duration: info.duration,
      thumbnail: info.thumbnail,
      uploader: info.uploader,
      metadata: parsed,
    };
  }

  startDownload(url) {
    const jobId = randomUUID();
    const job = {
      id: jobId,
      url: sanitizeYouTubeUrl(url),
      status: 'pending',
      progress: 0,
      filename: null,
      error: null,
      listeners: [],
    };
    this.jobs.set(jobId, job);
    this._runDownload(job);
    return jobId;
  }

  async _runDownload(job) {
    try {
      job.status = 'downloading';
      this._notify(job, { type: 'status', status: 'downloading' });

      const downloadDir = getDownloadDirectory();
      await ensureDownloadDirectory(downloadDir);

      // First get video info to know the filename
      const infoOutput = await this._execYtDlp(['--dump-json', '--no-playlist', job.url]);
      const info = JSON.parse(infoOutput.trim());
      const safeTitle = sanitizeFilename(info.title);
      const outputTemplate = path.join(downloadDir, `${safeTitle}.%(ext)s`);

      // Download with --newline for progress parsing
      const args = [
        '--format', 'bestaudio[ext=m4a]/bestaudio[ext=mp3]/bestaudio',
        '--output', outputTemplate,
        '--ffmpeg-location', FFMPEG_PATH,
        '--newline',
        '--no-playlist',
        job.url,
      ];

      await new Promise((resolve, reject) => {
        const proc = spawn(YT_DLP_PATH, args, { stdio: 'pipe' });
        let stderr = '';

        proc.stdout.on('data', (data) => {
          const lines = data.toString().split('\n');
          for (const line of lines) {
            const match = line.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);
            if (match) {
              job.progress = parseFloat(match[1]);
              this._notify(job, { type: 'progress', progress: job.progress });
            }
          }
        });

        proc.stderr.on('data', (data) => {
          stderr += data.toString();
          // yt-dlp sometimes outputs progress to stderr too
          const lines = data.toString().split('\n');
          for (const line of lines) {
            const match = line.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);
            if (match) {
              job.progress = parseFloat(match[1]);
              this._notify(job, { type: 'progress', progress: job.progress });
            }
          }
        });

        proc.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`yt-dlp exited with code ${code}: ${stderr}`));
        });

        proc.on('error', (err) => reject(err));
      });

      // Find the downloaded file
      const files = await fs.readdir(downloadDir);
      const downloadedFile = files.find((f) => f.startsWith(safeTitle));
      const filePath = downloadedFile
        ? path.join(downloadDir, downloadedFile)
        : path.join(downloadDir, `${safeTitle}.m4a`);

      job.filename = path.basename(filePath);

      // Auto-embed YouTube thumbnail as album artwork
      if (info.thumbnail) {
        try {
          const thumbRes = await fetch(info.thumbnail);
          if (thumbRes.ok) {
            const thumbBuffer = Buffer.from(await thumbRes.arrayBuffer());
            await this.embedArtwork(job.filename, thumbBuffer);
          }
        } catch (err) {
          console.warn('Failed to embed thumbnail artwork:', err.message);
        }
      }

      job.status = 'complete';
      job.progress = 100;
      this._notify(job, {
        type: 'complete',
        filename: job.filename,
        metadata: this.metadataParser.parseVideoInfo(info),
      });
    } catch (err) {
      job.status = 'error';
      job.error = err.message;
      this._notify(job, { type: 'error', error: err.message });
    }
  }

  getJob(jobId) {
    return this.jobs.get(jobId);
  }

  addListener(jobId, callback) {
    const job = this.jobs.get(jobId);
    if (!job) return false;
    job.listeners.push(callback);

    // Send current state immediately
    if (job.status === 'complete') {
      callback({ type: 'complete', filename: job.filename });
    } else if (job.status === 'error') {
      callback({ type: 'error', error: job.error });
    } else {
      callback({ type: 'progress', progress: job.progress });
    }
    return true;
  }

  removeListener(jobId, callback) {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.listeners = job.listeners.filter((l) => l !== callback);
  }

  _notify(job, event) {
    for (const listener of job.listeners) {
      try {
        listener(event);
      } catch {
        // listener may have been cleaned up
      }
    }
  }

  async listDownloads() {
    const downloadDir = getDownloadDirectory();
    await ensureDownloadDirectory(downloadDir);
    const files = await fs.readdir(downloadDir);
    const audioFiles = files.filter(
      (f) => f.endsWith('.m4a') || f.endsWith('.mp3') || f.endsWith('.webm')
    );

    const results = [];
    for (const file of audioFiles) {
      const filePath = path.join(downloadDir, file);
      const stat = await fs.stat(filePath);
      const entry = {
        filename: file,
        size: stat.size,
        date: stat.mtime.toISOString(),
        metadata: { title: '', artist: '', album: '', date: '' },
      };
      try {
        entry.metadata = await this.readMetadata(file);
      } catch {
        // metadata read may fail for some files
      }
      results.push(entry);
    }
    return results.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  async readMetadata(filename) {
    const downloadDir = getDownloadDirectory();
    const filePath = path.join(downloadDir, filename);

    if (!(await fs.pathExists(filePath))) {
      throw new Error('File not found');
    }

    return new Promise((resolve, reject) => {
      const proc = spawn(FFMPEG_PATH, ['-i', filePath, '-f', 'ffmetadata', 'pipe:1'], {
        stdio: 'pipe',
      });
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (d) => (stdout += d.toString()));
      proc.stderr.on('data', (d) => (stderr += d.toString()));

      proc.on('close', () => {
        // Parse ffmetadata format
        const metadata = { title: '', artist: '', album: '', date: '', duration: 0 };
        for (const line of stdout.split('\n')) {
          const [key, ...rest] = line.split('=');
          const value = rest.join('=').trim();
          const k = key.trim().toLowerCase();
          if (k === 'title') metadata.title = value;
          else if (k === 'artist') metadata.artist = value;
          else if (k === 'album') metadata.album = value;
          else if (k === 'date') metadata.date = value;
        }

        // Also try to extract from stderr (ffmpeg prints metadata in indented lines)
        const titleMatch = stderr.match(/^\s+title\s+:\s*(.+)/im);
        const artistMatch = stderr.match(/^\s+artist\s+:\s*(.+)/im);
        const albumMatch = stderr.match(/^\s+album\s+:\s*(.+)/im);
        const dateMatch = stderr.match(/^\s+date\s+:\s*(.+)/im);
        const durationMatch = stderr.match(/Duration:\s*(\d+):(\d+):(\d+)\.(\d+)/);

        if (!metadata.title && titleMatch) metadata.title = titleMatch[1].trim();
        if (!metadata.artist && artistMatch) metadata.artist = artistMatch[1].trim();
        if (!metadata.album && albumMatch) metadata.album = albumMatch[1].trim();
        if (!metadata.date && dateMatch) metadata.date = dateMatch[1].trim();
        if (durationMatch) {
          metadata.duration = parseInt(durationMatch[1]) * 3600
            + parseInt(durationMatch[2]) * 60
            + parseInt(durationMatch[3]);
        }

        resolve(metadata);
      });

      proc.on('error', (err) => reject(err));
    });
  }

  async generateMetadata(filename) {
    const baseName = filename.replace(/\.(m4a|mp3|webm)$/, '');

    let currentMetadata = { title: '', artist: '', album: '', date: '' };
    try {
      currentMetadata = await this.readMetadata(filename);
    } catch {
      // file may not have readable metadata
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set. Add it to your environment or a .env file.');
    }

    const client = new Anthropic();
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: `You are a music metadata expert. Given a filename from a YouTube audio download, identify the song metadata.

Filename: "${baseName}"

Current metadata (may be empty or inaccurate):
- Title: "${currentMetadata.title}"
- Artist: "${currentMetadata.artist}"
- Album: "${currentMetadata.album}"
- Year: "${currentMetadata.date}"

Instructions:
- Identify the artist name and clean song title
- Remove clutter like "Official Video", "Official Audio", "HD", "HQ", "Lyrics", "Music Video", "(Audio)", "[Official]", etc.
- If you can identify the album and release year from your knowledge, include them
- If you cannot confidently determine a field, return an empty string for it
- Improve existing metadata if it looks incomplete or poorly formatted

Respond with ONLY a JSON object, no markdown fencing:
{"title": "...", "artist": "...", "album": "...", "date": "..."}`,
      }],
    });

    const text = response.content[0].text.trim();
    const parsed = JSON.parse(text);
    return {
      title: parsed.title || '',
      artist: parsed.artist || '',
      album: parsed.album || '',
      date: parsed.date || '',
    };
  }

  async writeMetadata(filename, metadata) {
    const downloadDir = getDownloadDirectory();
    const filePath = path.join(downloadDir, filename);

    if (!(await fs.pathExists(filePath))) {
      throw new Error('File not found');
    }

    const tempPath = filePath.replace(/\.(m4a|mp3|webm)$/, '_temp.$1');

    const ffmpegArgs = [
      '-i', filePath,
      '-map', '0',
      '-c', 'copy',
      '-metadata', `title=${metadata.title || ''}`,
      '-metadata', `artist=${metadata.artist || ''}`,
      '-metadata', `album=${metadata.album || ''}`,
      '-metadata', `date=${metadata.date || ''}`,
      '-y',
      tempPath,
    ];

    await new Promise((resolve, reject) => {
      const proc = spawn(FFMPEG_PATH, ffmpegArgs, { stdio: 'pipe' });
      let stderr = '';
      proc.stderr.on('data', (d) => (stderr += d.toString()));
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg failed: ${stderr}`));
      });
      proc.on('error', (err) => reject(err));
    });

    await fs.move(tempPath, filePath, { overwrite: true });
  }

  async searchYouTubeThumbnail(query) {
    const isUrl = /^https?:\/\//.test(query);
    const output = await this._execYtDlp([
      '--dump-json', '--no-playlist', '--no-download',
      isUrl ? query : `ytsearch1:${query}`,
    ]);
    const trimmed = output.trim();
    if (!trimmed) throw new Error('No YouTube results found for this search');
    const info = JSON.parse(trimmed);
    if (!info.thumbnail) throw new Error('No thumbnail found for this video');
    const thumbRes = await fetch(info.thumbnail);
    if (!thumbRes.ok) throw new Error('Failed to download YouTube thumbnail');
    return Buffer.from(await thumbRes.arrayBuffer());
  }

  async extractArtwork(filename) {
    const downloadDir = getDownloadDirectory();
    const filePath = path.join(downloadDir, filename);

    if (!(await fs.pathExists(filePath))) {
      throw new Error('File not found');
    }

    return new Promise((resolve) => {
      const proc = spawn(FFMPEG_PATH, [
        '-i', filePath,
        '-an', '-vcodec', 'copy',
        '-f', 'image2', 'pipe:1',
      ], { stdio: ['pipe', 'pipe', 'pipe'] });

      const chunks = [];
      proc.stdout.on('data', (chunk) => chunks.push(chunk));
      proc.on('close', (code) => {
        if (code !== 0 || chunks.length === 0) {
          resolve(null);
          return;
        }
        const buffer = Buffer.concat(chunks);
        // Detect content type from magic bytes
        let contentType = 'image/jpeg';
        if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
          contentType = 'image/png';
        }
        resolve({ buffer, contentType });
      });
      proc.on('error', () => resolve(null));
    });
  }

  async embedArtwork(filename, imageBuffer) {
    const downloadDir = getDownloadDirectory();
    const filePath = path.join(downloadDir, filename);

    if (!(await fs.pathExists(filePath))) {
      throw new Error('File not found');
    }

    const id = randomUUID();
    const tempImageIn = path.join(os.tmpdir(), `artwork-in-${id}`);
    const tempImageJpg = path.join(os.tmpdir(), `artwork-${id}.jpg`);
    const ext = path.extname(filename);
    const tempOutput = path.join(os.tmpdir(), `output-${id}${ext}`);

    try {
      await fs.writeFile(tempImageIn, imageBuffer);

      // Convert to square JPEG with letterbox bars for container compatibility
      await new Promise((resolve, reject) => {
        const proc = spawn(FFMPEG_PATH, [
          '-i', tempImageIn,
          '-vf', 'scale=600:600:force_original_aspect_ratio=decrease,pad=600:600:(ow-iw)/2:(oh-ih)/2:black',
          '-q:v', '2',
          '-y', tempImageJpg,
        ], { stdio: 'pipe' });

        let stderr = '';
        proc.stderr.on('data', (d) => (stderr += d.toString()));
        proc.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`FFmpeg image conversion failed: ${stderr}`));
        });
        proc.on('error', (err) => reject(err));
      });

      await new Promise((resolve, reject) => {
        const proc = spawn(FFMPEG_PATH, [
          '-i', filePath,
          '-i', tempImageJpg,
          '-map', '0:a',
          '-map', '1:v',
          '-c:a', 'copy',
          '-c:v', 'copy',
          '-disposition:v:0', 'attached_pic',
          '-y', tempOutput,
        ], { stdio: 'pipe' });

        let stderr = '';
        proc.stderr.on('data', (d) => (stderr += d.toString()));
        proc.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`FFmpeg artwork embed failed: ${stderr}`));
        });
        proc.on('error', (err) => reject(err));
      });

      await fs.move(tempOutput, filePath, { overwrite: true });
    } finally {
      await fs.remove(tempImageIn).catch(() => {});
      await fs.remove(tempImageJpg).catch(() => {});
      await fs.remove(tempOutput).catch(() => {});
    }
  }

  async getPlaylistEntries(url) {
    // Don't use sanitizeYouTubeUrl here — it strips the list= parameter
    const output = await this._execYtDlp([
      '--flat-playlist', '--dump-json', '--no-download', url,
    ]);

    const lines = output.trim().split('\n').filter(Boolean);
    let playlistTitle = '';
    const entries = lines.map((line) => {
      const info = JSON.parse(line);
      if (!playlistTitle && info.playlist_title) {
        playlistTitle = info.playlist_title;
      }
      return {
        url: info.webpage_url || `https://youtube.com/watch?v=${info.id}`,
        title: info.title || info.id,
        duration: info.duration || 0,
        thumbnail: info.thumbnail || info.thumbnails?.[0]?.url || null,
      };
    });

    return { title: playlistTitle, entries };
  }

  _execYtDlp(args) {
    return new Promise((resolve, reject) => {
      const proc = spawn(YT_DLP_PATH, args, { stdio: 'pipe' });
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (d) => (stdout += d.toString()));
      proc.stderr.on('data', (d) => (stderr += d.toString()));

      proc.on('close', (code) => {
        if (code === 0) resolve(stdout);
        else reject(new Error(`yt-dlp failed (code ${code}): ${stderr}`));
      });

      proc.on('error', (err) => reject(err));
    });
  }
}
