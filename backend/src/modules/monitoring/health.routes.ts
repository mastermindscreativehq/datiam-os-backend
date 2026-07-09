import { Router, Request, Response } from 'express';
import { sql, desc, eq, and, inArray } from 'drizzle-orm';
import { db } from '../../db';
import {
  getRedisConnection,
  growthPublishQueue,
  growthAnalyticsSyncQueue,
  growthTrendScanQueue,
  growthAmbassadorQueue,
  growthAIGenerationQueue,
  growthContentSyncQueue,
  missionPlaylistQueue,
  missionSyncQueue,
  missionFanQueue,
  missionContentQueue,
  missionOutreachQueue,
  missionAnalyticsQueue,
} from '../../queues';
import { health_checks, incidents, workflow_registry, automation_runs } from '../../db/schema';
import { authenticate, requireRole } from '../../middleware/auth';
import { env } from '../../config/env';
import { checkN8nHealth } from '../automation/automation.service';
import { MISSION_WORKFLOW_NAME } from '../release-intel/mission-dispatcher.service';

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

healthRouter.get('/growth', authenticate, requireRole('owner', 'admin'), async (_req: Request, res: Response) => {
  const GROWTH_QUEUES = [
    { name: 'growth-publish',          queue: growthPublishQueue },
    { name: 'growth-analytics-sync',   queue: growthAnalyticsSyncQueue },
    { name: 'growth-trend-scan',       queue: growthTrendScanQueue },
    { name: 'growth-ambassador-score', queue: growthAmbassadorQueue },
    { name: 'growth-ai-generation',    queue: growthAIGenerationQueue },
    { name: 'growth-content-sync',     queue: growthContentSyncQueue },
  ];

  const queueStats = await Promise.all(
    GROWTH_QUEUES.map(async ({ name, queue }) => {
      if (!queue) return { name, status: 'not_configured', waiting: 0, active: 0, failed: 0 };
      try {
        const [waiting, active, failed] = await Promise.all([
          queue.getWaitingCount(),
          queue.getActiveCount(),
          queue.getFailedCount(),
        ]);
        return { name, status: 'healthy', waiting, active, failed };
      } catch {
        return { name, status: 'error', waiting: 0, active: 0, failed: 0 };
      }
    }),
  );

  const hasErrors = queueStats.some(q => q.status === 'error');
  const configured = queueStats.filter(q => q.status !== 'not_configured').length;

  res.json({
    success: true,
    status: hasErrors ? 'degraded' : 'healthy',
    configured_queues: configured,
    total_queues: GROWTH_QUEUES.length,
    queues: queueStats,
    timestamp: new Date().toISOString(),
  });
});

// Shared by both healthRouter (/health/missions — ops/curl parity with
// /health/growth) and monitoringRouter (/api/monitoring/missions — reachable
// from the frontend via the existing apiClient baseURL, since healthRouter
// is mounted outside /api).
async function buildMissionsHealthStatus() {
  const MISSION_QUEUES = [
    { name: 'playlist',  workflow: MISSION_WORKFLOW_NAME.playlist,   queue: missionPlaylistQueue },
    { name: 'sync',      workflow: MISSION_WORKFLOW_NAME.sync,       queue: missionSyncQueue },
    { name: 'fan',       workflow: MISSION_WORKFLOW_NAME.fan_growth, queue: missionFanQueue },
    { name: 'content',   workflow: MISSION_WORKFLOW_NAME.content,    queue: missionContentQueue },
    { name: 'outreach',  workflow: MISSION_WORKFLOW_NAME.outreach,   queue: missionOutreachQueue },
    { name: 'analytics', workflow: MISSION_WORKFLOW_NAME.analytics,  queue: missionAnalyticsQueue },
  ];

  const [queueStats, n8nHealth, registryRows] = await Promise.all([
    Promise.all(
      MISSION_QUEUES.map(async ({ name, workflow, queue }) => {
        if (!queue) return { name, workflow, status: 'not_configured', waiting: 0, active: 0, failed: 0, delayed: 0 };
        try {
          const [waiting, active, failed, delayed] = await Promise.all([
            queue.getWaitingCount(),
            queue.getActiveCount(),
            queue.getFailedCount(),
            queue.getDelayedCount(),
          ]);
          return { name, workflow, status: 'healthy', waiting, active, failed, delayed };
        } catch {
          return { name, workflow, status: 'error', waiting: 0, active: 0, failed: 0, delayed: 0 };
        }
      }),
    ),
    checkN8nHealth(),
    db.select().from(workflow_registry).where(inArray(workflow_registry.name, MISSION_QUEUES.map((q) => q.workflow))),
  ]);

  const workflowNames = MISSION_QUEUES.map((q) => q.workflow);
  const runsAgg = await db
    .select({
      workflow_name: automation_runs.workflow_name,
      total: sql<number>`count(*)::int`,
      succeeded: sql<number>`count(*) filter (where status = 'success')::int`,
      failed: sql<number>`count(*) filter (where status = 'failed')::int`,
      avg_duration_ms: sql<number>`coalesce(avg(duration_ms) filter (where duration_ms is not null), 0)::int`,
      last_dispatch: sql<string>`max(created_at)`,
    })
    .from(automation_runs)
    .where(inArray(automation_runs.workflow_name, workflowNames))
    .groupBy(automation_runs.workflow_name);

  const runsByWorkflow = new Map(runsAgg.map((r) => [r.workflow_name, r]));
  const registryByName = new Map(registryRows.map((r) => [r.name, r]));

  const workflows = MISSION_QUEUES.map(({ workflow }) => {
    const registry = registryByName.get(workflow) ?? null;
    const runs = runsByWorkflow.get(workflow) ?? null;
    return {
      name: workflow,
      registered: Boolean(registry),
      is_active: registry?.is_active ?? false,
      health_status: registry?.health_status ?? 'unknown',
      total_runs: runs?.total ?? registry?.total_runs ?? 0,
      success_count: runs?.succeeded ?? registry?.success_count ?? 0,
      failed_count: runs?.failed ?? registry?.failed_count ?? 0,
      avg_runtime_ms: runs?.avg_duration_ms ?? 0,
      last_dispatch_at: runs?.last_dispatch ?? registry?.last_run_at ?? null,
      throughput_per_hour: null as number | null,
    };
  });

  const throughput = await db
    .select({ workflow_name: automation_runs.workflow_name, count: sql<number>`count(*)::int` })
    .from(automation_runs)
    .where(and(inArray(automation_runs.workflow_name, workflowNames), sql`created_at >= now() - interval '1 hour'`))
    .groupBy(automation_runs.workflow_name);
  const throughputByWorkflow = new Map(throughput.map((t) => [t.workflow_name, t.count]));
  workflows.forEach((w) => { w.throughput_per_hour = throughputByWorkflow.get(w.name) ?? 0; });

  const dlq = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(automation_runs)
    .where(and(inArray(automation_runs.workflow_name, workflowNames), sql`status = 'failed' AND retry_count >= max_retries - 1 AND max_retries > 0`));

  const hasQueueErrors = queueStats.some((q) => q.status === 'error');
  const hasFailedWorkflows = workflows.some((w) => w.failed_count > w.success_count && w.total_runs > 0);
  const status = hasQueueErrors || hasFailedWorkflows ? 'degraded' : 'healthy';

  return {
    success: true,
    status,
    n8n: n8nHealth,
    queues: queueStats,
    workflows,
    dead_letter_count: dlq[0]?.count ?? 0,
    configured_queues: queueStats.filter((q) => q.status !== 'not_configured').length,
    total_queues: MISSION_QUEUES.length,
    timestamp: new Date().toISOString(),
  };
}

healthRouter.get('/missions', authenticate, requireRole('owner', 'admin'), async (_req: Request, res: Response) => {
  res.json(await buildMissionsHealthStatus());
});

monitoringRouter.get('/missions', authenticate, async (_req: Request, res: Response) => {
  res.json(await buildMissionsHealthStatus());
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
