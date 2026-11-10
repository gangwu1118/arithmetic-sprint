// Used only by drizzle-kit, to generate SQL migrations from the schema.
// Generating needs no database; applying them is `npm run db:migrate`.
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
});
