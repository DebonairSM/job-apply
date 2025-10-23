import express from 'express';
import { getJobStats } from '../../lib/db.js';

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const stats = getJobStats();
    
    // Calculate success rate
    const successRate = stats.total > 0 
      ? Math.round((stats.applied / stats.total) * 100) 
      : 0;
    
    res.json({
      ...stats,
      successRate
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;

