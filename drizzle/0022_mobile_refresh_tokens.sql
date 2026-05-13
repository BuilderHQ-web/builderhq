-- 0022 · mobile_refresh_tokens
--
-- Stateful refresh tokens for the mobile app's bearer-JWT auth flow.
-- Mobile clients receive a short-lived access JWT (15 min) for routine
-- request authentication, plus a long-lived refresh token (60 days)
-- they exchange for a new access JWT when the current one nears expiry.
--
-- The refresh tokens are *stateful*: the raw token only lives on the
-- device, but a SHA-256 hash is recorded here so we can:
--   · revoke a session immediately on logout
--   · detect refresh-token theft via the rotation chain (if a presented
--     token is already revoked, the entire chain is invalidated and
--     the user is forced to re-auth)
--   · build "sign out of all devices" later without schema churn
--
-- Rotation: every successful /refresh issues a new refresh token and
-- marks the previous one revoked, with `rotated_to_id` pointing at the
-- successor. The chain forms a linked list ending at the currently
-- active token (where rotated_to_id IS NULL AND revoked_at IS NULL).

CREATE TABLE IF NOT EXISTS "mobile_refresh_tokens" (
  "id"             uuid                         PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"        uuid                         NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  -- SHA-256 hex digest of the raw token. Storing only the hash means
  -- a DB leak doesn't compromise active sessions (raw token never
  -- written to disk on our side).
  "token_hash"     text                         NOT NULL UNIQUE,
  -- Free-text label from the client (e.g. "iPhone 17 Pro" via expo-
  -- device). Used in a future "active devices" settings screen — null
  -- is fine; we don't gate auth on it.
  "device_label"   text,
  "expires_at"     timestamp with time zone     NOT NULL,
  "revoked_at"     timestamp with time zone,
  -- If revoked because of rotation, points to the successor token row.
  -- If revoked because of logout / theft detection, stays NULL.
  "rotated_to_id"  uuid                         REFERENCES "mobile_refresh_tokens"("id") ON DELETE SET NULL,
  "created_at"     timestamp with time zone     NOT NULL DEFAULT now(),
  "last_used_at"   timestamp with time zone
);

-- Most lookups go through the hash on /refresh. Already UNIQUE so the
-- backing btree index suffices.
-- Per-user lookups for "active sessions" + cascade-revoke on logout.
CREATE INDEX IF NOT EXISTS "mobile_refresh_tokens_user_id_idx"
  ON "mobile_refresh_tokens" ("user_id");

-- Sweep-expired-tokens job query — find tokens past their TTL that we
-- can hard-delete to keep the table lean.
CREATE INDEX IF NOT EXISTS "mobile_refresh_tokens_expires_at_idx"
  ON "mobile_refresh_tokens" ("expires_at");
