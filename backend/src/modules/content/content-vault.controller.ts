import { Request, Response, NextFunction } from 'express';
import { contentVaultService } from './content-vault.service';
import { logActivity } from '../activity/activity.service';
import { success } from '../../utils/response';

export const createContent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const row = await contentVaultService.create({ ...req.body, created_by: req.user!.id });
    logActivity({ userId: req.user!.id, userEmail: req.user!.email, action: 'CREATE', entityType: 'content_vault', entityId: row.id, entityName: row.title ?? row.content_type });
    success(res, row, 201);
  } catch (err) { next(err); }
};

export const searchContent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rows = await contentVaultService.search(req.query as any);
    success(res, rows);
  } catch (err) { next(err); }
};

export const getContent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await contentVaultService.getById(req.params.id)); }
  catch (err) { next(err); }
};

export const updateContent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const row = await contentVaultService.update(req.params.id, req.body);
    logActivity({ userId: req.user!.id, userEmail: req.user!.email, action: 'UPDATE', entityType: 'content_vault', entityId: row.id, entityName: row.title ?? row.content_type });
    success(res, row);
  } catch (err) { next(err); }
};

export const deleteContent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await contentVaultService.delete(req.params.id);
    logActivity({ userId: req.user!.id, userEmail: req.user!.email, action: 'DELETE', entityType: 'content_vault', entityId: req.params.id });
    success(res, { deleted: true });
  } catch (err) { next(err); }
};

export const createVersion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const row = await contentVaultService.createVersion(req.params.id, req.user!.id, req.body.change_note);
    success(res, row, 201);
  } catch (err) { next(err); }
};

export const getVersions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await contentVaultService.getVersions(req.params.id)); }
  catch (err) { next(err); }
};

export const listTags = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await contentVaultService.getTags()); }
  catch (err) { next(err); }
};

export const createTag = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const row = await contentVaultService.createTag(req.body.name, req.body.color);
    success(res, row, 201);
  } catch (err) { next(err); }
};

export const linkTag = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await contentVaultService.linkTag(req.params.id, req.params.tagId);
    success(res, { linked: true });
  } catch (err) { next(err); }
};

export const unlinkTag = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await contentVaultService.unlinkTag(req.params.id, req.params.tagId);
    success(res, { unlinked: true });
  } catch (err) { next(err); }
};

export const getContentTags = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await contentVaultService.getContentTags(req.params.id)); }
  catch (err) { next(err); }
};
