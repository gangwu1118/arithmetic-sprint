import { DEFAULT_DATABASE_URL } from '../src/config.js';

// The HTTP tests use their own database on the same local server, so they
// never touch development data.
export const TEST_DATABASE_NAME = 'sprint_test';

export const TEST_DATABASE_URL = DEFAULT_DATABASE_URL.replace(
  /\/[^/]+$/,
  `/${TEST_DATABASE_NAME}`,
);
