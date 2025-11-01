import { getDb } from '../src/lib/db.js';
import { copyFileSync } from 'fs';
import { join } from 'path';

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const backupPath = `data/backups/app.db.backup-${timestamp}`;

console.log('\n💾 Creating database backup...\n');

// Force checkpoint first to ensure WAL is merged
const db = getDb();
db.pragma('wal_checkpoint(TRUNCATE)');

// Get stats before backup
const stats = db.prepare(`
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) as queued,
    SUM(CASE WHEN status = 'applied' THEN 1 ELSE 0 END) as applied,
    SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
    SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped
  FROM jobs
`).get();

console.log('📊 Current Database:');
console.log(`   Total:      ${stats.total}`);
console.log(`   Queued:     ${stats.queued || 0}`);
console.log(`   Applied:    ${stats.applied || 0}`);
console.log(`   Rejected:   ${stats.rejected || 0}`);
console.log(`   Skipped:    ${stats.skipped || 0}\n`);

// Create backup (connection stays open for singleton pattern)
copyFileSync('data/app.db', backupPath);

console.log(`✅ Backup created: ${backupPath}\n`);
console.log('💡 Tip: Run this before using reset commands to preserve your data!\n');

