import { spawn } from 'child_process';
import path from 'path';
import { sanitizeFilename, ensureDownloadDirectory, getDownloadPath, getDownloadDirectory } from './utils.js';
import { MetadataParser } from './metadataParser.js';
import { MetadataPrompter } from './prompter.js';

export class YouTubeAudioDownloader {
  constructor() {
    this.ytDlpPath = 'C:\\Users\\timjn\\Workspace\\yt-dlp.exe';
    this.metadataParser = new MetadataParser();
    this.metadataPrompter = new MetadataPrompter();
    this.ffmpegPath = this.findFFmpeg();
  }

  findFFmpeg() {
    // Try local installation first
    const localPaths = [
      'C:\\Users\\timjn\\Workspace\\youtube-audio-grabber\\ffmpeg.exe',
      'C:\\Users\\timjn\\Workspace\\ffmpeg.exe',
      'ffmpeg' // System PATH
    ];
    
    return localPaths[0]; // Default to project folder
  }

  async downloadOnly(url, options = {}) {
    const { format = 'm4a', quality = 'best' } = options;

    try {
      const downloadDir = getDownloadDirectory();
      await ensureDownloadDirectory(downloadDir);

      const videoInfo = await this.getVideoInfo(url);
      const outputTemplate = path.join(downloadDir, `${sanitizeFilename(videoInfo.title)}.%(ext)s`);

      console.log(`Downloading: ${videoInfo.title}`);
      console.log(`Saving to: ${downloadDir}`);

      const downloadArgs = [
        '--format', 'bestaudio[ext=m4a]/bestaudio[ext=mp3]/bestaudio',
        '--output', outputTemplate,
        '--ffmpeg-location', this.ffmpegPath,
        url
      ];

      await this.execYtDlp(downloadArgs);

      // Find the actual downloaded file
      const fs = await import('fs-extra');
      const files = await fs.default.readdir(downloadDir);
      const downloadedFile = files.find(file => file.startsWith(sanitizeFilename(videoInfo.title)));

      const filePath = downloadedFile ? path.join(downloadDir, downloadedFile) : path.join(downloadDir, sanitizeFilename(videoInfo.title) + '.m4a');

      // Prompt user for metadata
      const metadata = await this.metadataPrompter.promptForMetadata(videoInfo.title);

      // Add metadata post-processing with ffmpeg
      console.log('🎵 Adding metadata to file...');
      await this.addMetadataToFile(filePath, metadata, metadata.title);

      return {
        success: true,
        title: videoInfo.title,
        filePath: filePath,
        duration: videoInfo.duration,
        downloadOnly: true
      };
    } catch (error) {
      throw new Error(`Download failed: ${error.message}`);
    }
  }

  async execYtDlp(args) {
    return new Promise((resolve, reject) => {
      const process = spawn(this.ytDlpPath, args, { stdio: 'pipe' });
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`yt-dlp failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to start yt-dlp: ${error.message}`));
      });
    });
  }

  async addMetadataToFile(filePath, metadata, cleanTitle) {
    return new Promise((resolve, reject) => {
      // Create a temporary output file
      const tempPath = filePath.replace(/\.(m4a|mp3)$/, '_temp.$1');
      
      const ffmpegArgs = [
        '-i', filePath,
        '-c', 'copy', // Don't re-encode, just copy
        '-metadata', `title=${cleanTitle}`,
        '-metadata', `artist=${metadata.artist}`,
        '-metadata', `album=${metadata.album}`,
        '-metadata', `date=${metadata.date}`,
        '-y', // Overwrite output file
        tempPath
      ];

      console.log(`Running: ${this.ffmpegPath} ${ffmpegArgs.join(' ')}`);
      const process = spawn(this.ffmpegPath, ffmpegArgs, { stdio: 'pipe' });
      
      let stderr = '';
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', async (code) => {
        if (code === 0) {
          try {
            // Replace original file with metadata-enhanced version
            const fs = await import('fs-extra');
            await fs.default.move(tempPath, filePath, { overwrite: true });
            console.log('✅ Metadata added successfully!');
            resolve();
          } catch (error) {
            reject(new Error(`Failed to replace file: ${error.message}`));
          }
        } else {
          reject(new Error(`FFmpeg failed: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`FFmpeg error: ${error.message}`));
      });
    });
  }

  async getVideoInfo(url) {
    try {
      const args = ['--dump-json', '--no-playlist', url];
      const output = await this.execYtDlp(args);
      const info = JSON.parse(output.trim());
      
      // Return full info for metadata parsing
      return info;
    } catch (error) {
      throw new Error(`Failed to get video info: ${error.message}`);
    }
  }

  async downloadAudio(url, options = {}) {
    const { format = 'mp3', quality = 'best' } = options;

    try {
      const downloadDir = getDownloadDirectory();
      await ensureDownloadDirectory(downloadDir);

      const videoInfo = await this.getVideoInfo(url);
      const outputTemplate = path.join(downloadDir, `${sanitizeFilename(videoInfo.title)}.%(ext)s`);

      console.log(`Downloading: ${videoInfo.title}`);
      console.log(`Saving to: ${downloadDir}`);

      const downloadArgs = [
        '--format', 'bestaudio[ext=m4a]/bestaudio[ext=mp3]/bestaudio',
        '--output', outputTemplate,
        // Add metadata using ffmpeg
        '--add-metadata',
        '--ffmpeg-location', this.ffmpegPath,
        // Embed metadata fields
        '--embed-metadata',
        url
      ];

      await this.execYtDlp(downloadArgs);

      // Find the actual downloaded file
      const fs = await import('fs-extra');
      const files = await fs.default.readdir(downloadDir);
      const downloadedFile = files.find(file => file.startsWith(sanitizeFilename(videoInfo.title)));
      const filePath = downloadedFile ? path.join(downloadDir, downloadedFile) : path.join(downloadDir, sanitizeFilename(videoInfo.title) + '.m4a');

      // Prompt user for metadata
      const metadata = await this.metadataPrompter.promptForMetadata(videoInfo.title);

      // Add metadata post-processing with ffmpeg
      console.log('🎵 Adding metadata to file...');
      await this.addMetadataToFile(filePath, metadata, metadata.title);

      return {
        success: true,
        title: videoInfo.title,
        outputPath: filePath,
        duration: videoInfo.duration
      };
    } catch (error) {
      throw new Error(`Download failed: ${error.message}`);
    }
  }
}