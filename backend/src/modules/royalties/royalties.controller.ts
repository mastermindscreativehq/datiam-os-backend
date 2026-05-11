import { Request, Response, NextFunction } from 'express';
import * as royaltiesService from './royalties.service';
import { logActivity } from '../../lib/activityLogger';
import { success } from '../../utils/response';

export const createRoyalty = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const royalty = await royaltiesService.createRoyalty(req.body);
    logActivity({
      userId: req.user?.id,
      userEmail: req.user?.email,
      eventType: 'royalty_source.created',
      module: 'royalties',
      entityType: 'royalty_source',
      entityId: royalty.id,
      title: `Royalty source added: ${royalty.platform} – ${royalty.royalty_type}`,
      description: `Imported royalty data from ${royalty.platform} (${royalty.royalty_type})`,
      severity: 'info',
      requestId: req.requestId,
      metadata: { royaltyId: royalty.id, platform: royalty.platform, type: royalty.royalty_type },
    });
    success(res, royalty, 201);
  } catch (err) { next(err); }
};

export const getRoyalties = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await royaltiesService.getRoyalties()); }
  catch (err) { next(err); }
};

export const getRoyaltiesBySong = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await royaltiesService.getRoyaltiesBySong(req.params.songId)); }
  catch (err) { next(err); }
};

export const deleteRoyalty = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await royaltiesService.deleteRoyalty(req.params.id);
    logActivity({
      userId: req.user?.id,
      userEmail: req.user?.email,
      eventType: 'royalty_source.deleted',
      module: 'royalties',
      entityType: 'royalty_source',
      entityId: req.params.id,
      title: `Royalty source deleted`,
      description: `Removed royalty source ${req.params.id}`,
      severity: 'warning',
      requestId: req.requestId,
      metadata: { royaltyId: req.params.id },
    });
    success(res, result);
  } catch (err) { next(err); }
};
