import { Request, Response, NextFunction } from 'express';
import { socialAccountService } from './social-accounts.service';
import { logActivity } from '../activity/activity.service';
import { success } from '../../utils/response';

export const createAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const row = await socialAccountService.create(req.body);
    logActivity({ userId: req.user!.id, userEmail: req.user!.email, action: 'CREATE', entityType: 'social_account', entityId: row.id, entityName: row.username });
    success(res, row, 201);
  } catch (err) { next(err); }
};

export const listAccounts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rows = await socialAccountService.list((req.query as any).artist_id);
    success(res, rows);
  } catch (err) { next(err); }
};

export const getAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await socialAccountService.getById(req.params.id)); }
  catch (err) { next(err); }
};

export const updateAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const row = await socialAccountService.update(req.params.id, req.body);
    logActivity({ userId: req.user!.id, userEmail: req.user!.email, action: 'UPDATE', entityType: 'social_account', entityId: row.id, entityName: row.username });
    success(res, row);
  } catch (err) { next(err); }
};

export const deleteAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await socialAccountService.delete(req.params.id);
    logActivity({ userId: req.user!.id, userEmail: req.user!.email, action: 'DELETE', entityType: 'social_account', entityId: req.params.id });
    success(res, { deleted: true });
  } catch (err) { next(err); }
};

export const updateMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const row = await socialAccountService.updateMetrics(req.params.id, req.body);
    success(res, row);
  } catch (err) { next(err); }
};

export const getPlatforms = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await socialAccountService.getPlatforms()); }
  catch (err) { next(err); }
};

export const getCountries = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await socialAccountService.getCountries()); }
  catch (err) { next(err); }
};
