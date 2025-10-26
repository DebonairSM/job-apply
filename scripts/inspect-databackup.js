#!/usr/bin/env node

/**
 * Inspect the databackup folder to see what data it contains
 * This is a read-only operation - safe to run anytime
 */

import Database from 'better-sqlite3';
import { copyFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { statSync } from 'fs';

async function inspect() {
console.log('\n🔍 Inspecting databackup/\n');
console.log('='.repeat(60));

// Check backup files
const backupDbPath = 'databackup/app.db';
const backupWalPath = 'databackup/app.db-wal';
const backupShmPath = 'databackup/app.db-shm';

if (!existsSync(backupDbPath)) {
  console.error('❌ No backup database found at databackup/app.db');
  process.exit(1);
}

console.log('\n📂 Backup Files:');
const dbStats = statSync(backupDbPath);
console.log(`   app.db:     ${(dbStats.size / 1024 / 1024).toFixed(2)} MB (${new Date(dbStats.mtime).toLocaleString()})`);

if (existsSync(backupWalPath)) {
  const walStats = statSync(backupWalPath);
  console.log(`   app.db-wal: ${(walStats.size / 1024 / 1024).toFixed(2)} MB (${new Date(walStats.mtime).toLocaleString()})`);
}

if (existsSync(backupShmPath)) {
  const shmStats = statSync(backupShmPath);
  console.log(`   app.db-shm: ${(shmStats.size / 1024).toFixed(2)} KB (${new Date(shmStats.mtime).toLocaleString()})`);
}

try {
  // Copy to temp and checkpoint to read all data including WAL
  const tempDbPath = 'data/app.db.inspect-temp';
  
  copyFileSync(backupDbPath, tempDbPath);
  if (existsSync(backupWalPath)) {
    copyFileSync(backupWalPath, tempDbPath + '-wal');
  }
  if (existsSync(backupShmPath)) {
    copyFileSync(backupShmPath, tempDbPath + '-shm');
  }
  
  const db = new Database(tempDbPath);
  db.pragma('wal_checkpoint(TRUNCATE)');
  
  // Get job statistics
  console.log('\n📊 Job Statistics:');
  
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
  
  console.log(`   Total:      ${stats.total}`);
  console.log(`   Queued:     ${stats.queued || 0}`);
  console.log(`   Applied:    ${stats.applied || 0}`);
  console.log(`   Rejected:   ${stats.rejected || 0}`);
  console.log(`   Skipped:    ${stats.skipped || 0}`);
  console.log(`   Reported:   ${stats.reported || 0}`);
  console.log(`   Interview:  ${stats.interview || 0}`);
  
  // Get date range
  const dateRange = db.prepare(`
    SELECT 
      MIN(created_at) as oldest,
      MAX(created_at) as newest
    FROM jobs
  `).get();
  
  if (dateRange.oldest) {
    console.log('\n📅 Date Range:');
    console.log(`   Oldest:     ${new Date(dateRange.oldest).toLocaleString()}`);
    console.log(`   Newest:     ${new Date(dateRange.newest).toLocaleString()}`);
  }
  
  // Get company count
  const companyCount = db.prepare(`
    SELECT COUNT(DISTINCT company) as count FROM jobs
  `).get();
  
  console.log('\n🏢 Companies:');
  console.log(`   Unique:     ${companyCount.count}`);
  
  // Get top companies
  const topCompanies = db.prepare(`
    SELECT company, COUNT(*) as count 
    FROM jobs 
    GROUP BY company 
    ORDER BY count DESC 
    LIMIT 10
  `).all();
  
  console.log('\n🔝 Top 10 Companies:');
  topCompanies.forEach((c, i) => {
    console.log(`   ${i + 1}. ${c.company}: ${c.count} jobs`);
  });
  
  // Get Easy Apply stats
  const easyApplyStats = db.prepare(`
    SELECT 
      SUM(CASE WHEN easy_apply = 1 THEN 1 ELSE 0 END) as easy_apply,
      SUM(CASE WHEN easy_apply = 0 THEN 1 ELSE 0 END) as external
    FROM jobs
  `).get();
  
  console.log('\n📝 Application Types:');
  console.log(`   Easy Apply: ${easyApplyStats.easy_apply || 0}`);
  console.log(`   External:   ${easyApplyStats.external || 0}`);
  
  // Check schema
  console.log('\n🏗️  Database Schema:');
  
  const tables = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `).all();
  
  console.log(`   Tables:     ${tables.length}`);
  tables.forEach(t => {
    console.log(`   • ${t.name}`);
  });
  
  const jobsColumns = db.prepare(`PRAGMA table_info(jobs)`).all();
  console.log(`\n   Jobs table columns: ${jobsColumns.length}`);
  
  // Sample jobs
  console.log('\n📋 Sample Jobs (Top 5 by Rank):');
  const sampleJobs = db.prepare(`
    SELECT title, company, rank, status, easy_apply
    FROM jobs
    ORDER BY rank DESC
    LIMIT 5
  `).all();
  
  sampleJobs.forEach((job, i) => {
    const type = job.easy_apply ? 'Easy Apply' : 'External';
    console.log(`   ${i + 1}. ${job.title} at ${job.company}`);
    console.log(`      Rank: ${job.rank} | Status: ${job.status} | ${type}`);
  });
  
  db.close();
  
  // Clean up temp files
  unlinkSync(tempDbPath);
  if (existsSync(tempDbPath + '-wal')) {
    unlinkSync(tempDbPath + '-wal');
  }
  if (existsSync(tempDbPath + '-shm')) {
    unlinkSync(tempDbPath + '-shm');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n💡 To restore this backup, run:');
  console.log('   npm run backup:restore\n');
  console.log('⚠️  This will:');
  console.log('   1. Backup your current database first');
  console.log('   2. Replace it with this backup');
  console.log(`   3. Restore ${stats.total} jobs\n`);
  console.log('='.repeat(60) + '\n');
  
} catch (error) {
  console.error(`\n❌ Error inspecting backup: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
}
}

inspect();

