import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { generateBlueprintSchema, recordPreferenceSchema } from './sonic-world.schema';
import * as ctrl from './sonic-world.controller';

const router = Router();
router.use(authenticate);

// ── Blueprint generation ──────────────────────────────────────────────────────
router.post('/generate',                          validate(generateBlueprintSchema), ctrl.generateBlueprint);
router.get('/blueprints/:sessionId',              ctrl.getLatestBlueprint);
router.get('/blueprints/:sessionId/history',      ctrl.getBlueprintHistory);
router.get('/dashboard',                          ctrl.getDashboard);

// ── Preferences ───────────────────────────────────────────────────────────────
router.post('/preferences',                       validate(recordPreferenceSchema), ctrl.recordPreference);
router.delete('/preferences/:id',                 ctrl.removePreference);
router.get('/preferences/blueprint/:blueprintId', ctrl.getBlueprintPreferences);
router.get('/preferences/artist/:artistId',       ctrl.getArtistPreferences);

// ── Pattern analysis ──────────────────────────────────────────────────────────
router.post('/patterns/:artistId/analyze',        ctrl.triggerPatternAnalysis);
router.get('/patterns/:artistId',                 ctrl.getPatterns);

// ── Artist profile ────────────────────────────────────────────────────────────
router.get('/profile/:artistId',                  ctrl.getProfile);

// ── Rankings ──────────────────────────────────────────────────────────────────
router.get('/rankings/:artistId',                 ctrl.getRankings);

// ── Analytics & Timeline ──────────────────────────────────────────────────────
router.get('/analytics/:artistId',                ctrl.getAnalytics);
router.get('/timeline/:artistId',                 ctrl.getTimeline);

// ── Director (Phase 4) ────────────────────────────────────────────────────────
router.post('/director/:artistId/generate',       ctrl.generateDirector);
router.get('/director/:artistId',                 ctrl.getDirector);
router.get('/evolution-map/:artistId',            ctrl.getEvolutionMap);

// ── Missions (Phase 4) ────────────────────────────────────────────────────────
router.post('/missions/:artistId/activate',       ctrl.activateMission);
router.get('/missions/:artistId',                 ctrl.getMissions);
router.post('/missions/:artistId/progress',       ctrl.updateMissionProgress);
router.delete('/missions/:missionId/abandon',     ctrl.abandonMission);

// ── Gap Analysis (Phase 4) ────────────────────────────────────────────────────
router.post('/gap-analysis/:artistId/run',        ctrl.runGapAnalysis);
router.get('/gap-analysis/:artistId',             ctrl.getGapAnalysis);

// ── Release Simulator (Phase 4) ───────────────────────────────────────────────
router.post('/simulate/:blueprintId',             ctrl.simulateRelease);
router.get('/simulate/:blueprintId',              ctrl.getSimulation);
router.get('/simulations/:artistId',              ctrl.getArtistSimulationsHandler);

// ── Execution Engine (Phase 5) ────────────────────────────────────────────────
router.post('/execution/:artistId/plans',                                    ctrl.createPlan);
router.post('/execution/:artistId/accept-recommendation',                    ctrl.acceptRec);
router.get('/execution/:artistId/plans',                                     ctrl.getPlans);
router.get('/execution/plans/:planId',                                       ctrl.getPlanDetails);
router.patch('/execution/plans/:planId/status',                              ctrl.updatePlanStatusHandler);
router.patch('/execution/plans/:planId/tasks',                               ctrl.updateTask);
router.post('/execution/plans/:planId/milestones/:milestoneId/complete',     ctrl.completeMilestoneHandler);
router.post('/execution/plans/:planId/checkpoints',                          ctrl.addCheckpointHandler);

// ── Session Mode (Phase 5) ────────────────────────────────────────────────────
router.post('/session-mode/:artistId/diagnose',   ctrl.runDiagnosis);
router.get('/session-mode/:artistId/latest',      ctrl.getLatestDiagnosticHandler);
router.get('/session-mode/:artistId/history',     ctrl.getDiagnosticHistoryHandler);

// ── Event Bus (Phase 5) ───────────────────────────────────────────────────────
router.get('/events/:artistId',                   ctrl.getEvents);

// ── Queue Management (Phase 5) ────────────────────────────────────────────────
router.post('/queue/:artistId/enqueue',           ctrl.enqueueJob);
router.get('/queue/:artistId/jobs',               ctrl.getQueueJobs);

// ── Platform Ingestion (Phase 5) ──────────────────────────────────────────────
router.get('/platform/pipeline-status',           ctrl.getPlatformPipelineStatus);
router.post('/platform/:artistId/signals',        ctrl.ingestPlatformSignal);
router.get('/platform/:artistId/signals',         ctrl.getPlatformSignals);
router.get('/platform/:artistId/summary',         ctrl.getPlatformSummary);

export default router;
