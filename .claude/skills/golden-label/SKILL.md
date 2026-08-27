---
name: golden-label
description: Label a new golden package for the scope-engine accuracy corpus, from an audit or a desk-graded run. Use when adding a project to eval/scope-golden/packages, ratifying contested labels, or extending the regression suite.
---

# Labelling a golden package

A golden label is the yardstick every prompt, rule and model change is
measured against. A wrong label does not cause a wrong answer — it
causes a **confidently wrong answer forever**, and hides the regression
the corpus exists to catch. So the whole ceremony is built around one
idea: derive what can be derived, verify what cannot, and mark what is
still unsettled rather than guessing it.

## Never hand-type the labels

241 rows typed by hand is 241 chances to fatigue into a wrong one.
Write a generator in `scripts/dev-golden-build-<slug>.mts` that DERIVES
each label by explicit rule from the source, with the rules in one
table where they can be argued with. Precedence:

1. **Adjudications** — where reading the primary documents overturned
   the auditor. These win. Record the reasoning inline.
2. **The auditor's verdict**, plus any capitalised classification
   prefix in the prose. Those prefixes are usually a gap taxonomy
   written by a QS before we had one; mine them.
3. **The engine's own finding**, for rows the auditor approved.

Anything the rules cannot classify gets `reviewerConfirmation:
"required"`, which excludes it from every metric until a human settles
it. Guessing is the one thing that must not happen.

## Extracting a large audit

Use parallel agents with a JSON **schema**, one per page range, then
reconcile before trusting anything:

- Row count matches the source's own header total.
- No duplicate or missing row numbers.
- **Every item id matches the engine's export**, with zero unmatched.
  If ids do not reconcile, the extraction is wrong, not the ontology.
- Category totals reproduce the audit's stated distribution.

If any check fails, fix the extraction. Do not proceed on a partial
match and patch by hand.

## Audit the auditor

An independent audit is evidence, not truth. Before encoding a
contested verdict, read the primary source — the drawings — with
adversarial verifiers instructed to REFUTE the claim.

This is not ceremony. On 57 Wallace the auditor dismissed a roof-pitch
conflict as "different roof planes"; the drawings showed both figures
annotating the same building. Encoding his verdict would have locked a
wrong answer into the regression suite permanently.

**The text layer is a cheap oracle.** These drawing PDFs carry full
extractable text (17,850 characters on one page). Search it before
believing any "the documents say X" claim.

**Beware substring matches.** Two real traps found this way:
- `flyscreen` matches "similar to fly screen mesh" — a rainwater-tank
  strainer, nothing to do with windows.
- `eave` matches "**leaves** of cavity walls" and "blocked with
  **leaves**"; the only other hit was the level annotation "EAVES
  49.81", a height rather than a construction.

Match on token boundaries, and tell an annotation from a construction
note.

## Partial packages are fine

The scorer only scores labelled lines. A package that labels 51 gaps
and stays silent on 179 evidenced rows gives **honest numbers on the
settled part** rather than invented numbers on the whole. Say so in
`notes`.

## Before it counts

```bash
pnpm dlx tsx scripts/dev-golden-validate.mts            # must be 0 errors
pnpm dlx tsx scripts/dev-golden-score.mts \
  --package=<slug> --run=<export.json> --label=v6-baseline --write
```

The validator checks ids against the live Standard, tier agreement,
internal consistency, citation targets, document hashes and regression
references. It has already refused a package for asserting on rows
nothing labelled — let it.

**Client documents never enter the repository.** `packages/*/docs/*` is
gitignored; commit the labels and the shas, never the drawings.

## Ratification

Contested rows go to the person who builds these for a living. Present
each with: what the engine said, what the auditor said, his exact
words, and your recommendation. Their corrections are often **rules,
not labels** — "box gutters mean no eaves" became a derived-exclusion
class; "the shaftliner meets the requirement" became an activation
signal. When that happens, record it in the tier draft too.
