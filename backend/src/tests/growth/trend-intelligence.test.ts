import { vi, describe, it, expect, beforeAll } from 'vitest';

const mockService = vi.hoisted(() => ({
  list:               vi.fn(),
  create:             vi.fn(),
  update:             vi.fn(),
  delete:             vi.fn(),
  getById:            vi.fn(),
  expireTrend:        vi.fn(),
  archiveTrend:       vi.fn(),
  expireStale:        vi.fn(),
  getRecommendations: vi.fn(),
  scoreTrendForArtist: vi.fn(),
}));
vi.mock('../../modules/trend-intelligence/trend-intelligence.service', () => ({
  trendIntelligenceService: mockService,
}));
vi.mock('../../modules/activity/activity.service', () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

import supertest from 'supertest';
import app from '../../app';
import { authHeader, TEST_USERS, TEST_IDS, mockRecord } from '../helpers';

const agent = supertest(app);
const BASE  = '/api/growth/trends';

const sampleTrend = mockRecord({
  title:       '#AfrobeatsDance',
  category:    'dance',
  trend_score: 88,
  status:      'active',
  platform_id: '00000000-0000-0000-0000-000000000002',
});

beforeAll(() => {
  mockService.list.mockResolvedValue([sampleTrend]);
  mockService.create.mockResolvedValue(sampleTrend);
  mockService.update.mockResolvedValue(sampleTrend);
  mockService.delete.mockResolvedValue(sampleTrend);
  mockService.getById.mockResolvedValue(sampleTrend);
  mockService.expireTrend.mockResolvedValue({ ...sampleTrend, status: 'expired' });
  mockService.archiveTrend.mockResolvedValue({ ...sampleTrend, status: 'archived' });
  mockService.getRecommendations.mockResolvedValue([]);
});

describe('GET /api/growth/trends', () => {
  it('returns 401 without token', async () => {
    expect((await agent.get(BASE)).status).toBe(401);
  });

  it('returns trends list', async () => {
    const res = await agent.get(BASE).set(authHeader());
    expect(res.status).toBe(200);
  });
});

describe('POST /api/growth/trends', () => {
  it('returns 401 without token', async () => {
    expect((await agent.post(BASE).send({ title: 'X' })).status).toBe(401);
  });

  it('rejects missing category', async () => {
    const res = await agent
      .post(BASE)
      .set(authHeader())
      .send({ title: '#Dance', trend_score: 80, platform_id: TEST_IDS.account });
    expect([400, 422]).toContain(res.status);
  });

  it('rejects trend_score > 100', async () => {
    const res = await agent.post(BASE).set(authHeader()).send({
      title: '#Dance', category: 'dance', trend_score: 200,
      platform_id: '00000000-0000-0000-0000-000000000002',
    });
    expect([400, 422]).toContain(res.status);
  });

  it('creates trend with valid body', async () => {
    const res = await agent.post(BASE).set(authHeader()).send({
      title: '#AfrobeatsDance',
      category: 'dance',
      trend_score: 88,
      platform_id: '00000000-0000-0000-0000-000000000002',
    });
    expect([200, 201]).toContain(res.status);
  });
});

describe('POST /api/growth/trends/:id/expire', () => {
  it('returns 401 without token', async () => {
    expect((await agent.post(`${BASE}/${TEST_IDS.trend}/expire`)).status).toBe(401);
  });

  it('expires trend with admin token', async () => {
    const res = await agent
      .post(`${BASE}/${TEST_IDS.trend}/expire`)
      .set(authHeader(TEST_USERS.admin));
    expect([200, 201]).toContain(res.status);
  });
});

describe('POST /api/growth/trends/:id/archive', () => {
  it('owner can archive trend', async () => {
    const res = await agent
      .post(`${BASE}/${TEST_IDS.trend}/archive`)
      .set(authHeader(TEST_USERS.owner));
    expect([200, 201]).toContain(res.status);
  });
});
