-- 0025 — add Expo push notification token columns to users.
--
-- Single-device for now: `expo_push_token` holds the most-recently
-- registered token for that user's mobile app session. When the user
-- signs in on a new device the column gets overwritten. We track the
-- last update timestamp so notification dispatch can decide whether
-- to skip stale tokens (older than 30 days = probably uninstalled).
--
-- Multi-device support (phone + tablet etc.) will move this onto a
-- separate user_devices table when usage warrants it.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "expo_push_token" text;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "expo_push_token_updated_at" timestamp with time zone;

-- No index — we look up by user_id (already the primary key path) and
-- never query by token value. Add an index later if we add a
-- token-blacklist or duplicate-token cleanup job.
