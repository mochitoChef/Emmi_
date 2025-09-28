// Script to download Rhubarb binary at runtime for Railway
import { exec } from 'child_process';
import fs from 'fs';
import https from 'https';
import path from 'path';

const downloadFile = (url, filePath) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);

    https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 302 || response.statusCode === 301) {
        return downloadFile(response.headers.location, filePath).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });

      file.on('error', (err) => {
        fs.unlink(filePath, () => {}); // Delete partial file
        reject(err);
      });
    }).on('error', reject);
  });
};

const downloadRhubarb = async () => {
  const binDir = path.join(process.cwd(), 'bin');
  const rhubarbPath = path.join(binDir, 'rhubarb');

  // Check if Linux binary already exists
  if (fs.existsSync(rhubarbPath)) {
    console.log('Rhubarb binary already exists');
    return;
  }

  // Only download on Linux (Railway)
  if (process.platform !== 'linux') {
    console.log('Not on Linux, skipping Rhubarb download');
    return;
  }

  try {
    console.log('Downloading Rhubarb for Linux...');

    // Create bin directory if it doesn't exist
    if (!fs.existsSync(binDir)) {
      fs.mkdirSync(binDir, { recursive: true });
    }

    // Download using Node.js https module
    const tarPath = path.join(binDir, 'rhubarb-1.14.0-linux.tar.gz');
    await downloadFile('https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v1.14.0/rhubarb-1.14.0-linux.tar.gz', tarPath);

    // Extract and setup using tar (should be available in most containers)
    await new Promise((resolve, reject) => {
      exec(`
        cd ${binDir} && \
        tar -xzf rhubarb-1.14.0-linux.tar.gz && \
        mv rhubarb-1.14.0-linux/rhubarb . && \
        chmod +x rhubarb && \
        rm -rf rhubarb-1.14.0-linux rhubarb-1.14.0-linux.tar.gz
      `, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    });

    console.log('Rhubarb downloaded and installed successfully');
  } catch (error) {
    console.error('Failed to download Rhubarb:', error);
  }
};

export { downloadRhubarb };