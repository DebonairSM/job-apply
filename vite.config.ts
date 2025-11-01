import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';

export default defineConfig({
  plugins: [react()],
  root: 'src/dashboard/client',
  publicDir: resolve(__dirname, 'public'),
  build: {
    outDir: '../../../dist/client',
    emptyOutDir: true
  },
  server: {
    host: true,
    port: 3000,
    strictPort: true,
    allowedHosts: ['job.home'],
    // Only use HTTPS if certificates exist, otherwise fall back to HTTP
    ...(fs.existsSync(resolve(__dirname, 'localhost+2-key.pem')) && fs.existsSync(resolve(__dirname, 'localhost+2.pem')) ? {
      https: {
        key: fs.readFileSync(resolve(__dirname, 'localhost+2-key.pem')),
        cert: fs.readFileSync(resolve(__dirname, 'localhost+2.pem'))
      }
    } : {}),
    proxy: {
      '/api': {
        // Use HTTP or HTTPS based on whether certificates exist
        target: fs.existsSync(resolve(__dirname, 'localhost+2-key.pem')) && fs.existsSync(resolve(__dirname, 'localhost+2.pem')) 
          ? 'https://localhost:3001' 
          : 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('Proxy error:', err.message);
            // Return a 503 Service Unavailable response
            if (!res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                error: 'Dashboard server is not ready', 
                message: 'Please wait a moment and refresh the page' 
              }));
            }
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Proxying request:', req.method, req.url);
          });
        }
      }
    }
  }
});

