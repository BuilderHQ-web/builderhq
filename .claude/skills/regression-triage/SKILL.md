---
name: regression-triage
description: Turn a scope-engine production error into a permanent regression case. Use when the desk finds a bad line, a builder reports wrong scope, or an audit names a failure.
---

# Turning an incident into a regression

The corpus grows by captured failure, not by convenience sampling. A
bug fixed once should be a bug that cannot return quietly.

## 1. Establish what actually happened

Before writing anything, get the engine's own record:

```bash
# read-only export of the run
node --env-file=.env.local node_modules/.cache/export-run.mjs <runId> /tmp/run.json
```

Read the item's `status`, `depth`, `confidence`, `note` and
`citations`. The confidence is often the tell: on the audited runs
**every** fabricated evidence claim sat below the 0.65 floor, while gap
confidence was a flat constant carrying no information at all.

## 2. Verify against the primary source

Do not encode a complaint. Read the cited page and check the claim
yourself, adversarially. Three outcomes, all useful:

- **The engine was wrong** — a regression case.
- **The complainant was wrong** — record why, so it is not re-raised.
- **Both were wrong differently** — the most common, and the most
  informative. The Wallace deck was not a misread render: page 21
  shows no deck at all, which moved the failure from the genericity
  axis to citation entailment.

Search the PDF text layer first; it is free and decisive. Watch for
substring traps (`eave` inside "leaves", `flyscreen` inside "fly screen
mesh").

## 3. Classify the failure

Name the class, not the instance. Existing classes:

| Class | Example |
|---|---|
| Negation | "NO IRRIGATION" read as evidence |
| Modality | "if irrigation is required" read as selection |
| Applicability | a gap minted from possibility, with no signal |
| Derived exclusion | eaves gapped on a parapet-and-box-gutter roof |
| Arithmetic | 8 × 330 W against a printed 2.5 kW label |
| Entailment | a quote absent from the page it cites |
| Same-entity conflict | two roof planes read as a contradiction |
| Self-conflict | two model inferences reported as a document conflict |
| Priceability | precise dimensions where engineering is unresolved |
| Retrieval | evidence present in a supplied document, still gapped |

A new class is a finding worth recording in the plan, not just a case.

## 4. Write the case

Add to the package's `regressions` array. Assertions must be
**machine-checkable**: `coverage`, `coverageNot`, `gapClass`,
`priceable`, `conflictPresent`, `conflictAbsent`, `citationsGrounded`,
`dwellingsDistinct`.

Give it a `rationale` naming the incident. A case without its story
gets deleted by someone in a year who cannot see why it matters.

Every asserted item id **must be labelled in that package** and must
not be awaiting ratification — the validator enforces both, and
enforcing it has already caught a real defect.

## 5. Prove the case bites

Score it against today's engine. **A new regression case must FAIL
now.** If it passes on the unfixed engine it is asserting something
already true and proves nothing:

```bash
pnpm dlx tsx scripts/dev-golden-score.mts --package=<slug> --run=/tmp/run.json --label=triage
```

Then fix, and watch it flip.

## 6. Feed the flywheel

Check whether the desk already caught this class:

```bash
node --env-file=.env.local node_modules/.cache/corrections.mjs
```

Read **implied agreement**, not the considered rate — a reviewer opens
a line because they mean to change it, so the considered rate measures
the desk's aim rather than the engine's error rate. The divisions with
the lowest agreement are where engine work pays back fastest.
