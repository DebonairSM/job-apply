import express from 'express';
import { getBackupStats, createBackup } from '../../services/backup-service.js';

const router = express.Router();

// GET /api/backup/info - Get backup information
router.get('/info', (req, res) => {
  try {
    const stats = getBackupStats();
    
    // Convert to the format expected by the frontend
    if (stats.totalBackups === 0) {
      return res.json({
        lastBackupDate: null,
        lastBackupSize: 0,
        backupCount: 0,
        backupLocation: stats.backupLocation
      });
    }
    
    const newestBackup = stats.backups[0];
    
    res.json({
      lastBackupDate: newestBackup.date.toISOString(),
      lastBackupSize: newestBackup.size,
      lastBackupName: newestBackup.folder,
      backupCount: stats.totalBackups,
      backupLocation: stats.backupLocation
    });
  } catch (error) {
    console.error('Error fetching backup info:', error);
    res.status(500).json({ error: 'Failed to fetch backup info' });
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
        backupFolder: result.backupFolder,
        timestamp: result.timestamp,
        components: result.components,
        sizes: result.sizes
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create backup'
    });
  }
});

export default router;

