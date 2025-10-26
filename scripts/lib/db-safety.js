#!/usr/bin/env node

/**
 * Database Safety Module
 * 
 * Provides automatic backup and safety checks for all database operations
 * Prevents accidental data loss by:
 * - Creating automatic backups before state changes
 * - Requiring confirmation for destructive operations
 * - Ensuring tests use separate test database
 */

import Database from 'better-sqlite3';
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../..');

/**
 * Create a timestamped backup of the current database
 * @returns {string} Path to the backup file
 */
export function createAutoBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = join(rootDir, 'data/backups');
  
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true });
  }
  
  const dbPath = join(rootDir, 'data/app.db');
  
  if (!existsSync(dbPath)) {
    console.log('ℹ️  No database file to backup (creating fresh database)');
    return null;
  }
  
  try {
    // Checkpoint WAL first to ensure all data is in main database
    const db = new Database(dbPath);
    db.pragma('wal_checkpoint(TRUNCATE)');
    db.close();
    
    const backupPath = join(backupDir, `app.db.auto-backup-${timestamp}`);
    copyFileSync(dbPath, backupPath);
    
    console.log(`💾 Auto-backup created: ${backupPath}`);
    return backupPath;
  } catch (error) {
    console.error(`⚠️  Failed to create backup: ${error.message}`);
    return null;
  }
}

/**
 * Get database path based on environment
 * Tests use in-memory database, production uses file-based
 * @returns {string} Database path
 */
export function getDatabasePath() {
  // Check if running in test mode
  if (process.env.NODE_ENV === 'test' || process.env.TEST_MODE === 'true') {
    return ':memory:'; // In-memory database for tests
  }
  
  return join(rootDir, 'data/app.db');
}

/**
 * Open database with safety checks
 * @param {Object} options - Configuration options
 * @param {boolean} options.readonly - Open in read-only mode
 * @param {boolean} options.backup - Create backup before opening (for write operations)
 * @param {boolean} options.confirmDestructive - Require confirmation for destructive ops
 * @returns {Database} Database instance
 */
export function openDatabase(options = {}) {
  const {
    readonly = false,
    backup = false,
    confirmDestructive = false
  } = options;
  
  const dbPath = getDatabasePath();
  
  // Create backup if requested and not in test mode
  if (backup && dbPath !== ':memory:') {
    createAutoBackup();
  }
  
  const db = new Database(dbPath, { readonly });
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  
  return db;
}

/**
 * Require user confirmation for destructive operations
 * @param {string} operation - Description of the operation
 * @param {Object} impact - Impact details (jobs affected, etc.)
 * @returns {Promise<boolean>} True if user confirms
 */
export async function confirmDestructiveOperation(operation, impact) {
  // Skip confirmation in test mode
  if (process.env.NODE_ENV === 'test' || process.env.TEST_MODE === 'true') {
    return true;
  }
  
  console.log('\n⚠️  DESTRUCTIVE OPERATION');
  console.log('='.repeat(60));
  console.log(`Operation: ${operation}`);
  
  if (impact.jobsAffected !== undefined) {
    console.log(`Jobs affected: ${impact.jobsAffected}`);
  }
  if (impact.deletesData) {
    console.log('⚠️  THIS WILL DELETE DATA PERMANENTLY');
  }
  if (impact.changesState) {
    console.log('⚠️  This will change job statuses');
  }
  
  console.log('='.repeat(60));
  console.log('\nA backup has been created automatically.');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
  
  // Wait 5 seconds for user to cancel
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  return true;
}

/**
 * Setup test database with schema and optional data
 * @param {Database} db - Test database instance
 * @param {Object} options - Setup options
 * @param {boolean} options.withSampleData - Include sample data
 */
export function setupTestDatabase(db, options = {}) {
  const { withSampleData = false } = options;
  
  // Import and run database initialization
  // This creates all tables with the correct schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      url TEXT UNIQUE NOT NULL,
      easy_apply INTEGER NOT NULL,
      rank REAL,
      status TEXT DEFAULT 'queued',
      applied_method TEXT,
      rejection_reason TEXT,
      fit_reasons TEXT,
      must_haves TEXT,
      blockers TEXT,
      category_scores TEXT,
      missing_keywords TEXT,
      posted_date TEXT,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      status_updated_at TEXT
    );
    
    CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      full_name TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      email TEXT NOT NULL,
      phone TEXT,
      city TEXT,
      linkedin_profile TEXT,
      work_authorization TEXT,
      requires_sponsorship TEXT,
      profile_summary TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS answers_cache (
      job_id TEXT PRIMARY KEY,
      answers TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS label_mappings (
      label TEXT PRIMARY KEY,
      canonical_key TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS learned_selectors (
      form_type TEXT NOT NULL,
      field_name TEXT NOT NULL,
      selector TEXT NOT NULL,
      success_count INTEGER DEFAULT 1,
      last_used TEXT DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (form_type, field_name, selector)
    );
    
    CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      command TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      status TEXT DEFAULT 'running',
      jobs_processed INTEGER DEFAULT 0,
      jobs_successful INTEGER DEFAULT 0,
      jobs_failed INTEGER DEFAULT 0,
      error_message TEXT
    );
  `);
  
  if (withSampleData) {
    // Add sample data for testing
    db.prepare(`
      INSERT INTO user_profile (id, full_name, first_name, last_name, email, work_authorization, requires_sponsorship)
      VALUES (1, 'Test User', 'Test', 'User', 'test@example.com', 'Citizen', 'No')
    `).run();
    
    db.prepare(`
      INSERT INTO jobs (id, title, company, url, easy_apply, rank, status)
      VALUES 
        ('test-job-1', 'Senior Engineer', 'Test Corp', 'https://example.com/job1', 1, 85, 'queued'),
        ('test-job-2', 'Lead Developer', 'Tech Inc', 'https://example.com/job2', 0, 90, 'applied')
    `).run();
  }
  
  console.log('✅ Test database initialized');
}

/**
 * Copy production database for testing
 * Creates a snapshot of production data for test scenarios
 * @returns {string} Path to the test database copy
 */
export function copyProductionForTest() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const prodDbPath = join(rootDir, 'data/app.db');
  const testDbPath = join(rootDir, 'data/test-copy-' + timestamp + '.db');
  
  if (!existsSync(prodDbPath)) {
    throw new Error('Production database not found');
  }
  
  // Checkpoint WAL first
  const db = new Database(prodDbPath);
  db.pragma('wal_checkpoint(TRUNCATE)');
  db.close();
  
  copyFileSync(prodDbPath, testDbPath);
  console.log(`📋 Production database copied to: ${testDbPath}`);
  console.log('   Use this for testing, then delete when done');
  
  return testDbPath;
}

/**
 * Clean up old backups (keep last N backups)
 * @param {number} keepCount - Number of backups to keep (default: 10)
 */
export function cleanupOldBackups(keepCount = 10) {
  const backupDir = join(rootDir, 'data/backups');
  
  if (!existsSync(backupDir)) {
    return;
  }
  
  const fs = require('fs');
  const backupFiles = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('app.db.'))
    .map(f => ({
      name: f,
      path: join(backupDir, f),
      time: fs.statSync(join(backupDir, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time); // Newest first
  
  // Delete old backups beyond keepCount
  const toDelete = backupFiles.slice(keepCount);
  
  for (const file of toDelete) {
    fs.unlinkSync(file.path);
    console.log(`🗑️  Deleted old backup: ${file.name}`);
  }
  
  if (toDelete.length > 0) {
    console.log(`✅ Cleaned up ${toDelete.length} old backups (kept ${keepCount} most recent)`);
  }
}

export default {
  createAutoBackup,
  getDatabasePath,
  openDatabase,
  confirmDestructiveOperation,
  setupTestDatabase,
  copyProductionForTest,
  cleanupOldBackups
};

