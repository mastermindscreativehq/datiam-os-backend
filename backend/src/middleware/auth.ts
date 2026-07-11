import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifyToken } from '../utils/jwt';
import { AppError } from './errorHandler';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError('No token provided', 401));
  }

  const token = authHeader.split(' ')[1];

  // ==========================================================
  // EXTRA RAW TOKEN DIAGNOSTICS
  // ==========================================================

  console.log("========== RAW AUTH HEADER ==========");
  console.log(authHeader);

  console.log("========== RAW AUTH HEADER JSON ==========");
  console.log(JSON.stringify(authHeader));

  console.log("========== AUTH HEADER LENGTH ==========");
  console.log(authHeader.length);

  console.log("========== TOKEN ==========");
  console.log(token);

  console.log("========== TOKEN JSON ==========");
  console.log(JSON.stringify(token));

  console.log("========== TOKEN LENGTH ==========");
  console.log(token.length);

  console.log("========== TOKEN FIRST 20 ==========");
  console.log(token.slice(0, 20));

  console.log("========== TOKEN LAST 20 ==========");
  console.log(token.slice(-20));

  console.log("========== JWT DECODE ==========");
  console.log(jwt.decode(token, { complete: true }));

  // ==========================================================
  // EXISTING AUTH DIAGNOSTICS
  // ==========================================================

  let decodedHeader: unknown = null;

  try {
    decodedHeader = jwt.decode(token, { complete: true })?.header ?? null;
  } catch (decodeErr) {
    decodedHeader = {
      decodeError:
        decodeErr instanceof Error
          ? decodeErr.message
          : String(decodeErr),
    };
  }

  console.log(
    '[AUTH-DIAG] middleware, before verifyToken',
    JSON.stringify({
      tokenPrefix: token.slice(0, 20),
      jwtHeader: decodedHeader,
      deploymentId: process.env.RAILWAY_DEPLOYMENT_ID ?? null,
      replicaId: process.env.RAILWAY_REPLICA_ID ?? null,
      gitCommitSha: process.env.RAILWAY_GIT_COMMIT_SHA ?? null,
      hostname: process.env.HOSTNAME ?? null,
      pid: process.pid,
    })
  );

  // ==========================================================
  // VERIFY TOKEN
  // ==========================================================

  try {
    const decoded = verifyToken(token);

    req.user = decoded as {
      id: string;
      email: string;
      role: string;
    };

    next();
  } catch (err) {
    console.log("========== VERIFY TOKEN FAILED ==========");
    console.log(err);

    if (err instanceof Error) {
      console.log("Error name:", err.name);
      console.log("Error message:", err.message);
      console.log("Stack:");
      console.log(err.stack);
    }

    console.log(
      '[AUTH-DIAG] verifyToken threw',
      JSON.stringify({
        name: err instanceof Error ? err.name : typeof err,
        message: err instanceof Error ? err.message : String(err),
      })
    );

    next(new AppError('Invalid or expired token', 401));
  }
};

export const requireRole = (...roles: string[]) => {
  return (
    req: Request,
    _res: Response,
    next: NextFunction
  ): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new AppError('Insufficient permissions', 403)
      );
    }

    next();
  };
};