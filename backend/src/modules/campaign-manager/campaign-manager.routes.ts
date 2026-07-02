import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createCampaignSchema,
  updateCampaignSchema,
  campaignFilterSchema,
  transitionStageSchema,
  createTaskSchema,
  updateTaskSchema,
  createKpiSchema,
  updateKpiSchema,
} from './campaign-manager.schema';
import * as ctrl from './campaign-manager.controller';

const router = Router();

router.use(authenticate);

const canWrite = requireRole('owner', 'admin', 'editor', 'team');
const canDelete = requireRole('owner', 'admin');

// Campaign CRUD
router.post('/',    canWrite, validate(createCampaignSchema),           ctrl.createCampaign);
router.get('/',    validate(campaignFilterSchema, 'query'),              ctrl.listCampaigns);
router.get('/:id',                                                       ctrl.getCampaign);
router.patch('/:id', canWrite, validate(updateCampaignSchema),          ctrl.updateCampaign);
router.delete('/:id', canDelete,                                         ctrl.deleteCampaign);
router.get('/:id/performance',                                           ctrl.getCampaignPerformance);

// Stage
router.post('/:id/stage', canWrite, validate(transitionStageSchema),    ctrl.transitionStage);
router.get('/:id/stages',                                                ctrl.getStages);

// Tasks
router.post('/:id/tasks',              canWrite, validate(createTaskSchema), ctrl.createTask);
router.get('/:id/tasks',                                                      ctrl.getTasks);
router.patch('/:id/tasks/:taskId',     canWrite, validate(updateTaskSchema),  ctrl.updateTask);

// KPIs
router.post('/:id/kpis',             canWrite, validate(createKpiSchema),   ctrl.createKpi);
router.get('/:id/kpis',                                                      ctrl.getKpis);
router.patch('/:id/kpis/:kpiId',     canWrite, validate(updateKpiSchema),   ctrl.updateKpi);

// Content links
router.post('/:id/content/:contentId',   canWrite, ctrl.linkContent);
router.delete('/:id/content/:contentId', canWrite, ctrl.unlinkContent);
router.get('/:id/content',                         ctrl.getLinkedContent);

export default router;
