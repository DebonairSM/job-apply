import { getDb } from '../src/lib/db.js';
import { createBackup, formatBytes } from '../src/services/backup-service.js';

console.log('\n💾 Creating database backup...\n');

// Get stats before backup
const db = getDb();
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
console.log(`   Total Jobs:  ${stats.total}`);
console.log(`   Queued:      ${stats.queued || 0}`);
console.log(`   Applied:     ${stats.applied || 0}`);
console.log(`   Rejected:    ${stats.rejected || 0}`);
console.log(`   Skipped:     ${stats.skipped || 0}\n`);

// Create backup using new backup service
const result = await createBackup();

if (result.success) {
  console.log('✅ Backup created successfully!\n');
  console.log(`   Location: ${result.backupPath}`);
  console.log(`   Folder: ${result.backupFolder}`);
  console.log(`   Timestamp: ${result.timestamp}\n`);
  
  console.log('📦 Components backed up:');
  console.log(`   Database:  ${result.components.database ? '✓' : '✗'} ${result.components.database ? `(${formatBytes(result.sizes.database)})` : ''}`);
  console.log(`   Session:   ${result.components.session ? '✓' : '✗'} ${result.components.session ? `(${formatBytes(result.sizes.session)})` : ''}`);
  console.log(`   Artifacts: ${result.components.artifacts ? '✓' : '✗'} ${result.components.artifacts ? `(${formatBytes(result.sizes.artifacts)})` : ''}`);
  console.log(`\n   Total Size: ${formatBytes(result.sizes.total)}\n`);
  
  console.log('💡 Tip: Backups older than 7 days are automatically deleted.\n');
  console.log('💡 This backup is stored in My Documents and will be synced by OneDrive.\n');
} else {
  console.error(`\n❌ Backup failed: ${result.error}\n`);
  process.exit(1);
}
