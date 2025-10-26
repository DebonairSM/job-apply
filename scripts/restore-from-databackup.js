#!/usr/bin/env node

/**
 * Restore database from databackup folder
 * 
 * This script:
 * 1. Creates a backup of current database
 * 2. Checks schema compatibility
 * 3. Restores data from backup (handles schema changes)
 * 4. Verifies restoration
 */

import Database from 'better-sqlite3';
import { copyFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

async function restore() {
console.log('\n🔄 Database Restoration from databackup/\n');
console.log('='.repeat(60));

// Step 1: Create backup of current database
console.log('\n📦 STEP 1: Backing up current database...');

const backupDir = 'data/backups';
if (!existsSync(backupDir)) {
  mkdirSync(backupDir, { recursive: true });
}

const currentBackupPath = join(backupDir, `app.db.before-restore-${timestamp}`);

try {
  // Checkpoint current database before backup
  if (existsSync('data/app.db')) {
    const currentDb = new Database('data/app.db');
    currentDb.pragma('wal_checkpoint(TRUNCATE)');
    currentDb.close();
    
    copyFileSync('data/app.db', currentBackupPath);
    console.log(`✅ Current database backed up to: ${currentBackupPath}`);
  } else {
    console.log('ℹ️  No current database to backup (creating fresh)');
  }
} catch (error) {
  console.error(`❌ Failed to backup current database: ${error.message}`);
  process.exit(1);
}

// Step 2: Check if backup exists
console.log('\n📂 STEP 2: Checking backup source...');

const backupDbPath = 'databackup/app.db';
const backupWalPath = 'databackup/app.db-wal';
const backupShmPath = 'databackup/app.db-shm';

if (!existsSync(backupDbPath)) {
  console.error('❌ Backup database not found at databackup/app.db');
  process.exit(1);
}

console.log(`✅ Found backup database: ${backupDbPath}`);
if (existsSync(backupWalPath)) {
  console.log(`✅ Found WAL file (contains recent changes)`);
}
if (existsSync(backupShmPath)) {
  console.log(`✅ Found SHM file (shared memory)`);
}

// Step 3: Copy backup files to temp location and checkpoint
console.log('\n💾 STEP 3: Preparing backup for restoration...');

const tempDbPath = 'data/app.db.temp';

try {
  // Copy backup files to temp location
  copyFileSync(backupDbPath, tempDbPath);
  if (existsSync(backupWalPath)) {
    copyFileSync(backupWalPath, tempDbPath + '-wal');
  }
  if (existsSync(backupShmPath)) {
    copyFileSync(backupShmPath, tempDbPath + '-shm');
  }
  
  // Open and checkpoint to merge WAL into main database
  const tempDb = new Database(tempDbPath);
  console.log('🔄 Checkpointing WAL file...');
  tempDb.pragma('wal_checkpoint(TRUNCATE)');
  
  // Get stats from backup
  const backupStats = tempDb.prepare(`
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
  
  console.log('\n📊 Backup Database Contents:');
  console.log(`   Total:      ${backupStats.total}`);
  console.log(`   Queued:     ${backupStats.queued || 0}`);
  console.log(`   Applied:    ${backupStats.applied || 0}`);
  console.log(`   Rejected:   ${backupStats.rejected || 0}`);
  console.log(`   Skipped:    ${backupStats.skipped || 0}`);
  console.log(`   Reported:   ${backupStats.reported || 0}`);
  console.log(`   Interview:  ${backupStats.interview || 0}`);
  
  // Check for schema differences
  console.log('\n🔍 STEP 4: Checking schema compatibility...');
  
  const backupTables = tempDb.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `).all();
  
  console.log(`✅ Found ${backupTables.length} tables in backup`);
  
  // Check if jobs table has all necessary columns
  const backupColumns = tempDb.prepare(`PRAGMA table_info(jobs)`).all();
  const columnNames = backupColumns.map(c => c.name);
  
  console.log(`✅ Jobs table has ${columnNames.length} columns`);
  
  // List of expected columns in current schema
  const expectedColumns = [
    'id', 'title', 'company', 'url', 'easy_apply', 'rank', 'status',
    'applied_method', 'rejection_reason', 'fit_reasons', 'must_haves',
    'blockers', 'category_scores', 'missing_keywords', 'posted_date',
    'description', 'created_at', 'status_updated_at'
  ];
  
  const missingColumns = expectedColumns.filter(col => !columnNames.includes(col));
  const extraColumns = columnNames.filter(col => !expectedColumns.includes(col));
  
  if (missingColumns.length > 0) {
    console.log(`⚠️  Backup is missing columns: ${missingColumns.join(', ')}`);
    console.log(`   These will be added with NULL values`);
  }
  
  if (extraColumns.length > 0) {
    console.log(`ℹ️  Backup has extra columns: ${extraColumns.join(', ')}`);
    console.log(`   These will be ignored during restoration`);
  }
  
  tempDb.close();
  
  // Step 5: Perform restoration
  console.log('\n🚀 STEP 5: Restoring database...');
  console.log('⚠️  Close the dashboard or any apps using the database');
  console.log('   Waiting 3 seconds...\n');
  
  // Wait a moment for any connections to close
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Try to rename/move existing database files instead of deleting
  const oldDbBackup = `data/app.db.old-${timestamp}`;
  
  try {
    if (existsSync('data/app.db')) {
      console.log('📦 Moving old database out of the way...');
      const { renameSync } = await import('fs');
      
      // Try to rename - this might fail if file is locked
      try {
        renameSync('data/app.db', oldDbBackup);
        if (existsSync('data/app.db-wal')) {
          renameSync('data/app.db-wal', oldDbBackup + '-wal');
        }
        if (existsSync('data/app.db-shm')) {
          renameSync('data/app.db-shm', oldDbBackup + '-shm');
        }
        console.log(`✅ Old database moved to: ${oldDbBackup}`);
      } catch (renameError) {
        throw new Error(`Database is locked. Please close the dashboard and any other apps using the database, then try again.\n\nError: ${renameError.message}`);
      }
    }
    
    // Copy temp database to main location
    copyFileSync(tempDbPath, 'data/app.db');
    console.log('✅ Database restored');
    
  } catch (moveError) {
    throw moveError;
  }
  
  // Clean up temp files
  if (existsSync(tempDbPath)) {
    unlinkSync(tempDbPath);
  }
  if (existsSync(tempDbPath + '-wal')) {
    unlinkSync(tempDbPath + '-wal');
  }
  if (existsSync(tempDbPath + '-shm')) {
    unlinkSync(tempDbPath + '-shm');
  }
  
  // Step 6: Verify restoration
  console.log('\n✅ STEP 6: Verifying restoration...');
  
  const restoredDb = new Database('data/app.db');
  
  // Ensure current schema
  console.log('🔧 Ensuring schema is up to date...');
  
  // Add any missing columns (this handles schema evolution)
  const currentColumns = restoredDb.prepare(`PRAGMA table_info(jobs)`).all();
  const currentColumnNames = currentColumns.map(c => c.name);
  
  const columnsToAdd = [
    { name: 'applied_method', type: 'TEXT' },
    { name: 'rejection_reason', type: 'TEXT' },
    { name: 'category_scores', type: 'TEXT' },
    { name: 'missing_keywords', type: 'TEXT' },
    { name: 'posted_date', type: 'TEXT' },
    { name: 'status_updated_at', type: 'TEXT' }
  ];
  
  for (const col of columnsToAdd) {
    if (!currentColumnNames.includes(col.name)) {
      try {
        restoredDb.exec(`ALTER TABLE jobs ADD COLUMN ${col.name} ${col.type}`);
        console.log(`   ✅ Added missing column: ${col.name}`);
      } catch (error) {
        // Column already exists
      }
    }
  }
  
  const finalStats = restoredDb.prepare(`
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
  
  console.log('\n📊 Restored Database:');
  console.log(`   Total:      ${finalStats.total}`);
  console.log(`   Queued:     ${finalStats.queued || 0}`);
  console.log(`   Applied:    ${finalStats.applied || 0}`);
  console.log(`   Rejected:   ${finalStats.rejected || 0}`);
  console.log(`   Skipped:    ${finalStats.skipped || 0}`);
  console.log(`   Reported:   ${finalStats.reported || 0}`);
  console.log(`   Interview:  ${finalStats.interview || 0}`);
  
  restoredDb.close();
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ RESTORATION COMPLETE!\n');
  console.log('📝 Summary:');
  console.log(`   • Backup created: ${currentBackupPath}`);
  console.log(`   • Restored ${finalStats.total} jobs from databackup/`);
  console.log(`   • Schema updated to current version`);
  console.log('\n💡 Next steps:');
  console.log('   • Run: npm run status');
  console.log('   • Run: npm run list queued');
  console.log('   • Verify your jobs are back');
  console.log('\n⚠️  If something went wrong:');
  console.log(`   • Your previous database is at: ${currentBackupPath}`);
  console.log('   • Copy it back to data/app.db to revert\n');
  console.log('='.repeat(60) + '\n');
  
} catch (error) {
  console.error(`\n❌ Restoration failed: ${error.message}`);
  console.error(error.stack);
  
  // Clean up temp files
  try {
    if (existsSync(tempDbPath)) {
      unlinkSync(tempDbPath);
    }
    if (existsSync(tempDbPath + '-wal')) {
      unlinkSync(tempDbPath + '-wal');
    }
    if (existsSync(tempDbPath + '-shm')) {
      unlinkSync(tempDbPath + '-shm');
    }
  } catch (cleanupError) {
    // Ignore cleanup errors
  }
  
  console.log(`\n✅ Your current database was backed up to: ${currentBackupPath}`);
  console.log('   It has not been modified.\n');
  
  process.exit(1);
}
}

restore();

