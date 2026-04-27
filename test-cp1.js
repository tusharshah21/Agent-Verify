#!/usr/bin/env node

/**
 * CP1 Validation Test Suite
 * Run: node test-cp1.js
 * Tests all ENS identity system functionality
 */

import { 
  registerAgentName, 
  resolveAgent, 
  setAgentCapabilities, 
  setAgentReputation,
  listAgents 
} from './agent/agentIdentity.js';

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

async function runCP1Tests() {
  console.log(`
╔══════════════════════════════════════╗
║   CP1 VALIDATION TEST SUITE          ║
║   ENS Identity System                ║
╚══════════════════════════════════════╝
  `);

  let passed = 0;
  let failed = 0;

  // ========== TEST 1: Register Agent A ==========
  try {
    log('info', 'TEST 1: Register Agent A');
    const mockPrivateKey = '0x' + '1'.repeat(64); // Dummy key for testing
    const resultA = await registerAgentName('agentA', '0x1234567890123456789012345678901234567890', mockPrivateKey);
    
    if (resultA.success && resultA.name === 'agentA.eth') {
      log('pass', '  Agent A registered: agentA.eth');
      passed++;
    } else {
      log('fail', '  Agent A registration failed');
      failed++;
    }
  } catch (error) {
    log('fail', `  Test 1 error: ${error.message}`);
    failed++;
  }

  // ========== TEST 2: Register Agent B ==========
  try {
    log('info', 'TEST 2: Register Agent B');
    const mockPrivateKey = '0x' + '2'.repeat(64);
    const resultB = await registerAgentName('agentB', '0x2345678901234567890123456789012345678901', mockPrivateKey);
    
    if (resultB.success && resultB.name === 'agentB.eth') {
      log('pass', '  Agent B registered: agentB.eth');
      passed++;
    } else {
      log('fail', '  Agent B registration failed');
      failed++;
    }
  } catch (error) {
    log('fail', `  Test 2 error: ${error.message}`);
    failed++;
  }

  // ========== TEST 3: Resolve Agent A ==========
  try {
    log('info', 'TEST 3: Resolve Agent A by ENS name');
    const resolved = await resolveAgent('agentA.eth');
    
    if (resolved && resolved.address && resolved.capabilities && resolved.reputation) {
      log('pass', `  Resolved agentA.eth -> ${resolved.address.slice(0, 6)}...`);
      log('pass', `  Capabilities: ${JSON.stringify(resolved.capabilities)}`);
      log('pass', `  Reputation: ${resolved.reputation}`);
      passed++;
    } else {
      log('fail', '  Resolution returned incomplete data');
      failed++;
    }
  } catch (error) {
    log('fail', `  Test 3 error: ${error.message}`);
    failed++;
  }

  // ========== TEST 4: Update Capabilities ==========
  try {
    log('info', 'TEST 4: Update Agent A capabilities');
    const newCaps = { execute: true, swap: true, bridge: false };
    await setAgentCapabilities('agentA.eth', newCaps);
    const updated = await resolveAgent('agentA.eth');
    
    if (updated.capabilities.swap === true) {
      log('pass', `  Capabilities updated: ${JSON.stringify(updated.capabilities)}`);
      passed++;
    } else {
      log('fail', '  Capabilities not updated');
      failed++;
    }
  } catch (error) {
    log('fail', `  Test 4 error: ${error.message}`);
    failed++;
  }

  // ========== TEST 5: Update Reputation ==========
  try {
    log('info', 'TEST 5: Update Agent A reputation');
    await setAgentReputation('agentA.eth', 150);
    const updated = await resolveAgent('agentA.eth');
    
    if (updated.reputation === 150) {
      log('pass', `  Reputation updated: ${updated.reputation}`);
      passed++;
    } else {
      log('fail', `  Reputation not updated (got ${updated.reputation})`);
      failed++;
    }
  } catch (error) {
    log('fail', `  Test 5 error: ${error.message}`);
    failed++;
  }

  // ========== TEST 6: List All Agents ==========
  try {
    log('info', 'TEST 6: List all registered agents');
    const agents = await listAgents();
    
    if (agents && agents.length >= 2) {
      log('pass', `  Found ${agents.length} agents in registry`);
      agents.forEach((a, i) => {
        console.log(`     ${i + 1}. ${a.name} (${a.address.slice(0, 6)}...) - Rep: ${a.reputation}`);
      });
      passed++;
    } else {
      log('fail', `  Expected ≥2 agents, got ${agents.length}`);
      failed++;
    }
  } catch (error) {
    log('fail', `  Test 6 error: ${error.message}`);
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

${passed === 6 ? COLORS.green + '🎉 ALL TESTS PASSED!' + COLORS.reset : COLORS.red + '⚠️ Some tests failed' + COLORS.reset}
  `);

  return failed === 0;
}

// Run tests
runCP1Tests().then(success => {
  process.exit(success ? 0 : 1);
});
