-- ────────────────────────────────────────────────────────────────────────
-- 0013 — Admin actions audit log.
--
-- Every state-changing admin action (builder approval, account
-- suspension, project archival, tender intervention) writes a row
-- here. The trail is append-only — admins can read but never edit
-- past actions. Surfaces on the admin dashboard's activity feed and
-- on per-builder / per-user detail pages.
--
-- Schema notes:
--   - actor_id is on-delete SET NULL so the log survives an admin
--     account being deleted. We still want the audit trail.
--   - subject_* columns are nullable — different action kinds target
--     different subjects (user vs project vs tender). Exactly one
--     should be non-null per row in practice.
--   - meta jsonb carries before/after snapshots when useful (e.g.
--     a builder's previous approval_status before the flip).
-- ────────────────────────────────────────────────────────────────────────

CREATE TYPE "public"."admin_action_kind" AS ENUM (
  'builder_approved',
  'builder_rejected',
  'builder_suspended',
  'builder_unsuspended',
  'user_suspended',
  'user_unsuspended',
  'user_banned',
  'user_unbanned',
  'project_archived',
  'project_restored',
  'tender_force_decided'
);
--> statement-breakpoint

CREATE TABLE "admin_actions" (
  "id"                 uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_id"           uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "kind"               "admin_action_kind" NOT NULL,
  -- Exactly one of these is set per row in practice.
  "subject_user_id"    uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "subject_project_id" uuid REFERENCES "projects"("id") ON DELETE SET NULL,
  "subject_tender_id"  uuid REFERENCES "tenders"("id") ON DELETE SET NULL,
  -- Free-text reason captured at action time (e.g. why this builder
  -- was rejected). Surfaced verbatim in the admin UI.
  "reason"             text,
  -- Structured before/after payload. Shape varies by action kind.
  "meta"               jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at"         timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX "admin_actions_actor_idx"
  ON "admin_actions" ("actor_id", "created_at");
--> statement-breakpoint

CREATE INDEX "admin_actions_subject_user_idx"
  ON "admin_actions" ("subject_user_id", "created_at");
--> statement-breakpoint

CREATE INDEX "admin_actions_created_at_idx"
  ON "admin_actions" ("created_at");
