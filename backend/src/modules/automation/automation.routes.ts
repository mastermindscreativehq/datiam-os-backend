import { Router } from 'express';
import * as automationController from './automation.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { webhookSchema, createRunSchema } from './automation.schema';

const router = Router();

// Webhook does NOT require JWT — n8n sends the webhook secret header instead
router.post('/webhook', validate(webhookSchema), automationController.receiveWebhook);

// All other routes require auth
router.get('/runs', authenticate, automationController.getAutomationRuns);
router.post('/runs', authenticate, validate(createRunSchema), automationController.createAutomationRun);

export default router;
