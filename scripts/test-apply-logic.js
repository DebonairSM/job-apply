import { getJobsByStatus } from '../src/lib/db.js';

console.log('Testing apply command job retrieval logic...\n');

try {
  // Test 1: Get all queued jobs
  console.log('Test 1: getJobsByStatus("queued")');
  const allQueued = getJobsByStatus('queued');
  console.log(`   Result: ${allQueued.length} jobs`);
  console.log(`   Easy Apply: ${allQueued.filter(j => j.easy_apply).length}`);
  console.log(`   External: ${allQueued.filter(j => !j.easy_apply).length}`);

  // Test 2: Get only Easy Apply queued jobs
  console.log('\nTest 2: getJobsByStatus("queued", true)');
  const easyQueued = getJobsByStatus('queued', true);
  console.log(`   Result: ${easyQueued.length} jobs`);
  
  if (easyQueued.length > 0) {
    console.log('\n   First 3 Easy Apply jobs:');
    easyQueued.slice(0, 3).forEach((j, i) => {
      console.log(`   ${i + 1}. ${j.title} at ${j.company}`);
      console.log(`      easy_apply: ${j.easy_apply} (${typeof j.easy_apply})`);
      console.log(`      status: ${j.status}`);
    });
  }

  // Test 3: Get only External queued jobs
  console.log('\nTest 3: getJobsByStatus("queued", false)');
  const externalQueued = getJobsByStatus('queued', false);
  console.log(`   Result: ${externalQueued.length} jobs`);

} catch (error) {
  console.error('Error:', error.message);
  console.error(error.stack);
}

