import { Request, Response, NextFunction } from 'express';
import * as contentService from './content.service';
import { logActivity } from '../activity/activity.service';
import { success } from '../../utils/response';

export const createContentIdea = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const idea = await contentService.createContentIdea(req.body);
    logActivity({ userId: req.user!.id, userEmail: req.user!.email, action: 'CREATE', entityType: 'content_idea', entityId: idea.id, entityName: idea.hook ?? idea.content_type });
    success(res, idea, 201);
  } catch (err) { next(err); }
};

export const getContentIdeas = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await contentService.getContentIdeas()); }
  catch (err) { next(err); }
};

export const updateContentIdea = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const idea = await contentService.updateContentIdea(req.params.id, req.body);
    logActivity({ userId: req.user!.id, userEmail: req.user!.email, action: 'UPDATE', entityType: 'content_idea', entityId: idea.id, entityName: idea.hook ?? idea.content_type });
    success(res, idea);
  } catch (err) { next(err); }
};

export const deleteContentIdea = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await contentService.deleteContentIdea(req.params.id);
    logActivity({ userId: req.user!.id, userEmail: req.user!.email, action: 'DELETE', entityType: 'content_idea', entityId: req.params.id });
    success(res, result);
  } catch (err) { next(err); }
};
