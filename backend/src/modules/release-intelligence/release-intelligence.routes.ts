import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { requestTimeout } from '../../middleware/requestTimeout';
import { reportSlowRequest } from '../../db/poolHealth';
import {
  createCampaignSchema,
  updateCampaignSchema,
  updateDspStatusSchema,
  updateReleaseFieldsSchema,
  dispatchReleaseAutomationSchema,
} from './release-intelligence.schema';
import * as controller from './release-intelligence.controller';

const router = Router();

// GET reads here (summary/dashboard/calendar/:id/readiness/dsp-status/
// campaigns/alerts/recommendations) are pure DB lookups with no legitimate
// reason to run long — a stricter, separate ceiling than the app-wide 90s
// lets us both fail fast for users and detect pool trouble quickly (see
// poolHealth.ts). Mutating routes (automation dispatch, alert/rec
// generation) can legitimately take longer (inline n8n webhook fan-out up
// to ~30s with retries) and keep the app-wide 90s ceiling.
router.use(requestTimeout(20_000, {
  skip: (req) => req.method !== 'GET',
  onTimeout: () => reportSlowRequest('release-intelligence'),
}));

router.use(authenticate);

const canRead  = requireRole('owner', 'admin', 'editor', 'team', 'viewer');
const canWrite = requireRole('owner', 'admin', 'editor', 'team');

// Summary — must be before /:id to avoid param capture
router.get('/summary',   canRead, controller.getSummaryHandler);
router.get('/dashboard', canRead, controller.getDashboardHandler);
router.get('/calendar',  canRead, controller.getCalendarHandler);

// Campaign sub-resource routes — must be before /:id
router.patch ('/campaigns/:campaignId', canWrite, validate(updateCampaignSchema), controller.updateCampaignHandler);
router.delete('/campaigns/:campaignId', canWrite,                                 controller.deleteCampaignHandler);

// Alert sub-resource routes — must be before /:id
router.patch('/alerts/:alertId/resolve', canWrite, controller.resolveAlertHandler);

// Recommendation sub-resource routes — must be before /:id
router.patch('/recommendations/:recId/action', canWrite, controller.actionRecommendationHandler);

// Release detail
router.get('/:id', canRead, controller.getReleaseDetailHandler);
router.patch('/:id', canWrite, validate(updateReleaseFieldsSchema), controller.updateReleaseHandler);

// Automation dispatch (playlist/sync/dj/blog/social/analytics/campaign)
router.post('/:id/automation/:category',
  canWrite, validate(dispatchReleaseAutomationSchema), controller.dispatchReleaseAutomationHandler);

// Readiness
router.get('/:id/readiness', canRead, controller.getReadinessHandler);

// DSP Status
router.get  ('/:id/dsp-status',          canRead,  controller.getDspStatusesHandler);
router.patch('/:id/dsp-status/:platform', canWrite, validate(updateDspStatusSchema), controller.updateDspStatusHandler);

// Campaigns
router.get ('/:id/campaigns', canRead,  controller.getCampaignsHandler);
router.post('/:id/campaigns', canWrite, validate(createCampaignSchema), controller.createCampaignHandler);

// Alerts
router.get ('/:id/alerts',          canRead,  controller.getAlertsHandler);
router.post('/:id/alerts/generate', canWrite, controller.generateAlertsHandler);

// AI Recommendations
router.get ('/:id/recommendations',          canRead,  controller.getRecommendationsHandler);
router.post('/:id/recommendations/generate', canWrite, controller.generateRecommendationsHandler);

export default router;
