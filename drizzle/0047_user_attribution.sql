-- 0047_user_attribution
--
-- Where an account came from, in full.
--
-- users.signup_source / users.signup_campaign stay as they are: two
-- columns of last touch, read by code that already exists. This is the
-- complete record beside them, carrying first touch as well, so a
-- campaign that introduced somebody a fortnight before they signed up
-- can still be credited for it.
--
-- anon_id is the join to behaviour recorded before the account existed.

CREATE TABLE IF NOT EXISTS "user_attribution" (
  "user_id"         uuid PRIMARY KEY NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "anon_id"         text,

  "first_source"    text,
  "first_medium"    text,
  "first_campaign"  text,
  "first_content"   text,
  "first_term"      text,
  "first_referrer"  text,
  "first_landing"   text,
  "first_at"        timestamp with time zone,

  "last_source"     text,
  "last_medium"     text,
  "last_campaign"   text,
  "last_content"    text,
  "last_term"       text,
  "last_referrer"   text,
  "last_landing"    text,
  "last_at"         timestamp with time zone,

  "gclid"           text,
  "fbclid"          text,

  "created_at"      timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_attribution_anon_idx" ON "user_attribution" ("anon_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_attribution_first_campaign_idx" ON "user_attribution" ("first_campaign");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_attribution_last_campaign_idx" ON "user_attribution" ("last_campaign");
