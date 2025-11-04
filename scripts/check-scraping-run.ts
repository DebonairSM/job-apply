import { getDb, initDb } from '../src/lib/db.js';

const runId = parseInt(process.argv[2] || '11', 10);

initDb();
const db = getDb();

console.log(`\n🔍 Checking scraping run #${runId}\n`);

const run = db.prepare('SELECT * FROM lead_scraping_runs WHERE id = ?').get(runId);

if (run) {
  console.log('✅ Run found:');
  console.log(`   Status: ${run.status}`);
  console.log(`   Started: ${run.started_at}`);
  console.log(`   Completed: ${run.completed_at || 'N/A'}`);
  console.log(`   Profiles Scraped: ${run.profiles_scraped || 0}`);
  console.log(`   Profiles Added: ${run.profiles_added || 0}`);
  console.log(`   Max Profiles: ${run.max_profiles || 'unlimited'}`);
  
  if (run.filter_titles) {
    try {
      const filters = JSON.parse(run.filter_titles);
      console.log(`   Title Filters: ${filters.join(', ')}`);
    } catch {
      console.log(`   Title Filters: ${run.filter_titles}`);
    }
  } else {
    console.log(`   Title Filters: none`);
  }
  
  if (run.last_profile_url) {
    console.log(`   Last Profile: ${run.last_profile_url}`);
  }
} else {
  console.log('❌ Run not found');
}

console.log('');

