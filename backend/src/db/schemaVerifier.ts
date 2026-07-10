import { db } from './index';
import { sql } from 'drizzle-orm';

interface ColumnCheck {
  table: string;
  column: string;
}

export interface SchemaReport {
  healthy: boolean;
  missingTables: string[];
  missingColumns: ColumnCheck[];
}

const REQUIRED_TABLES = [
  'activity_log', 'songs', 'releases',
  'audio_dna', 'audio_dna_jobs',
  'sync_intelligence', 'sync_intelligence_jobs',
  'music_links',
];

const REQUIRED_COLUMNS: ColumnCheck[] = [
  { table: 'artist_profiles', column: 'genre' },
  { table: 'users', column: 'role' },
  // activity_log — all canonical columns (aligned by migration 0008)
  { table: 'activity_log', column: 'user_id' },
  { table: 'activity_log', column: 'user_email' },
  { table: 'activity_log', column: 'user_name' },
  { table: 'activity_log', column: 'action' },
  { table: 'activity_log', column: 'entity_name' },
  { table: 'activity_log', column: 'event_type' },
  { table: 'activity_log', column: 'module' },
  { table: 'activity_log', column: 'entity_type' },
  { table: 'activity_log', column: 'entity_id' },
  { table: 'activity_log', column: 'title' },
  { table: 'activity_log', column: 'description' },
  { table: 'activity_log', column: 'metadata' },
  { table: 'activity_log', column: 'severity' },
  { table: 'activity_log', column: 'created_at' },
  // songs — Music Core v1 columns (migration 0009)
  { table: 'songs', column: 'release_id' },
  { table: 'songs', column: 'slug' },
  { table: 'songs', column: 'musical_key' },
  { table: 'songs', column: 'duration_seconds' },
  { table: 'songs', column: 'audio_url' },
  { table: 'songs', column: 'waveform_url' },
  { table: 'songs', column: 'cover_art_url' },
  { table: 'songs', column: 'language' },
  { table: 'songs', column: 'track_number' },
  { table: 'songs', column: 'disk_number' },
  { table: 'songs', column: 'energy_score' },
  { table: 'songs', column: 'emotion_score' },
  { table: 'songs', column: 'viral_score' },
  { table: 'songs', column: 'commercial_score' },
  { table: 'songs', column: 'spiritual_score' },
  // releases — Music Core v1 columns (migration 0009)
  { table: 'releases', column: 'artist_id' },
  { table: 'releases', column: 'slug' },
  { table: 'releases', column: 'music_status' },
  { table: 'releases', column: 'genre' },
  { table: 'releases', column: 'cover_art_url' },
  { table: 'releases', column: 'description' },
  { table: 'releases', column: 'total_tracks' },
  // artist_profiles — Artist Intelligence v1 (migration 0051)
  { table: 'artist_profiles', column: 'management_company' },
  { table: 'artist_profiles', column: 'territories' },
  { table: 'artist_profiles', column: 'ipi_number' },
  { table: 'artist_profiles', column: 'distributor_name' },
  { table: 'artist_profiles', column: 'verified' },
  // releases — Release Intelligence v1 (migration 0051)
  { table: 'releases', column: 'territories' },
  { table: 'releases', column: 'primary_isrc' },
  { table: 'releases', column: 'deezer_url' },
  // music_links — Music Links Hub v1 (migration 0051)
  { table: 'music_links', column: 'artist_id' },
  { table: 'music_links', column: 'release_id' },
  { table: 'music_links', column: 'link_category' },
];

export async function verifySchema(): Promise<SchemaReport> {
  const missingTables: string[] = [];
  const missingColumns: ColumnCheck[] = [];

  for (const tableName of REQUIRED_TABLES) {
    const rows = await db.execute(sql`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${tableName}
      LIMIT 1
    `);
    if ((rows as unknown[]).length === 0) {
      missingTables.push(tableName);
    }
  }

  for (const { table, column } of REQUIRED_COLUMNS) {
    const rows = await db.execute(sql`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${table} AND column_name = ${column}
      LIMIT 1
    `);
    if ((rows as unknown[]).length === 0) {
      missingColumns.push({ table, column });
    }
  }

  return {
    healthy: missingTables.length === 0 && missingColumns.length === 0,
    missingTables,
    missingColumns,
  };
}
