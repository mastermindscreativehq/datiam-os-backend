import type { Release, Song, AudioUpload, AudioDna } from '../../db/schema';
import type { sync_intelligence } from '../../db/schema';

export type DataCompleteness = 'full' | 'metadata_only';

export type SyncIntelligenceRow = typeof sync_intelligence.$inferSelect;

/**
 * Everything known about a release, resolved once and shared by every
 * provider. Any future module (Playlist Intel, Fan Intel, ...) that needs
 * "what do we know about this release" should call buildReleaseContext()
 * instead of re-deriving this join.
 */
export interface IntelligenceContext {
  release: Release;
  songs: Song[];
  artist: { id: string; genre: string | null; country: string | null } | null;
  resolvedUpload: AudioUpload | null;
  audioDna: AudioDna | null;
  syncIntelligence: SyncIntelligenceRow | null;
  fanCount: number;
  fanCountryBreakdown: Record<string, number>;
  platformTopCountries: string[];
  pastReleaseCount: number;
}

/**
 * score is null (not 0) when a provider has no real signal to score from —
 * callers must not treat null as "bad", only as "unknown".
 */
export interface ProviderResult {
  key: string;
  score: number | null;
  summary: string;
  dataCompleteness: DataCompleteness;
  raw?: Record<string, unknown>;
}

export interface IntelligenceProvider {
  key: string;
  analyze(ctx: IntelligenceContext): Promise<ProviderResult>;
}
