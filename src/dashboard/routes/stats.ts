import express from 'express';
import { getJobStats, getEnhancedStats, getRecentJobActivity, getComprehensiveActivity } from '../../lib/db.js';

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const stats = getJobStats();
    const enhanced = getEnhancedStats();
    
    // Calculate success rate
    const successRate = stats.total > 0 
      ? Math.round((stats.applied / stats.total) * 100) 
      : 0;
    
    res.json({
      ...stats,
      successRate,
      ...enhanced
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

router.get('/activity', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const activity = getComprehensiveActivity(limit);
    res.json(activity);
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

router.get('/recent-activity', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const activity = getRecentJobActivity(limit);
    res.json(activity);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
});

export default router;

