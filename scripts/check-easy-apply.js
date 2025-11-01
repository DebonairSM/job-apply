import { getDb } from '../src/lib/db.js';

const db = getDb();

console.log('📊 Easy Apply Jobs Status:');
const stats = db.prepare(`
  SELECT status, COUNT(*) as count 
  FROM jobs 
  WHERE easy_apply = 1 
  GROUP BY status
`).all();
stats.forEach(s => console.log(`   ${s.status}: ${s.count}`));

const queued = db.prepare(`
  SELECT COUNT(*) as count 
  FROM jobs 
  WHERE easy_apply = 1 AND status = 'queued'
`).get();
console.log(`\n🎯 Queued Easy Apply: ${queued.count}`);

if (queued.count > 0) {
  const top5 = db.prepare(`
    SELECT id, title, company, status, easy_apply, rank 
    FROM jobs 
    WHERE easy_apply = 1 AND status = 'queued' 
    ORDER BY rank DESC
    LIMIT 5
  `).all();
  console.log('\nTop 5 Queued Easy Apply Jobs:');
  top5.forEach(j => {
    console.log(`   [${j.status}] ${j.rank?.toFixed(1)} - ${j.title} at ${j.company}`);
    console.log(`      ID: ${j.id}, easy_apply: ${j.easy_apply}`);
  });
}
// Note: Database connection managed by getDb() singleton

