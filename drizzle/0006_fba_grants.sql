-- ────────────────────────────────────────────────────────────────────────
-- 0006 — Founding Builder Access (FBA) grants.
-- ────────────────────────────────────────────────────────────────────────

CREATE TYPE "public"."fba_source" AS ENUM ('founding', 'manual_admin');--> statement-breakpoint

CREATE TABLE "fba_grants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "builder_id" uuid NOT NULL,
  "start_at" timestamp with time zone DEFAULT now() NOT NULL,
  "end_at" timestamp with time zone NOT NULL,
  "monthly_quota" integer DEFAULT 5 NOT NULL,
  "source" "fba_source" DEFAULT 'founding' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "revoked_at" timestamp with time zone
);
--> statement-breakpoint

ALTER TABLE "fba_grants"
  ADD CONSTRAINT "fba_grants_builder_id_users_id_fk"
  FOREIGN KEY ("builder_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "fba_grants_builder_end_idx" ON "fba_grants" USING btree ("builder_id","end_at");
