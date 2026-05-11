-- Claim tokens for the Bubble migration.
--
-- Every Bubble user gets imported into Neon's `users` table with:
--   - password_hash = NULL   (bcrypt → argon2 is one-way; we can't
--                             port the hash, so the user must set a
--                             new password)
--   - claim_token  = <uuid>  (single-use token sent in the launch
--                             email; the only way to claim the
--                             account and set the password)
--   - claim_token_expires_at = now() + 90 days
--
-- The /claim/[token] page validates the token, lets the user pick
-- a new password, hashes with argon2, clears the token, and signs
-- them in. After that point the account behaves like any other.
--
-- Legacy columns (legacy_bubble_id + legacy_source) preserve the
-- audit trail back to Bubble's user IDs for debugging / re-running
-- specific migration entries / answering "where did this user come
-- from?" questions in the admin UI.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "claim_token" uuid,
  ADD COLUMN IF NOT EXISTS "claim_token_expires_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "legacy_bubble_id" text,
  ADD COLUMN IF NOT EXISTS "legacy_source" text;

--> statement-breakpoint

-- Unique so two users can't share a token. Partial index because
-- most users have NULL (only freshly-migrated accounts hold one
-- until they claim).
CREATE UNIQUE INDEX IF NOT EXISTS "users_claim_token_unique"
  ON "users" ("claim_token")
  WHERE "claim_token" IS NOT NULL;

--> statement-breakpoint

-- Lookup-by-legacy-id (used by the idempotent migration scripts and
-- the admin "where did this user come from?" surface).
CREATE INDEX IF NOT EXISTS "users_legacy_bubble_id_idx"
  ON "users" ("legacy_bubble_id")
  WHERE "legacy_bubble_id" IS NOT NULL;
