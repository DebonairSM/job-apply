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

// Profile key to friendly name mapping
const PROFILE_NAMES: Record<string, string> = {
  'core': 'Core Azure API',
  'backend': 'Backend/API',
  'core-net': '.NET Development',
  'legacy-modernization': 'Legacy Modernization',
  'contract': 'Contract Roles',
  'aspnet-simple': 'ASP.NET Simple',
  'csharp-azure-no-frontend': 'C# Azure (No Frontend)',
  'az204-csharp': 'AZ-204 C#',
  'ai-enhanced-net': 'AI-Enhanced .NET',
  'legacy-web': 'Legacy Web'
};

// GET /api/analytics/profiles - Profile performance metrics
router.get('/profiles', (req, res) => {
  try {
    const database = getDb();
    const stmt = database.prepare(`
      SELECT 
        COALESCE(profile, 'unknown') as profile_key,
        COUNT(*) as total_jobs,
        SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) as queued,
        SUM(CASE WHEN status = 'applied' THEN 1 ELSE 0 END) as applied,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'interview' THEN 1 ELSE 0 END) as interviews,
        AVG(rank) as avg_fit_score
      FROM jobs
      WHERE profile IS NOT NULL
      GROUP BY profile_key
      HAVING total_jobs > 0
      ORDER BY total_jobs DESC
    `);

    const rows = stmt.all() as Array<{
      profile_key: string;
      total_jobs: number;
      queued: number;
      applied: number;
      rejected: number;
      interviews: number;
      avg_fit_score: number | null;
    }>;

    // Calculate derived metrics for each profile
    const profiles = rows.map(row => {
      const totalJobs = row.total_jobs || 1; // Avoid division by zero
      const applied = row.applied || 0;
      const rejected = row.rejected || 0;
      const interviews = row.interviews || 0;
      
      // Net success rate: ((applied - rejected + (interviews * 2)) / total_jobs) * 100
      // Rejections subtract from success, interviews count double
      const netSuccessRate = ((applied - rejected + (interviews * 2)) / totalJobs) * 100;
      
      // Application rate: percentage of jobs that were applied to
      const applicationRate = (applied / totalJobs) * 100;
      
      return {
        profile_key: row.profile_key,
        profile_name: PROFILE_NAMES[row.profile_key] || row.profile_key,
        total_jobs: row.total_jobs,
        queued: row.queued,
        applied: row.applied,
        rejected: row.rejected,
        interviews: row.interviews,
        avg_fit_score: row.avg_fit_score ? Math.round(row.avg_fit_score * 10) / 10 : 0,
        net_success_rate: Math.round(netSuccessRate * 10) / 10,
        application_rate: Math.round(applicationRate * 10) / 10
      };
    });

    // Sort by net success rate (best performers first)
    profiles.sort((a, b) => b.net_success_rate - a.net_success_rate);

    res.json({ profiles });
  } catch (error) {
    console.error('Error fetching profile analytics:', error);
    res.status(500).json({ error: 'Failed to fetch profile analytics' });
  }
});

export default router;

