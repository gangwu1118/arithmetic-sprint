import { defineConfig } from 'vitest/config';

// Unit tests: they sit next to the code they test and need no database.
export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json. Requires Vite 8.
  resolve: { tsconfigPaths: true },
  test: {
    root: './',
    include: ['src/**/*.spec.ts'],
  },
});
