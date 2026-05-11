import { Request, Response, NextFunction } from 'express';
import * as contentService from './content.service';
import { logActivity } from '../../lib/activityLogger';
import { success } from '../../utils/response';

export const createContentIdea = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const idea = await contentService.createContentIdea(req.body);
    logActivity({
      userId: req.user?.id,
      userEmail: req.user?.email,
      eventType: 'content_idea.created',
      module: 'content',
      entityType: 'content_idea',
      entityId: idea.id,
      title: `Content idea created: ${idea.hook ?? idea.content_type}`,
      description: `New ${idea.content_type} idea added to pipeline`,
      severity: 'info',
      requestId: req.requestId,
      metadata: { ideaId: idea.id, type: idea.content_type, hook: idea.hook },
    });
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
    logActivity({
      userId: req.user?.id,
      userEmail: req.user?.email,
      eventType: 'content_idea.updated',
      module: 'content',
      entityType: 'content_idea',
      entityId: idea.id,
      title: `Content idea updated: ${idea.hook ?? idea.content_type}`,
      description: `Updated ${idea.content_type} content idea`,
      severity: 'info',
      requestId: req.requestId,
      metadata: { ideaId: idea.id, type: idea.content_type, hook: idea.hook },
    });
    success(res, idea);
  } catch (err) { next(err); }
};

export const deleteContentIdea = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await contentService.deleteContentIdea(req.params.id);
    logActivity({
      userId: req.user?.id,
      userEmail: req.user?.email,
      eventType: 'content_idea.deleted',
      module: 'content',
      entityType: 'content_idea',
      entityId: req.params.id,
      title: `Content idea deleted`,
      description: `Removed content idea ${req.params.id} from pipeline`,
      severity: 'warning',
      requestId: req.requestId,
      metadata: { ideaId: req.params.id },
    });
    success(res, result);
  } catch (err) { next(err); }
};
