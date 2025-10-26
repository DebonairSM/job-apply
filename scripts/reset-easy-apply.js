import Database from 'better-sqlite3';

const db = new Database('data/app.db');

console.log('🔄 Resetting Easy Apply jobs...\n');

// Show current status
console.log('Current Easy Apply Status:');
const before = db.prepare(`
  SELECT status, COUNT(*) as count 
  FROM jobs 
  WHERE easy_apply = 1 
  GROUP BY status
`).all();
before.forEach(s => console.log(`   ${s.status}: ${s.count}`));

// Reset skipped Easy Apply jobs to queued
const result = db.prepare(`
  UPDATE jobs 
  SET status = 'queued' 
  WHERE status = 'skipped' AND easy_apply = 1
`).run();

console.log(`\n✅ Reset ${result.changes} Easy Apply jobs from 'skipped' to 'queued'\n`);

// Show new status
console.log('Updated Easy Apply Status:');
const after = db.prepare(`
  SELECT status, COUNT(*) as count 
  FROM jobs 
  WHERE easy_apply = 1 
  GROUP BY status
`).all();
after.forEach(s => console.log(`   ${s.status}: ${s.count}`));

// Show top queued Easy Apply jobs
console.log('\n🎯 Top Queued Easy Apply Jobs:');
const queued = db.prepare(`
  SELECT title, company, rank 
  FROM jobs 
  WHERE status = 'queued' AND easy_apply = 1
  ORDER BY rank DESC 
  LIMIT 10
`).all();
queued.forEach(j => console.log(`   ${j.rank?.toFixed(1) || '?'} - ${j.title} at ${j.company}`));

db.close();

