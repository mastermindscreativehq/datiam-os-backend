import { Response } from 'express';

export const success = (res: Response, data: unknown, statusCode = 200): void => {
  res.status(statusCode).json({ success: true, data });
};

export const paginated = (
  res: Response,
  data: unknown[],
  total: number,
  page: number,
  limit: number,
): void => {
  res.status(200).json({
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });
};
