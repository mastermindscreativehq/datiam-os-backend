import { Request, Response, NextFunction } from 'express';
import * as crmService from './crm.service';
import { success } from '../../utils/response';

export const createContact = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await crmService.createContact(req.body), 201); }
  catch (err) { next(err); }
};

export const getContacts = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await crmService.getContacts()); }
  catch (err) { next(err); }
};

export const updateContact = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await crmService.updateContact(req.params.id, req.body)); }
  catch (err) { next(err); }
};
