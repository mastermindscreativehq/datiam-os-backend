import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { analyzeReleaseSchema, updateMissionSchema, missionCallbackSchema } from './release-intel.schema';
import * as controller from './release-intel.controller';

const router = Router();

// ── Inbound n8n callback (no JWT — n8n sends X-DATIAM-Secret, same model as
// /api/automation/webhook) — must be registered before router.use(authenticate).
router.post('/missions/:missionId/callback', validate(missionCallbackSchema), controller.missionCallbackHandler);

router.use(authenticate);

const canRead = requireRole('owner', 'admin', 'editor', 'team', 'viewer');
const canWrite = requireRole('owner', 'admin', 'editor', 'team');

// Mission sub-resource routes — must be registered before /:releaseId to avoid param capture
router.patch('/missions/:missionId', canWrite, validate(updateMissionSchema), controller.updateMissionHandler);
router.post('/missions/:missionId/dispatch', canWrite, controller.dispatchMissionHandler);
router.post('/missions/:missionId/retry', canWrite, controller.retryMissionHandler);
router.post('/missions/:missionId/cancel', canWrite, controller.cancelMissionHandler);
router.get('/missions/:missionId/execution', canRead, controller.getMissionExecutionHandler);

router.get('/:releaseId', canRead, controller.getSnapshotHandler);
router.post('/:releaseId/analyze', canWrite, validate(analyzeReleaseSchema), controller.analyzeReleaseHandler);
router.get('/:releaseId/brief', canRead, controller.getBriefHandler);
router.get('/:releaseId/missions', canRead, controller.getMissionsHandler);

export default router;
