import { Router } from 'express';
import * as automationController from './automation.controller';
import { validate } from '../../middleware/validate';
import { authenticate, requireRole } from '../../middleware/auth';
import {
  webhookSchema,
  createRunSchema,
  updateRunSchema,
  createWorkflowSchema,
  updateWorkflowSchema,
  triggerWorkflowSchema,
  runHistoryQuerySchema,
} from './automation.schema';

const router = Router();

const canWrite  = requireRole('owner', 'admin', 'editor', 'team');
const canDelete = requireRole('owner', 'admin');

// ── Inbound webhook (no JWT — n8n sends X-DATIAM-Secret) ──────────────────
router.post('/webhook', validate(webhookSchema), automationController.receiveWebhook);

// ── Stats & event types (dashboard) ───────────────────────────────────────
router.get('/stats',  authenticate, automationController.getAutomationStats);
router.get('/events', authenticate, automationController.getEventTypes);

// ── Dispatch event to all matching workflows ──────────────────────────────
router.post('/dispatch', authenticate, canWrite, automationController.dispatchEvent);

// ── Workflow Registry ─────────────────────────────────────────────────────
router.get('/registry',         authenticate, automationController.listWorkflows);
router.post('/registry',        authenticate, canWrite, validate(createWorkflowSchema), automationController.createWorkflow);
router.get('/registry/:id',     authenticate, automationController.getWorkflowById);
router.patch('/registry/:id',   authenticate, canWrite, validate(updateWorkflowSchema), automationController.updateWorkflow);
router.delete('/registry/:id',  authenticate, canDelete, automationController.deleteWorkflow);
router.post('/registry/:id/trigger', authenticate, canWrite, validate(triggerWorkflowSchema), automationController.triggerWorkflow);

// ── Run History (paginated + filtered) ───────────────────────────────────
router.get('/history', authenticate, validate(runHistoryQuerySchema, 'query'), automationController.getRunHistory);

// ── Automation Runs CRUD ──────────────────────────────────────────────────
router.get('/runs',          authenticate, automationController.getAutomationRuns);
router.post('/runs',         authenticate, canWrite, validate(createRunSchema), automationController.createAutomationRun);
router.patch('/runs/:id',    authenticate, canWrite, validate(updateRunSchema), automationController.updateAutomationRun);
router.delete('/runs/:id',   authenticate, canDelete, automationController.deleteAutomationRun);
router.post('/runs/:id/retry', authenticate, canWrite, automationController.retryRun);

export default router;
