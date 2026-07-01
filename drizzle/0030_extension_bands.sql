-- Widen extension_size_band to clean 50 m2 intervals up to 300+, replacing the
-- old <=100 m2 bands (which could not express large additions like a basement +
-- extension + studio). No PROD rows use this column; a stray dev value is cleared.
-- old: under_20, 20_40, 40_60, 60_80, 80_100, over_100
-- new: under_50, 50_100, 100_150, 150_200, 200_250, 250_300, over_300
ALTER TABLE "projects" ALTER COLUMN "extension_size_band" TYPE text USING "extension_size_band"::text;
--> statement-breakpoint
UPDATE "projects" SET "extension_size_band" = NULL WHERE "extension_size_band" NOT IN ('under_50', '50_100', '100_150', '150_200', '200_250', '250_300', 'over_300');
--> statement-breakpoint
DROP TYPE "extension_size_band";
--> statement-breakpoint
CREATE TYPE "extension_size_band" AS ENUM ('under_50', '50_100', '100_150', '150_200', '200_250', '250_300', 'over_300');
--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "extension_size_band" TYPE "extension_size_band" USING "extension_size_band"::"extension_size_band";
