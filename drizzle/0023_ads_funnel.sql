-- Ads-funnel schema additions.
-- See: src/modules/auth/schema.ts (verificationTokenPurposeEnum + verificationTokens.purpose)
--      src/modules/projects/schema.ts (awaitingOwnerVerification, acquisitionSource)

-- 1. Discriminate verification_tokens by purpose so a magic-link
-- redemption never collides with an email-verification click.
CREATE TYPE "public"."verification_token_purpose" AS ENUM (
  'verification',
  'password_reset',
  'magic_link'
);

ALTER TABLE "verification_tokens"
  ADD COLUMN "purpose" "verification_token_purpose"
  NOT NULL
  DEFAULT 'verification';

-- Backfill existing rows that the old code namespaced via identifier
-- prefix (PWRESET_PREFIX = 'pwreset:'). Without this, the new purpose
-- filter in resetPassword would treat existing pending resets as
-- email-verification tokens and refuse them.
UPDATE "verification_tokens"
  SET "purpose" = 'password_reset'
  WHERE "identifier" LIKE 'pwreset:%';

-- 2. Projects that came through /start before the owner verified their
-- email. Stays out of the marketplace until /auth/magic redemption
-- flips both this flag (false) and publishedAt (now).
ALTER TABLE "projects"
  ADD COLUMN "awaiting_owner_verification" boolean NOT NULL DEFAULT false;

-- 3. Acquisition channel. Drives the Inngest 30-day GC job (only
-- ads_funnel drafts are auto-pruned) and per-campaign attribution.
ALTER TABLE "projects"
  ADD COLUMN "acquisition_source" text;

-- 4. Partial index — most projects are NULL here, so a partial index
-- on ads_funnel drafts keeps the GC scan tight without dragging the
-- main project queries.
CREATE INDEX IF NOT EXISTS "projects_ads_funnel_unverified_idx"
  ON "projects" ("created_at")
  WHERE "acquisition_source" = 'ads_funnel'
    AND "awaiting_owner_verification" = true;
