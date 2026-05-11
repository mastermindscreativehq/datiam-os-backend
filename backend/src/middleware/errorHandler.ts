import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string,
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const requestId = req.requestId;
  const isDev = process.env.NODE_ENV === 'development';

  if (err instanceof AppError) {
    console.error(JSON.stringify({
      level: 'error',
      name: err.name,
      message: err.message,
      status: err.statusCode,
      path: req.path,
      method: req.method,
      requestId,
      ...(isDev && { stack: err.stack }),
    }));
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      requestId,
      ...(err.code && { code: err.code }),
    });
    return;
  }

  console.error(JSON.stringify({
    level: 'error',
    name: err.name,
    message: err.message,
    status: 500,
    path: req.path,
    method: req.method,
    requestId,
    ...(isDev && { stack: err.stack }),
  }));

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    requestId,
  });
};
