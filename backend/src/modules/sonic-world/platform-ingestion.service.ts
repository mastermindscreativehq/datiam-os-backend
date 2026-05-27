import { eq, desc, and } from 'drizzle-orm';
import { db } from '../../db';
import { platform_ingestion_signals } from '../../db/schema';
import { sonicEventBus } from './sonic-event-bus';

export type SupportedPlatform = 'spotify' | 'tiktok' | 'youtube' | 'apple_music' | 'soundcloud';
export type SignalType =
  | 'stream_count'
  | 'viral_score'
  | 'playlist_add'
  | 'save_rate'
  | 'engagement_rate'
  | 'share_count'
  | 'comment_count'
  | 'skip_rate'
  | 'completion_rate'
  | 'chart_position';

export interface IngestSignalInput {
  artist_id:   string;
  platform:    SupportedPlatform;
  signal_type: SignalType;
  track_id?:   string;
  track_title?: string;
  value:       number;
  recorded_at?: Date;
  metadata?:   Record<string, unknown>;
}

export const PLATFORM_STATUS: Record<SupportedPlatform, { ready: boolean; notes: string }> = {
  spotify:     { ready: false, notes: 'Awaiting Spotify Web API credentials and OAuth scope setup' },
  tiktok:      { ready: false, notes: 'Awaiting TikTok for Developers API key and app approval' },
  youtube:     { ready: false, notes: 'Awaiting YouTube Data API v3 key and Analytics scope' },
  apple_music: { ready: false, notes: 'Awaiting Apple Music API MusicKit credentials' },
  soundcloud:  { ready: false, notes: 'Awaiting SoundCloud API client credentials' },
};

export async function ingestSignal(input: IngestSignalInput) {
  const [signal] = await db.insert(platform_ingestion_signals).values({
    artist_id:   input.artist_id,
    platform:    input.platform,
    signal_type: input.signal_type,
    track_id:    input.track_id ?? null,
    track_title: input.track_title ?? null,
    value:       String(input.value),
    recorded_at: input.recorded_at ?? new Date(),
    metadata:    input.metadata ?? null,
  }).returning();

  sonicEventBus.publish('platform.signal.ingested', {
    artist_id:   input.artist_id,
    platform:    input.platform,
    signal_type: input.signal_type,
    value:       input.value,
    track_id:    input.track_id,
  });

  return signal;
}

export async function getArtistSignals(
  artistId: string,
  opts?: { platform?: SupportedPlatform; signal_type?: SignalType; limit?: number },
) {
  const limit = Math.min(opts?.limit ?? 50, 100);
  const conditions = [eq(platform_ingestion_signals.artist_id, artistId)];

  if (opts?.platform) {
    conditions.push(eq(platform_ingestion_signals.platform, opts.platform));
  }
  if (opts?.signal_type) {
    conditions.push(eq(platform_ingestion_signals.signal_type, opts.signal_type));
  }

  return db
    .select()
    .from(platform_ingestion_signals)
    .where(and(...conditions))
    .orderBy(desc(platform_ingestion_signals.recorded_at))
    .limit(limit);
}

export async function getSignalSummary(artistId: string) {
  const signals = await db
    .select()
    .from(platform_ingestion_signals)
    .where(eq(platform_ingestion_signals.artist_id, artistId))
    .orderBy(desc(platform_ingestion_signals.recorded_at))
    .limit(200);

  const byPlatform: Record<string, { count: number; latest: string; signals: Record<string, number> }> = {};

  for (const s of signals) {
    if (!byPlatform[s.platform]) {
      byPlatform[s.platform] = { count: 0, latest: s.recorded_at.toISOString(), signals: {} };
    }
    byPlatform[s.platform].count++;
    byPlatform[s.platform].signals[s.signal_type] = Number(s.value);
  }

  return {
    total_signals: signals.length,
    platforms:     byPlatform,
    platform_status: PLATFORM_STATUS,
    ingestion_pipeline_ready: true,
    note: 'Platform feedback ingestion pipeline is scaffolded and ready. Connect API credentials to activate live data.',
  };
}

export async function getPipelineStatus() {
  return {
    pipeline_version: 'ingestion-v1',
    platforms:        PLATFORM_STATUS,
    supported_signals: Object.keys(PLATFORM_STATUS) as SupportedPlatform[],
    signal_types:     [
      'stream_count', 'viral_score', 'playlist_add', 'save_rate',
      'engagement_rate', 'share_count', 'comment_count', 'skip_rate',
      'completion_rate', 'chart_position',
    ] as SignalType[],
    status:           'scaffold_ready',
    message:          'All ingestion pipelines initialized. Awaiting platform API credential configuration to begin live feedback loops.',
    rl_integration:   'When signals are live, they will auto-feed into the Director recommendation engine as real-world reward signals.',
  };
}
