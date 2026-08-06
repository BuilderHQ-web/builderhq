-- 0044 · the living vocabulary (2026-08-03).
--
-- Every discovery joins the list. scope_vocab_extensions holds the
-- items the platform LEARNS from real packages — work the authored
-- Standard does not name yet. Two tiers, one table:
--
--   status 'extension' — in the list, never in the denominator. The
--       item is evidenced when a project's documents show the work
--       (the digest offers it to the model; repeat captures auto-map
--       to it), but its absence is never a gap: a wine cellar missing
--       from a project is not a hole in the tender.
--
--   status 'core' — promoted into the expected pool for the project
--       types in applies_to. From promotion on, it joins the residual
--       complement: absent means gap or not_expected, judged like any
--       authored item.
--
-- Keys are permanent: "ext.<division>.<slug>", never renamed, exactly
-- like authored ids. Citations, schedule marks and builder answers
-- hang off them across projects — which is what today's project-
-- scoped custom lines could never give us.

CREATE TABLE IF NOT EXISTS "scope_vocab_extensions" (
  "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "key"               text NOT NULL UNIQUE,
  "division_id"       text NOT NULL,
  "label"             text NOT NULL,
  "plain"             text,
  "aliases"           jsonb NOT NULL DEFAULT '[]',
  -- extension | core | retired
  "status"            text NOT NULL DEFAULT 'extension',
  -- Project types a CORE extension is expected on (jsonb string array).
  "applies_to"        jsonb NOT NULL DEFAULT '[]',
  "source_capture_id" uuid,
  "created_by"        uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at"        timestamptz NOT NULL DEFAULT now(),
  "updated_at"        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "scope_vocab_extensions_status_idx"
  ON "scope_vocab_extensions" ("status");
