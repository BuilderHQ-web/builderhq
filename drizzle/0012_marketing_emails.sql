-- ────────────────────────────────────────────────────────────────────────
-- 0012 — Marketing emails + new notification kinds.
--
-- Wires the comms loop beyond tender-only events:
--
--   1. users.marketing_emails_enabled — opt-in/out flag for the bulk
--      "new project published" blast. Default true (we email by default
--      until the user unsubscribes), and the unsubscribe page flips it
--      false in one click.
--
--   2. users.unsubscribe_token — opaque per-user token used by the
--      /unsubscribe/[token] route. UNIQUE so the route can locate the
--      user from URL alone (no login required). Generated lazily on
--      first marketing send and persisted thereafter.
--
--   3. notification_kind enum gets two new values:
--      - project_published (builders' bell entry for the bulk fan-out)
--      - project_unlocked  (owner's bell entry when a builder unlocks)
--
--   4. Partial unique index on (user_id, kind, project_id) so a re-run
--      of a publish or unlock doesn't double-record. Covers the new
--      kinds only — tender events already dedup via (project_id,
--      tender_id) on the application side.
-- ────────────────────────────────────────────────────────────────────────

ALTER TABLE "users"
  ADD COLUMN "marketing_emails_enabled" boolean NOT NULL DEFAULT true,
  ADD COLUMN "unsubscribe_token" uuid;
--> statement-breakpoint

CREATE UNIQUE INDEX "users_unsubscribe_token_unique" ON "users" ("unsubscribe_token");
--> statement-breakpoint

ALTER TYPE "public"."notification_kind" ADD VALUE 'project_published';
--> statement-breakpoint
ALTER TYPE "public"."notification_kind" ADD VALUE 'project_unlocked';
--> statement-breakpoint

CREATE UNIQUE INDEX "notifications_publish_unlock_unique"
  ON "notifications" ("user_id", "kind", "project_id")
  WHERE "kind" IN ('project_published', 'project_unlocked');
