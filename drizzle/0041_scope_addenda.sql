-- 0041 · scope addenda — the pack changes formally, never silently.
--
-- effective_at: the moment an approved run BECAME the round's schedule
-- (at publish acceptance, or when its addendum issued). A re-read can
-- be approved by ops without touching the live round; builders keep
-- pricing the effective pack until the runner issues the addendum.
--
-- scope_addenda: the numbered record of every re-issue. The diff is
-- denormalised at issue time so the record reads forever, even after
-- later runs supersede the rows it was computed from.

ALTER TABLE scope_runs ADD COLUMN IF NOT EXISTS effective_at timestamptz;

-- Backfill: packs approved before this migration were all live packs.
UPDATE scope_runs
SET effective_at = COALESCE(approved_at, created_at)
WHERE status = 'approved' AND effective_at IS NULL;

CREATE TABLE IF NOT EXISTS scope_addenda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  run_id uuid NOT NULL UNIQUE REFERENCES scope_runs(id) ON DELETE CASCADE,
  prev_run_id uuid REFERENCES scope_runs(id) ON DELETE SET NULL,
  number integer NOT NULL,
  diff jsonb NOT NULL DEFAULT '{}',
  note text,
  issued_by uuid REFERENCES users(id) ON DELETE SET NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, number)
);

CREATE INDEX IF NOT EXISTS scope_addenda_project_idx
  ON scope_addenda(project_id, number);

ALTER TYPE notification_kind ADD VALUE IF NOT EXISTS 'scope_addendum';
