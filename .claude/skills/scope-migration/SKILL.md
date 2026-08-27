---
name: scope-migration
description: Author and apply a hand-written database migration in this repo. Use when adding a table, column or enum value, especially on scope-engine tables where downstream consumers are brittle.
---

# Writing a migration

This repo hand-authors SQL. `drizzle/meta/_journal.json` is stale by
design — four entries against fifty files — so **never** run
`db:generate` or `db:migrate` expecting them to be right.

## The file

`drizzle/NNNN_snake_case_subject.sql`, next number after the highest
present. Two traps in the existing set: **0019 does not exist**, and
**0028 is duplicated**. Check before choosing.

Conventions, all of which the existing files follow:

- A header comment explaining **why** the change exists, usually
  referencing the incident that caused it. This is a strong house
  convention and the most useful part of the file a year later.
- Statements separated by `--> statement-breakpoint`.
- Every DDL idempotent: `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF
  NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`.
- All identifiers double-quoted.
- `uuid PRIMARY KEY DEFAULT gen_random_uuid()`.
- `timestamp with time zone NOT NULL DEFAULT now()`.
- FKs inline, `ON DELETE CASCADE` or `SET NULL` chosen deliberately —
  `SET NULL` where the row must survive its parent (a ledger entry
  outlives the project it paid for).
- Money is **integer whole AUD**, column named `*_aud`, matching
  `payments.amount_aud`. Never cents, never numeric.
- Inline `--` comments documenting any status vocabulary.

`ALTER TYPE … ADD VALUE IF NOT EXISTS` is safe inside a transaction on
PG 12+, but the new value cannot be USED until that transaction
commits. Adding a value and inserting it in the same migration will
fail.

## Applying it

```bash
node --env-file=.env.local scripts/apply-sql.mjs --file=drizzle/NNNN_x.sql
node --env-file=.env.local scripts/apply-sql.mjs --file=drizzle/NNNN_x.sql --prod
```

Everything runs in one transaction; any failure rolls the whole file
back. The script prints its target as `dev` or `PRODUCTION`, derived
from the flag — it once printed "(dev)" while migrating production, so
read that line and trust it now that it is honest.

Two guards point in opposite directions on purpose: without `--prod` it
refuses a prod-looking host, and with `--prod` it refuses anything
else. Neither can be satisfied by accident.

**Migrations run before the deploy that references them.** Deploy
first and every page touching the new table 500s.

## Changing scope-engine tables

Read this before adding anything to `scope_run_items`.

**Do not widen `status`.** Fourteen consumers branch on the three-way
literal, six of them in raw SQL that the compiler cannot see. The
sharpest is `scheduleForRun`, whose trailing `else` means EXCLUDED: a
new status value silently vanishes from the builder deck, both PDFs and
the comparison, or worse, tells every builder the work is out of
contract. That is the same failure class as the $44,000 fireplace
allowance the code already memorialises.

New semantics arrive as **orthogonal nullable columns** — responsibility,
gap_class, tender_readiness, review_state, dwelling_scope — surfaced
downstream through `ScheduleItemKind`, the one enum every renderer
switches on exhaustively, so a new case fails loudly in review rather
than silently in production.

Rich per-claim data belongs in `scope_run_documents.findings` (jsonb,
already versioned by `SCOPE_PIPELINE_VERSION`), not in new relational
columns.

## Before merging

- Every new column nullable, and every existing consumer verified to
  render unchanged when it is null.
- A blast-radius test seeding rows with the new columns both populated
  and null, asserting: `scheduleForRun` drops nothing, pack-review
  accounts for every line, `approveRun`'s pending count is unchanged,
  `packReadiness` is unchanged, and every `count(*)` tally still adds
  up.
- The drizzle schema in `src/modules/*/schema.ts` matches the SQL, and
  is registered in `src/lib/db.ts`.
