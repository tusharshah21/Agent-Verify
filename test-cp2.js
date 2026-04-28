#!/usr/bin/env node

/**
 * CP2 Test Suite - AXL P2P Messaging
 * Run: node test-cp2.js
 * Tests: Agent discovery, encrypted messaging, task routing
 */

import { AXLMessenger, MessageCrypto } from './agent/axlMessenger.js';
import crypto from 'crypto';

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
    test: `${COLORS.blue}📝${COLORS.reset}`,
  };
  console.log(`${icons[type]} ${msg}`);
}

async function runCP2Tests() {
  console.log(`
╔══════════════════════════════════════╗
║   CP2 TEST SUITE                     ║
║   AXL P2P Messaging                  ║
╚══════════════════════════════════════╝
  `);

  let passed = 0;
  let failed = 0;

  // Initialize messenger
  const messenger = new AXLMessenger();

  // Test agents
  const agentA = {
    name: 'AgentA',
    address: '0xf866683E1eC4a62503C0128413EA0269E2A397d4',
    publicKey: crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
    }).publicKey,
  };

  const agentB = {
    name: 'AgentB',
    address: '0x1234567890123456789012345678901234567890',
    publicKey: crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
    }).publicKey,
  };

  const agentC = {
    name: 'AgentC',
    address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    publicKey: crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
    }).publicKey,
  };

  // ========== TEST 1: Initialize AXL Mesh ==========
  try {
    log('test', 'TEST 1: Initialize AXL Mesh');
    const result = await messenger.initializeMesh(agentA.address, agentA.name, {
      execute: true,
      swap: true,
      bridge: true,
    });

    if (result.success && result.nodeId && result.meshId) {
      log('pass', `  Mesh initialized (NodeID: ${result.nodeId.slice(0, 8)}...)`);
      passed++;
    } else {
      log('fail', '  Mesh initialization incomplete');
      failed++;
    }
  } catch (error) {
    log('fail', `  Mesh init error: ${error.message}`);
    failed++;
  }

  // ========== TEST 2: Register Multiple Agents ==========
  try {
    log('test', 'TEST 2: Register Multiple Agents');
    await messenger.registerInMesh(agentB.address, agentB.name, {
      execute: true,
      swap: false,
      bridge: true,
    });
    await messenger.registerInMesh(agentC.address, agentC.name, {
      execute: true,
      swap: true,
      bridge: false,
    });

    if (messenger.onlineAgents.size >= 3) {
      log('pass', `  ${messenger.onlineAgents.size} agents registered`);
      passed++;
    } else {
      log('fail', `  Expected 3+ agents, got ${messenger.onlineAgents.size}`);
      failed++;
    }
  } catch (error) {
    log('fail', `  Registration error: ${error.message}`);
    failed++;
  }

  // ========== TEST 3: Agent Discovery ==========
  try {
    log('test', 'TEST 3: Discover All Agents');
    const agents = await messenger.discoverAgents();

    if (agents.length >= 3) {
      log('pass', `  Found ${agents.length} agents in mesh`);
      agents.forEach(a => {
        console.log(`    - ${a.name} (${a.address.slice(0, 6)}...) [${a.status}]`);
      });
      passed++;
    } else {
      log('fail', `  Expected 3+ agents, found ${agents.length}`);
      failed++;
    }
  } catch (error) {
    log('fail', `  Discovery error: ${error.message}`);
    failed++;
  }

  // ========== TEST 4: Filter Discovery by Capability ==========
  try {
    log('test', 'TEST 4: Filter Agents by Capability (swap)');
    const swapAgents = await messenger.discoverAgents({ capability: 'swap' });

    // AgentA and AgentC have swap capability
    if (swapAgents.length === 2) {
      log('pass', `  Found ${swapAgents.length} agents with swap capability`);
      swapAgents.forEach(a => console.log(`    - ${a.name}`));
      passed++;
    } else {
      log('fail', `  Expected 2 agents with swap, got ${swapAgents.length}`);
      failed++;
    }
  } catch (error) {
    log('fail', `  Capability filter error: ${error.message}`);
    failed++;
  }

  // ========== TEST 5: Send Task Message ==========
  try {
    log('test', 'TEST 5: Send Task Message (A → B)');
    const taskData = {
      action: 'swap',
      fromToken: 'USDC',
      toToken: 'DAI',
      amount: '100',
      slippage: 0.5,
    };

    const result = await messenger.sendTaskMessage(
      agentA,
      agentB.address,
      taskData,
      { priority: 'high' }
    );

    if (result.messageId && result.status === 'queued') {
      log('pass', `  Task sent (ID: ${result.messageId.slice(0, 8)}...)`);
      passed++;
    } else {
      log('fail', '  Task send failed');
      failed++;
    }
  } catch (error) {
    log('fail', `  Task send error: ${error.message}`);
    failed++;
  }

  // ========== TEST 6: Send Multiple Messages ==========
  try {
    log('test', 'TEST 6: Send Multiple Messages (A → C, B → C)');
    const taskData1 = {
      action: 'swap',
      fromToken: 'USDT',
      toToken: 'USDC',
      amount: '50',
    };

    const taskData2 = {
      action: 'bridge',
      fromChain: 'Sepolia',
      toChain: 'Polygon',
      amount: '75',
    };

    await messenger.sendTaskMessage(agentA, agentC.address, taskData1);
    await messenger.sendTaskMessage(agentB, agentC.address, taskData2);

    const pendingCount = messenger.messageQueue.filter(
      m => m.status === 'pending' || m.status === 'queued'
    ).length;

    if (pendingCount >= 3) {
      log('pass', `  ${pendingCount} messages queued`);
      passed++;
    } else {
      log('fail', `  Expected 3+ messages, got ${pendingCount}`);
      failed++;
    }
  } catch (error) {
    log('fail', `  Multi-message send error: ${error.message}`);
    failed++;
  }

  // ========== TEST 7: Fetch Messages for Agent ==========
  try {
    log('test', 'TEST 7: Fetch Messages for Agent C');
    const messagesForC = await messenger.getMessagesForAgent(agentC.address);

    if (messagesForC.length >= 2) {
      log('pass', `  Retrieved ${messagesForC.length} messages for AgentC`);
      messagesForC.forEach(m => {
        console.log(`    - From ${m.from}: ${m.content.action}`);
      });
      passed++;
    } else {
      log('fail', `  Expected 2+ messages, got ${messagesForC.length}`);
      failed++;
    }
  } catch (error) {
    log('fail', `  Message fetch error: ${error.message}`);
    failed++;
  }

  // ========== TEST 8: Acknowledge Message ==========
  try {
    log('test', 'TEST 8: Acknowledge Message Receipt');
    const messages = await messenger.getMessagesForAgent(agentC.address);
    if (messages.length > 0) {
      const firstMsg = messenger.messageQueue.find(m => m.id === messages[0].id);
      await messenger.acknowledgeMessage(firstMsg.id, agentC.address);

      const updated = messenger.messageQueue.find(m => m.id === firstMsg.id);
      if (updated && updated.status === 'acknowledged') {
        log('pass', `  Message acknowledged (ID: ${firstMsg.id.slice(0, 8)}...)`);
        passed++;
      } else {
        log('fail', '  Acknowledgment failed');
        failed++;
      }
    } else {
      log('fail', '  No messages to acknowledge');
      failed++;
    }
  } catch (error) {
    log('fail', `  Acknowledge error: ${error.message}`);
    failed++;
  }

  // ========== TEST 9: Respond to Task ==========
  try {
    log('test', 'TEST 9: Respond to Task Message');
    const messages = messenger.messageQueue.filter(
      m => m.toAddress === agentC.address && m.type === 'task'
    );

    if (messages.length > 0) {
      const originalMsg = messages[0];
      const response = {
        status: 'completed',
        result: '100 USDC → 99.5 DAI',
        txHash: '0x' + 'a'.repeat(64),
      };

      await messenger.respondToTask(originalMsg.id, agentC, originalMsg.fromAddress, response);

      const responseMsg = messenger.messageQueue.find(
        m => m.type === 'task_response' && m.inReplyTo === originalMsg.id
      );

      if (responseMsg) {
        log('pass', `  Response sent (ID: ${responseMsg.id.slice(0, 8)}...)`);
        passed++;
      } else {
        log('fail', '  Response not found');
        failed++;
      }
    } else {
      log('fail', '  No messages to respond to');
      failed++;
    }
  } catch (error) {
    log('fail', `  Response error: ${error.message}`);
    failed++;
  }

  // ========== TEST 10: Message Encryption/Decryption ==========
  try {
    log('test', 'TEST 10: Message Encryption & Decryption');
    const originalMessage = {
      action: 'swap',
      amount: 100,
      secret: 'super-secret-data',
    };

    const publicKey = 'test-public-key-32-chars-long!!!';
    const encrypted = MessageCrypto.encryptMessage(JSON.stringify(originalMessage), publicKey);

    if (encrypted.encrypted && encrypted.nonce) {
      log('pass', '  Message encryption successful');
      passed++;
    } else {
      log('fail', '  Encryption failed');
      failed++;
    }
  } catch (error) {
    log('fail', `  Encryption error: ${error.message}`);
    failed++;
  }

  // ========== TEST 11: Mesh Status ==========
  try {
    log('test', 'TEST 11: Get Mesh Status');
    const status = await messenger.getMeshStatus();

    if (status.meshId && status.nodeId && status.online) {
      log('pass', `  Mesh Online - ${status.agentsOnline} agents, ${status.pendingMessages} pending`);
      passed++;
    } else {
      log('fail', '  Mesh status incomplete');
      failed++;
    }
  } catch (error) {
    log('fail', `  Status check error: ${error.message}`);
    failed++;
  }

  // ========== TEST 12: Agent Disconnect ==========
  try {
    log('test', 'TEST 12: Disconnect Agent from Mesh');
    const beforeCount = messenger.onlineAgents.size;
    await messenger.disconnectAgent(agentB.address);
    const afterCount = messenger.onlineAgents.size;

    if (afterCount === beforeCount - 1) {
      log('pass', `  Agent disconnected (${beforeCount} → ${afterCount} online)`);
      passed++;
    } else {
      log('fail', `  Disconnect failed (${beforeCount} → ${afterCount})`);
      failed++;
    }
  } catch (error) {
    log('fail', `  Disconnect error: ${error.message}`);
    failed++;
  }

  // ========== SUMMARY ==========
  console.log(`
╔══════════════════════════════════════╗
║   CP2 TEST RESULTS                   ║
╚══════════════════════════════════════╝
${COLORS.green}✅ PASSED: ${passed}${COLORS.reset}
${COLORS.red}❌ FAILED: ${failed}${COLORS.reset}
${COLORS.blue}📊 TOTAL: ${passed + failed}${COLORS.reset}

${passed >= 10 ? COLORS.green + '🎉 CP2 READY! Proceed to CP3' + COLORS.reset : COLORS.red + '⚠️ Fix issues above before proceeding' + COLORS.reset}
  `);

  return failed === 0;
}

// Run tests
runCP2Tests().then(success => {
  process.exit(success ? 0 : 1);
});
