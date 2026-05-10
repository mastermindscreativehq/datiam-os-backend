import { Request, Response, NextFunction } from 'express';
import * as royaltiesService from './royalties.service';
import { success } from '../../utils/response';

export const createRoyalty = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await royaltiesService.createRoyalty(req.body), 201); }
  catch (err) { next(err); }
};

export const getRoyalties = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await royaltiesService.getRoyalties()); }
  catch (err) { next(err); }
};

export const getRoyaltiesBySong = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await royaltiesService.getRoyaltiesBySong(req.params.songId)); }
  catch (err) { next(err); }
};
