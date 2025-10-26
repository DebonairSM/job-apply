#!/usr/bin/env node

import https from 'https';
import http from 'http';

function waitForServer(url, maxAttempts = 30, delay = 1000) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const checkServer = () => {
      attempts++;
      
      // Determine if URL is HTTPS or HTTP
      const isHttps = url.startsWith('https://');
      const client = isHttps ? https : http;
      
      const req = client.get(url, { rejectUnauthorized: false }, (res) => {
        console.log('✅ Server is ready!');
        resolve();
      });
      
      req.on('error', (err) => {
        if (attempts >= maxAttempts) {
          console.log('❌ Server did not start within timeout');
          reject(new Error('Server startup timeout'));
        } else {
          console.log(`⏳ Waiting for server... (attempt ${attempts}/${maxAttempts})`);
          setTimeout(checkServer, delay);
        }
      });
      
      req.end();
    };
    
    checkServer();
  });
}

const serverUrl = process.argv[2] || 'http://localhost:3001/api/health';

waitForServer(serverUrl)
  .then(() => {
    console.log('🚀 Starting Vite...');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Failed to wait for server:', err.message);
    process.exit(1);
  });
