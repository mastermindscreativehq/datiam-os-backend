import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Production enforces full certificate validation (sslmode=require).
// Development/test keeps rejectUnauthorized:false for local Postgres flexibility.
const isProduction = process.env.NODE_ENV === 'production';

const client = postgres(process.env.DATABASE_URL, {
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
  ssl: isProduction ? { rejectUnauthorized: true } : { rejectUnauthorized: false },
});

export const db = drizzle(client, { schema });
