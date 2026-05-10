import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { updateFanScoreSchema } from './fan-intelligence.schema';
import * as ctrl from './fan-intelligence.controller';

const router = Router();

router.use(authenticate);

router.get('/summary', ctrl.getSummary);
router.get('/segments', ctrl.getSegments);
router.get('/top-fans', ctrl.getTopFans);
router.get('/engagement', ctrl.getEngagement);
router.get('/geography', ctrl.getGeography);
router.get('/sources', ctrl.getSources);
router.get('/growth', ctrl.getGrowth);
router.get('/fans/:id/timeline', ctrl.getFanTimeline);
router.post('/fans/:id/recalculate', ctrl.recalculateFanScore);
router.patch('/fans/:id/score', validate(updateFanScoreSchema), ctrl.updateFanScore);

export default router;
