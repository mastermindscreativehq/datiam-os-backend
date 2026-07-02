import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createSocialAccountSchema,
  updateSocialAccountSchema,
  updateMetricsSchema,
  socialAccountFilterSchema,
} from './social-accounts.schema';
import * as ctrl from './social-accounts.controller';

const router = Router();

router.use(authenticate);

const canWrite = requireRole('owner', 'admin', 'editor', 'team');
const canDelete = requireRole('owner', 'admin');

// Static paths before :id
router.get('/platforms',  ctrl.getPlatforms);
router.get('/countries',  ctrl.getCountries);

// Account CRUD
router.post('/',    canWrite, validate(createSocialAccountSchema),          ctrl.createAccount);
router.get('/',    validate(socialAccountFilterSchema, 'query'),             ctrl.listAccounts);
router.get('/:id',                                                           ctrl.getAccount);
router.patch('/:id', canWrite, validate(updateSocialAccountSchema),         ctrl.updateAccount);
router.delete('/:id', canDelete,                                             ctrl.deleteAccount);

// Metrics
router.post('/:id/metrics', canWrite, validate(updateMetricsSchema),        ctrl.updateMetrics);

export default router;
