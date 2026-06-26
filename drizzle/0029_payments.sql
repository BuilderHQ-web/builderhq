-- ────────────────────────────────────────────────────────────────────────
-- 0029 — Payments ledger (Stripe paid unlocks).
--
-- One row per Stripe Checkout attempt for a paid project unlock. Created
-- `pending` when the Checkout Session opens and advanced by webhooks:
-- authorised → paid (captured) | canceled (slot filled, auth voided) |
-- refunded | failed. Manual-capture flow, so `canceled` means no funds
-- ever moved. builder_id / project_id are nullable + ON DELETE SET NULL so
-- the financial record survives a user/project deletion (the Stripe ids
-- remain the durable reconciliation keys).
-- ────────────────────────────────────────────────────────────────────────

CREATE TYPE "public"."payment_purpose" AS ENUM ('unlock');--> statement-breakpoint

CREATE TYPE "public"."payment_status" AS ENUM ('pending', 'authorised', 'paid', 'canceled', 'refunded', 'failed');--> statement-breakpoint

CREATE TABLE "payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "builder_id" uuid,
  "project_id" uuid,
  "purpose" "payment_purpose" DEFAULT 'unlock' NOT NULL,
  "status" "payment_status" DEFAULT 'pending' NOT NULL,
  "amount_aud" integer NOT NULL,
  "currency" text DEFAULT 'aud' NOT NULL,
  "stripe_checkout_session_id" text,
  "stripe_payment_intent_id" text,
  "failure_reason" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_builder_id_users_id_fk"
  FOREIGN KEY ("builder_id") REFERENCES "public"."users"("id")
  ON DELETE set null ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_project_id_projects_id_fk"
  FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id")
  ON DELETE set null ON UPDATE no action;--> statement-breakpoint

CREATE UNIQUE INDEX "payments_checkout_session_idx" ON "payments" USING btree ("stripe_checkout_session_id");--> statement-breakpoint

CREATE UNIQUE INDEX "payments_payment_intent_idx" ON "payments" USING btree ("stripe_payment_intent_id");--> statement-breakpoint

CREATE INDEX "payments_builder_idx" ON "payments" USING btree ("builder_id","created_at");--> statement-breakpoint

CREATE INDEX "payments_project_idx" ON "payments" USING btree ("project_id");
