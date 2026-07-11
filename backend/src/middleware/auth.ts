import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifyToken } from '../utils/jwt';
import { AppError } from './errorHandler';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; role: string };
    }
  }
}

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError('No token provided', 401));
  }
  const token = authHeader.split(' ')[1];

  // TEMP-DIAGNOSTIC (remove once the cross-deployment JWT_SECRET mismatch is confirmed/resolved):
  let decodedHeader: unknown = null;
  try {
    decodedHeader = jwt.decode(token, { complete: true })?.header ?? null;
  } catch (decodeErr) {
    decodedHeader = { decodeError: decodeErr instanceof Error ? decodeErr.message : String(decodeErr) };
  }
  console.log('[AUTH-DIAG] middleware, before verifyToken', JSON.stringify({
    tokenPrefix: token.slice(0, 20),
    jwtHeader: decodedHeader,
    deploymentId: process.env.RAILWAY_DEPLOYMENT_ID ?? null,
    replicaId: process.env.RAILWAY_REPLICA_ID ?? null,
    gitCommitSha: process.env.RAILWAY_GIT_COMMIT_SHA ?? null,
    hostname: process.env.HOSTNAME ?? null,
    pid: process.pid,
  }));

  try {
    const decoded = verifyToken(token);
    req.user = decoded as { id: string; email: string; role: string };
    next();
  } catch (err) {
    console.log('[AUTH-DIAG] verifyToken threw', JSON.stringify({
      name: err instanceof Error ? err.name : typeof err,
      message: err instanceof Error ? err.message : String(err),
    }));
    next(new AppError('Invalid or expired token', 401));
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }
    next();
  };
};
