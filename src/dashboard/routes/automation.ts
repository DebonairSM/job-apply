import { Router, Request, Response } from 'express';
import { spawn, ChildProcess } from 'child_process';
import { z } from 'zod';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createStopSignal, clearStopSignal } from '../../lib/stop-signal.js';

const router = Router();

// Validation schemas
const SearchOptionsSchema = z.object({
  profile: z.enum(['core', 'security', 'event-driven', 'performance', 'devops', 'backend', 'core-net', 'legacy-modernization', 'contract']).optional(),
  keywords: z.string().optional(),
  location: z.string().optional(),
  remote: z.boolean().optional(),
  datePosted: z.enum(['day', 'week', 'month']).optional(),
  minScore: z.number().min(0).max(100).optional(),
  maxPages: z.number().min(1).optional(),
  startPage: z.number().min(1).optional(),
});

const ApplyOptionsSchema = z.object({
  easy: z.boolean().optional(),
  external: z.boolean().optional(),
  jobId: z.string().optional(),
  dryRun: z.boolean().optional(),
});

// Use discriminated union for proper option parsing
const StartCommandSchema = z.discriminatedUnion('command', [
  z.object({
    command: z.literal('search'),
    options: SearchOptionsSchema,
  }),
  z.object({
    command: z.literal('apply'),
    options: ApplyOptionsSchema,
  }),
]);

// State management
let activeProcess: ChildProcess | null = null;
let processStatus: 'idle' | 'running' | 'stopping' = 'idle';
const logClients: Response[] = [];

// Helper to broadcast logs to all connected SSE clients
function broadcastLog(message: string) {
  const timestamp = new Date().toISOString();
  const logData = JSON.stringify({ 
    type: 'log', 
    message, 
    timestamp 
  });
  
  logClients.forEach((client) => {
    try {
      client.write(`data: ${logData}\n\n`);
    } catch (error) {
      // Client disconnected, will be cleaned up
    }
  });
}

function broadcastStatus(status: 'idle' | 'running' | 'stopping' | 'error', error?: string) {
  const statusData = JSON.stringify({ 
    type: 'status', 
    status,
    error,
    timestamp: new Date().toISOString()
  });
  
  logClients.forEach((client) => {
    try {
      client.write(`data: ${statusData}\n\n`);
    } catch (error) {
      // Client disconnected
    }
  });
}

// POST /api/automation/start - Start a search or apply job
router.post('/start', async (req: Request, res: Response) => {
  try {
    // Validate request
    const parsed = StartCommandSchema.parse(req.body);
    
    // Check if already running
    if (activeProcess || processStatus !== 'idle') {
      return res.status(409).json({ 
        error: 'A job is already running. Please stop it first.' 
      });
    }
    
    // Clear any existing stop signal from previous runs
    clearStopSignal();

    // Build command arguments
    const args: string[] = [parsed.command];
    
    if (parsed.command === 'search') {
      const opts = parsed.options as z.infer<typeof SearchOptionsSchema>;
      
      if (opts.profile) {
        args.push('--profile', opts.profile);
      } else if (opts.keywords) {
        args.push(opts.keywords);
      } else {
        return res.status(400).json({ 
          error: 'Either profile or keywords must be specified for search' 
        });
      }
      
      if (opts.location) {
        args.push('--location', opts.location);
      }
      if (opts.remote) {
        args.push('--remote');
      }
      if (opts.datePosted) {
        args.push('--date', opts.datePosted);
      }
      if (opts.minScore !== undefined) {
        args.push('--min-score', opts.minScore.toString());
      }
      if (opts.maxPages !== undefined) {
        args.push('--max-pages', opts.maxPages.toString());
      }
      if (opts.startPage !== undefined) {
        args.push('--start-page', opts.startPage.toString());
      }
      
      console.log('[Automation API] Search args:', JSON.stringify(args));
    } else {
      const opts = parsed.options as z.infer<typeof ApplyOptionsSchema>;
      
      console.log('[Automation API] Apply options received:', JSON.stringify(opts));
      
      // Require explicit filter
      if (!opts.jobId && !opts.easy && !opts.external) {
        return res.status(400).json({
          error: 'No filter specified. Please select Easy Apply only, External ATS only, or provide a specific Job ID.'
        });
      }
      
      if (opts.easy) {
        args.push('--easy');
        console.log('[Automation API] Adding --easy flag');
      }
      if (opts.external) {
        args.push('--ext');
        console.log('[Automation API] Adding --ext flag');
      }
      if (opts.jobId) {
        args.push('--job', opts.jobId);
      }
      if (opts.dryRun) {
        args.push('--dry-run');
      }
      
      console.log('[Automation API] Final args:', args);
    }

    // Spawn the CLI process
    processStatus = 'running';
    
    // Use tsx binary directly from node_modules (more reliable than npx)
    const projectRoot = process.cwd();
    
    // Build command with proper quoting for arguments with spaces
    const escapedArgs = args.map(arg => {
      if (arg.includes(' ') || arg.includes('&') || arg.includes('|')) {
        return `"${arg.replace(/"/g, '\\"')}"`;
      }
      return arg;
    });
    
    const command = `tsx --no-cache src/cli.ts ${escapedArgs.join(' ')}`;
    
    console.log('[Automation API] Executing command:', command);
    
    activeProcess = spawn(command, {
      cwd: projectRoot,
      env: { 
        ...process.env,
        TSX_TSCONFIG_PATH: undefined, // Force tsx to reload
      },
      shell: true, // Use shell to properly handle quoted arguments
    });

    // Capture stdout
    activeProcess.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      broadcastLog(text);
    });

    // Capture stderr
    activeProcess.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      broadcastLog(`ERROR: ${text}`);
    });

    // Handle process exit
    activeProcess.on('exit', (code, signal) => {
      const exitMessage = code !== null 
        ? `Process exited with code ${code}`
        : `Process terminated by signal ${signal}`;
      
      broadcastLog(`\n${exitMessage}\n`);
      
      // Clear active process reference
      activeProcess = null;
      
      // Update status based on context
      if (processStatus === 'stopping') {
        // We were in the process of stopping, now we're truly stopped
        if (code === 0) {
          broadcastLog('\n✅ Process stopped successfully\n');
          broadcastStatus('idle');
          processStatus = 'idle';
        } else {
          broadcastLog(`\n⚠️ Process terminated: ${exitMessage}\n`);
          broadcastStatus('idle');
          processStatus = 'idle';
        }
      } else if (processStatus === 'running') {
        // Normal exit or unexpected exit while running
        if (code === 0) {
          broadcastStatus('idle');
          processStatus = 'idle';
        } else {
          broadcastStatus('error', exitMessage);
          processStatus = 'idle';
        }
      }
    });

    // Handle process errors
    activeProcess.on('error', (error) => {
      broadcastLog(`\nProcess error: ${error.message}\n`);
      
      // Only set error status if we're not in stopping state
      if (processStatus !== 'stopping') {
        broadcastStatus('error', error.message);
        processStatus = 'idle';
      }
      
      activeProcess = null;
    });

    broadcastLog(`Starting ${parsed.command} command...\n`);
    broadcastStatus('running');

    res.json({ 
      success: true, 
      message: 'Job started successfully',
      command: parsed.command,
      args
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid request parameters', 
        details: error.errors 
      });
    }
    
    console.error('Error starting automation:', error);
    res.status(500).json({ 
      error: 'Failed to start job',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/automation/stop - Stop the current running job
router.post('/stop', async (req: Request, res: Response) => {
  try {
    if (!activeProcess || processStatus !== 'running') {
      return res.status(404).json({ 
        error: 'No job is currently running' 
      });
    }

    processStatus = 'stopping';
    broadcastLog('\n⚠️  Stop requested, finishing current operation...\n');
    broadcastStatus('stopping');

    // Create stop signal file (works on all platforms, including Windows)
    createStopSignal();
    
    // Also send SIGTERM for Unix-like systems
    activeProcess.kill('SIGTERM');

    // Set timeout for forceful kill
    const forceKillTimeout = setTimeout(() => {
      if (activeProcess) {
        broadcastLog('⚠️  Forcefully terminating process...\n');
        activeProcess.kill('SIGKILL');
      }
      clearTimeout(forceKillTimeout);
    }, 10000); // 10 second grace period

    res.json({ 
      success: true, 
      message: 'Stop signal sent. Process will terminate gracefully.' 
    });

  } catch (error) {
    console.error('Error stopping automation:', error);
    res.status(500).json({ 
      error: 'Failed to stop job',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/automation/status - Get current job status
router.get('/status', (req: Request, res: Response) => {
  res.json({ 
    status: processStatus,
    hasActiveProcess: activeProcess !== null,
    pid: activeProcess?.pid
  });
});

// GET /api/automation/logs - SSE endpoint for live log streaming
router.get('/logs', (req: Request, res: Response) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Add this client to the list
  logClients.push(res);

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ 
    type: 'connected', 
    message: 'Connected to log stream',
    status: processStatus,
    timestamp: new Date().toISOString()
  })}\n\n`);

  // Handle client disconnect
  req.on('close', () => {
    const index = logClients.indexOf(res);
    if (index !== -1) {
      logClients.splice(index, 1);
    }
  });
});

export default router;

