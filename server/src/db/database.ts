import { fileURLToPath } from 'node:url';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

/** The database as the application uses it, injected with @InjectDrizzle(). */
export type Database = NodePgDatabase;

/** The SQL migrations generated from schema.ts, in server/drizzle. */
export const MIGRATIONS_FOLDER = fileURLToPath(
  new URL('../../drizzle', import.meta.url),
);

/** Applies the migrations that have not run yet, then closes the pool. */
export async function runMigrations(databaseUrl: string): Promise<void> {
  const db = drizzle(databaseUrl);
  try {
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  } finally {
    await db.$client.end();
  }
}
