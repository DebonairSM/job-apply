import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// GET /api/backup/info - Get last backup information
router.get('/info', (req, res) => {
  try {
    const backupDir = path.join(__dirname, '../../../data/backups');
    
    if (!fs.existsSync(backupDir)) {
      return res.json({
        lastBackupDate: null,
        lastBackupSize: 0,
        backupCount: 0
      });
    }

    const files = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.db'))
      .map(f => {
        const filePath = path.join(backupDir, f);
        const stats = fs.statSync(filePath);
        return {
          name: f,
          path: filePath,
          size: stats.size,
          date: stats.mtime
        };
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    if (files.length === 0) {
      return res.json({
        lastBackupDate: null,
        lastBackupSize: 0,
        backupCount: 0
      });
    }

    const lastBackup = files[0];
    
    res.json({
      lastBackupDate: lastBackup.date.toISOString(),
      lastBackupSize: lastBackup.size,
      lastBackupName: lastBackup.name,
      backupCount: files.length
    });
  } catch (error) {
    console.error('Error fetching backup info:', error);
    res.status(500).json({ error: 'Failed to fetch backup info' });
  }
});

export default router;

