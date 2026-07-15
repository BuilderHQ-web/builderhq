-- 0031 · user_devices
--
-- Native device registry for push notifications. One row per device
-- TOKEN — a user signing in on a second phone gets a second row, and
-- a phone changing hands (new sign-in on the same device) moves its
-- token row to the new user via upsert-on-token rather than
-- duplicating it.
--
-- Supersedes the single-device `users.expo_push_token` column pair,
-- which stays in place until the legacy Expo wrap is retired — the
-- send layer fans out over BOTH stores during the transition.
--
--   platform — where the app runs (ios | android)
--   provider — which push network the token belongs to
--              (apns | fcm | expo)
--
-- `last_seen_at` doubles as the freshness stamp: clients re-register
-- on every cold start, so anything stale past the send layer's 30-day
-- window is treated as an uninstall we missed. `revoked_at` is set on
-- per-device sign-out and when the provider reports the token
-- permanently dead; re-registration resurrects the row (revoked_at →
-- NULL).

CREATE TYPE "push_platform" AS ENUM ('ios', 'android');
--> statement-breakpoint
CREATE TYPE "push_provider" AS ENUM ('apns', 'fcm', 'expo');
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_devices" (
  "id"            uuid                      PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"       uuid                      NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "platform"      "push_platform"           NOT NULL,
  "provider"      "push_provider"           NOT NULL,
  -- Raw provider token (APNs hex, FCM registration id, Expo token).
  -- Unlike refresh tokens these are NOT secrets — they're useless
  -- without our provider credentials — so no hashing.
  "token"         text                      NOT NULL UNIQUE,
  -- Free-text label from the client (e.g. "Pixel 9 Pro"). Feeds a
  -- future "active devices" settings screen; null is fine.
  "device_label"  text,
  "last_seen_at"  timestamp with time zone  NOT NULL DEFAULT now(),
  "created_at"    timestamp with time zone  NOT NULL DEFAULT now(),
  "revoked_at"    timestamp with time zone
);
--> statement-breakpoint
-- Send-time fan-out: "all live devices for these user ids".
CREATE INDEX IF NOT EXISTS "user_devices_user_id_idx"
  ON "user_devices" ("user_id");
