import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, join } from 'path';
import fs from 'fs';

// Load .env file manually (Vite doesn't auto-load into process.env in config)
// Loads .env.local first (higher priority), then .env
function loadEnvFile(): void {
  const envFiles = ['.env.local', '.env'];
  
  for (const fileName of envFiles) {
    try {
      const envPath = join(__dirname, fileName);
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        for (const line of envContent.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            const envKey = key.trim();
            const envValue = valueParts.join('=').trim();
            // Only set if not already in process.env (system env takes precedence)
            if (!process.env[envKey]) {
              process.env[envKey] = envValue;
            }
          }
        }
      }
    } catch (error) {
      // Ignore errors reading .env file
    }
  }
}

// Load .env file before reading environment variables
loadEnvFile();

// Basic HTTP authentication plugin
function basicAuthPlugin(): Plugin {
  const username = process.env.DASHBOARD_USERNAME || 'admin';
  const password = process.env.DASHBOARD_PASSWORD || 'password';
  
  return {
    name: 'basic-auth',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';
        
        // Skip authentication for API proxy requests (handled by backend)
        if (url.startsWith('/api')) {
          return next();
        }
        
        // Skip authentication for Vite HMR and internal dev server requests
        // These are needed for hot module replacement to work
        if (url.startsWith('/@') || url.startsWith('/node_modules')) {
          return next();
        }
        
        // Require authentication for all other requests (HTML, static assets, etc.)
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Basic ')) {
          res.writeHead(401, {
            'WWW-Authenticate': 'Basic realm="Dashboard Access"',
            'Content-Type': 'text/html'
          });
          res.end('<h1>401 Unauthorized</h1><p>Please enter your credentials.</p>');
          return;
        }
        
        // Decode credentials
        const credentials = Buffer.from(authHeader.slice(6), 'base64').toString('utf-8');
        const [providedUsername, providedPassword] = credentials.split(':');
        
        if (providedUsername === username && providedPassword === password) {
          next();
        } else {
          res.writeHead(401, {
            'WWW-Authenticate': 'Basic realm="Dashboard Access"',
            'Content-Type': 'text/html'
          });
          res.end('<h1>401 Unauthorized</h1><p>Invalid username or password.</p>');
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), basicAuthPlugin()],
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
    allowedHosts: ['job.home', 'vsol-opp.ngrok.app'],
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
            if (res && 'writeHead' in res && 'headersSent' in res && !res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                error: 'Dashboard server is not ready', 
                message: 'Please wait a moment and refresh the page' 
              }));
            }
          });
        }
      }
    }
  }
});

