import { Request, Response, NextFunction } from 'express';
import * as svc from './sonic-world.service';
import { success } from '../../utils/response';
import { AppError } from '../../middleware/errorHandler';
import type { GenerateBlueprintInput, RecordPreferenceInput } from './sonic-world.schema';
import { analyzeArtistPatterns, getArtistPatterns } from './sonic-patterns.service';
import { computeArtistProfile, getArtistProfile } from './sonic-artist-profile.service';
import { getArtistRankings } from './sonic-rankings.service';
import { getAnalyticsDashboard, getEvolutionTimeline } from './sonic-analytics.service';
import {
  generateDirectorRecommendations,
  getDirectorRecommendations,
  getEvolutionMap as buildEvolutionMap,
} from './sonic-director.service';
import {
  activateMission as activateMissionSvc,
  getMissions as getMissionsSvc,
  updateMissionProgress as updateProgressSvc,
  abandonMission as abandonMissionSvc,
  type MissionType,
} from './sonic-missions.service';
import { runGapAnalysis as runGap, getGapAnalysis as getGap } from './sonic-gap-analysis.service';
import {
  simulateRelease as simRelease,
  getReleaseSimulation,
  getArtistSimulations,
} from './sonic-release-simulator.service';
import {
  createExecutionPlan,
  acceptRecommendation,
  getExecutionPlans,
  getPlanWithDetails,
  updateTaskStatus,
  completeMilestone,
  addCheckpoint,
  updatePlanStatus,
  type ExecutionCategory,
  type ExecutionStatus,
} from './sonic-execution.service';
import {
  diagnoseSession,
  getLatestDiagnostic,
  getDiagnosticHistory,
} from './sonic-session-mode.service';
import {
  ingestSignal,
  getArtistSignals,
  getSignalSummary,
  getPipelineStatus,
  type SupportedPlatform,
  type SignalType,
} from './platform-ingestion.service';
import { eq, desc } from 'drizzle-orm';
import { db } from '../../db';
import { sonic_events, sonic_queue_jobs } from '../../db/schema';
import {
  sonicSimulationQueue,
  sonicAnalyticsQueue,
  sonicMemoryQueue,
  sonicRankingQueue,
  enqueueSonicJob,
} from '../../queues';

export const generateBlueprint = async (req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await svc.generateBlueprint(req.body as GenerateBlueprintInput, req.user?.email), 201);
  } catch (err) { next(err); }
};

export const getLatestBlueprint = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const blueprint = await svc.getLatestBlueprint(req.params.sessionId);
    if (!blueprint) return next(new AppError('No Sonic World blueprint found for this session', 404));
    success(res, blueprint);
  } catch (err) { next(err); }
};

export const getBlueprintHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    success(res, await svc.getBlueprintHistory(req.params.sessionId, limit));
  } catch (err) { next(err); }
};

export const getDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const artistId = req.query.artist_id as string | undefined;
    success(res, await svc.getDashboard(artistId));
  } catch (err) { next(err); }
};

// ── Preferences ───────────────────────────────────────────────────────────────

export const recordPreference = async (req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await svc.recordPreference(req.body as RecordPreferenceInput, req.user?.email), 201);
  } catch (err) { next(err); }
};

export const removePreference = async (req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await svc.removePreference(req.params.id));
  } catch (err) { next(err); }
};

export const getBlueprintPreferences = async (req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await svc.getBlueprintPreferences(req.params.blueprintId));
  } catch (err) { next(err); }
};

export const getArtistPreferences = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const artistId = req.params.artistId;
    success(res, await svc.getArtistPreferences(artistId));
  } catch (err) { next(err); }
};

// ── Pattern Analysis ──────────────────────────────────────────────────────────

export const triggerPatternAnalysis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { artistId } = req.params;
    const patterns = await analyzeArtistPatterns(artistId);
    const profile  = await computeArtistProfile(artistId);
    success(res, { patterns, profile });
  } catch (err) { next(err); }
};

export const getPatterns = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = await getArtistPatterns(req.params.artistId);
    if (!p) return next(new AppError('No pattern analysis found — trigger analysis first', 404));
    success(res, p);
  } catch (err) { next(err); }
};

// ── Artist Profile ────────────────────────────────────────────────────────────

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [profile, patterns] = await Promise.all([
      getArtistProfile(req.params.artistId),
      getArtistPatterns(req.params.artistId),
    ]);
    success(res, { profile, patterns });
  } catch (err) { next(err); }
};

// ── Rankings ──────────────────────────────────────────────────────────────────

export const getRankings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await getArtistRankings(req.params.artistId));
  } catch (err) { next(err); }
};

// ── Analytics ─────────────────────────────────────────────────────────────────

export const getAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await getAnalyticsDashboard(req.params.artistId));
  } catch (err) { next(err); }
};

// ── Timeline ──────────────────────────────────────────────────────────────────

export const getTimeline = async (req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await getEvolutionTimeline(req.params.artistId));
  } catch (err) { next(err); }
};

// ── Director (Phase 4) ────────────────────────────────────────────────────────

export const generateDirector = async (req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await generateDirectorRecommendations(req.params.artistId));
  } catch (err) { next(err); }
};

export const getDirector = async (req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await getDirectorRecommendations(req.params.artistId));
  } catch (err) { next(err); }
};

export const getEvolutionMap = async (req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await buildEvolutionMap(req.params.artistId));
  } catch (err) { next(err); }
};

// ── Missions (Phase 4) ────────────────────────────────────────────────────────

export const activateMission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { mission_type } = req.body as { mission_type: MissionType };
    if (!mission_type) return next(new AppError('mission_type is required', 400));
    success(res, await activateMissionSvc(req.params.artistId, mission_type), 201);
  } catch (err) { next(err); }
};

export const getMissions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await getMissionsSvc(req.params.artistId));
  } catch (err) { next(err); }
};

export const updateMissionProgress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await updateProgressSvc(req.params.artistId));
  } catch (err) { next(err); }
};

export const abandonMission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const m = await abandonMissionSvc(req.params.missionId);
    if (!m) return next(new AppError('Mission not found', 404));
    success(res, m);
  } catch (err) { next(err); }
};

// ── Gap Analysis (Phase 4) ────────────────────────────────────────────────────

export const runGapAnalysis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await runGap(req.params.artistId));
  } catch (err) { next(err); }
};

export const getGapAnalysis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const g = await getGap(req.params.artistId);
    if (!g) return next(new AppError('No gap analysis found — run analysis first', 404));
    success(res, g);
  } catch (err) { next(err); }
};

// ── Release Simulator (Phase 4) ───────────────────────────────────────────────

export const simulateRelease = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { artist_id } = req.body as { artist_id: string };
    if (!artist_id) return next(new AppError('artist_id is required', 400));
    success(res, await simRelease(req.params.blueprintId, artist_id));
  } catch (err) { next(err); }
};

export const getSimulation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const s = await getReleaseSimulation(req.params.blueprintId);
    if (!s) return next(new AppError('No simulation found for this blueprint', 404));
    success(res, s);
  } catch (err) { next(err); }
};

export const getArtistSimulationsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    success(res, await getArtistSimulations(req.params.artistId, limit));
  } catch (err) { next(err); }
};

// ── Execution Engine (Phase 5) ────────────────────────────────────────────────

export const createPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, recommendation_id, mission_id, title, objective } = req.body as {
      category: ExecutionCategory; recommendation_id?: string; mission_id?: string; title?: string; objective?: string;
    };
    if (!category) return next(new AppError('category is required', 400));
    const result = await createExecutionPlan(req.params.artistId, category, { recommendation_id, mission_id, title, objective });
    success(res, result, 201);
  } catch (err) { next(err); }
};

export const acceptRec = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { recommendation_id, category } = req.body as { recommendation_id: string; category: ExecutionCategory };
    if (!recommendation_id || !category) return next(new AppError('recommendation_id and category are required', 400));
    success(res, await acceptRecommendation(req.params.artistId, recommendation_id, category), 201);
  } catch (err) { next(err); }
};

export const getPlans = async (req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await getExecutionPlans(req.params.artistId));
  } catch (err) { next(err); }
};

export const getPlanDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plan = await getPlanWithDetails(req.params.planId);
    if (!plan) return next(new AppError('Execution plan not found', 404));
    success(res, plan);
  } catch (err) { next(err); }
};

export const updateTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { task_id, status } = req.body as { task_id: string; status: 'pending' | 'in_progress' | 'completed' };
    if (!task_id || !status) return next(new AppError('task_id and status are required', 400));
    const result = await updateTaskStatus(req.params.planId, task_id, status);
    if (!result) return next(new AppError('Plan not found', 404));
    success(res, result);
  } catch (err) { next(err); }
};

export const completeMilestoneHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const m = await completeMilestone(req.params.planId, req.params.milestoneId);
    if (!m) return next(new AppError('Milestone not found', 404));
    success(res, m);
  } catch (err) { next(err); }
};

export const addCheckpointHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { notes, data_snapshot } = req.body as { notes: string; data_snapshot?: Record<string, unknown> };
    if (!notes) return next(new AppError('notes is required', 400));
    const cp = await addCheckpoint(req.params.planId, notes, data_snapshot);
    if (!cp) return next(new AppError('Plan not found', 404));
    success(res, cp, 201);
  } catch (err) { next(err); }
};

export const updatePlanStatusHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body as { status: ExecutionStatus };
    if (!status) return next(new AppError('status is required', 400));
    const result = await updatePlanStatus(req.params.planId, status);
    if (!result) return next(new AppError('Plan not found', 404));
    success(res, result);
  } catch (err) { next(err); }
};

// ── Session Mode (Phase 5) ────────────────────────────────────────────────────

export const runDiagnosis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const windowSize = Math.min(parseInt(req.query.window as string) || 10, 30);
    const sessionId  = req.query.session_id as string | undefined;
    success(res, await diagnoseSession(req.params.artistId, windowSize, sessionId));
  } catch (err) { next(err); }
};

export const getLatestDiagnosticHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const d = await getLatestDiagnostic(req.params.artistId);
    if (!d) return next(new AppError('No diagnostic found — run a diagnosis first', 404));
    success(res, d);
  } catch (err) { next(err); }
};

export const getDiagnosticHistoryHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    success(res, await getDiagnosticHistory(req.params.artistId, limit));
  } catch (err) { next(err); }
};

// ── Event Bus (Phase 5) ───────────────────────────────────────────────────────

export const getEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const artistId  = req.params.artistId;
    const limit     = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const eventType = req.query.event_type as string | undefined;

    const rows = await db
      .select()
      .from(sonic_events)
      .where(eq(sonic_events.artist_id, artistId))
      .orderBy(desc(sonic_events.created_at))
      .limit(limit);

    const filtered = eventType ? rows.filter(r => r.event_type === eventType) : rows;
    success(res, { events: filtered, total: filtered.length });
  } catch (err) { next(err); }
};

// ── Queue Management (Phase 5) ────────────────────────────────────────────────

export const getQueueJobs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const rows   = await db
      .select()
      .from(sonic_queue_jobs)
      .where(eq(sonic_queue_jobs.artist_id, req.params.artistId))
      .orderBy(desc(sonic_queue_jobs.created_at))
      .limit(limit);
    success(res, { jobs: rows, total: rows.length });
  } catch (err) { next(err); }
};

export const enqueueJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { job_type, payload } = req.body as { job_type: string; payload: Record<string, unknown> };
    if (!job_type) return next(new AppError('job_type is required', 400));

    const queueMap: Record<string, typeof sonicSimulationQueue> = {
      simulation:  sonicSimulationQueue,
      analytics:   sonicAnalyticsQueue,
      memory:      sonicMemoryQueue,
      ranking:     sonicRankingQueue,
    };

    const queue = queueMap[job_type];
    if (!queue) return next(new AppError(`Unknown job_type: ${job_type}. Valid: simulation, analytics, memory, ranking`, 400));

    const jobId = await enqueueSonicJob(queue, job_type, { artist_id: req.params.artistId, ...payload });

    const [tracked] = await db.insert(sonic_queue_jobs).values({
      queue_name: `sonic-${job_type}`,
      job_id:     jobId ?? undefined,
      job_type,
      artist_id:  req.params.artistId,
      payload,
      status:     'pending',
    }).returning();

    success(res, { job: tracked, queued: !!jobId, note: jobId ? null : 'Redis not configured — job tracked but not queued' }, 202);
  } catch (err) { next(err); }
};

// ── Platform Ingestion (Phase 5) ──────────────────────────────────────────────

export const ingestPlatformSignal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { platform, signal_type, value, track_id, track_title, recorded_at, metadata } = req.body as {
      platform: SupportedPlatform; signal_type: SignalType; value: number;
      track_id?: string; track_title?: string; recorded_at?: string; metadata?: Record<string, unknown>;
    };
    if (!platform || !signal_type || value === undefined) {
      return next(new AppError('platform, signal_type, and value are required', 400));
    }
    const signal = await ingestSignal({
      artist_id:   req.params.artistId,
      platform, signal_type, value, track_id, track_title,
      recorded_at: recorded_at ? new Date(recorded_at) : undefined,
      metadata,
    });
    success(res, signal, 201);
  } catch (err) { next(err); }
};

export const getPlatformSignals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signals = await getArtistSignals(req.params.artistId, {
      platform:    req.query.platform as SupportedPlatform | undefined,
      signal_type: req.query.signal_type as SignalType | undefined,
      limit:       parseInt(req.query.limit as string) || 50,
    });
    success(res, signals);
  } catch (err) { next(err); }
};

export const getPlatformSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await getSignalSummary(req.params.artistId));
  } catch (err) { next(err); }
};

export const getPlatformPipelineStatus = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await getPipelineStatus());
  } catch (err) { next(err); }
};
