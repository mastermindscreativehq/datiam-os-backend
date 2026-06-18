import { Request, Response, NextFunction } from 'express';
import { createCampaign, listCampaigns } from './outreach.service';
import { success } from '../../utils/response';
import { logActivity } from '../../lib/activityLogger';
import type { CreateCampaignInput } from './outreach.schema';

export const createCampaignHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await createCampaign(req.body as CreateCampaignInput);
    logActivity({
      userId:     req.user?.id,
      userEmail:  req.user?.email,
      eventType:  'outreach_campaign_created',
      module:     'outreach',
      entityType: 'outreach_campaign',
      entityId:   result.campaign.id,
      title:      `Outreach campaign created for ${result.context.company.name} — score ${result.context.opportunity_score}`,
    });
    success(res, result, 201);
  } catch (err) {
    next(err);
  }
};

export const listCampaignsHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await listCampaigns();
    success(res, result);
  } catch (err) {
    next(err);
  }
};
