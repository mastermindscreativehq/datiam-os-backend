import { Request, Response, NextFunction } from 'express';
import { publishingEngineService } from './publishing-engine.service';
import { logActivity } from '../activity/activity.service';
import { success } from '../../utils/response';

export const schedulePost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const row = await publishingEngineService.schedulePost({
      ...req.body,
      scheduled_for: new Date(req.body.scheduled_for),
      created_by: req.user!.id,
    });
    logActivity({ userId: req.user!.id, userEmail: req.user!.email, action: 'CREATE', entityType: 'scheduled_post', entityId: row.id, entityName: `Post for ${row.social_account_id}` });
    success(res, row, 201);
  } catch (err) { next(err); }
};

export const getQueue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filters = req.query as any;
    if (filters.from) filters.from = new Date(filters.from);
    success(res, await publishingEngineService.getScheduledPosts(filters));
  } catch (err) { next(err); }
};

export const getScheduledPost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await publishingEngineService.getById(req.params.id)); }
  catch (err) { next(err); }
};

export const updateScheduledPost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const row = await publishingEngineService.updateScheduledPost(req.params.id, req.body);
    success(res, row);
  } catch (err) { next(err); }
};

export const cancelPost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const row = await publishingEngineService.cancelPost(req.params.id);
    logActivity({ userId: req.user!.id, userEmail: req.user!.email, action: 'UPDATE', entityType: 'scheduled_post', entityId: row.id, entityName: 'cancelled' });
    success(res, row);
  } catch (err) { next(err); }
};

export const getPublished = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await publishingEngineService.getPublishedPosts(req.query as any)); }
  catch (err) { next(err); }
};

export const saveCaption = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const row = await publishingEngineService.saveCaption(
      req.params.id,
      req.body.caption,
      req.body.caption_source,
      req.body.ai_model,
    );
    success(res, row, 201);
  } catch (err) { next(err); }
};

export const approveCaption = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const row = await publishingEngineService.approveCaption(req.params.captionId, req.user!.id);
    success(res, row);
  } catch (err) { next(err); }
};

export const getCaptions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await publishingEngineService.getCaptions(req.params.id)); }
  catch (err) { next(err); }
};
