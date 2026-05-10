import jwt from 'jsonwebtoken';

const getSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return secret;
};

export const signToken = (payload: { id: string; email: string; role: string }): string => {
  return jwt.sign(payload, getSecret(), { expiresIn: '7d' });
};

export const verifyToken = (token: string): jwt.JwtPayload => {
  return jwt.verify(token, getSecret()) as jwt.JwtPayload;
};
