import { getDb } from './db.js';
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

export interface BackupResult {
  success: boolean;
  backupPath?: string;
  error?: string;
}

/**
 * Creates a timestamped backup of the database
 * Returns the path to the backup file
 */
export function createBackup(): BackupResult {
  try {
    const dbPath = 'data/app.db';
    
    if (!existsSync(dbPath)) {
      return {
        success: false,
        error: 'Database file not found'
      };
    }

    // Ensure backups directory exists
    const backupsDir = 'data/backups';
    if (!existsSync(backupsDir)) {
      mkdirSync(backupsDir, { recursive: true });
    }

    // Create timestamp for backup filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupPath = join(backupsDir, `app.db.backup-${timestamp}`);

    // Force checkpoint first to ensure WAL is merged
    const db = getDb();
    db.pragma('wal_checkpoint(TRUNCATE)');
    // Note: Database connection managed by getDb() singleton

    // Create backup
    copyFileSync(dbPath, backupPath);

    return {
      success: true,
      backupPath
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error creating backup'
    };
  }
}

/**
 * Gets the most recent backup file path
 */
export function getLatestBackup(): string | null {
  try {
    const backupsDir = 'data/backups';
    
    if (!existsSync(backupsDir)) {
      return null;
    }

    const backups = readdirSync(backupsDir)
      .filter(file => file.startsWith('app.db.backup-'))
      .map(file => ({
        name: file,
        path: join(backupsDir, file),
        time: statSync(join(backupsDir, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    return backups.length > 0 ? backups[0].path : null;
  } catch (error) {
    console.error('Error getting latest backup:', error);
    return null;
  }
}

