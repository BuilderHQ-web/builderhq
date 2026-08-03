-- 0036 · participant roles (2026-07-28).
--
-- A participant's seat carries a role. Two roles, deliberately few:
--   viewer  — sees the project and the evaluation ("Following" in UI)
--   decider — everything a viewer sees, plus decision powers:
--             shortlist, decline, award ("Deciding" in UI)
-- Neither role edits the project or manages the round — that stays
-- with the runner (ownerId). Role names in code are cold on purpose;
-- the UI wears the warm labels.

CREATE TYPE "participant_role" AS ENUM ('viewer', 'decider');
--> statement-breakpoint
ALTER TABLE "project_participants"
  ADD COLUMN "role" "participant_role" NOT NULL DEFAULT 'viewer';
