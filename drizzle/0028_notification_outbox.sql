-- 0028 — notification_outbox: durable email send queue.
--
-- Bulk email fan-outs (project_published → builders) used to send inline
-- in the publish request via a throttled batch loop. On Vercel the
-- function is killed shortly after the response, so only the first batch
-- ever sent (this dropped most builders on Brunswick AND Footscray).
--
-- Now publish does ONE fast bulk insert here, and a Vercel cron
-- (/api/cron/notification-outbox) drains it in retry-safe batches. A
-- claimed row goes to 'sending' with next_attempt_at = now()+lease; if
-- the drainer dies mid-send the lease expires and the row is re-claimed,
-- so nothing is lost and nothing double-sends.

CREATE TABLE IF NOT EXISTS "notification_outbox" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "kind" text NOT NULL,
  "to_email" text NOT NULL,
  "user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
  "project_id" uuid REFERENCES "projects"("id") ON DELETE CASCADE,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "last_error" text,
  "resend_id" text,
  "next_attempt_at" timestamptz DEFAULT now() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "sent_at" timestamptz
);

CREATE INDEX IF NOT EXISTS "notif_outbox_status_next_idx"
  ON "notification_outbox" ("status", "next_attempt_at");

-- Idempotency: at most one row per (kind, recipient, project), so a
-- re-publish or double dispatch never double-enqueues.
CREATE UNIQUE INDEX IF NOT EXISTS "notif_outbox_kind_email_project_unique"
  ON "notification_outbox" ("kind", "to_email", "project_id");
