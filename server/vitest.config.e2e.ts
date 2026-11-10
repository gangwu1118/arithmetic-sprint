import { defineConfig } from 'vitest/config';

// HTTP tests: the real application against a real PostgreSQL.
// They need the database from docker-compose.yml to be running.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    globalSetup: ['./test/global-setup.ts'],
    // The files share one test database, so they run one at a time.
    fileParallelism: false,
  },
});
