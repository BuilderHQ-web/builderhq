-- 0040 · the publish gate + owner gap resolutions (S2, 2026-07-28).
--
-- Publishing becomes a ceremony when the gate is on: the owner
-- submits, the pipeline reads, ops reviews, the owner resolves every
-- gap, and only then does the round go live. The project's STATUS
-- stays 'draft' throughout preparation — nothing leaks to browse,
-- no fan-out fires — so the whole gate rides one timestamp:
--
--   publish_requested_at — set when the runner submits for
--   preparation; publication itself still flips status via the
--   existing publish path, keeping validation and fan-out
--   single-sourced.
--
-- scope_gap_resolutions records the owner's answer to every gap on
-- the approved run, in the ratified vocabulary:
--   allowance    — an owner-set sum (locked; the level playing field)
--   excluded     — deliberately outside this contract
--   upload_later — documents are coming; the project returns to
--                  preparation once they arrive
--
-- Also: 'scope_ready' notification kind — the runner hears when the
-- pack is ready to review.

ALTER TABLE "projects"
  ADD COLUMN IF NOT EXISTS "publish_requested_at" timestamp with time zone;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scope_gap_resolutions" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "run_id"      uuid NOT NULL REFERENCES "scope_runs"("id") ON DELETE CASCADE,
  "item_id"     text NOT NULL,
  -- allowance | excluded | upload_later
  "resolution"  text NOT NULL,
  -- Whole dollars AUD; required when resolution = 'allowance'.
  "amount_aud"  integer,
  "note"        text,
  "created_by"  uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"  timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "scope_gap_resolutions_run_item_idx"
  ON "scope_gap_resolutions" ("run_id", "item_id");
--> statement-breakpoint
ALTER TYPE "notification_kind" ADD VALUE IF NOT EXISTS 'scope_ready';
