import { Request, Response, NextFunction } from 'express';
import { growthCRMService } from './growth-crm.service';
import { logActivity } from '../activity/activity.service';
import { success } from '../../utils/response';

export const createGroup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const row = await growthCRMService.createGroup({ ...req.body, created_by: req.user!.id });
    logActivity({ userId: req.user!.id, userEmail: req.user!.email, action: 'CREATE', entityType: 'contact_group', entityId: row.id, entityName: row.name });
    success(res, row, 201);
  } catch (err) { next(err); }
};

export const listGroups = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await growthCRMService.listGroups((req.query as any).artist_id)); }
  catch (err) { next(err); }
};

export const getGroup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await growthCRMService.getGroupById(req.params.id)); }
  catch (err) { next(err); }
};

export const updateGroup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const row = await growthCRMService.updateGroup(req.params.id, req.body);
    success(res, row);
  } catch (err) { next(err); }
};

export const deleteGroup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await growthCRMService.deleteGroup(req.params.id);
    logActivity({ userId: req.user!.id, userEmail: req.user!.email, action: 'DELETE', entityType: 'contact_group', entityId: req.params.id });
    success(res, { deleted: true });
  } catch (err) { next(err); }
};

export const addToGroup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await growthCRMService.addToGroup(req.params.id, req.params.contactId, req.user!.id);
    success(res, { added: true });
  } catch (err) { next(err); }
};

export const removeFromGroup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await growthCRMService.removeFromGroup(req.params.id, req.params.contactId);
    success(res, { removed: true });
  } catch (err) { next(err); }
};

export const getGroupMembers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await growthCRMService.getGroupContacts(req.params.id)); }
  catch (err) { next(err); }
};

export const logConversation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const row = await growthCRMService.logConversation(req.params.contactId, {
      ...req.body,
      created_by: req.user!.id,
    });
    logActivity({ userId: req.user!.id, userEmail: req.user!.email, action: 'CREATE', entityType: 'conversation', entityId: row.id, entityName: req.body.channel });
    success(res, row, 201);
  } catch (err) { next(err); }
};

export const getConversations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await growthCRMService.getConversations(req.params.contactId)); }
  catch (err) { next(err); }
};

export const getVipContacts = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await growthCRMService.getVipContacts()); }
  catch (err) { next(err); }
};

export const getTopCollaborators = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await growthCRMService.getTopCollaborators()); }
  catch (err) { next(err); }
};

export const updateCollaborationScore = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await growthCRMService.updateCollaborationScore(req.params.contactId)); }
  catch (err) { next(err); }
};
