import { Router } from 'express';
import * as automationController from './automation.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { webhookSchema } from './automation.schema';

const router = Router();

// Webhook does NOT require JWT — n8n sends the webhook secret header instead
router.post('/webhook', validate(webhookSchema), automationController.receiveWebhook);

// Viewing runs requires auth
router.get('/runs', authenticate, automationController.getAutomationRuns);

export default router;
