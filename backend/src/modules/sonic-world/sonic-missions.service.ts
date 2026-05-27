import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../db';
import { sonic_memory, sonic_missions } from '../../db/schema';

export type MissionType = 'commercial_growth' | 'emotional_intensity' | 'replayability' | 'live_performance' | 'sync_optimization';

interface MissionConfig { title: string; description: string; target_score: number }

const MISSION_CONFIGS: Record<MissionType, MissionConfig> = {
  commercial_growth: {
    title: 'Commercial Growth Mission',
    description: 'Elevate your commercial accessibility score to 75+. Focus on hook intensity, mainstream BPM ranges, and anthemic potential.',
    target_score: 75,
  },
  emotional_intensity: {
    title: 'Emotional Intensity Mission',
    description: 'Push your emotional rawness to 80+. Create blueprints that cut deeper — more vulnerability, higher stakes, rawer textures.',
    target_score: 80,
  },
  replayability: {
    title: 'Replayability Optimization Mission',
    description: 'Build sonic addictiveness into every blueprint. Target replayability 70+ through memorable hooks, commercial appeal, and high coherence.',
    target_score: 70,
  },
  live_performance: {
    title: 'Live Performance Mission',
    description: 'Craft blueprints built for the stage. Focus on crowd energy, anthem potential, and physical engagement.',
    target_score: 70,
  },
  sync_optimization: {
    title: 'Sync Licensing Mission',
    description: 'Position your sound for TV, film, and brand placements. Target high cinematic density combined with commercial accessibility.',
    target_score: 72,
  },
};

type MemoryRow = {
  commercial_accessibility: number;
  emotional_rawness: number;
  replayability_score: unknown;
  cinematic_density: number;
  spiritual_intensity: number;
  underground_vs_mainstream: number;
  darkness_vs_hope: number;
  coherence_score: unknown;
};

function computeMissionScore(memories: MemoryRow[], missionType: MissionType): number {
  if (memories.length === 0) return 0;
  const n = memories.length;

  switch (missionType) {
    case 'commercial_growth':
      return parseFloat((memories.reduce((s, m) => s + m.commercial_accessibility, 0) / n).toFixed(2));

    case 'emotional_intensity':
      return parseFloat((memories.reduce((s, m) => s + m.emotional_rawness, 0) / n).toFixed(2));

    case 'replayability':
      return parseFloat((memories.reduce((s, m) => s + Number(m.replayability_score) * 100, 0) / n).toFixed(2));

    case 'live_performance': {
      const total = memories.reduce((s, m) =>
        s + m.commercial_accessibility * 0.30
          + (100 - m.underground_vs_mainstream) * 0.30
          + m.emotional_rawness * 0.20
          + m.cinematic_density * 0.20,
        0,
      );
      return parseFloat((total / n).toFixed(2));
    }

    case 'sync_optimization': {
      const total = memories.reduce((s, m) =>
        s + m.cinematic_density * 0.40
          + m.commercial_accessibility * 0.30
          + (100 - m.darkness_vs_hope) * 0.20
          + Number(m.coherence_score) * 100 * 0.10,
        0,
      );
      return parseFloat((total / n).toFixed(2));
    }
  }
}

export async function activateMission(artistId: string, missionType: MissionType) {
  const [existing] = await db
    .select()
    .from(sonic_missions)
    .where(and(
      eq(sonic_missions.artist_id, artistId),
      eq(sonic_missions.mission_type, missionType),
      eq(sonic_missions.status, 'active'),
    ))
    .limit(1);
  if (existing) return existing;

  const memories = await db
    .select({
      commercial_accessibility:  sonic_memory.commercial_accessibility,
      emotional_rawness:         sonic_memory.emotional_rawness,
      replayability_score:       sonic_memory.replayability_score,
      cinematic_density:         sonic_memory.cinematic_density,
      spiritual_intensity:       sonic_memory.spiritual_intensity,
      underground_vs_mainstream: sonic_memory.underground_vs_mainstream,
      darkness_vs_hope:          sonic_memory.darkness_vs_hope,
      coherence_score:           sonic_memory.coherence_score,
    })
    .from(sonic_memory)
    .where(eq(sonic_memory.artist_id, artistId));

  const config     = MISSION_CONFIGS[missionType];
  const startScore = computeMissionScore(memories, missionType);
  const initPct    = parseFloat(Math.min(100, (startScore / config.target_score) * 100).toFixed(2));

  const [mission] = await db.insert(sonic_missions).values({
    artist_id:               artistId,
    mission_type:            missionType,
    title:                   config.title,
    description:             config.description,
    status:                  'active',
    start_score:             String(startScore),
    current_score:           String(startScore),
    target_score:            String(config.target_score),
    progress_percentage:     String(initPct),
    blueprint_count_at_start: memories.length,
    mission_parameters:      config as unknown as Record<string, unknown>,
  }).returning();

  return mission;
}

export async function getMissions(artistId: string) {
  return db
    .select()
    .from(sonic_missions)
    .where(eq(sonic_missions.artist_id, artistId))
    .orderBy(desc(sonic_missions.created_at));
}

export async function updateMissionProgress(artistId: string) {
  const active = await db
    .select()
    .from(sonic_missions)
    .where(and(eq(sonic_missions.artist_id, artistId), eq(sonic_missions.status, 'active')));
  if (active.length === 0) return [];

  const memories = await db
    .select({
      commercial_accessibility:  sonic_memory.commercial_accessibility,
      emotional_rawness:         sonic_memory.emotional_rawness,
      replayability_score:       sonic_memory.replayability_score,
      cinematic_density:         sonic_memory.cinematic_density,
      spiritual_intensity:       sonic_memory.spiritual_intensity,
      underground_vs_mainstream: sonic_memory.underground_vs_mainstream,
      darkness_vs_hope:          sonic_memory.darkness_vs_hope,
      coherence_score:           sonic_memory.coherence_score,
    })
    .from(sonic_memory)
    .where(eq(sonic_memory.artist_id, artistId));

  const updated = [];
  for (const mission of active) {
    const current     = computeMissionScore(memories, mission.mission_type as MissionType);
    const target      = Number(mission.target_score);
    const start       = Number(mission.start_score);
    const range       = target - start;
    const progress    = range <= 0 ? 100 : parseFloat(Math.min(100, Math.max(0, ((current - start) / range) * 100)).toFixed(2));
    const isComplete  = current >= target;

    const [u] = await db
      .update(sonic_missions)
      .set({
        current_score:       String(parseFloat(current.toFixed(2))),
        progress_percentage: String(progress),
        status:              isComplete ? 'completed' : 'active',
        completed_at:        isComplete ? new Date() : undefined,
        updated_at:          new Date(),
      })
      .where(eq(sonic_missions.id, mission.id))
      .returning();
    updated.push(u);
  }
  return updated;
}

export async function abandonMission(missionId: string) {
  const [m] = await db
    .update(sonic_missions)
    .set({ status: 'abandoned', updated_at: new Date() })
    .where(eq(sonic_missions.id, missionId))
    .returning();
  return m ?? null;
}
