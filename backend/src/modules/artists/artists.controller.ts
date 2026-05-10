import { Request, Response, NextFunction } from 'express';
import * as artistsService from './artists.service';
import { success } from '../../utils/response';

export const getProfile = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    success(res, await artistsService.getProfile());
  } catch (err) {
    next(err);
  }
};

export const createProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    success(res, await artistsService.createProfile(req.body), 201);
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    success(res, await artistsService.updateProfile(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
};
