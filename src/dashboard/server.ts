import express from 'express';
import cors from 'cors';
import https from 'https';
import http from 'http';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { networkInterfaces } from 'os';
import { initDb, getActiveScrapingRuns } from '../lib/db.js';
import { warmupOllamaModel } from '../ai/ollama-client.js';
import { processManager } from './lib/process-manager.js';
import statsRouter from './routes/stats.js';
import jobsRouter from './routes/jobs.js';
import leadsRouter from './routes/leads.js';
import campaignsRouter from './routes/campaigns.js';
import runsRouter from './routes/runs.js';
import analyticsRouter from './routes/analytics.js';
import coverLetterRouter from './routes/cover-letter-router.js';
import headlineRouter from './routes/headline-router.js';
import profileRouter from './routes/profile.js';
import skillsRouter from './routes/skills.js';
import commonAnswersRouter from './routes/common-answers.js';
import preferencesRouter from './routes/preferences.js';
import resumesRouter from './routes/resumes.js';
import automationRouter from './routes/automation.js';
import backupRouter from './routes/backup.js';
import llmHealthRouter from './routes/llm-health.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize database and run migrations
console.log('🔧 Initializing database...');
initDb();
console.log('✅ Database initialized');

// Pre-warm the LLM model to avoid timeouts on first API call
console.log('🔥 Warming up LLM model...');
warmupOllamaModel()
  .then(success => {
    if (success) {
      console.log('✅ LLM model ready');
    } else {
      console.warn('⚠️  LLM warmup failed - first AI operations may be slow');
    }
  })
  .catch(error => {
    console.warn('⚠️  LLM warmup error:', error.message);
  });

const app = express();
const PORT = process.env.PORT || 3000;

// Function to get available network IP addresses
function getNetworkIPs(): string[] {
  const interfaces = networkInterfaces();
  const ips: string[] = [];
  
  // Collect all non-internal IPv4 addresses
  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (iface) {
      for (const alias of iface) {
        if (alias.family === 'IPv4' && !alias.internal) {
          ips.push(alias.address);
        }
      }
    }
  }
  
  return ips.length > 0 ? ips : ['localhost'];
}

// Function to get the primary network IP address (first available)
function getNetworkIP(): string {
  const ips = getNetworkIPs();
  return ips[0];
}

// Middleware
app.use(cors());
app.use(express.json());

// Serve artifacts (screenshots, traces, etc.)
const artifactsPath = join(__dirname, '../../artifacts');
app.use('/artifacts', express.static(artifactsPath));

// API Routes
app.use('/api/stats', statsRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/runs', runsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/cover-letter', coverLetterRouter);
app.use('/api/headline', headlineRouter);

// User Configuration Routes
app.use('/api/profile', profileRouter);
app.use('/api/skills', skillsRouter);
app.use('/api/common-answers', commonAnswersRouter);
app.use('/api/preferences', preferencesRouter);
app.use('/api/resumes', resumesRouter);

// Automation Routes
app.use('/api/automation', automationRouter);

// Backup Routes
app.use('/api/backup', backupRouter);

// LLM Health Check
app.use('/api/llm-health', llmHealthRouter);

// Health check
app.get('/api/health', (_req: express.Request, res: express.Response): void => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = join(__dirname, '../../dist/client');
  app.use(express.static(clientBuildPath));
  
  // Catch-all route for SPA - must be after API routes
  app.use((_req: express.Request, res: express.Response): void => {
    res.sendFile(join(clientBuildPath, 'index.html'));
  });
}

// Error handling middleware - must be last
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction): void => {
  console.error('❌ Unhandled error in request:');
  console.error(`   Method: ${req.method}`);
  console.error(`   Path: ${req.path}`);
  console.error(`   Error: ${err.message}`);
  console.error(`   Stack: ${err.stack || 'No stack trace available'}`);
  
  const response: { error: string; message: string; path: string; stack?: string } = {
    error: 'Internal server error',
    message: err.message,
    path: req.path
  };
  
  // Only include stack trace in development
  if (process.env.NODE_ENV === 'development' && err.stack) {
    response.stack = err.stack;
  }
  
  res.status(500).json(response);
});

// Cleanup orphaned processes from database on startup
(async () => {
  console.log('🧹 Checking for orphaned processes from previous runs...');
  const activeRuns = getActiveScrapingRuns();
  if (activeRuns.length > 0) {
    console.log(`   Found ${activeRuns.length} active scraping run(s) in database`);
    const { updateScrapingRun } = await import('../lib/db.js');
    
    for (const run of activeRuns) {
      if (run.process_id) {
        // Check if process is still running before registering
        if (processManager.isRunning(run.process_id)) {
          // Register detached processes from database
          processManager.register(
            run.process_id,
            'lead-scraping',
            `Lead scraping run #${run.id} (recovered from database)`,
            true // Detached
          );
          console.log(`   ✅ Registered PID ${run.process_id} from run #${run.id} (still running)`);
        } else {
          // Process is no longer running, mark run as stopped
          console.log(`   ⚠️  PID ${run.process_id} from run #${run.id} is no longer running`);
          try {
            updateScrapingRun(run.id, {
              status: 'stopped',
              completed_at: new Date().toISOString(),
              error_message: 'Process terminated (detected on server restart)'
            });
          } catch (error) {
            console.error(`   ❌ Failed to update run #${run.id}:`, error);
          }
        }
      }
    }
    
    // Clean up any stale processes
    processManager.cleanupStale();
  } else {
    console.log('   No orphaned processes found');
  }
})();

// Graceful shutdown handler
let server: http.Server | https.Server | null = null;

async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`\n🛑 Received ${signal}, initiating graceful shutdown...`);
  
  // Stop accepting new connections
  if (server) {
    server.close(() => {
      console.log('✅ HTTP server closed');
    });
  }
  
  // Shutdown all tracked processes
  await processManager.shutdown(10000); // 10 second grace period
  
  // Close database connections
  try {
    const { closeDb } = await import('../lib/db.js');
    closeDb();
    console.log('✅ Database connections closed');
  } catch (error) {
    console.error('⚠️  Error closing database:', error);
  }
  
  console.log('✅ Graceful shutdown complete');
  process.exit(0);
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  gracefulShutdown('uncaughtException').catch(() => process.exit(1));
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection').catch(() => process.exit(1));
});

// Determine if we should use HTTPS or HTTP
const useHttps = fs.existsSync(join(__dirname, '../../localhost+2-key.pem'));

if (useHttps) {
  // HTTPS options
  const httpsOptions = {
    key: fs.readFileSync(join(__dirname, '../../localhost+2-key.pem')),
    cert: fs.readFileSync(join(__dirname, '../../localhost+2.pem'))
  };

  // Start HTTPS server
  server = https.createServer(httpsOptions, app).listen(Number(PORT), '0.0.0.0', () => {
    const networkIPs = getNetworkIPs();
    console.log(`📊 Dashboard server running on https://localhost:${PORT}`);
    console.log(`   API available at https://localhost:${PORT}/api`);
    console.log(`   Network addresses:`);
    networkIPs.forEach(ip => {
      console.log(`     https://${ip}:${PORT} (accept certificate warning)`);
    });
  });
} else {
  // Start HTTP server (fallback if no certificates)
  server = http.createServer(app).listen(Number(PORT), '0.0.0.0', () => {
    const networkIPs = getNetworkIPs();
    console.log(`📊 Dashboard server running on http://localhost:${PORT}`);
    console.log(`   API available at http://localhost:${PORT}/api`);
    console.log(`   Network addresses:`);
    networkIPs.forEach(ip => {
      console.log(`     http://${ip}:${PORT}`);
    });
  });
}

