import { Router, Request, Response } from 'express';
import { sql, desc, eq, and } from 'drizzle-orm';
import { db } from '../../db';
import { getRedisConnection } from '../../queues';
import { health_checks, incidents } from '../../db/schema';
import { authenticate, requireRole } from '../../middleware/auth';
import { env } from '../../config/env';
import { captureException, captureMessage, isSentryEnabled } from '../../lib/sentry';

// ── Shared health-check logic ─────────────────────────────────────────────────

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'critical';
  version: string;
  environment: string;
  uptime: number;
  timestamp: string;
  checks: {
    database: { status: 'connected' | 'disconnected'; responseTimeMs: number };
    redis:    { status: 'connected' | 'disconnected' | 'not_configured'; responseTimeMs: number };
    queue:    { status: 'healthy' | 'degraded' | 'not_configured' };
  };
  responseTimeMs: number;
}

export async function buildHealthStatus(): Promise<HealthStatus> {
  const start = Date.now();

  // Database
  let databaseStatus: 'connected' | 'disconnected' = 'disconnected';
  let dbMs = 0;
  try {
    const t = Date.now();
    await db.execute(sql`SELECT 1`);
    dbMs = Date.now() - t;
    databaseStatus = 'connected';
  } catch { /* watchdog handles captureException */ }

  // Redis
  let redisStatus: 'connected' | 'disconnected' | 'not_configured' = 'not_configured';
  let redisMs = 0;
  if (process.env.REDIS_URL) {
    try {
      const conn = getRedisConnection();
      if (conn) {
        const t = Date.now();
        await conn.ping();
        redisMs = Date.now() - t;
        redisStatus = 'connected';
      } else {
        redisStatus = 'disconnected';
      }
    } catch {
      redisStatus = 'disconnected';
    }
  }

  // Queue (derived from Redis)
  const queueStatus: 'healthy' | 'degraded' | 'not_configured' =
    redisStatus === 'connected'      ? 'healthy' :
    redisStatus === 'not_configured' ? 'not_configured' : 'degraded';

  const overallStatus: 'healthy' | 'degraded' | 'critical' =
    databaseStatus === 'disconnected' ? 'critical' :
    redisStatus    === 'disconnected' ? 'degraded' : 'healthy';

  return {
    status:      overallStatus,
    version:     process.env.APP_VERSION ?? '1.0.0',
    environment: env.NODE_ENV,
    uptime:      Math.floor(process.uptime()),
    timestamp:   new Date().toISOString(),
    checks: {
      database: { status: databaseStatus, responseTimeMs: dbMs },
      redis:    { status: redisStatus,    responseTimeMs: redisMs },
      queue:    { status: queueStatus },
    },
    responseTimeMs: Date.now() - start,
  };
}

// ── Public liveness probe (/ping) ────────────────────────────────────────────

export const pingRouter = Router();

pingRouter.get('/', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

// ── Protected infrastructure health (/health) ────────────────────────────────

export const healthRouter = Router();

healthRouter.get('/', authenticate, requireRole('owner', 'admin'), async (_req: Request, res: Response) => {
  const body = await buildHealthStatus();
  res.status(body.status === 'critical' ? 503 : 200).json(body);
});

healthRouter.get('/deep', authenticate, requireRole('owner', 'admin'), async (_req: Request, res: Response) => {
  const body = await buildHealthStatus();
  res.status(body.status === 'critical' ? 503 : 200).json({
    success: body.status !== 'critical',
    status: body.status === 'healthy' ? 'ok' : body.status,
    environment: body.environment,
    database: body.checks.database.status,
    redis: body.checks.redis.status,
    queue: body.checks.queue.status,
    timestamp: body.timestamp,
  });
});

// ── Protected monitoring API (/api/monitoring) ────────────────────────────────

export const monitoringRouter = Router();

monitoringRouter.get('/status', authenticate, requireRole('owner', 'admin'), async (_req: Request, res: Response) => {
  const body = await buildHealthStatus();
  res.status(body.status === 'critical' ? 503 : 200).json(body);
});

monitoringRouter.get('/history', authenticate, async (_req: Request, res: Response) => {
  const rows = await db
    .select()
    .from(health_checks)
    .orderBy(desc(health_checks.created_at))
    .limit(50);
  res.json({ success: true, data: rows });
});

monitoringRouter.get('/incidents', authenticate, async (_req: Request, res: Response) => {
  const rows = await db
    .select()
    .from(incidents)
    .orderBy(desc(incidents.created_at))
    .limit(100);
  res.json({ success: true, data: rows });
});

monitoringRouter.post('/incidents/:id/resolve', authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  const [updated] = await db
    .update(incidents)
    .set({ status: 'resolved', resolved_at: new Date() })
    .where(and(eq(incidents.id, id), eq(incidents.status, 'open')))
    .returning();

  if (!updated) {
    res.status(404).json({ success: false, error: 'Incident not found or already resolved' });
    return;
  }
  res.json({ success: true, data: updated });
});

// ── TEMP: Sentry env-var diagnostic (owner/admin only) — remove after Railway confirmed ──
monitoringRouter.get('/sentry-diag', authenticate, requireRole('owner', 'admin'), (_req: Request, res: Response) => {
  const dsn = process.env.SENTRY_DSN;
  res.json({
    success:          true,
    DSN_PRESENT:      !!dsn,
    DSN_LENGTH:       dsn?.length ?? 0,
    DSN_VALID_PREFIX: typeof dsn === 'string' && dsn.startsWith('https://'),
    module_enabled:   isSentryEnabled(),
  });
});

// ── Sentry integration test (owner/admin only) ────────────────────────────────
monitoringRouter.post('/test-sentry', authenticate, requireRole('owner', 'admin'), (req: Request, res: Response) => {
  const sentryEnabled = !!process.env.SENTRY_DSN;
  const testError = new Error('[Sentry Test] Deliberate test exception from /api/monitoring/test-sentry');
  captureException(testError, { route: req.path, triggeredBy: (req as any).user?.id ?? 'unknown' });
  captureMessage('[Sentry Test] Test message from DATIAM monitoring endpoint', 'info');
  res.json({
    success: true,
    sentry: sentryEnabled ? 'enabled' : 'disabled',
    message: sentryEnabled
      ? 'Test exception and message dispatched to Sentry — check your project Issues.'
      : 'SENTRY_DSN not set — events were silently dropped. Configure SENTRY_DSN in Railway Variables.',
  });
});
