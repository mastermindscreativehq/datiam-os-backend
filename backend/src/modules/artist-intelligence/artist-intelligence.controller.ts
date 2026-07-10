import { Request, Response, NextFunction } from 'express';
import * as artistIntelligenceService from './artist-intelligence.service';
import { artistAutomationCategoryParam } from './artist-intelligence.schema';
import { AppError } from '../../middleware/errorHandler';

export const createArtistProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await artistIntelligenceService.createArtistProfile(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const getArtistIntelligence = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await artistIntelligenceService.getArtistIntelligence(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const updateArtistProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await artistIntelligenceService.updateArtistProfile(req.params.id, req.body);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const dispatchArtistAutomation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsedCategory = artistAutomationCategoryParam.safeParse(req.params.category);
    if (!parsedCategory.success) {
      throw new AppError(`Unknown automation category: ${req.params.category}`, 400);
    }
    const result = await artistIntelligenceService.dispatchArtistAutomation(
      req.params.id,
      parsedCategory.data,
      req.body ?? {},
    );
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};
