import { Request, Response, NextFunction } from 'express';
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

// A syntactically valid JWS: three dot-separated base64url segments, nothing else.
// Extracting against this shape (rather than trusting whatever text follows
// "Bearer ") means a header mangled by an intermediary — stray whitespace,
// wrapping quotes, or a truncated copy-paste — fails fast with a distinct
// error instead of being handed to jwt.verify, which reports both a malformed
// token and a secret mismatch as the same opaque "invalid token".
const JWS_SHAPE = /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/;

export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError('No token provided', 401));
  }

  const token = authHeader.slice('Bearer '.length).trim();

  // TEMP-DEBUG (remove once the "Malformed authorization token" report from
  // PowerShell clients is root-caused — see conversation 2026-07-12):
  console.log('[AUTH-TEMP-DEBUG] raw header', JSON.stringify(authHeader));
  console.log('[AUTH-TEMP-DEBUG] extracted token', JSON.stringify(token));
  console.log('[AUTH-TEMP-DEBUG] token length', token.length);
  console.log(
    '[AUTH-TEMP-DEBUG] char codes',
    Array.from(token).map((c) => c.codePointAt(0)).join(',')
  );

  if (!JWS_SHAPE.test(token)) {
    return next(new AppError('Malformed authorization token', 401));
  }

  try {
    const decoded = verifyToken(token);

    req.user = decoded as {
      id: string;
      email: string;
      role: string;
    };

    next();
  } catch {
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