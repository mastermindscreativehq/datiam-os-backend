import { Request, Response, NextFunction } from 'express';
import * as catalogService from './catalog.service';
import { success } from '../../utils/response';

export const createSong = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await catalogService.createSong(req.body), 201); }
  catch (err) { next(err); }
};

export const getSongs = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await catalogService.getSongs()); }
  catch (err) { next(err); }
};

export const getSongById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await catalogService.getSongById(req.params.id)); }
  catch (err) { next(err); }
};

export const updateSong = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await catalogService.updateSong(req.params.id, req.body)); }
  catch (err) { next(err); }
};

export const deleteSong = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await catalogService.deleteSong(req.params.id)); }
  catch (err) { next(err); }
};

export const createAsset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await catalogService.createAsset(req.params.id, req.body), 201); }
  catch (err) { next(err); }
};

export const getAssets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await catalogService.getAssets(req.params.id)); }
  catch (err) { next(err); }
};

export const createContributor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await catalogService.createContributor(req.params.id, req.body), 201); }
  catch (err) { next(err); }
};

export const getContributors = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await catalogService.getContributors(req.params.id)); }
  catch (err) { next(err); }
};
