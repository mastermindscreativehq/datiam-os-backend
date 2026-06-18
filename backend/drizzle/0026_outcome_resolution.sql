ALTER TABLE "prediction_accuracy_log" ADD COLUMN IF NOT EXISTS "actual_revenue" numeric(12,2);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pal_actual_revenue_idx" ON "prediction_accuracy_log" ("actual_revenue");
