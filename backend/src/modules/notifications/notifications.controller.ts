import { Request, Response, NextFunction } from 'express';
import { notificationService } from './notifications.service';
import { success } from '../../utils/response';

export const getNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rows = await notificationService.getForUser(req.user!.id, req.query as any);
    success(res, rows);
  } catch (err) { next(err); }
};

export const getUnreadCount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const count = await notificationService.getUnreadCount(req.user!.id);
    success(res, { count });
  } catch (err) { next(err); }
};

export const markRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const row = await notificationService.markRead(req.params.id, req.user!.id);
    success(res, row);
  } catch (err) { next(err); }
};

export const markAllRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await notificationService.markAllRead(req.user!.id);
    success(res, { marked: true });
  } catch (err) { next(err); }
};

export const dismiss = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const row = await notificationService.dismiss(req.params.id, req.user!.id);
    success(res, row);
  } catch (err) { next(err); }
};

export const dismissAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await notificationService.dismissAll(req.user!.id);
    success(res, { dismissed: true });
  } catch (err) { next(err); }
};
