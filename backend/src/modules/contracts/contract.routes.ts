import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createContractSchema,
  sendContractSchema,
  updateContractStatusSchema,
} from './contract.schema';
import * as controller from './contract.controller';

const router = Router();

router.use(authenticate);

const canRead  = requireRole('owner', 'admin', 'editor', 'team', 'viewer');
const canWrite = requireRole('owner', 'admin', 'editor', 'team');

// Analytics — must come before /:id to avoid param capture
router.get('/analytics', canRead, controller.getContractAnalyticsHandler);

// CRUD + actions
router.post  ('/create',       canWrite, validate(createContractSchema),       controller.createContractHandler);
router.post  ('/send',         canWrite, validate(sendContractSchema),          controller.sendContractHandler);
router.get   ('/',             canRead,                                          controller.listContractsHandler);
router.get   ('/:id',          canRead,                                          controller.getContractHandler);
router.patch ('/:id/status',   canWrite, validate(updateContractStatusSchema),  controller.updateContractStatusHandler);

export default router;
