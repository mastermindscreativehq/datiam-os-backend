import { vi, describe, it, expect, beforeAll } from 'vitest';

const mockService = vi.hoisted(() => ({
  getReleaseIntelSnapshot: vi.fn(),
  analyzeRelease: vi.fn(),
  getBriefHistory: vi.fn(),
  getMissions: vi.fn(),
  updateMission: vi.fn(),
  applyMissionResult: vi.fn(),
}));
vi.mock('../release-intel.service', () => mockService);

const mockDispatcher = vi.hoisted(() => ({
  dispatchMission: vi.fn(),
  retryMission: vi.fn(),
  cancelMission: vi.fn(),
  getMissionExecution: vi.fn(),
}));
vi.mock('../mission-dispatcher.service', () => mockDispatcher);

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
  mockService.applyMissionResult.mockResolvedValue({ ...sampleSnapshot.missions[0], status: 'completed' });
  mockDispatcher.dispatchMission.mockResolvedValue({ status: 'queued', queueJobId: 'job-1' });
  mockDispatcher.retryMission.mockResolvedValue({ status: 'queued', queueJobId: 'job-2' });
  mockDispatcher.cancelMission.mockResolvedValue({ ...sampleSnapshot.missions[0], status: 'cancelled' });
  mockDispatcher.getMissionExecution.mockResolvedValue({ mission: sampleSnapshot.missions[0], execution_history: [], queue_status: null });
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

describe('POST /api/release-intel/missions/:missionId/dispatch', () => {
  it('returns 401 without a token', async () => {
    expect((await agent.post(`/api/release-intel/missions/${MISSION_ID}/dispatch`)).status).toBe(401);
  });

  it('dispatches the mission and returns 202', async () => {
    const res = await agent.post(`/api/release-intel/missions/${MISSION_ID}/dispatch`).set(authHeader());
    expect(res.status).toBe(202);
    expect(res.body.data.status).toBe('queued');
    expect(mockDispatcher.dispatchMission).toHaveBeenCalledWith(MISSION_ID);
  });
});

describe('POST /api/release-intel/missions/:missionId/retry', () => {
  it('retries the mission and returns 202', async () => {
    const res = await agent.post(`/api/release-intel/missions/${MISSION_ID}/retry`).set(authHeader());
    expect(res.status).toBe(202);
    expect(mockDispatcher.retryMission).toHaveBeenCalledWith(MISSION_ID);
  });
});

describe('POST /api/release-intel/missions/:missionId/cancel', () => {
  it('cancels the mission', async () => {
    const res = await agent.post(`/api/release-intel/missions/${MISSION_ID}/cancel`).set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('cancelled');
    expect(mockDispatcher.cancelMission).toHaveBeenCalledWith(MISSION_ID);
  });
});

describe('GET /api/release-intel/missions/:missionId/execution', () => {
  it('returns 401 without a token', async () => {
    expect((await agent.get(`/api/release-intel/missions/${MISSION_ID}/execution`)).status).toBe(401);
  });

  it('returns the execution history', async () => {
    const res = await agent.get(`/api/release-intel/missions/${MISSION_ID}/execution`).set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body.data.execution_history).toEqual([]);
    expect(mockDispatcher.getMissionExecution).toHaveBeenCalledWith(MISSION_ID);
  });
});

describe('POST /api/release-intel/missions/:missionId/callback', () => {
  it('does not require a JWT — n8n authenticates via X-DATIAM-Secret instead', async () => {
    const res = await agent
      .post(`/api/release-intel/missions/${MISSION_ID}/callback`)
      .send({ status: 'completed', results: { playlists_found: 12 } });

    expect(res.status).toBe(200);
    expect(mockService.applyMissionResult).toHaveBeenCalledWith(
      MISSION_ID,
      { status: 'completed', results: { playlists_found: 12 } },
      undefined,
    );
  });

  it('rejects an invalid status value', async () => {
    const res = await agent
      .post(`/api/release-intel/missions/${MISSION_ID}/callback`)
      .send({ status: 'not_a_real_status' });
    expect(res.status).toBe(400);
  });
});
