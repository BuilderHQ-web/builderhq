-- 0049_scope_resilience
--
-- Two columns born from the 2026-08-20 incident (the first
-- multi-dwelling pack), each closing a structural failure.
--
-- lease_until: a run's lease used to be inferred from updated_at
-- staleness, which conflated "someone is working" with "someone
-- recently touched this row" and made "done" indistinguishable from
-- "locked". A tick that finished its slice cleanly could not hand over
-- to its own next tick, because its final write looked like a live
-- lease. An explicit lease can be taken, extended, and RELEASED.
--
-- synthesis_checkpoint: synthesis is two long model calls. The first
-- is the expensive one; until now its result lived only in memory, so
-- a tick killed after pass one lost everything and the next attempt
-- paid for it again. The checkpoint persists pass one so any later
-- tick resumes from it instead of re-buying it.

ALTER TABLE "scope_runs" ADD COLUMN IF NOT EXISTS "lease_until" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "scope_runs" ADD COLUMN IF NOT EXISTS "synthesis_checkpoint" jsonb;
