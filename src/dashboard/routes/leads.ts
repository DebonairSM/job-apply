import express from 'express';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getLeads, getLeadsCount, getLeadById, getLeadStats, getScrapingRuns, getScrapingRun, softDeleteLead, getLeadsWithUpcomingBirthdays, deleteIncompleteLeads, updateLeadBackground, updateLeadStatus, createScrapingRun } from '../../lib/db.js';
import { generateLeadBackground } from '../../ai/background-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// GET /api/leads - List leads with filtering and pagination
router.get('/', (req, res) => {
  try {
    const { search, title, company, location, hasEmail, workedTogether, profile, limit = '50', offset = '0' } = req.query;
    
    const filters = {
      search: search ? String(search) : undefined,
      title: title ? String(title) : undefined,
      company: company ? String(company) : undefined,
      location: location ? String(location) : undefined,
      hasEmail: hasEmail === 'true' ? true : hasEmail === 'false' ? false : undefined,
      workedTogether: workedTogether === 'true' ? true : workedTogether === 'false' ? false : undefined,
      profile: profile ? String(profile) : undefined,
      limit: parseInt(String(limit), 10),
      offset: parseInt(String(offset), 10)
    };
    
    const leads = getLeads(filters);
    const total = getLeadsCount({
      search: filters.search,
      title: filters.title,
      company: filters.company,
      location: filters.location,
      hasEmail: filters.hasEmail,
      workedTogether: filters.workedTogether,
      profile: filters.profile
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

// GET /api/leads/birthdays - Get leads with upcoming birthdays
router.get('/birthdays', (req, res) => {
  try {
    const { days = '30' } = req.query;
    const daysAhead = parseInt(String(days), 10);
    const leads = getLeadsWithUpcomingBirthdays(daysAhead);
    res.json(leads);
  } catch (error) {
    console.error('Error fetching upcoming birthdays:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming birthdays' });
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

// DELETE /api/leads/:id - Soft delete a lead
router.delete('/:id', (req, res) => {
  try {
    const success = softDeleteLead(req.params.id);
    
    if (!success) {
      return res.status(404).json({ error: 'Lead not found or already deleted' });
    }
    
    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

// POST /api/leads/cleanup-incomplete - Remove incomplete leads (missing all data fields)
router.post('/cleanup-incomplete', (req, res) => {
  try {
    const result = deleteIncompleteLeads();
    
    res.json({
      message: `Removed ${result.deleted} incomplete lead(s)`,
      deleted: result.deleted,
      leads: result.leads
    });
  } catch (error) {
    console.error('Error cleaning up incomplete leads:', error);
    res.status(500).json({ error: 'Failed to cleanup incomplete leads' });
  }
});

// POST /api/leads/:id/generate-background - Generate AI background for a lead
router.post('/:id/generate-background', async (req, res) => {
  try {
    const lead = getLeadById(req.params.id);
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    // Generate background using AI
    const background = await generateLeadBackground(lead.title || '', lead.about);
    
    // Save to database
    const success = updateLeadBackground(lead.id, background);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to update lead background' });
    }
    
    res.json({ background });
  } catch (error) {
    console.error('Error generating lead background:', error);
    res.status(500).json({ error: 'Failed to generate background' });
  }
});

// PATCH /api/leads/:id/status - Update lead email status
router.patch('/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['not_contacted', 'email_sent', 'replied', 'meeting_scheduled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const updated = updateLeadStatus(id, status);
    if (!updated) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating lead status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// POST /api/leads/start-scrape - Start a new lead scraping run
router.post('/start-scrape', (req, res) => {
  try {
    const { degree = '1st', profile, titles, max = 50, startPage, resume } = req.body;
    
    // Validate degree
    if (!['1st', '2nd', '3rd'].includes(degree)) {
      return res.status(400).json({ error: 'Invalid connection degree. Must be 1st, 2nd, or 3rd.' });
    }
    
    // Validate that either profile or titles is provided (or neither for all)
    if (profile && titles) {
      return res.status(400).json({ error: 'Cannot use both profile and titles. Choose one.' });
    }
    
    // Create scraping run in database if not resuming
    let runId: number;
    if (resume) {
      runId = parseInt(resume.toString(), 10);
      const existingRun = getScrapingRun(runId);
      if (!existingRun) {
        return res.status(404).json({ error: `Scraping run ${runId} not found` });
      }
    } else {
      // Determine filter titles for database record
      let filterTitlesArray: string[] | undefined;
      if (profile) {
        // Profile will be resolved by CLI, we don't have access to LEAD_PROFILES here
        // Store the profile name in a special format
        filterTitlesArray = [`profile:${profile}`];
      } else if (titles) {
        filterTitlesArray = titles.split(',').map((t: string) => t.trim());
      }
      
      runId = createScrapingRun({
        status: 'in_progress',
        profiles_scraped: 0,
        profiles_added: 0,
        filter_titles: filterTitlesArray ? JSON.stringify(filterTitlesArray) : undefined,
        max_profiles: max
      });
    }
    
    // Build CLI command arguments
    const args = ['dist/cli.js', 'leads:search'];
    
    // Add degree
    args.push('--degree', degree);
    
    // Add profile or titles
    if (profile) {
      args.push('--profile', profile);
    } else if (titles) {
      args.push('--titles', titles);
    }
    
    // Add max
    args.push('--max', max.toString());
    
    // Add optional parameters
    if (startPage) {
      args.push('--start-page', startPage.toString());
    }
    
    if (resume) {
      args.push('--resume', resume.toString());
    }
    
    // Spawn the CLI process in detached mode
    const cliPath = join(__dirname, '..', '..', '..');
    const child = spawn('node', args, {
      cwd: cliPath,
      detached: true,
      stdio: 'ignore', // Ignore stdio to allow parent to exit
      shell: process.platform === 'win32' // Use shell on Windows
    });
    
    // Allow parent process to exit independently
    child.unref();
    
    // Log the spawned process
    console.log(`🚀 Started lead scraping process (PID: ${child.pid})`);
    console.log(`   Connection Degree: ${degree}`);
    console.log(`   Run ID: ${runId}`);
    if (profile) console.log(`   Profile: ${profile}`);
    if (titles) console.log(`   Titles: ${titles}`);
    console.log(`   Max: ${max}`);
    
    res.json({
      success: true,
      runId,
      message: `Lead scraping started in the background with connection degree: ${degree}`,
      pid: child.pid
    });
  } catch (error) {
    console.error('Error starting scrape:', error);
    res.status(500).json({ error: 'Failed to start scraping process' });
  }
});

export default router;

