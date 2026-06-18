import { Request, Response, NextFunction } from 'express';
import { ingestReply, listReplyLogs, getReplyLog } from './reply.service';
import { success } from '../../utils/response';
import { logActivity } from '../../lib/activityLogger';
import type { IngestReplyInput } from './reply.schema';

export const ingestReplyHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await ingestReply(req.body as IngestReplyInput);

    logActivity({
      userId:     req.user?.id,
      userEmail:  req.user?.email,
      eventType:  'reply_ingested',
      module:     'replies',
      entityType: 'reply_log',
      entityId:   result.reply_log.id,
      title:      `Reply classified as "${result.classification.status}" for campaign ${result.reply_log.campaign_id} (confidence: ${result.classification.confidence})`,
      severity:   result.classification.status === 'rejected' ? 'warning' : 'info',
      metadata: {
        campaign_id:    result.reply_log.campaign_id,
        contact_id:     result.reply_log.contact_id,
        status:         result.classification.status,
        confidence:     result.classification.confidence,
        used_ai:        result.used_ai,
        engine_version: result.engine_version,
      },
    });

    success(res, result, 201);
  } catch (err) {
    next(err);
  }
};

export const listReplyLogsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 100;
    const result = await listReplyLogs(limit);
    success(res, result);
  } catch (err) {
    next(err);
  }
};

export const getReplyLogHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await getReplyLog(req.params.id);
    success(res, result);
  } catch (err) {
    next(err);
  }
};
