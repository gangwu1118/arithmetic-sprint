import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// In development the API runs on its own port. Requests to /api are
// forwarded to it, so the browser only ever talks to one origin. Both ports
// can be moved, so the browser tests run a stack of their own next to the
// one `npm run dev` starts (playwright.config.ts).
const webPort = Number(process.env.WEB_PORT ?? 5193);
const apiPort = Number(process.env.API_PORT ?? 4320);

export default defineConfig({
  plugins: [react()],
  server: {
    port: webPort,
    strictPort: true,
    proxy: {
      '/api': `http://127.0.0.1:${apiPort}`,
    },
  },
});
