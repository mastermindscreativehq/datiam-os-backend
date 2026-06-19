import { Router, Request, Response } from 'express';
import { sql, desc, eq, and } from 'drizzle-orm';
import { db } from '../../db';
import { getRedisConnection } from '../../queues';
import { health_checks, incidents } from '../../db/schema';
import { authenticate, requireRole } from '../../middleware/auth';
import { env } from '../../config/env';

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
