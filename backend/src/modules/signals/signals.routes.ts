import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as ctrl from './signals.controller';

const router = Router();

router.use(authenticate);

router.get('/summary', ctrl.getSummary);
router.get('/funnel', ctrl.getFunnel);
router.get('/by-platform', ctrl.getByPlatform);
router.get('/by-type', ctrl.getByType);
router.get('/velocity', ctrl.getVelocity);
router.get('/scheduled', ctrl.getScheduled);

export default router;
