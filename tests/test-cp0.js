#!/usr/bin/env node

/**
 * CP0 Validation Tests
 * Run: node test-cp0.js
 * Tests all Sepolia connections and environment setup
 */

import { ethers } from 'ethers';
import * as fs from 'fs/promises';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: '.env.local' });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(type, msg) {
  const icons = {
    pass: `${COLORS.green}✅${COLORS.reset}`,
    fail: `${COLORS.red}❌${COLORS.reset}`,
    info: `${COLORS.blue}ℹ️${COLORS.reset}`,
    warn: `${COLORS.yellow}⚠️${COLORS.reset}`,
  };
  console.log(`${icons[type]} ${msg}`);
}

async function runCP0Tests() {
  console.log(`
╔══════════════════════════════════════╗
║   CP0 VALIDATION TEST SUITE          ║
║   Environment & Infrastructure       ║
╚══════════════════════════════════════╝
  `);

  let passed = 0;
  let failed = 0;

  // ========== TEST 1: Environment Variables ==========
  try {
    log('info', 'TEST 1: Check environment variables');
    
    const required = [
      'NEXT_PUBLIC_SEPOLIA_RPC',
      'SEPOLIA_PRIVATE_KEY',
      'SEPOLIA_PUBLIC_KEY',
    ];

    const missing = required.filter(key => !process.env[key]);

    if (missing.length === 0) {
      log('pass', '  All required env vars set');
      passed++;
    } else {
      log('fail', `  Missing: ${missing.join(', ')}`);
      failed++;
    }
  } catch (error) {
    log('fail', `  Test 1 error: ${error.message}`);
    failed++;
  }

  // ========== TEST 2: Sepolia RPC Connection ==========
  try {
    log('info', 'TEST 2: Connect to Sepolia RPC');
    const rpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC;
    
    if (!rpcUrl) {
      log('fail', '  RPC URL not set');
      failed++;
    } else {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const blockNumber = await provider.getBlockNumber();
      log('pass', `  ✅ Connected to Sepolia. Block: ${blockNumber}`);
      passed++;
    }
  } catch (error) {
    log('fail', `  RPC connection failed: ${error.message}`);
    failed++;
  }

  // ========== TEST 3: Wallet Validation ==========
  try {
    log('info', 'TEST 3: Validate wallet address');
    const address = process.env.SEPOLIA_PUBLIC_KEY;
    
    if (!ethers.isAddress(address)) {
      log('fail', `  Invalid address format: ${address}`);
      failed++;
    } else {
      log('pass', `  Valid address: ${address}`);
      passed++;
    }
  } catch (error) {
    log('fail', `  Wallet validation failed: ${error.message}`);
    failed++;
  }

  // ========== TEST 4: Wallet Balance ==========
  try {
    log('info', 'TEST 4: Check wallet balance');
    const rpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC;
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const address = process.env.SEPOLIA_PUBLIC_KEY;

    const balance = await provider.getBalance(address);
    const balanceInEth = ethers.formatEther(balance);

    if (parseFloat(balanceInEth) >= 0.1) {
      log('pass', `  Balance: ${balanceInEth} ETH ✅`);
      passed++;
    } else if (parseFloat(balanceInEth) > 0) {
      log('warn', `  Balance: ${balanceInEth} ETH (low, need ≥0.5 for full CP0-CP6)`);
      passed++;
    } else {
      log('fail', `  Balance: 0 ETH (need Sepolia ETH!)`);
      failed++;
    }
  } catch (error) {
    log('fail', `  Balance check failed: ${error.message}`);
    failed++;
  }

  // ========== TEST 5: Private Key Validation ==========
  try {
    log('info', 'TEST 5: Validate private key');
    const privateKey = process.env.SEPOLIA_PRIVATE_KEY;

    if (!privateKey) {
      log('fail', '  Private key not set');
      failed++;
    } else if (privateKey.length !== 64) {
      log('fail', `  Invalid private key length (got ${privateKey.length}, need 64)`);
      failed++;
    } else {
      const wallet = new ethers.Wallet(privateKey);
      log('pass', `  Valid private key (derives to ${wallet.address.slice(0, 6)}...)`);
      passed++;
    }
  } catch (error) {
    log('fail', `  Private key validation failed: ${error.message}`);
    failed++;
  }

  // ========== TEST 6: Signer Setup ==========
  try {
    log('info', 'TEST 6: Set up signer with RPC');
    const rpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC;
    const privateKey = process.env.SEPOLIA_PRIVATE_KEY;

    if (!rpcUrl || !privateKey) {
      log('fail', '  RPC or private key missing');
      failed++;
    } else {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const signer = new ethers.Wallet(privateKey, provider);
      const nonce = await provider.getTransactionCount(signer.address);
      log('pass', `  Signer ready (nonce: ${nonce})`);
      passed++;
    }
  } catch (error) {
    log('fail', `  Signer setup failed: ${error.message}`);
    failed++;
  }

  // ========== TEST 7: Config File Exists ==========
  try {
    log('info', 'TEST 7: Check config/sepolia.js');
    const configPath = path.join(__dirname, 'config', 'sepolia.js');
    await fs.access(configPath);
    log('pass', '  config/sepolia.js exists');
    passed++;
  } catch (error) {
    log('fail', '  config/sepolia.js not found');
    failed++;
  }

  // ========== TEST 8: ENS Configuration ==========
  try {
    log('info', 'TEST 8: Check ENS configuration');
    const registrarAddress = process.env.ENS_REGISTRAR_ADDRESS;
    const resolverAddress = process.env.ENS_RESOLVER_ADDRESS;

    if (ethers.isAddress(registrarAddress) && ethers.isAddress(resolverAddress)) {
      log('pass', '  ENS addresses configured');
      passed++;
    } else {
      log('fail', '  Invalid ENS addresses');
      failed++;
    }
  } catch (error) {
    log('fail', `  ENS config check failed: ${error.message}`);
    failed++;
  }

  // ========== TEST 9: Network ID Check ==========
  try {
    log('info', 'TEST 9: Verify network is Sepolia');
    const rpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC;
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const network = await provider.getNetwork();

    if (network.chainId === 11155111n) {
      log('pass', `  ✅ Correct network: Sepolia (chainId: ${network.chainId})`);
      passed++;
    } else {
      log('fail', `  Wrong network! Got chainId: ${network.chainId}, expected: 11155111`);
      failed++;
    }
  } catch (error) {
    log('fail', `  Network check failed: ${error.message}`);
    failed++;
  }

  // ========== TEST 10: Agent Registry File ==========
  try {
    log('info', 'TEST 10: Check agent registry');
    const registryPath = path.join(__dirname, 'agent', 'registry.json');
    const data = await fs.readFile(registryPath, 'utf-8');
    const registry = JSON.parse(data);
    
    if (registry && registry.agents !== undefined) {
      log('pass', `  Agent registry found (${registry.agents.length} agents)`);
      passed++;
    } else {
      log('fail', '  Invalid registry format');
      failed++;
    }
  } catch (error) {
    log('fail', `  Registry check failed: ${error.message}`);
    failed++;
  }

  // ========== SUMMARY ==========
  console.log(`
╔══════════════════════════════════════╗
║   TEST RESULTS                       ║
╚══════════════════════════════════════╝
${COLORS.green}✅ PASSED: ${passed}${COLORS.reset}
${COLORS.red}❌ FAILED: ${failed}${COLORS.reset}
${COLORS.blue}📊 TOTAL: ${passed + failed}${COLORS.reset}

${passed >= 8 ? COLORS.green + '🎉 CP0 READY! Proceed to CP1' + COLORS.reset : COLORS.red + '⚠️ Fix issues above before proceeding' + COLORS.reset}
  `);

  return failed === 0;
}

// Run tests
runCP0Tests().then(success => {
  process.exit(success ? 0 : 1);
});
