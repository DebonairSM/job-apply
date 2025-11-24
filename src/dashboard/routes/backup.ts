import express from 'express';
import { getBackupStats, createBackup } from '../../services/backup-service.js';

const router = express.Router();

// GET /api/backup/info - Get backup information
// Returns backup location, count, last backup, and list of recent backups
router.get('/info', (req, res) => {
  try {
    const stats = getBackupStats();
    
    // Convert to the format expected by the frontend
    if (stats.totalBackups === 0) {
      return res.json({
        lastBackupDate: null,
        lastBackupSize: 0,
        backupCount: 0,
        backupLocation: stats.backupLocation,
        recentBackups: []
      });
    }
    
    const newestBackup = stats.backups[0];
    
    // Return up to 10 most recent backups
    const recentBackups = stats.backups.slice(0, 10).map(backup => ({
      filename: backup.filename,
      date: backup.date.toISOString(),
      size: backup.size,
      timestamp: backup.timestamp
    }));
    
    res.json({
      lastBackupDate: newestBackup.date.toISOString(),
      lastBackupSize: newestBackup.size,
      lastBackupName: newestBackup.filename,
      backupCount: stats.totalBackups,
      backupLocation: stats.backupLocation,
      totalSize: stats.totalSize,
      recentBackups
    });
  } catch (error) {
    console.error('Error fetching backup info:', error);
    res.status(500).json({ 
      error: 'Failed to fetch backup info',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/system/backup-status - Alternative endpoint matching template
router.get('/status', (req, res) => {
  try {
    const stats = getBackupStats();
    
    res.json({
      backupLocation: stats.backupLocation,
      totalBackups: stats.totalBackups,
      totalSize: stats.totalSize,
      lastBackup: stats.newestBackup ? {
        filename: stats.newestBackup,
        date: stats.backups[0]?.date.toISOString() || null,
        size: stats.backups[0]?.size || 0
      } : null,
      recentBackups: stats.backups.slice(0, 10).map(backup => ({
        filename: backup.filename,
        date: backup.date.toISOString(),
        size: backup.size,
        timestamp: backup.timestamp
      }))
    });
  } catch (error) {
    console.error('Error fetching backup status:', error);
    res.status(500).json({ 
      error: 'Failed to fetch backup status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/backup/create - Create a new backup manually
router.post('/create', async (req, res) => {
  try {
    const result = await createBackup();
    
    if (result.success) {
      res.json({
        success: true,
        backupPath: result.backupPath,
        timestamp: result.timestamp,
        backupFiles: result.backupFiles,
        components: result.components,
        sizes: result.sizes,
        message: `Backup created successfully: ${result.backupFiles.length} file(s)`
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Unknown error occurred',
        message: result.error || 'Failed to create backup'
      });
    }
  } catch (error) {
    console.error('Error creating backup:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create backup';
    res.status(500).json({
      success: false,
      error: errorMessage,
      message: errorMessage
    });
  }
});

export default router;
