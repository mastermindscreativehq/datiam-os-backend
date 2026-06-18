CREATE TABLE IF NOT EXISTS "adaptive_weight" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "factor_name" text NOT NULL UNIQUE,
  "current_weight" numeric(5, 2) NOT NULL DEFAULT '0',
  "previous_weight" numeric(5, 2),
  "recommended_weight" numeric(5, 2),
  "confidence" numeric(3, 2) NOT NULL DEFAULT '0',
  "sample_size" integer NOT NULL DEFAULT '0',
  "last_recalculated_at" timestamp with time zone,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "adaptive_weight_factor_name_idx" ON "adaptive_weight" ("factor_name");
--> statement-breakpoint
INSERT INTO "adaptive_weight" (factor_name, current_weight, confidence, sample_size) VALUES
  ('genre_fit',      15.00, 0.00, 0),
  ('bpm_fit',        20.00, 0.00, 0),
  ('mood_fit',       10.00, 0.00, 0),
  ('territory_fit',  10.00, 0.00, 0),
  ('artist_history', 15.00, 0.00, 0),
  ('company_match',  15.00, 0.00, 0),
  ('contact_match',  15.00, 0.00, 0)
ON CONFLICT (factor_name) DO NOTHING;
