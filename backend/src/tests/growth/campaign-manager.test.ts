import { vi, describe, it, expect, beforeAll } from 'vitest';

const mockService = vi.hoisted(() => ({
  list:                 vi.fn(),
  create:               vi.fn(),
  update:               vi.fn(),
  delete:               vi.fn(),
  getById:              vi.fn(),
  transitionStage:      vi.fn(),
  getStages:            vi.fn(),
  getPerformanceSummary: vi.fn(),
  getTasks:             vi.fn(),
  createTask:           vi.fn(),
  updateTask:           vi.fn(),
}));
vi.mock('../../modules/campaign-manager/campaign-manager.service', () => ({
  campaignManagerService: mockService,
}));
vi.mock('../../modules/activity/activity.service', () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

import supertest from 'supertest';
import app from '../../app';
import { authHeader, TEST_USERS, TEST_IDS, mockRecord } from '../helpers';

const agent = supertest(app);
const BASE  = '/api/growth/campaigns';

const sampleCampaign = mockRecord({
  name:          'Summer Drop',
  campaign_type: 'release',
  status:        'active',
  current_stage: 'pre_production',
  artist_id:     TEST_IDS.artist,
});

beforeAll(() => {
  mockService.list.mockResolvedValue([sampleCampaign]);
  mockService.create.mockResolvedValue(sampleCampaign);
  mockService.update.mockResolvedValue(sampleCampaign);
  mockService.delete.mockResolvedValue(sampleCampaign);
  mockService.getById.mockResolvedValue(sampleCampaign);
  mockService.transitionStage.mockResolvedValue({ ...sampleCampaign, current_stage: 'production' });
  mockService.getStages.mockResolvedValue([]);
  mockService.getPerformanceSummary.mockResolvedValue({ views: 1000, streams: 200 });
  mockService.getTasks.mockResolvedValue([]);
  mockService.createTask.mockResolvedValue({ id: TEST_IDS.content, title: 'Test task' });
});

describe('GET /api/growth/campaigns', () => {
  it('returns 401 without token', async () => {
    expect((await agent.get(BASE)).status).toBe(401);
  });

  it('returns 200 with valid token', async () => {
    expect((await agent.get(BASE).set(authHeader())).status).toBe(200);
  });
});

describe('POST /api/growth/campaigns', () => {
  it('returns 401 without token', async () => {
    expect((await agent.post(BASE).send({ name: 'X' })).status).toBe(401);
  });

  it('rejects missing name field', async () => {
    const res = await agent.post(BASE).set(authHeader()).send({ campaign_type: 'release' });
    expect([400, 422]).toContain(res.status);
  });

  it('creates campaign with valid body', async () => {
    const res = await agent.post(BASE).set(authHeader()).send({
      name:          'Summer Drop',
      campaign_type: 'release',
      artist_id:     TEST_IDS.artist,
    });
    expect([200, 201]).toContain(res.status);
  });
});

describe('POST /api/growth/campaigns/:id/stage', () => {
  it('returns 401 without token', async () => {
    const res = await agent.post(`${BASE}/${TEST_IDS.campaign}/stage`);
    expect(res.status).toBe(401);
  });

  it('transitions stage with owner token', async () => {
    const res = await agent
      .post(`${BASE}/${TEST_IDS.campaign}/stage`)
      .set(authHeader(TEST_USERS.owner))
      .send({ stage: 'release_day' });
    expect([200, 201]).toContain(res.status);
  });
});

describe('GET /api/growth/campaigns/:id/performance', () => {
  it('returns performance data', async () => {
    const res = await agent
      .get(`${BASE}/${TEST_IDS.campaign}/performance`)
      .set(authHeader());
    expect([200]).toContain(res.status);
  });
});

describe('Campaign tasks', () => {
  it('GET tasks returns 200', async () => {
    const res = await agent
      .get(`${BASE}/${TEST_IDS.campaign}/tasks`)
      .set(authHeader());
    expect(res.status).toBe(200);
  });

  it('POST task validates body', async () => {
    const res = await agent
      .post(`${BASE}/${TEST_IDS.campaign}/tasks`)
      .set(authHeader())
      .send({});
    expect([400, 422]).toContain(res.status);
  });
});

describe('DELETE /api/growth/campaigns/:id', () => {
  it('viewer cannot delete', async () => {
    const res = await agent
      .delete(`${BASE}/${TEST_IDS.campaign}`)
      .set(authHeader(TEST_USERS.viewer));
    expect([403, 401]).toContain(res.status);
  });

  it('owner can delete', async () => {
    const res = await agent
      .delete(`${BASE}/${TEST_IDS.campaign}`)
      .set(authHeader(TEST_USERS.owner));
    expect([200, 201]).toContain(res.status);
  });
});
