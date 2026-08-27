-- 0050_builder_credits
--
-- Account credit, denominated in whole Australian dollars.
--
-- WHY THIS EXISTS. Six ACT rounds went to market in mid-2026 on
-- documentation that was not tender ready. Two builders paid to unlock
-- them: ELM Building Group and ACLASS Homes, $1,491 between them. The
-- right remedy is to make them whole without a card refund, so the
-- money stays on the platform as credit they choose when to spend.
--
-- The shape is a LEDGER, not a balance column. A mutable balance is one
-- lost update away from giving away unlocks that were never funded, and
-- there is no way to audit it after the fact. Instead:
--
--   credit_grants      — what was given, and when it stops being valid
--   credit_redemptions — what was spent, and against which grant
--
-- Balance is always derived:
--   available = SUM(grant.amount_aud) - SUM(redemption.amount_aud)
--               over grants that are neither revoked nor expired.
--
-- A single unlock may draw on more than one grant, so redemptions are
-- per-grant rows. Consumption is soonest-expiring-first, so a builder
-- never loses value they could have used.
--
-- Expiry is lazy on purpose. A grant past expires_at simply stops
-- counting on the next read, which needs no cron and cannot half-run.

CREATE TABLE IF NOT EXISTS "credit_grants" (
  "id"              uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "builder_id"      uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,

  -- Whole AUD dollars, matching payments.amount_aud. Always positive.
  "amount_aud"      integer NOT NULL,

  -- Machine key for why this was issued, so a cohort can be found
  -- later without parsing prose. e.g. 'documentation_shortfall'.
  "reason"          text NOT NULL,

  -- The sentence the builder actually reads on their dashboard.
  "note"            text,

  -- Who issued it. Null for grants made by script rather than a person.
  "granted_by"      uuid REFERENCES "users"("id") ON DELETE SET NULL,

  "granted_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "expires_at"      timestamp with time zone NOT NULL,

  -- Stamped when the builder dismisses the announcement. Null means
  -- they have not been told yet, which is what drives the card.
  "acknowledged_at" timestamp with time zone,

  -- Pulled early by an admin. Treated exactly like expired.
  "revoked_at"      timestamp with time zone,

  CONSTRAINT "credit_grants_amount_positive" CHECK ("amount_aud" > 0)
);
--> statement-breakpoint

-- The hot path is "what can this builder spend right now", which reads
-- every live grant for one builder.
CREATE INDEX IF NOT EXISTS "credit_grants_builder_expiry_idx"
  ON "credit_grants" ("builder_id", "expires_at");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "credit_redemptions" (
  "id"          uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "grant_id"    uuid NOT NULL REFERENCES "credit_grants"("id") ON DELETE CASCADE,

  -- Denormalised from the grant so a balance never needs the join.
  "builder_id"  uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,

  -- Whole AUD dollars. Always positive; the sign lives in the table name.
  "amount_aud"  integer NOT NULL,

  -- What it bought. Kept ON DELETE SET NULL so the ledger survives a
  -- project being removed: the money was still spent.
  "project_id"  uuid REFERENCES "projects"("id") ON DELETE SET NULL,
  "unlock_id"   uuid REFERENCES "unlocks"("id") ON DELETE SET NULL,

  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),

  CONSTRAINT "credit_redemptions_amount_positive" CHECK ("amount_aud" > 0)
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "credit_redemptions_grant_idx"
  ON "credit_redemptions" ("grant_id");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "credit_redemptions_builder_idx"
  ON "credit_redemptions" ("builder_id", "created_at");
--> statement-breakpoint

-- One unlock is funded once. Without this, a retried request could
-- debit the ledger twice for the same unlock row.
CREATE UNIQUE INDEX IF NOT EXISTS "credit_redemptions_unlock_grant_idx"
  ON "credit_redemptions" ("unlock_id", "grant_id")
  WHERE "unlock_id" IS NOT NULL;
--> statement-breakpoint

-- 'credit' joins free / founding / paid / admin / invited. Adding a
-- value is safe inside a transaction on PG 12+; it may not be USED
-- until this transaction commits, and nothing here uses it.
ALTER TYPE "unlock_source" ADD VALUE IF NOT EXISTS 'credit';
