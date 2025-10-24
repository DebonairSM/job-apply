import express from 'express';
import { getDb } from '../../lib/db.js';

const router = express.Router();

// GET /api/analytics/timeline - Application trends over time
router.get('/timeline', (req, res) => {
  try {
    const { days = '30' } = req.query;
    const daysAgo = parseInt(String(days), 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    const database = getDb();
    const stmt = database.prepare(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'applied' THEN 1 ELSE 0 END) as applied,
        SUM(CASE WHEN applied_method = 'manual' THEN 1 ELSE 0 END) as manual,
        SUM(CASE WHEN applied_method = 'automatic' THEN 1 ELSE 0 END) as automatic
      FROM jobs
      WHERE created_at >= ?
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    const rows = stmt.all(startDate.toISOString()) as Array<{
      date: string;
      total: number;
      applied: number;
      manual: number;
      automatic: number;
    }>;

    res.json({ timeline: rows });
  } catch (error) {
    console.error('Error fetching timeline:', error);
    res.status(500).json({ error: 'Failed to fetch timeline data' });
  }
});

// GET /api/analytics/methods - Manual vs automatic breakdown
router.get('/methods', (req, res) => {
  try {
    const database = getDb();
    const stmt = database.prepare(`
      SELECT 
        applied_method,
        COUNT(*) as count,
        AVG(rank) as avg_rank
      FROM jobs
      WHERE status = 'applied' AND applied_method IS NOT NULL
      GROUP BY applied_method
    `);

    const rows = stmt.all() as Array<{
      applied_method: string;
      count: number;
      avg_rank: number;
    }>;

    const methodBreakdown = {
      manual: rows.find(r => r.applied_method === 'manual') || { count: 0, avg_rank: 0 },
      automatic: rows.find(r => r.applied_method === 'automatic') || { count: 0, avg_rank: 0 }
    };

    res.json(methodBreakdown);
  } catch (error) {
    console.error('Error fetching methods breakdown:', error);
    res.status(500).json({ error: 'Failed to fetch methods breakdown' });
  }
});

// GET /api/analytics/companies - Per-company statistics
router.get('/companies', (req, res) => {
  try {
    const { limit = '20' } = req.query;
    const limitNum = parseInt(String(limit), 10);

    const database = getDb();
    const stmt = database.prepare(`
      SELECT 
        company,
        COUNT(*) as total_jobs,
        SUM(CASE WHEN status = 'applied' THEN 1 ELSE 0 END) as applied,
        SUM(CASE WHEN status = 'interview' THEN 1 ELSE 0 END) as interviews,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        AVG(rank) as avg_rank
      FROM jobs
      GROUP BY company
      HAVING total_jobs > 0
      ORDER BY total_jobs DESC, applied DESC
      LIMIT ?
    `);

    const rows = stmt.all(limitNum) as Array<{
      company: string;
      total_jobs: number;
      applied: number;
      interviews: number;
      rejected: number;
      avg_rank: number;
    }>;

    // Calculate success rate for each company
    const companies = rows.map(row => ({
      ...row,
      success_rate: row.total_jobs > 0 ? Math.round((row.applied / row.total_jobs) * 100) : 0
    }));

    res.json({ companies });
  } catch (error) {
    console.error('Error fetching company stats:', error);
    res.status(500).json({ error: 'Failed to fetch company statistics' });
  }
});

// GET /api/analytics/ranks - Rank distribution
router.get('/ranks', (req, res) => {
  try {
    const database = getDb();
    const stmt = database.prepare(`
      SELECT 
        CASE 
          WHEN rank >= 90 THEN '90-100'
          WHEN rank >= 80 THEN '80-89'
          WHEN rank >= 70 THEN '70-79'
          WHEN rank >= 60 THEN '60-69'
          WHEN rank >= 50 THEN '50-59'
          WHEN rank >= 40 THEN '40-49'
          WHEN rank >= 30 THEN '30-39'
          WHEN rank >= 20 THEN '20-29'
          WHEN rank >= 10 THEN '10-19'
          ELSE '0-9'
        END as rank_range,
        COUNT(*) as count
      FROM jobs
      WHERE rank IS NOT NULL
      GROUP BY rank_range
      ORDER BY rank_range DESC
    `);

    const rows = stmt.all() as Array<{
      rank_range: string;
      count: number;
    }>;

    res.json({ distribution: rows });
  } catch (error) {
    console.error('Error fetching rank distribution:', error);
    res.status(500).json({ error: 'Failed to fetch rank distribution' });
  }
});

export default router;

