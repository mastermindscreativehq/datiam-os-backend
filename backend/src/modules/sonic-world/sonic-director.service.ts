import { eq } from 'drizzle-orm';
import { db } from '../../db';
import {
  sonic_memory,
  sonic_patterns,
  sonic_artist_profiles,
  sonic_director_recommendations,
} from '../../db/schema';
import type { SonicMemory } from '../../db/schema';

const ALL_EMOTIONS  = ['grief','trauma','rage','joy','melancholy','euphoria','anxiety','longing','triumph','nostalgia','peace','defiance'];
const ALL_INTENTIONS = ['heal_listener','inspire_action','create_nostalgia','deliver_message','uplift_spirit','provoke_thought','celebrate_truth','process_pain'];

type RecommendationType = 'strength' | 'exploration' | 'evolution' | 'commercial' | 'signature';

function avg(nums: number[]): number {
  return nums.length === 0 ? 0 : nums.reduce((a, b) => a + b, 0) / nums.length;
}

function countBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const v of items) {
    const k = key(v);
    result[k] = (result[k] ?? 0) + 1;
  }
  return result;
}

function topKey(obj: Record<string, number>): string | null {
  const entries = Object.entries(obj).sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0] ?? null;
}

function computeCoherenceTrend(memories: SonicMemory[]): { slope: number; variance: number } {
  const scores = memories.slice(-10).map(m => Number(m.coherence_score));
  if (scores.length < 2) return { slope: 0, variance: 0 };
  const n    = scores.length;
  const mean = avg(scores);
  const variance = parseFloat((scores.reduce((s, v) => s + (v - mean) ** 2, 0) / n).toFixed(4));
  const xMean = (n - 1) / 2;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (scores[i] - mean);
    den += (i - xMean) ** 2;
  }
  return { slope: den === 0 ? 0 : parseFloat((num / den).toFixed(4)), variance };
}

function computeConfidence(total: number, hasPatterns: boolean, hasProfile: boolean, variance: number): number {
  const depth    = (Math.min(total, 20) / 20) * 0.35;
  const stability = variance < 0.05 ? 0.10 : variance < 0.15 ? 0.05 : 0;
  return parseFloat(Math.min(0.95, 0.40 + depth + (hasPatterns ? 0.10 : 0) + (hasProfile ? 0.05 : 0) + stability).toFixed(2));
}

function intentionFor(emotion: string): string {
  const map: Record<string, string> = {
    grief: 'process_pain', trauma: 'heal_listener', rage: 'deliver_message',
    joy: 'celebrate_truth', melancholy: 'create_nostalgia', euphoria: 'uplift_spirit',
    anxiety: 'provoke_thought', longing: 'create_nostalgia', triumph: 'inspire_action',
    nostalgia: 'create_nostalgia', peace: 'heal_listener', defiance: 'inspire_action',
  };
  return map[emotion] ?? 'deliver_message';
}

function bpmRangeFor(emotion: string, avgBpm: number): { min: number; max: number; suggest: number } {
  const map: Record<string, [number, number]> = {
    grief: [60, 85], trauma: [65, 90], rage: [130, 165], joy: [100, 130],
    melancholy: [70, 100], euphoria: [120, 150], anxiety: [120, 145], longing: [75, 100],
    triumph: [100, 130], nostalgia: [80, 110], peace: [60, 90], defiance: [110, 145],
  };
  const [min, max] = map[emotion] ?? [Math.max(60, avgBpm - 20), Math.min(170, avgBpm + 20)];
  return { min, max, suggest: Math.round((min + max) / 2) };
}

function keyFor(emotion: string): string {
  const map: Record<string, string> = {
    grief: 'D', trauma: 'C#', rage: 'F', joy: 'C', melancholy: 'E', euphoria: 'G',
    anxiety: 'A', longing: 'B', triumph: 'G', nostalgia: 'F#', peace: 'A', defiance: 'D#',
  };
  return map[emotion] ?? 'C';
}

function scaleFor(emotion: string): string {
  const map: Record<string, string> = {
    grief: 'Minor', trauma: 'Phrygian', rage: 'Blues', joy: 'Major',
    melancholy: 'Minor', euphoria: 'Major', anxiety: 'Dorian', longing: 'Minor',
    triumph: 'Major', nostalgia: 'Pentatonic Minor', peace: 'Major', defiance: 'Dorian',
  };
  return map[emotion] ?? 'Minor';
}

export async function generateDirectorRecommendations(artistId: string) {
  const memories = await db
    .select()
    .from(sonic_memory)
    .where(eq(sonic_memory.artist_id, artistId))
    .orderBy(sonic_memory.ingested_at);

  const [patterns] = await db.select().from(sonic_patterns).where(eq(sonic_patterns.artist_id, artistId)).limit(1);
  const [profile]  = await db.select().from(sonic_artist_profiles).where(eq(sonic_artist_profiles.artist_id, artistId)).limit(1);

  const total = memories.length;
  const { slope: coherenceSlope, variance: coherenceVariance } = computeCoherenceTrend(memories);
  const baseConfidence = computeConfidence(total, !!patterns, !!profile, coherenceVariance);

  const emotionCounts = countBy(memories, m => m.emotion_at_generation);
  const genreCounts   = countBy(memories, m => m.primary_genre);
  const keyCounts     = countBy(memories, m => m.musical_key);
  const scaleCounts   = countBy(memories, m => m.scale);

  const dominantEmotion = topKey(emotionCounts) ?? 'joy';
  const dominantGenre   = topKey(genreCounts)   ?? 'Hip-Hop';
  const dominantKey     = topKey(keyCounts)     ?? 'C';
  const dominantScale   = topKey(scaleCounts)   ?? 'Minor';

  const avgBpm       = Math.round(avg(memories.map(m => m.bpm))) || 95;
  const avgCoherence = parseFloat(avg(memories.map(m => Number(m.coherence_score))).toFixed(3)) || 0.80;
  const avgCommercial = parseFloat(avg(memories.map(m => m.commercial_accessibility)).toFixed(1)) || 50;

  // Best emotion+genre combo by coherence
  const comboMap: Record<string, number[]> = {};
  for (const m of memories) {
    const k = `${m.emotion_at_generation}|${m.primary_genre}`;
    (comboMap[k] = comboMap[k] ?? []).push(Number(m.coherence_score));
  }
  const bestCombo = Object.entries(comboMap)
    .map(([k, scores]) => ({ combo: k, avg: avg(scores), count: scores.length }))
    .sort((a, b) => b.avg - a.avg)[0] ?? { combo: `${dominantEmotion}|${dominantGenre}`, avg: avgCoherence, count: total };
  const [bestEmotion, bestGenre] = bestCombo.combo.split('|');

  // Least-explored emotion
  const leastUsed = ALL_EMOTIONS
    .map(e => ({ e, count: emotionCounts[e] ?? 0 }))
    .sort((a, b) => a.count - b.count)[0]?.e ?? 'triumph';

  const evolutionStage = profile?.evolution_stage ?? 'emerging';

  // ── Build all 5 recommendations ───────────────────────────────────────────

  type Rec = {
    recommendation_type: RecommendationType;
    title: string; description: string; rationale: string;
    confidence_score: string; priority_rank: number;
    target_emotion: string | null; target_bpm_min: number | null; target_bpm_max: number | null;
    target_key: string | null; target_scale: string | null; target_genre: string | null;
    direction_parameters: Record<string, unknown>;
    based_on_count: number;
    rl_metadata: Record<string, unknown>;
  };

  const rlBase = { algorithm: 'heuristic-v1', context_window: total, coherence_slope: coherenceSlope, reward_signal: null };
  const recs: Rec[] = [];

  // 1. Lean Into Strength
  const sRange = bpmRangeFor(bestEmotion, avgBpm);
  recs.push({
    recommendation_type: 'strength',
    title: `Double Down: ${cap(bestEmotion)} ${bestGenre}`,
    description: `Your strongest coherence comes from ${cap(bestEmotion)} ${bestGenre} blueprints. Push deeper into this territory with elevated production density.`,
    rationale: `Avg coherence ${bestCombo.avg.toFixed(2)} across ${bestCombo.count} blueprint${bestCombo.count !== 1 ? 's' : ''} in this zone — your most consistent creative territory.`,
    confidence_score: String(Math.min(0.95, baseConfidence + 0.05).toFixed(2)),
    priority_rank: 1,
    target_emotion: bestEmotion, target_bpm_min: sRange.min, target_bpm_max: sRange.max,
    target_key: dominantKey, target_scale: scaleFor(bestEmotion), target_genre: bestGenre,
    direction_parameters: {
      suggested_emotion: bestEmotion, suggested_intention: intentionFor(bestEmotion),
      suggested_bpm: sRange.suggest, suggested_key: dominantKey, suggested_scale: scaleFor(bestEmotion),
      suggested_genre: bestGenre, notes: 'Push production density 10–15 pts above your average',
    },
    based_on_count: total,
    rl_metadata: rlBase,
  });

  // 2. Unlock New Territory
  const xRange = bpmRangeFor(leastUsed, avgBpm);
  recs.push({
    recommendation_type: 'exploration',
    title: `Unlock: ${cap(leastUsed)} Territory`,
    description: `You've ${emotionCounts[leastUsed] ? 'rarely' : 'never'} explored ${leastUsed}. This whitespace can open new audience segments and deepen your creative range.`,
    rationale: `Only ${emotionCounts[leastUsed] ?? 0}/${total} blueprints in ${leastUsed} mode — significant unexplored emotional territory.`,
    confidence_score: String(Math.max(0.40, baseConfidence - 0.15).toFixed(2)),
    priority_rank: 2,
    target_emotion: leastUsed, target_bpm_min: xRange.min, target_bpm_max: xRange.max,
    target_key: keyFor(leastUsed), target_scale: scaleFor(leastUsed), target_genre: dominantGenre,
    direction_parameters: {
      suggested_emotion: leastUsed, suggested_intention: intentionFor(leastUsed),
      suggested_bpm: xRange.suggest, suggested_key: keyFor(leastUsed), suggested_scale: scaleFor(leastUsed),
      suggested_genre: dominantGenre, notes: `Pair with your dominant ${dominantGenre} sound to ease into new emotional territory`,
    },
    based_on_count: total,
    rl_metadata: { ...rlBase, least_used_emotion: leastUsed },
  });

  // 3. Evolution Leap
  const { evTitle, evDesc, evNotes, evEmotion, evRange } = buildEvolutionRec(evolutionStage, dominantEmotion, leastUsed, avgBpm, dominantGenre);
  recs.push({
    recommendation_type: 'evolution',
    title: evTitle,
    description: evDesc,
    rationale: `Stage: ${evolutionStage}. Coherence trend: ${coherenceSlope > 0.002 ? 'improving ↑' : coherenceSlope < -0.002 ? 'declining ↓' : 'stable →'} (slope ${coherenceSlope.toFixed(3)})`,
    confidence_score: String(baseConfidence.toFixed(2)),
    priority_rank: 3,
    target_emotion: evEmotion, target_bpm_min: evRange.min, target_bpm_max: evRange.max,
    target_key: keyFor(evEmotion), target_scale: scaleFor(evEmotion), target_genre: dominantGenre,
    direction_parameters: {
      suggested_emotion: evEmotion, suggested_intention: intentionFor(evEmotion),
      suggested_bpm: evRange.suggest, suggested_key: keyFor(evEmotion), suggested_scale: scaleFor(evEmotion),
      suggested_genre: dominantGenre, notes: evNotes,
    },
    based_on_count: total,
    rl_metadata: { ...rlBase, evolution_stage: evolutionStage },
  });

  // 4. Commercial Peak
  const commEmotion = (['joy','triumph','euphoria','nostalgia'] as const).find(e => (emotionCounts[e] ?? 0) > 0) ?? 'joy';
  recs.push({
    recommendation_type: 'commercial',
    title: `Commercial Peak: ${cap(commEmotion)} Anthem`,
    description: `Maximize commercial potential by hitting the sweet spot of accessibility, replay value, and crowd resonance.`,
    rationale: `Your avg commercial accessibility is ${avgCommercial.toFixed(0)}/100. This direction targets the 75–90 range while keeping artistic integrity.`,
    confidence_score: String(Math.min(0.90, baseConfidence + 0.08).toFixed(2)),
    priority_rank: 4,
    target_emotion: commEmotion, target_bpm_min: 100, target_bpm_max: 128,
    target_key: 'G', target_scale: 'Major', target_genre: dominantGenre,
    direction_parameters: {
      suggested_emotion: commEmotion, suggested_intention: 'inspire_action',
      suggested_bpm: 114, suggested_key: 'G', suggested_scale: 'Major',
      suggested_genre: dominantGenre, target_commercial_accessibility: 82,
      notes: 'Focus on hook intensity and anthem potential. Target underground_vs_mainstream 65–80.',
    },
    based_on_count: total,
    rl_metadata: { ...rlBase, avg_commercial: avgCommercial },
  });

  // 5. Signature Anchor
  const sigPct = ((emotionCounts[dominantEmotion] ?? 0) / Math.max(total, 1) * 100).toFixed(0);
  recs.push({
    recommendation_type: 'signature',
    title: `Signature Anchor: ${cap(dominantEmotion)} ${dominantGenre}`,
    description: `Return to your most authentic core — ${cap(dominantEmotion)} ${dominantGenre} in ${dominantKey} ${dominantScale} at ${avgBpm} BPM.`,
    rationale: `${sigPct}% of your ${total} blueprints converge on this identity. Avg coherence ${avgCoherence.toFixed(2)} — you know this space intimately.`,
    confidence_score: String(Math.min(0.95, baseConfidence + 0.10).toFixed(2)),
    priority_rank: 5,
    target_emotion: dominantEmotion, target_bpm_min: Math.max(40, avgBpm - 10), target_bpm_max: Math.min(200, avgBpm + 10),
    target_key: dominantKey, target_scale: dominantScale, target_genre: dominantGenre,
    direction_parameters: {
      suggested_emotion: dominantEmotion, suggested_intention: intentionFor(dominantEmotion),
      suggested_bpm: avgBpm, suggested_key: dominantKey, suggested_scale: dominantScale,
      suggested_genre: dominantGenre, notes: 'Create with maximal confidence — you own this territory.',
    },
    based_on_count: total,
    rl_metadata: { ...rlBase, avg_coherence: avgCoherence },
  });

  // ── Persist (delete-and-reinsert for clean regeneration) ─────────────────
  await db.delete(sonic_director_recommendations).where(eq(sonic_director_recommendations.artist_id, artistId));
  const saved = await db.insert(sonic_director_recommendations).values(
    recs.map(r => ({ artist_id: artistId, ...r }))
  ).returning();

  return {
    recommendations: saved.sort((a, b) => a.priority_rank - b.priority_rank),
    meta: {
      total_blueprints_analyzed: total,
      dominant_emotion: dominantEmotion,
      dominant_genre: dominantGenre,
      dominant_key: dominantKey,
      dominant_scale: dominantScale,
      avg_bpm: avgBpm,
      avg_coherence: avgCoherence,
      coherence_trend: coherenceSlope > 0.002 ? 'improving' : coherenceSlope < -0.002 ? 'declining' : 'stable',
      evolution_stage: evolutionStage,
      base_confidence: baseConfidence,
    },
  };
}

export async function getDirectorRecommendations(artistId: string) {
  return db
    .select()
    .from(sonic_director_recommendations)
    .where(eq(sonic_director_recommendations.artist_id, artistId))
    .orderBy(sonic_director_recommendations.priority_rank);
}

export async function getEvolutionMap(artistId: string) {
  const rows = await db
    .select({
      blueprint_id:             sonic_memory.blueprint_id,
      ingested_at:              sonic_memory.ingested_at,
      emotion:                  sonic_memory.emotion_at_generation,
      intention:                sonic_memory.intention_at_generation,
      bpm:                      sonic_memory.bpm,
      musical_key:              sonic_memory.musical_key,
      scale:                    sonic_memory.scale,
      primary_genre:            sonic_memory.primary_genre,
      commercial_accessibility: sonic_memory.commercial_accessibility,
      emotional_rawness:        sonic_memory.emotional_rawness,
      spiritual_intensity:      sonic_memory.spiritual_intensity,
      cinematic_density:        sonic_memory.cinematic_density,
      coherence_score:          sonic_memory.coherence_score,
      replayability_score:      sonic_memory.replayability_score,
    })
    .from(sonic_memory)
    .where(eq(sonic_memory.artist_id, artistId))
    .orderBy(sonic_memory.ingested_at);

  if (rows.length === 0) return { timeline: [], genre_clusters: [], emotional_territory: [], evolution_stages: [] };

  const timeline = rows.map((r, i) => ({
    position: i + 1,
    date: r.ingested_at,
    blueprint_id: r.blueprint_id,
    emotion: r.emotion,
    genre: r.primary_genre,
    bpm: r.bpm,
    key: `${r.musical_key} ${r.scale}`,
    coherence: Number(r.coherence_score),
    commercial: r.commercial_accessibility,
    emotional: r.emotional_rawness,
    spiritual: r.spiritual_intensity,
    cinematic: r.cinematic_density,
    replayability: Number(r.replayability_score),
  }));

  // Genre clusters (group sequential runs of the same genre)
  const genre_clusters: { genre: string; count: number; avg_coherence: number; start_idx: number; end_idx: number }[] = [];
  let runGenre = rows[0].primary_genre;
  let runStart = 0;
  let runScores: number[] = [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].primary_genre === runGenre) {
      runScores.push(Number(rows[i].coherence_score));
    } else {
      genre_clusters.push({ genre: runGenre, count: i - runStart, avg_coherence: parseFloat(avg(runScores).toFixed(3)), start_idx: runStart + 1, end_idx: i });
      runGenre = rows[i].primary_genre; runStart = i; runScores = [Number(rows[i].coherence_score)];
    }
  }
  genre_clusters.push({ genre: runGenre, count: rows.length - runStart, avg_coherence: parseFloat(avg(runScores).toFixed(3)), start_idx: runStart + 1, end_idx: rows.length });

  // Emotional territory map
  const emap: Record<string, { count: number; sum_commercial: number; sum_coherence: number; first: number; last: number }> = {};
  for (let i = 0; i < rows.length; i++) {
    const e = rows[i].emotion;
    if (!emap[e]) emap[e] = { count: 0, sum_commercial: 0, sum_coherence: 0, first: i + 1, last: i + 1 };
    emap[e].count++;
    emap[e].sum_commercial += rows[i].commercial_accessibility;
    emap[e].sum_coherence  += Number(rows[i].coherence_score);
    emap[e].last = i + 1;
  }
  const emotional_territory = Object.entries(emap).map(([emotion, d]) => ({
    emotion,
    count: d.count,
    avg_commercial: parseFloat((d.sum_commercial / d.count).toFixed(1)),
    avg_coherence:  parseFloat((d.sum_coherence  / d.count).toFixed(3)),
    first_seen: d.first,
    last_seen:  d.last,
  })).sort((a, b) => b.count - a.count);

  // Evolution stages
  const STAGES = [
    { label: 'Emerging', min: 0, max: 4 },
    { label: 'Developing', min: 5, max: 19 },
    { label: 'Defined', min: 20, max: 49 },
    { label: 'Mature', min: 50, max: Infinity },
  ];
  const evolution_stages = STAGES
    .filter(s => rows.length > s.min)
    .map(s => {
      const slice = rows.slice(s.min, Math.min(s.max + 1, rows.length));
      if (slice.length === 0) return null;
      const domEmotion = topKey(countBy(slice, r => r.emotion)) ?? 'unknown';
      const domGenre   = topKey(countBy(slice, r => r.primary_genre)) ?? 'unknown';
      return {
        label: s.label,
        start_idx: s.min + 1, end_idx: Math.min(s.max + 1, rows.length),
        count: slice.length,
        avg_coherence:  parseFloat(avg(slice.map(r => Number(r.coherence_score))).toFixed(3)),
        avg_commercial: parseFloat(avg(slice.map(r => r.commercial_accessibility)).toFixed(1)),
        dominant_emotion: domEmotion,
        dominant_genre:   domGenre,
      };
    })
    .filter(Boolean);

  return { timeline, genre_clusters, emotional_territory, evolution_stages };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

function buildEvolutionRec(
  stage: string,
  dominant: string,
  leastUsed: string,
  avgBpm: number,
  dominantGenre: string,
) {
  if (stage === 'emerging') {
    const evEmotion = ['triumph','joy','euphoria'].find(e => e !== dominant) ?? 'triumph';
    return {
      evTitle: 'Breakthrough Sound — Emerging → Developing',
      evDesc: 'Blend emotional depth with commercially accessible production to cross into the developing stage.',
      evNotes: 'Target commercial_accessibility 60–75. Maintain emotional integrity.',
      evEmotion,
      evRange: { min: 100, max: 130, suggest: 115 },
    };
  }
  if (stage === 'developing') {
    return {
      evTitle: 'Define Your Signature — Developing → Defined',
      evDesc: 'Stop exploring; start crystallizing. Build 3–5 blueprints that are the most distilled version of your sound.',
      evNotes: 'Target coherence_score 0.92+. Reduce variation, increase precision.',
      evEmotion: dominant,
      evRange: { min: Math.max(60, avgBpm - 5), max: Math.min(180, avgBpm + 5), suggest: avgBpm },
    };
  }
  if (stage === 'defined') {
    const evEmotion = ['longing','nostalgia','melancholy'].find(e => e !== dominant) ?? 'nostalgia';
    return {
      evTitle: 'Genre Innovation — Defined → Mature',
      evDesc: "Your sound is defined — now evolve it by fusing genres you've never combined and expanding your emotional vocabulary.",
      evNotes: `Try genre fusions: ${dominantGenre} + jazz, classical, or electronic elements`,
      evEmotion,
      evRange: { min: Math.max(60, avgBpm - 20), max: Math.min(180, avgBpm + 20), suggest: avgBpm },
    };
  }
  return {
    evTitle: 'Legacy Statement — Mature Reinvention',
    evDesc: 'At the mature stage, build a definitive artistic statement pushing into your least-explored emotional territories.',
    evNotes: 'Create an intentional artistic arc across 5+ blueprints as a cohesive body of work.',
    evEmotion: leastUsed,
    evRange: { min: 60, max: 140, suggest: avgBpm },
  };
}
