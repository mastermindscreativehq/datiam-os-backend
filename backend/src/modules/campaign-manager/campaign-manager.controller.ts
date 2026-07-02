import { Request, Response, NextFunction } from 'express';
import { campaignManagerService } from './campaign-manager.service';
import { logActivity } from '../activity/activity.service';
import { success } from '../../utils/response';

export const createCampaign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const row = await campaignManagerService.create({ ...req.body, created_by: req.user!.id });
    logActivity({ userId: req.user!.id, userEmail: req.user!.email, action: 'CREATE', entityType: 'campaign', entityId: row.id, entityName: row.name });
    success(res, row, 201);
  } catch (err) { next(err); }
};

export const listCampaigns = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await campaignManagerService.list(req.query as any)); }
  catch (err) { next(err); }
};

export const getCampaign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await campaignManagerService.getById(req.params.id)); }
  catch (err) { next(err); }
};

export const updateCampaign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const row = await campaignManagerService.update(req.params.id, req.body);
    logActivity({ userId: req.user!.id, userEmail: req.user!.email, action: 'UPDATE', entityType: 'campaign', entityId: row.id, entityName: row.name });
    success(res, row);
  } catch (err) { next(err); }
};

export const deleteCampaign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await campaignManagerService.delete(req.params.id);
    logActivity({ userId: req.user!.id, userEmail: req.user!.email, action: 'DELETE', entityType: 'campaign', entityId: req.params.id });
    success(res, { deleted: true });
  } catch (err) { next(err); }
};

export const transitionStage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const row = await campaignManagerService.transitionStage(req.params.id, req.body.stage);
    logActivity({ userId: req.user!.id, userEmail: req.user!.email, action: 'UPDATE', entityType: 'campaign_stage', entityId: row.id, entityName: req.body.stage });
    success(res, row);
  } catch (err) { next(err); }
};

export const getStages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await campaignManagerService.getStages(req.params.id)); }
  catch (err) { next(err); }
};

export const createTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const row = await campaignManagerService.createTask(req.params.id, req.body);
    success(res, row, 201);
  } catch (err) { next(err); }
};

export const getTasks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await campaignManagerService.getTasks(req.params.id)); }
  catch (err) { next(err); }
};

export const updateTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const row = await campaignManagerService.updateTask(req.params.taskId, req.body);
    success(res, row);
  } catch (err) { next(err); }
};

export const createKpi = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const row = await campaignManagerService.createKpi(req.params.id, req.body);
    success(res, row, 201);
  } catch (err) { next(err); }
};

export const getKpis = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await campaignManagerService.getKpis(req.params.id)); }
  catch (err) { next(err); }
};

export const updateKpi = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const row = await campaignManagerService.updateKpiValue(req.params.kpiId, req.body.actual_value);
    success(res, row);
  } catch (err) { next(err); }
};

export const linkContent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await campaignManagerService.linkContent(req.params.id, req.params.contentId);
    success(res, { linked: true });
  } catch (err) { next(err); }
};

export const unlinkContent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await campaignManagerService.unlinkContent(req.params.id, req.params.contentId);
    success(res, { unlinked: true });
  } catch (err) { next(err); }
};

export const getLinkedContent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await campaignManagerService.getLinkedContent(req.params.id)); }
  catch (err) { next(err); }
};

export const getCampaignPerformance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await campaignManagerService.getPerformanceSummary(req.params.id)); }
  catch (err) { next(err); }
};
