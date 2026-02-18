import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import { randomUUID } from 'crypto';
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
        const metadata = { title: '', artist: '', album: '', date: '' };
        for (const line of stdout.split('\n')) {
          const [key, ...rest] = line.split('=');
          const value = rest.join('=').trim();
          const k = key.trim().toLowerCase();
          if (k === 'title') metadata.title = value;
          else if (k === 'artist') metadata.artist = value;
          else if (k === 'album') metadata.album = value;
          else if (k === 'date') metadata.date = value;
        }

        // Also try to extract from stderr (ffmpeg prints metadata there)
        const titleMatch = stderr.match(/title\s*:\s*(.+)/i);
        const artistMatch = stderr.match(/artist\s*:\s*(.+)/i);
        const albumMatch = stderr.match(/album\s*:\s*(.+)/i);
        const dateMatch = stderr.match(/date\s*:\s*(.+)/i);

        if (!metadata.title && titleMatch) metadata.title = titleMatch[1].trim();
        if (!metadata.artist && artistMatch) metadata.artist = artistMatch[1].trim();
        if (!metadata.album && albumMatch) metadata.album = albumMatch[1].trim();
        if (!metadata.date && dateMatch) metadata.date = dateMatch[1].trim();

        resolve(metadata);
      });

      proc.on('error', (err) => reject(err));
    });
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
