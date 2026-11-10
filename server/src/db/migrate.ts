// npm run db:migrate: brings the development database up to date.
import { databaseUrl } from '../config.js';
import { runMigrations } from './database.js';

await runMigrations(databaseUrl());
console.log('Migrations applied.');
