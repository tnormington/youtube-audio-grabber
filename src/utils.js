import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { spawn } from 'child_process';

function getGoogleDriveMusicPath() {
  // Use the downloads folder in the project directory
  return 'C:\\Users\\timjn\\Workspace\\youtube-audio-grabber\\downloads';
}

export function sanitizeFilename(filename) {
  return filename
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 200);
}

export function sanitizeYouTubeUrl(url) {
  try {
    // Parse the URL
    const urlObj = new URL(url);

    // Extract video ID from different URL formats
    let videoId = null;

    // Format: https://www.youtube.com/watch?v=VIDEO_ID
    if (urlObj.hostname.includes('youtube.com') && urlObj.pathname === '/watch') {
      videoId = urlObj.searchParams.get('v');
    }
    // Format: https://youtu.be/VIDEO_ID
    else if (urlObj.hostname === 'youtu.be') {
      videoId = urlObj.pathname.slice(1); // Remove leading slash
    }

    // If we found a video ID, return a clean URL with only the v parameter
    if (videoId) {
      return `https://www.youtube.com/watch?v=${videoId}`;
    }

    // If we couldn't parse it, return the original URL
    return url;
  } catch (error) {
    // If URL parsing fails, return the original
    return url;
  }
}

export async function ensureDownloadDirectory(downloadPath) {
  await fs.ensureDir(downloadPath);
}

export function getDownloadPath(title, format = 'mp3') {
  const sanitized = sanitizeFilename(title);
  const downloadDir = getGoogleDriveMusicPath();
  return path.join(downloadDir, `${sanitized}.${format}`);
}

export function getDownloadDirectory() {
  return getGoogleDriveMusicPath();
}

export async function trimSilence(inputPath, outputPath = null, silenceThreshold = 10) {
  const ffmpegPath = path.join(process.cwd(), 'ffmpeg.exe');
  const finalOutputPath = outputPath || inputPath.replace(/(\.[^.]+)$/, '_trimmed$1');
  
  return new Promise((resolve, reject) => {
    console.log(`🔇 Trimming silence longer than ${silenceThreshold}s...`);
    
    const ffmpegArgs = [
      '-i', inputPath,
      '-af', `silenceremove=stop_periods=-1:stop_duration=${silenceThreshold}:stop_threshold=-50dB`,
      '-c:a', 'aac',
      '-y', // Overwrite output file
      finalOutputPath
    ];
    
    console.log(`Running: ${ffmpegPath} ${ffmpegArgs.join(' ')}`);
    const process = spawn(ffmpegPath, ffmpegArgs, { stdio: 'pipe' });
    
    let stderr = '';
    
    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Silence trimming completed!');
        resolve(finalOutputPath);
      } else {
        console.error('❌ Silence trimming failed:', stderr);
        reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
      }
    });
    
    process.on('error', (error) => {
      reject(new Error(`Failed to start FFmpeg: ${error.message}`));
    });
  });
}