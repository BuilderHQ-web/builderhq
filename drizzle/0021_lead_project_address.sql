-- 0021 — promote architect-tender fields from leads.meta jsonb to
-- first-class columns.
--
-- Background:
--   The leads table was originally generic — first_name, email, phone +
--   a meta jsonb for per-flow extras. That worked when the only flows
--   were `guide_melbourne_build_brief` (no extras) and `estimate_request`
--   (project type, company name — both lookup-rare).
--
--   The /architect-tender flow is different. The project address is THE
--   pivot column: it's how we tie a submission back to its PlanningAlerts
--   entry, dedupe against existing submissions, build an admin list view,
--   and search ("did we already onboard this address?"). Reading it from
--   `meta->>'project_address'` works but blocks indexing + makes every
--   admin query verbose.
--
--   Surname + practice name get the same treatment for the same reason:
--   they're searched in ops triage. They're nullable so other lead kinds
--   (guide, estimate_request) are unaffected — they just leave the new
--   columns NULL.
--
-- Migration safety:
--   · ADD COLUMN IF NOT EXISTS — re-runnable.
--   · NULL allowed — no backfill needed.
--   · Index added on lower(project_address) so case-insensitive lookups
--     are fast ("67 bowes ave" matches "67 Bowes Avenue").

ALTER TABLE "leads"
  ADD COLUMN IF NOT EXISTS "last_name" text;

ALTER TABLE "leads"
  ADD COLUMN IF NOT EXISTS "practice_name" text;

ALTER TABLE "leads"
  ADD COLUMN IF NOT EXISTS "project_address" text;

CREATE INDEX IF NOT EXISTS "leads_project_address_lower_idx"
  ON "leads" (lower("project_address"))
  WHERE "project_address" IS NOT NULL;
