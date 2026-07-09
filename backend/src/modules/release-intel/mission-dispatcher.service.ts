import { randomUUID } from 'crypto';
import { eq, desc } from 'drizzle-orm';
import type { Queue } from 'bullmq';
import { db } from '../../db';
import { release_missions, releases, artist_profiles, automation_runs } from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import { logActivity } from '../../lib/activityLogger';
import { triggerByName } from '../automation/automation.service';
import {
  missionPlaylistQueue,
  missionSyncQueue,
  missionFanQueue,
  missionContentQueue,
  missionOutreachQueue,
  missionAnalyticsQueue,
} from '../../queues';

// ── Mission type → queue / workflow registry name ───────────────────────────
// These map 1:1 with release_missions.mission_type and the workflows seeded
// in automation.service.ts::seedWorkflows() (playlist_pitch, sync_pitch, …).

export const MISSION_WORKFLOW_NAME: Record<string, string> = {
  playlist: 'playlist_pitch',
  sync: 'sync_pitch',
  fan_growth: 'fan_growth',
  content: 'content_calendar',
  outreach: 'press_outreach',
  analytics: 'analytics_refresh',
};

const MISSION_QUEUE: Record<string, Queue | null> = {
  playlist: missionPlaylistQueue,
  sync: missionSyncQueue,
  fan_growth: missionFanQueue,
  content: missionContentQueue,
  outreach: missionOutreachQueue,
  analytics: missionAnalyticsQueue,
};

// Statuses from which a (re)dispatch is allowed. Missions already in-flight
// (queued/running/waiting/retrying) or finished (completed) are left alone —
// dispatching them again would create a duplicate BullMQ job for the same work.
const DISPATCHABLE_STATUSES = new Set(['pending', 'active', 'blocked', 'failed', 'cancelled']);

export interface MissionJobPayload {
  missionId: string;
  releaseId: string;
  artistId: string | null;
  missionType: string;
  workflowName: string;
  correlationId: string;
}

export interface DispatchResult {
  status: string;
  queueJobId: string | null;
}

/**
 * Enqueues a mission onto its matching BullMQ queue. If Redis isn't
 * configured, processes it inline instead — the same graceful-degradation
 * pattern used everywhere else in this codebase (see release-intel.worker.ts).
 */
export async function dispatchMission(missionId: string): Promise<DispatchResult> {
  const [mission] = await db.select().from(release_missions).where(eq(release_missions.id, missionId)).limit(1);
  if (!mission) throw new AppError('Mission not found', 404, 'MISSION_NOT_FOUND');

  if (!DISPATCHABLE_STATUSES.has(mission.status)) {
    return { status: mission.status, queueJobId: mission.queue_job_id };
  }

  const workflowName = MISSION_WORKFLOW_NAME[mission.mission_type];
  const queue = MISSION_QUEUE[mission.mission_type];
  const correlationId = randomUUID();

  const payload: MissionJobPayload = {
    missionId: mission.id,
    releaseId: mission.release_id,
    artistId: mission.artist_id,
    missionType: mission.mission_type,
    workflowName,
    correlationId,
  };

  let queueJobId: string | null = null;
  if (queue) {
    // BullMQ priority: 1 = highest. Mission priority is 0-100 (higher = more
    // important), so invert it into BullMQ's ordering.
    const job = await queue.add(workflowName, payload, { priority: Math.max(1, 101 - mission.priority) });
    queueJobId = job.id ?? null;
  }

  await db
    .update(release_missions)
    .set({ status: 'queued', queue_job_id: queueJobId, retry_count: 0, last_error: null, updated_at: new Date() })
    .where(eq(release_missions.id, missionId));

  logActivity({
    eventType: 'release_intel.mission.queued',
    module: 'release-intel',
    entityType: 'release_mission',
    entityId: missionId,
    title: `Mission queued: ${mission.title}`,
    severity: 'info',
    metadata: { release_id: mission.release_id, mission_type: mission.mission_type, workflow: workflowName, correlationId, queueJobId },
  });

  if (!queue) {
    await processMissionJob(payload).catch((err) => {
      console.warn(`[MissionDispatcher] Inline processing failed for mission=${missionId} (non-fatal):`, err instanceof Error ? err.message : String(err));
    });
  }

  return { status: 'queued', queueJobId };
}

/**
 * Core mission execution step, run by mission.worker.ts (BullMQ) or inline
 * from dispatchMission() when Redis isn't configured. Fires the mission's
 * workflow through the existing Automation Registry (triggerByName), which
 * owns HTTP-level retry/backoff and automation_runs bookkeeping — this
 * function only owns the mission-level status transitions layered on top.
 */
export async function processMissionJob(payload: MissionJobPayload, attemptsMade = 0): Promise<void> {
  const { missionId, releaseId, workflowName, correlationId } = payload;

  const [mission] = await db.select().from(release_missions).where(eq(release_missions.id, missionId)).limit(1);
  if (!mission) return; // deleted since being queued — nothing to do

  const isRetry = attemptsMade > 0;
  await db
    .update(release_missions)
    .set({
      status: isRetry ? 'retrying' : 'running',
      started_at: mission.started_at ?? new Date(),
      retry_count: attemptsMade,
      updated_at: new Date(),
    })
    .where(eq(release_missions.id, missionId));

  logActivity({
    eventType: isRetry ? 'release_intel.mission.retrying' : 'release_intel.mission.dispatched',
    module: 'release-intel',
    entityType: 'release_mission',
    entityId: missionId,
    title: isRetry ? `Retrying mission: ${mission.title} (attempt ${attemptsMade + 1})` : `Workflow dispatched: ${mission.title}`,
    severity: isRetry ? 'warning' : 'info',
    metadata: { release_id: releaseId, workflow: workflowName, correlationId },
  });

  const [release] = await db.select().from(releases).where(eq(releases.id, releaseId)).limit(1);
  const artist = mission.artist_id
    ? (await db.select().from(artist_profiles).where(eq(artist_profiles.id, mission.artist_id)).limit(1))[0] ?? null
    : null;

  const n8nData = {
    release: release
      ? { id: release.id, title: release.release_title, type: release.release_type, genre: release.genre, release_date: release.release_date }
      : { id: releaseId },
    artist: artist ? { id: artist.id, stage_name: artist.stage_name, genre: artist.genre, country: artist.country } : null,
    mission: {
      id: mission.id,
      type: mission.mission_type,
      title: mission.title,
      target_metrics: mission.target_metrics,
      mission_params: mission.mission_params,
    },
    workflow: workflowName,
    metadata: { correlationId, missionId, attempt: attemptsMade + 1 },
    priority: mission.priority,
    context: mission.mission_params,
  };

  const result = await triggerByName(
    workflowName,
    `release.intel.mission.${mission.mission_type}.dispatched`,
    n8nData,
    undefined,
    { missionId },
  );

  if (result.status !== 'success') {
    await db
      .update(release_missions)
      .set({
        automation_run_id: result.run_id,
        last_error: 'error' in result ? result.error : 'Workflow dispatch failed',
        updated_at: new Date(),
      })
      .where(eq(release_missions.id, missionId));

    // Throwing hands control back to BullMQ, which retries per queue defaults
    // (3 attempts, exponential backoff) — the inline fallback path below
    // re-catches this itself since there's no BullMQ retry to rely on.
    throw new Error('error' in result ? result.error : 'Workflow dispatch failed');
  }

  const response = (result.response ?? {}) as { execution_id?: string; estimated_duration_ms?: number; workflow_version?: string };
  const missionParams = { ...(mission.mission_params as Record<string, unknown>) };
  missionParams.last_dispatch = {
    execution_id: response.execution_id ?? null,
    estimated_duration_ms: response.estimated_duration_ms ?? null,
    workflow_version: response.workflow_version ?? null,
    correlation_id: correlationId,
    dispatched_at: new Date().toISOString(),
  };

  await db
    .update(release_missions)
    .set({
      status: 'waiting',
      automation_run_id: result.run_id,
      last_error: null,
      mission_params: missionParams,
      updated_at: new Date(),
    })
    .where(eq(release_missions.id, missionId));

  logActivity({
    eventType: 'release_intel.mission.waiting',
    module: 'release-intel',
    entityType: 'release_mission',
    entityId: missionId,
    title: `Workflow executing: ${mission.title}`,
    severity: 'info',
    metadata: { release_id: releaseId, workflow: workflowName, execution_id: response.execution_id, estimated_duration_ms: response.estimated_duration_ms },
  });
}

/** Manual rerun — only valid once a mission has actually stopped running. */
export async function retryMission(missionId: string): Promise<DispatchResult> {
  const [mission] = await db.select().from(release_missions).where(eq(release_missions.id, missionId)).limit(1);
  if (!mission) throw new AppError('Mission not found', 404, 'MISSION_NOT_FOUND');
  if (mission.status !== 'failed' && mission.status !== 'cancelled') {
    throw new AppError('Only failed or cancelled missions can be retried', 400, 'MISSION_NOT_RETRYABLE');
  }

  await db.update(release_missions).set({ status: 'pending', last_error: null, updated_at: new Date() }).where(eq(release_missions.id, missionId));
  return dispatchMission(missionId);
}

/** Best-effort cancel: removes the queued BullMQ job (if any) and marks the mission cancelled. */
export async function cancelMission(missionId: string) {
  const [mission] = await db.select().from(release_missions).where(eq(release_missions.id, missionId)).limit(1);
  if (!mission) throw new AppError('Mission not found', 404, 'MISSION_NOT_FOUND');
  if (mission.status === 'completed' || mission.status === 'cancelled') {
    throw new AppError('Mission has already finished', 400, 'MISSION_ALREADY_FINISHED');
  }

  if (mission.queue_job_id) {
    const queue = MISSION_QUEUE[mission.mission_type];
    try {
      const job = await queue?.getJob(mission.queue_job_id);
      await job?.remove();
    } catch (err) {
      console.warn(`[MissionDispatcher] Failed to remove queue job for mission=${missionId} (non-fatal):`, err instanceof Error ? err.message : String(err));
    }
  }

  const [updated] = await db
    .update(release_missions)
    .set({ status: 'cancelled', updated_at: new Date() })
    .where(eq(release_missions.id, missionId))
    .returning();

  logActivity({
    eventType: 'release_intel.mission.cancelled',
    module: 'release-intel',
    entityType: 'release_mission',
    entityId: missionId,
    title: `Mission cancelled: ${mission.title}`,
    severity: 'warning',
    metadata: { release_id: mission.release_id, mission_type: mission.mission_type },
  });

  return updated;
}

/** Execution history for a mission — reads automation_runs by mission_id rather than duplicating the data on release_missions. */
export async function getMissionExecution(missionId: string) {
  const [mission] = await db.select().from(release_missions).where(eq(release_missions.id, missionId)).limit(1);
  if (!mission) throw new AppError('Mission not found', 404, 'MISSION_NOT_FOUND');

  const history = await db
    .select()
    .from(automation_runs)
    .where(eq(automation_runs.mission_id, missionId))
    .orderBy(desc(automation_runs.created_at));

  let queueStatus: string | null = null;
  if (mission.queue_job_id) {
    const queue = MISSION_QUEUE[mission.mission_type];
    try {
      const job = await queue?.getJob(mission.queue_job_id);
      queueStatus = job ? await job.getState() : null;
    } catch {
      queueStatus = null;
    }
  }

  return { mission, execution_history: history, queue_status: queueStatus };
}
