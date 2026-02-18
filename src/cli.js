#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { YouTubeAudioDownloader } from './downloader.js';
import { FileManager } from './fileManager.js';
import { trimSilence, sanitizeYouTubeUrl } from './utils.js';

const program = new Command();

program
  .name('youtube-audio')
  .description('Download audio from YouTube videos and manage device sync')
  .version('1.0.0');

// Download command
program
  .command('download')
  .description('Download audio from YouTube URL')
  .argument('<url>', 'YouTube video URL')
  .option('-f, --format <format>', 'Audio format (mp3, m4a, wav)', 'm4a')
  .option('-q, --quality <quality>', 'Audio quality (best, worst, or specific)', 'best')
  .option('--device', 'Also copy to device folder automatically')
  .action(async (url, options) => {
    try {
      console.log(chalk.blue('🎵 YouTube Audio Grabber - Download'));
      console.log(chalk.gray('─'.repeat(50)));

      url = sanitizeYouTubeUrl(url);

      if (!isValidYouTubeUrl(url)) {
        console.error(chalk.red('❌ Invalid YouTube URL'));
        process.exit(1);
      }

      const downloader = new YouTubeAudioDownloader();
      
      console.log(chalk.yellow('📋 Getting video information...'));
      const result = await downloader.downloadOnly(url, {
        format: options.format,
        quality: options.quality
      });

      console.log(chalk.green('✅ Download completed!'));
      console.log(chalk.cyan(`📁 File saved: ${result.filePath}`));
      console.log(chalk.cyan(`⏱️  Duration: ${formatDuration(result.duration)}`));

      if (options.device) {
        console.log(chalk.yellow('📱 Copying to device folder...'));
        const fileManager = new FileManager();
        const moveResult = await fileManager.moveToDevice(result.filePath);
        console.log(chalk.green(`✅ Copied to device: ${moveResult.devicePath}`));
      }
      
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// Grab command (download + move)
program
  .command('grab')
  .description('Download and move to device (full workflow)')
  .argument('<url>', 'YouTube video URL')
  .option('-f, --format <format>', 'Audio format (mp3, m4a, wav)', 'm4a')
  .option('-q, --quality <quality>', 'Audio quality (best, worst, or specific)', 'best')
  .option('--no-move', 'Skip moving to device')
  .action(async (url, options) => {
    try {
      console.log(chalk.blue('🎵 YouTube Audio Grabber - Full Workflow'));
      console.log(chalk.gray('─'.repeat(50)));

      url = sanitizeYouTubeUrl(url);

      if (!isValidYouTubeUrl(url)) {
        console.error(chalk.red('❌ Invalid YouTube URL'));
        process.exit(1);
      }

      // Step 1: Download
      console.log(chalk.yellow('📋 Getting video information...'));
      const downloader = new YouTubeAudioDownloader();
      const result = await downloader.downloadOnly(url, {
        format: options.format,
        quality: options.quality
      });

      console.log(chalk.green('✅ Download completed!'));
      console.log(chalk.cyan(`📁 File saved: ${result.filePath}`));
      console.log(chalk.cyan(`⏱️  Duration: ${formatDuration(result.duration)}`));

      let finalFilePath = result.filePath;

      // Step 2: Move to device (if enabled)
      if (options.move) {
        console.log(chalk.yellow('📱 Moving to device...'));
        const fileManager = new FileManager();
        const moveResult = await fileManager.moveToDevice(finalFilePath);
        console.log(chalk.green('✅ Moved to device!'));
        console.log(chalk.cyan(`📱 Device path: ${moveResult.devicePath}`));
      }

      console.log(chalk.green('🎉 Workflow completed successfully!'));
      
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// Move command
program
  .command('move')
  .description('Move downloaded files to device folder')
  .option('-a, --all', 'Move all files from cloud to device folder')
  .option('-f, --file <filename>', 'Move specific file to device folder')
  .action(async (options) => {
    try {
      console.log(chalk.blue('📱 YouTube Audio Grabber - Move to Device'));
      console.log(chalk.gray('─'.repeat(50)));

      const fileManager = new FileManager();

      if (options.all) {
        console.log(chalk.yellow('🔄 Moving all files to device...'));
        const result = await fileManager.moveAllToDevice();
        
        console.log(chalk.green(`✅ Moved ${result.moved} of ${result.totalFiles} files`));
        if (result.files.length > 0) {
          console.log(chalk.cyan('📁 Moved files:'));
          result.files.forEach(file => console.log(`  • ${file}`));
        }
      } else if (options.file) {
        console.log(chalk.yellow(`🔄 Moving ${options.file} to device...`));
        const cloudPath = fileManager.getCloudPath(options.file);
        const result = await fileManager.moveToDevice(cloudPath);
        console.log(chalk.green(`✅ Moved: ${result.devicePath}`));
      } else {
        console.log(chalk.yellow('📋 Use --all to move all files, or --file <filename> for specific file'));
        
        const files = await fileManager.listFiles();
        if (files.cloud && files.cloud.length > 0) {
          console.log(chalk.cyan('📁 Available files in cloud folder:'));
          files.cloud.forEach(file => console.log(`  • ${file}`));
        }
      }
      
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// List command
program
  .command('list')
  .description('List downloaded files')
  .option('-c, --cloud', 'List cloud folder files only')
  .option('-d, --device', 'List device folder files only')
  .action(async (options) => {
    try {
      const fileManager = new FileManager();
      const location = options.cloud ? 'cloud' : options.device ? 'device' : 'both';
      const files = await fileManager.listFiles(location);

      console.log(chalk.blue('📋 Downloaded Files'));
      console.log(chalk.gray('─'.repeat(30)));

      if (files.cloud) {
        console.log(chalk.cyan(`☁️  Cloud folder (${files.cloud.length} files):`));
        files.cloud.forEach(file => console.log(`  • ${file}`));
        console.log('');
      }

      if (files.device) {
        console.log(chalk.green(`📱 Device folder (${files.device.length} files):`));
        files.device.forEach(file => console.log(`  • ${file}`));
      }

    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// Edit metadata command
program
  .command('edit-metadata')
  .description('Edit metadata for an existing audio file')
  .argument('<file>', 'Path to the audio file')
  .action(async (file) => {
    try {
      console.log(chalk.blue('🎵 YouTube Audio Grabber - Edit Metadata'));
      console.log(chalk.gray('─'.repeat(50)));

      const fs = await import('fs-extra');
      if (!await fs.default.pathExists(file)) {
        console.error(chalk.red(`❌ File not found: ${file}`));
        process.exit(1);
      }

      const downloader = new YouTubeAudioDownloader();

      // Prompt user for new metadata
      const metadata = await downloader.metadataPrompter.promptForMetadata('');

      console.log(chalk.yellow('🎵 Updating metadata...'));
      await downloader.addMetadataToFile(file, metadata, metadata.title);

      console.log(chalk.green('✅ Metadata updated successfully!'));
      console.log(chalk.cyan(`📁 File: ${file}`));

    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// Legacy download command (for backwards compatibility)
program
  .argument('[url]', 'YouTube video URL (legacy mode)')
  .option('-f, --format <format>', 'Audio format (mp3, m4a, wav)', 'm4a')
  .option('-q, --quality <quality>', 'Audio quality (best, worst, or specific)', 'best')
  .action(async (url, options) => {
    if (!url) {
      program.help();
      return;
    }

    // Legacy mode - same as download command
    try {
      console.log(chalk.blue('🎵 YouTube Audio Grabber'));
      console.log(chalk.gray('─'.repeat(40)));

      url = sanitizeYouTubeUrl(url);

      if (!isValidYouTubeUrl(url)) {
        console.error(chalk.red('❌ Invalid YouTube URL'));
        process.exit(1);
      }

      const downloader = new YouTubeAudioDownloader();
      
      console.log(chalk.yellow('📋 Getting video information...'));
      const result = await downloader.downloadAudio(url, {
        format: options.format,
        quality: options.quality
      });

      console.log(chalk.green('✅ Download completed!'));
      console.log(chalk.cyan(`📁 File saved: ${result.outputPath}`));
      console.log(chalk.cyan(`⏱️  Duration: ${formatDuration(result.duration)}`));
      
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

function isValidYouTubeUrl(url) {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/;
  return youtubeRegex.test(url);
}

function formatDuration(seconds) {
  if (!seconds) return 'Unknown';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

program.parse();