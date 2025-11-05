import { getActiveScrapingRuns, updateScrapingRun } from '../src/lib/db.js';

/**
 * Utility script to stop all stalled scraping runs
 * A run is considered stalled if it's been in_progress for more than 1 hour with no recent activity
 */

console.log('🔍 Checking for stalled scraping runs...\n');

const activeRuns = getActiveScrapingRuns();

if (activeRuns.length === 0) {
  console.log('✅ No active runs found.');
  process.exit(0);
}

console.log(`Found ${activeRuns.length} active run(s):\n`);

const now = new Date();
let stalledCount = 0;

for (const run of activeRuns) {
  const startedAt = new Date(run.started_at!);
  const lastActivityAt = run.last_activity_at ? new Date(run.last_activity_at) : startedAt;
  
  const timeSinceStart = (now.getTime() - startedAt.getTime()) / (1000 * 60); // minutes
  const timeSinceActivity = (now.getTime() - lastActivityAt.getTime()) / (1000 * 60); // minutes
  
  const isStalled = timeSinceActivity > 5 || timeSinceStart > 60;
  
  console.log(`Run #${run.id}:`);
  console.log(`  Started: ${startedAt.toLocaleString()}`);
  console.log(`  Last Activity: ${lastActivityAt.toLocaleString()}`);
  console.log(`  Time since start: ${Math.round(timeSinceStart)} minutes`);
  console.log(`  Time since activity: ${Math.round(timeSinceActivity)} minutes`);
  console.log(`  Profiles: ${run.profiles_scraped}/${run.max_profiles || '?'}`);
  console.log(`  Status: ${isStalled ? '⚠️  STALLED' : '✅ Active'}`);
  console.log();
  
  if (isStalled) {
    stalledCount++;
    console.log(`  🛑 Stopping stalled run #${run.id}...`);
    updateScrapingRun(run.id!, {
      status: 'stopped',
      completed_at: new Date().toISOString(),
      error_message: 'Stopped by cleanup script - run was stalled'
    });
    console.log(`  ✅ Run #${run.id} marked as stopped\n`);
  }
}

if (stalledCount === 0) {
  console.log('✅ No stalled runs found. All active runs are progressing normally.');
} else {
  console.log(`✅ Stopped ${stalledCount} stalled run(s).`);
  console.log('\nYou can resume any of these runs later with:');
  console.log('  npm run leads:search -- --resume <RUN_ID>');
}

process.exit(0);

