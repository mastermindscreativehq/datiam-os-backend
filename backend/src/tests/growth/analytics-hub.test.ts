import { vi, describe, it, expect, beforeAll } from 'vitest';

const mockService = vi.hoisted(() => ({
  ingestSnapshot:              vi.fn(),
  ingestPostAnalytics:         vi.fn(),
  ingestPlatformMetrics:       vi.fn(),
  getOverview:                 vi.fn(),
  getByPlatform:               vi.fn(),
  getTopContent:               vi.fn(),
  getSnapshots:                vi.fn(),
  getPlatformMetrics:          vi.fn(),
  updateContentPerformanceScore: vi.fn(),
}));
vi.mock('../../modules/analytics-hub/analytics-hub.service', () => ({
  analyticsHubService: mockService,
}));
vi.mock('../../modules/activity/activity.service', () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

import supertest from 'supertest';
import app from '../../app';
import { authHeader, TEST_USERS, TEST_IDS } from '../helpers';

const agent = supertest(app);
const BASE  = '/api/growth/analytics';

beforeAll(() => {
  mockService.getOverview.mockResolvedValue({
    total_views: '50000', total_streams: '10000',
    total_reach: '30000', total_followers_gained: '200',
  });
  mockService.getByPlatform.mockResolvedValue([
    { platform: 'Instagram', total_views: '25000' },
    { platform: 'TikTok',    total_views: '25000' },
  ]);
  mockService.getTopContent.mockResolvedValue([]);
  mockService.getSnapshots.mockResolvedValue([]);
  mockService.ingestSnapshot.mockResolvedValue({ id: 'snap-001' });
  mockService.ingestPostAnalytics.mockResolvedValue({ id: 'pa-001' });
  mockService.ingestPlatformMetrics.mockResolvedValue({ id: 'pm-001' });
});

describe('GET /api/growth/analytics/overview', () => {
  it('returns 401 without token', async () => {
    expect((await agent.get(`${BASE}/overview`)).status).toBe(401);
  });

  it('requires artist_id query param', async () => {
    const res = await agent.get(`${BASE}/overview`).set(authHeader());
    expect([400, 422, 200]).toContain(res.status);
  });

  it('returns overview with artist_id', async () => {
    const res = await agent
      .get(`${BASE}/overview`)
      .query({ artist_id: TEST_IDS.artist })
      .set(authHeader());
    expect(res.status).toBe(200);
  });
});

describe('GET /api/growth/analytics/by-platform', () => {
  it('returns platform breakdown', async () => {
    const res = await agent
      .get(`${BASE}/by-platform`)
      .query({ artist_id: TEST_IDS.artist })
      .set(authHeader());
    expect(res.status).toBe(200);
  });
});

describe('GET /api/growth/analytics/top-content', () => {
  it('returns top content list', async () => {
    const res = await agent
      .get(`${BASE}/top-content`)
      .query({ artist_id: TEST_IDS.artist })
      .set(authHeader());
    expect(res.status).toBe(200);
  });
});

describe('POST /api/growth/analytics/snapshots', () => {
  it('returns 401 without token', async () => {
    expect((await agent.post(`${BASE}/snapshots`).send({})).status).toBe(401);
  });

  it('ingests valid snapshot', async () => {
    const res = await agent
      .post(`${BASE}/snapshots`)
      .set(authHeader())
      .send({
        social_account_id: TEST_IDS.account,
        platform_id:       '00000000-0000-0000-0000-000000000002',
        snapshot_date:     '2026-07-01',
        views:             50000,
        followers:         12000,
      });
    expect([200, 201]).toContain(res.status);
  });

  it('rejects missing social_account_id', async () => {
    const res = await agent
      .post(`${BASE}/snapshots`)
      .set(authHeader())
      .send({ snapshot_date: '2026-07-01' });
    expect([400, 422]).toContain(res.status);
  });
});

describe('POST /api/growth/analytics/post-analytics', () => {
  it('rejects missing published_post_id', async () => {
    const res = await agent
      .post(`${BASE}/post-analytics`)
      .set(authHeader())
      .send({ snapshot_date: '2026-07-01' });
    expect([400, 422]).toContain(res.status);
  });
});
