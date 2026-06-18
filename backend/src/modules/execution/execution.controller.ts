import { Request, Response, NextFunction } from 'express';
import { sendCampaign, listExecutionLogs } from './execution.service';
import { success } from '../../utils/response';
import { logActivity } from '../../lib/activityLogger';
import type { SendCampaignInput } from './execution.schema';

export const sendCampaignHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await sendCampaign(req.body as SendCampaignInput);

    logActivity({
      userId:     req.user?.id,
      userEmail:  req.user?.email,
      eventType:  result.send_result.success ? 'outreach_sent' : 'outreach_send_failed',
      module:     'execution',
      entityType: 'execution_log',
      entityId:   result.log.id,
      title:      result.send_result.success
        ? `Outreach sent via ${result.log.provider} to ${result.log.recipient_email} — campaign ${result.log.campaign_id}`
        : `Outreach send failed via ${result.log.provider}: ${result.send_result.error}`,
      severity:   result.send_result.success ? 'info' : 'warning',
      metadata: {
        campaign_id:    result.log.campaign_id,
        provider:       result.log.provider,
        delivery_status: result.log.delivery_status,
        engine_version: result.engine_version,
      },
    });

    success(res, result, result.send_result.success ? 200 : 422);
  } catch (err) {
    next(err);
  }
};

export const listLogsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 100;
    const result = await listExecutionLogs(limit);
    success(res, result);
  } catch (err) {
    next(err);
  }
};
