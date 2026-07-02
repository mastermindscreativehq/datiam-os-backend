import { vi, describe, it, expect, beforeAll } from 'vitest';

const mockService = vi.hoisted(() => ({
  schedulePost:         vi.fn(),
  getScheduledPosts:    vi.fn(),
  getById:              vi.fn(),
  updateScheduledPost:  vi.fn(),
  cancelPost:           vi.fn(),
  markPublishing:       vi.fn(),
  recordPublishSuccess: vi.fn(),
  recordPublishFailure: vi.fn(),
  getPublishedPosts:    vi.fn(),
  getDueForPublishing:  vi.fn(),
  saveCaption:          vi.fn(),
  approveCaption:       vi.fn(),
  getCaptions:          vi.fn(),
}));
vi.mock('../../modules/publishing-engine/publishing-engine.service', () => ({
  publishingEngineService: mockService,
}));
vi.mock('../../modules/activity/activity.service', () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

import supertest from 'supertest';
import app from '../../app';
import { authHeader, TEST_USERS, TEST_IDS, mockRecord } from '../helpers';

const agent = supertest(app);

const samplePost = mockRecord({
  social_account_id: TEST_IDS.account,
  status:            'scheduled',
  scheduled_for:     '2026-08-01T10:00:00.000Z',
  publish_attempts:  0,
});

beforeAll(() => {
  mockService.schedulePost.mockResolvedValue(samplePost);
  mockService.getScheduledPosts.mockResolvedValue([samplePost]);
  mockService.getById.mockResolvedValue(samplePost);
  mockService.cancelPost.mockResolvedValue({ ...samplePost, status: 'cancelled' });
  mockService.getPublishedPosts.mockResolvedValue([]);
  mockService.getCaptions.mockResolvedValue([]);
});

describe('GET /api/growth/publishing/scheduled', () => {
  it('returns 401 without token', async () => {
    expect((await agent.get('/api/growth/publishing/scheduled')).status).toBe(401);
  });

  it('returns 200 with valid token', async () => {
    const res = await agent
      .get('/api/growth/publishing/scheduled')
      .set(authHeader());
    expect(res.status).toBe(200);
  });
});

describe('POST /api/growth/publishing/schedule', () => {
  it('returns 401 without token', async () => {
    expect((await agent.post('/api/growth/publishing/schedule').send({})).status).toBe(401);
  });

  it('rejects missing social_account_id', async () => {
    const res = await agent
      .post('/api/growth/publishing/schedule')
      .set(authHeader())
      .send({ scheduled_for: '2026-08-01T10:00:00.000Z' });
    expect([400, 422]).toContain(res.status);
  });

  it('rejects missing scheduled_for', async () => {
    const res = await agent
      .post('/api/growth/publishing/schedule')
      .set(authHeader())
      .send({ social_account_id: TEST_IDS.account });
    expect([400, 422]).toContain(res.status);
  });

  it('schedules post with valid body', async () => {
    const res = await agent
      .post('/api/growth/publishing/schedule')
      .set(authHeader())
      .send({
        social_account_id: TEST_IDS.account,
        scheduled_for: '2026-08-01T10:00:00.000Z',
        caption: 'Test caption',
      });
    expect([200, 201]).toContain(res.status);
  });
});

describe('POST /api/growth/publishing/:id/cancel', () => {
  it('returns 401 without token', async () => {
    expect(
      (await agent.post(`/api/growth/publishing/${TEST_IDS.post}/cancel`)).status
    ).toBe(401);
  });

  it('cancels post with owner token', async () => {
    const res = await agent
      .post(`/api/growth/publishing/${TEST_IDS.post}/cancel`)
      .set(authHeader(TEST_USERS.owner));
    expect([200, 201]).toContain(res.status);
  });
});

describe('GET /api/growth/publishing/published', () => {
  it('returns 200 with token', async () => {
    const res = await agent
      .get('/api/growth/publishing/published')
      .set(authHeader());
    expect(res.status).toBe(200);
  });
});
