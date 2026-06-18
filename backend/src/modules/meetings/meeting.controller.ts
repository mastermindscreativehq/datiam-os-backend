import { Request, Response, NextFunction } from 'express';
import {
  createMeeting,
  listMeetings,
  getMeeting,
  updateMeetingStatus,
  updateMeetingNotes,
  getMeetingAnalytics,
} from './meeting.service';
import { success } from '../../utils/response';
import { logActivity } from '../../lib/activityLogger';
import type { CreateMeetingInput, UpdateMeetingStatusInput, UpdateMeetingNotesInput } from './meeting.schema';

export const createMeetingHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await createMeeting(req.body as CreateMeetingInput);

    logActivity({
      userId:     req.user?.id,
      userEmail:  req.user?.email,
      eventType:  'meeting_created',
      module:     'meetings',
      entityType: 'meeting',
      entityId:   result.id,
      title:      `Meeting created: ${result.meeting_title}`,
      severity:   'info',
      metadata: {
        campaign_id:       result.campaign_id,
        contact_id:        result.contact_id,
        meeting_type:      result.meeting_type,
        preparation_score: result.meeting_preparation_score,
        next_action:       result.recommended_next_action,
      },
    });

    success(res, result, 201);
  } catch (err) {
    next(err);
  }
};

export const listMeetingsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 100;
    const result = await listMeetings(limit);
    success(res, result);
  } catch (err) {
    next(err);
  }
};

export const getMeetingHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await getMeeting(req.params.id);
    success(res, result);
  } catch (err) {
    next(err);
  }
};

export const updateMeetingStatusHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { status } = req.body as UpdateMeetingStatusInput;
    const result = await updateMeetingStatus(req.params.id, status);
    success(res, result);
  } catch (err) {
    next(err);
  }
};

export const updateMeetingNotesHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { notes } = req.body as UpdateMeetingNotesInput;
    const result = await updateMeetingNotes(req.params.id, notes);
    success(res, result);
  } catch (err) {
    next(err);
  }
};

export const getMeetingAnalyticsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await getMeetingAnalytics();
    success(res, result);
  } catch (err) {
    next(err);
  }
};
