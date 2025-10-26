import express from 'express';
import cors from 'cors';
import https from 'https';
import http from 'http';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { networkInterfaces } from 'os';
import statsRouter from './routes/stats.js';
import jobsRouter from './routes/jobs.js';
import runsRouter from './routes/runs.js';
import analyticsRouter from './routes/analytics.js';
import coverLetterRouter from './routes/cover-letter-router.js';
import { generateHeadline } from './routes/headline.js';
import profileRouter from './routes/profile.js';
import skillsRouter from './routes/skills.js';
import commonAnswersRouter from './routes/common-answers.js';
import preferencesRouter from './routes/preferences.js';
import resumesRouter from './routes/resumes.js';
import automationRouter from './routes/automation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
app.use('/api/runs', runsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/cover-letter', coverLetterRouter);
app.post('/api/headline/generate', generateHeadline);

// User Configuration Routes
app.use('/api/profile', profileRouter);
app.use('/api/skills', skillsRouter);
app.use('/api/common-answers', commonAnswersRouter);
app.use('/api/preferences', preferencesRouter);
app.use('/api/resumes', resumesRouter);

// Automation Routes
app.use('/api/automation', automationRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = join(__dirname, '../../dist/client');
  app.use(express.static(clientBuildPath));
  
  // Catch-all route for SPA - must be after API routes
  app.use((req, res) => {
    res.sendFile(join(clientBuildPath, 'index.html'));
  });
}

// Determine if we should use HTTPS or HTTP
const useHttps = fs.existsSync(join(__dirname, '../../localhost+2-key.pem'));

if (useHttps) {
  // HTTPS options
  const httpsOptions = {
    key: fs.readFileSync(join(__dirname, '../../localhost+2-key.pem')),
    cert: fs.readFileSync(join(__dirname, '../../localhost+2.pem'))
  };

  // Start HTTPS server
  https.createServer(httpsOptions, app).listen(Number(PORT), '0.0.0.0', () => {
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
  http.createServer(app).listen(Number(PORT), '0.0.0.0', () => {
    const networkIPs = getNetworkIPs();
    console.log(`📊 Dashboard server running on http://localhost:${PORT}`);
    console.log(`   API available at http://localhost:${PORT}/api`);
    console.log(`   Network addresses:`);
    networkIPs.forEach(ip => {
      console.log(`     http://${ip}:${PORT}`);
    });
  });
}

