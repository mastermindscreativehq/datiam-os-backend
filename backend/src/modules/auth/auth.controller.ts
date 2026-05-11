import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { success } from '../../utils/response';
import { logActivity } from '../../lib/activityLogger';

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await authService.registerUser(req.body);
    success(res, result, 201);
  } catch (err) {
    next(err);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await authService.loginUser(req.body);
    logActivity({
      userId: result.user.id,
      eventType: 'login.success',
      module: 'auth',
      entityType: 'user',
      entityId: result.user.id,
      title: `Login: ${result.user.email}`,
      severity: 'info',
      metadata: { requestId: req.requestId, email: result.user.email },
    });
    success(res, result);
  } catch (err) {
    logActivity({
      eventType: 'login.failure',
      module: 'auth',
      entityType: 'user',
      title: `Login failed: ${req.body?.email ?? 'unknown'}`,
      severity: 'warning',
      metadata: { requestId: req.requestId, email: req.body?.email },
    });
    next(err);
  }
};

export const me = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await authService.getMe(req.user!.id);
    success(res, user);
  } catch (err) {
    next(err);
  }
};

export const updateMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await authService.updateMe(req.user!.id, req.body);
    success(res, user);
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await authService.changePassword(req.user!.id, req.body);
    success(res, result);
  } catch (err) {
    next(err);
  }
};
