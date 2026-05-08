-- ────────────────────────────────────────────────────────────────────────
-- 0007 — Tenders + per-trade cost breakdown + tender doc attachment.
-- ────────────────────────────────────────────────────────────────────────

-- ── enums ──────────────────────────────────────────────────────────────
CREATE TYPE "public"."tender_status" AS ENUM (
  'draft','submitted','withdrawn','shortlisted','awarded','rejected'
);--> statement-breakpoint

CREATE TYPE "public"."trade_category" AS ENUM (
  'preliminaries',
  'demolition',
  'ground_works',
  'concrete_work',
  'precast_concrete',
  'brickwork_and_blockwork',
  'stonework',
  'structural_steelwork',
  'metalwork',
  'carpentry',
  'joinery',
  'windows_and_curtain_wall',
  'doors',
  'roofing',
  'partitions_and_ceilings',
  'tiling',
  'internal_finishes',
  'external_finishes',
  'glazing',
  'painting',
  'special_provisions',
  'fixtures_and_fittings',
  'hydraulic_services',
  'mechanical_services',
  'electrical_services',
  'fire_protection_services',
  'external_works',
  'other'
);--> statement-breakpoint

-- ── tenders table ──────────────────────────────────────────────────────
CREATE TABLE "tenders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "builder_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "status" "tender_status" DEFAULT 'draft' NOT NULL,
  "total_price_aud" integer,
  "duration_weeks" integer,
  "validity_days" integer,
  "proposed_start_month" text,
  "exclusions" text[],
  "conditions" text,
  "pitch" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "submitted_at" timestamp with time zone,
  "withdrawn_at" timestamp with time zone,
  "decided_at" timestamp with time zone,
  "deleted_at" timestamp with time zone
);
--> statement-breakpoint

ALTER TABLE "tenders"
  ADD CONSTRAINT "tenders_builder_id_users_id_fk"
  FOREIGN KEY ("builder_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenders"
  ADD CONSTRAINT "tenders_project_id_projects_id_fk"
  FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id")
  ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "tenders_builder_project_idx" ON "tenders" USING btree ("builder_id","project_id");--> statement-breakpoint
CREATE INDEX "tenders_project_status_idx" ON "tenders" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "tenders_builder_status_idx" ON "tenders" USING btree ("builder_id","status");--> statement-breakpoint

-- ── tender_cost_lines table ────────────────────────────────────────────
CREATE TABLE "tender_cost_lines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tender_id" uuid NOT NULL,
  "trade" "trade_category" NOT NULL,
  "label" text,
  "amount_aud" integer NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "tender_cost_lines"
  ADD CONSTRAINT "tender_cost_lines_tender_id_tenders_id_fk"
  FOREIGN KEY ("tender_id") REFERENCES "public"."tenders"("id")
  ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "tender_cost_lines_tender_idx" ON "tender_cost_lines" USING btree ("tender_id","sort_order");--> statement-breakpoint

-- ── documents.tender_id ────────────────────────────────────────────────
ALTER TABLE "documents" ADD COLUMN "tender_id" uuid;--> statement-breakpoint
ALTER TABLE "documents"
  ADD CONSTRAINT "documents_tender_id_tenders_id_fk"
  FOREIGN KEY ("tender_id") REFERENCES "public"."tenders"("id")
  ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "documents_tender_idx" ON "documents" USING btree ("tender_id","created_at");
