import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { sonic_memory, sonic_gap_analysis, sonic_world_blueprints } from '../../db/schema';

const ALL_EMOTIONS = ['grief','trauma','rage','joy','melancholy','euphoria','anxiety','longing','triumph','nostalgia','peace','defiance'];
const ALL_KEYS     = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const ALL_SCALES   = ['Major','Minor','Dorian','Phrygian','Lydian','Mixolydian','Locrian','Pentatonic Minor','Pentatonic Major','Blues','Chromatic'];

const BPM_BUCKETS = [
  { label: '40–70 Downtempo',   min: 40,  max: 70  },
  { label: '70–90 Slow',        min: 70,  max: 90  },
  { label: '90–110 Mid',        min: 90,  max: 110 },
  { label: '110–130 Upbeat',    min: 110, max: 130 },
  { label: '130–150 Energetic', min: 130, max: 150 },
  { label: '150+ Fast',         min: 150, max: 301 },
];

export async function runGapAnalysis(artistId: string) {
  const rows = await db
    .select({
      bpm:                     sonic_memory.bpm,
      musical_key:             sonic_memory.musical_key,
      scale:                   sonic_memory.scale,
      emotion:                 sonic_memory.emotion_at_generation,
      visual_sonic_atmosphere: sonic_world_blueprints.visual_sonic_atmosphere,
    })
    .from(sonic_memory)
    .innerJoin(sonic_world_blueprints, eq(sonic_memory.blueprint_id, sonic_world_blueprints.id))
    .where(eq(sonic_memory.artist_id, artistId));

  const total = rows.length;

  // ── Underexplored Emotions ────────────────────────────────────────────────
  const emotionCounts: Record<string, number> = {};
  for (const r of rows) emotionCounts[r.emotion] = (emotionCounts[r.emotion] ?? 0) + 1;

  const underexplored_emotions = ALL_EMOTIONS.map(emotion => {
    const count = emotionCounts[emotion] ?? 0;
    const pct   = total > 0 ? parseFloat(((count / total) * 100).toFixed(1)) : 0;
    return {
      emotion, count, pct,
      severity: count === 0 ? 'unexplored' : pct < 5 ? 'underexplored' : pct < 10 ? 'sparse' : 'explored',
      recommendation: count === 0
        ? 'Never explored — highly recommended for creative expansion'
        : pct < 5 ? 'Rarely explored — consider 2–3 blueprints in this zone'
        : 'Lightly explored — good foundation, room to deepen',
    };
  }).sort((a, b) => a.pct - b.pct);

  // ── Overused BPM Ranges ───────────────────────────────────────────────────
  const overused_bpm_ranges = BPM_BUCKETS.map(bucket => {
    const count = rows.filter(r => r.bpm >= bucket.min && r.bpm < bucket.max).length;
    const pct   = total > 0 ? parseFloat(((count / total) * 100).toFixed(1)) : 0;
    return {
      ...bucket, count, pct,
      severity: pct > 60 ? 'overused' : pct > 40 ? 'dominant' : pct > 20 ? 'moderate' : 'underused',
      recommendation: pct > 60
        ? 'Heavily concentrated — expand into other BPM ranges for variety'
        : pct > 40 ? 'Dominant range — consider balancing with adjacent BPM zones'
        : count === 0 ? 'Completely unexplored — experiment with this energy level'
        : 'Well-balanced',
    };
  });

  // ── Repetitive Atmospheres ────────────────────────────────────────────────
  const wordCounts: Record<string, number> = {};
  for (const r of rows) {
    const words = r.visual_sonic_atmosphere.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    for (const w of words) wordCounts[w] = (wordCounts[w] ?? 0) + 1;
  }
  const repetitive_atmospheres = Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([keyword, count]) => {
      const pct = total > 0 ? parseFloat(((count / total) * 100).toFixed(1)) : 0;
      return {
        keyword, count, pct,
        severity: pct > 60 ? 'overused' : pct > 40 ? 'dominant' : 'moderate',
        recommendation: pct > 50
          ? `'${keyword}' in ${pct}% of blueprints — try contrasting atmospheres`
          : 'Healthy usage',
      };
    });

  // ── Harmonic Stagnation ───────────────────────────────────────────────────
  const keyCounts: Record<string, number>   = {};
  const scaleCounts: Record<string, number> = {};
  for (const r of rows) {
    keyCounts[r.musical_key] = (keyCounts[r.musical_key] ?? 0) + 1;
    scaleCounts[r.scale]     = (scaleCounts[r.scale] ?? 0) + 1;
  }
  const [topKeyEntry]   = Object.entries(keyCounts).sort((a, b) => b[1] - a[1]);
  const [topScaleEntry] = Object.entries(scaleCounts).sort((a, b) => b[1] - a[1]);
  const domKeyPct   = topKeyEntry   ? parseFloat(((topKeyEntry[1] / Math.max(total, 1)) * 100).toFixed(1)) : 0;
  const domScalePct = topScaleEntry ? parseFloat(((topScaleEntry[1] / Math.max(total, 1)) * 100).toFixed(1)) : 0;
  const unusedKeys  = ALL_KEYS.filter(k => !keyCounts[k]);
  const unusedScales = ALL_SCALES.filter(s => !scaleCounts[s]);
  const keyDiversity = parseFloat((Object.keys(keyCounts).length / ALL_KEYS.length * 100).toFixed(1));

  const harmonic_stagnation = {
    dominant_key:        topKeyEntry?.[0] ?? 'N/A',
    dominant_key_pct:    domKeyPct,
    dominant_scale:      topScaleEntry?.[0] ?? 'N/A',
    dominant_scale_pct:  domScalePct,
    keys_used:           Object.keys(keyCounts).length,
    keys_available:      ALL_KEYS.length,
    key_diversity_score: keyDiversity,
    unused_keys:         unusedKeys,
    unused_scales:       unusedScales,
    stagnation_level:    domKeyPct > 60 ? 'high' : domKeyPct > 40 ? 'moderate' : 'healthy',
    recommendation:      domKeyPct > 60
      ? `${domKeyPct}% in ${topKeyEntry?.[0]} — try ${unusedKeys.slice(0, 3).join(', ')} for harmonic freshness`
      : `Good harmonic diversity — ${Object.keys(keyCounts).length} keys explored`,
  };

  // ── Gap Score (0–100) ─────────────────────────────────────────────────────
  const unexploredCount = ALL_EMOTIONS.filter(e => !emotionCounts[e]).length;
  const emotionGapPts   = total > 0 ? (unexploredCount / ALL_EMOTIONS.length) * 30 : 30;

  const maxBpmPct    = total > 0 ? Math.max(...BPM_BUCKETS.map(b => (rows.filter(r => r.bpm >= b.min && r.bpm < b.max).length / total) * 100)) : 0;
  const bpmGapPts    = Math.max(0, (maxBpmPct - 40) * 0.4);

  const topAtmoPct   = repetitive_atmospheres[0]?.pct ?? 0;
  const atmosGapPts  = Math.max(0, (topAtmoPct - 40) * 0.3);

  const harmonicPts  = Math.max(0, (domKeyPct - 40) * 0.2 + Math.max(0, domScalePct - 60) * 0.1);
  const gap_score    = parseFloat(Math.min(100, emotionGapPts + bpmGapPts + atmosGapPts + harmonicPts).toFixed(2));

  // ── Persist ───────────────────────────────────────────────────────────────
  const data = {
    underexplored_emotions:    underexplored_emotions as unknown as Record<string, unknown>,
    overused_bpm_ranges:       overused_bpm_ranges    as unknown as Record<string, unknown>,
    repetitive_atmospheres:    repetitive_atmospheres as unknown as Record<string, unknown>,
    harmonic_stagnation:       harmonic_stagnation    as unknown as Record<string, unknown>,
    gap_score:                 String(gap_score),
    total_blueprints_analyzed: total,
    analyzed_at:               new Date(),
  };

  await db
    .insert(sonic_gap_analysis)
    .values({ artist_id: artistId, ...data })
    .onConflictDoUpdate({ target: sonic_gap_analysis.artist_id, set: data });

  return { artist_id: artistId, ...data };
}

export async function getGapAnalysis(artistId: string) {
  const [g] = await db
    .select()
    .from(sonic_gap_analysis)
    .where(eq(sonic_gap_analysis.artist_id, artistId))
    .limit(1);
  return g ?? null;
}
