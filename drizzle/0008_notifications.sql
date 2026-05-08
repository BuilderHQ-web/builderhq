-- ────────────────────────────────────────────────────────────────────────
-- 0008 — In-app notifications.
--
-- Backs the bell dropdown in the topbar. Email delivery is parallel
-- and stateless; this table is purely the in-app feed. Subject FKs
-- (project / tender) are nullable because not every kind targets both.
-- ────────────────────────────────────────────────────────────────────────

CREATE TYPE "public"."notification_kind" AS ENUM (
  'tender_submitted',
  'tender_withdrawn',
  'tender_shortlisted',
  'tender_awarded',
  'tender_rejected'
);--> statement-breakpoint

CREATE TABLE "notifications" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id"     uuid NOT NULL,
  "kind"        "notification_kind" NOT NULL,
  "project_id"  uuid,
  "tender_id"   uuid,
  "title"       text NOT NULL,
  "body"        text,
  "action_url"  text,
  "read_at"     timestamp with time zone,
  "created_at"  timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_project_id_projects_id_fk"
  FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id")
  ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_tender_id_tenders_id_fk"
  FOREIGN KEY ("tender_id") REFERENCES "public"."tenders"("id")
  ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "notifications_user_created_idx"
  ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_read_idx"
  ON "notifications" USING btree ("user_id","read_at");
