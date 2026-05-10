import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { success } from '../../utils/response';

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
    success(res, result);
  } catch (err) {
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
