import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TEST_IDS } from '../../../tests/helpers';

// ── Mock: DB connection (chainable, awaitable at every step) ──────────────────
function selectChain(rows: unknown[]) {
  return { from: () => ({ where: () => ({ limit: () => Promise.resolve(rows), orderBy: () => Promise.resolve(rows) }) }) };
}
function updateChain(returningRows: unknown[] = []) {
  const awaitable: any = Promise.resolve(undefined);
  awaitable.returning = () => Promise.resolve(returningRows);
  return { set: () => ({ where: () => awaitable }) };
}

const selectMock = vi.hoisted(() => vi.fn());
const updateMock = vi.hoisted(() => vi.fn());

vi.mock('../../../db', () => ({
  db: {
    select: (...args: unknown[]) => selectMock(...args),
    update: (...args: unknown[]) => updateMock(...args),
  },
}));

vi.mock('../../../db/schema', () => ({
  release_missions: { id: 'id', release_id: 'release_id', mission_type: 'mission_type', status: 'status' },
  releases: { id: 'id' },
  artist_profiles: { id: 'id' },
  automation_runs: { id: 'id', mission_id: 'mission_id', created_at: 'created_at' },
}));

vi.mock('drizzle-orm', async () => {
  const actual = await vi.importActual<typeof import('drizzle-orm')>('drizzle-orm');
  return actual;
});

vi.mock('../../../lib/activityLogger', () => ({ logActivity: vi.fn() }));

const triggerByNameMock = vi.hoisted(() => vi.fn());
vi.mock('../../automation/automation.service', () => ({ triggerByName: triggerByNameMock }));

const missionQueueMock = vi.hoisted(() => ({
  add: vi.fn().mockResolvedValue({ id: 'job-123' }),
  getJob: vi.fn(),
}));
vi.mock('../../../queues', () => ({
  missionPlaylistQueue: missionQueueMock,
  missionSyncQueue: missionQueueMock,
  missionFanQueue: missionQueueMock,
  missionContentQueue: missionQueueMock,
  missionOutreachQueue: missionQueueMock,
  missionAnalyticsQueue: missionQueueMock,
}));

import { dispatchMission, retryMission, cancelMission } from '../mission-dispatcher.service';

const MISSION_ID = TEST_IDS.content;
const RELEASE_ID = TEST_IDS.campaign;

function makeMission(overrides: Record<string, unknown> = {}) {
  return {
    id: MISSION_ID,
    release_id: RELEASE_ID,
    artist_id: null,
    mission_type: 'playlist',
    title: 'Pitch playlist',
    status: 'pending',
    priority: 50,
    queue_job_id: null,
    mission_params: {},
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('dispatchMission', () => {
  it('throws when the mission does not exist', async () => {
    selectMock.mockReturnValue(selectChain([]));
    await expect(dispatchMission(MISSION_ID)).rejects.toThrow('Mission not found');
  });

  it('does not re-dispatch a mission already in flight', async () => {
    selectMock.mockReturnValue(selectChain([makeMission({ status: 'running', queue_job_id: 'job-abc' })]));
    const result = await dispatchMission(MISSION_ID);
    expect(result).toEqual({ status: 'running', queueJobId: 'job-abc' });
    expect(missionQueueMock.add).not.toHaveBeenCalled();
  });

  it('enqueues a pending mission onto its matching queue and marks it queued', async () => {
    selectMock.mockReturnValue(selectChain([makeMission({ status: 'pending' })]));
    updateMock.mockReturnValue(updateChain());

    const result = await dispatchMission(MISSION_ID);

    expect(missionQueueMock.add).toHaveBeenCalledWith(
      'playlist_pitch',
      expect.objectContaining({ missionId: MISSION_ID, releaseId: RELEASE_ID, workflowName: 'playlist_pitch' }),
      expect.objectContaining({ priority: expect.any(Number) }),
    );
    expect(result.status).toBe('queued');
    expect(result.queueJobId).toBe('job-123');
  });

  it('re-dispatches a previously failed mission', async () => {
    selectMock.mockReturnValue(selectChain([makeMission({ status: 'failed', last_error: 'boom' })]));
    updateMock.mockReturnValue(updateChain());

    const result = await dispatchMission(MISSION_ID);
    expect(result.status).toBe('queued');
  });
});

describe('retryMission', () => {
  it('rejects missions that are not failed or cancelled', async () => {
    selectMock.mockReturnValue(selectChain([makeMission({ status: 'completed' })]));
    await expect(retryMission(MISSION_ID)).rejects.toThrow('Only failed or cancelled missions can be retried');
  });

  it('resets a failed mission to pending and re-dispatches it', async () => {
    selectMock
      .mockReturnValueOnce(selectChain([makeMission({ status: 'failed' })])) // retryMission's own lookup
      .mockReturnValueOnce(selectChain([makeMission({ status: 'pending' })])); // dispatchMission's lookup after reset
    updateMock.mockReturnValue(updateChain());

    const result = await retryMission(MISSION_ID);
    expect(result.status).toBe('queued');
  });
});

describe('cancelMission', () => {
  it('rejects missions that have already finished', async () => {
    selectMock.mockReturnValue(selectChain([makeMission({ status: 'completed' })]));
    await expect(cancelMission(MISSION_ID)).rejects.toThrow('Mission has already finished');
  });

  it('removes the queued BullMQ job and marks the mission cancelled', async () => {
    const mission = makeMission({ status: 'queued', queue_job_id: 'job-abc' });
    selectMock.mockReturnValue(selectChain([mission]));
    updateMock.mockReturnValue(updateChain([{ ...mission, status: 'cancelled' }]));
    const removeMock = vi.fn().mockResolvedValue(undefined);
    missionQueueMock.getJob.mockResolvedValue({ remove: removeMock });

    const result = await cancelMission(MISSION_ID);

    expect(missionQueueMock.getJob).toHaveBeenCalledWith('job-abc');
    expect(removeMock).toHaveBeenCalled();
    expect(result.status).toBe('cancelled');
  });
});
