import { vi, describe, it, expect, beforeAll } from 'vitest';

const mockService = vi.hoisted(() => ({
  getReleaseIntelSnapshot: vi.fn(),
  analyzeRelease: vi.fn(),
  getBriefHistory: vi.fn(),
  getMissions: vi.fn(),
  updateMission: vi.fn(),
}));
vi.mock('../release-intel.service', () => mockService);

import supertest from 'supertest';
import app from '../../../app';
import { authHeader, TEST_IDS } from '../../../tests/helpers';

const agent = supertest(app);
const RELEASE_ID = TEST_IDS.campaign; // any valid uuid stand-in
const MISSION_ID = TEST_IDS.content;
const BASE = `/api/release-intel/${RELEASE_ID}`;

const sampleSnapshot = {
  release: { id: RELEASE_ID, release_title: 'Test Release' },
  analysis: { id: 'analysis-1', release_id: RELEASE_ID, status: 'complete' },
  brief: { id: 'brief-1', release_id: RELEASE_ID, summary: 'Great release.' },
  missions: [{ id: MISSION_ID, mission_type: 'playlist', status: 'pending' }],
};

beforeAll(() => {
  mockService.getReleaseIntelSnapshot.mockResolvedValue(sampleSnapshot);
  mockService.analyzeRelease.mockResolvedValue(undefined);
  mockService.getBriefHistory.mockResolvedValue([sampleSnapshot.brief]);
  mockService.getMissions.mockResolvedValue(sampleSnapshot.missions);
  mockService.updateMission.mockResolvedValue({ ...sampleSnapshot.missions[0], status: 'active' });
});

describe('GET /api/release-intel/:releaseId', () => {
  it('returns 401 without a token', async () => {
    expect((await agent.get(BASE)).status).toBe(401);
  });

  it('returns the full snapshot with a valid token', async () => {
    const res = await agent.get(BASE).set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body.data.release.id).toBe(RELEASE_ID);
    expect(res.body.data.missions).toHaveLength(1);
  });
});

describe('POST /api/release-intel/:releaseId/analyze', () => {
  it('returns 401 without a token', async () => {
    expect((await agent.post(`${BASE}/analyze`)).status).toBe(401);
  });

  it('accepts an empty body (force defaults to false)', async () => {
    const res = await agent.post(`${BASE}/analyze`).set(authHeader()).send({});
    expect(res.status).toBe(200);
    expect(mockService.analyzeRelease).toHaveBeenCalledWith(RELEASE_ID, { force: false });
  });

  it('rejects a non-boolean force field', async () => {
    const res = await agent.post(`${BASE}/analyze`).set(authHeader()).send({ force: 'yes' });
    expect(res.status).toBe(400);
  });

  it('passes force=true through to the service', async () => {
    await agent.post(`${BASE}/analyze`).set(authHeader()).send({ force: true });
    expect(mockService.analyzeRelease).toHaveBeenCalledWith(RELEASE_ID, { force: true });
  });
});

describe('GET /api/release-intel/:releaseId/brief', () => {
  it('returns the latest brief by default', async () => {
    const res = await agent.get(`${BASE}/brief`).set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body.data.summary).toBe('Great release.');
    expect(mockService.getBriefHistory).not.toHaveBeenCalled();
  });

  it('returns brief history when ?history=true', async () => {
    const res = await agent.get(`${BASE}/brief?history=true`).set(authHeader());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(mockService.getBriefHistory).toHaveBeenCalledWith(RELEASE_ID);
  });
});

describe('GET /api/release-intel/:releaseId/missions', () => {
  it('returns 401 without a token', async () => {
    expect((await agent.get(`${BASE}/missions`)).status).toBe(401);
  });

  it('returns the missions list with a valid token', async () => {
    const res = await agent.get(`${BASE}/missions`).set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

describe('PATCH /api/release-intel/missions/:missionId', () => {
  it('is routed correctly and not captured by the /:releaseId route', async () => {
    const res = await agent
      .patch(`/api/release-intel/missions/${MISSION_ID}`)
      .set(authHeader())
      .send({ status: 'active' });

    expect(res.status).toBe(200);
    expect(mockService.updateMission).toHaveBeenCalledWith(MISSION_ID, { status: 'active' });
  });

  it('rejects an empty update body', async () => {
    const res = await agent.patch(`/api/release-intel/missions/${MISSION_ID}`).set(authHeader()).send({});
    expect(res.status).toBe(400);
  });

  it('returns 401 without a token', async () => {
    const res = await agent.patch(`/api/release-intel/missions/${MISSION_ID}`).send({ status: 'active' });
    expect(res.status).toBe(401);
  });
});
