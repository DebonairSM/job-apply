import Database from 'better-sqlite3';
import { copyFileSync } from 'fs';

console.log('\n🔄 Restoring from backup...\n');

// Create a backup of the current (empty) database first
copyFileSync('data/app.db', 'data/app.db.before-restore');
console.log('✅ Created backup of current database: app.db.before-restore');

// Copy the backup database to main database
copyFileSync('data/app-backup.db', 'data/app.db');
console.log('✅ Restored app-backup.db to app.db\n');

// Check what we restored
const db = new Database('data/app.db');
const stats = db.prepare(`
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) as queued,
    SUM(CASE WHEN status = 'applied' THEN 1 ELSE 0 END) as applied,
    SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
    SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped
  FROM jobs
`).get();

console.log('📊 Restored Database:');
console.log(`   Total:      ${stats.total}`);
console.log(`   Queued:     ${stats.queued}`);
console.log(`   Applied:    ${stats.applied}`);
console.log(`   Rejected:   ${stats.rejected}`);
console.log(`   Skipped:    ${stats.skipped}\n`);

db.close();

console.log('⚠️  Note: This only restores 17 jobs from the backup.');
console.log('   The 415 jobs from before were not in any backup.\n');

