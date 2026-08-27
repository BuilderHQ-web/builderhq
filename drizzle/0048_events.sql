-- 0048_events
--
-- First-party behaviour, kept because no hosted tool can answer the
-- question that decides the budget: which advertisement produced the
-- architect who published a tender three weeks later. Half of that
-- sentence lives in this database.
--
-- anon_id joins to user_attribution.anon_id once somebody signs up.
-- Nothing here identifies a person on its own.

CREATE TABLE IF NOT EXISTS "events" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name"           text NOT NULL,

  "anon_id"        text,
  "session_id"     text,

  "path"           text,
  "lens"           text,

  "first_source"   text,
  "first_campaign" text,
  "last_source"    text,
  "last_medium"    text,
  "last_campaign"  text,
  "last_content"   text,
  "referrer"       text,

  "device"         text,
  "viewport_w"     integer,
  "viewport_h"     integer,

  "props"          jsonb,

  "created_at"     timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_name_created_idx" ON "events" ("name","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_anon_idx" ON "events" ("anon_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_session_idx" ON "events" ("session_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_last_campaign_idx" ON "events" ("last_campaign");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_created_idx" ON "events" ("created_at");
