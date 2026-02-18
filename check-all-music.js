import { spawn } from 'child_process';

const adbPath = 'C:\\Users\\timjn\\Workspace\\platform-tools\\adb.exe';

console.log('📱 Checking all music files on your phone...\n');

const locations = ['/sdcard/Music/', '/storage/emulated/0/Music/'];

for (const location of locations) {
  console.log(`📁 Checking: ${location}`);
  
  const process = spawn(adbPath, ['shell', `ls -la "${location}"`], { stdio: 'pipe' });
  
  let output = '';
  process.stdout.on('data', (data) => {
    output += data.toString();
  });
  
  process.on('close', (code) => {
    if (output.trim()) {
      console.log(output);
    } else {
      console.log(`❌ No files in ${location}`);
    }
    console.log('');
  });
  
  // Wait for this command to finish
  await new Promise(resolve => {
    process.on('close', resolve);
  });
}