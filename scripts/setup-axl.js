#!/usr/bin/env node
/**
 * scripts/setup-axl.js
 * Downloads and starts the AXL binary (Gensyn P2P node).
 * AXL needs NO account, NO API key — just the binary.
 * Run: node scripts/setup-axl.js
 */

import { execSync, spawn } from 'child_process';
import { existsSync, mkdirSync, chmodSync, writeFileSync } from 'fs';
import { createWriteStream } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BIN_DIR = path.join(__dirname, '..', 'bin');
const PORT = process.env.AXL_PORT || '9090';

// Detect platform
const platform = process.platform;
const arch = process.arch;
const isWindows = platform === 'win32';
const ext = isWindows ? '.exe' : '';

// AXL GitHub releases
const AXL_VERSION = 'latest';
const AXL_REPO = 'gensyn-ai/axl';
const AXL_BIN = path.join(BIN_DIR, `axl${ext}`);

function platformTarget() {
  if (platform === 'win32')   return 'axl-x86_64-pc-windows-msvc.exe';
  if (platform === 'darwin')  return arch === 'arm64' ? 'axl-aarch64-apple-darwin' : 'axl-x86_64-apple-darwin';
  return 'axl-x86_64-unknown-linux-gnu';
}

async function getLatestReleaseUrl() {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.github.com',
      path: `/repos/${AXL_REPO}/releases/latest`,
      headers: { 'User-Agent': 'agentverify-setup' },
    };
    https.get(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const release = JSON.parse(data);
          const target = platformTarget();
          const asset = release.assets?.find(a => a.name === target);
          if (asset) {
            console.log(`📦 Found AXL ${release.tag_name} for ${target}`);
            resolve(asset.browser_download_url);
          } else {
            console.log('Available assets:', release.assets?.map(a => a.name).join(', '));
            reject(new Error(`No binary found for ${target}. Check https://github.com/${AXL_REPO}/releases`));
          }
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    console.log(`⬇️  Downloading ${url}`);

    function follow(url) {
      https.get(url, { headers: { 'User-Agent': 'agentverify-setup' } }, res => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          return follow(res.headers.location);
        }
        const total = parseInt(res.headers['content-length'] || '0', 10);
        let downloaded = 0;
        const file = createWriteStream(dest);
        res.on('data', chunk => {
          downloaded += chunk.length;
          if (total) process.stdout.write(`\r   ${Math.round(downloaded/total*100)}%`);
        });
        res.pipe(file);
        file.on('finish', () => { file.close(); console.log('\n✅ Download complete'); resolve(); });
        file.on('error', reject);
      }).on('error', reject);
    }
    follow(url);
  });
}

async function main() {
  console.log('\n🚀 AXL Setup — Gensyn P2P Node');
  console.log('   No account, no API key needed.\n');

  mkdirSync(BIN_DIR, { recursive: true });

  if (existsSync(AXL_BIN)) {
    console.log(`✅ AXL binary already at ${AXL_BIN}`);
  } else {
    try {
      const url = await getLatestReleaseUrl();
      await downloadFile(url, AXL_BIN);
      if (!isWindows) chmodSync(AXL_BIN, 0o755);
      console.log(`✅ AXL saved to ${AXL_BIN}`);
    } catch (err) {
      console.error(`❌ Download failed: ${err.message}`);
      console.log(`\nManual install:`);
      console.log(`  1. Go to https://github.com/${AXL_REPO}/releases`);
      console.log(`  2. Download ${platformTarget()}`);
      console.log(`  3. Place it at ${AXL_BIN}`);
      if (!isWindows) console.log(`  4. Run: chmod +x ${AXL_BIN}`);
      process.exit(1);
    }
  }

  // Start AXL
  console.log(`\n🌐 Starting AXL on port ${PORT}...`);
  console.log(`   Mesh ID: ${process.env.AXL_MESH_ID || 'agentverify-hackathon-2024'}\n`);

  const axl = spawn(AXL_BIN, ['start', '--port', PORT], {
    stdio: 'inherit',
    env: { ...process.env },
  });

  axl.on('error', err => {
    console.error('❌ Failed to start AXL:', err.message);
    console.log('Try running manually:', AXL_BIN, 'start --port', PORT);
  });

  axl.on('close', code => {
    if (code !== 0) console.log(`AXL exited with code ${code}`);
  });

  process.on('SIGINT', () => { axl.kill(); process.exit(0); });
}

main().catch(e => { console.error(e.message); process.exit(1); });
