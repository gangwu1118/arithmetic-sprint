import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { DEFAULT_DATABASE_URL } from '../src/config.js';

// The HTTP tests use their own database on the same local server, so they
// never touch development data. It is rebuilt from the migrations before
// each run (global-setup.ts).
export const TEST_DATABASE_NAME = 'sprint_test';

export const TEST_DATABASE_URL = DEFAULT_DATABASE_URL.replace(
  /\/[^/]+$/,
  `/${TEST_DATABASE_NAME}`,
);

/** A direct connection to the test database, to check what was stored. */
export function openTestDatabase() {
  return drizzle(TEST_DATABASE_URL);
}

export type TestDatabase = ReturnType<typeof openTestDatabase>;

export async function emptyTables(db: TestDatabase): Promise<void> {
  await db.execute(sql`truncate table rounds, players cascade`);
}
