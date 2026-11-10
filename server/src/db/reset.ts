// npm run reset: empties both tables, then adds the sample players again.
// Every player created in the app is deleted.
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { databaseUrl } from '../config.js';
import { seedSampleData } from './sample-data.js';

const db = drizzle(databaseUrl());
try {
  await db.execute(sql`truncate table rounds, players cascade`);
  await seedSampleData(db, new Date());
  console.log('Database emptied and sample players added.');
} finally {
  await db.$client.end();
}
