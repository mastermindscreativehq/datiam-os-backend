import { Router } from 'express';
import * as automationController from './automation.controller';
import { validate } from '../../middleware/validate';
import { authenticate, requireRole } from '../../middleware/auth';
import { webhookSchema, createRunSchema, updateRunSchema } from './automation.schema';

const router = Router();

const canWrite = requireRole('owner', 'admin', 'editor', 'team');
const canDelete = requireRole('owner', 'admin');

// Webhook does NOT require JWT — n8n sends the webhook secret header instead
router.post('/webhook', validate(webhookSchema), automationController.receiveWebhook);

// All other routes require auth
router.get('/runs', authenticate, automationController.getAutomationRuns);
router.post('/runs', authenticate, canWrite, validate(createRunSchema), automationController.createAutomationRun);
router.patch('/runs/:id', authenticate, canWrite, validate(updateRunSchema), automationController.updateAutomationRun);
router.delete('/runs/:id', authenticate, canDelete, automationController.deleteAutomationRun);

export default router;
