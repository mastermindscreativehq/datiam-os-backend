import { Request, Response, NextFunction } from 'express';
import * as svc from './scheduler.service';
import { success } from '../../utils/response';

export const listJobs = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await svc.listJobs());
  } catch (err) {
    next(err);
  }
};

export const createJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await svc.createJob(req.body), 201);
  } catch (err) {
    next(err);
  }
};

export const updateJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await svc.updateJob(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
};

export const deleteJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await svc.deleteJob(req.params.id);
    success(res, { deleted: true, id: req.params.id });
  } catch (err) {
    next(err);
  }
};

export const triggerJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await svc.triggerJob(req.params.id));
  } catch (err) {
    next(err);
  }
};

export const getJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await svc.getJobById(req.params.id));
  } catch (err) {
    next(err);
  }
};
