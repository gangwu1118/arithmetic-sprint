import { defineConfig } from '@playwright/test';

// The browser tests (docs/test-plan.md). They drive the Chrome installed on
// this machine, so no browser download is needed.
//
// They start a stack of their own, next to anything `npm run dev` runs: the
// API on port 4321 and the web app on port 5194, against a database of their
// own that is rebuilt and seeded on every run (e2e/prepare-database.ts). So
// they never touch the development database.
//
// Every step of every case can be reviewed afterwards with
// `npm run test:browser:report`: each step ends with a screenshot
// (e2e/support.ts), and each case has a trace: every action with a
// snapshot of the page before and after it, and a filmstrip of the run.
const API_PORT = '4321';
const WEB_PORT = '5194';
const DATABASE_URL = 'postgres://sprint:sprint@127.0.0.1:54331/sprint_e2e';

export default defineConfig({
  testDir: './e2e',
  // A round lasts 60 seconds, and one case plays two.
  timeout: 180_000,
  // Every case makes its own players, so the cases can run side by side.
  fullyParallel: true,
  workers: 4,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    channel: 'chrome',
    trace: 'on',
  },
  webServer: {
    command: 'npx tsx e2e/prepare-database.ts && npm run dev',
    url: `http://localhost:${WEB_PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { API_PORT, WEB_PORT, DATABASE_URL },
  },
});
