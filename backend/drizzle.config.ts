import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config();

// For migrations, use the direct Supabase connection (port 5432), not the pooler (port 6543).
// Set MIGRATION_DATABASE_URL in .env to override when using a connection pooler for the app.
const migrationUrl = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: migrationUrl,
  },
  verbose: true,
  strict: true,
});
