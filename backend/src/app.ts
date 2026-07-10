import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { requestId } from './middleware/requestId';
import { requestLogger } from './middleware/requestLogger';
import { requestTimeout } from './middleware/requestTimeout';
import { errorHandler } from './middleware/errorHandler';
import { pingRouter, healthRouter, monitoringRouter } from './modules/monitoring/health.routes';

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
import intelligenceRouter from './modules/intelligence/intelligence.routes';
import memoryRouter from './modules/memory/memory.routes';
import outreachRouter from './modules/outreach/outreach.routes';
import executionRouter from './modules/execution/execution.routes';
import repliesRouter from './modules/replies/reply.routes';
import meetingsRouter from './modules/meetings/meeting.routes';
import dealsRouter from './modules/deals/deal.routes';
import contractsRouter from './modules/contracts/contract.routes';
import paymentsRouter from './modules/payments/payment.routes';
import missionControlRouter from './modules/mission-control/missionControl.routes';
import releaseIntelligenceRouter from './modules/release-intelligence/release-intelligence.routes';
import releaseIntelRouter from './modules/release-intel/release-intel.routes';
import catalogEngineRouter from './modules/catalog-engine/catalog-engine.routes';
import artistIntelligenceRouter from './modules/artist-intelligence/artist-intelligence.routes';
import musicLinksRouter from './modules/music-links/music-links.routes';

// Growth OS routers
import contentVaultRouter from './modules/content/content-vault.routes';
import campaignManagerRouter from './modules/campaign-manager/campaign-manager.routes';
import socialAccountsRouter from './modules/social-accounts/social-accounts.routes';
import publishingEngineRouter from './modules/publishing-engine/publishing-engine.routes';
import analyticsHubRouter from './modules/analytics-hub/analytics-hub.routes';
import trendIntelligenceRouter from './modules/trend-intelligence/trend-intelligence.routes';
import growthCRMRouter from './modules/crm/growth-crm.routes';
import fanIntelligenceExtRouter from './modules/fan-intelligence/fan-intelligence-extension.routes';
import growthAIRouter from './modules/ai/growth-ai.routes';
import notificationsRouter from './modules/notifications/notifications.routes';

const app = express();
app.set('trust proxy', 1);

app.use(helmet());
app.use(requestId);

const DEFAULT_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'https://datiam-os.vercel.app',
  'https://datiam-os-git-main.vercel.app',
];

// ALLOWED_ORIGINS env var: comma-separated list of explicitly allowed origins.
// In production, set this in Railway Variables to the exact deployed URLs.
const ALLOWED_ORIGINS: Set<string> = new Set(
  process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
    : DEFAULT_ORIGINS,
);

// ALLOW_SERVER_TO_SERVER=true permits requests with no Origin header (internal
// service calls, cron jobs). Disabled by default in production.
const ALLOW_SERVER_TO_SERVER = process.env.ALLOW_SERVER_TO_SERVER === 'true';

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      if (ALLOW_SERVER_TO_SERVER) return callback(null, true);
      return callback(new Error('CORS: server-to-server requests are disabled. Set ALLOW_SERVER_TO_SERVER=true to enable.'));
    }
    if (ALLOWED_ORIGINS.has(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not in ALLOWED_ORIGINS`));
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
// 90s covers every route's own timeout budget (AI calls up to 90s) except the
// large-file audio upload endpoints, which stream multi-minute uploads.
app.use(requestTimeout(90_000, {
  skip: (req) => req.path.startsWith('/api/audio/upload') || req.path.startsWith('/api/audio/stems'),
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,  // returns RateLimit-* headers (RFC 6585)
  legacyHeaders: false,
  skip: (req) => req.path === '/ping', // liveness probe must never be blocked
  handler: (_req, res) => {
    res.status(429).json({ success: false, error: 'Rate limit exceeded. Try again later.' });
  },
});
app.use(limiter);

// ── Health & Monitoring ───────────────────────────────────────────────────────
app.use('/ping',   pingRouter);   // public liveness probe — returns {ok:true}
app.use('/health', healthRouter); // protected — requires owner/admin JWT

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

// ---- Sync Intelligence Engine ----
app.use('/api/intelligence', intelligenceRouter);

// ---- Memory Layer v1 ----
app.use('/api/memory', memoryRouter);

app.use('/api/outreach',   outreachRouter);
app.use('/api/execution', executionRouter);
app.use('/api/replies',   repliesRouter);
app.use('/api/meetings',  meetingsRouter);
app.use('/api/deals',     dealsRouter);
app.use('/api/contracts', contractsRouter);
app.use('/api/payments',  paymentsRouter);
app.use('/api/mission-control',      missionControlRouter);
app.use('/api/release-intelligence', releaseIntelligenceRouter);
app.use('/api/release-intel',        releaseIntelRouter);
app.use('/api/catalog',              catalogEngineRouter);
app.use('/api/catalog-engine',       catalogEngineRouter);
app.use('/api/artist-intelligence',  artistIntelligenceRouter);
app.use('/api/music-links',          musicLinksRouter);

// ---- Growth OS Routes ----
app.use('/api/growth/content',       contentVaultRouter);
app.use('/api/growth/campaigns',     campaignManagerRouter);
app.use('/api/growth/social-accounts', socialAccountsRouter);
app.use('/api/growth/publishing',    publishingEngineRouter);
app.use('/api/growth/analytics',     analyticsHubRouter);
app.use('/api/growth/trends',        trendIntelligenceRouter);
app.use('/api/growth/crm',           growthCRMRouter);
app.use('/api/growth/fans',          fanIntelligenceExtRouter);
app.use('/api/growth/ai',            growthAIRouter);
app.use('/api/growth/notifications', notificationsRouter);

// ---- System Routes ----
app.use('/api/system/migrations', migrationsRouter);

// ---- Monitoring API ----
app.use('/api/monitoring', monitoringRouter);

app.use(errorHandler);

export default app;
