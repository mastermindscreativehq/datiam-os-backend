import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createPaymentSchema,
  sendInvoiceSchema,
  recordPaymentSchema,
  updatePaymentStatusSchema,
} from './payment.schema';
import * as controller from './payment.controller';

const router = Router();

router.use(authenticate);

const canRead  = requireRole('owner', 'admin', 'editor', 'team', 'viewer');
const canWrite = requireRole('owner', 'admin', 'editor', 'team');

// Analytics — must come before /:id to avoid param capture
router.get('/analytics', canRead, controller.getPaymentAnalyticsHandler);

// CRUD + actions
router.post  ('/create',          canWrite, validate(createPaymentSchema),        controller.createPaymentHandler);
router.post  ('/send-invoice',    canWrite, validate(sendInvoiceSchema),           controller.sendInvoiceHandler);
router.post  ('/record-payment',  canWrite, validate(recordPaymentSchema),         controller.recordPaymentHandler);
router.get   ('/',                canRead,                                           controller.listPaymentsHandler);
router.get   ('/:id',             canRead,                                           controller.getPaymentHandler);
router.patch ('/:id/status',      canWrite, validate(updatePaymentStatusSchema),   controller.updatePaymentStatusHandler);

export default router;
