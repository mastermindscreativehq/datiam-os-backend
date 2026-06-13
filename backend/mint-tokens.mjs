import 'dotenv/config';
import jwt from 'jsonwebtoken';

const secret = process.env.JWT_SECRET;
if (!secret) { console.error('JWT_SECRET not set'); process.exit(1); }

// Real user from DB: b1a1b5b1-d9f0-4879-9b8a-af1df5b51629 / admin@datiam.com / owner
const ownerToken = jwt.sign(
  { id: 'b1a1b5b1-d9f0-4879-9b8a-af1df5b51629', email: 'admin@datiam.com', role: 'owner' },
  secret,
  { expiresIn: '1h' }
);

// Synthetic viewer token (same user id, demoted role)
const viewerToken = jwt.sign(
  { id: 'b1a1b5b1-d9f0-4879-9b8a-af1df5b51629', email: 'admin@datiam.com', role: 'viewer' },
  secret,
  { expiresIn: '1h' }
);

// Expired token
const expiredToken = jwt.sign(
  { id: 'b1a1b5b1-d9f0-4879-9b8a-af1df5b51629', email: 'admin@datiam.com', role: 'owner' },
  secret,
  { expiresIn: '-1s' }
);

// Fabricated token signed with wrong secret
const invalidToken = jwt.sign(
  { id: 'b1a1b5b1-d9f0-4879-9b8a-af1df5b51629', email: 'admin@datiam.com', role: 'owner' },
  'wrong-secret-key',
  { expiresIn: '1h' }
);

console.log(JSON.stringify({
  ownerToken,
  viewerToken,
  expiredToken,
  invalidToken,
  secret_prefix: secret.substring(0, 10) + '...',
}));
