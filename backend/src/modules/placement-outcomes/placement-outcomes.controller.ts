import { Request, Response, NextFunction } from 'express';
import * as service from './placement-outcomes.service';
import { success, paginated } from '../../utils/response';
import { logActivity } from '../../lib/activityLogger';

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { artist_id, outcome, license_type, page, limit } = req.query as Record<string, string>;
    const result = await service.listOutcomes({
      artist_id,
      outcome,
      license_type,
      page:  page  ? Number(page)  : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    paginated(res, result.data, result.total, result.page, result.limit);
  } catch (err) {
    next(err);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const outcome = await service.getOutcomeById(req.params.id);
    success(res, outcome);
  } catch (err) {
    next(err);
  }
};

export const getByOpportunity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const outcome = await service.getOutcomeByOpportunity(req.params.oppId);
    success(res, outcome);
  } catch (err) {
    next(err);
  }
};

export const getStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await service.getOutcomeStats(req.params.artistId);
    success(res, stats);
  } catch (err) {
    next(err);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const outcome = await service.createOutcome(req.body);
    logActivity({
      userId:     req.user?.id,
      userEmail:  req.user?.email,
      eventType:  'placement_outcome_created',
      module:     'placement-outcomes',
      entityType: 'placement_outcome',
      entityId:   outcome.id,
      title:      `Placement outcome recorded: ${outcome.outcome}`,
      metadata:   { opportunity_id: outcome.opportunity_id, artist_id: outcome.artist_id },
    });
    success(res, outcome, 201);
  } catch (err) {
    next(err);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const outcome = await service.updateOutcome(req.params.id, req.body);
    logActivity({
      userId:     req.user?.id,
      userEmail:  req.user?.email,
      eventType:  'placement_outcome_updated',
      module:     'placement-outcomes',
      entityType: 'placement_outcome',
      entityId:   outcome.id,
      title:      `Placement outcome updated: ${outcome.outcome}`,
    });
    success(res, outcome);
  } catch (err) {
    next(err);
  }
};
