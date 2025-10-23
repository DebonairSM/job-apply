import express from 'express';
import { getRunHistory } from '../../lib/db.js';

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const { jobId, limit = '50' } = req.query;
    
    const limitNum = parseInt(String(limit), 10);
    const jobIdFilter = jobId ? String(jobId) : undefined;
    
    const runs = getRunHistory(jobIdFilter, limitNum);
    
    res.json({
      runs,
      total: runs.length
    });
  } catch (error) {
    console.error('Error fetching runs:', error);
    res.status(500).json({ error: 'Failed to fetch run history' });
  }
});

export default router;

