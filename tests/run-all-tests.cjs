#!/usr/bin/env node

/**
 * Main Test Runner for Job Apply System
 * 
 * This script runs all test suites including the selector learning system tests.
 */

const { spawn } = require('child_process');
const { join } = require('path');

const testSuites = [
  {
    name: 'Core System Tests',
    files: [
      'integration.test.ts',
      'login.test.ts', 
      'mapper.test.ts',
      'ranker.test.ts',
      'search.test.ts'
    ]
  },
  {
    name: 'Selector Learning System Tests',
    files: [
      'learning-system/selector-learning.test.ts',
      'learning-system/form-filling-learning.test.ts',
      'learning-system/selector-learning-integration.test.ts'
    ]
  }
];

async function runTest(testFile) {
  return new Promise((resolve) => {
    const testPath = join(__dirname, testFile);
    const child = spawn('npx', ['tsx', '--test', testPath], {
      stdio: 'pipe',
      shell: true
    });

    let output = '';
    let errorOutput = '';

    if (child.stdout) {
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
    }

    child.on('close', (code) => {
      resolve({
        success: code === 0,
        output: output + errorOutput
      });
    });
  });
}

async function runTestSuite(suite) {
  console.log(`\n🧪 Running ${suite.name}`);
  console.log('=' .repeat(60));

  const results = [];

  for (const testFile of suite.files) {
    console.log(`\n📋 Running ${testFile}...`);
    console.log('-'.repeat(40));
    
    const result = await runTest(testFile);
    results.push({ file: testFile, ...result });
    
    if (result.success) {
      console.log(`✅ ${testFile} - PASSED`);
    } else {
      console.log(`❌ ${testFile} - FAILED`);
      console.log(result.output);
    }
  }

  return results;
}

async function runAllTests() {
  console.log('🚀 Running All Job Apply System Tests\n');
  console.log('=' .repeat(60));

  const allResults = [];

  for (const suite of testSuites) {
    const suiteResults = await runTestSuite(suite);
    allResults.push(...suiteResults);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 OVERALL TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = allResults.filter(r => r.success).length;
  const total = allResults.length;

  console.log(`\nTotal Tests: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${total - passed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

  if (passed === total) {
    console.log('\n🎉 All tests passed! The job apply system is working correctly.');
    console.log('\n✨ Test Coverage:');
    console.log('   • Core system functionality');
    console.log('   • Login and authentication');
    console.log('   • Job search and mapping');
    console.log('   • Selector learning system');
    console.log('   • Form filling integration');
    console.log('   • End-to-end workflows');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the output above.');
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests };
