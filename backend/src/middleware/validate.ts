import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

type Source = 'body' | 'query' | 'params';

export const validate = (schema: ZodSchema, source: Source = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: result.error.errors,
      });
      return;
    }
    if (source === 'body') req.body = result.data;
    else if (source === 'query') (req as any).query = result.data;
    next();
  };
};
