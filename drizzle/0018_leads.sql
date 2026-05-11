-- Leads table — captures inbound interest from marketing landing pages.
--
-- Two flows today, both leading here:
--   1. /guide  → "Melbourne Build Brief" PDF download form
--   2. /estimate-request (next) → free estimate-request page
--
-- The same shape supports more landing pages by adding values to
-- `lead_kind`. Per-page specifics (which guide variant, what they're
-- estimating, postcode, etc.) live in `meta` jsonb so we don't churn
-- the schema for every new acquisition surface.

CREATE TYPE "lead_kind" AS ENUM (
  'guide_melbourne_build_brief',
  'estimate_request'
);

--> statement-breakpoint

CREATE TABLE "leads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  "kind" lead_kind NOT NULL,

  -- Identity (what the user typed).
  "first_name" text NOT NULL,
  "email"      text NOT NULL,
  "phone"      text,

  -- Attribution — where they came from. utm_source / utm_campaign / etc.
  "source"     text,

  -- Audit trail — IP + UA so admins can spot bot floods later.
  "ip"         text,
  "user_agent" text,

  -- Per-flow data we don't normalize: which guide variant downloaded,
  -- which property type they're estimating, postcode, project notes,
  -- whatever the landing page collects beyond the canonical fields.
  "meta"       jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Did the user-facing email send succeed? Failures are non-fatal
  -- but we want to know about them in the admin dashboard for
  -- manual follow-up.
  "delivered_at" timestamptz,
  "delivery_error" text,

  -- Did the ops-notification email send succeed?
  "ops_notified_at" timestamptz,

  "created_at" timestamptz NOT NULL DEFAULT now(),

  -- Soft-delete so we never lose lead history on accidental ops deletes.
  "deleted_at" timestamptz
);

--> statement-breakpoint

-- Hot path: admin leads dashboard scoped by kind, newest first.
CREATE INDEX "leads_kind_created_at_idx"
  ON "leads" ("kind", "created_at" DESC)
  WHERE "deleted_at" IS NULL;

--> statement-breakpoint

-- Email lookup: dedup / follow-up admin queries / cross-reference
-- if the same person later signs up for an account.
CREATE INDEX "leads_email_idx"
  ON "leads" (lower("email"))
  WHERE "deleted_at" IS NULL;
