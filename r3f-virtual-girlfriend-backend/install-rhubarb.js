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

  // Only build on Linux (Railway)
  if (process.platform !== 'linux') {
    console.log('Not on Linux, skipping Rhubarb build');
    return;
  }

  try {
    console.log('Building Rhubarb for Linux from source...');

    // Create bin directory if it doesn't exist
    if (!fs.existsSync(binDir)) {
      fs.mkdirSync(binDir, { recursive: true });
    }

    // Download source code and build (using version 1.12.0 which is known to work)
    const buildDir = path.join(binDir, 'rhubarb-build');
    const sourceZip = path.join(binDir, 'v1.12.0.zip');

    await downloadFile('https://github.com/DanielSWolf/rhubarb-lip-sync/archive/v1.12.0.zip', sourceZip);

    // Build Rhubarb from source
    await new Promise((resolve, reject) => {
      exec(`
        cd ${binDir} && \
        unzip v1.12.0.zip && \
        mv rhubarb-lip-sync-1.12.0 rhubarb-build && \
        cd rhubarb-build && \
        cmake -DCMAKE_BUILD_TYPE=Release . && \
        make rhubarb && \
        cp rhubarb/rhubarb ../rhubarb && \
        cp -r rhubarb/res ../res && \
        chmod +x ../rhubarb && \
        cd .. && \
        rm -rf rhubarb-build v1.12.0.zip
      `, (error, stdout, stderr) => {
        if (error) {
          console.error('Build stderr:', stderr);
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    });

    console.log('Rhubarb built and installed successfully');
  } catch (error) {
    console.error('Failed to build Rhubarb:', error);
  }
};

export { downloadRhubarb };