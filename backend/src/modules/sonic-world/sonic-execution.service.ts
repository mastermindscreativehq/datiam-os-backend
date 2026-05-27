import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../db';
import {
  sonic_execution_plans,
  sonic_execution_milestones,
  sonic_execution_checkpoints,
  sonic_director_recommendations,
} from '../../db/schema';
import { sonicEventBus } from './sonic-event-bus';
import { ENGINE_VERSIONS } from './sonic-engine-versions';

export type ExecutionCategory = 'arrangement' | 'vocal' | 'instrumentation' | 'mix' | 'release' | 'performance';
export type ExecutionStatus   = 'pending' | 'in_progress' | 'completed' | 'paused' | 'cancelled';

interface ProductionTask {
  id:              string;
  title:           string;
  description:     string;
  priority:        number;
  estimated_hours: number;
  status:          'pending' | 'in_progress' | 'completed';
  is_checkpoint:   boolean;
}

interface MilestoneTemplate { title: string; description: string; offset_fraction: number; criteria: string[] }

const TASK_LIBRARY: Record<ExecutionCategory, Omit<ProductionTask, 'id' | 'status'>[]> = {
  arrangement: [
    { title: 'Define Song Structure',      description: 'Map intro/verse/pre-chorus/chorus/bridge/outro architecture', priority: 1, estimated_hours: 2,  is_checkpoint: false },
    { title: 'Plan Dynamic Arc',           description: 'Chart energy curve from intro drop to final chorus peak',     priority: 2, estimated_hours: 1,  is_checkpoint: false },
    { title: 'Section Length Grid',        description: 'Lock section lengths to BPM grid with 8-/16-bar discipline', priority: 3, estimated_hours: 1,  is_checkpoint: true  },
    { title: 'Transition Design',          description: 'Design fills, impacts, and breath gaps between sections',     priority: 4, estimated_hours: 3,  is_checkpoint: false },
    { title: 'Arrangement A/B Review',     description: 'Compare against 3 reference tracks in same genre',           priority: 5, estimated_hours: 2,  is_checkpoint: false },
    { title: 'Final Arrangement Sign-Off', description: 'Lock arrangement before tracking — no structural changes after', priority: 6, estimated_hours: 1, is_checkpoint: true },
  ],
  vocal: [
    { title: 'Scratch Vocal Pass',      description: 'Record reference vocal capturing the emotional intent',                 priority: 1, estimated_hours: 2,  is_checkpoint: false },
    { title: 'Melody Variation Map',    description: 'Write 3 melody variants for each section; choose the strongest',       priority: 2, estimated_hours: 3,  is_checkpoint: true  },
    { title: 'Hook Crystallization',    description: 'Isolate and perfect the primary hook — 6-second ear test',             priority: 3, estimated_hours: 2,  is_checkpoint: false },
    { title: 'Harmony Stacking Plan',   description: 'Define harmony intervals, breath patterns, and doubling layers',      priority: 4, estimated_hours: 2,  is_checkpoint: false },
    { title: 'Final Vocal Tracking',    description: 'Comp from 3+ takes per section; emotional authenticity is priority',  priority: 5, estimated_hours: 4,  is_checkpoint: true  },
    { title: 'Vocal Atmosphere Layer',  description: 'Record ad-libs, effects, and atmospheric vocal textures',             priority: 6, estimated_hours: 2,  is_checkpoint: false },
  ],
  instrumentation: [
    { title: 'Lead Instrument Selection',  description: 'Choose the primary melodic instrument driving the sonic identity',      priority: 1, estimated_hours: 1,  is_checkpoint: false },
    { title: 'Drum Foundation',            description: 'Build kick/snare/hi-hat skeleton anchoring the groove behavior',       priority: 2, estimated_hours: 3,  is_checkpoint: true  },
    { title: 'Bass Architecture',          description: 'Design bass character — sub-bass, mid-bass, or groove-bass approach',  priority: 3, estimated_hours: 2,  is_checkpoint: false },
    { title: 'Ambient Layer Stack',        description: 'Add texture layers: pads, foley, atmosphere at 20–30% volume',        priority: 4, estimated_hours: 2,  is_checkpoint: false },
    { title: 'Organic/Synthetic Balance',  description: 'Calibrate organic vs synthetic ratio per blueprint spec',             priority: 5, estimated_hours: 2,  is_checkpoint: true  },
    { title: 'Percussion Complexity Fill', description: 'Add swing, ghost notes, and percussive complexity as finishing layer', priority: 6, estimated_hours: 2,  is_checkpoint: false },
  ],
  mix: [
    { title: 'Gain Staging Foundation',    description: 'Set all channel levels with 6 dB headroom pre-processing',       priority: 1, estimated_hours: 1,  is_checkpoint: false },
    { title: 'EQ Strategy',               description: 'Surgical cuts before shelves; define frequency real estate per instrument', priority: 2, estimated_hours: 2, is_checkpoint: true },
    { title: 'Compression Architecture',  description: 'Glue compression on drums, parallel compression on bass/vocals',  priority: 3, estimated_hours: 2,  is_checkpoint: false },
    { title: 'Spatial Width Map',         description: 'Pan placement and stereo width per frequency zone',               priority: 4, estimated_hours: 1,  is_checkpoint: false },
    { title: 'Effects Chain Design',      description: 'Reverb/delay sends, saturation, modulation effects placement',    priority: 5, estimated_hours: 2,  is_checkpoint: true  },
    { title: 'Mix Reference Check',       description: 'A/B against commercial reference at matched loudness (LUFS)',     priority: 6, estimated_hours: 1,  is_checkpoint: false },
  ],
  release: [
    { title: 'Release Date Strategy',     description: 'Set drop date — factor seasonality, competition, and promo window', priority: 1, estimated_hours: 2, is_checkpoint: false },
    { title: 'Asset Package Preparation', description: 'Cover art, metadata, ISRC, UPC, lyrics, credits fully complete',   priority: 2, estimated_hours: 4, is_checkpoint: true  },
    { title: 'Distribution Setup',        description: 'Submit to distributor; set store preferences and pre-save page',   priority: 3, estimated_hours: 2, is_checkpoint: false },
    { title: 'Press & Playlist Outreach', description: 'Send to curators, blogs, and playlist editors 4 weeks before drop',priority: 4, estimated_hours: 3, is_checkpoint: false },
    { title: 'Content Calendar Lock',     description: 'Schedule 30 days of content around the release window',           priority: 5, estimated_hours: 3, is_checkpoint: true  },
    { title: 'Release Day Execution',     description: 'Post rollout: social, story, community drop, DSP pitch follow-up', priority: 6, estimated_hours: 2, is_checkpoint: false },
  ],
  performance: [
    { title: 'Performance Arrangement',    description: 'Adapt studio arrangement for live — cut complexity, add energy',  priority: 1, estimated_hours: 3, is_checkpoint: false },
    { title: 'Set Energy Mapping',         description: 'Chart crowd energy arc across full set with strategic peaks',     priority: 2, estimated_hours: 2, is_checkpoint: true  },
    { title: 'Stage Plot & Tech Rider',    description: 'Define technical requirements, monitoring needs, and stage layout',priority: 3, estimated_hours: 2, is_checkpoint: false },
    { title: 'Rehearsal Block',            description: 'Minimum 10-hour rehearsal across 3 sessions with full band/backing',priority: 4, estimated_hours: 10,is_checkpoint: true  },
    { title: 'Crowd Engagement Moments',   description: 'Choreograph call-and-response, crowd sing-along, and breakdown moments',priority: 5, estimated_hours: 2, is_checkpoint: false },
    { title: 'Performance Review',         description: 'Record rehearsal; critique transitions, energy, and delivery',   priority: 6, estimated_hours: 2, is_checkpoint: false },
  ],
};

const TIMELINE_DAYS: Record<ExecutionCategory, number> = {
  arrangement:     14,
  vocal:            7,
  instrumentation: 10,
  mix:              5,
  release:         21,
  performance:     14,
};

const MILESTONE_TEMPLATES: MilestoneTemplate[] = [
  { title: 'Foundation',  description: 'Core elements established and directional decisions locked', offset_fraction: 1/3, criteria: ['First checkpoint tasks completed', 'Direction confirmed'] },
  { title: 'Core Build',  description: 'Main creative work complete; entering refinement phase',     offset_fraction: 2/3, criteria: ['All primary tasks in progress or complete', 'A/B testing done'] },
  { title: 'Completion',  description: 'All tasks done; execution plan fulfilled',                  offset_fraction: 1,   criteria: ['All tasks completed', 'Final review passed', 'Checkpoint score 85+'] },
];

function buildTasks(category: ExecutionCategory): ProductionTask[] {
  return TASK_LIBRARY[category].map((t, i) => ({
    ...t,
    id: `task-${i + 1}`,
    status: 'pending' as const,
  }));
}

function computeCompletionScore(tasks: ProductionTask[]): number {
  if (tasks.length === 0) return 0;
  const completed     = tasks.filter(t => t.status === 'completed').length;
  const checkpointBonus = tasks.filter(t => t.is_checkpoint && t.status === 'completed').length * 5;
  const base = (completed / tasks.length) * 100;
  return parseFloat(Math.min(100, base + checkpointBonus).toFixed(2));
}

export async function createExecutionPlan(
  artistId: string,
  category: ExecutionCategory,
  opts?: { recommendation_id?: string; mission_id?: string; title?: string; objective?: string },
) {
  const tasks        = buildTasks(category);
  const timelineDays = TIMELINE_DAYS[category];

  const [plan] = await db.insert(sonic_execution_plans).values({
    artist_id:         artistId,
    recommendation_id: opts?.recommendation_id ?? null,
    mission_id:        opts?.mission_id ?? null,
    category,
    title:             opts?.title     ?? `${cap(category)} Execution Plan`,
    objective:         opts?.objective ?? TASK_LIBRARY[category][0].description,
    production_tasks:  tasks as unknown as Record<string, unknown>[],
    timeline_days:     timelineDays,
    status:            'pending',
    completion_score:  '0',
    scoring_version:   ENGINE_VERSIONS.SCORING,
    algorithm_version: ENGINE_VERSIONS.ALGORITHM,
  }).returning();

  // Milestone creation
  const milestones = await db.insert(sonic_execution_milestones).values(
    MILESTONE_TEMPLATES.map(m => ({
      plan_id:             plan.id,
      artist_id:           artistId,
      title:               m.title,
      description:         m.description,
      target_day:          Math.round(timelineDays * m.offset_fraction),
      completion_criteria: m.criteria,
      status:              'pending',
    }))
  ).returning();

  // Auto-checkpoint on creation
  await db.insert(sonic_execution_checkpoints).values({
    plan_id:              plan.id,
    checkpoint_type:      'auto',
    data_snapshot:        { tasks_total: tasks.length, tasks_completed: 0 } as Record<string, unknown>,
    score_at_checkpoint:  '0',
    notes:                'Execution plan initialized',
  });

  sonicEventBus.publish('execution.plan.created', {
    artist_id:  artistId,
    plan_id:    plan.id,
    category,
    timeline_days: timelineDays,
  });

  return { plan, milestones };
}

export async function acceptRecommendation(
  artistId: string,
  recommendationId: string,
  category: ExecutionCategory,
) {
  // Mark recommendation accepted
  await db
    .update(sonic_director_recommendations)
    .set({ accepted: true, accepted_at: new Date() })
    .where(and(
      eq(sonic_director_recommendations.id, recommendationId),
      eq(sonic_director_recommendations.artist_id, artistId),
    ));

  // Pull recommendation details for title/objective
  const [rec] = await db
    .select({ title: sonic_director_recommendations.title, description: sonic_director_recommendations.description })
    .from(sonic_director_recommendations)
    .where(eq(sonic_director_recommendations.id, recommendationId))
    .limit(1);

  const result = await createExecutionPlan(artistId, category, {
    recommendation_id: recommendationId,
    title:     rec?.title,
    objective: rec?.description,
  });

  sonicEventBus.publish('recommendation.accepted', {
    artist_id:         artistId,
    recommendation_id: recommendationId,
    plan_id:           result.plan.id,
    category,
  });

  return result;
}

export async function getExecutionPlans(artistId: string) {
  const plans = await db
    .select()
    .from(sonic_execution_plans)
    .where(eq(sonic_execution_plans.artist_id, artistId))
    .orderBy(desc(sonic_execution_plans.created_at));

  const withMilestones = await Promise.all(
    plans.map(async p => {
      const milestones = await db
        .select()
        .from(sonic_execution_milestones)
        .where(eq(sonic_execution_milestones.plan_id, p.id))
        .orderBy(sonic_execution_milestones.target_day);
      return { ...p, milestones };
    })
  );

  return withMilestones;
}

export async function getPlanWithDetails(planId: string) {
  const [plan] = await db
    .select()
    .from(sonic_execution_plans)
    .where(eq(sonic_execution_plans.id, planId))
    .limit(1);
  if (!plan) return null;

  const [milestones, checkpoints] = await Promise.all([
    db.select().from(sonic_execution_milestones).where(eq(sonic_execution_milestones.plan_id, planId)).orderBy(sonic_execution_milestones.target_day),
    db.select().from(sonic_execution_checkpoints).where(eq(sonic_execution_checkpoints.plan_id, planId)).orderBy(desc(sonic_execution_checkpoints.created_at)),
  ]);

  return { plan, milestones, checkpoints };
}

export async function updateTaskStatus(
  planId:   string,
  taskId:   string,
  status:   'pending' | 'in_progress' | 'completed',
) {
  const [plan] = await db
    .select()
    .from(sonic_execution_plans)
    .where(eq(sonic_execution_plans.id, planId))
    .limit(1);
  if (!plan) return null;

  const tasks = (plan.production_tasks as ProductionTask[]) ?? [];
  const updated = tasks.map(t => t.id === taskId ? { ...t, status } : t);
  const score   = computeCompletionScore(updated);
  const allDone = updated.every(t => t.status === 'completed');

  const [result] = await db
    .update(sonic_execution_plans)
    .set({
      production_tasks: updated as unknown as Record<string, unknown>[],
      completion_score: String(score),
      status:           allDone ? 'completed' : plan.status === 'pending' && status === 'in_progress' ? 'in_progress' : plan.status,
      completed_at:     allDone ? new Date() : undefined,
      updated_at:       new Date(),
    })
    .where(eq(sonic_execution_plans.id, planId))
    .returning();

  if (allDone) {
    sonicEventBus.publish('mission.completed', { artist_id: plan.artist_id, plan_id: planId, score });
  }

  return result;
}

export async function completeMilestone(planId: string, milestoneId: string) {
  const [milestone] = await db
    .update(sonic_execution_milestones)
    .set({ status: 'completed', completed_at: new Date() })
    .where(and(
      eq(sonic_execution_milestones.id, milestoneId),
      eq(sonic_execution_milestones.plan_id, planId),
    ))
    .returning();

  if (!milestone) return null;

  // Auto-checkpoint on milestone completion
  const [plan] = await db.select({ artist_id: sonic_execution_plans.artist_id, completion_score: sonic_execution_plans.completion_score }).from(sonic_execution_plans).where(eq(sonic_execution_plans.id, planId)).limit(1);

  await db.insert(sonic_execution_checkpoints).values({
    plan_id:             planId,
    milestone_id:        milestoneId,
    checkpoint_type:     'auto',
    data_snapshot:       { milestone_title: milestone.title } as Record<string, unknown>,
    score_at_checkpoint: plan?.completion_score ?? '0',
    notes:               `Milestone completed: ${milestone.title}`,
  });

  sonicEventBus.publish('execution.milestone.completed', {
    artist_id:    plan?.artist_id,
    plan_id:      planId,
    milestone_id: milestoneId,
    title:        milestone.title,
  });

  return milestone;
}

export async function addCheckpoint(planId: string, notes: string, dataSnapshot?: Record<string, unknown>) {
  const [plan] = await db.select({ completion_score: sonic_execution_plans.completion_score, artist_id: sonic_execution_plans.artist_id }).from(sonic_execution_plans).where(eq(sonic_execution_plans.id, planId)).limit(1);
  if (!plan) return null;

  const [checkpoint] = await db.insert(sonic_execution_checkpoints).values({
    plan_id:             planId,
    checkpoint_type:     'manual',
    data_snapshot:       dataSnapshot ?? null,
    score_at_checkpoint: plan.completion_score,
    notes,
  }).returning();

  sonicEventBus.publish('execution.checkpoint.added', {
    artist_id: plan.artist_id,
    plan_id:   planId,
    notes,
    score:     Number(plan.completion_score),
  });

  return checkpoint;
}

export async function updatePlanStatus(planId: string, status: ExecutionStatus) {
  const [result] = await db
    .update(sonic_execution_plans)
    .set({
      status,
      updated_at:   new Date(),
      completed_at: status === 'completed' ? new Date() : undefined,
    })
    .where(eq(sonic_execution_plans.id, planId))
    .returning();
  return result ?? null;
}

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
