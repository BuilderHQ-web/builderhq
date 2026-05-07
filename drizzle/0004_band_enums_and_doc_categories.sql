-- ────────────────────────────────────────────────────────────────────────
-- 0004 — band enums for project sizes + new document categories.
-- ────────────────────────────────────────────────────────────────────────
-- Hand-written: drizzle-kit's auto-detect can't tell the difference between
-- a renamed column and a column that was dropped + replaced with a new
-- column of a different type. Both happen here, so we author it directly.
--
-- Document categories: replaced 4 of the old 7 values with 6 new AU-
-- residential-specific ones. Existing rows with deprecated categories
-- are mapped to the closest equivalent.
--
-- Project sizes: integer m² columns are dropped + replaced with banded
-- enum columns so the wizard form stays "a couple of clicks". No data
-- to preserve (these columns weren't populated in dev).

-- ── 1. Document categories: rebuild the enum ───────────────────────────
ALTER TABLE "documents" ALTER COLUMN "category" DROP DEFAULT;
ALTER TABLE "documents" ALTER COLUMN "category" TYPE text;

UPDATE "documents" SET "category" = 'specifications' WHERE "category" = 'scope';
UPDATE "documents" SET "category" = 'structural_engineering' WHERE "category" = 'engineering';
UPDATE "documents" SET "category" = 'land_report' WHERE "category" = 'site_survey';
UPDATE "documents" SET "category" = 'other' WHERE "category" = 'contract';

DROP TYPE "public"."document_category";
CREATE TYPE "public"."document_category" AS ENUM (
  'architectural',
  'structural_engineering',
  'civil_engineering',
  'specifications',
  'land_report',
  'soil_report',
  'energy_rating',
  'town_planning',
  'other'
);
ALTER TABLE "documents"
  ALTER COLUMN "category" TYPE "public"."document_category"
  USING "category"::"public"."document_category";
ALTER TABLE "documents" ALTER COLUMN "category" SET DEFAULT 'other'::"public"."document_category";
ALTER TABLE "documents" ALTER COLUMN "category" SET NOT NULL;
--> statement-breakpoint

-- ── 2. Project size + age bands: new enums ─────────────────────────────
CREATE TYPE "public"."land_size_band" AS ENUM (
  'under_200', '200_400', '400_600', '600_800', '800_1000', 'over_1000'
);--> statement-breakpoint
CREATE TYPE "public"."build_size_band" AS ENUM (
  'under_100', '100_150', '150_200', '200_250', '250_300', '300_400', 'over_400'
);--> statement-breakpoint
CREATE TYPE "public"."extension_size_band" AS ENUM (
  'under_20', '20_40', '40_60', '60_80', '80_100', 'over_100'
);--> statement-breakpoint
CREATE TYPE "public"."existing_age_band" AS ENUM (
  'under_10', '10_25', '25_50', '50_75', 'over_75'
);--> statement-breakpoint

-- ── 3. Swap integer columns for band columns ────────────────────────────
ALTER TABLE "projects" DROP COLUMN "land_size_sqm";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "build_size_sqm";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "extension_size_sqm";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "existing_age_years";--> statement-breakpoint

ALTER TABLE "projects" ADD COLUMN "land_size_band" "public"."land_size_band";--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "build_size_band" "public"."build_size_band";--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "extension_size_band" "public"."extension_size_band";--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "existing_age_band" "public"."existing_age_band";
