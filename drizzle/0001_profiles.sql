CREATE TYPE "public"."australian_state" AS ENUM('NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT');--> statement-breakpoint
CREATE TYPE "public"."builder_approval_status" AS ENUM('incomplete', 'pending_review', 'approved', 'rejected', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."contact_pref" AS ENUM('email', 'phone', 'both');--> statement-breakpoint
CREATE TYPE "public"."licence_verification_status" AS ENUM('pending', 'verified', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."owner_entity_type" AS ENUM('homeowner', 'owner_builder', 'developer', 'investor', 'architect', 'drafter', 'project_manager', 'other');--> statement-breakpoint
CREATE TYPE "public"."project_type" AS ENUM('single_dwelling', 'multi_dwelling', 'renovation', 'extension');--> statement-breakpoint
CREATE TABLE "builder_licences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"builder_id" uuid NOT NULL,
	"state" "australian_state" NOT NULL,
	"licence_type" text NOT NULL,
	"licence_number" text NOT NULL,
	"licence_holder_name" text,
	"issued_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"evidence_r2_key" text,
	"verification_status" "licence_verification_status" DEFAULT 'pending' NOT NULL,
	"verified_at" timestamp with time zone,
	"verified_by" uuid,
	"verification_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "builder_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"company_name" text NOT NULL,
	"abn" text,
	"acn" text,
	"business_address_line1" text,
	"business_suburb" text,
	"business_state" "australian_state",
	"business_postcode" text,
	"has_different_postal" boolean DEFAULT false NOT NULL,
	"postal_address_line1" text,
	"postal_suburb" text,
	"postal_state" "australian_state",
	"postal_postcode" text,
	"bio" text,
	"logo_r2_key" text,
	"website" text,
	"linkedin_url" text,
	"instagram_url" text,
	"years_in_operation" integer,
	"slug" text,
	"approval_status" "builder_approval_status" DEFAULT 'incomplete' NOT NULL,
	"approved_at" timestamp with time zone,
	"approved_by" uuid,
	"rejection_reason" text,
	"score_total" integer DEFAULT 0 NOT NULL,
	"score_breakdown" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"score_last_calculated_at" timestamp with time zone,
	"onboarding_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "builder_project_categories" (
	"builder_id" uuid NOT NULL,
	"category" "project_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "builder_project_categories_builder_id_category_pk" PRIMARY KEY("builder_id","category")
);
--> statement-breakpoint
CREATE TABLE "builder_service_areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"builder_id" uuid NOT NULL,
	"state" "australian_state" NOT NULL,
	"suburb" text,
	"postcode" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_owner_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"entity_type" "owner_entity_type" NOT NULL,
	"company_name" text,
	"default_suburb" text,
	"default_state" "australian_state",
	"default_postcode" text,
	"contact_pref" "contact_pref" DEFAULT 'email' NOT NULL,
	"onboarding_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "builder_licences" ADD CONSTRAINT "builder_licences_builder_id_builder_profiles_user_id_fk" FOREIGN KEY ("builder_id") REFERENCES "public"."builder_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "builder_licences" ADD CONSTRAINT "builder_licences_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "builder_profiles" ADD CONSTRAINT "builder_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "builder_profiles" ADD CONSTRAINT "builder_profiles_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "builder_project_categories" ADD CONSTRAINT "builder_project_categories_builder_id_builder_profiles_user_id_fk" FOREIGN KEY ("builder_id") REFERENCES "public"."builder_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "builder_service_areas" ADD CONSTRAINT "builder_service_areas_builder_id_builder_profiles_user_id_fk" FOREIGN KEY ("builder_id") REFERENCES "public"."builder_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_owner_profiles" ADD CONSTRAINT "project_owner_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "builder_licences_builder_id_idx" ON "builder_licences" USING btree ("builder_id");--> statement-breakpoint
CREATE INDEX "builder_licences_state_idx" ON "builder_licences" USING btree ("state");--> statement-breakpoint
CREATE INDEX "builder_licences_status_idx" ON "builder_licences" USING btree ("verification_status");--> statement-breakpoint
CREATE UNIQUE INDEX "builder_licences_unique" ON "builder_licences" USING btree ("builder_id","state","licence_number");--> statement-breakpoint
CREATE UNIQUE INDEX "builder_profiles_slug_unique" ON "builder_profiles" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "builder_profiles_abn_unique" ON "builder_profiles" USING btree ("abn");--> statement-breakpoint
CREATE INDEX "builder_profiles_approval_status_idx" ON "builder_profiles" USING btree ("approval_status");--> statement-breakpoint
CREATE INDEX "builder_profiles_state_idx" ON "builder_profiles" USING btree ("business_state");--> statement-breakpoint
CREATE INDEX "builder_profiles_score_total_idx" ON "builder_profiles" USING btree ("score_total");--> statement-breakpoint
CREATE INDEX "builder_categories_category_idx" ON "builder_project_categories" USING btree ("category");--> statement-breakpoint
CREATE INDEX "service_areas_builder_id_idx" ON "builder_service_areas" USING btree ("builder_id");--> statement-breakpoint
CREATE INDEX "service_areas_state_suburb_idx" ON "builder_service_areas" USING btree ("state","suburb");--> statement-breakpoint
CREATE UNIQUE INDEX "service_areas_unique" ON "builder_service_areas" USING btree ("builder_id","state","suburb");--> statement-breakpoint
CREATE INDEX "owner_profiles_state_idx" ON "project_owner_profiles" USING btree ("default_state");--> statement-breakpoint
CREATE INDEX "owner_profiles_entity_type_idx" ON "project_owner_profiles" USING btree ("entity_type");