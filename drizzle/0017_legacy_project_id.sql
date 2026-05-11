-- Add legacy Bubble id to projects for migration idempotency.
ALTER TABLE "projects"
  ADD COLUMN IF NOT EXISTS "legacy_bubble_id" text,
  ADD COLUMN IF NOT EXISTS "legacy_source" text;

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "projects_legacy_bubble_id_idx"
  ON "projects" ("legacy_bubble_id")
  WHERE "legacy_bubble_id" IS NOT NULL;
