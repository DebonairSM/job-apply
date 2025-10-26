import Database from 'better-sqlite3';

const db = new Database('data/app-backup.db');

const stats = db.prepare(`
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) as queued,
    SUM(CASE WHEN status = 'applied' THEN 1 ELSE 0 END) as applied,
    SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
    SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped,
    SUM(CASE WHEN status = 'reported' THEN 1 ELSE 0 END) as reported,
    SUM(CASE WHEN status = 'interview' THEN 1 ELSE 0 END) as interview
  FROM jobs
`).get();

console.log('\n📊 Backup Database (app-backup.db):');
console.log(`   Total:      ${stats.total}`);
console.log(`   Queued:     ${stats.queued}`);
console.log(`   Applied:    ${stats.applied}`);
console.log(`   Rejected:   ${stats.rejected}`);
console.log(`   Skipped:    ${stats.skipped}`);
console.log(`   Reported:   ${stats.reported}`);
console.log(`   Interview:  ${stats.interview}\n`);

db.close();

