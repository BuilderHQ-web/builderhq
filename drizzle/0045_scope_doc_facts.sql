-- Document facts read at classification: the AS 2870 site
-- classification printed in a geotechnical report, and the NatHERS
-- star rating printed on an energy certificate. The tender deck
-- shows these back to builders as confirmations instead of questions.
ALTER TABLE "scope_run_documents" ADD COLUMN IF NOT EXISTS "site_class" text;
ALTER TABLE "scope_run_documents" ADD COLUMN IF NOT EXISTS "energy_stars" real;
