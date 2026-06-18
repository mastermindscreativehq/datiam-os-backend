import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createDealSchema,
  updateDealSchema,
  updateDealStageSchema,
  updateDealStatusSchema,
} from './deal.schema';
import * as controller from './deal.controller';

const router = Router();

router.use(authenticate);

const canRead  = requireRole('owner', 'admin', 'editor', 'team', 'viewer');
const canWrite = requireRole('owner', 'admin', 'editor', 'team');

// Analytics — must come before /:id to avoid param capture
router.get('/analytics', canRead, controller.getDealAnalyticsHandler);

// CRUD
router.post  ('/create',      canWrite, validate(createDealSchema),       controller.createDealHandler);
router.get   ('/',            canRead,                                      controller.listDealsHandler);
router.get   ('/:id',         canRead,                                      controller.getDealHandler);
router.patch ('/:id',         canWrite, validate(updateDealSchema),        controller.updateDealHandler);
router.patch ('/:id/stage',   canWrite, validate(updateDealStageSchema),   controller.updateDealStageHandler);
router.patch ('/:id/status',  canWrite, validate(updateDealStatusSchema),  controller.updateDealStatusHandler);

export default router;
