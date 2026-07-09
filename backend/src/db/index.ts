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
// statement_timeout is a defense-in-depth cap on query execution time. Note it
// is NOT reliably enforced through Supabase's transaction-mode pooler (port
// 6543, what DATABASE_URL points at) — verified by testing: a query that stalls
// mid-flight (TCP path drops packets with no RST) can hold its pool slot
// indefinitely regardless of this setting, since idle_timeout/max_lifetime only
// recycle connections that go idle, never one stuck awaiting a response. That
// failure mode starved the whole app (every DB-touching route, not just
// Release Intel) — see requestTimeout middleware in app.ts for the actual fix,
// which bounds the HTTP response instead of trying to bound the DB connection.
const client = postgres(process.env.DATABASE_URL, {
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
  ssl: { rejectUnauthorized: false },
  connection: {
    statement_timeout: 30_000,
  },
});

export const db = drizzle(client, { schema: { ...schema, ...growthSchema } });
