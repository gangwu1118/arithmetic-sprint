import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// In development the API runs on its own port. Requests to /api are
// forwarded to it, so the browser only ever talks to one origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5193,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:4320',
    },
  },
});
