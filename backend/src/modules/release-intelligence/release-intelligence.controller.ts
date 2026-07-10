import type { Request, Response, NextFunction } from 'express';
import * as service from './release-intelligence.service';
import { isAutomationCategory } from '../automation/automation-categories';
import { AppError } from '../../middleware/errorHandler';

const ok = (res: Response, data: unknown) => res.json({ success: true, data });

export const getDashboardHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { artist_id } = req.query as { artist_id?: string };
    ok(res, await service.getDashboard(artist_id));
  } catch (e) { next(e); }
};

export const getCalendarHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { artist_id, year, month } = req.query as { artist_id?: string; year?: string; month?: string };
    ok(res, await service.getCalendar(
      artist_id,
      year  ? Number(year)  : undefined,
      month ? Number(month) : undefined,
    ));
  } catch (e) { next(e); }
};

export const getReleaseDetailHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    ok(res, await service.getReleaseDetail(req.params.id));
  } catch (e) { next(e); }
};

export const getDspStatusesHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    ok(res, await service.getDspStatuses(req.params.id));
  } catch (e) { next(e); }
};

export const updateDspStatusHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    ok(res, await service.updateDspStatus(req.params.id, req.params.platform, req.body));
  } catch (e) { next(e); }
};

export const getCampaignsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    ok(res, await service.getCampaigns(req.params.id));
  } catch (e) { next(e); }
};

export const createCampaignHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(201).json({ success: true, data: await service.createCampaign(req.params.id, req.body) });
  } catch (e) { next(e); }
};

export const updateCampaignHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    ok(res, await service.updateCampaign(req.params.campaignId, req.body));
  } catch (e) { next(e); }
};

export const deleteCampaignHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    ok(res, await service.deleteCampaign(req.params.campaignId));
  } catch (e) { next(e); }
};

export const getAlertsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const includeResolved = req.query.include_resolved === 'true';
    ok(res, await service.getAlerts(req.params.id, includeResolved));
  } catch (e) { next(e); }
};

export const generateAlertsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    ok(res, await service.generateAlerts(req.params.id));
  } catch (e) { next(e); }
};

export const resolveAlertHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    ok(res, await service.resolveAlert(req.params.alertId));
  } catch (e) { next(e); }
};

export const getRecommendationsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    ok(res, await service.getRecommendations(req.params.id));
  } catch (e) { next(e); }
};

export const generateRecommendationsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    ok(res, await service.generateRecommendations(req.params.id));
  } catch (e) { next(e); }
};

export const actionRecommendationHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    ok(res, await service.actionRecommendation(req.params.recId));
  } catch (e) { next(e); }
};

export const getReadinessHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    ok(res, await service.getReadiness(req.params.id));
  } catch (e) { next(e); }
};

export const getSummaryHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    ok(res, await service.getReleaseIntelligenceSummary());
  } catch (e) { next(e); }
};

export const updateReleaseHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    ok(res, await service.updateRelease(req.params.id, req.body));
  } catch (e) { next(e); }
};

export const dispatchReleaseAutomationHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isAutomationCategory(req.params.category)) {
      throw new AppError(`Unknown automation category: ${req.params.category}`, 400);
    }
    ok(res, await service.dispatchReleaseAutomation(req.params.id, req.params.category, req.body ?? {}));
  } catch (e) { next(e); }
};
