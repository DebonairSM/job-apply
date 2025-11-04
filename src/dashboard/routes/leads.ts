import express from 'express';
import { getLeads, getLeadsCount, getLeadById, getLeadStats, getScrapingRuns, getScrapingRun } from '../../lib/db.js';

const router = express.Router();

// GET /api/leads - List leads with filtering and pagination
router.get('/', (req, res) => {
  try {
    const { search, title, company, location, hasEmail, limit = '50', offset = '0' } = req.query;
    
    const filters = {
      search: search ? String(search) : undefined,
      title: title ? String(title) : undefined,
      company: company ? String(company) : undefined,
      location: location ? String(location) : undefined,
      hasEmail: hasEmail === 'true' ? true : hasEmail === 'false' ? false : undefined,
      limit: parseInt(String(limit), 10),
      offset: parseInt(String(offset), 10)
    };
    
    const leads = getLeads(filters);
    const total = getLeadsCount({
      search: filters.search,
      title: filters.title,
      company: filters.company,
      location: filters.location,
      hasEmail: filters.hasEmail
    });
    
    res.json({
      leads,
      total,
      limit: filters.limit,
      offset: filters.offset
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// GET /api/leads/stats - Get lead statistics
router.get('/stats', (req, res) => {
  try {
    const stats = getLeadStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching lead stats:', error);
    res.status(500).json({ error: 'Failed to fetch lead stats' });
  }
});

// GET /api/leads/runs - List scraping runs
router.get('/runs', (req, res) => {
  try {
    const { limit = '50' } = req.query;
    const runs = getScrapingRuns(parseInt(String(limit), 10));
    res.json(runs);
  } catch (error) {
    console.error('Error fetching scraping runs:', error);
    res.status(500).json({ error: 'Failed to fetch scraping runs' });
  }
});

// GET /api/leads/runs/:id - Get scraping run details
router.get('/runs/:id', (req, res) => {
  try {
    const runId = parseInt(req.params.id, 10);
    const run = getScrapingRun(runId);
    
    if (!run) {
      return res.status(404).json({ error: 'Scraping run not found' });
    }
    
    res.json(run);
  } catch (error) {
    console.error('Error fetching scraping run:', error);
    res.status(500).json({ error: 'Failed to fetch scraping run' });
  }
});

// GET /api/leads/:id - Get single lead
router.get('/:id', (req, res) => {
  try {
    const lead = getLeadById(req.params.id);
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    res.json(lead);
  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

export default router;

