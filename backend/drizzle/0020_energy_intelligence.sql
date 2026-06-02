-- Energy Intelligence Engine: Phase 7

CREATE TABLE IF NOT EXISTS energy_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid NOT NULL REFERENCES audio_uploads(id) ON DELETE CASCADE,
  artist_id uuid REFERENCES artist_profiles(id) ON DELETE SET NULL,

  -- Global intelligence output
  energy_arc text,
  peak_moment text,
  drop_strength numeric(5, 2),
  energy_volatility numeric(5, 2),
  tension_curve text,
  replay_retention numeric(5, 2),

  -- Compact energy curve for frontend visualization (downsampled, ~1 pt/sec)
  energy_curve jsonb,

  -- Processing provenance
  frame_size integer,
  hop_size integer,
  sample_rate integer,
  analyzer_version text,

  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS energy_analysis_upload_id_uidx ON energy_analysis(upload_id);
CREATE INDEX IF NOT EXISTS energy_analysis_artist_id_idx ON energy_analysis(artist_id);
CREATE INDEX IF NOT EXISTS energy_analysis_created_at_idx ON energy_analysis(created_at);

-- -----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS energy_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES energy_analysis(id) ON DELETE CASCADE,
  upload_id uuid NOT NULL REFERENCES audio_uploads(id) ON DELETE CASCADE,

  section_type text NOT NULL,
  section_index integer NOT NULL,
  start_time numeric(10, 3) NOT NULL,
  end_time numeric(10, 3) NOT NULL,
  duration numeric(10, 3) NOT NULL,

  avg_rms numeric(10, 6),
  peak_rms numeric(10, 6),
  avg_spectral_centroid numeric(10, 3),
  avg_spectral_flux numeric(10, 6),
  avg_zcr numeric(10, 6),
  energy_score numeric(5, 2),
  tension_score numeric(5, 2),

  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS energy_sections_analysis_id_idx ON energy_sections(analysis_id);
CREATE INDEX IF NOT EXISTS energy_sections_upload_id_idx ON energy_sections(upload_id);

-- -----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS energy_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid NOT NULL REFERENCES audio_uploads(id) ON DELETE CASCADE,
  queue_job_id text,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS energy_jobs_upload_id_idx ON energy_jobs(upload_id);
CREATE INDEX IF NOT EXISTS energy_jobs_status_idx ON energy_jobs(status);
CREATE INDEX IF NOT EXISTS energy_jobs_created_at_idx ON energy_jobs(created_at);
