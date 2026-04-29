#!/usr/bin/env node

/**
 * Quick test runner helper script
 * Located in root for convenience
 * All actual tests are in tests/ folder
 * 
 * Usage:
 *   node run-tests.js          - Run latest checkpoint test (CP4)
 *   node run-tests.js all      - Run all checkpoint tests
 *   node run-tests.js cp0      - Run specific checkpoint
 *   node run-tests.js cp1 cp3  - Run multiple specific checkpoints
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Parse command line arguments
const args = process.argv.slice(2);

// Determine which tests to run
let testsToRun = [];

if (args.length === 0) {
  // Default: run latest (CP4)
  testsToRun = ['cp4'];
} else if (args[0] === 'all') {
  // Run all tests in sequence
  testsToRun = ['cp0', 'cp1', 'cp2', 'cp3', 'cp4'];
} else {
  // Run specific tests
  testsToRun = args.map(arg => {
    // Handle both 'cp0' and '0' formats
    return arg.startsWith('cp') ? arg : `cp${arg}`;
  });
}

// Filter to valid tests
testsToRun = testsToRun.filter(t => {
  const cpNum = parseInt(t.replace('cp', ''));
  return cpNum >= 0 && cpNum <= 4;
});

if (testsToRun.length === 0) {
  console.error('❌ No valid tests specified. Use cp0-cp4 or "all"');
  process.exit(1);
}

/**
 * Run a single test file
 */
function runTest(testName) {
  return new Promise((resolve, reject) => {
    const testPath = path.join(__dirname, 'tests', `test-${testName}.js`);
    console.log(`\n📋 Running ${testName.toUpperCase()}...\n`);

    const child = spawn('node', [testPath], {
      stdio: 'inherit',
      cwd: __dirname
    });

    child.on('exit', code => {
      if (code === 0 || code === 1) {
        // Code 1 is acceptable for tests (they exit 1 on failure but still run)
        resolve(code);
      } else {
        reject(new Error(`Test process exited with code ${code}`));
      }
    });

    child.on('error', reject);
  });
}

/**
 * Run tests sequentially
 */
async function runAllTests() {
  let allPassed = true;

  for (const testName of testsToRun) {
    try {
      const exitCode = await runTest(testName);
      if (exitCode !== 0) {
        allPassed = false;
      }
    } catch (error) {
      console.error(`\n❌ Error running ${testName}:`, error.message);
      allPassed = false;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  if (allPassed) {
    console.log('✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Check output above.');
    process.exit(1);
  }
}

// Start execution
runAllTests().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
