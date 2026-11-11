// Run by playwright.config.ts before it starts the app: rebuilds the browser
// tests' own database from the migrations and adds the two sample players,
// so every run starts from the same data. The development database is never
// touched.
import { execSync } from 'node:child_process';
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url)
  throw new Error("DATABASE_URL must name the browser tests' database.");

const name = new URL(url).pathname.slice(1);
if (!/^[a-z_][a-z0-9_]*$/.test(name) || name === 'sprint') {
  throw new Error(`Refusing to rebuild the database "${name}".`);
}

// Dropping and creating a database needs a connection to another one.
const admin = new URL(url);
admin.pathname = '/sprint';
const client = new pg.Client({ connectionString: admin.toString() });
await client.connect();
try {
  await client.query(`drop database if exists ${name} with (force)`);
  await client.query(`create database ${name}`);
} finally {
  await client.end();
}

const env = { ...process.env, DATABASE_URL: url };
execSync('npm run --silent db:migrate -w server', { env, stdio: 'inherit' });
execSync('npm run --silent db:seed -w server', { env, stdio: 'inherit' });
