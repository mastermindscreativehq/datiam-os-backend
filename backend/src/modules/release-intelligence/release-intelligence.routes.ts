import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createCampaignSchema,
  updateCampaignSchema,
  updateDspStatusSchema,
} from './release-intelligence.schema';
import * as controller from './release-intelligence.controller';

const router = Router();
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
