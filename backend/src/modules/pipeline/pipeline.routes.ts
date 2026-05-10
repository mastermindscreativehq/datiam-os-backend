import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as ctrl from './pipeline.controller';

const router = Router();

router.use(authenticate);

router.get('/overview', ctrl.getOverview);
router.get('/timeline', ctrl.getTimeline);
router.get('/releases/:id/readiness', ctrl.getReleaseReadiness);

export default router;
