import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createWriteStream } from 'fs';
import archiver from 'archiver';
import { getDb } from '../lib/db.js';
import { APP_NAME } from '../constants/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Source paths
const DB_PATH = join(__dirname, '../../data/app.db');
const STORAGE_STATE_PATH = join(__dirname, '../../storage/storageState.json');
const ARTIFACTS_DIR = join(__dirname, '../../artifacts');

// Backup retention: keep N most recent backups (default: 10)
const DEFAULT_RETENTION_COUNT = 10;

// App name in PascalCase for folder name
const APP_NAME_PASCAL = 'Opportunities';
// App name in lowercase for file prefix
const APP_NAME_LOWER = APP_NAME.toLowerCase();

export interface BackupMetadata {
  success: boolean;
  backupPath: string;
  timestamp: string;
  backupFiles: string[];
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

export interface BackupFileInfo {
  filename: string;
  date: Date;
  size: number;
  timestamp: string;
}

export interface BackupStats {
  backupLocation: string;
  totalBackups: number;
  totalSize: number;
  oldestBackup: string | null;
  newestBackup: string | null;
  backups: BackupFileInfo[];
}

export interface BackupConfig {
  keepCount?: number;
  environment?: string;
}

/**
 * Read environment variable from .env file or process.env
 * Returns the value or default if not found
 */
function getEnvironment(): string {
  // First check process.env (system environment takes precedence)
  if (process.env.ENVIRONMENT) {
    return process.env.ENVIRONMENT;
  }

  // Try to read from .env file
  try {
    const envPath = join(__dirname, '../../.env');
    if (existsSync(envPath)) {
      const envContent = readFileSync(envPath, 'utf-8');
      for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const envKey = key.trim();
          const envValue = valueParts.join('=').trim();
          if (envKey === 'ENVIRONMENT') {
            return envValue;
          }
        }
      }
    }
  } catch (error) {
    // Ignore errors reading .env file
  }

  // Default to 'dev' if not specified
  return 'dev';
}

/**
 * Get the backup directory path
 * Returns: backups/{AppName}/ (shared parent, app-specific subfolder)
 * Priority:
 * 1. BACKUP_PATH environment variable (if set, should point to app-specific folder)
 * 2. OneDrive Documents/backups/{AppName} (if OneDrive exists)
 * 3. Documents/backups/{AppName} (regular Documents folder)
 * 4. Local data/backups/{AppName} (fallback)
 */
export function getBackupDirectory(): string {
  // Check for explicit backup path in environment variable
  if (process.env.BACKUP_PATH) {
    const customPath = process.env.BACKUP_PATH;
    try {
      if (!existsSync(customPath)) {
        mkdirSync(customPath, { recursive: true });
      }
      return customPath;
    } catch (error) {
      console.warn(`⚠️  Could not use BACKUP_PATH="${customPath}", falling back to default:`, error);
    }
  }
  
  const userProfile = process.env.USERPROFILE || process.env.HOME;
  
  if (!userProfile) {
    console.warn('⚠️  Could not determine user profile directory, using local backup');
    return join(__dirname, '../../data/backups', APP_NAME_PASCAL);
  }
  
  // Check for OneDrive Documents folder first (common on Windows)
  // Use shared backups directory with app-specific subfolder
  const oneDriveBackups = join(userProfile, 'OneDrive', 'Documents', 'backups', APP_NAME_PASCAL);
  const regularBackups = join(userProfile, 'Documents', 'backups', APP_NAME_PASCAL);
  
  // Try OneDrive Documents location first
  let backupDir = regularBackups;
  
  // Check if OneDrive Documents exists
  const oneDriveDocsParent = join(userProfile, 'OneDrive', 'Documents');
  if (existsSync(oneDriveDocsParent)) {
    backupDir = oneDriveBackups;
  }
  
  // Ensure directory exists
  try {
    ensureDirectoryExists(backupDir);
    return backupDir;
  } catch (error) {
    console.warn('⚠️  Could not create backup directory, using local backup');
    const localBackup = join(__dirname, '../../data/backups', APP_NAME_PASCAL);
    ensureDirectoryExists(localBackup);
    return localBackup;
  }
}

/**
 * Ensure directory exists and is writable
 * Creates directory if needed and verifies write permissions
 */
export function ensureDirectoryExists(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
  
  // Verify write permissions by attempting to create a test file
  try {
    const testFile = join(dirPath, '.write-test');
    writeFileSync(testFile, 'test');
    rmSync(testFile);
  } catch (error) {
    throw new Error(`Backup directory is not writable: ${dirPath}`);
  }
}

/**
 * Parse timestamp from backup filename
 * Format: {app-name}-{env}-{timestamp}.{extension}
 * Timestamp format: YYYY-MM-DD_HH-MM-SS-mmmZ
 * Returns Date object or null if parsing fails
 */
export function parseTimestampFromFilename(filename: string): Date | null {
  // Match pattern: appname-env-YYYY-MM-DD_HH-MM-SS-mmmZ.extension
  const match = filename.match(/\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}-\d{3}Z/);
  if (!match) {
    return null;
  }
  
  try {
    // Convert to ISO format: YYYY-MM-DDTHH:MM:SS.mmmZ
    const timestampStr = match[0].replace(/_/, 'T').replace(/-/g, (match, offset) => {
      // Replace all dashes except the ones in date/time separators
      if (offset === 10) return 'T'; // Date/time separator
      if (offset === 13 || offset === 16) return ':'; // Time separators
      if (offset === 19) return '.'; // Milliseconds separator
      return '-';
    });
    
    return new Date(timestampStr);
  } catch (error) {
    return null;
  }
}

/**
 * Generate timestamp string for backup filenames
 * Format: YYYY-MM-DD_HH-MM-SS-mmmZ
 */
function generateTimestamp(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minutes = String(now.getUTCMinutes()).padStart(2, '0');
  const seconds = String(now.getUTCSeconds()).padStart(2, '0');
  const milliseconds = String(now.getUTCMilliseconds()).padStart(3, '0');
  
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}-${milliseconds}Z`;
}

/**
 * Get the size of a file in bytes
 */
function getFileSize(filePath: string): number {
  try {
    if (!existsSync(filePath)) {
      return 0;
    }
    const stats = statSync(filePath);
    return stats.isFile() ? stats.size : 0;
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
 * Compress artifacts directory to zip file
 */
async function compressArtifacts(sourceDir: string, outputPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    if (!existsSync(sourceDir)) {
      resolve(0);
      return;
    }

    // Check if directory has content
    try {
      const files = readdirSync(sourceDir);
      if (files.length === 0) {
        resolve(0);
        return;
      }
    } catch (error) {
      resolve(0);
      return;
    }

    const output = createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      resolve(archive.pointer());
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

/**
 * Create restore instructions file in backup directory
 * Includes actual paths and step-by-step restore commands
 */
export function createRestoreInstructions(backupDir: string, sourceDbPath: string): void {
  const restoreFilePath = join(backupDir, `${APP_NAME_PASCAL}-RESTORE.md`);
  
  const instructions = `# ${APP_NAME_PASCAL} Database Restore Instructions

## Backup Location
\`${backupDir}\`

## Source Database Location
\`${sourceDbPath}\`

## Important Notes

- **Stop the application** before restoring a backup
- The parent \`backups\` directory is shared by multiple applications
- This folder (\`${APP_NAME_PASCAL}\`) is dedicated to ${APP_NAME_PASCAL} backups only
- Always verify the backup file before restoring

## Restore Steps (Windows)

### 1. Stop the Application
Make sure the application is not running. Close all instances.

### 2. Locate Your Backup File
Navigate to the backup directory:
\`\`\`
${backupDir}
\`\`\`

Find the backup file you want to restore. Files are named:
\`${APP_NAME_LOWER}-{env}-{timestamp}.db\`

### 3. Backup Current Database (Safety)
Before restoring, create a backup of your current database:
\`\`\`powershell
Copy-Item "${sourceDbPath}" "${sourceDbPath}.backup-$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss')"
\`\`\`

### 4. Restore Database
Replace the current database with the backup:
\`\`\`powershell
Copy-Item "${backupDir}\\${APP_NAME_LOWER}-{env}-{timestamp}.db" "${sourceDbPath}" -Force
\`\`\`

Replace \`{env}\` and \`{timestamp}\` with the actual values from your backup filename.

### 5. Restore Session (Optional)
If you have a session backup file (\`*-session.json\`), restore it:
\`\`\`powershell
$sourceDir = Split-Path -Parent "${sourceDbPath}"
Copy-Item "${backupDir}\\${APP_NAME_LOWER}-{env}-{timestamp}-session.json" "$sourceDir\\..\\storage\\storageState.json" -Force
\`\`\`

### 6. Restore Artifacts (Optional)
If you have an artifacts backup file (\`*-artifacts.zip\`), extract it:
\`\`\`powershell
$sourceDir = Split-Path -Parent "${sourceDbPath}"
Expand-Archive -Path "${backupDir}\\${APP_NAME_LOWER}-{env}-{timestamp}-artifacts.zip" -DestinationPath "$sourceDir\\..\\artifacts" -Force
\`\`\`

### 7. Verify Restore
Start the application and verify that your data has been restored correctly.

## Restore Steps (Mac/Linux)

### 1. Stop the Application
\`\`\`bash
# Find and stop the application process
\`\`\`

### 2. Locate Your Backup File
\`\`\`bash
cd "${backupDir}"
ls -la
\`\`\`

### 3. Backup Current Database (Safety)
\`\`\`bash
cp "${sourceDbPath}" "${sourceDbPath}.backup-$(date +%Y-%m-%d_%H-%M-%S)"
\`\`\`

### 4. Restore Database
\`\`\`bash
cp "${backupDir}/${APP_NAME_LOWER}-{env}-{timestamp}.db" "${sourceDbPath}"
\`\`\`

### 5. Restore Session (Optional)
\`\`\`bash
cp "${backupDir}/${APP_NAME_LOWER}-{env}-{timestamp}-session.json" "$(dirname "${sourceDbPath}")/../storage/storageState.json"
\`\`\`

### 6. Restore Artifacts (Optional)
\`\`\`bash
unzip -o "${backupDir}/${APP_NAME_LOWER}-{env}-{timestamp}-artifacts.zip" -d "$(dirname "${sourceDbPath}")/../artifacts"
\`\`\`

### 7. Verify Restore
Start the application and verify that your data has been restored correctly.

## Troubleshooting

- If restore fails, check file permissions
- Ensure the backup file is not corrupted
- Verify the source database path is correct
- Check that the application is fully stopped before restoring
`;

  try {
    writeFileSync(restoreFilePath, instructions, 'utf-8');
  } catch (error) {
    console.warn('⚠️  Could not create restore instructions file:', error);
  }
}

/**
 * Clean up old backups, keeping only the N most recent
 * Sorts backups by filename timestamp (not file mtime) for accuracy
 */
export async function cleanOldBackups(backupDir: string, keepCount: number = DEFAULT_RETENTION_COUNT): Promise<number> {
  if (!existsSync(backupDir)) {
    return 0;
  }

  try {
    const entries = readdirSync(backupDir);
    
    // Find all backup database files (main backup files)
    const backupFiles: Array<{ filename: string; timestamp: Date; fullPath: string }> = [];
    
    for (const entry of entries) {
      // Look for database backup files: {app-name}-{env}-{timestamp}.db
      if (entry.startsWith(`${APP_NAME_LOWER}-`) && entry.endsWith('.db')) {
        const timestamp = parseTimestampFromFilename(entry);
        if (timestamp) {
          backupFiles.push({
            filename: entry,
            timestamp,
            fullPath: join(backupDir, entry)
          });
        }
      }
    }
    
    // Sort by timestamp (newest first)
    backupFiles.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // Delete backups beyond retention count
    let deletedCount = 0;
    for (let i = keepCount; i < backupFiles.length; i++) {
      const backup = backupFiles[i];
      const timestamp = backup.timestamp.toISOString().replace(/[:.]/g, '-').slice(0, 19);
      
      // Delete all files related to this backup (db, wal, shm, session, artifacts)
      const basePattern = backup.filename.replace(/\.db$/, '');
      const relatedFiles = [
        `${basePattern}.db`,
        `${basePattern}.db-wal`,
        `${basePattern}.db-shm`,
        `${basePattern}-session.json`,
        `${basePattern}-artifacts.zip`
      ];
      
      for (const relatedFile of relatedFiles) {
        const relatedPath = join(backupDir, relatedFile);
        if (existsSync(relatedPath)) {
          try {
            rmSync(relatedPath, { force: true });
            deletedCount++;
          } catch (error) {
            console.warn(`⚠️  Could not delete backup file: ${relatedFile}`, error);
          }
        }
      }
    }
    
    return deletedCount;
  } catch (error) {
    console.warn('⚠️  Error during backup cleanup:', error);
    return 0;
  }
}

/**
 * Create a backup of the database, session, and artifacts
 * Uses new file naming convention: {app-name}-{env}-{timestamp}.{extension}
 */
export async function createBackup(config?: BackupConfig): Promise<BackupMetadata> {
  const environment = config?.environment || getEnvironment();
  const timestamp = generateTimestamp();
  const backupDir = getBackupDirectory();
  
  // Ensure backup directory exists
  ensureDirectoryExists(backupDir);
  
  const filePrefix = `${APP_NAME_LOWER}-${environment}-${timestamp}`;
  const backupFiles: string[] = [];
  
  const metadata: BackupMetadata = {
    success: false,
    backupPath: backupDir,
    timestamp,
    backupFiles: [],
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
    // Verify source database exists
    if (!existsSync(DB_PATH)) {
      throw new Error(`Source database not found: ${DB_PATH}`);
    }
    
    // 1. Backup database
    checkpointDatabase();
    
    const dbBackupPath = join(backupDir, `${filePrefix}.db`);
    copyFileSync(DB_PATH, dbBackupPath);
    metadata.components.database = true;
    metadata.sizes.database = getFileSize(dbBackupPath);
    backupFiles.push(`${filePrefix}.db`);
    
    // Also copy WAL and SHM files if they exist
    const walPath = `${DB_PATH}-wal`;
    const shmPath = `${DB_PATH}-shm`;
    
    if (existsSync(walPath)) {
      const walBackupPath = join(backupDir, `${filePrefix}.db-wal`);
      copyFileSync(walPath, walBackupPath);
      backupFiles.push(`${filePrefix}.db-wal`);
    }
    
    if (existsSync(shmPath)) {
      const shmBackupPath = join(backupDir, `${filePrefix}.db-shm`);
      copyFileSync(shmPath, shmBackupPath);
      backupFiles.push(`${filePrefix}.db-shm`);
    }
    
    // 2. Backup session (if exists)
    if (existsSync(STORAGE_STATE_PATH)) {
      const sessionBackupPath = join(backupDir, `${filePrefix}-session.json`);
      copyFileSync(STORAGE_STATE_PATH, sessionBackupPath);
      metadata.components.session = true;
      metadata.sizes.session = getFileSize(sessionBackupPath);
      backupFiles.push(`${filePrefix}-session.json`);
    }
    
    // 3. Backup artifacts folder (if exists and not empty)
    if (existsSync(ARTIFACTS_DIR)) {
      try {
        const files = readdirSync(ARTIFACTS_DIR);
        if (files.length > 0) {
          const artifactsBackupPath = join(backupDir, `${filePrefix}-artifacts.zip`);
          const artifactsSize = await compressArtifacts(ARTIFACTS_DIR, artifactsBackupPath);
          if (artifactsSize > 0) {
            metadata.components.artifacts = true;
            metadata.sizes.artifacts = artifactsSize;
            backupFiles.push(`${filePrefix}-artifacts.zip`);
          }
        }
      } catch (error) {
        console.warn('⚠️  Could not backup artifacts:', error);
      }
    }
    
    // Calculate total size
    metadata.sizes.total = metadata.sizes.database + metadata.sizes.session + metadata.sizes.artifacts;
    metadata.backupFiles = backupFiles;
    metadata.success = true;
    
    // Create/update restore instructions
    createRestoreInstructions(backupDir, DB_PATH);
    
    // Clean up old backups
    const keepCount = config?.keepCount || DEFAULT_RETENTION_COUNT;
    await cleanOldBackups(backupDir, keepCount);
    
  } catch (error) {
    metadata.success = false;
    metadata.error = error instanceof Error ? error.message : 'Unknown error';
  }
  
  return metadata;
}

/**
 * Get statistics about existing backups
 * Works with new file naming format
 */
export function getBackupStats(): BackupStats {
  const backupLocation = getBackupDirectory();
  
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
    
    // Find all backup database files and group by timestamp
    const backupGroups = new Map<string, BackupFileInfo>();
    
    for (const entry of entries) {
      // Look for database backup files: {app-name}-{env}-{timestamp}.db
      if (entry.startsWith(`${APP_NAME_LOWER}-`) && entry.endsWith('.db')) {
        const timestamp = parseTimestampFromFilename(entry);
        if (timestamp) {
          const timestampStr = entry.match(/\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}-\d{3}Z/)?.[0] || '';
          
          if (!backupGroups.has(timestampStr)) {
            // Calculate total size for this backup (db + related files)
            let totalSize = getFileSize(join(backupLocation, entry));
            
            const basePattern = entry.replace(/\.db$/, '');
            const relatedFiles = [
              `${basePattern}.db-wal`,
              `${basePattern}.db-shm`,
              `${basePattern}-session.json`,
              `${basePattern}-artifacts.zip`
            ];
            
            for (const relatedFile of relatedFiles) {
              totalSize += getFileSize(join(backupLocation, relatedFile));
            }
            
            backupGroups.set(timestampStr, {
              filename: entry,
              date: timestamp,
              size: totalSize,
              timestamp: timestampStr
            });
          }
        }
      }
    }
    
    // Convert to array and sort by date (newest first)
    stats.backups = Array.from(backupGroups.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
    
    stats.totalBackups = stats.backups.length;
    
    // Calculate total size
    for (const backup of stats.backups) {
      stats.totalSize += backup.size;
    }
    
    if (stats.backups.length > 0) {
      stats.newestBackup = stats.backups[0].filename;
      stats.oldestBackup = stats.backups[stats.backups.length - 1].filename;
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

// Legacy function name for backward compatibility
export function getMyDocumentsPath(): string {
  return getBackupDirectory();
}
