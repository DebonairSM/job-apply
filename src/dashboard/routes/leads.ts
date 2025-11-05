import express from 'express';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { getLeads, getLeadsCount, getLeadById, getLeadStats, getScrapingRuns, getScrapingRun, getActiveScrapingRuns, softDeleteLead, getLeadsWithUpcomingBirthdays, deleteIncompleteLeads, updateLeadBackground, updateLeadStatus, createScrapingRun, updateScrapingRun } from '../../lib/db.js';
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

// GET /api/leads/runs/active - Get currently active scraping runs
router.get('/runs/active', (req, res) => {
  try {
    const activeRuns = getActiveScrapingRuns();
    res.json(activeRuns);
  } catch (error) {
    console.error('Error fetching active scraping runs:', error);
    res.status(500).json({ error: 'Failed to fetch active scraping runs' });
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
    
    // Verify CLI exists before spawning
    const cliPath = join(__dirname, '..', '..', '..');
    const cliFilePath = join(cliPath, 'dist', 'cli.js');
    
    if (!existsSync(cliFilePath)) {
      return res.status(500).json({ 
        error: 'CLI not built. Please run "npm run build" first.',
        details: `Missing file: ${cliFilePath}`
      });
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
    
    // Spawn the CLI process with stderr capture for error detection
    let stderrOutput = '';
    const child = spawn('node', args, {
      cwd: cliPath,
      detached: true,
      stdio: ['ignore', 'ignore', 'pipe'], // Capture stderr only
      shell: process.platform === 'win32' // Use shell on Windows
    });
    
    // Store process ID in database
    updateScrapingRun(runId, {
      process_id: child.pid,
      last_activity_at: new Date().toISOString()
    });
    
    // Capture stderr for first 10 seconds to detect immediate failures
    const stderrTimeout = setTimeout(() => {
      if (child.stderr) {
        child.stderr.removeAllListeners();
      }
      // After 10 seconds, detach stderr and allow process to run independently
      child.unref();
    }, 10000);
    
    if (child.stderr) {
      child.stderr.on('data', (data) => {
        stderrOutput += data.toString();
      });
    }
    
    // Monitor for immediate exit (crash within first 5 seconds)
    let hasExited = false;
    const exitHandler = (code: number | null) => {
      hasExited = true;
      clearTimeout(stderrTimeout);
      
      const errorMessage = stderrOutput || `Process exited with code ${code}`;
      console.error(`❌ Scraping process ${child.pid} exited immediately:`, errorMessage);
      
      // Update run status to error
      updateScrapingRun(runId, {
        status: 'error',
        error_message: errorMessage,
        completed_at: new Date().toISOString()
      });
    };
    
    child.on('exit', exitHandler);
    
    // Remove exit listener after 5 seconds if process is still running
    setTimeout(() => {
      if (!hasExited) {
        child.removeListener('exit', exitHandler);
        child.unref(); // Allow parent to exit
      }
    }, 5000);
    
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      error: 'Failed to start scraping process',
      details: errorMessage
    });
  }
});

// POST /api/leads/runs/:id/stop - Stop a scraping run
router.post('/runs/:id/stop', (req, res) => {
  try {
    const runId = parseInt(req.params.id, 10);
    const run = getScrapingRun(runId);
    
    if (!run) {
      return res.status(404).json({ error: 'Scraping run not found' });
    }
    
    if (run.status !== 'in_progress') {
      return res.status(400).json({ error: 'Run is not in progress' });
    }
    
    // Update run status to stopped
    updateScrapingRun(runId, {
      status: 'stopped',
      completed_at: new Date().toISOString()
    });
    
    // If we have a process ID, try to kill it (best effort on Windows)
    if (run.process_id) {
      try {
        // On Windows, use taskkill; on Unix, use kill
        if (process.platform === 'win32') {
          spawn('taskkill', ['/F', '/PID', run.process_id.toString()], { 
            shell: true,
            stdio: 'ignore' 
          });
        } else {
          process.kill(run.process_id, 'SIGTERM');
        }
        console.log(`Attempted to stop process ${run.process_id} for run #${runId}`);
      } catch (error) {
        console.error(`Could not kill process ${run.process_id}:`, error);
        // Don't fail the request - run is marked as stopped in DB
      }
    }
    
    res.json({ 
      success: true,
      message: `Scraping run #${runId} has been stopped`
    });
  } catch (error) {
    console.error('Error stopping scrape:', error);
    res.status(500).json({ error: 'Failed to stop scraping run' });
  }
});

export default router;

