CREATE TYPE "public"."document_category" AS ENUM('architectural', 'specifications', 'scope', 'engineering', 'site_survey', 'contract', 'other');--> statement-breakpoint
CREATE TYPE "public"."extension_type" AS ENUM('ground_floor', 'first_floor', 'ground_and_first', 'rear', 'side');--> statement-breakpoint
CREATE TYPE "public"."project_budget_band" AS ENUM('under_500k', '500k_1m', '1m_1_5m', '1_5m_2m', '2m_3m', '3m_5m', 'over_5m');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('draft', 'published', 'tendering', 'awarded', 'archived');--> statement-breakpoint
CREATE TYPE "public"."renovation_scope" AS ENUM('kitchen', 'bathroom', 'kitchen_and_bathroom', 'full_internal', 'full_internal_and_external', 'structural');--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"type" "project_type" NOT NULL,
	"status" "project_status" DEFAULT 'draft' NOT NULL,
	"address_line1" text,
	"suburb" text,
	"state" "australian_state",
	"postcode" text,
	"bedrooms" integer,
	"bathrooms" integer,
	"floors" integer,
	"land_size_sqm" integer,
	"build_size_sqm" integer,
	"dwelling_count" integer,
	"renovation_scope" "renovation_scope",
	"existing_age_years" integer,
	"extension_type" "extension_type",
	"extension_size_sqm" integer,
	"budget_band" "project_budget_band",
	"target_start_month" text,
	"target_completion_month" text,
	"description" text,
	"published_at" timestamp with time zone,
	"tender_closes_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "builder_licences" ALTER COLUMN "state" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "builder_profiles" ALTER COLUMN "business_state" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "builder_profiles" ALTER COLUMN "postal_state" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "builder_service_areas" ALTER COLUMN "state" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "project_owner_profiles" ALTER COLUMN "default_state" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "state" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."australian_state";--> statement-breakpoint
CREATE TYPE "public"."australian_state" AS ENUM('ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA');--> statement-breakpoint
ALTER TABLE "builder_licences" ALTER COLUMN "state" SET DATA TYPE "public"."australian_state" USING "state"::"public"."australian_state";--> statement-breakpoint
ALTER TABLE "builder_profiles" ALTER COLUMN "business_state" SET DATA TYPE "public"."australian_state" USING "business_state"::"public"."australian_state";--> statement-breakpoint
ALTER TABLE "builder_profiles" ALTER COLUMN "postal_state" SET DATA TYPE "public"."australian_state" USING "postal_state"::"public"."australian_state";--> statement-breakpoint
ALTER TABLE "builder_service_areas" ALTER COLUMN "state" SET DATA TYPE "public"."australian_state" USING "state"::"public"."australian_state";--> statement-breakpoint
ALTER TABLE "project_owner_profiles" ALTER COLUMN "default_state" SET DATA TYPE "public"."australian_state" USING "default_state"::"public"."australian_state";--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "state" SET DATA TYPE "public"."australian_state" USING "state"::"public"."australian_state";--> statement-breakpoint
ALTER TABLE "documents" ALTER COLUMN "project_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "category" "document_category" DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "projects_slug_idx" ON "projects" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "projects_owner_idx" ON "projects" USING btree ("owner_id","created_at");--> statement-breakpoint
CREATE INDEX "projects_suburb_status_idx" ON "projects" USING btree ("suburb","status");--> statement-breakpoint
CREATE INDEX "projects_state_status_idx" ON "projects" USING btree ("state","status");--> statement-breakpoint
CREATE INDEX "projects_type_status_idx" ON "projects" USING btree ("type","status");--> statement-breakpoint
-- Step 2 left dev/storage test rows with placeholder project_ids that
-- don't correspond to any real row. Null them before adding the FK so
-- the constraint can be applied without orphans.
UPDATE "documents" SET "project_id" = NULL WHERE "project_id" IS NOT NULL AND "project_id" NOT IN (SELECT "id" FROM "projects");--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;