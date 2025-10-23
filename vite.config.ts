import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';

export default defineConfig({
  plugins: [react()],
  root: 'src/dashboard/client',
  build: {
    outDir: '../../../dist/client',
    emptyOutDir: true
  },
  server: {
    host: true,
    port: 3000,
    https: {
      key: fs.readFileSync(resolve(__dirname, 'localhost+2-key.pem')),
      cert: fs.readFileSync(resolve(__dirname, 'localhost+2.pem'))
    },
    proxy: {
      '/api': {
        target: 'https://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  }
});

