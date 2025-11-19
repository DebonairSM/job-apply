import { Router, Request, Response } from 'express';
import { spawn, ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import { z } from 'zod';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createStopSignal, clearStopSignal } from '../../lib/stop-signal.js';
import { processManager } from '../lib/process-manager.js';

const router = Router();

// Validation schemas
const SearchOptionsSchema = z.object({
  profile: z.enum(['core', 'backend', 'core-net', 'legacy-modernization', 'contract', 'aspnet-simple', 'csharp-azure-no-frontend', 'az204-csharp', 'ai-enhanced-net', 'legacy-web']).optional(),
  keywords: z.string().optional(),
  location: z.string().optional(),
  locationPreset: z.string().optional(),
  radius: z.number().optional(),
  remote: z.boolean().optional(),
  hybrid: z.boolean().optional(),
  onsite: z.boolean().optional(),
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
      if (opts.locationPreset) {
        args.push('--location-preset', opts.locationPreset);
      }
      if (opts.radius !== undefined) {
        args.push('--radius', String(opts.radius));
      }
      if (opts.remote) {
        args.push('--remote');
      }
      if (opts.hybrid) {
        args.push('--hybrid');
      }
      if (opts.onsite) {
        args.push('--onsite');
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
    
    const projectRoot = process.cwd();
    
    // Use node to execute tsx directly (avoids shell quoting issues on Windows)
    const isWindows = process.platform === 'win32';
    
    // Find tsx module path
    const tsxModulePath = join(projectRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');
    const hasTsxModule = existsSync(tsxModulePath);
    
    if (!hasTsxModule) {
      throw new Error('tsx module not found. Run npm install.');
    }
    
    // Use node to run tsx directly
    // tsx expects: tsx [tsx-options] <script> [script-args...]
    // When using cli.mjs: node cli.mjs [tsx-options] <script> [script-args...]
    const command = process.execPath; // Path to node executable
    const spawnArgs = [
      tsxModulePath,
      'src/cli.ts', // Script to run (no --no-cache, causes issues)
      ...args       // Arguments to pass to the script
    ];
    
    console.log('[Automation API] Executing command:', command, spawnArgs.join(' '));
    
    activeProcess = spawn(command, spawnArgs, {
      cwd: projectRoot,
      env: { 
        ...process.env,
        TSX_TSCONFIG_PATH: undefined,
      },
      shell: false, // No shell needed when using node directly
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Register with process manager
    if (activeProcess.pid) {
      processManager.register(
        activeProcess,
        'automation',
        `${parsed.command} command`,
        false // Not detached
      );
    }

    // Capture stdout
    activeProcess.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      broadcastLog(text);
    });

    // Capture stderr
    activeProcess.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      console.log(`[Automation API] stderr: ${text}`);
      broadcastLog(`ERROR: ${text}`);
    });

    // Handle process exit
    activeProcess.on('exit', (code, signal) => {
      console.log(`[Automation API] Process exit event: code=${code}, signal=${signal}, status=${processStatus}`);
      console.log(`[Automation API] Exit details: code=${code}, signal=${signal}, wasRunning=${processStatus === 'running'}`);
      
      // Unregister from process manager
      if (activeProcess?.pid) {
        processManager.unregister(activeProcess.pid);
      }
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
          console.log('[Automation API] Process completed successfully');
          broadcastStatus('idle');
          processStatus = 'idle';
        } else {
          console.log(`[Automation API] Process exited with error code ${code}`);
          broadcastStatus('error', exitMessage);
          processStatus = 'idle';
        }
      } else {
        // Process exited but status wasn't set correctly - set to idle
        console.log(`[Automation API] Process exited with unexpected status: ${processStatus}`);
        broadcastStatus('idle');
        processStatus = 'idle';
      }
    });

    // Handle process errors
    activeProcess.on('error', (error) => {
      broadcastLog(`\nProcess error: ${error.message}\n`);
      
      // Unregister from process manager
      if (activeProcess?.pid) {
        processManager.unregister(activeProcess.pid);
      }
      
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
    
    // Use process manager to kill gracefully
    if (activeProcess?.pid) {
      // Process manager will handle graceful shutdown
      processManager.killProcess(activeProcess.pid, false);
      
      // Set timeout for forceful kill
      const forceKillTimeout = setTimeout(() => {
        if (activeProcess?.pid) {
          broadcastLog('⚠️  Forcefully terminating process...\n');
          processManager.killProcess(activeProcess.pid, true);
        }
        clearTimeout(forceKillTimeout);
      }, 10000); // 10 second grace period
    }

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

