import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { sonic_memory, sonic_world_blueprints, sonic_patterns } from '../../db/schema';

interface BpmBucket { label: string; min: number; max: number; count: number }
interface CountEntry { value: string; count: number }

const BPM_BUCKETS: Omit<BpmBucket, 'count'>[] = [
  { label: '40–70 Downtempo', min: 40,  max: 70  },
  { label: '70–90 Slow',      min: 70,  max: 90  },
  { label: '90–110 Mid',      min: 90,  max: 110 },
  { label: '110–130 Upbeat',  min: 110, max: 130 },
  { label: '130–150 Energetic', min: 130, max: 150 },
  { label: '150+ Fast',       min: 150, max: 301 },
];

function countBy(items: string[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const v of items) result[v] = (result[v] ?? 0) + 1;
  return result;
}

function topEntries(obj: Record<string, number>, n = 5): CountEntry[] {
  return Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([value, count]) => ({ value, count }));
}

function topKey(obj: Record<string, number>): string | null {
  const entries = Object.entries(obj).sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0] ?? null;
}

function avg(nums: number[]): number {
  return nums.length === 0 ? 0 : nums.reduce((a, b) => a + b, 0) / nums.length;
}

export async function analyzeArtistPatterns(artistId: string) {
  const rows = await db
    .select({
      bpm:                       sonic_memory.bpm,
      musical_key:               sonic_memory.musical_key,
      scale:                     sonic_memory.scale,
      primary_genre:             sonic_memory.primary_genre,
      emotion:                   sonic_memory.emotion_at_generation,
      commercial_accessibility:  sonic_memory.commercial_accessibility,
      spiritual_intensity:       sonic_memory.spiritual_intensity,
      emotional_rawness:         sonic_memory.emotional_rawness,
      coherence_score:           sonic_memory.coherence_score,
      visual_sonic_atmosphere:   sonic_world_blueprints.visual_sonic_atmosphere,
      vocal_texture:             sonic_world_blueprints.vocal_texture,
      cadence_energy:            sonic_world_blueprints.cadence_energy,
      vocal_atmosphere:          sonic_world_blueprints.vocal_atmosphere,
    })
    .from(sonic_memory)
    .innerJoin(sonic_world_blueprints, eq(sonic_memory.blueprint_id, sonic_world_blueprints.id))
    .where(eq(sonic_memory.artist_id, artistId));

  if (rows.length === 0) return null;

  const n = rows.length;
  const bpmBuckets: BpmBucket[] = BPM_BUCKETS.map(b => ({ ...b, count: 0 }));

  const keys: string[]       = [];
  const scales: string[]     = [];
  const genres: string[]     = [];
  const emotions: string[]   = [];
  const commercials: number[] = [];
  const spirituals: number[]  = [];
  const rawnessVals: number[] = [];
  const coherenceVals: number[] = [];
  const atmospheres: string[] = [];
  const vocalTextures: string[] = [];
  const cadenceEnergies: string[] = [];

  for (const r of rows) {
    const bucket = bpmBuckets.find(b => r.bpm >= b.min && r.bpm < b.max);
    if (bucket) bucket.count++;

    keys.push(r.musical_key);
    scales.push(r.scale);
    genres.push(r.primary_genre);
    emotions.push(r.emotion);
    commercials.push(r.commercial_accessibility);
    spirituals.push(r.spiritual_intensity);
    rawnessVals.push(r.emotional_rawness);
    coherenceVals.push(Number(r.coherence_score));

    const atmo = r.visual_sonic_atmosphere.split(' ').slice(0, 4).join(' ').toLowerCase();
    atmospheres.push(atmo);
    vocalTextures.push(r.vocal_texture.split(' ').slice(0, 3).join(' ').toLowerCase());
    cadenceEnergies.push(r.cadence_energy.split(' ').slice(0, 3).join(' ').toLowerCase());
  }

  const keyCount     = countBy(keys);
  const scaleCount   = countBy(scales);
  const genreCount   = countBy(genres);
  const emotionCount = countBy(emotions);

  const avgCommercial = parseFloat(avg(commercials).toFixed(2));

  const patternData = {
    bpm_distribution:          { avg: parseFloat(avg(rows.map(r => r.bpm)).toFixed(1)), buckets: bpmBuckets } as unknown as Record<string, unknown>,
    key_distribution:          Object.entries(keyCount).map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count) as unknown as Record<string, unknown>,
    scale_distribution:        topEntries(scaleCount) as unknown as Record<string, unknown>,
    emotion_tendencies:        emotionCount as unknown as Record<string, unknown>,
    commercial_tendencies:     {
      avg:       avgCommercial,
      high_count: commercials.filter(v => v >= 70).length,
      mid_count:  commercials.filter(v => v >= 40 && v < 70).length,
      low_count:  commercials.filter(v => v < 40).length,
    } as unknown as Record<string, unknown>,
    atmospheric_patterns:      { top_atmospheres: topEntries(countBy(atmospheres)) } as unknown as Record<string, unknown>,
    vocal_architecture_trends: {
      top_vocal_textures:  topEntries(countBy(vocalTextures)),
      top_cadence_energies: topEntries(countBy(cadenceEnergies)),
    } as unknown as Record<string, unknown>,
    dominant_emotion:             topKey(emotionCount),
    dominant_key:                 topKey(keyCount),
    dominant_scale:               topKey(scaleCount),
    dominant_genre:               topKey(genreCount),
    avg_bpm:                      String(parseFloat(avg(rows.map(r => r.bpm)).toFixed(2))),
    avg_coherence:                String(parseFloat(avg(coherenceVals).toFixed(2))),
    avg_commercial_accessibility: String(parseFloat(avg(commercials).toFixed(2))),
    avg_spiritual_intensity:      String(parseFloat(avg(spirituals).toFixed(2))),
    avg_emotional_rawness:        String(parseFloat(avg(rawnessVals).toFixed(2))),
    total_blueprints_analyzed:    n,
    last_analyzed_at:             new Date(),
  };

  await db
    .insert(sonic_patterns)
    .values({ artist_id: artistId, ...patternData })
    .onConflictDoUpdate({
      target: sonic_patterns.artist_id,
      set:    patternData,
    });

  return patternData;
}

export async function getArtistPatterns(artistId: string) {
  const [p] = await db
    .select()
    .from(sonic_patterns)
    .where(eq(sonic_patterns.artist_id, artistId))
    .limit(1);
  return p ?? null;
}
