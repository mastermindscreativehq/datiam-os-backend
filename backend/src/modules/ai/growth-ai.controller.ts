import { Request, Response, NextFunction } from 'express';
import { growthAIService } from './growth-ai.service';
import { success } from '../../utils/response';

export const generateCaption = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await growthAIService.generateCaption(req.body.content_id, req.body.platform_slug)); }
  catch (err) { next(err); }
};

export const generateHashtags = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await growthAIService.generateHashtags(req.body.content_id, req.body.platform_slug)); }
  catch (err) { next(err); }
};

export const generateCta = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await growthAIService.generateCTA(req.body.content_id, req.body.platform_slug, req.body.goal)); }
  catch (err) { next(err); }
};

export const generateCampaignBrief = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await growthAIService.generateCampaignBrief(req.body.campaign_id, req.body.artist_id)); }
  catch (err) { next(err); }
};

export const generateRetrospective = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await growthAIService.generateCampaignRetrospective(req.body.campaign_id)); }
  catch (err) { next(err); }
};

export const generateTrendIdea = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await growthAIService.generateTrendContentIdea(req.body.trend_id, req.body.artist_id)); }
  catch (err) { next(err); }
};

export const generateGrowthReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await growthAIService.generateGrowthReport(req.body.artist_id, req.body.period)); }
  catch (err) { next(err); }
};

export const generatePostingSchedule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await growthAIService.generatePostingSchedule(req.body.artist_id, req.body.platform_slug)); }
  catch (err) { next(err); }
};

export const generateContentCalendar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    success(res, await growthAIService.generateContentCalendar(
      req.body.artist_id,
      req.body.start_date,
      req.body.days ?? 14,
      req.body.platforms,
    ));
  } catch (err) { next(err); }
};

export const generateAudiencePersona = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await growthAIService.generateAudiencePersona(req.body.artist_id)); }
  catch (err) { next(err); }
};

export const generateCollaborationPitch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    success(res, await growthAIService.generateCollaborationPitch(req.body.artist_id, req.body.contact_id));
  } catch (err) { next(err); }
};

export const scoreContent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await growthAIService.scoreContentBrief(req.body.content_id)); }
  catch (err) { next(err); }
};

export const generateReleaseStrategy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await growthAIService.generateReleaseStrategy(req.body.campaign_id)); }
  catch (err) { next(err); }
};

export const enrichContent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    success(res, await growthAIService.enrichContentIdea(req.body.content_id, req.body.platform_slug));
  } catch (err) { next(err); }
};
