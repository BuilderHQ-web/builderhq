-- 0051_lead_external_identity
--
-- Leads that arrive from someone else's form.
--
-- WHY THIS EXISTS. Meta Lead Ads deliver an Instant Form submission as
-- a webhook carrying only a `leadgen_id`; the fields are fetched
-- afterwards from the Graph API. Meta retries a delivery it does not
-- get a prompt 200 for, and will replay events during an outage, so
-- the SAME lead arrives more than once as a matter of routine. Without
-- a natural key the second delivery is a second lead, and someone
-- rings a homeowner twice.
--
-- The obvious shape would be a Meta-specific column. It is not the
-- right one: Google Lead Form Extensions, LinkedIn Lead Gen Forms and
-- TikTok Instant Forms all have exactly this problem and exactly this
-- solution, so the pair is generic — WHICH channel, and that channel's
-- own id for the row.
--
-- Deliberately NOT a new marketing_leads table. Every lead surface on
-- the platform already lands in `leads`: the admin views, the ops
-- notification path, the delivery-retry column and the soft delete all
-- read it. A parallel table would mean a lead that exists but that no
-- existing screen or process can see, which is a worse failure than
-- the duplicate this migration prevents.

ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "external_source" text;
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "external_id" text;
--> statement-breakpoint

-- The idempotency key. Partial, because every lead captured by our own
-- forms has neither column and must not collide with the others.
CREATE UNIQUE INDEX IF NOT EXISTS "leads_external_identity_idx"
  ON "leads" ("external_source", "external_id")
  WHERE "external_source" IS NOT NULL AND "external_id" IS NOT NULL;
--> statement-breakpoint

-- Instant Form submissions from Meta Lead Ads. The campaign, ad set,
-- ad and form identifiers ride in `meta` jsonb alongside the raw
-- payload, so a new advertising channel needs no schema change.
ALTER TYPE "lead_kind" ADD VALUE IF NOT EXISTS 'meta_instant_form';
