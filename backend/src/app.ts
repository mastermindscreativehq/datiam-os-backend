import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { errorHandler } from './middleware/errorHandler';

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

const app = express();
app.set('trust proxy', 1);

app.use(helmet());

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
  optionsSuccessStatus: 204,
}));
// Respond to preflight requests for all routes
app.options('*', cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

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

// ---- Phase 1 Routes ----
app.use('/api/auth', authRouter);
app.use('/api/artist', artistsRouter);
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

app.use(errorHandler);

export default app;
