#!/usr/bin/env node

/**
 * Test Runner for Selector Learning System
 * 
 * This script runs all tests related to the selector learning system
 * and provides a comprehensive validation report.
 */

const { spawn } = require('child_process');
const { join } = require('path');

const testFiles = [
  'selector-learning.test.ts',
  'form-filling-learning.test.ts', 
  'selector-learning-integration.test.ts'
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

async function runAllTests() {
  console.log('🧪 Running Selector Learning System Tests\n');
  console.log('=' .repeat(60));

  const results = [];

  for (const testFile of testFiles) {
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

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.success).length;
  const total = results.length;

  console.log(`\nTotal Tests: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${total - passed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

  if (passed === total) {
    console.log('\n🎉 All tests passed! The selector learning system is working correctly.');
    console.log('\n✨ Key Features Validated:');
    console.log('   • Database schema with learning metrics');
    console.log('   • Success/failure tracking');
    console.log('   • Dynamic confidence calculation');
    console.log('   • Selector extraction and storage');
    console.log('   • Cached selector priority');
    console.log('   • Field type detection');
    console.log('   • Learning integration');
    console.log('   • Error handling');
    console.log('   • Performance benefits');
    console.log('   • End-to-end learning workflow');
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
