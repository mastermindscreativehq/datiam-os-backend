import type { IntelligenceContext } from '../intelligence-core.types';

export function makeContext(overrides: Partial<IntelligenceContext> = {}): IntelligenceContext {
  return {
    release: {
      id: 'release-1',
      artist_id: 'artist-1',
      release_title: 'Test Release',
      release_type: 'single',
      genre: 'afrobeats',
      release_date: null,
      status: 'planning',
    } as any,
    songs: [],
    artist: { id: 'artist-1', genre: 'afrobeats', country: 'NG' },
    resolvedUpload: null,
    audioDna: null,
    syncIntelligence: null,
    fanCount: 0,
    fanCountryBreakdown: {},
    platformTopCountries: [],
    pastReleaseCount: 0,
    ...overrides,
  };
}

export function makeSong(overrides: Record<string, unknown> = {}) {
  return {
    id: 'song-1',
    artist_id: 'artist-1',
    release_id: 'release-1',
    title: 'Test Song',
    genre: 'afrobeats',
    bpm: 108,
    duration_seconds: 180,
    energy_score: '0.80',
    ...overrides,
  } as any;
}

export function makeAudioDna(overrides: Record<string, unknown> = {}) {
  return {
    id: 'dna-1',
    upload_id: 'upload-1',
    danceability: '78.00',
    brightness: '70.00',
    ...overrides,
  } as any;
}

export function makeSyncIntelligence(overrides: Record<string, unknown> = {}) {
  return {
    id: 'si-1',
    upload_id: 'upload-1',
    overall_sync_score: '62.50',
    top_categories: ['film_trailer', 'gaming'],
    sync_tags: ['uplifting', 'cinematic'],
    ...overrides,
  } as any;
}
