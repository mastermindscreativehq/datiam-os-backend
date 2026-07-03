import type { IntelligenceContext, ProviderResult } from '../../intelligence-core/intelligence-core.types';

export function makeContext(overrides: Partial<IntelligenceContext> = {}): IntelligenceContext {
  return {
    release: {
      id: 'release-1',
      artist_id: 'artist-1',
      release_title: 'Test Release',
      release_type: 'single',
      genre: 'afrobeats',
      release_date: null,
      spotify_url: null,
      apple_music_url: null,
      audiomack_url: null,
      boomplay_url: null,
      youtube_url: null,
    } as any,
    songs: [],
    artist: { id: 'artist-1', genre: 'afrobeats', country: 'NG' },
    resolvedUpload: null,
    audioDna: null,
    syncIntelligence: null,
    fanCount: 100,
    fanCountryBreakdown: {},
    platformTopCountries: [],
    pastReleaseCount: 0,
    ...overrides,
  };
}

export function makeResults(overrides: Partial<Record<string, ProviderResult>> = {}): Record<string, ProviderResult> {
  return {
    commercial: { key: 'commercial', score: 55, summary: 'Moderate commercial potential.', dataCompleteness: 'metadata_only' },
    sync: { key: 'sync', score: null, summary: 'Sync suitability requires audio analysis.', dataCompleteness: 'metadata_only' },
    playlist: { key: 'playlist', score: 60, summary: 'Playlist fit based on genre only.', dataCompleteness: 'metadata_only' },
    ...overrides,
  };
}
