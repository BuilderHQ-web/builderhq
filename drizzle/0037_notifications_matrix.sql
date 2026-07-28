-- 0037 · the notifications matrix + the audit log (2026-07-28).
--
-- Three pieces:
--   1. project_audit_events — who did what on a round, recorded at the
--      service layer. Now that seats act (a decider can award), the
--      question "who awarded this?" must have a durable answer. Kind
--      is TEXT, not an enum: audit vocabularies grow too fast to
--      migrate every verb.
--   2. Two new notification kinds: participant_joined (a seat was
--      claimed — the runner hears) and tender_validity_expiring (a
--      priced tender's validity window is closing — the owner side
--      hears before the price lapses).
--   3. reminded_at markers on both invitation tables so the daily
--      nudge cron sends exactly one reminder per invitation.

CREATE TABLE IF NOT EXISTS "project_audit_events" (
  "id"          uuid                      PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id"  uuid                      NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  -- NULL = the platform itself (cron, system transitions).
  "actor_id"    uuid                      REFERENCES "users"("id") ON DELETE SET NULL,
  -- Dotted verb, e.g. 'tender.awarded', 'seat.invited', 'invite.joined'.
  "kind"        text                      NOT NULL,
  -- The row the verb acted on (tender id, participant id, invite id).
  "subject_id"  uuid,
  -- Human line composed at write time, e.g.
  -- "Alex Owner awarded the tender from Corten Build Co."
  "summary"     text                      NOT NULL,
  "meta"        jsonb                     NOT NULL DEFAULT '{}',
  "created_at"  timestamp with time zone  NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_audit_events_project_idx"
  ON "project_audit_events" ("project_id", "created_at" DESC);
--> statement-breakpoint
ALTER TYPE "notification_kind" ADD VALUE IF NOT EXISTS 'participant_joined';
--> statement-breakpoint
ALTER TYPE "notification_kind" ADD VALUE IF NOT EXISTS 'tender_validity_expiring';
--> statement-breakpoint
ALTER TABLE "project_participants"
  ADD COLUMN IF NOT EXISTS "reminded_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "tender_builder_invites"
  ADD COLUMN IF NOT EXISTS "reminded_at" timestamp with time zone;
