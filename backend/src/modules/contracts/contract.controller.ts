import { Request, Response, NextFunction } from 'express';
import {
  createContract,
  sendContract,
  listContracts,
  getContract,
  updateContractStatus,
  getContractAnalytics,
} from './contract.service';
import { success } from '../../utils/response';
import type { CreateContractInput, UpdateContractStatusInput } from './contract.schema';

export const createContractHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await createContract(req.body as CreateContractInput);
    success(res, result, 201);
  } catch (err) {
    next(err);
  }
};

export const sendContractHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { contract_id } = req.body as { contract_id: string };
    const result = await sendContract(contract_id);
    success(res, result);
  } catch (err) {
    next(err);
  }
};

export const listContractsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const limit  = req.query.limit ? Number(req.query.limit) : 100;
    const result = await listContracts(limit);
    success(res, result);
  } catch (err) {
    next(err);
  }
};

export const getContractHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await getContract(req.params.id);
    success(res, result);
  } catch (err) {
    next(err);
  }
};

export const updateContractStatusHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { status } = req.body as UpdateContractStatusInput;
    const result     = await updateContractStatus(req.params.id, status);
    success(res, result);
  } catch (err) {
    next(err);
  }
};

export const getContractAnalyticsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await getContractAnalytics();
    success(res, result);
  } catch (err) {
    next(err);
  }
};
