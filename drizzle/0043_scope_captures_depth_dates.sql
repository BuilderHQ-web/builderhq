-- 0043 · the open capture lane, the Partial grade, and the baseline
-- check's raw material (2026-08-03).
--
-- The closed vocabulary stays the spine; this migration abolishes the
-- silent drop around it:
--
--   scope_run_captures — OFF-STANDARD CAPTURES: work the model saw
--       that no Standard item names (a residential lift, before
--       v1.1). Each carries a proposed label, a suggested division,
--       citations and the model's note. Ops promotes a capture into
--       the run's selection as a project-scoped custom line, or
--       dismisses it. Recurring captures are the Standard's growth
--       votes, ranked on the metrics desk.
--
--   scope_run_items gains:
--     label     — display label for custom (promoted) lines whose
--                 itemId is outside the Standard ("custom.*"). NULL
--                 for Standard items, whose labels live in code.
--     depth     — the Partial grade on evidenced lines: 'full' when
--                 the documents give a builder enough to price
--                 without assumption, 'partial' when the work is
--                 shown but quantities, specification or performance
--                 are incomplete. NULL on gaps/not_expected.
--     remaining — one line naming what is still needed when depth is
--                 partial ("shown on plans; no written specification").
--
--   scope_run_documents gains:
--     issue_date  — the date printed in the title block, read at
--                   classification. The deterministic baseline check
--                   cross-examines these: an energy report assessed
--                   against drawings two revisions old is a finding
--                   no model judgement is needed for.
--     client_name — the client/project name in the title block, so
--                   code can flag packs whose documents name
--                   different clients.
--
--   scope_run_conflicts gains:
--     source — 'model' (synthesis) or 'baseline' (the deterministic
--              date/entity cross-examination), so the desk and the
--              metrics page can tell judgement from arithmetic.

CREATE TABLE IF NOT EXISTS "scope_run_captures" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "run_id"           uuid NOT NULL REFERENCES "scope_runs"("id") ON DELETE CASCADE,
  "label"            text NOT NULL,
  "division_id"      text,
  "citations"        jsonb NOT NULL DEFAULT '[]',
  "note"             text,
  "confidence"       real,
  -- pending → promoted | dismissed
  "ops_status"       text NOT NULL DEFAULT 'pending',
  -- The custom item id this capture became, when promoted.
  "promoted_item_id" text,
  "created_at"       timestamptz NOT NULL DEFAULT now(),
  "updated_at"       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "scope_run_captures_run_idx"
  ON "scope_run_captures" ("run_id");

ALTER TABLE "scope_run_items"     ADD COLUMN IF NOT EXISTS "label"       text;
ALTER TABLE "scope_run_items"     ADD COLUMN IF NOT EXISTS "depth"       text;
ALTER TABLE "scope_run_items"     ADD COLUMN IF NOT EXISTS "remaining"   text;
ALTER TABLE "scope_run_documents" ADD COLUMN IF NOT EXISTS "issue_date"  date;
ALTER TABLE "scope_run_documents" ADD COLUMN IF NOT EXISTS "client_name" text;
ALTER TABLE "scope_run_conflicts" ADD COLUMN IF NOT EXISTS "source"      text NOT NULL DEFAULT 'model';
