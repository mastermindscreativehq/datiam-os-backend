import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';

const getSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return secret;
};

// TEMP-DIAGNOSTIC (remove once the cross-deployment JWT_SECRET mismatch is confirmed/resolved):
const fingerprint = (secret: string) => createHash('sha256').update(secret).digest('hex').slice(0, 8);

export const signToken = (payload: { id: string; email: string; role: string }): string => {
  const secret = getSecret();
  console.log('[AUTH-DIAG] sign', JSON.stringify({
    secretFingerprint: fingerprint(secret),
    deploymentId: process.env.RAILWAY_DEPLOYMENT_ID ?? null,
    replicaId: process.env.RAILWAY_REPLICA_ID ?? null,
    gitCommitSha: process.env.RAILWAY_GIT_COMMIT_SHA ?? null,
    hostname: process.env.HOSTNAME ?? null,
    pid: process.pid,
  }));
  return jwt.sign(payload, secret, { expiresIn: '24h' });
};

export const verifyToken = (token: string): jwt.JwtPayload => {
  const secret = getSecret();
  console.log('[AUTH-DIAG] verify (inside verifyToken)', JSON.stringify({
    secretFingerprint: fingerprint(secret),
    deploymentId: process.env.RAILWAY_DEPLOYMENT_ID ?? null,
    replicaId: process.env.RAILWAY_REPLICA_ID ?? null,
    gitCommitSha: process.env.RAILWAY_GIT_COMMIT_SHA ?? null,
    hostname: process.env.HOSTNAME ?? null,
    pid: process.pid,
  }));
  return jwt.verify(token, secret) as jwt.JwtPayload;
};
