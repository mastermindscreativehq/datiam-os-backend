import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import * as ctrl from './fan-intelligence-extension.controller';

const router = Router();

router.use(authenticate);

const canWrite = requireRole('owner', 'admin', 'editor', 'team');

router.get('/ambassadors',            ctrl.getTopAmbassadors);
router.get('/ambassadors/candidates', ctrl.getAmbassadorCandidates);
router.post('/ambassadors/recalculate', canWrite, ctrl.batchRecalculate);
router.get('/referrals',              ctrl.getReferralActivity);
router.get('/community-metrics',      ctrl.getCommunityMetrics);
router.post('/:fanId/ambassador-score/recalculate', canWrite, ctrl.recalculateSingle);
router.get('/:fanId/favorite-content', ctrl.getFavoriteContent);

export default router;
