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
const DATABASE_URL = process.env.DATABASE_URL;

function createClient() {
  return postgres(DATABASE_URL as string, {
    max: 10,
    idle_timeout: 30,
    connect_timeout: 10,
    ssl: { rejectUnauthorized: false },
    connection: {
      statement_timeout: 30_000,
    },
  });
}

// `client`/`db` are reassignable (not const) so recreateDbClient() can swap
// them out in place. Every other module imports `db` by name — ES module
// named exports are live bindings, so reassigning the binding here is visible
// to all existing importers without them re-importing anything.
let client = createClient();
export let db = drizzle(client, { schema: { ...schema, ...growthSchema } });

let recreating: Promise<void> | null = null;

// Self-heal for the known failure mode (see comment above): a query whose TCP
// path silently drops packets leaves its pool connection permanently "busy" —
// idle_timeout/statement_timeout never reclaim it since it's never idle and
// the pooler doesn't reliably honor statement_timeout anyway. That's a
// one-way leak: each wedge permanently shrinks the pool until nothing is
// left, which is why a full process restart was previously the only fix.
// This reproduces what a restart does to the DB layer specifically —
// discarding every connection and opening fresh ones — but in-process and
// automatically, triggered by poolHealth.ts when real request timeouts
// cluster (see requestTimeout.ts's onTimeout hook).
export async function recreateDbClient(reason: string): Promise<void> {
  if (recreating) return recreating;
  recreating = (async () => {
    console.warn(`[DB] Recreating connection pool (reason: ${reason})`);
    const old = client;
    client = createClient();
    db = drizzle(client, { schema: { ...schema, ...growthSchema } });
    try {
      await old.end({ timeout: 5 });
    } catch (err) {
      console.warn('[DB] Error closing previous pool (ignored):', err instanceof Error ? err.message : String(err));
    }
  })();
  try {
    await recreating;
  } finally {
    recreating = null;
  }
}
