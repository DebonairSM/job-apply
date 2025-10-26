import { getJobsByStatus } from '../src/lib/db.js';

console.log('Testing apply command job selection logic...\n');

const opts = {
  easy: true,
  external: false,
  jobId: undefined,
  dryRun: false
};

console.log('Options:', opts);
console.log('');

// Replicate the logic from applyCommand
let jobs;
if (opts.jobId) {
  console.log('Would get job by ID:', opts.jobId);
  jobs = [];
} else if (opts.easy) {
  console.log('Getting Easy Apply jobs: getJobsByStatus("queued", true)');
  jobs = getJobsByStatus('queued', true);
} else if (opts.external) {
  console.log('Getting External jobs: getJobsByStatus("queued", false)');
  jobs = getJobsByStatus('queued', false);
} else {
  console.log('Getting all queued jobs: getJobsByStatus("queued")');
  jobs = getJobsByStatus('queued');
}

console.log(`\nResult: ${jobs.length} jobs found`);

if (jobs.length === 0) {
  console.log('✅ No jobs in queue to apply to');
} else {
  console.log(`\n🚀 Would start application process...`);
  console.log(`   Jobs to process: ${jobs.length}`);
  console.log('\nFirst 5 jobs:');
  jobs.slice(0, 5).forEach((j, i) => {
    console.log(`   ${i + 1}. ${j.title} at ${j.company}`);
    console.log(`      Rank: ${j.rank}/100, Easy Apply: ${j.easy_apply}`);
  });
}

