---
name: wave-release
description: Ship a wave of the scope-engine accuracy programme. Use before merging any change to pipeline prompts, deterministic rules, the ontology, or the model tier — anything that can move a golden score.
---

# Shipping a wave

The programme's founding rule: **no behaviour change to the model
merges without a golden score before and after.** Everything here
exists to make that rule cheap to obey and impossible to skip.

## Before you touch anything

Record the baseline for both packages, with a label naming what is
about to change:

```bash
pnpm dlx tsx scripts/dev-golden-score.mts \
  --package=57-wallace-street --run=<export.json> --label=<before> --write
pnpm dlx tsx scripts/dev-golden-score.mts \
  --package=108-dow-street --run=<export.json> --label=<before> --write
```

Scores persist to `eval/scope-golden/scores/`. A score printed to a
terminal and lost is an opinion.

## One extraction bump per programme

`SCOPE_PIPELINE_VERSION` keys extraction reuse: bumping it re-extracts
**every document on every project's next run**. Wave 1 carries the
single bump, and every extraction-schema change in the whole programme
must land inside it — exclusions, modality, claims, quantities,
dwelling and sheet identity, evidence quotes, schedule tables.

Iterate the schema offline first with `dev-golden-local.mts`, which
runs the real pipeline against local files with no database and a
version-keyed cache. State the re-extraction cost in the wave's commit.

Waves 2 onward are prompts and deterministic code only, and invalidate
nothing.

## The gates

A wave merges only when **all** of these hold:

1. `pnpm exec tsc --noEmit` clean.
2. Full suite green.
3. `pnpm build` clean — it catches type errors vitest does not, and has
   caught one already.
4. Golden diff shows **no hard-target regression on either package**,
   even if overall F1 improves. A metric that regresses beyond
   tolerance fails the wave.
5. **Stratified check**: the sparse pack (Wallace) and the rich pack
   (Dow) are both inspected. An average across them hides the answer to
   each — the v6 baseline had a WORSE false-gap rate on ten documents
   than on one, which an average would have buried.
6. Variance: do not declare a metric moved unless the movement exceeds
   the baseline's measured spread. Use multiple passes for anything
   marginal.
7. Named regressions pass. A regression that fails blocks the wave
   regardless of the headline numbers.

## Then, before calling it done

Shadow re-run both packages on **dev** (`dev-seed-golden.mts`), and
write up which of the known failure modes now pass and which remain.
That is the audit's own "re-run and compare" ask, done where it is
safe.

## Pushing

- `integration` is the trunk; `main` is production.
- **Always `git fetch` and diff against `origin/main` before pushing.**
  Twice in one session a stale local `main` would have reverted live
  work — once it would have deleted a partner profile published hours
  earlier. Check the diff stat: if deletions exceed what your change
  accounts for, stop and merge `origin/main` first.
- `gh auth switch --user BuilderHQ-web` before pushing, or the push
  403s.
- Migrations run **before** the deploy that references them, or every
  page touching the new table 500s.

## Never

- Widen `scope_run_items.status`. Fourteen consumers branch on the
  three-way literal, six in raw SQL, and `scheduleForRun` silently
  drops any unknown status from the builder deck and both PDFs. New
  semantics are orthogonal columns surfaced through `ScheduleItemKind`,
  the one enum every renderer switches on loudly.
- Change a model tier without a golden diff proving equivalence.
- Fine-tune on current outputs. They contain precisely the behaviours
  being corrected.
