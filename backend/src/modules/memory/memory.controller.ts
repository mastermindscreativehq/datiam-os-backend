import type { Request, Response, NextFunction } from 'express';
import * as memoryService from './memory.service';

export const rebuildMemory = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await memoryService.rebuildAllMemory();
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const getCompanyMemory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await memoryService.getCompanyMemory(req.params.id);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getContactMemory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await memoryService.getContactMemory(req.params.id);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getArtistMemory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await memoryService.getArtistMemory(req.params.id);
    res.json(data);
  } catch (err) {
    next(err);
  }
};
