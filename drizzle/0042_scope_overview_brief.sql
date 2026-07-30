-- 0042 · the pack learns to describe the project, and the client
-- learns to describe themselves.
--
-- scope_runs.overview: synthesis now writes a short project overview
-- (summary prose, no address, plus the countable facts it read:
-- dwellings, bedrooms, bathrooms, storeys). The pack review uses it to
-- verify what the runner typed by hand and to offer a documents-true
-- description. jsonb because its shape belongs to the pipeline.
--
-- projects.owner_brief: the client's pre-tender brief — the handful of
-- click-based answers builders would otherwise ask at a pre-tender
-- meeting (who they are, how the build is funded, decision timing,
-- site occupancy, priority, selections readiness). Answered once by
-- the runner; shown to builders on the round.

ALTER TABLE scope_runs ADD COLUMN IF NOT EXISTS overview jsonb;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS owner_brief jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS owner_brief_at timestamptz;
