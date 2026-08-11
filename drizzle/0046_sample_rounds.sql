-- The example round: sample projects seeded into new owner and
-- architect accounts. Flagged so every shared surface can exclude
-- them in one condition.
ALTER TABLE "projects" ADD COLUMN "is_sample" boolean DEFAULT false NOT NULL;
