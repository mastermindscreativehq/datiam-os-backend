import { eq, desc } from 'drizzle-orm';
import { db } from '../../db';
import { sonic_memory, sonic_world_blueprints } from '../../db/schema';

interface BpmBucketStat { label: string; min: number; max: number; count: number; pct: number }

const BPM_BUCKET_DEFS = [
  { label: '40–70',  min: 40,  max: 70  },
  { label: '70–90',  min: 70,  max: 90  },
  { label: '90–110', min: 90,  max: 110 },
  { label: '110–130', min: 110, max: 130 },
  { label: '130–150', min: 130, max: 150 },
  { label: '150+',   min: 150, max: 301  },
];

function countBy<T>(items: T[], key: (item: T) => string): { value: string; count: number; pct: number }[] {
  const map: Record<string, number> = {};
  for (const item of items) {
    const k = key(item);
    map[k] = (map[k] ?? 0) + 1;
  }
  const total = items.length || 1;
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([value, count]) => ({ value, count, pct: parseFloat(((count / total) * 100).toFixed(1)) }));
}

export async function getAnalyticsDashboard(artistId: string) {
  const memories = await db
    .select()
    .from(sonic_memory)
    .where(eq(sonic_memory.artist_id, artistId))
    .orderBy(desc(sonic_memory.ingested_at));

  const blueprints = await db
    .select({
      id:               sonic_world_blueprints.id,
      repair_count:     sonic_world_blueprints.repair_count,
      fallback_used:    sonic_world_blueprints.fallback_used,
      generation_quality: sonic_world_blueprints.generation_quality,
      created_at:       sonic_world_blueprints.created_at,
    })
    .from(sonic_world_blueprints)
    .where(eq(sonic_world_blueprints.artist_id, artistId))
    .orderBy(desc(sonic_world_blueprints.created_at));

  const total = memories.length;
  if (total === 0) {
    return {
      total_blueprints: 0,
      genre_distribution: [], emotion_distribution: [], bpm_heatmap: [],
      coherence_avg: 0, coherence_trend: [], quality_breakdown: {},
      repair_frequency: { repaired_pct: 0, clean_pct: 100, avg_repairs: 0 },
      fallback_frequency: { fallback_pct: 0, clean_pct: 100 },
    };
  }

  // Genre distribution
  const genre_distribution = countBy(memories, m => m.primary_genre);

  // Emotion distribution
  const emotion_distribution = countBy(memories, m => m.emotion_at_generation);

  // BPM heatmap
  const bpm_heatmap: BpmBucketStat[] = BPM_BUCKET_DEFS.map(b => {
    const count = memories.filter(m => m.bpm >= b.min && m.bpm < b.max).length;
    return { ...b, count, pct: parseFloat(((count / total) * 100).toFixed(1)) };
  });

  // Coherence average
  const coherence_avg = parseFloat(
    (memories.reduce((s, m) => s + Number(m.coherence_score), 0) / total).toFixed(3),
  );

  // Coherence trend (last 20 entries, chronological)
  const last20 = [...memories].sort((a, b) => new Date(a.ingested_at).getTime() - new Date(b.ingested_at).getTime()).slice(-20);
  const coherence_trend = last20.map((m, i) => ({
    position: i + 1,
    coherence: Number(m.coherence_score),
    commercial: m.commercial_accessibility,
    spiritual: m.spiritual_intensity,
    bpm: m.bpm,
    date: m.ingested_at,
  }));

  // Quality breakdown
  const quality_breakdown: Record<string, number> = { excellent: 0, good: 0, fair: 0, poor: 0 };
  for (const m of memories) {
    const q = m.generation_quality as string;
    quality_breakdown[q] = (quality_breakdown[q] ?? 0) + 1;
  }

  // Repair / fallback frequency
  const repaired = blueprints.filter(b => b.repair_count > 0);
  const withFallback = blueprints.filter(b => b.fallback_used);
  const totalBp = blueprints.length || 1;
  const avgRepairs = repaired.length > 0
    ? parseFloat((repaired.reduce((s, b) => s + b.repair_count, 0) / repaired.length).toFixed(2))
    : 0;

  return {
    total_blueprints:   total,
    genre_distribution,
    emotion_distribution,
    bpm_heatmap,
    coherence_avg,
    coherence_trend,
    quality_breakdown,
    repair_frequency: {
      repaired_pct: parseFloat(((repaired.length / totalBp) * 100).toFixed(1)),
      clean_pct:    parseFloat((((totalBp - repaired.length) / totalBp) * 100).toFixed(1)),
      avg_repairs:  avgRepairs,
    },
    fallback_frequency: {
      fallback_pct: parseFloat(((withFallback.length / totalBp) * 100).toFixed(1)),
      clean_pct:    parseFloat((((totalBp - withFallback.length) / totalBp) * 100).toFixed(1)),
    },
  };
}

export async function getEvolutionTimeline(artistId: string) {
  const rows = await db
    .select({
      blueprint_id:              sonic_memory.blueprint_id,
      emotion:                   sonic_memory.emotion_at_generation,
      intention:                 sonic_memory.intention_at_generation,
      primary_genre:             sonic_memory.primary_genre,
      bpm:                       sonic_memory.bpm,
      musical_key:               sonic_memory.musical_key,
      scale:                     sonic_memory.scale,
      coherence_score:           sonic_memory.coherence_score,
      commercial_accessibility:  sonic_memory.commercial_accessibility,
      spiritual_intensity:       sonic_memory.spiritual_intensity,
      emotional_rawness:         sonic_memory.emotional_rawness,
      emotional_intensity_score: sonic_memory.emotional_intensity_score,
      commercial_potential_score: sonic_memory.commercial_potential_score,
      replayability_score:       sonic_memory.replayability_score,
      ingested_at:               sonic_memory.ingested_at,
    })
    .from(sonic_memory)
    .where(eq(sonic_memory.artist_id, artistId))
    .orderBy(sonic_memory.ingested_at);

  return rows.map((r, i) => {
    const prev = rows[i - 1];
    return {
      position:           i + 1,
      blueprint_id:       r.blueprint_id,
      date:               r.ingested_at,
      emotion:            r.emotion,
      intention:          r.intention,
      genre:              r.primary_genre,
      bpm:                r.bpm,
      key:                `${r.musical_key} ${r.scale}`,
      coherence:          Number(r.coherence_score),
      commercial:         r.commercial_accessibility,
      spiritual:          r.spiritual_intensity,
      emotional:          r.emotional_rawness,
      replayability:      Number(r.replayability_score),
      bpm_delta:          prev ? r.bpm - prev.bpm : 0,
      coherence_delta:    prev ? parseFloat((Number(r.coherence_score) - Number(prev.coherence_score)).toFixed(3)) : 0,
      commercial_delta:   prev ? r.commercial_accessibility - prev.commercial_accessibility : 0,
    };
  });
}
