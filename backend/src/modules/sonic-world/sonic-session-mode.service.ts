import { eq, desc } from 'drizzle-orm';
import { db } from '../../db';
import { sonic_memory, sonic_session_diagnostics } from '../../db/schema';
import { sonicEventBus } from './sonic-event-bus';
import { ENGINE_VERSIONS } from './sonic-engine-versions';

interface DiagnosticResult {
  stagnation_detected:           boolean;
  over_density_detected:         boolean;
  emotional_flatness_detected:   boolean;
  harmonic_repetition_detected:  boolean;
  weak_transitions_detected:     boolean;
  diagnostic_score:              number;
  recommendations:               SessionRecommendation[];
  meta:                          DiagnosticMeta;
}

interface SessionRecommendation {
  issue:          string;
  severity:       'low' | 'medium' | 'high';
  guidance:       string;
  suggested_action: string;
}

interface DiagnosticMeta {
  blueprints_analyzed: number;
  window_size:         number;
  version:             string;
  avg_bpm:             number;
  avg_coherence:       number;
  dominant_emotion:    string;
  dominant_key:        string;
}

function variance(nums: number[]): number {
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  return nums.reduce((s, v) => s + (v - mean) ** 2, 0) / nums.length;
}

function mode(items: string[]): string {
  const counts: Record<string, number> = {};
  for (const v of items) counts[v] = (counts[v] ?? 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
}

function avg(nums: number[]) { return nums.reduce((a, b) => a + b, 0) / nums.length; }

export async function diagnoseSession(artistId: string, windowSize = 10, sessionId?: string): Promise<DiagnosticResult> {
  const memories = await db
    .select()
    .from(sonic_memory)
    .where(eq(sonic_memory.artist_id, artistId))
    .orderBy(desc(sonic_memory.ingested_at))
    .limit(windowSize);

  const recs: SessionRecommendation[] = [];
  let score = 1.0;

  if (memories.length === 0) {
    return {
      stagnation_detected: false, over_density_detected: false,
      emotional_flatness_detected: false, harmonic_repetition_detected: false,
      weak_transitions_detected: false, diagnostic_score: 1.0, recommendations: [],
      meta: { blueprints_analyzed: 0, window_size: windowSize, version: ENGINE_VERSIONS.SESSION_MODE, avg_bpm: 0, avg_coherence: 0, dominant_emotion: '', dominant_key: '' },
    };
  }

  const bpms       = memories.map(m => m.bpm);
  const emotions   = memories.map(m => m.emotion_at_generation);
  const keys       = memories.map(m => m.musical_key);
  const scales     = memories.map(m => m.scale);
  const genres     = memories.map(m => m.primary_genre);
  const coherences = memories.map(m => Number(m.coherence_score));
  const densities  = memories.map(m => (m.cinematic_density + m.spiritual_intensity) / 2);
  const rawness    = memories.map(m => m.emotional_rawness);

  const avgBpm       = Math.round(avg(bpms));
  const avgCoherence = parseFloat(avg(coherences).toFixed(3));
  const domEmotion   = mode(emotions);
  const domKey       = mode(keys);
  const domScale     = mode(scales);

  // ── 1. Stagnation detection ─────────────────────────────────────────────────
  const bpmVariance      = variance(bpms);
  const emotionDominance = (emotions.filter(e => e === domEmotion).length / emotions.length);
  const stagnation_detected = bpmVariance < 16 && emotionDominance >= 0.8 && memories.length >= 4;
  if (stagnation_detected) {
    score -= 0.20;
    recs.push({
      issue:   'Creative Stagnation',
      severity: emotionDominance >= 0.9 ? 'high' : 'medium',
      guidance: `Your last ${memories.length} blueprints show near-identical BPM variance (${bpmVariance.toFixed(1)}) and ${(emotionDominance * 100).toFixed(0)}% ${domEmotion} emotion. You are in a creative loop.`,
      suggested_action: `Break the pattern: target a BPM ±${Math.round(avgBpm * 0.15)} away from ${avgBpm}, switch to an unexplored emotion, and change your key.`,
    });
    sonicEventBus.publish('session.stagnation.detected', { artist_id: artistId, bpm_variance: bpmVariance, emotion_dominance: emotionDominance });
  }

  // ── 2. Over-density detection ───────────────────────────────────────────────
  const avgDensity = avg(densities);
  const over_density_detected = avgDensity > 78;
  if (over_density_detected) {
    score -= 0.18;
    recs.push({
      issue:   'Over-Density',
      severity: avgDensity > 88 ? 'high' : 'medium',
      guidance: `Average cinematic + spiritual density is ${avgDensity.toFixed(0)}/100 across your last ${memories.length} blueprints. The production is too dense to breathe.`,
      suggested_action: `Target cinematic_density 40–60 and spiritual_intensity 50–65 on your next 3 blueprints. Let negative space carry weight.`,
    });
    sonicEventBus.publish('session.over_density.detected', { artist_id: artistId, avg_density: avgDensity });
  }

  // ── 3. Emotional flatness detection ─────────────────────────────────────────
  const avgRawness = avg(rawness);
  const emotional_flatness_detected = avgRawness < 38;
  if (emotional_flatness_detected) {
    score -= 0.18;
    recs.push({
      issue:   'Emotional Flatness',
      severity: avgRawness < 25 ? 'high' : 'medium',
      guidance: `Average emotional rawness is ${avgRawness.toFixed(0)}/100. Your music lacks emotional conviction and listener impact.`,
      suggested_action: `Push emotional_rawness above 60 on your next blueprints. Record from a place of genuine feeling — more vulnerability, higher stakes, rawer textures.`,
    });
    sonicEventBus.publish('session.emotional_flatness.detected', { artist_id: artistId, avg_rawness: avgRawness });
  }

  // ── 4. Harmonic repetition detection ────────────────────────────────────────
  let maxConsecutiveSameKey = 0;
  let run = 1;
  for (let i = 1; i < memories.length; i++) {
    if (memories[i].musical_key === memories[i - 1].musical_key && memories[i].scale === memories[i - 1].scale) {
      run++;
      maxConsecutiveSameKey = Math.max(maxConsecutiveSameKey, run);
    } else {
      run = 1;
    }
  }
  const harmonic_repetition_detected = maxConsecutiveSameKey >= 4;
  if (harmonic_repetition_detected) {
    score -= 0.15;
    recs.push({
      issue:   'Harmonic Repetition',
      severity: maxConsecutiveSameKey >= 6 ? 'high' : 'medium',
      guidance: `${maxConsecutiveSameKey} consecutive blueprints in ${domKey} ${domScale}. Harmonic monotony weakens the listener's emotional engagement over time.`,
      suggested_action: `Shift key and mode: try ${altKey(domKey)} ${altScale(domScale)} next, or experiment with a modal sound you've never explored.`,
    });
    sonicEventBus.publish('session.harmonic_repetition.detected', { artist_id: artistId, consecutive_key_run: maxConsecutiveSameKey, key: domKey, scale: domScale });
  }

  // ── 5. Weak transitions detection ───────────────────────────────────────────
  const coherenceSlope = computeSlope(coherences);
  const uniqueGenres   = new Set(genres.slice(0, 5)).size;
  const weak_transitions_detected = coherenceSlope < -0.015 && uniqueGenres >= 4;
  if (weak_transitions_detected) {
    score -= 0.15;
    recs.push({
      issue:   'Weak Transitions',
      severity: 'medium',
      guidance: `Coherence declining (slope ${coherenceSlope.toFixed(3)}) while switching between ${uniqueGenres} different genres in your last 5 blueprints. You're losing sonic consistency.`,
      suggested_action: `Stabilize in your dominant genre for 3–5 consecutive blueprints before exploring. Commit to one territory long enough to master it.`,
    });
    sonicEventBus.publish('session.weak_transitions.detected', { artist_id: artistId, coherence_slope: coherenceSlope, unique_genres: uniqueGenres });
  }

  const finalScore = parseFloat(Math.max(0, score).toFixed(2));

  // Persist diagnostic
  await db.insert(sonic_session_diagnostics).values({
    artist_id:                    artistId,
    session_id:                   sessionId ?? null,
    stagnation_detected,
    over_density_detected,
    emotional_flatness_detected,
    harmonic_repetition_detected,
    weak_transitions_detected,
    diagnostic_score:             String(finalScore),
    recommendations:              recs as unknown as Record<string, unknown>[],
    blueprint_window_size:        windowSize,
  });

  return {
    stagnation_detected,
    over_density_detected,
    emotional_flatness_detected,
    harmonic_repetition_detected,
    weak_transitions_detected,
    diagnostic_score: finalScore,
    recommendations:  recs,
    meta: {
      blueprints_analyzed: memories.length,
      window_size:         windowSize,
      version:             ENGINE_VERSIONS.SESSION_MODE,
      avg_bpm:             avgBpm,
      avg_coherence:       avgCoherence,
      dominant_emotion:    domEmotion,
      dominant_key:        domKey,
    },
  };
}

export async function getLatestDiagnostic(artistId: string) {
  const [row] = await db
    .select()
    .from(sonic_session_diagnostics)
    .where(eq(sonic_session_diagnostics.artist_id, artistId))
    .orderBy(desc(sonic_session_diagnostics.analyzed_at))
    .limit(1);
  return row ?? null;
}

export async function getDiagnosticHistory(artistId: string, limit = 20) {
  return db
    .select()
    .from(sonic_session_diagnostics)
    .where(eq(sonic_session_diagnostics.artist_id, artistId))
    .orderBy(desc(sonic_session_diagnostics.analyzed_at))
    .limit(Math.min(limit, 50));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeSlope(values: number[]): number {
  if (values.length < 2) return 0;
  const n    = values.length;
  const mean = avg(values);
  const xMean = (n - 1) / 2;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (values[i] - mean);
    den += (i - xMean) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

function altKey(key: string): string {
  const circle = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'F', 'Bb', 'Eb', 'Ab'];
  const idx = circle.indexOf(key);
  if (idx === -1) return 'F';
  return circle[(idx + 3) % circle.length];
}

function altScale(scale: string): string {
  const alts: Record<string, string> = {
    Minor: 'Dorian', Major: 'Mixolydian', Dorian: 'Phrygian',
    Phrygian: 'Lydian', Mixolydian: 'Minor', Lydian: 'Major',
    'Pentatonic Minor': 'Pentatonic Major', 'Pentatonic Major': 'Blues',
    Blues: 'Minor', default: 'Dorian',
  };
  return alts[scale] ?? alts.default;
}
