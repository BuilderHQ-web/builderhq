-- 0052_scope_gap_class_priceable
--
-- Two things the engine was being scored on and could not say.
--
-- WHY THIS EXISTS. The golden corpus grades every gap by its CLASS:
-- whether the drawings simply never resolved the work (design_gap), or
-- it sits inside a consultant package nobody has issued yet
-- (later_consultant_package), or it is the builder's own obligation and
-- was never a design question at all (contractor_obligation). The
-- distinction is the whole difference between telling an owner to go
-- back to their architect and telling them their builder will handle
-- it. Both v6 baselines scored gap-class accuracy at 0.000 across 72
-- labelled lines, for the simple reason that the pipeline had nowhere
-- to put the answer.
--
-- Priceability is the same shape of problem. `depth` already grades how
-- completely a line is documented, and the scorer has been reading
-- depth='full' as a priceability claim for want of anything better. The
-- Wallace pack proved those are different questions: a wall-frame line
-- can carry a full stud schedule and still be unpriceable because
-- bracing says "refer engineering". Documented and priceable are not
-- the same claim and must not share a column.
--
-- Both are NULLable and both default to nothing. Every existing row
-- keeps exactly the meaning it had, and any consumer that has not been
-- taught to read them sees no change.

ALTER TABLE "scope_run_items" ADD COLUMN IF NOT EXISTS "gap_class" text;
--> statement-breakpoint

-- Vocabulary, matching GoldenGapClass in modules/scope/golden-v2.ts.
-- Deliberately text rather than an enum: the classes are a reading of
-- construction practice rather than a database invariant, and the
-- corpus has already renamed one of them once. An enum value cannot be
-- removed in Postgres, so a vocabulary still being learned does not
-- belong in one.
--
--   design_gap                  the documents never resolved it
--   referenced_package_missing  named in the pack, not supplied
--   later_consultant_package    belongs to engineering not yet issued
--   delegated_design            a trade designs it under the contract
--   commercial_allowance        carried as a sum, not designed
--   contractor_obligation       the builder's own, never a design item
--   statutory                   an authority decides it

ALTER TABLE "scope_run_items" ADD COLUMN IF NOT EXISTS "priceable" boolean;
--> statement-breakpoint

-- Gap class only means anything on a gap, and priceability only on an
-- evidenced line. Nothing enforces that in SQL on purpose: a partial
-- index would reject a row mid-review while a human is moving a line
-- between statuses, and losing a review write is worse than holding a
-- field that no longer applies.

CREATE INDEX IF NOT EXISTS "scope_run_items_gap_class_idx"
  ON "scope_run_items" ("gap_class")
  WHERE "gap_class" IS NOT NULL;
