-- Audio Pipeline: Phase 6

CREATE TABLE IF NOT EXISTS audio_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL DEFAULT gen_random_uuid(),
  artist_id uuid REFERENCES artist_profiles(id) ON DELETE SET NULL,
  song_id uuid REFERENCES songs(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_size integer NOT NULL,
  mime_type text NOT NULL,
  storage_path text NOT NULL,
  storage_url text,
  duration_seconds numeric(10, 3),
  status text NOT NULL DEFAULT 'pending',
  upload_version text NOT NULL DEFAULT 'v1',
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS audio_uploads_artist_id_idx ON audio_uploads(artist_id);
CREATE INDEX IF NOT EXISTS audio_uploads_session_id_idx ON audio_uploads(session_id);
CREATE INDEX IF NOT EXISTS audio_uploads_status_idx ON audio_uploads(status);
CREATE INDEX IF NOT EXISTS audio_uploads_created_at_idx ON audio_uploads(created_at);

CREATE TABLE IF NOT EXISTS audio_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid NOT NULL REFERENCES audio_uploads(id) ON DELETE CASCADE,
  artist_id uuid REFERENCES artist_profiles(id) ON DELETE SET NULL,
  bpm numeric(6, 2),
  duration_seconds numeric(10, 3),
  loudness_lufs numeric(8, 3),
  peak_db numeric(8, 3),
  sample_rate integer,
  bit_rate integer,
  channels integer,
  format text,
  spectral_centroid numeric(10, 3),
  emotional_profile jsonb,
  cinematic_score numeric(5, 2),
  sync_categories jsonb,
  genre_confidence jsonb,
  vocal_intensity numeric(5, 2),
  replay_score numeric(5, 2),
  trailer_suitability numeric(5, 2),
  ai_notes text,
  ai_model_version text NOT NULL DEFAULT 'v1',
  processing_version text NOT NULL DEFAULT 'v1',
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS audio_analysis_upload_id_idx ON audio_analysis(upload_id);
CREATE INDEX IF NOT EXISTS audio_analysis_artist_id_idx ON audio_analysis(artist_id);

CREATE TABLE IF NOT EXISTS audio_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid NOT NULL REFERENCES audio_uploads(id) ON DELETE CASCADE,
  queue_name text NOT NULL,
  job_id text,
  job_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  error text,
  payload jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  completed_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS audio_jobs_upload_id_idx ON audio_jobs(upload_id);
CREATE INDEX IF NOT EXISTS audio_jobs_status_idx ON audio_jobs(status);
CREATE INDEX IF NOT EXISTS audio_jobs_queue_name_idx ON audio_jobs(queue_name);
CREATE INDEX IF NOT EXISTS audio_jobs_created_at_idx ON audio_jobs(created_at);

CREATE TABLE IF NOT EXISTS audio_stems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid NOT NULL REFERENCES audio_uploads(id) ON DELETE CASCADE,
  artist_id uuid REFERENCES artist_profiles(id) ON DELETE SET NULL,
  stem_type text NOT NULL,
  file_name text NOT NULL,
  file_size integer NOT NULL,
  storage_path text NOT NULL,
  storage_url text,
  duration_seconds numeric(10, 3),
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS audio_stems_upload_id_idx ON audio_stems(upload_id);
CREATE INDEX IF NOT EXISTS audio_stems_artist_id_idx ON audio_stems(artist_id);
CREATE INDEX IF NOT EXISTS audio_stems_stem_type_idx ON audio_stems(stem_type);

CREATE TABLE IF NOT EXISTS waveform_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid NOT NULL UNIQUE REFERENCES audio_uploads(id) ON DELETE CASCADE,
  waveform_data jsonb NOT NULL,
  sample_count integer NOT NULL,
  duration_seconds numeric(10, 3) NOT NULL,
  generated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS waveform_cache_upload_id_idx ON waveform_cache(upload_id);
