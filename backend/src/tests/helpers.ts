import supertest from 'supertest';
import jwt from 'jsonwebtoken';

const TEST_SECRET = 'datiam-test-jwt-secret-do-not-use-in-prod';

export interface TestUser {
  id:    string;
  email: string;
  role:  string;
}

export const TEST_USERS: Record<string, TestUser> = {
  owner:  { id: 'owner-uuid-0000-0000-000000000001',  email: 'owner@test.com',  role: 'owner'  },
  admin:  { id: 'admin-uuid-0000-0000-000000000002',  email: 'admin@test.com',  role: 'admin'  },
  editor: { id: 'editor-uuid-0000-0000-000000000003', email: 'editor@test.com', role: 'editor' },
  viewer: { id: 'viewer-uuid-0000-0000-000000000004', email: 'viewer@test.com', role: 'viewer' },
};

export const TEST_IDS = {
  artist:   '10000000-0000-0000-0000-000000000001',
  content:  '20000000-0000-0000-0000-000000000002',
  campaign: '30000000-0000-0000-0000-000000000003',
  account:  '40000000-0000-0000-0000-000000000004',
  post:     '50000000-0000-0000-0000-000000000005',
  trend:    '60000000-0000-0000-0000-000000000006',
  group:    '70000000-0000-0000-0000-000000000007',
  contact:  '80000000-0000-0000-0000-000000000008',
  notif:    '90000000-0000-0000-0000-000000000009',
};

export function makeToken(user: TestUser = TEST_USERS.owner): string {
  return jwt.sign(user, TEST_SECRET, { expiresIn: '1h' });
}

export function authHeader(user: TestUser = TEST_USERS.owner): Record<string, string> {
  return { Authorization: `Bearer ${makeToken(user)}` };
}

export function makeAgent(app: Express.Application) {
  return supertest(app);
}

/** Shared mock for a single Growth OS record */
export const mockRecord = (overrides: Record<string, unknown> = {}) => ({
  id: TEST_IDS.content,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});
