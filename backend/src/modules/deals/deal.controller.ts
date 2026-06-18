import { Request, Response, NextFunction } from 'express';
import {
  createDeal,
  listDeals,
  getDeal,
  updateDeal,
  updateDealStage,
  updateDealStatus,
  getDealAnalytics,
} from './deal.service';
import { success } from '../../utils/response';
import type {
  CreateDealInput,
  UpdateDealInput,
  UpdateDealStageInput,
  UpdateDealStatusInput,
} from './deal.schema';

export const createDealHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await createDeal(req.body as CreateDealInput);
    success(res, result, 201);
  } catch (err) {
    next(err);
  }
};

export const listDealsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const limit  = req.query.limit ? Number(req.query.limit) : 100;
    const result = await listDeals(limit);
    success(res, result);
  } catch (err) {
    next(err);
  }
};

export const getDealHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await getDeal(req.params.id);
    success(res, result);
  } catch (err) {
    next(err);
  }
};

export const updateDealHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await updateDeal(req.params.id, req.body as UpdateDealInput);
    success(res, result);
  } catch (err) {
    next(err);
  }
};

export const updateDealStageHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { stage } = req.body as UpdateDealStageInput;
    const result    = await updateDealStage(req.params.id, stage);
    success(res, result);
  } catch (err) {
    next(err);
  }
};

export const updateDealStatusHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { status } = req.body as UpdateDealStatusInput;
    const result     = await updateDealStatus(req.params.id, status);
    success(res, result);
  } catch (err) {
    next(err);
  }
};

export const getDealAnalyticsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await getDealAnalytics();
    success(res, result);
  } catch (err) {
    next(err);
  }
};
