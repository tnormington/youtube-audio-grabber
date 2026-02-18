import { spawn } from 'child_process';

const adbPath = 'C:\\Users\\timjn\\Workspace\\platform-tools\\adb.exe';

console.log('📱 Checking file locations on your phone...\n');

// Check multiple locations
const locations = [
  '/sdcard/Music/',
  '/sdcard/Download/', 
  '/sdcard/',
  '/storage/emulated/0/Music/',
  '/storage/emulated/0/Download/'
];

for (const location of locations) {
  console.log(`📁 Checking: ${location}`);
  
  const process = spawn(adbPath, ['shell', `ls -la "${location}" | grep -i billy`], { stdio: 'pipe' });
  
  let output = '';
  process.stdout.on('data', (data) => {
    output += data.toString();
  });
  
  process.on('close', (code) => {
    if (output.trim()) {
      console.log(`✅ Found files in ${location}:`);
      console.log(output);
    } else {
      console.log(`❌ No Billy Strings file in ${location}`);
    }
    console.log('');
  });
  
  // Wait for this command to finish
  await new Promise(resolve => {
    process.on('close', resolve);
  });
}