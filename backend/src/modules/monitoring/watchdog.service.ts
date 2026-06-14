import { sql, eq, and } from 'drizzle-orm';
import { db } from '../../db';
import { getRedisConnection } from '../../queues';
import { health_checks, incidents } from '../../db/schema';
import { captureException } from '../../lib/sentry';
import { logActivity } from '../../lib/activityLogger';

let watchdogTimer: ReturnType<typeof setInterval> | null = null;

interface SystemSnapshot {
  database: 'connected' | 'disconnected';
  redis:    'connected' | 'disconnected' | 'not_configured';
  queue:    'healthy'   | 'degraded'     | 'not_configured';
  overall:  'healthy'   | 'degraded'     | 'critical';
  responseTimeMs: number;
}

async function probe(): Promise<SystemSnapshot> {
  const start = Date.now();

  let database: SystemSnapshot['database'] = 'disconnected';
  try {
    await db.execute(sql`SELECT 1`);
    database = 'connected';
  } catch (err) {
    captureException(err, { component: 'database', source: 'watchdog' });
  }

  let redis: SystemSnapshot['redis'] = 'not_configured';
  if (process.env.REDIS_URL) {
    try {
      const conn = getRedisConnection();
      if (conn) {
        await conn.ping();
        redis = 'connected';
      } else {
        redis = 'disconnected';
      }
    } catch (err) {
      redis = 'disconnected';
      captureException(err, { component: 'redis', source: 'watchdog' });
    }
  }

  const queue: SystemSnapshot['queue'] =
    redis === 'connected'      ? 'healthy' :
    redis === 'not_configured' ? 'not_configured' : 'degraded';

  const overall: SystemSnapshot['overall'] =
    database === 'disconnected' ? 'critical' :
    redis    === 'disconnected' ? 'degraded'  : 'healthy';

  return { database, redis, queue, overall, responseTimeMs: Date.now() - start };
}

async function persistSnapshot(snap: SystemSnapshot): Promise<void> {
  try {
    await db.insert(health_checks).values({
      status:           snap.overall,
      database_status:  snap.database,
      redis_status:     snap.redis,
      queue_status:     snap.queue,
      response_time_ms: snap.responseTimeMs,
    });
  } catch (err) {
    console.error('[Watchdog] persist error:', err instanceof Error ? err.message : String(err));
  }
}

interface IncidentSpec {
  key:      string;
  failing:  boolean;
  title:    string;
  severity: 'warning' | 'error' | 'critical';
}

async function reconcileIncidents(snap: SystemSnapshot): Promise<void> {
  const specs: IncidentSpec[] = [
    { key: 'database_outage', failing: snap.database === 'disconnected', title: 'Database connection failure', severity: 'critical' },
    { key: 'redis_outage',    failing: snap.redis    === 'disconnected', title: 'Redis connection failure',    severity: 'error'    },
    { key: 'queue_degraded',  failing: snap.queue    === 'degraded',     title: 'Queue system degraded',       severity: 'warning'  },
  ];

  for (const spec of specs) {
    try {
      const [existing] = await db
        .select({ id: incidents.id })
        .from(incidents)
        .where(and(eq(incidents.incident_key, spec.key), eq(incidents.status, 'open')))
        .limit(1);

      if (spec.failing && !existing) {
        await db.insert(incidents).values({
          incident_key: spec.key,
          severity:     spec.severity,
          title:        spec.title,
          description:  `Detected at ${new Date().toISOString()} by watchdog`,
          status:       'open',
          metadata:     { source: 'watchdog' },
        });
        logActivity({
          eventType: `incident.opened.${spec.key}`,
          module:    'monitoring',
          title:     `Incident: ${spec.title}`,
          severity:  spec.severity,
        });
        console.error(`[Watchdog] INCIDENT OPENED: ${spec.title}`);
      } else if (!spec.failing && existing) {
        await db
          .update(incidents)
          .set({ status: 'resolved', resolved_at: new Date() })
          .where(eq(incidents.id, existing.id));
        logActivity({
          eventType: `incident.resolved.${spec.key}`,
          module:    'monitoring',
          title:     `Resolved: ${spec.title}`,
          severity:  'info',
        });
        console.log(`[Watchdog] Incident resolved: ${spec.title}`);
      }
    } catch (err) {
      console.error('[Watchdog] reconcile error:', err instanceof Error ? err.message : String(err));
    }
  }
}

async function tick(): Promise<void> {
  try {
    const snap = await probe();
    await persistSnapshot(snap);
    await reconcileIncidents(snap);
    if (snap.overall !== 'healthy') {
      console.warn(`[Watchdog] ${snap.overall.toUpperCase()} — DB:${snap.database} Redis:${snap.redis} Queue:${snap.queue}`);
    }
  } catch (err) {
    console.error('[Watchdog] tick error:', err instanceof Error ? err.message : String(err));
  }
}

export function startWatchdog(): void {
  if (watchdogTimer) return;
  void tick(); // immediate first run
  watchdogTimer = setInterval(() => void tick(), 60_000);
  console.log('[Watchdog] Started — 60s interval');
}

export function stopWatchdog(): void {
  if (watchdogTimer) {
    clearInterval(watchdogTimer);
    watchdogTimer = null;
    console.log('[Watchdog] Stopped');
  }
}
