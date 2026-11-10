import pg from 'pg';
import { DEFAULT_DATABASE_URL } from '../src/config.js';
import { TEST_DATABASE_NAME } from './test-database.js';

// Runs once before the HTTP tests: create the test database if it is
// missing. PostgreSQL has no "create database if not exists".
export default async function setup(): Promise<void> {
  const client = new pg.Client({ connectionString: DEFAULT_DATABASE_URL });
  await client.connect();
  try {
    const found = await client.query(
      'select 1 from pg_database where datname = $1',
      [TEST_DATABASE_NAME],
    );
    if (found.rowCount === 0) {
      await client.query(`create database ${TEST_DATABASE_NAME}`);
    }
  } finally {
    await client.end();
  }
}
