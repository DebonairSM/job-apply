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
    name: 'Unit Tests',
    files: [
      'unit/mapper.test.ts',
      'unit/ranker.test.ts',
      'unit/resume-parsing.test.ts',
      'unit/profile-scoring.test.ts',
      'unit/category-separation.test.ts'
    ]
  },
  {
    name: 'Integration Tests',
    files: [
      'integration/rejection-learning.test.ts',
      'integration/rejection-learning-integration.test.ts',
      'integration/rejection-logic-fix.test.ts',
      'integration/dashboard-category-formatting.test.ts'
    ]
  },
  {
    name: 'End-to-End Tests',
    files: [
      'e2e/login.test.ts',
      'e2e/search.test.ts',
      'e2e/integration.test.ts'
    ]
  },
  {
    name: 'Learning System Tests',
    files: [
      'learning/selector-learning.test.ts',
      'learning/form-filling-learning.test.ts',
      'learning/selector-learning-integration.test.ts'
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
    console.log('   • Unit Tests: Pure logic and data transformations');
    console.log('   • Integration Tests: Multi-component interactions');
    console.log('   • E2E Tests: Full user workflows');
    console.log('   • Learning System: Selector and form learning');
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
