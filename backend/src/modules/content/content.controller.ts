import { Request, Response, NextFunction } from 'express';
import * as contentService from './content.service';
import { success } from '../../utils/response';

export const createContentIdea = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await contentService.createContentIdea(req.body), 201); }
  catch (err) { next(err); }
};

export const getContentIdeas = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await contentService.getContentIdeas()); }
  catch (err) { next(err); }
};

export const updateContentIdea = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await contentService.updateContentIdea(req.params.id, req.body)); }
  catch (err) { next(err); }
};
