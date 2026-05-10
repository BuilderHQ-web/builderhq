-- ────────────────────────────────────────────────────────────────────────
-- 0010 — Builder verifications (ABR + state licence registries).
--
-- One row per verification attempt. Audit-grade history: retries are new
-- rows, the full provider response is archived, and the row is what the
-- field-lock check reads — if a `verified` row exists for a builder's
-- current ABN, the ABN field is locked. Same for licences.
--
-- Profile additions: `trading_name` (editable marketing label) splits
-- from `company_name` (legal entity name from ABR, locked once verified).
-- `approved_via` records whether approval was automatic (both checks
-- passed) or manual (admin override) — useful operational signal.
-- ────────────────────────────────────────────────────────────────────────

CREATE TYPE "public"."verification_kind" AS ENUM ('abn', 'licence');--> statement-breakpoint

CREATE TYPE "public"."verification_status" AS ENUM (
  'pending',
  'verified',
  'mismatch',
  'inactive',
  'not_found',
  'error'
);--> statement-breakpoint

CREATE TABLE "builder_verifications" (
  "id"                 uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "builder_id"         uuid NOT NULL,
  "kind"               "verification_kind" NOT NULL,
  -- Points to builder_licences.id when kind='licence'; null for kind='abn'.
  -- No FK on purpose: keeps audit history even if the licence row is later
  -- deleted (soft history). The CHECK below enforces shape.
  "target_id"          uuid,
  "subject_value"      text NOT NULL,
  "status"             "verification_status" NOT NULL,
  "provider"           text NOT NULL,
  "provider_response"  jsonb,
  "matched_name"       text,
  "expires_at"         timestamp with time zone,
  "reason"             text,
  "verified_at"        timestamp with time zone DEFAULT now() NOT NULL,
  -- Optional re-verification deadline. Cron sweeps + flags stale rows.
  "ttl_at"             timestamp with time zone,
  "created_at"         timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "builder_verifications_target_consistent" CHECK (
    (kind = 'abn'     AND target_id IS NULL) OR
    (kind = 'licence' AND target_id IS NOT NULL)
  )
);
--> statement-breakpoint

ALTER TABLE "builder_verifications"
  ADD CONSTRAINT "builder_verifications_builder_id_users_id_fk"
  FOREIGN KEY ("builder_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "builder_verifications_builder_kind_idx"
  ON "builder_verifications" USING btree
  ("builder_id","kind","verified_at" DESC);--> statement-breakpoint

CREATE INDEX "builder_verifications_target_idx"
  ON "builder_verifications" USING btree
  ("target_id","verified_at" DESC) WHERE target_id IS NOT NULL;--> statement-breakpoint

-- ── builder_profiles additions ──────────────────────────────────────────

ALTER TABLE "builder_profiles" ADD COLUMN "trading_name" text;--> statement-breakpoint
ALTER TABLE "builder_profiles" ADD COLUMN "approved_via" text;
