import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { sonic_artist_profiles, artist_profiles } from '../../db/schema';
import { getArtistMemories } from './sonic-memory.service';
import { getArtistPatterns } from './sonic-patterns.service';

type EvolutionStage = 'emerging' | 'developing' | 'defined' | 'mature';

function deriveEvolutionStage(count: number): EvolutionStage {
  if (count >= 50) return 'mature';
  if (count >= 20) return 'defined';
  if (count >= 5)  return 'developing';
  return 'emerging';
}

function buildProfileSummary(
  artistName: string,
  stage: EvolutionStage,
  patterns: { dominant_emotion: string | null; dominant_genre: string | null; dominant_key: string | null; dominant_scale: string | null; avg_bpm: string | null; avg_coherence: string | null; avg_commercial_accessibility: string | null; avg_spiritual_intensity: string | null; total_blueprints_analyzed: number },
): string {
  const emotion  = patterns.dominant_emotion  ?? 'undefined';
  const genre    = patterns.dominant_genre    ?? 'undefined';
  const key      = patterns.dominant_key      ?? 'C';
  const scale    = patterns.dominant_scale    ?? 'Minor';
  const bpm      = patterns.avg_bpm           ? Math.round(Number(patterns.avg_bpm)) : 90;
  const coherence = Number(patterns.avg_coherence ?? 0);
  const commercial = Number(patterns.avg_commercial_accessibility ?? 50);
  const spiritual  = Number(patterns.avg_spiritual_intensity ?? 50);

  const stageDesc: Record<EvolutionStage, string> = {
    emerging:   'an emerging artist in early sonic definition',
    developing: 'a developing artist building sonic consistency',
    defined:    'an artist with a defined and recognizable sonic identity',
    mature:     'a mature artist with deeply established sonic DNA',
  };

  const commercialDesc = commercial >= 70 ? 'commercially accessible' : commercial >= 40 ? 'balanced between underground and mainstream' : 'underground and artist-first';
  const spiritualDesc  = spiritual  >= 70 ? 'spiritually elevated' : spiritual >= 40 ? 'emotionally grounded' : 'raw and earthly';
  const coherenceDesc  = coherence  >= 0.85 ? 'exceptional coherence' : coherence >= 0.70 ? 'strong coherence' : coherence >= 0.55 ? 'developing coherence' : 'emerging coherence';

  return `${artistName} is ${stageDesc[stage]}, having generated ${patterns.total_blueprints_analyzed} sonic blueprint${patterns.total_blueprints_analyzed !== 1 ? 's' : ''}. Their sound gravitates toward ${emotion}-driven ${genre} at an average of ${bpm} BPM in ${key} ${scale}. The body of work shows ${coherenceDesc} (avg ${(coherence * 100).toFixed(0)}%), is ${commercialDesc}, and carries a ${spiritualDesc} quality. ${stage === 'emerging' ? 'More generations will sharpen their sonic signature.' : stage === 'mature' ? 'Their sonic DNA is fully crystallized and instantly recognizable.' : 'Their sonic identity continues to deepen with each generation.'}`;
}

export async function computeArtistProfile(artistId: string) {
  const [artistRow] = await db
    .select({ stage_name: artist_profiles.stage_name })
    .from(artist_profiles)
    .where(eq(artist_profiles.id, artistId))
    .limit(1);

  const patterns = await getArtistPatterns(artistId);
  if (!patterns) return null;

  const memories = await getArtistMemories(artistId, 500);
  if (memories.length === 0) return null;

  const stage = deriveEvolutionStage(memories.length);

  const sortedByCoherence  = [...memories].sort((a, b) => Number(b.coherence_score)             - Number(a.coherence_score));
  const sortedByEmotional  = [...memories].sort((a, b) => Number(b.emotional_intensity_score)   - Number(a.emotional_intensity_score));
  const sortedByCommercial = [...memories].sort((a, b) => Number(b.commercial_potential_score)  - Number(a.commercial_potential_score));
  const sortedBySpiritual  = [...memories].sort((a, b) => Number(b.spiritual_alignment_score)   - Number(a.spiritual_alignment_score));
  const sortedByReplayable = [...memories].sort((a, b) => Number(b.replayability_score)         - Number(a.replayability_score));

  const tags: string[] = [];
  if (patterns.dominant_emotion)  tags.push(patterns.dominant_emotion);
  if (patterns.dominant_genre)    tags.push(patterns.dominant_genre);
  if (patterns.dominant_key && patterns.dominant_scale) tags.push(`${patterns.dominant_key} ${patterns.dominant_scale}`);
  if (Number(patterns.avg_commercial_accessibility) >= 70)  tags.push('Commercial Leaning');
  else if (Number(patterns.avg_commercial_accessibility) <= 30) tags.push('Underground Spirit');
  if (Number(patterns.avg_spiritual_intensity) >= 70)  tags.push('Spiritually Driven');
  if (Number(patterns.avg_emotional_rawness) >= 70)    tags.push('Emotionally Raw');
  if (Number(patterns.avg_coherence) >= 0.85)          tags.push('High Coherence');
  if (patterns.avg_bpm && Number(patterns.avg_bpm) >= 130) tags.push('High Energy');
  else if (patterns.avg_bpm && Number(patterns.avg_bpm) <= 80) tags.push('Slow & Intentional');

  const artistName = artistRow?.stage_name ?? 'This Artist';

  const profileData = {
    profile_summary:                buildProfileSummary(artistName, stage, patterns),
    sonic_identity_tags:            tags as unknown as Record<string, unknown>,
    dominant_genres:                [patterns.dominant_genre].filter(Boolean) as unknown as Record<string, unknown>,
    evolution_stage:                stage,
    strongest_coherence_id:         sortedByCoherence[0]?.blueprint_id   ?? null,
    highest_emotional_intensity_id: sortedByEmotional[0]?.blueprint_id   ?? null,
    highest_commercial_id:          sortedByCommercial[0]?.blueprint_id  ?? null,
    most_spiritual_id:              sortedBySpiritual[0]?.blueprint_id   ?? null,
    most_replayable_id:             sortedByReplayable[0]?.blueprint_id  ?? null,
    computed_at:                    new Date(),
  };

  await db
    .insert(sonic_artist_profiles)
    .values({ artist_id: artistId, ...profileData })
    .onConflictDoUpdate({
      target: sonic_artist_profiles.artist_id,
      set:    profileData,
    });

  return profileData;
}

export async function getArtistProfile(artistId: string) {
  const [p] = await db
    .select()
    .from(sonic_artist_profiles)
    .where(eq(sonic_artist_profiles.artist_id, artistId))
    .limit(1);
  return p ?? null;
}
