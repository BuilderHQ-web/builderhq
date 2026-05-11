-- Legacy source URL on `documents`.
--
-- Stores the original Bubble CDN URL for every document migrated by
-- scripts/migrate-bubble/04-files.mjs. Two roles:
--
--   1. Idempotency: the migration script's "did we already migrate
--      this file?" check is keyed on (project_id, legacy_source_url).
--      Re-runs of phase 4 don't duplicate documents.
--
--   2. Audit trail: for debugging — if a builder reports "this PDF
--      looks corrupted", we can resolve back to the Bubble URL it
--      came from and re-fetch from the original source.
--
-- NULL for documents uploaded directly through the new app — only
-- migration imports populate it.

ALTER TABLE "documents"
  ADD COLUMN IF NOT EXISTS "legacy_source_url" text;

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "documents_legacy_source_url_idx"
  ON "documents" ("legacy_source_url")
  WHERE "legacy_source_url" IS NOT NULL;
