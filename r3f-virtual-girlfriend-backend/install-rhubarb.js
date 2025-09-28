// Script to download Rhubarb binary at runtime for Railway
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

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

    // Download and extract
    await new Promise((resolve, reject) => {
      exec(`
        cd ${binDir} && \
        wget -q https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v1.14.0/rhubarb-1.14.0-linux.tar.gz && \
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