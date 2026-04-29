/**
 * CP4: Uniswap Settlement Tests
 * Tests: Swap quotes, execution, agent payments, settlement history
 * Run: node test-cp4.js
 */

import {
  getSwapQuote,
  executeSwap,
  executeAgentPayment,
  getSwapStatus,
  getSettlementHistory,
  getSettlementStats,
  completeSwap,
  initializeUniswap,
  getTokenBySymbol
} from './agent/uniswapBridge.js';

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
  console.log('\n🧪 CP4: UNISWAP SETTLEMENT LAYER TESTS\n');
  console.log('===============================================\n');

  // TEST 1: Initialize Uniswap
  await test('Initialize Uniswap bridge', async () => {
    const result = initializeUniswap();
    assert(result.success, 'Initialization failed');
    assert(result.config.router, 'Router address missing');
  });

  // TEST 2: Get token by symbol
  await test('Get token by symbol (USDC)', async () => {
    const token = getTokenBySymbol('USDC');
    assert(token, 'USDC token not found');
    assert(token.symbol === 'USDC', 'Symbol mismatch');
    assert(token.decimals === 6, 'Decimals mismatch');
  });

  // TEST 3: Get quote USDC -> DAI
  await test('Get swap quote (USDC → DAI)', async () => {
    const result = await getSwapQuote('USDC', 'DAI', '100');
    assert(result.success, `Quote failed: ${result.error}`);
    assert(result.quote.amountIn === '100', 'Input amount mismatch');
    assert(parseFloat(result.quote.amountOut) > 0, 'No output amount');
    assert(result.quote.amountOutMin < result.quote.amountOut, 'Min amount should be less');
  });

  // TEST 4: Get quote with slippage
  await test('Get quote with custom slippage (0.5%)', async () => {
    const result = await getSwapQuote('USDC', 'DAI', '100', 0.5);
    assert(result.success, 'Quote failed');
    assert(parseFloat(result.quote.slippage) === 0.5, 'Slippage not applied');
  });

  // TEST 5: Get quote WETH -> USDC (larger spread)
  await test('Get quote (WETH → USDC)', async () => {
    const result = await getSwapQuote('WETH', 'USDC', '1');
    assert(result.success, 'WETH/USDC quote failed');
    assert(parseFloat(result.quote.amountOut) > 1000, 'Rate seems too low');
  });

  // TEST 6: Get quote LINK -> DAI
  await test('Get quote (LINK → DAI)', async () => {
    const result = await getSwapQuote('LINK', 'DAI', '10');
    assert(result.success, 'LINK/DAI quote failed');
    assert(parseFloat(result.quote.amountOut) > 100, 'LINK rate mismatch');
  });

  // TEST 7: Invalid token should fail
  await test('Reject invalid token', async () => {
    const result = await getSwapQuote('INVALID', 'USDC', '100');
    assert(!result.success, 'Should fail on invalid token');
    assert(result.error.includes('Unsupported'), 'Error message mismatch');
  });

  // TEST 8: Same token should fail
  await test('Reject same token swap', async () => {
    const result = await getSwapQuote('USDC', 'USDC', '100');
    assert(!result.success, 'Should fail on same token');
    assert(result.error.includes('itself'), 'Error message mismatch');
  });

  // TEST 9: Zero amount should fail
  await test('Reject zero amount', async () => {
    const result = await getSwapQuote('USDC', 'DAI', '0');
    assert(!result.success, 'Should fail on zero amount');
  });

  // TEST 10: Excessive slippage should fail
  await test('Reject excessive slippage (> 2%)', async () => {
    const result = await getSwapQuote('USDC', 'DAI', '100', 3);
    assert(!result.success, 'Should reject excessive slippage');
  });

  // TEST 11: Execute swap
  await test('Execute USDC → DAI swap', async () => {
    const recipientAddr = '0xf866683E1eC4a62503C0128413EA0269E2A397d4';
    const result = await executeSwap('USDC', 'DAI', '100', recipientAddr);
    assert(result.success, `Swap failed: ${result.error}`);
    assert(result.swapId, 'No swap ID returned');
    assert(result.status === 'EXECUTING', 'Status not EXECUTING');
    assert(result.txHash, 'No transaction hash');
  });

  // TEST 12: Execute swap and check status
  await test('Get swap status after execution', async () => {
    const recipientAddr = '0xf866683E1eC4a62503C0128413EA0269E2A397d4';
    const executeResult = await executeSwap('USDC', 'DAI', '50', recipientAddr);
    assert(executeResult.success, 'Swap execution failed');
    
    const statusResult = getSwapStatus(executeResult.swapId);
    assert(statusResult.success, 'Status check failed');
    assert(statusResult.swapId === executeResult.swapId, 'Swap ID mismatch');
    assert(statusResult.status === 'EXECUTING', 'Status mismatch');
  });

  // TEST 13: Execute agent payment
  await test('Execute agent payment (USDC)', async () => {
    const fromAgent = '0xf866683E1eC4a62503C0128413EA0269E2A397d4';
    const toAgent = '0x1234567890123456789012345678901234567890';
    
    const result = await executeAgentPayment(fromAgent, toAgent, 'USDC', '100');
    assert(result.success, `Payment failed: ${result.error}`);
    assert(result.paymentId, 'No payment ID');
    assert(result.status === 'EXECUTING', 'Status not EXECUTING');
  });

  // TEST 14: Execute agent payment with swap
  await test('Execute agent payment with token swap', async () => {
    const fromAgent = '0xf866683E1eC4a62503C0128413EA0269E2A397d4';
    const toAgent = '0x1234567890123456789012345678901234567890';
    
    const result = await executeAgentPayment(fromAgent, toAgent, 'USDC', '100', 'DAI');
    assert(result.success, `Payment with swap failed: ${result.error}`);
    assert(result.paymentId, 'No payment ID');
    assert(result.finalAmount, 'No final amount');
  });

  // TEST 15: Reject same agent payment
  await test('Reject payment from agent to itself', async () => {
    const agent = '0xf866683E1eC4a62503C0128413EA0269E2A397d4';
    const result = await executeAgentPayment(agent, agent, 'USDC', '100');
    assert(!result.success, 'Should reject same-agent payment');
  });

  // TEST 16: Get settlement history
  await test('Get settlement history', async () => {
    const result = getSettlementHistory(10, 0);
    assert(result.success, 'History fetch failed');
    assert(typeof result.count === 'number', 'Count missing');
    assert(typeof result.total === 'number', 'Total missing');
    assert(Array.isArray(result.settlements), 'Settlements not array');
  });

  // TEST 17: Get settlement statistics
  await test('Get settlement statistics', async () => {
    const result = getSettlementStats();
    assert(result.success, 'Stats fetch failed');
    assert(typeof result.totalSwaps === 'number', 'Total swaps missing');
    assert(typeof result.successRate === 'string' || typeof result.successRate === 'number', 'Success rate missing');
    assert(typeof result.totalVolume === 'string', 'Total volume missing');
  });

  // TEST 18: Complete swap
  await test('Complete swap after confirmation', async () => {
    const recipientAddr = '0xf866683E1eC4a62503C0128413EA0269E2A397d4';
    const executeResult = await executeSwap('USDC', 'DAI', '75', recipientAddr);
    assert(executeResult.success, 'Initial swap failed');
    
    const completeResult = completeSwap(
      executeResult.swapId,
      '0xabcdef123456',
      '{"status":"success"}'
    );
    assert(completeResult.success, 'Completion failed');
  });

  // TEST 19: Status after completion
  await test('Verify swap status after completion', async () => {
    const recipientAddr = '0xf866683E1eC4a62503C0128413EA0269E2A397d4';
    const executeResult = await executeSwap('USDC', 'DAI', '25', recipientAddr);
    
    const completionResult = completeSwap(
      executeResult.swapId,
      '0xabc123',
      '{}'
    );
    assert(completionResult.success, 'Completion failed');
    
    const statusResult = getSwapStatus(executeResult.swapId);
    assert(statusResult.status === 'COMPLETED', 'Status should be COMPLETED');
  });

  // TEST 20: Non-existent swap should fail
  await test('Handle non-existent swap', async () => {
    const result = getSwapStatus('swap-nonexistent-12345');
    assert(!result.success, 'Should fail for non-existent swap');
  });

  console.log('\n===============================================');
  console.log(`\n✅ PASSED: ${passCount}/20`);
  console.log(`❌ FAILED: ${failCount}/20`);
  console.log(`\n📊 Total Tests: ${passCount + failCount}\n`);

  if (failCount === 0) {
    console.log('🎉 ALL TESTS PASSED! CP4 is ready.\n');
  } else {
    console.log(`⚠️  ${failCount} test(s) failed. Review errors above.\n`);
  }
}

// Run tests
runTests().catch(console.error);
