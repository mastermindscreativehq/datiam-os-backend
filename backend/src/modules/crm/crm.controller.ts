import { Request, Response, NextFunction } from 'express';
import * as crmService from './crm.service';
import { logActivity } from '../activity/activity.service';
import { success } from '../../utils/response';

export const createContact = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const contact = await crmService.createContact(req.body);
    logActivity({ userId: req.user!.id, userEmail: req.user!.email, action: 'CREATE', entityType: 'crm_contact', entityId: contact.id, entityName: contact.name });
    success(res, contact, 201);
  } catch (err) { next(err); }
};

export const getContacts = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await crmService.getContacts()); }
  catch (err) { next(err); }
};

export const updateContact = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const contact = await crmService.updateContact(req.params.id, req.body);
    logActivity({ userId: req.user!.id, userEmail: req.user!.email, action: 'UPDATE', entityType: 'crm_contact', entityId: contact.id, entityName: contact.name });
    success(res, contact);
  } catch (err) { next(err); }
};

export const deleteContact = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await crmService.deleteContact(req.params.id);
    logActivity({ userId: req.user!.id, userEmail: req.user!.email, action: 'DELETE', entityType: 'crm_contact', entityId: req.params.id });
    success(res, result);
  } catch (err) { next(err); }
};
