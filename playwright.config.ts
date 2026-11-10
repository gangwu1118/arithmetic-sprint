import { defineConfig } from '@playwright/test';

// The browser test (docs/test-plan.md). It drives the Chrome installed on
// this machine, so no browser download is needed, and it starts the API and
// the web app unless they are already running. It uses the development
// database, which needs `npm run setup` (or `npm run reset`) first.
export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5193',
    channel: 'chrome',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5193/api/health',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
