import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createTrendSchema,
  updateTrendSchema,
  trendFilterSchema,
  createRecommendationSchema,
} from './trend-intelligence.schema';
import * as ctrl from './trend-intelligence.controller';

const router = Router();

router.use(authenticate);

const canWrite = requireRole('owner', 'admin', 'editor', 'team');
const canDelete = requireRole('owner', 'admin');

// Static paths before :id
router.get('/active',                                 ctrl.getActiveTrends);
router.get('/recommendations/artist/:artistId',       ctrl.getArtistRecommendations);

// Trend CRUD
router.post('/',    canWrite, validate(createTrendSchema),  ctrl.createTrend);
router.get('/',    validate(trendFilterSchema, 'query'),    ctrl.listTrends);
router.get('/:id',                                          ctrl.getTrend);
router.patch('/:id', canWrite, validate(updateTrendSchema), ctrl.updateTrend);
router.post('/:id/expire',  canWrite,                       ctrl.expireTrend);
router.post('/:id/archive', canDelete,                      ctrl.archiveTrend);

// Recommendations
router.post('/:id/recommendations',           canWrite, validate(createRecommendationSchema), ctrl.createRecommendation);
router.get('/:id/recommendations',                                                             ctrl.getRecommendations);
router.post('/recommendations/:recId/act-on', canWrite,                                        ctrl.markRecommendationActedOn);

export default router;
