# The golden set

The extraction pipeline's permanent report card: 10 to 20 real
document packages, each labelled by a human with what its documents
evidence. Every change to the pipeline runs against this set; the
scores (precision, recall, F1 for items and for gaps) decide whether
a change ships.

## The one rule

**Client documents are never committed.** Everything inside
`packages/*/docs/` is gitignored. Only labels (`expected.json`) and
this README travel with the repository. Keep the documents themselves
in the shared drive; the package slug ties them together.

## Adding a package

1. Create `packages/<slug>/` with a short, non-identifying slug
   (`sd-brick-veneer-01`, not the client's address).
2. Drop the full document set into `packages/<slug>/docs/` locally.
   Include everything a builder would receive: architectural set,
   engineering, energy report, soil report, specifications.
3. Write `expected.json` against the `GoldenPackage` type in
   `src/modules/scope/golden.ts`:
   - every document classified (`kind`, `revision`, `pages`),
   - every Scope Standard item the documents evidence, with at least
     one citation each,
   - `expectedGaps`: items a reader would expect for this project
     type that the documents do NOT cover — this is what teaches gap
     detection,
   - `labelledBy` and `labelledAt` — labels carry provenance.
4. Run the scope validator to confirm the item ids exist.

## What makes a good set

- Spread across the four project types, weighted to what the
  platform actually sees.
- At least one deliberately messy package: missing pages, stale
  revisions, a spec that contradicts a drawing. The pipeline earns
  trust on the worst inputs, not the best.
- Label what the documents SAY, not what you know the project did.
  The pipeline reads documents; the labels must too.

## Intake checklist (for each package Aryan supplies)

- [ ] Documents complete and de-identified where possible
- [ ] Slug carries no client identity
- [ ] expected.json passes the validator's id checks
- [ ] Second reader has reviewed the labels (labels have bugs too)
