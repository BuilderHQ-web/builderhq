-- ────────────────────────────────────────────────────────────────────────
-- 0005 — unlocks + saved_projects tables for the builder marketplace.
-- ────────────────────────────────────────────────────────────────────────

CREATE TYPE "public"."unlock_source" AS ENUM ('free', 'founding', 'paid', 'admin');--> statement-breakpoint

CREATE TABLE "unlocks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "builder_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "source" "unlock_source" DEFAULT 'free' NOT NULL,
  "stripe_payment_intent_id" text,
  "unlocked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "saved_projects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "builder_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "saved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "unlocks"
  ADD CONSTRAINT "unlocks_builder_id_users_id_fk"
  FOREIGN KEY ("builder_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unlocks"
  ADD CONSTRAINT "unlocks_project_id_projects_id_fk"
  FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id")
  ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_projects"
  ADD CONSTRAINT "saved_projects_builder_id_users_id_fk"
  FOREIGN KEY ("builder_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_projects"
  ADD CONSTRAINT "saved_projects_project_id_projects_id_fk"
  FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id")
  ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

CREATE UNIQUE INDEX "unlocks_builder_project_idx" ON "unlocks" USING btree ("builder_id","project_id");--> statement-breakpoint
CREATE INDEX "unlocks_builder_idx" ON "unlocks" USING btree ("builder_id","unlocked_at");--> statement-breakpoint
CREATE INDEX "unlocks_project_idx" ON "unlocks" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "saved_builder_project_idx" ON "saved_projects" USING btree ("builder_id","project_id");--> statement-breakpoint
CREATE INDEX "saved_builder_idx" ON "saved_projects" USING btree ("builder_id","saved_at");
