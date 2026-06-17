import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { requestId } from './middleware/requestId';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { healthRouter, monitoringRouter } from './modules/monitoring/health.routes';

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
import musicIntelligenceRouter from './modules/music-intelligence/music-intelligence.routes';
import sonicWorldRouter from './modules/sonic-world/sonic-world.routes';
import activityRouter from './modules/activity/activity.routes';
import migrationsRouter from './modules/system/migrations.routes';
import audioRouter from './modules/audio/audio.routes';
import energyRouter from './modules/energy/energy.routes';
import audioDnaRouter from './modules/audio-dna/audio-dna.routes';
import syncIntelligenceRouter from './modules/sync-intelligence/sync-intelligence.routes';
import commercialIntelligenceRouter from './modules/commercial-intelligence/commercial-intelligence.router';

// Phase 1.5 Grounding Foundation routers
import companiesRouter from './modules/companies/companies.routes';
import licensingContactsRouter from './modules/licensing-contacts/licensing-contacts.routes';
import placementOutcomesRouter from './modules/placement-outcomes/placement-outcomes.routes';
import predictionAccuracyRouter from './modules/prediction-accuracy/prediction-accuracy.routes';

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

// ── Health & Monitoring ───────────────────────────────────────────────────────
app.use('/health', healthRouter);

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
app.use('/api/music-intelligence', musicIntelligenceRouter);
app.use('/api/sonic-world', sonicWorldRouter);
app.use('/api/activity', activityRouter);

// ---- Audio Pipeline Routes (Phase 6) ----
app.use('/api/audio', audioRouter);

// ---- Energy Intelligence Engine (Phase 7) ----
app.use('/api/energy', energyRouter);

// ---- DATIAM Intelligence Phase 1 ----
app.use('/api/audio-dna', audioDnaRouter);
app.use('/api/sync-intelligence', syncIntelligenceRouter);

// ---- Commercial Intelligence Engine (DATIAM OS v4) ----
app.use('/api/commercial-intelligence', commercialIntelligenceRouter);

// ---- Phase 1.5 Grounding Foundation ----
app.use('/api/companies',          companiesRouter);
app.use('/api/licensing-contacts', licensingContactsRouter);
app.use('/api/placement-outcomes', placementOutcomesRouter);
app.use('/api/prediction-accuracy', predictionAccuracyRouter);

// ---- System Routes ----
app.use('/api/system/migrations', migrationsRouter);

// ---- Monitoring API ----
app.use('/api/monitoring', monitoringRouter);

app.use(errorHandler);

export default app;
