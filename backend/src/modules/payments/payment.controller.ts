import { Request, Response, NextFunction } from 'express';
import {
  createPayment,
  sendInvoice,
  recordPayment,
  listPayments,
  getPayment,
  updatePaymentStatus,
  getPaymentAnalytics,
} from './payment.service';
import { success } from '../../utils/response';
import type { CreatePaymentInput, RecordPaymentInput, UpdatePaymentStatusInput } from './payment.schema';

export const createPaymentHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await createPayment(req.body as CreatePaymentInput);
    success(res, result, 201);
  } catch (err) {
    next(err);
  }
};

export const sendInvoiceHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { payment_id } = req.body as { payment_id: string };
    const result = await sendInvoice(payment_id);
    success(res, result);
  } catch (err) {
    next(err);
  }
};

export const recordPaymentHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await recordPayment(req.body as RecordPaymentInput);
    success(res, result);
  } catch (err) {
    next(err);
  }
};

export const listPaymentsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const limit  = req.query.limit ? Number(req.query.limit) : 100;
    const result = await listPayments(limit);
    success(res, result);
  } catch (err) {
    next(err);
  }
};

export const getPaymentHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await getPayment(req.params.id);
    success(res, result);
  } catch (err) {
    next(err);
  }
};

export const updatePaymentStatusHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { status } = req.body as UpdatePaymentStatusInput;
    const result     = await updatePaymentStatus(req.params.id, status);
    success(res, result);
  } catch (err) {
    next(err);
  }
};

export const getPaymentAnalyticsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await getPaymentAnalytics();
    success(res, result);
  } catch (err) {
    next(err);
  }
};
