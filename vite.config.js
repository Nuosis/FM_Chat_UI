import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 1235,
    open: false,
    proxy: {
      '/anthropic': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/anthropic/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Log the full URL being proxied to
            console.log('Proxying to:', `${proxy.options.target}${req.url.replace(/^\/anthropic/, '')}`);
            // Preserve original headers and ensure API key is passed
            const originalHeaders = req.headers;
            proxyReq.setHeader('accept', 'application/json');
            proxyReq.setHeader('content-type', 'application/json');
            proxyReq.setHeader('x-api-key', originalHeaders['x-api-key']);
            proxyReq.setHeader('anthropic-version', '2023-06-01');
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response for:', req.url, 'Status:', proxyRes.statusCode);
          });
        }
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js'
  }
})