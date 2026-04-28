/**
 * CP3: KeeperHub Execution Layer Tests
 * Tests: Account registration, task scheduling, execution, status polling, retries
 * Run: npm test -- test-cp3.js
 */

import {
  registerKeeperAccount,
  scheduleExecution,
  executeOnchain,
  getExecutionStatus,
  getAgentTasks,
  retryTask,
  getAllKeeperAccounts,
  getKeeperAccount,
  getQueueStats,
  initializeKeeper
} from './agent/keeperExecutor.js';

const SEPOLIA_CONFIG = {
  WALLET_ADDRESS: '0xf866683E1eC4a62503C0128413EA0269E2A397d4',
  KEEPER_ADDRESS: '0xD3d4ee9fEB14c0f1d0B4DD0A45bFd10A3F6Ad95B'
};

// Test results tracker
let passCount = 0;
let failCount = 0;
const testResults = [];

/**
 * Test helper
 */
async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ TEST ${passCount + failCount + 1}: ${name}`);
    passCount++;
    testResults.push({ name, status: 'PASS' });
  } catch (error) {
    console.error(`❌ TEST ${passCount + failCount + 1}: ${name}`);
    console.error(`   Error: ${error.message}`);
    failCount++;
    testResults.push({ name, status: 'FAIL', error: error.message });
  }
}

/**
 * Assertion helper
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('\n🧪 CP3: KeeperHub Execution Layer Tests\n');

  // Initialize keeper
  initializeKeeper();

  // TEST 1: Register keeper account
  await test('Register keeper account', async () => {
    const result = await registerKeeperAccount(SEPOLIA_CONFIG.WALLET_ADDRESS);
    assert(result.success, 'Registration failed');
    assert(result.accountId, 'No accountId returned');
    assert(result.balance, 'No balance returned');
    assert(result.status === 'ACTIVE', 'Account not active');
  });

  // TEST 2: Prevent duplicate registration
  await test('Prevent duplicate account registration', async () => {
    const result = await registerKeeperAccount(SEPOLIA_CONFIG.WALLET_ADDRESS);
    assert(result.success, 'Duplicate registration failed');
    assert(result.status === 'ALREADY_REGISTERED', 'Should indicate already registered');
  });

  // TEST 3: Register second keeper account
  await test('Register second keeper account', async () => {
    const secondAddress = '0x1234567890123456789012345678901234567890';
    const result = await registerKeeperAccount(secondAddress);
    assert(result.success, 'Second registration failed');
    assert(result.accountId, 'No accountId for second account');
  });

  // TEST 4: Get keeper account details
  await test('Get keeper account details', async () => {
    const result = await getKeeperAccount(SEPOLIA_CONFIG.WALLET_ADDRESS);
    assert(result.success, 'Get account failed');
    assert(result.walletAddress === SEPOLIA_CONFIG.WALLET_ADDRESS, 'Wrong address');
    assert(result.accountId, 'No accountId');
    assert(result.balance === '5.0', 'Wrong balance');
  });

  // TEST 5: Get all keeper accounts
  await test('Get all keeper accounts', async () => {
    const result = await getAllKeeperAccounts();
    assert(result.success, 'Get accounts failed');
    assert(result.count >= 2, 'Should have at least 2 accounts');
    assert(Array.isArray(result.accounts), 'Accounts should be array');
  });

  // TEST 6: Schedule execution task
  let scheduledTaskId = null;
  await test('Schedule execution task', async () => {
    scheduledTaskId = 'task-' + Date.now();
    const result = await scheduleExecution(
      scheduledTaskId,
      SEPOLIA_CONFIG.WALLET_ADDRESS,
      'confirmTaskCompletion',
      {
        result: 'SUCCESS',
        gasLimit: 100000
      }
    );
    assert(result.success, 'Scheduling failed');
    assert(result.taskId === scheduledTaskId, 'Task ID mismatch');
    assert(result.status === 'QUEUED', 'Task should be QUEUED');
    assert(result.keeper, 'No keeper ID returned');
  });

  // TEST 7: Prevent duplicate task scheduling
  await test('Prevent duplicate task scheduling', async () => {
    const result = await scheduleExecution(
      scheduledTaskId,
      SEPOLIA_CONFIG.WALLET_ADDRESS,
      'confirmTaskCompletion',
      {}
    );
    assert(result.success, 'Duplicate scheduling should succeed (idempotent)');
    assert(result.status === 'QUEUED', 'Should remain QUEUED');
  });

  // TEST 8: Get execution status (QUEUED)
  await test('Get execution status (QUEUED)', async () => {
    const result = await getExecutionStatus(scheduledTaskId);
    assert(result.success, 'Get status failed');
    assert(result.taskId === scheduledTaskId, 'Task ID mismatch');
    assert(result.status === 'QUEUED', `Status should be QUEUED, got ${result.status}`);
    assert(result.progress === '10%', 'Progress should be 10%');
  });

  // TEST 9: Execute task onchain
  await test('Execute task onchain', async () => {
    const result = await executeOnchain(scheduledTaskId);
    assert(result.success === true || result.success === false, 'Result malformed');
    assert(result.taskId === scheduledTaskId, 'Task ID mismatch');
    assert(result.status, 'No status returned');
    assert(['COMPLETED', 'EXECUTING', 'CONFIRMING', 'FAILED'].includes(result.status), 'Invalid status');
  });

  // TEST 10: Get execution status (after execution)
  await test('Get execution status after execution', async () => {
    const result = await getExecutionStatus(scheduledTaskId);
    assert(result.success, 'Get status failed');
    assert(result.status, 'No status returned');
    assert(result.attempts >= 1, 'Should have at least 1 attempt');
  });

  // TEST 11: Schedule multiple tasks
  const taskIds = [];
  await test('Schedule multiple execution tasks', async () => {
    for (let i = 0; i < 3; i++) {
      const taskId = 'batch-task-' + Date.now() + '-' + i;
      const result = await scheduleExecution(
        taskId,
        SEPOLIA_CONFIG.WALLET_ADDRESS,
        'processPayment',
        { amount: (i + 1) * 100 }
      );
      assert(result.success, `Failed to schedule task ${i}`);
      taskIds.push(taskId);
    }
    assert(taskIds.length === 3, 'Should have 3 task IDs');
  });

  // TEST 12: Get agent tasks
  await test('Get all agent tasks', async () => {
    const result = await getAgentTasks(SEPOLIA_CONFIG.WALLET_ADDRESS);
    assert(result.success, 'Get tasks failed');
    assert(result.agentAddress === SEPOLIA_CONFIG.WALLET_ADDRESS, 'Wrong address');
    assert(result.count >= 4, `Should have at least 4 tasks, got ${result.count}`);
    assert(Array.isArray(result.tasks), 'Tasks should be array');
  });

  // TEST 13: Get queue statistics
  await test('Get queue statistics', async () => {
    const result = await getQueueStats();
    assert(result.success, 'Get stats failed');
    assert(result.stats, 'No stats returned');
    assert(typeof result.stats.total === 'number', 'Total should be number');
    assert(typeof result.stats.queued === 'number', 'Queued should be number');
    assert(typeof result.stats.completed === 'number', 'Completed should be number');
  });

  // TEST 14: Retry failed task
  let failableTaskId = null;
  await test('Schedule task for retry test', async () => {
    failableTaskId = 'retry-task-' + Date.now();
    const result = await scheduleExecution(
      failableTaskId,
      SEPOLIA_CONFIG.WALLET_ADDRESS,
      'testAction',
      {}
    );
    assert(result.success, 'Scheduling failed');
    assert(result.taskId === failableTaskId, 'Task ID mismatch');
  });

  // TEST 15: Retry task functionality
  await test('Retry failed task', async () => {
    // First attempt
    const exec1 = await executeOnchain(failableTaskId);
    
    // If it failed, retry it
    if (exec1.status === 'FAILED' || exec1.status === 'QUEUED') {
      const retryResult = await retryTask(failableTaskId);
      assert(retryResult.success, 'Retry failed');
      assert(retryResult.status === 'QUEUED', 'Should be re-queued');
    }
  });

  // TEST 16: Reject invalid address format
  await test('Reject invalid address format', async () => {
    try {
      await registerKeeperAccount('not-an-address');
      assert(false, 'Should have thrown error');
    } catch (error) {
      assert(error.message.includes('Invalid'), 'Wrong error message');
    }
  });

  // TEST 17: Handle missing keeper account
  await test('Handle missing keeper account', async () => {
    const unregisteredAddress = '0xABCDEF0123456789ABCDEF0123456789ABCDEF01';
    try {
      await scheduleExecution(
        'test-task',
        unregisteredAddress,
        'someAction',
        {}
      );
      assert(false, 'Should have thrown error');
    } catch (error) {
      assert(error.message.includes('No KeeperHub account'), 'Wrong error message');
    }
  });

  // TEST 18: Handle non-existent task
  await test('Handle non-existent task status', async () => {
    const result = await getExecutionStatus('nonexistent-task-id');
    assert(!result.success, 'Should indicate failure');
    assert(result.status === 'NOT_FOUND', 'Should be NOT_FOUND');
  });

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 CP3 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📈 Total:  ${passCount + failCount}`);
  console.log(`🎯 Score:  ${Math.round((passCount / (passCount + failCount)) * 100)}%`);
  console.log('='.repeat(60));

  // Return exit code
  process.exit(failCount > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
