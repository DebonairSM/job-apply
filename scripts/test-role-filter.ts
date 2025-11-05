#!/usr/bin/env node
import { applyFilters } from '../src/ai/rejection-filters.js';
import { JobInput } from '../src/ai/ranker.js';

// Test cases for role type filter
const testJobs: Array<{ job: JobInput; shouldBlock: boolean; expectedReason?: string }> = [
  // Should be BLOCKED
  {
    job: { title: 'Principal DevOps Engineer', company: 'Test Co', description: 'DevOps role' },
    shouldBlock: true,
    expectedReason: 'DevOps/Infrastructure'
  },
  {
    job: { title: 'Senior Site Reliability Engineer', company: 'Test Co', description: 'SRE role' },
    shouldBlock: true,
    expectedReason: 'DevOps/Infrastructure'
  },
  {
    job: { title: 'QA Engineer', company: 'Test Co', description: 'QA role' },
    shouldBlock: true,
    expectedReason: 'QA/Test'
  },
  {
    job: { title: 'Software Development Engineer in Test (SDET)', company: 'Test Co', description: 'SDET role' },
    shouldBlock: true,
    expectedReason: 'QA/Test'
  },
  {
    job: { title: 'Technical Program Manager', company: 'Test Co', description: 'TPM role' },
    shouldBlock: true,
    expectedReason: 'Project/Program Management'
  },
  {
    job: { title: 'Data Engineer', company: 'Test Co', description: 'Data role' },
    shouldBlock: true,
    expectedReason: 'Data/Analytics'
  },
  {
    job: { title: 'Machine Learning Engineer', company: 'Test Co', description: 'ML role' },
    shouldBlock: true,
    expectedReason: 'Data/Analytics'
  },
  {
    job: { title: 'Security Engineer', company: 'Test Co', description: 'Security role' },
    shouldBlock: true,
    expectedReason: 'Security'
  },
  
  // Should PASS THROUGH
  {
    job: { title: 'Senior Software Engineer', company: 'Test Co', description: 'Software dev role' },
    shouldBlock: false
  },
  {
    job: { title: 'Senior .NET Developer', company: 'Test Co', description: '.NET dev role' },
    shouldBlock: false
  },
  {
    job: { title: 'Principal Software Engineer', company: 'Test Co', description: 'Software dev role' },
    shouldBlock: false
  },
  {
    job: { title: 'Backend Engineer', company: 'Test Co', description: 'Backend dev role' },
    shouldBlock: false
  },
  {
    job: { title: 'Full Stack Developer', company: 'Test Co', description: 'Full stack role' },
    shouldBlock: false
  },
  {
    job: { title: 'Application Developer', company: 'Test Co', description: 'App dev role' },
    shouldBlock: false
  }
];

console.log('🧪 Testing Role Type Filter\n');

let passed = 0;
let failed = 0;

for (const { job, shouldBlock, expectedReason } of testJobs) {
  const result = applyFilters(job);
  const blocked = result.blocked;
  const success = blocked === shouldBlock;
  
  if (success) {
    passed++;
    console.log(`✅ PASS: "${job.title}"`);
    if (blocked && expectedReason) {
      const hasExpectedReason = result.reason?.includes(expectedReason);
      if (hasExpectedReason) {
        console.log(`   Reason: ${result.reason}`);
      } else {
        console.log(`   ⚠️  Expected reason to include "${expectedReason}", got: ${result.reason}`);
      }
    }
  } else {
    failed++;
    console.log(`❌ FAIL: "${job.title}"`);
    console.log(`   Expected: ${shouldBlock ? 'BLOCKED' : 'PASS'}, Got: ${blocked ? 'BLOCKED' : 'PASS'}`);
    if (result.reason) {
      console.log(`   Reason: ${result.reason}`);
    }
  }
}

console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed out of ${testJobs.length} tests`);

if (failed > 0) {
  process.exit(1);
}

