-- 0020 — add `architect_tender` to the lead_kind enum.
--
-- Used by /architect-tender, the private confirmation page for the
-- Moonee Valley + Merri-bek cold-outreach campaign aimed at Melbourne
-- architects whose planning permit applications appeared on
-- PlanningAlerts. One lead row per confirmation submit; per-form
-- specifics (surname, practice_name, project_address, consent flag,
-- ref param) ride in the existing `meta` jsonb column on `leads` —
-- same pattern as `estimate_request`.
--
-- Postgres requires ALTER TYPE ... ADD VALUE to run outside a
-- transaction. Drizzle's migration runner is fine with the bare
-- statement; if you ever migrate by piping this file through psql,
-- pass `--single-transaction=false` or run it standalone.

ALTER TYPE "lead_kind" ADD VALUE IF NOT EXISTS 'architect_tender';
