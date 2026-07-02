import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  ingestSnapshotSchema,
  ingestPostAnalyticsSchema,
  ingestPlatformMetricsSchema,
  analyticsQuerySchema,
} from './analytics-hub.schema';
import * as ctrl from './analytics-hub.controller';

const router = Router();

router.use(authenticate);

const canWrite = requireRole('owner', 'admin', 'editor', 'team');

// Ingest endpoints (called by n8n / workers)
router.post('/snapshots',        canWrite, validate(ingestSnapshotSchema),        ctrl.ingestSnapshot);
router.post('/post-analytics',   canWrite, validate(ingestPostAnalyticsSchema),   ctrl.ingestPostAnalytics);
router.post('/platform-metrics', canWrite, validate(ingestPlatformMetricsSchema), ctrl.ingestPlatformMetrics);

// Read endpoints
router.get('/overview',                              ctrl.getOverview);
router.get('/by-platform',                           ctrl.getByPlatform);
router.get('/top-content',                           ctrl.getTopContent);
router.get('/platform-metrics',                      ctrl.getPlatformMetrics);
router.get('/accounts/:accountId/snapshots',         ctrl.getAccountSnapshots);

export default router;
