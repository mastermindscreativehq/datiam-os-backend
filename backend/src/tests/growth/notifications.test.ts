import { vi, describe, it, expect, beforeAll } from 'vitest';

const mockService = vi.hoisted(() => ({
  getForUser:   vi.fn(),
  getUnreadCount: vi.fn(),
  markRead:     vi.fn(),
  dismiss:      vi.fn(),
  markAllRead:  vi.fn(),
  dismissAll:   vi.fn(),
  notifyContentPublished: vi.fn(),
  notifyPublishFailed:    vi.fn(),
  notifyTrendDetected:    vi.fn(),
  notifyCampaignUpdate:   vi.fn(),
  notifyAnalyticsMilestone: vi.fn(),
  notifyAmbassadorUpdate: vi.fn(),
}));
vi.mock('../../modules/notifications/notifications.service', () => ({
  notificationService: mockService,
}));
vi.mock('../../modules/activity/activity.service', () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

import supertest from 'supertest';
import app from '../../app';
import { authHeader, TEST_USERS, TEST_IDS, mockRecord } from '../helpers';

const agent = supertest(app);
const BASE  = '/api/growth/notifications';

const sampleNotif = mockRecord({
  user_id:  TEST_USERS.owner.id,
  type:     'info',
  category: 'campaign',
  title:    'Campaign created',
  message:  'Your campaign is live',
  is_read:  false,
});

beforeAll(() => {
  mockService.getForUser.mockResolvedValue([sampleNotif]);
  mockService.getUnreadCount.mockResolvedValue({ count: 3 });
  mockService.markRead.mockResolvedValue({ ...sampleNotif, is_read: true });
  mockService.dismiss.mockResolvedValue({ ...sampleNotif, is_dismissed: true });
  mockService.markAllRead.mockResolvedValue({ updated: 3 });
  mockService.dismissAll.mockResolvedValue({ updated: 3 });
});

describe('GET /api/growth/notifications', () => {
  it('returns 401 without token', async () => {
    expect((await agent.get(BASE)).status).toBe(401);
  });

  it('returns 200 with valid token', async () => {
    const res = await agent.get(BASE).set(authHeader());
    expect(res.status).toBe(200);
  });

  it('accepts unread_only filter', async () => {
    const res = await agent
      .get(BASE)
      .query({ unread_only: 'true' })
      .set(authHeader());
    expect(res.status).toBe(200);
  });
});

describe('GET /api/growth/notifications/unread-count', () => {
  it('returns unread count', async () => {
    const res = await agent
      .get(`${BASE}/unread-count`)
      .set(authHeader());
    expect(res.status).toBe(200);
  });
});

describe('POST /api/growth/notifications/read-all', () => {
  it('returns 401 without token', async () => {
    expect((await agent.post(`${BASE}/read-all`)).status).toBe(401);
  });
});

describe('POST /api/growth/notifications/:id/read', () => {
  it('returns 401 without token', async () => {
    expect((await agent.post(`${BASE}/${TEST_IDS.notif}/read`)).status).toBe(401);
  });

  it('marks notification as read', async () => {
    const res = await agent
      .post(`${BASE}/${TEST_IDS.notif}/read`)
      .set(authHeader());
    expect([200, 201]).toContain(res.status);
  });
});

describe('POST /api/growth/notifications/read-all', () => {
  it('marks all notifications as read', async () => {
    const res = await agent
      .post(`${BASE}/read-all`)
      .set(authHeader());
    expect([200, 201]).toContain(res.status);
  });
});

describe('POST /api/growth/notifications/:id/dismiss', () => {
  it('dismisses notification', async () => {
    const res = await agent
      .post(`${BASE}/${TEST_IDS.notif}/dismiss`)
      .set(authHeader());
    expect([200, 201]).toContain(res.status);
  });
});
