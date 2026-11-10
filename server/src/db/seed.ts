// npm run seed: adds the two sample players, replacing earlier copies of
// them. Players created in the app are kept.
import { drizzle } from 'drizzle-orm/node-postgres';
import { databaseUrl } from '../config.js';
import { seedSampleData } from './sample-data.js';

const db = drizzle(databaseUrl());
try {
  await seedSampleData(db, new Date());
  console.log('Sample players added: Alex (sample) and Sam (sample).');
} finally {
  await db.$client.end();
}
