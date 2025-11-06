import express, { Request, Response } from 'express';
import { spawn, ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { getLeads, getLeadsCount, getLeadById, getLeadStats, getScrapingRuns, getScrapingRun, getActiveScrapingRuns, softDeleteLead, getLeadsWithUpcomingBirthdays, deleteIncompleteLeads, updateLeadBackground, updateLeadStatus, createScrapingRun, updateScrapingRun } from '../../lib/db.js';
import { generateLeadBackground } from '../../ai/background-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Constants for validation
const VALID_EMAIL_STATUSES = ['not_contacted', 'email_sent', 'replied', 'meeting_scheduled'] as const;
const VALID_CONNECTION_DEGREES = ['1st', '2nd', '3rd'] as const;
const DEFAULT_LIMIT = 50;
const DEFAULT_OFFSET = 0;
const DEFAULT_MAX_PROFILES = 50;
const DEFAULT_BIRTHDAY_DAYS = 30;
const STDERR_CAPTURE_DURATION_MS = 10000;
const IMMEDIATE_EXIT_DETECTION_MS = 5000;

type EmailStatus = typeof VALID_EMAIL_STATUSES[number];
type ConnectionDegree = typeof VALID_CONNECTION_DEGREES[number];

// Type guards
function isValidEmailStatus(status: unknown): status is EmailStatus {
  return typeof status === 'string' && VALID_EMAIL_STATUSES.includes(status as EmailStatus);
}

function isValidConnectionDegree(degree: unknown): degree is ConnectionDegree {
  return typeof degree === 'string' && VALID_CONNECTION_DEGREES.includes(degree as ConnectionDegree);
}

// Utility functions for validation
function parseIntegerParameter(value: unknown, defaultValue: number): number {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  const parsed = parseInt(String(value), 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function parseBooleanParameter(value: unknown): boolean | undefined {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

function sanitizeStringParameter(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  return String(value).trim();
}

// Error response helper
interface ErrorResponse {
  error: string;
  details?: string;
  stack?: string;
}

function sendErrorResponse(res: Response, statusCode: number, error: string, details?: string): void {
  const response: ErrorResponse = { error };
  if (details) {
    response.details = details;
  }
  if (process.env.NODE_ENV === 'development') {
    const stack = new Error().stack;
    if (stack) {
      response.stack = stack;
    }
  }
  res.status(statusCode).json(response);
}

// GET /api/leads - List leads with filtering and pagination
router.get('/', (req: Request, res: Response): void => {
  try {
    const { search, title, company, location, hasEmail, workedTogether, profile, limit, offset } = req.query;
    
    const filters = {
      search: sanitizeStringParameter(search),
      title: sanitizeStringParameter(title),
      company: sanitizeStringParameter(company),
      location: sanitizeStringParameter(location),
      hasEmail: parseBooleanParameter(hasEmail),
      workedTogether: parseBooleanParameter(workedTogether),
      profile: sanitizeStringParameter(profile),
      limit: parseIntegerParameter(limit, DEFAULT_LIMIT),
      offset: parseIntegerParameter(offset, DEFAULT_OFFSET)
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
    sendErrorResponse(res, 500, 'Failed to fetch leads', error instanceof Error ? error.message : undefined);
  }
});

// GET /api/leads/stats - Get lead statistics
router.get('/stats', (req: Request, res: Response): void => {
  try {
    const stats = getLeadStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching lead stats:', error);
    sendErrorResponse(res, 500, 'Failed to fetch lead stats', error instanceof Error ? error.message : undefined);
  }
});

// GET /api/leads/birthdays - Get leads with upcoming birthdays
router.get('/birthdays', (req: Request, res: Response): void => {
  try {
    const { days } = req.query;
    const daysAhead = parseIntegerParameter(days, DEFAULT_BIRTHDAY_DAYS);
    const leads = getLeadsWithUpcomingBirthdays(daysAhead);
    res.json(leads);
  } catch (error) {
    console.error('Error fetching upcoming birthdays:', error);
    sendErrorResponse(res, 500, 'Failed to fetch upcoming birthdays', error instanceof Error ? error.message : undefined);
  }
});

// GET /api/leads/runs - List scraping runs
router.get('/runs', (req: Request, res: Response): void => {
  try {
    const { limit } = req.query;
    const runs = getScrapingRuns(parseIntegerParameter(limit, DEFAULT_LIMIT));
    res.json(runs);
  } catch (error) {
    console.error('Error fetching scraping runs:', error);
    sendErrorResponse(res, 500, 'Failed to fetch scraping runs', error instanceof Error ? error.message : undefined);
  }
});

// GET /api/leads/runs/active - Get currently active scraping runs
router.get('/runs/active', (req: Request, res: Response): void => {
  try {
    const activeRuns = getActiveScrapingRuns();
    res.json(activeRuns);
  } catch (error) {
    console.error('Error fetching active scraping runs:', error);
    sendErrorResponse(res, 500, 'Failed to fetch active scraping runs', error instanceof Error ? error.message : undefined);
  }
});

// GET /api/leads/runs/:id - Get scraping run details
router.get('/runs/:id', (req: Request, res: Response): void => {
  try {
    const runId = parseIntegerParameter(req.params.id, 0);
    if (runId === 0) {
      sendErrorResponse(res, 400, 'Invalid run ID');
      return;
    }
    
    const run = getScrapingRun(runId);
    if (!run) {
      sendErrorResponse(res, 404, 'Scraping run not found');
      return;
    }
    
    res.json(run);
  } catch (error) {
    console.error('Error fetching scraping run:', error);
    sendErrorResponse(res, 500, 'Failed to fetch scraping run', error instanceof Error ? error.message : undefined);
  }
});

// GET /api/leads/:id - Get single lead
router.get('/:id', (req: Request, res: Response): void => {
  try {
    const leadId = sanitizeStringParameter(req.params.id);
    if (!leadId) {
      sendErrorResponse(res, 400, 'Invalid lead ID');
      return;
    }
    
    const lead = getLeadById(leadId);
    if (!lead) {
      sendErrorResponse(res, 404, 'Lead not found');
      return;
    }
    
    res.json(lead);
  } catch (error) {
    console.error('Error fetching lead:', error);
    sendErrorResponse(res, 500, 'Failed to fetch lead', error instanceof Error ? error.message : undefined);
  }
});

// DELETE /api/leads/:id - Soft delete a lead
router.delete('/:id', (req: Request, res: Response): void => {
  try {
    const leadId = sanitizeStringParameter(req.params.id);
    if (!leadId) {
      sendErrorResponse(res, 400, 'Invalid lead ID');
      return;
    }
    
    const success = softDeleteLead(leadId);
    if (!success) {
      sendErrorResponse(res, 404, 'Lead not found or already deleted');
      return;
    }
    
    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Error deleting lead:', error);
    sendErrorResponse(res, 500, 'Failed to delete lead', error instanceof Error ? error.message : undefined);
  }
});

// POST /api/leads/cleanup-incomplete - Remove incomplete leads (missing all data fields)
router.post('/cleanup-incomplete', (req: Request, res: Response): void => {
  try {
    const result = deleteIncompleteLeads();
    
    res.json({
      message: `Removed ${result.deleted} incomplete lead(s)`,
      deleted: result.deleted,
      leads: result.leads
    });
  } catch (error) {
    console.error('Error cleaning up incomplete leads:', error);
    sendErrorResponse(res, 500, 'Failed to cleanup incomplete leads', error instanceof Error ? error.message : undefined);
  }
});

// POST /api/leads/:id/generate-background - Generate AI background for a lead
router.post('/:id/generate-background', async (req: Request, res: Response): Promise<void> => {
  try {
    const leadId = sanitizeStringParameter(req.params.id);
    if (!leadId) {
      sendErrorResponse(res, 400, 'Invalid lead ID');
      return;
    }
    
    const lead = getLeadById(leadId);
    if (!lead) {
      sendErrorResponse(res, 404, 'Lead not found');
      return;
    }
    
    // Generate background using AI
    const background = await generateLeadBackground(lead.title || '', lead.about);
    
    // Save to database
    const success = updateLeadBackground(lead.id, background);
    if (!success) {
      sendErrorResponse(res, 500, 'Failed to update lead background');
      return;
    }
    
    res.json({ background });
  } catch (error) {
    console.error('Error generating lead background:', error);
    sendErrorResponse(res, 500, 'Failed to generate background', error instanceof Error ? error.message : undefined);
  }
});

// PATCH /api/leads/:id/status - Update lead email status
router.patch('/:id/status', (req: Request, res: Response): void => {
  try {
    const leadId = sanitizeStringParameter(req.params.id);
    if (!leadId) {
      sendErrorResponse(res, 400, 'Invalid lead ID');
      return;
    }
    
    const { status } = req.body;
    if (!isValidEmailStatus(status)) {
      sendErrorResponse(res, 400, 'Invalid status', `Status must be one of: ${VALID_EMAIL_STATUSES.join(', ')}`);
      return;
    }
    
    const updated = updateLeadStatus(leadId, status);
    if (!updated) {
      sendErrorResponse(res, 404, 'Lead not found');
      return;
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating lead status:', error);
    sendErrorResponse(res, 500, 'Failed to update status', error instanceof Error ? error.message : undefined);
  }
});

// Helper function to validate scrape request parameters
interface ScrapeRequestParams {
  degree: ConnectionDegree;
  profile?: string;
  titles?: string;
  max: number;
  startPage?: number;
  resume?: number;
}

function validateScrapeRequest(body: Record<string, unknown>): { valid: true; params: ScrapeRequestParams } | { valid: false; error: string; details?: string } {
  const degree = body.degree || '1st';
  const profile = sanitizeStringParameter(body.profile);
  const titles = sanitizeStringParameter(body.titles);
  const max = parseIntegerParameter(body.max, DEFAULT_MAX_PROFILES);
  const startPage = body.startPage ? parseIntegerParameter(body.startPage, 1) : undefined;
  const resume = body.resume ? parseIntegerParameter(body.resume, 0) : undefined;
  
  if (!isValidConnectionDegree(degree)) {
    return {
      valid: false,
      error: 'Invalid connection degree',
      details: `Degree must be one of: ${VALID_CONNECTION_DEGREES.join(', ')}`
    };
  }
  
  if (profile && titles) {
    return {
      valid: false,
      error: 'Cannot use both profile and titles',
      details: 'Choose one filter method'
    };
  }
  
  return {
    valid: true,
    params: { degree, profile, titles, max, startPage, resume }
  };
}

// Helper function to create or resume a scraping run
function createOrResumeRun(params: ScrapeRequestParams): { success: true; runId: number } | { success: false; error: string; statusCode: number } {
  if (params.resume) {
    console.log(`📋 Resuming existing run ID: ${params.resume}`);
    const existingRun = getScrapingRun(params.resume);
    if (!existingRun) {
      console.error('❌ Scraping run not found:', params.resume);
      return {
        success: false,
        error: `Scraping run ${params.resume} not found`,
        statusCode: 404
      };
    }
    return { success: true, runId: params.resume };
  }
  
  console.log('📋 Creating new scraping run...');
  let filterTitlesArray: string[] | undefined;
  
  if (params.profile) {
    // Profile will be resolved by CLI, store profile name in special format
    filterTitlesArray = [`profile:${params.profile}`];
  } else if (params.titles) {
    filterTitlesArray = params.titles.split(',').map((t) => t.trim()).filter(Boolean);
  }
  
  const runId = createScrapingRun({
    status: 'in_progress',
    profiles_scraped: 0,
    profiles_added: 0,
    filter_titles: filterTitlesArray ? JSON.stringify(filterTitlesArray) : undefined,
    max_profiles: params.max,
    connection_degree: params.degree,
    start_page: params.startPage
  });
  
  console.log(`✅ Created scraping run ID: ${runId}`);
  return { success: true, runId };
}

// Helper function to build CLI arguments
function buildCliArguments(params: ScrapeRequestParams): string[] {
  const args = ['src/cli.ts', 'leads:search'];
  
  args.push('--degree', params.degree);
  
  if (params.profile) {
    args.push('--profile', params.profile);
  } else if (params.titles) {
    args.push('--titles', params.titles);
  }
  
  args.push('--max', params.max.toString());
  
  if (params.startPage) {
    args.push('--start-page', params.startPage.toString());
  }
  
  if (params.resume) {
    args.push('--resume', params.resume.toString());
  }
  
  return args;
}

// Helper function to spawn CLI process with monitoring
function spawnScrapingProcess(args: string[], cliPath: string, runId: number): { success: true; child: ChildProcess } | { success: false; error: string } {
  console.log('🚀 Spawning CLI process...');
  console.log('   Command: npx tsx', args.join(' '));
  console.log('   CWD:', cliPath);
  
  let stderrOutput = '';
  const child = spawn('npx', ['tsx', ...args], {
    cwd: cliPath,
    detached: true,
    stdio: ['ignore', 'ignore', 'pipe'],
    shell: process.platform === 'win32'
  });
  
  if (!child.pid) {
    return {
      success: false,
      error: 'Failed to spawn process - no PID assigned'
    };
  }
  
  console.log('✅ Process spawned with PID:', child.pid);
  
  // Update database with process ID
  updateScrapingRun(runId, {
    process_id: child.pid,
    last_activity_at: new Date().toISOString()
  });
  
  // Capture stderr for first 10 seconds to detect immediate failures
  const stderrTimeout = setTimeout(() => {
    if (child.stderr) {
      child.stderr.removeAllListeners();
    }
    child.unref();
  }, STDERR_CAPTURE_DURATION_MS);
  
  if (child.stderr) {
    child.stderr.on('data', (data: Buffer) => {
      stderrOutput += data.toString();
    });
  }
  
  // Monitor for immediate exit (crash within first 5 seconds)
  let hasExited = false;
  const exitHandler = (code: number | null): void => {
    hasExited = true;
    clearTimeout(stderrTimeout);
    
    const errorMessage = stderrOutput || `Process exited with code ${code}`;
    console.error(`❌ Scraping process ${child.pid} exited immediately:`, errorMessage);
    
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
      child.unref();
    }
  }, IMMEDIATE_EXIT_DETECTION_MS);
  
  return { success: true, child };
}

// POST /api/leads/start-scrape - Start a new lead scraping run
router.post('/start-scrape', (req: Request, res: Response): void => {
  console.log('🔍 Received start-scrape request');
  console.log('   Body:', JSON.stringify(req.body, null, 2));
  
  try {
    // Validate request parameters
    const validation = validateScrapeRequest(req.body);
    if (!validation.valid) {
      console.error('❌ Validation failed:', validation.error);
      sendErrorResponse(res, 400, validation.error, validation.details);
      return;
    }
    
    const params = validation.params;
    console.log('📝 Validated parameters:', params);
    
    // Check if there's already an active scraping run (prevent duplicates)
    // Skip this check if resuming an existing run
    if (!params.resume) {
      const activeRuns = getActiveScrapingRuns();
      if (activeRuns.length > 0) {
        console.error('❌ Cannot start scrape: there is already an active scraping run in progress');
        console.error(`   Active run ID(s): ${activeRuns.map(r => r.id).join(', ')}`);
        sendErrorResponse(
          res, 
          409, 
          'A scraping run is already in progress', 
          `Please wait for run #${activeRuns[0].id} to complete or stop it before starting a new one`
        );
        return;
      }
    }
    
    // Verify CLI source file exists
    const cliPath = join(__dirname, '..', '..', '..');
    const cliFilePath = join(cliPath, 'src', 'cli.ts');
    
    if (!existsSync(cliFilePath)) {
      console.error('❌ CLI source not found:', cliFilePath);
      sendErrorResponse(res, 500, 'CLI source not found', `Missing file: ${cliFilePath}`);
      return;
    }
    
    // Create or resume scraping run
    const runResult = createOrResumeRun(params);
    if (!runResult.success) {
      sendErrorResponse(res, runResult.statusCode, runResult.error);
      return;
    }
    
    const runId = runResult.runId;
    
    // Double-check for race condition: if we just created a run (not resuming),
    // verify there are no OTHER active runs that started between our first check
    // and creating this run
    if (!params.resume) {
      const activeRuns = getActiveScrapingRuns();
      const otherActiveRuns = activeRuns.filter(run => run.id !== runId);
      
      if (otherActiveRuns.length > 0) {
        console.error('❌ Race condition detected: another scraping run started simultaneously');
        console.error(`   This run ID: ${runId}`);
        console.error(`   Other active run ID(s): ${otherActiveRuns.map(r => r.id).join(', ')}`);
        
        // Let the FIRST created run (lowest ID) win, cancel the others
        // This ensures one run always succeeds in a race condition
        const lowestActiveRunId = Math.min(runId, ...otherActiveRuns.map(r => r.id));
        
        if (runId !== lowestActiveRunId) {
          console.error(`   ❌ This run (ID: ${runId}) was not first, cancelling it`);
          
          // Mark this run as cancelled since we detected a race condition
          updateScrapingRun(runId, {
            status: 'stopped',
            completed_at: new Date().toISOString(),
            error_message: 'Cancelled due to concurrent scraping run'
          });
          
          sendErrorResponse(
            res, 
            409, 
            'A scraping run is already in progress', 
            `Run #${lowestActiveRunId} started simultaneously and will continue. Please wait for it to complete.`
          );
          return;
        } else {
          // This run has the lowest ID, so it wins. Cancel the others.
          console.log(`   ✅ This run (ID: ${runId}) was first, proceeding. Cancelling other runs.`);
          
          for (const otherRun of otherActiveRuns) {
            console.log(`   ❌ Cancelling run ID: ${otherRun.id}`);
            updateScrapingRun(otherRun.id, {
              status: 'stopped',
              completed_at: new Date().toISOString(),
              error_message: 'Cancelled due to concurrent scraping run with lower ID'
            });
          }
        }
      }
    }
    
    // Build CLI command arguments
    const args = buildCliArguments(params);
    
    // Spawn the CLI process
    const spawnResult = spawnScrapingProcess(args, cliPath, runId);
    if (!spawnResult.success) {
      console.error('❌ Failed to spawn process:', spawnResult.error);
      sendErrorResponse(res, 500, 'Failed to spawn scraping process', spawnResult.error);
      return;
    }
    
    const child = spawnResult.child;
    
    // Log success
    console.log(`🚀 Started lead scraping process (PID: ${child.pid})`);
    console.log(`   Connection Degree: ${params.degree}`);
    console.log(`   Run ID: ${runId}`);
    if (params.profile) console.log(`   Profile: ${params.profile}`);
    if (params.titles) console.log(`   Titles: ${params.titles}`);
    console.log(`   Max: ${params.max}`);
    
    res.json({
      success: true,
      runId,
      message: `Lead scraping started in the background with connection degree: ${params.degree}`,
      pid: child.pid
    });
  } catch (error) {
    console.error('❌ Error starting scrape:');
    console.error('   Error type:', error?.constructor?.name);
    console.error('   Error message:', error instanceof Error ? error.message : String(error));
    console.error('   Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    
    sendErrorResponse(
      res,
      500,
      'Failed to start scraping process',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});

// POST /api/leads/runs/:id/stop - Stop a scraping run
router.post('/runs/:id/stop', (req: Request, res: Response): void => {
  try {
    const runId = parseIntegerParameter(req.params.id, 0);
    if (runId === 0) {
      sendErrorResponse(res, 400, 'Invalid run ID');
      return;
    }
    
    const run = getScrapingRun(runId);
    if (!run) {
      sendErrorResponse(res, 404, 'Scraping run not found');
      return;
    }
    
    if (run.status !== 'in_progress') {
      sendErrorResponse(res, 400, 'Run is not in progress');
      return;
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
    sendErrorResponse(res, 500, 'Failed to stop scraping run', error instanceof Error ? error.message : undefined);
  }
});

export default router;

