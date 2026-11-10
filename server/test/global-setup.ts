import pg from 'pg';
import { DEFAULT_DATABASE_URL } from '../src/config.js';
import { runMigrations } from '../src/db/database.js';
import { TEST_DATABASE_NAME, TEST_DATABASE_URL } from './test-database.js';

// Runs once before the HTTP tests: rebuild the test database from the
// migrations, so every run starts from the same, current schema and the
// migrations themselves are exercised.
export default async function setup(): Promise<void> {
  const admin = new pg.Client({ connectionString: DEFAULT_DATABASE_URL });
  await admin.connect();
  try {
    await admin.query(
      `drop database if exists ${TEST_DATABASE_NAME} with (force)`,
    );
    await admin.query(`create database ${TEST_DATABASE_NAME}`);
  } finally {
    await admin.end();
  }
  await runMigrations(TEST_DATABASE_URL);
}
