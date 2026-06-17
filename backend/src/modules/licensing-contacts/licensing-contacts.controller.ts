import { Request, Response, NextFunction } from 'express';
import * as service from './licensing-contacts.service';
import { success, paginated } from '../../utils/response';
import { logActivity } from '../../lib/activityLogger';

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { artist_id, company_id, relationship_status, page, limit } = req.query as Record<string, string>;
    const result = await service.listContacts({
      artist_id,
      company_id,
      relationship_status,
      page:  page  ? Number(page)  : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    paginated(res, result.data, result.total, result.page, result.limit);
  } catch (err) {
    next(err);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contact = await service.getContactById(req.params.id);
    success(res, contact);
  } catch (err) {
    next(err);
  }
};

export const getFollowUps = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contacts = await service.getFollowUpsDue();
    success(res, contacts);
  } catch (err) {
    next(err);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contact = await service.createContact(req.body);
    logActivity({
      userId:     req.user?.id,
      userEmail:  req.user?.email,
      eventType:  'contact_created',
      module:     'licensing-contacts',
      entityType: 'licensing_contact',
      entityId:   contact.id,
      title:      `Licensing contact created: ${contact.full_name}`,
    });
    success(res, contact, 201);
  } catch (err) {
    next(err);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contact = await service.updateContact(req.params.id, req.body);
    logActivity({
      userId:     req.user?.id,
      userEmail:  req.user?.email,
      eventType:  'contact_updated',
      module:     'licensing-contacts',
      entityType: 'licensing_contact',
      entityId:   contact.id,
      title:      `Licensing contact updated: ${contact.full_name}`,
    });
    success(res, contact);
  } catch (err) {
    next(err);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await service.softDeleteContact(req.params.id);
    logActivity({
      userId:     req.user?.id,
      userEmail:  req.user?.email,
      eventType:  'contact_deleted',
      module:     'licensing-contacts',
      entityType: 'licensing_contact',
      entityId:   result.id,
      title:      `Licensing contact deleted: ${result.id}`,
    });
    success(res, result);
  } catch (err) {
    next(err);
  }
};
