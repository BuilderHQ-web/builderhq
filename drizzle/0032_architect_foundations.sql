-- 0032 · architect_foundations
--
-- Foundations for the architect platform: architects run tenders on
-- behalf of clients, with three round modes and hand-picked builders.
--
--   user_role + 'architect'      — new first-class role (open signup)
--   unlock_source + 'invited'    — invited builders join free; the
--                                  unlock still occupies a tender spot
--   architect_profiles           — the studio identity (light for now)
--   projects.tender_mode         — open | private | hybrid
--   projects.tender_spots        — per-project builder cap 2–5;
--                                  NULL = platform default (3), the
--                                  exact pattern unlocks/constants.ts
--                                  documented for this evolution
--   project_participants         — the homeowner's seat on an
--                                  architect-run project (invited at
--                                  any stage, sees everything on join)
--   tender_builder_invites       — hand-picked builders, on-platform
--                                  (directory) or off-platform (email
--                                  fast-lane that lands them in the
--                                  tender)
--   tenders.instrument_version   — which structured-submission
--                                  question set the answers belong to
--   tender_responses             — one row per (tender, question);
--                                  typed jsonb answers so comparison
--                                  joins across builders per question
--
-- Everything is additive. Existing projects stay mode 'open' with
-- NULL spots (= 3), so nothing changes for current owners/builders.

ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'architect';
--> statement-breakpoint
ALTER TYPE "unlock_source" ADD VALUE IF NOT EXISTS 'invited';
--> statement-breakpoint
CREATE TYPE "tender_mode" AS ENUM ('open', 'private', 'hybrid');
--> statement-breakpoint
CREATE TYPE "participant_status" AS ENUM ('invited', 'joined', 'revoked');
--> statement-breakpoint
CREATE TYPE "builder_invite_status" AS ENUM ('invited', 'joined', 'declined', 'revoked');
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "architect_profiles" (
  "user_id"                  uuid                      PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "practice_name"            text                      NOT NULL,
  -- Studio home base — pre-fills tender defaults, never published.
  "suburb"                   text,
  "state"                    "australian_state",
  "contact_phone"            text,
  -- Set when onboarding completes. NULL = in progress.
  "onboarding_completed_at"  timestamp with time zone,
  "created_at"               timestamp with time zone  NOT NULL DEFAULT now(),
  "updated_at"               timestamp with time zone  NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "architect_profiles_state_idx"
  ON "architect_profiles" ("state");
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "tender_mode" "tender_mode" NOT NULL DEFAULT 'open';
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "tender_spots" integer;
--> statement-breakpoint
-- Sanity: spots, when set, must be 2–5 (service validates; DB backstops).
ALTER TABLE "projects" ADD CONSTRAINT "projects_tender_spots_range"
  CHECK ("tender_spots" IS NULL OR ("tender_spots" >= 2 AND "tender_spots" <= 5));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_participants" (
  "id"            uuid                      PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id"    uuid                      NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  -- Who sent the invite (the project runner).
  "invited_by"    uuid                      NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  -- Invitee identity as entered by the architect.
  "email"         text                      NOT NULL,
  "name"          text,
  -- Set when the invite is redeemed by a signed-in account.
  "user_id"       uuid                      REFERENCES "users"("id") ON DELETE SET NULL,
  "status"        "participant_status"      NOT NULL DEFAULT 'invited',
  -- Single-use redemption token carried by the invite link.
  "invite_token"  text                      NOT NULL,
  "invited_at"    timestamp with time zone  NOT NULL DEFAULT now(),
  "joined_at"     timestamp with time zone,
  "revoked_at"    timestamp with time zone,
  "created_at"    timestamp with time zone  NOT NULL DEFAULT now(),
  "updated_at"    timestamp with time zone  NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "project_participants_token_idx"
  ON "project_participants" ("invite_token");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_participants_project_idx"
  ON "project_participants" ("project_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_participants_user_idx"
  ON "project_participants" ("user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tender_builder_invites" (
  "id"               uuid                      PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id"       uuid                      NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  -- Who sent the invite (the project runner).
  "invited_by"       uuid                      NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  -- On-platform pick; also set when an off-platform invite joins.
  "builder_user_id"  uuid                      REFERENCES "users"("id") ON DELETE CASCADE,
  -- Off-platform invitee details as entered by the runner.
  "email"            text,
  "contact_name"     text,
  "company"          text,
  "status"           "builder_invite_status"   NOT NULL DEFAULT 'invited',
  -- Invited builders quote free (open spots stay paid).
  "free_access"      boolean                   NOT NULL DEFAULT true,
  -- Single-use redemption token carried by the invite link.
  "invite_token"     text                      NOT NULL,
  "invited_at"       timestamp with time zone  NOT NULL DEFAULT now(),
  "responded_at"     timestamp with time zone,
  "created_at"       timestamp with time zone  NOT NULL DEFAULT now(),
  "updated_at"       timestamp with time zone  NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tender_builder_invites_token_idx"
  ON "tender_builder_invites" ("invite_token");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tender_builder_invites_project_idx"
  ON "tender_builder_invites" ("project_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tender_builder_invites_builder_idx"
  ON "tender_builder_invites" ("builder_user_id");
--> statement-breakpoint
ALTER TABLE "tenders" ADD COLUMN IF NOT EXISTS "instrument_version" integer;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tender_responses" (
  "id"          uuid                      PRIMARY KEY DEFAULT gen_random_uuid(),
  "tender_id"   uuid                      NOT NULL REFERENCES "tenders"("id") ON DELETE CASCADE,
  -- Stable question id from the instrument, e.g. 'price.fixed'.
  "qid"         text                      NOT NULL,
  -- Typed answer payload shaped by the question type (see schema.ts).
  "value"       jsonb                     NOT NULL,
  "updated_at"  timestamp with time zone  NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tender_responses_tender_qid_idx"
  ON "tender_responses" ("tender_id", "qid");
