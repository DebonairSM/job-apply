import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync, rmSync, cpSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { getDb } from '../lib/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Source paths
const DB_PATH = join(__dirname, '../../data/app.db');
const STORAGE_STATE_PATH = join(__dirname, '../../storage/storageState.json');
const ARTIFACTS_DIR = join(__dirname, '../../artifacts');

// Backup retention period in days
const RETENTION_DAYS = 7;

export interface BackupMetadata {
  success: boolean;
  backupPath: string;
  timestamp: string;
  backupFolder: string;
  components: {
    database: boolean;
    session: boolean;
    artifacts: boolean;
  };
  sizes: {
    database: number;
    session: number;
    artifacts: number;
    total: number;
  };
  error?: string;
}

export interface BackupStats {
  backupLocation: string;
  totalBackups: number;
  totalSize: number;
  oldestBackup: string | null;
  newestBackup: string | null;
  backups: Array<{
    folder: string;
    date: Date;
    size: number;
  }>;
}

/**
 * Get the My Documents path for the current platform
 * Falls back to local data/backups if My Documents is not available
 */
export function getMyDocumentsPath(): string {
  const userProfile = process.env.USERPROFILE || process.env.HOME;
  
  if (!userProfile) {
    console.warn('⚠️  Could not determine user profile directory, using local backup');
    return join(__dirname, '../../data/backups');
  }
  
  // Check for OneDrive Documents folder first (common on Windows)
  const oneDriveDocs = join(userProfile, 'OneDrive', 'Documents', 'OpportunitiesBackups');
  const regularDocs = join(userProfile, 'Documents', 'OpportunitiesBackups');
  
  // Try OneDrive Documents location first
  let myDocs = regularDocs;
  
  // Check if OneDrive Documents exists (without OpportunitiesBackups subfolder)
  const oneDriveDocsParent = join(userProfile, 'OneDrive', 'Documents');
  if (existsSync(oneDriveDocsParent)) {
    myDocs = oneDriveDocs;
  }
  
  // Ensure directory exists
  try {
    if (!existsSync(myDocs)) {
      mkdirSync(myDocs, { recursive: true });
    }
    return myDocs;
  } catch (error) {
    console.warn('⚠️  Could not create My Documents backup folder, using local backup');
    const localBackup = join(__dirname, '../../data/backups');
    if (!existsSync(localBackup)) {
      mkdirSync(localBackup, { recursive: true });
    }
    return localBackup;
  }
}

/**
 * Get the size of a file or directory in bytes
 */
function getSize(filePath: string): number {
  try {
    if (!existsSync(filePath)) {
      return 0;
    }
    
    const stats = statSync(filePath);
    
    if (stats.isFile()) {
      return stats.size;
    }
    
    if (stats.isDirectory()) {
      let totalSize = 0;
      const files = readdirSync(filePath);
      for (const file of files) {
        totalSize += getSize(join(filePath, file));
      }
      return totalSize;
    }
    
    return 0;
  } catch (error) {
    return 0;
  }
}

/**
 * Force SQLite WAL checkpoint to merge all changes into main database file
 */
function checkpointDatabase(): void {
  try {
    const db = getDb();
    db.pragma('wal_checkpoint(TRUNCATE)');
  } catch (error) {
    console.warn('⚠️  Could not checkpoint database:', error);
  }
}

/**
 * Create a backup of the database, session, and artifacts
 */
export async function createBackup(): Promise<BackupMetadata> {
  const timestamp = new Date().toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, 19); // YYYY-MM-DDTHH-mm-ss
  
  const backupRoot = getMyDocumentsPath();
  const backupFolder = join(backupRoot, `backup-${timestamp}`);
  
  const metadata: BackupMetadata = {
    success: false,
    backupPath: backupRoot,
    timestamp,
    backupFolder,
    components: {
      database: false,
      session: false,
      artifacts: false
    },
    sizes: {
      database: 0,
      session: 0,
      artifacts: 0,
      total: 0
    }
  };
  
  try {
    // Create backup folder
    if (!existsSync(backupFolder)) {
      mkdirSync(backupFolder, { recursive: true });
    }
    
    // 1. Backup database
    if (existsSync(DB_PATH)) {
      // Force checkpoint to merge WAL into main database
      checkpointDatabase();
      
      const dbBackupPath = join(backupFolder, 'app.db');
      copyFileSync(DB_PATH, dbBackupPath);
      metadata.components.database = true;
      metadata.sizes.database = getSize(dbBackupPath);
      
      // Also copy WAL and SHM files if they exist
      const walPath = `${DB_PATH}-wal`;
      const shmPath = `${DB_PATH}-shm`;
      
      if (existsSync(walPath)) {
        copyFileSync(walPath, `${dbBackupPath}-wal`);
      }
      
      if (existsSync(shmPath)) {
        copyFileSync(shmPath, `${dbBackupPath}-shm`);
      }
    }
    
    // 2. Backup session (if exists)
    if (existsSync(STORAGE_STATE_PATH)) {
      const sessionBackupPath = join(backupFolder, 'storageState.json');
      copyFileSync(STORAGE_STATE_PATH, sessionBackupPath);
      metadata.components.session = true;
      metadata.sizes.session = getSize(sessionBackupPath);
    }
    
    // 3. Backup artifacts folder (if exists and not empty)
    if (existsSync(ARTIFACTS_DIR)) {
      const artifactsBackupPath = join(backupFolder, 'artifacts');
      
      // Only copy if directory has content
      const files = readdirSync(ARTIFACTS_DIR);
      if (files.length > 0) {
        cpSync(ARTIFACTS_DIR, artifactsBackupPath, { recursive: true });
        metadata.components.artifacts = true;
        metadata.sizes.artifacts = getSize(artifactsBackupPath);
      }
    }
    
    // Calculate total size
    metadata.sizes.total = metadata.sizes.database + metadata.sizes.session + metadata.sizes.artifacts;
    
    metadata.success = true;
    
    // Clean up old backups
    await cleanupOldBackups();
    
  } catch (error) {
    metadata.success = false;
    metadata.error = error instanceof Error ? error.message : 'Unknown error';
  }
  
  return metadata;
}

/**
 * Remove backups older than RETENTION_DAYS
 */
export async function cleanupOldBackups(): Promise<number> {
  const backupRoot = getMyDocumentsPath();
  
  if (!existsSync(backupRoot)) {
    return 0;
  }
  
  const sevenDaysAgo = Date.now() - (RETENTION_DAYS * 24 * 60 * 60 * 1000);
  let deletedCount = 0;
  
  try {
    const entries = readdirSync(backupRoot);
    
    for (const entry of entries) {
      if (!entry.startsWith('backup-')) {
        continue;
      }
      
      const fullPath = join(backupRoot, entry);
      const stats = statSync(fullPath);
      
      if (stats.isDirectory() && stats.mtime.getTime() < sevenDaysAgo) {
        rmSync(fullPath, { recursive: true, force: true });
        deletedCount++;
      }
    }
  } catch (error) {
    console.warn('⚠️  Error during backup cleanup:', error);
  }
  
  return deletedCount;
}

/**
 * Get statistics about existing backups
 */
export function getBackupStats(): BackupStats {
  const backupLocation = getMyDocumentsPath();
  
  const stats: BackupStats = {
    backupLocation,
    totalBackups: 0,
    totalSize: 0,
    oldestBackup: null,
    newestBackup: null,
    backups: []
  };
  
  if (!existsSync(backupLocation)) {
    return stats;
  }
  
  try {
    const entries = readdirSync(backupLocation);
    
    for (const entry of entries) {
      if (!entry.startsWith('backup-')) {
        continue;
      }
      
      const fullPath = join(backupLocation, entry);
      const dirStats = statSync(fullPath);
      
      if (dirStats.isDirectory()) {
        const size = getSize(fullPath);
        
        stats.backups.push({
          folder: entry,
          date: dirStats.mtime,
          size
        });
        
        stats.totalSize += size;
      }
    }
    
    // Sort by date
    stats.backups.sort((a, b) => b.date.getTime() - a.date.getTime());
    
    stats.totalBackups = stats.backups.length;
    
    if (stats.backups.length > 0) {
      stats.newestBackup = stats.backups[0].folder;
      stats.oldestBackup = stats.backups[stats.backups.length - 1].folder;
    }
    
  } catch (error) {
    console.warn('⚠️  Error reading backup stats:', error);
  }
  
  return stats;
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

