import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import * as growthSchema from './growth-schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Supabase enforces SSL server-side. rejectUnauthorized:false is sslmode=require —
// the connection is always encrypted. rejectUnauthorized:true (sslmode=verify-full)
// fails on Railway because Supabase's CA is not in Node.js's default trust store,
// producing "self-signed certificate in certificate chain" and a 500 on every DB query.
const client = postgres(process.env.DATABASE_URL, {
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
  ssl: { rejectUnauthorized: false },
});

export const db = drizzle(client, { schema: { ...schema, ...growthSchema } });
