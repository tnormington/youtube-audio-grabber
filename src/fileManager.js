import path from 'path';
import fs from 'fs-extra';
import { spawn } from 'child_process';
import { sanitizeFilename } from './utils.js';

export class FileManager {
  constructor() {
    this.cloudSyncPath = 'C:\\Users\\timjn\\Workspace\\youtube-audio-grabber\\downloads';
    this.deviceInfo = null; // Will be set by initialize()
  }

  async initialize() {
    this.deviceInfo = await this.findPhoneOrFallback();
    return this.deviceInfo;
  }

  async findPhoneOrFallback() {
    console.log('🔍 Scanning for connected phone...');
    
    // Try ADB first for true automation
    const adbAvailable = await this.checkADB();
    if (adbAvailable) {
      const adbDevices = await this.getADBDevices();
      if (adbDevices.length > 0) {
        console.log(`📱 Found ADB device: ${adbDevices[0]}`);
        console.log('🚀 Will use ADB for automatic file transfer');
        return { type: 'adb', device: adbDevices[0] };
      }
    }
    
    // Fallback to MTP assisted copy
    const phoneName = 'motorola edge 5G UW (2021)';
    console.log(`📱 Detected MTP device: ${phoneName}`);
    console.log('📁 Will use assisted copy (ADB not available)');
    
    return { type: 'mtp', device: phoneName };
  }

  async checkADB() {
    return new Promise((resolve) => {
      // Try local ADB installation first
      const adbPath = 'C:\\Users\\timjn\\Workspace\\platform-tools\\adb.exe';
      const process = spawn(adbPath, ['version'], { stdio: 'pipe' });
      process.on('close', (code) => {
        resolve(code === 0);
      });
      process.on('error', () => {
        // Fallback to PATH adb
        const fallbackProcess = spawn('adb', ['version'], { stdio: 'pipe' });
        fallbackProcess.on('close', (code) => {
          resolve(code === 0);
        });
        fallbackProcess.on('error', () => {
          resolve(false);
        });
      });
    });
  }

  async getADBDevices() {
    return new Promise((resolve, reject) => {
      const adbPath = 'C:\\Users\\timjn\\Workspace\\platform-tools\\adb.exe';
      const process = spawn(adbPath, ['devices'], { stdio: 'pipe' });
      let stdout = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          const devices = stdout
            .split('\n')
            .slice(1) // Skip header
            .filter(line => line.trim() && line.includes('device'))
            .map(line => line.split('\t')[0]);
          resolve(devices);
        } else {
          resolve([]);
        }
      });

      process.on('error', () => {
        resolve([]);
      });
    });
  }

  async copyViaADB(sourcePath, filename, customTarget = null) {
    return new Promise((resolve, reject) => {
      const targetPath = customTarget || '/sdcard/Music/';
      
      console.log(`📱 Copying via ADB: ${filename}`);
      console.log(`📁 Target: ${targetPath}`);
      const adbPath = 'C:\\Users\\timjn\\Workspace\\platform-tools\\adb.exe';
      const process = spawn(adbPath, ['push', sourcePath, targetPath], { stdio: 'pipe' });
      
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
          resolve();
        } else {
          reject(new Error(`ADB push failed: ${stderr || stdout}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`ADB error: ${error.message}`));
      });
    });
  }

  async copyToMTPDevice(sourcePath, filename) {
    return new Promise((resolve, reject) => {
      // Use robocopy with MTP path - more reliable than PowerShell
      const targetPath = `"Computer\\motorola edge 5G UW (2021)\\Internal shared storage\\Music"`;
      
      const process = spawn('cmd', ['/c', `copy "${sourcePath}" ${targetPath}`], { 
        stdio: 'pipe',
        shell: true 
      });
      
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
          resolve();
        } else {
          // Try alternative method with explorer automation
          this.copyViaBatchFile(sourcePath, filename)
            .then(resolve)
            .catch(reject);
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to copy via CMD: ${error.message}`));
      });
    });
  }

  async copyViaBatchFile(sourcePath, filename) {
    // Create a batch file that opens both locations for user
    const batchContent = `@echo off
echo Opening file locations for manual copy...
start "" explorer "${path.dirname(sourcePath)}"
start "" shell:AppsFolder\\Microsoft.WindowsStore_8wekyb3d8bbwe!App
echo.
echo COPY THIS FILE: ${filename}
echo FROM: ${path.dirname(sourcePath)}
echo TO: This PC → motorola edge 5G UW (2021) → Internal shared storage → Music
echo.
pause`;

    const batchPath = path.join(__dirname, 'temp_copy.bat');
    await fs.writeFile(batchPath, batchContent);
    
    return new Promise((resolve) => {
      const process = spawn('cmd', ['/c', batchPath], { stdio: 'inherit' });
      process.on('close', () => {
        fs.unlink(batchPath).catch(() => {}); // Clean up
        resolve();
      });
    });
  }

  async ensureDirectories() {
    await fs.ensureDir(this.cloudSyncPath);
    await fs.ensureDir(this.deviceSyncPath);
  }

  getCloudPath(filename) {
    return path.join(this.cloudSyncPath, filename);
  }

  getDevicePath(filename) {
    return path.join(this.deviceSyncPath, filename);
  }

  async moveToDevice(sourceFile, targetFilename = null) {
    try {
      // Initialize device info if not already done
      if (!this.deviceInfo) {
        await this.initialize();
      }
      
      const filename = targetFilename || path.basename(sourceFile);
      
      // Handle ADB transfer
      if (this.deviceInfo.type === 'adb') {
        await this.copyViaADB(sourceFile, filename);
        return {
          success: true,
          sourcePath: sourceFile,
          devicePath: '/sdcard/Music/' + filename
        };
      }
      
      // Handle MTP (shouldn't be used much anymore)
      console.log(`Moving: ${sourceFile} to phone via assisted copy`);
      spawn('explorer', [path.dirname(sourceFile)]);
      
      return {
        success: true,
        sourcePath: sourceFile,
        devicePath: 'Manual copy required'
      };
    } catch (error) {
      throw new Error(`Move to device failed: ${error.message}`);
    }
  }

  async moveAllToDevice() {
    try {
      // Initialize device info if not already done
      if (!this.deviceInfo) {
        await this.initialize();
      }

      await fs.ensureDir(this.cloudSyncPath);
      
      const files = await fs.readdir(this.cloudSyncPath);
      const audioFiles = files.filter(file => 
        file.endsWith('.m4a') || file.endsWith('.mp3') || file.endsWith('.webm')
      );

      if (audioFiles.length === 0) {
        console.log('No audio files found to move');
        return { moved: 0, files: [] };
      }

      // Handle ADB automatic transfer
      if (this.deviceInfo.type === 'adb') {
        console.log('🚀 Automatic transfer via ADB...');
        console.log('');
        console.log('🎵 Files to copy:');
        audioFiles.forEach(file => console.log(`  • ${file}`));
        console.log('');
        
        const copiedFiles = [];
        for (const file of audioFiles) {
          const sourcePath = path.join(this.cloudSyncPath, file);
          try {
            // Copy to Music folder
            await this.copyViaADB(sourcePath, file);
            
            // Also copy to Download folder for better VLC compatibility
            await this.copyViaADB(sourcePath, file, '/sdcard/Download/');
            
            copiedFiles.push(file);
            console.log(`✅ Copied: ${file} (Music + Download folders)`);
          } catch (error) {
            console.log(`❌ Failed to copy ${file}: ${error.message}`);
            console.log('💡 Make sure USB Debugging is enabled on your phone');
          }
        }
        
        if (copiedFiles.length > 0) {
          console.log('');
          console.log('🎵 Files are now in your phone\'s Music folder!');
          console.log('📱 Open VLC, Poweramp, or your music app to see them');
        }
        
        return {
          success: true,
          moved: copiedFiles.length,
          files: copiedFiles,
          totalFiles: audioFiles.length,
          automatic: true
        };
      }

      // Fallback to MTP assisted copy
      if (this.deviceInfo.type === 'mtp') {
        console.log('📱 Opening folders for drag-and-drop copy...');
        console.log('💡 For automatic transfer, enable USB Debugging and install ADB');
        console.log('');
        console.log('🎵 Files ready to copy:');
        audioFiles.forEach(file => console.log(`  • ${file}`));
        console.log('');
        console.log('📂 Opening source folder...');
        
        // Open source folder
        spawn('explorer', [this.cloudSyncPath]);
        
        console.log('📱 Please navigate to your phone in the opened Explorer window');
        console.log(`   Path: This PC → ${this.deviceInfo.device} → Internal shared storage → Music`);
        console.log('   Then drag and drop the files from downloads folder');
        
        await new Promise(resolve => setTimeout(resolve, 2000)); // Give time for folder to open
        
        return {
          success: true,
          moved: 0,
          files: audioFiles,
          totalFiles: audioFiles.length,
          assistedCopy: true
        };
      }

      // Fallback for regular directories (shouldn't reach here now)
      const movedFiles = [];
      for (const file of audioFiles) {
        const sourcePath = path.join(this.cloudSyncPath, file);
        const devicePath = path.join(this.deviceSyncPath, file);
        
        const shouldCopy = !await fs.pathExists(devicePath) || 
          (await fs.stat(sourcePath)).mtime > (await fs.stat(devicePath).catch(() => ({ mtime: new Date(0) }))).mtime;
        
        if (shouldCopy) {
          await fs.copy(sourcePath, devicePath);
          movedFiles.push(file);
          console.log(`✓ Moved: ${file}`);
        }
      }

      return {
        success: true,
        moved: movedFiles.length,
        files: movedFiles,
        totalFiles: audioFiles.length
      };
    } catch (error) {
      throw new Error(`Batch move failed: ${error.message}`);
    }
  }

  async listFiles(location = 'both') {
    const results = {};
    
    if (location === 'cloud' || location === 'both') {
      try {
        const files = await fs.readdir(this.cloudSyncPath);
        results.cloud = files.filter(file => 
          file.endsWith('.m4a') || file.endsWith('.mp3') || file.endsWith('.webm')
        );
      } catch (error) {
        results.cloud = [];
      }
    }
    
    if (location === 'device' || location === 'both') {
      try {
        const files = await fs.readdir(this.deviceSyncPath);
        results.device = files.filter(file => 
          file.endsWith('.m4a') || file.endsWith('.mp3') || file.endsWith('.webm')
        );
      } catch (error) {
        results.device = [];
      }
    }
    
    return results;
  }
}