import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { sql } from 'drizzle-orm';

import { requestId } from './middleware/requestId';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { db } from './db';

// Phase 1 routers
import authRouter from './modules/auth/auth.routes';
import artistsRouter from './modules/artists/artists.routes';
import catalogRouter from './modules/catalog/catalog.routes';
import { releasesRouter, releaseTasksRouter } from './modules/releases/releases.routes';
import royaltiesRouter from './modules/royalties/royalties.routes';
import syncRouter from './modules/sync/sync.routes';
import fansRouter from './modules/fans/fans.routes';
import contentRouter from './modules/content/content.routes';
import crmRouter from './modules/crm/crm.routes';
import automationRouter from './modules/automation/automation.routes';
import dashboardRouter from './modules/dashboard/dashboard.routes';

// Phase 2 routers
import fanIntelligenceRouter from './modules/fan-intelligence/fan-intelligence.routes';
import signalsRouter from './modules/signals/signals.routes';
import pipelineRouter from './modules/pipeline/pipeline.routes';
import schedulerRouter from './modules/scheduler/scheduler.routes';
import aiRouter from './modules/ai/ai.routes';
import activityRouter from './modules/activity/activity.routes';
import migrationsRouter from './modules/system/migrations.routes';
import { verifySchema } from './db/schemaVerifier';

const app = express();
app.set('trust proxy', 1);

app.use(helmet());
app.use(requestId);

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'https://datiam-os.vercel.app',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    // Allow any Vercel preview deployment
    if (/^https:\/\/[\w-]+\.vercel\.app$/.test(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Request-Id'],
  optionsSuccessStatus: 204,
}));
// Respond to preflight requests for all routes
app.options('*', cors());
app.use(express.json({ limit: '10mb' }));
app.use(requestLogger);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'datiam-os', timestamp: new Date().toISOString() });
});

app.get('/health/deep', async (_req, res) => {
  const timestamp = new Date().toISOString();
  try {
    await db.execute(sql`SELECT 1`);

    let schemaStatus: 'healthy' | 'drift_detected' = 'healthy';
    try {
      const report = await verifySchema();
      schemaStatus = report.healthy ? 'healthy' : 'drift_detected';
    } catch {
      // Non-fatal — schema check failure doesn't bring down health endpoint.
    }

    res.json({
      success: true,
      status: 'ok',
      environment: process.env.NODE_ENV ?? 'unknown',
      database: 'connected',
      schema: schemaStatus,
      timestamp,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(503).json({
      success: false,
      status: 'degraded',
      environment: process.env.NODE_ENV ?? 'unknown',
      database: 'disconnected',
      schema: 'unknown',
      error: message,
      timestamp,
    });
  }
});

// ---- Phase 1 Routes ----
app.use('/api/auth', authRouter);
app.use('/api/artists', artistsRouter);
app.use('/api/songs', catalogRouter);
app.use('/api/releases', releasesRouter);
app.use('/api/release-tasks', releaseTasksRouter);
app.use('/api/royalties', royaltiesRouter);
app.use('/api/sync/pitches', syncRouter);
app.use('/api/fans', fansRouter);
app.use('/api/content/ideas', contentRouter);
app.use('/api/crm/contacts', crmRouter);
app.use('/api/automation', automationRouter);
app.use('/api/dashboard', dashboardRouter);

// ---- Phase 2 Routes ----
app.use('/api/fan-intelligence', fanIntelligenceRouter);
app.use('/api/signals/content', signalsRouter);
app.use('/api/pipeline', pipelineRouter);
app.use('/api/scheduler/jobs', schedulerRouter);
app.use('/api/ai/recommendations', aiRouter);
app.use('/api/activity', activityRouter);

// ---- System Routes ----
app.use('/api/system/migrations', migrationsRouter);

app.use(errorHandler);

export default app;
