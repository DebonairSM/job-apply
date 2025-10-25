import express from 'express';
import cors from 'cors';
import https from 'https';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import statsRouter from './routes/stats.js';
import jobsRouter from './routes/jobs.js';
import runsRouter from './routes/runs.js';
import analyticsRouter from './routes/analytics.js';
import coverLetterRouter from './routes/cover-letter-router.js';
import { generateHeadline } from './routes/headline.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = join(__dirname, '../../dist/client');
  app.use(express.static(clientBuildPath));
  
  app.get('*', (req, res) => {
    res.sendFile(join(clientBuildPath, 'index.html'));
  });
}

// HTTPS options
const httpsOptions = {
  key: fs.readFileSync(join(__dirname, '../../localhost+2-key.pem')),
  cert: fs.readFileSync(join(__dirname, '../../localhost+2.pem'))
};

// Start HTTPS server
https.createServer(httpsOptions, app).listen(Number(PORT), '0.0.0.0', () => {
  console.log(`📊 Dashboard server running on https://localhost:${PORT}`);
  console.log(`   API available at https://localhost:${PORT}/api`);
  console.log(`   Network access: https://192.168.1.214:${PORT}`);
});

