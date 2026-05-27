import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { sonic_memory, sonic_world_blueprints } from '../../db/schema';

export interface RankedEntry {
  blueprint_id:               string;
  primary_genre:              string;
  bpm:                        number;
  musical_key:                string;
  scale:                      string;
  emotion_at_generation:      string;
  coherence_score:            string;
  emotional_intensity_score:  string;
  commercial_potential_score: string;
  spiritual_alignment_score:  string;
  replayability_score:        string;
  ingested_at:                Date;
  created_at:                 Date | null;
}

export async function getArtistRankings(artistId: string) {
  const rows = await db
    .select({
      blueprint_id:               sonic_memory.blueprint_id,
      primary_genre:              sonic_memory.primary_genre,
      bpm:                        sonic_memory.bpm,
      musical_key:                sonic_memory.musical_key,
      scale:                      sonic_memory.scale,
      emotion_at_generation:      sonic_memory.emotion_at_generation,
      coherence_score:            sonic_memory.coherence_score,
      emotional_intensity_score:  sonic_memory.emotional_intensity_score,
      commercial_potential_score: sonic_memory.commercial_potential_score,
      spiritual_alignment_score:  sonic_memory.spiritual_alignment_score,
      replayability_score:        sonic_memory.replayability_score,
      ingested_at:                sonic_memory.ingested_at,
      created_at:                 sonic_world_blueprints.created_at,
    })
    .from(sonic_memory)
    .innerJoin(sonic_world_blueprints, eq(sonic_memory.blueprint_id, sonic_world_blueprints.id))
    .where(eq(sonic_memory.artist_id, artistId));

  const sort = (field: keyof Pick<typeof rows[0], 'coherence_score' | 'emotional_intensity_score' | 'commercial_potential_score' | 'spiritual_alignment_score' | 'replayability_score'>) =>
    [...rows].sort((a, b) => Number(b[field]) - Number(a[field])).slice(0, 15);

  return {
    strongest_coherence:        sort('coherence_score'),
    highest_emotional_intensity: sort('emotional_intensity_score'),
    highest_commercial_potential: sort('commercial_potential_score'),
    most_spiritually_aligned:   sort('spiritual_alignment_score'),
    most_replayable:            sort('replayability_score'),
  };
}
