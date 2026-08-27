# Scope engine model improvement program

The build-out plan responding to the independent 108 Dow Street review
(`2_BuilderHQ_Complete_Analysis_and_Model_Improvements_108_Dow.pdf`),
fused with a full reconnaissance of the pipeline as it actually ships.
Every story below anchors to real code, and every acceptance criterion
is checkable, because the audit's deepest lesson is that unmeasured
judgement drifts.

Status: **PLANNED, awaiting approval. Nothing here is implemented.**

---

## 0. Program rules

These are not stories. They govern every story.

1. **Live data is untouchable.** No change in this program reads from or
   writes to production runs. The audit's own "what I would do next"
   items 1 and 2 (correct the live conflict cards, reclassify the live
   51 gaps) are explicitly OUT OF SCOPE by instruction. When the model
   improves, live projects benefit on their next run, never by
   retroactive edit.
2. **Measure before changing.** No behaviour change to the model merges
   without a golden-corpus score before and after. Epic 1 exists so
   that this rule is cheap to obey.
3. **One pipeline version per release wave.** `SCOPE_PIPELINE_VERSION`
   (pipeline.ts:110, currently 6) keys extraction reuse; a bump forces
   re-extraction of every document on the next run of any project.
   Stories are grouped into waves that share one bump, never bumped per
   story.
4. **The status enum does not widen.** The recon found at least 14
   consumer sites that branch on the three-way status literal, six of
   them raw SQL, and one (`scheduleForRun`, service.ts:3999) that
   silently drops any unknown status from the builder deck, both PDFs
   and the comparison. New semantics arrive as **orthogonal columns**
   (responsibility, dwelling scope, figures) surfaced through
   `ScheduleItemKind`, the one enum every downstream renderer switches
   on exhaustively and loudly.
5. **Fail closed on ambiguity, fail open on breadth.** The engine keeps
   its "capture everything" posture at extraction. Calibration happens
   at judgement, where the evidence is assembled.

---

## 1. What the audit found, in the code's own terms

The recon traced each audit failure mode to its mechanism. This table
is the program's spine: nothing on it is a tuning matter.

| # | Audit failure mode | Root cause in code | Epic |
|---|---|---|---|
| F1 | Negation failure ("NO IRRIGATION" → EVIDENCED) | No negation concept anywhere. Exclusion statements survive only as free-text page notes (pipeline.ts:737 covers "by others" disclaimers only) | E3 |
| F2 | Applicability failure (51 gaps, 7 real) | Three-part false-gap engine: prompt bias "when unsure, choose gap" (pipeline.ts:1190, 1199, 1425-1427); residual classifier judges without seeing document content (payload = overview + doc kinds only, pipeline.ts:1444-1450); unanswered residuals default to `gap` at confidence 0.5 (analysis.ts:202-210) | E4 |
| F3 | Per-dwelling merge (Unit 2 NatHERS "missing" while in register) | Zero dwelling modelling. Only dwelling language in the whole pipeline is the overview's count (pipeline.ts:1065-1067) | E3 |
| F4 | Aggregate-vs-unit numeric conflict (2 kW × 2 vs 4 kW) | `statedFigures` values are never parsed as numbers anywhere (analysis recon §6); conflicts rely on the model comparing free strings | E3 |
| F5 | Citation entailment ("BY OTHERS including all fixings" unverifiable) | Citations are `{documentId, page}` only; **no quote or snippet is captured at any stage** (analysis recon §3), so nothing can be verified verbatim | E5 |
| F6 | False FULL (full while a governing source contradicts) | `depth: "full"` is gated by nothing. The only demotions are preliminary-only sources and note imports (analysis.ts:355-365, 498-507) | E4 |
| F7 | Responsibility parsing (owner-supplied vs builder-installed unstructured) | Responsibility exists only as `isOwnerAskableGap`, derived from item id (advice.ts:239); disclaimers survive as free-text notes | E6 |
| F8 | Document hierarchy/revision (endorsed vs preliminary WDs vs certs) | One prose heuristic ("drawn documents govern materials", pipeline.ts:1186) plus date-based baseline findings. No precedence rank, no doc status field beyond `isPreliminaryDocument` (analysis.ts:256-265) | E5 |

And the audit's structural observations:

| Audit ask | Current state | Epic |
|---|---|---|
| Six-state scope model | Three states + depth; new states would be silently dropped by 14 consumers | E6 (as orthogonal columns) |
| Trade packages / parent systems | Items are 250+ isolated rows; no system grouping anywhere | E7 |
| Quality metrics with targets | Scorer exists but is binary set-membership, scores the wrong pipeline shape, corpus is EMPTY, no persistence, no A/B | E1 |
| 108 Dow as permanent regression | Documents exist in ~/Downloads; label material exists in the audit itself | E1 |
| Corrections as evaluation data | Every desk verdict already recorded in `scope_review_events` ("every one is training data", service.ts:1827) — and nothing reads them | E2 |

---

## 2. Epic map and sequencing

```
WAVE 0 (no pipeline bump — pure evaluation infrastructure)
  E1  The measuring instruments
  E2  The correction flywheel

WAVE 1 (SCOPE_PIPELINE_VERSION → 7)
  E3  Deterministic ground truth: figures, negation, dwellings
  E4  Calibrated judgement: the gap default, applicability, the FULL gate

WAVE 2 (SCOPE_PIPELINE_VERSION → 8)
  E5  Evidence integrity: quotes, entailment, precedence, typed conflicts

WAVE 3 (no bump for E6 storage; bump only if prompts change)
  E6  The responsibility axis
  E7  Parent systems and the tender output

CONTINUOUS
  E8  Rollout discipline and drift watch
```

Dependencies: E1 gates everything (rule 2). E3 feeds E4 (reconciled
figures and negations are inputs to the new gap epistemology) and E5
(parsed figures feed typed conflicts). E6 depends on E3's columns
migration. E7 depends on E6's schedule kinds.

---

## Epic 1 — The measuring instruments

**Goal.** Before any judgement changes, a regression harness that can
say, per metric, whether a change helped, hurt, or drowned in variance.
The audit's §14 targets become executable.

**Recon grounding.** `dev-golden-local.mts` already replays the exact
production judgement half with a version-keyed extraction cache.
`dev-scope-golden-run.mts` is the only expected-vs-actual scorer but
scores raw synthesis (no guards, no residual — a pipeline shape that
does not ship) and only two binary sets. `eval/scope-golden/packages/`
contains zero real packages. Scores go to stdout and vanish.

### S1.1 — The 108 Dow golden package

Package the ten source documents (already local in
`~/Downloads/108 Dow Street - Port Melbourne/`) as
`eval/scope-golden/packages/108-dow-street/` with an `expected.json`
labelled **from the audit itself**: the §5 reclassification table (all
~45 rows), the §2 conflict verdicts (5 confirmed, 3 partly, 1
incorrect, 1 unsupported), the §4 failure instances (irrigation
negation, cornice negation, Unit 2 certificate, 2 kW basis), and the §6
material findings.

**Acceptance criteria**
- [ ] `expected.json` validates against the extended schema (S1.2) and
      `labelledAgainst` matches the current `SCOPE_STANDARD_VERSION`.
- [ ] Every §5 row of the audit appears with its recommended state
      (gap / not-expected / evidenced / contractor-obligation /
      owner-package), recorded in the label's applicability and
      responsibility fields, not by inventing status values.
- [ ] The ten negation/dwelling/numeric regression cases (audit §15,
      NEG-001 through FULL-001) are expressed as machine-checkable
      entries in a `regressions` block, each with the document and page
      that proves it.
- [ ] Documents are the exact files (sha256 recorded per file) so the
      package is byte-stable; docs stay gitignored per the existing
      corpus convention, with shas committed.
- [ ] Labelling provenance recorded (`labelledBy: "external QS review
      2026-08"` + reviewer confirmation flag for each contested row).

### S1.2 — Score what ships, per metric

Extend the golden schema and scorer so the measured pipeline is the
shipped pipeline and the audit's metrics are computed rather than
aspired to.

**Acceptance criteria**
- [ ] The golden runner executes the full judgement half in production
      order (the same sequence as `dev-golden-local.mts` L246-321:
      dedupe → synthesis → citation guard → authority → note grounding
      → conflict integrity → capture hygiene → residual → fold →
      coverage), not raw synthesis.
- [ ] Scorer emits, per package: item precision/recall/F1 (as today),
      **false-gap rate** (gaps emitted that the label marks
      not-expected or evidenced), **negation accuracy** (the NEG
      cases), **dwelling-merge errors** (the DWELL cases), **conflict
      precision** (emitted conflicts matched to labelled genuine
      conflicts), **FULL false-positive rate** (items graded full that
      the label marks partial/blocked), and **citation validity** (every
      cited (doc, page) exists in the label's plausible-citation set).
- [ ] Each metric prints against its audit target (false-gap < 5%,
      conflict precision ≥ 95%, FULL FP < 1%, negation ≥ 99%, dwelling
      errors = 0) with a PASS/FAIL flag; overall exit code reflects
      hard-target failures so CI can gate on it.
- [ ] Scoring a package with the current v6 pipeline completes and
      produces a baseline file — the "before" that every later wave is
      judged against. The v6 baseline is committed.
- [ ] Extraction cache is reused across scoring runs (cost of a re-score
      without extraction changes ≤ synthesis + residual only).

### S1.3 — Score persistence and A/B diff

**Acceptance criteria**
- [ ] Every scoring run writes
      `eval/scope-golden/scores/<package>/<pipelineVersion>-<ts>.json`
      containing all metrics, per-item verdicts, token usage and cost.
- [ ] A diff command takes two score files and prints per-metric deltas
      plus the item-level moves (which ids changed status, depth,
      confidence band), so a regression names its casualties.
- [ ] The diff flags any metric that regressed beyond a declared
      tolerance (default 2 F1 points / any hard-target breach) with a
      non-zero exit.

### S1.4 — Variance before verdicts

Bench already proves pass-to-pass drift exists. A single-pass score
cannot distinguish a one-point improvement from noise.

**Acceptance criteria**
- [ ] The scorer supports `--passes N` (2-4): extraction once, judgement
      half N times, reporting mean and spread per metric.
- [ ] The diff refuses to declare a metric moved unless the movement
      exceeds the measured spread of the baseline.
- [ ] A cost ceiling flag aborts a scoring run that would exceed a
      stated USD budget, using the existing per-stage token accounting.

### S1.5 — Label tooling

**Acceptance criteria**
- [ ] A validator checks every `expected.json`: item ids exist in the
      Standard, filenames match `docs/`, shas match, `labelledAgainst`
      current, regression cases reference real documents.
- [ ] Wired into the same run pattern as `dev-scope-validate.mts` and
      exits non-zero on any violation.

---

## Epic 2 — The correction flywheel

**Goal.** The desk already records every human verdict as
before/after pairs (`scope_review_events`, service.ts:1829-1845). Turn
that recorded-but-unread data into live accuracy metrics and label
updates, so every ops hour spent grading becomes permanent model
pressure.

### S2.1 — The verdict reader

**Acceptance criteria**
- [ ] A script (and a service function backing the metrics page)
      computes, per run and per division: confirm rate, edit rate,
      removal rate (false positives), addition rate (false negatives),
      distinguishing first-hand verdicts from carried ones (carried
      verdicts identified via the R2a carry are excluded from accuracy
      math — they are second-hand).
- [ ] Runs seeded from the golden harness are identified by the existing
      `seededFromGoldenHarness` marker and reported separately, so
      desk-graded golden runs close the loop to packages.
- [ ] Read-only. Zero writes. Works against dev; prod runs only through
      the read-only reporting path with no mutation surface.

### S2.2 — Confidence calibration report

The pipeline emits confidence per item and penalises it (×0.7 soft
citations, ×0.8 note imports) to land under the 0.65 ops floor. Nobody
has ever checked whether confidence predicts anything.

**Acceptance criteria**
- [ ] Report buckets model confidence (0.1 bands) against ops confirm
      rate across all graded runs; output = a calibration curve table.
- [ ] If the curve is materially mis-calibrated (a 0.9 bucket confirming
      under 80%, say), the report proposes a monotone remapping; the
      remapping itself ships only as a later, measured change.

### S2.3 — Desk accuracy panel

**Acceptance criteria**
- [ ] The existing scope metrics admin page gains the S2.1 rates with a
      per-pipeline-version breakdown, so v7's effect on edit rates is
      visible within weeks of shipping without any manual query.

---

## Epic 3 — Deterministic ground truth (Wave 1, pipeline v7)

**Goal.** The audit's §10: things that must never be left to the LLM,
computed in code between extraction and synthesis. The recon confirmed
the exact hook: the payload builder at pipeline.ts:1207-1222 already
does one deterministic transform, and receives fully validated
`SynthesisDocumentInput[]`.

### S3.1 — The figure parser

**Acceptance criteria**
- [ ] A pure module parses every `statedFigures` value string into
      `{value: number, unit, normalisedValue, normalisedUnit} | null`
      with a conversion table covering at least kW/W, L/kL, mm/m/m²,
      stars, kPa, count. Unparseable strings stay untouched — parsing is
      additive, never destructive.
- [ ] Parsed figures are attached to the synthesis payload alongside the
      raw strings, and the raw strings remain (rule: never delete what
      the document printed).
- [ ] Unit-tested against every figure format present in the 108 Dow
      extraction cache, plus adversarial formats ("2no.", "2 x 2.5kW",
      "100kPa", "7.0 star", ranges).

### S3.2 — Basis reconciliation (per-unit vs total, minimum vs selected)

**Acceptance criteria**
- [ ] For figure groups referring to the same item across documents, a
      deterministic reconciler classifies each pair: `consistent`
      (2 kW/dwelling × 2 dwellings = 4 kW total), `minimum_satisfied`
      (min 2 kW, selected 2.5 kW), or `unresolved`.
- [ ] Reconciled groups are injected into the synthesis prompt as
      settled numeric facts with an explicit instruction that they are
      not conflicts; a post-guard drops any model conflict whose cited
      figures belong to a reconciled group, with a new counter
      (`conflictsReconciled`) in `usage.analysis`.
- [ ] Golden: NUM-001 and NUM-002 pass; conflict precision does not
      regress on the labelled genuine conflicts (the 100 vs 120 kPa
      conflict MUST still be raised — it is unresolved, not reconciled).

### S3.3 — Negation as a first-class object

**Acceptance criteria**
- [ ] The extraction tool schema gains an `exclusions` array per page:
      `{statement: verbatim quote ≤200 chars, itemId | null, kind:
      "not_required" | "by_owner" | "by_others" | "excluded" |
      "deleted"}`, with prompt rules and examples ("NO IRRIGATION IS TO
      BE IMPLEMENTED", "no cornice - square set", "no gas").
- [ ] A deterministic pass indexes exclusions by item; the synthesis
      payload carries them prominently; the synthesis rules state that a
      matching exclusion forbids `evidenced` and grounds `not_expected`
      with the quoted statement as the positive reason.
- [ ] A post-guard (same family as `enforceCitationConsistency`)
      demotes any evidenced item whose cited pages carry a matching
      exclusion for that item, with counter `negationSuppressed`; the
      demotion routes to the residual pool exactly as citation-stripped
      items do today (analysis.ts:97-99).
- [ ] Golden: NEG-001 (irrigation) and NEG-002 (cornice: square-set
      evidenced, cornice suppressed) pass at 100%; negation metric ≥
      99% on the corpus.
- [ ] `not_expected` entries minted from exclusions carry the quote in
      their note — the audit's "NOT APPLICABLE must be positive".

### S3.4 — The dwelling namespace

**Acceptance criteria**
- [ ] Classification captures a `dwellingLabel` when the document is
      per-dwelling by nature (NatHERS certificates already carry unit
      identity in their titles; the classify schema gains the field and
      the prompt asks only for what is printed).
- [ ] Extraction records `dwelling: string | null` per page entry where
      the page states it (Unit 1 / Unit 2 / shared); never inferred.
- [ ] Migration 0050 adds `dwelling_scope` (nullable text) to
      `scope_run_items`; the synthesis item schema gains it; the
      payload groups per-dwelling findings visibly.
- [ ] A deterministic completeness check: when the register holds N
      per-dwelling documents of one class (two NatHERS certs) and the
      overview says N dwellings, each must be cited by the relevant
      energy items or a deterministic `attention` finding is raised
      (extends `baselineFindings`, which is already the deterministic
      conflict lane). DWELL-001 passes: Unit 2's certificate can never
      again be reported missing while in the register.
- [ ] All new columns nullable; every existing consumer renders
      unchanged when they are null (pinned by the blast-radius tests in
      S6.4).

### S3.5 — Document status and precedence rank

**Acceptance criteria**
- [ ] Classification gains `docStatus: "endorsed" | "for_construction" |
      "preliminary" | "unmarked"` read only from printed stamps and
      title blocks ("PRELIMINARY — NOT FOR CONSTRUCTION", council
      endorsement stamps); `isPreliminaryDocument` (analysis.ts:256)
      becomes a fallback, not the only signal.
- [ ] A precedence table (code, not prompt) ranks (kind, docStatus,
      issueDate/revision recency) into a `governs` ordering exposed to
      the synthesis payload per document; the prose "drawn documents
      govern materials" rule remains but now cites the computed rank.
- [ ] A preliminary architectural set on a project with no
      for-construction set raises the audit's CRITICAL finding
      deterministically ("working drawing status") through
      `baselineFindings` — currently it is only an `attention`/`high`
      note; it becomes a named, always-on advisory with its own copy.
- [ ] Golden: the 108 Dow package's expected criticals (WD status, NCC
      basis) are raised.

---

## Epic 4 — Calibrated judgement (Wave 1, pipeline v7)

**Goal.** Reverse the false-gap engine without losing the tender-safety
property that a real hole is never hidden. The audit's central number:
51 claimed gaps, 7 real.

### S4.1 — Applicability signals in the ontology

**Acceptance criteria**
- [ ] `ScopeItem` gains optional `applicability` metadata:
      `{requiresEvidenceOf?: string[] (item ids or feature tags),
      featureTags?: string[]}` — e.g. residential lift requires lift
      evidence; sewer pump requires a pump signal; skylights require
      skylight evidence. Populated for at least the 22 items the audit
      reclassified NOT EXPECTED plus every item the residual classifier
      has defaulted to gap in recorded runs.
- [ ] `dev-scope-validate.mts` validates the new metadata (referenced
      ids exist; tags from a closed list).
- [ ] `SCOPE_STANDARD_VERSION` bumps minor (1.3.0). Because the recon
      confirmed the standard version is provenance, not a cache key,
      this invalidates nothing mechanically.

### S4.2 — The residual classifier sees evidence, and the default flips

**Acceptance criteria**
- [ ] The residual payload grows from (overview + doc kinds) to include:
      per-division evidenced summaries, the negation index (S3.3), the
      parsed key figures (S3.1), and each residual item's applicability
      metadata. The classifier finally judges silence with the evidence
      in front of it.
- [ ] The rules flip for gated items: an item with `applicability`
      metadata whose required evidence is absent defaults to
      `not_expected` **with a positive reason naming the absent
      signal**. "When unsure, choose gap" survives only for ungated
      items (real trade-work where silence genuinely is a hole).
- [ ] The silent-default in `foldResiduals` (analysis.ts:202-210) also
      splits: unanswered gated items default `not_expected` (reason:
      applicability signal absent), unanswered ungated items keep the
      defensive `gap`. Counter split: `residualDefaultedGap` /
      `residualDefaultedNotExpected`.
- [ ] Golden: false-gap rate on 108 Dow falls from ~44/51 to < 5% of
      final gaps; APP-001 passes (lift, pool, skylights, fireplace,
      sewer pump do not become gaps without applicability evidence);
      recall on the 7 genuine gaps stays 100% — **losing a real gap
      fails the story regardless of the false-gap win.**

### S4.3 — The FULL gate

**Acceptance criteria**
- [ ] A deterministic post-guard demotes `depth: "full"` to `"partial"`
      (never the reverse) when any of: the item is cited by an open
      conflict; its figures group is `unresolved` (S3.2); its cited
      pages carry an unresolved responsibility disclaimer; its sources
      are all preliminary (exists today, analysis.ts:355-365, folds into
      the same guard); a dwelling-scoped requirement exists for it and
      `dwelling_scope` is null. Each demotion appends one plain sentence
      to `remaining` naming the blocker.
- [ ] Counter `fullDemoted` lands in `usage.analysis`; the desk shows
      the demotion reason.
- [ ] Golden: FULL-001 passes (steel coating cannot be FULL across
      contradictory coating regimes); FULL false-positive rate < 1%;
      the partial-ratio readiness input (`packReadiness`) is verified
      unchanged in formula so the change shows up as honesty, not as a
      readiness cliff.

### S4.4 — Positive NOT APPLICABLE

**Acceptance criteria**
- [ ] Every `not_expected` row carries a reason note (synthesis and
      residual schemas make note required for that status; fold-defaults
      supply the applicability reason). The desk and the owner pack read
      it. No bare `not_expected` rows exist in a v7 run.

---

## Epic 5 — Evidence integrity (Wave 2, pipeline v8)

**Goal.** Citations that can be checked, conflicts that carry their
semantics, and revision differences that stop masquerading as
contradictions.

### S5.1 — Quotes at the source

The recon is unambiguous: nothing verbatim is captured anywhere, so
entailment has nothing to check. Fix it where the pages are actually
read — extraction.

**Acceptance criteria**
- [ ] Extraction's page schema gains `evidenceQuotes: [{itemId | null,
      quote ≤200 chars}]` (capped per page), instructed as "the exact
      printed words that most directly evidence each significant item";
      quotes for exclusions already arrive via S3.3.
- [ ] Findings persist as they do today (jsonb on
      `scope_run_documents.findings`), so quotes survive extraction
      reuse and cost nothing on re-runs.
- [ ] Token impact measured on the golden corpus: extraction output
      stays within `EXTRACT_MAX_TOKENS` headroom (< 60% warn line) on
      the largest document; if not, quote caps are reduced until it
      does.

### S5.2 — The entailment verifier

**Acceptance criteria**
- [ ] A post-guard verifies every conflict whose summary quotes source
      wording (quotation marks or "states/says X" patterns): the quoted
      span must appear, normalised, in the cited pages' quotes, notes,
      statedFigures or exclusions. Fails → the conflict is either
      downgraded to a general coordination note without the fabricated
      quote or dropped, with counter `entailmentFailed`.
- [ ] The same check runs on item notes containing quoted spans
      (extending `enforceNoteGrounding`'s term machinery with exact-span
      matching).
- [ ] Golden: EVID-001 passes — the "BY OTHERS including all fixings"
      conflict can no longer quote wording absent from the cited page;
      citation precision ≥ 98% on the corpus.

### S5.3 — Typed conflicts

**Acceptance criteria**
- [ ] Migration adds `kind` (nullable text) and `basis` (nullable jsonb:
      values, units, basis, dwellings, revisions per side) to
      `scope_run_conflicts`. Old rows null; every consumer renders
      unchanged on null (conflict UI shows the untyped card exactly as
      today).
- [ ] The synthesis conflict schema gains
      `kind: true_contradiction | minimum_vs_selected | total_vs_unit |
      revision_difference | hierarchy_difference |
      responsibility_interface`, with the deterministic reconciler
      (S3.2) and precedence rank (S3.5) pre-classifying what they can
      and a post-guard overriding the model's kind where the
      deterministic evidence says otherwise (deterministic wins;
      counter `conflictRetyped`).
- [ ] Severity discipline: `total_vs_unit` and `minimum_vs_selected`
      that reconcile are suppressed (S3.2); `revision_difference` and
      `hierarchy_difference` cap at `attention` unless the precedence
      table cannot resolve them. Conflict precision ≥ 95% on golden with
      the audit's CONF-001 (100 vs 120 kPa) still emitted as
      `true_contradiction`, `high`.
- [ ] The desk conflict card renders kind and both sides' values/basis
      when present.

### S5.4 — Conflict identity (enables R2b)

While the conflicts table is open: the natural key that the re-read
carry needs.

**Acceptance criteria**
- [ ] Migration adds `natural_key` (text, nullable): sha256 of
      (normalised summary head + sorted citation documentIds + kind),
      computed at persist; unique index on `(run_id, natural_key)` where
      not null.
- [ ] The re-read verdict carry (R2a's machinery) extends to conflicts:
      a dismissal carries only on exact natural-key match. A false
      "dismissed" hides a conflict from every builder, so anything short
      of exact match re-asks — stated in code comment and test.
- [ ] `docs/open-items.md` R2b moves to Closed when this lands.

---

## Epic 6 — The responsibility axis (Wave 3)

**Goal.** The audit's owner/builder/contractor semantics, stored as
data, surfaced through the one loud enum, breaking none of the 14
status consumers.

### S6.1 — Columns and extraction

**Acceptance criteria**
- [ ] Migration 0050 (shared with S3.4) adds to `scope_run_items`:
      `responsibility` (nullable text: `builder | owner_supply |
      owner_package | contractor_obligation | unresolved`),
      `tender_action` (nullable). Status stays three-state. Ever.
- [ ] Extraction's responsibility disclosures (rule 7 notes) upgrade to
      structured entries (S3.3's exclusions carry `by_owner`/`by_others`
      kinds already — this story maps them onto items).
- [ ] Synthesis emits `responsibility` per item where the documents
      state it; never inferred from silence.

### S6.2 — Judgement consumers prefer stored responsibility

**Acceptance criteria**
- [ ] `autoResolveBuilderWork` and `isOwnerAskableGap` become
      "stored responsibility ?? derived-from-itemId", byte-identical
      behaviour when the column is null (pinned by test on a null-column
      fixture).
- [ ] A `contractor_obligation` line never reaches the owner as a
      question and never silently vanishes: it flows to the schedule as
      a preliminaries-class line (S6.3). An `owner_package` line becomes
      an owner-interface row, preserving builder interfaces (the audit's
      solar example: owner installs, builder prices roof penetrations
      and switchboard capacity — the interface note is the builder-facing
      content).

### S6.3 — New schedule kinds, exhaustively

**Acceptance criteria**
- [ ] `ScheduleItemKind` gains `contractor_obligation` and
      `owner_interface`. Every switch over the kind is updated in the
      same story: schedule.ts, schedule-browser, scope-of-works PDF,
      tender document renderer, comparison, addendum diff. The compiler
      finds them; the story is not done while any switch has a default
      case swallowing the new kinds.
- [ ] The builder deck shows contractor obligations as "included in your
      lump sum" schedule content and owner interfaces as explicit
      interface rows — no new question surfaces for builders.
- [ ] Addendum diff treats a kind change as a change, not a removal.

### S6.4 — Blast-radius pins

**Acceptance criteria**
- [ ] A test seeds items carrying every new column populated and null,
      and asserts: `scheduleForRun` drops nothing; pack-review
      partitions account for every line (nothing invisible);
      `approveRun`'s pending gate counts are unchanged; `packReadiness`
      formula unchanged; all `count(*)` tallies still add up. This is
      the test that prevents the recon's "sharpest edge"
      (service.ts:3999) from ever eating a line.

---

## Epic 7 — Parent systems and the tender output (Wave 3)

### S7.1 — The parent-system registry

**Acceptance criteria**
- [ ] Ontology gains a `SCOPE_SYSTEMS` registry: balcony, stormwater and
      tanks, boundary/party wall, automation/security, facade/coastal
      durability, energy/NatHERS — each naming member item ids and a
      completeness checklist (the audit's §12 lists verbatim as the
      seed).
- [ ] `dev-scope-validate.mts` validates member ids; systems carry
      `appliesTo` project types.

### S7.2 — System completeness advisories

**Acceptance criteria**
- [ ] The advisory engine gains system checks: when a system is in play
      (any member evidenced), members missing from
      evidenced+gap-with-reason are raised as one system-level advisory
      ("The balcony system is missing: box gutters, overflow") rather
      than N scattered lines. Runs at read time like `packReadiness`,
      no persist change.
- [ ] Golden: the audit's balcony-system example produces the expected
      single advisory.

### S7.3 — Trade-package grouping on the tender

**Acceptance criteria**
- [ ] The schedule groups lines under trade packages (the 28-trade
      catalogue already on every item) with system columns, without
      changing line identity or the comparison's canonical rows.
- [ ] Both PDFs and the deck render the grouping; the comparison still
      compares canonical rows one-to-one.

### S7.4 — The clarification register

**Acceptance criteria**
- [ ] Unresolved `high`/critical conflicts and `unresolved`
      responsibility rows compile into a clarification register section
      on the tender document — identical for every builder on the
      round, rendered from the same approved run, nothing builder-
      specific.
- [ ] Items resolved before go-live drop out automatically; the register
      is recomputed at document render, not stored.

---

## Epic 8 — Rollout discipline and drift watch (continuous)

### S8.1 — Wave choreography

**Acceptance criteria**
- [ ] Each wave: golden baseline before, all wave stories merged behind
      one `SCOPE_PIPELINE_VERSION` bump, golden re-score after, diff
      published (S1.3), bench variance within the baseline band, THEN
      dev-seeded desk run graded by a human before the wave is declared
      done. No wave merges to main with a hard-target regression.
- [ ] The re-extraction cost of each bump is stated in the wave's commit
      (documents on dev × extraction cost).

### S8.2 — The 108 Dow shadow re-run

**Acceptance criteria**
- [ ] After Wave 1 and again after Wave 2: the 108 Dow package re-runs
      on DEV (seeded via `dev-seed-golden.mts`, never touching the live
      project), and the delta against the audit's findings is written
      up: which of the 8 failure modes now pass, which remain. This is
      the audit's own "re-run and compare" ask, done on dev.

### S8.3 — Drift watch

**Acceptance criteria**
- [ ] Bench (pass-to-pass agreement) runs on a schedule against one dev
      package; agreement dropping below the recorded band raises an ops
      note. Model updates from the provider get caught here, not in a
      customer's pack.

---

## 3. Beyond the audit: the senior-ML additions folded in above

Called out so they are visible as deliberate choices, not accidents:

1. **Variance-gated evaluation** (S1.4) — the audit asks for metrics;
   metrics without spread invite chasing noise.
2. **Deterministic-wins arbitration** (S3.2, S5.3) — where code and
   model disagree on something computable, code wins and the model's
   answer is corrected, counted, and visible. Counters make prompt
   pressure measurable.
3. **Evidence-carrying residual judgement** (S4.2) — the single highest
   leverage change in the program: the classifier that mints most gaps
   currently judges blind.
4. **Confidence calibration against human verdicts** (S2.2) — the
   pipeline already prices its own uncertainty; nobody has checked the
   price. Calibrated confidence later enables auto-confirm thresholds
   with known risk.
5. **Quotes at extraction, verification at judgement** (S5.1/S5.2) —
   entailment done where it is cheap (pages already in context at
   extraction) rather than re-reading PDFs at verification time.
6. **The correction flywheel** (E2) — the desk is already labelling
   every run; the program just picks the labels up.
7. **Failure-mode-first regression corpus** (S1.1) — the corpus grows by
   captured failure, not by convenience sampling: every future incident
   becomes a package or a case in one.

Deliberately deferred (recorded so they are decisions, not omissions):
bounding-box/coordinate extraction (the audit's stage 2; current
native-PDF reading performs well and boxes are a rendering feature, not
an accuracy one — revisit with the reviewer-UI epic), a separate
builder response schema and quote-comparison rework (Phase 3 of the
audit; owned by the tenders module, not the model), self-consistency
multi-sampling of synthesis (cost triples for uncertain benefit — run
as an experiment on the golden corpus first if conflict precision
misses target after Wave 2).

---

## 4. Risk register

| Risk | Mitigation |
|---|---|
| Flipping the gap default hides a real hole in a tender | S4.2's paired criterion: 100% recall on labelled genuine gaps is a hard gate; applicability gating only ever applies to items with explicit metadata; ungated items keep the defensive default |
| New columns silently dropped by a consumer | S6.4 blast-radius pins run in CI; new semantics surface only through `ScheduleItemKind`, which fails loud |
| Extraction schema growth blows token ceilings | S5.1 measures against the 60% headroom warn line on the largest golden document; caps tuned before merge; `logHeadroom` already alarms in production |
| Pipeline bump re-extraction cost surprises | Stated per wave (S8.1); reuse keying confirmed at service.ts:263-278 |
| Prompt changes regress unmeasured behaviours | Wave gates (S8.1) + variance-aware diffs (S1.4); nothing merges on a hard-target regression |
| Ontology metadata is wrong (item gated that shouldn't be) | Applicability metadata reviewed against the residual classifier's historical answers (S4.1 sourcing) and validated by tooling (S1.5); a wrong gate shows up as a recall failure on golden before it ships |
| The 108 Dow labels encode the auditor's mistakes | The audit itself flagged one of its own findings incorrect and one unsupported; contested rows carry a reviewer-confirmation flag (S1.1) and can be re-adjudicated without invalidating the package |

---

## 5. What this program does not do

- Touch any live production run, item, conflict, or resolution.
- Widen `scope_run_items.status`.
- Rebuild the pipeline as the audit's 11 discrete services. The four-call
  shape (classify → extract → synthesise → residual) stays; the audit's
  stages 1, 3, 5, 6, 7, 9 arrive as deterministic code and guards inside
  it, which fits the tick budget and the checkpoint machinery that
  already survived production failure.
- Ship any UI redesign of the desk beyond the new fields' display. The
  three-pane reviewer of audit §13 is real product work for a later
  cycle, and the correction-persistence half of it already shipped as
  R2a.

---
---

# Part II — The v2 blueprint, resolved against the code

**27 August 2026.** After Part I was written, a second independent audit
ran: the full 241-line verification of 57 Wallace Street, a
single-document pack, the opposite condition to 108 Dow's ten-document
pack. ChatGPT then produced a merged blueprint
(`BuilderHQ_Scope_Engine_Master_Accuracy_Improvement_Plan_v2.pdf`, 22
pages) from both audits plus Part I of this document.

This part is the senior-engineering resolution of that blueprint: what
is adopted, what is adapted, and where it is corrected by the codebase
it admits it never inspected (its §30 caveat). Part I remains the
anchor; nothing below deletes a Part I story, only amends or adds.

**Verdict: adopt substantially.** The blueprint is directionally right,
agrees with every structural decision Part I made (three-state status
kept, orthogonal columns, measure first, four-call shape kept,
fine-tuning deferred), and adds genuinely new failure modes from
Wallace that Part I could not have known. Roughly 85 percent is
accepted. The corrections below are where code reality changes the
shape or the size of the work.

---

## 6. What Wallace newly proves (beyond 108 Dow)

The sparse-pack audit reportedly returned: 118 of 241 lines approved
as-is, 61 edit/reclassify, 62 deny/remove, and two of the three
model conflicts wrong. Failure modes new to the programme:

| # | Failure | Example | Part I coverage |
|---|---|---|---|
| W1 | Conditional language becomes scope | "if irrigation is required" read as evidence irrigation is in scope | Absent — S3.3 handled negation only |
| W2 | Referenced packages become design gaps | "refer engineer's design" produced "commission a design" advice for a document that likely exists | Absent as a first-class concept |
| W3 | Generic/template notes establish systems | BCA boilerplate treated like selected design | Partial (authority guard is document-kind level, not note level) |
| W4 | Render-only evidence | A deck asserted from a perspective render, unverifiable on any plan | Absent |
| W5 | Depth conflated with priceability | Wall framing "priceable" while bracing/lintels remain "to engineer's design" | Partial — S4.3 demoted depth but kept one axis |
| W6 | Same-entity conflict gate missing | 2° and 59° roof pitches on different roof planes flagged as contradiction | Absent — S5.3 typed conflicts but no location identity |
| W7 | Arithmetic identities unchecked | 8 × 330 W = 2.64 kW vs a printed 2.5 kW label, missed | Partial — S3.2 reconciled bases, not identities |
| W8 | Provision read as supply | An appliance symbol read as builder-supplied appliance | Absent |
| W9 | Age conflated with status | Permit-stamped Rev D treated as needing a "preliminary" warning | Partial — S3.5 had one enum for two facts |

---

## 7. Rulings on the blueprint's change requests

| v2 ask | Ruling | Basis |
|---|---|---|
| Wallace golden package | **Accept** | Needs the 241-line audit source file to label from |
| Score the shipped pipeline, guards and residual included | Already in plan | S1.2 says exactly this |
| Metric additions: false-NOT-EXPECTED < 1% (zero on critical), priceable precision ≥ 98%, dependency classification ≥ 95%, pass-to-pass ≥ 98%, ECE < 0.05 | **Accept** | Folded into S1.2/S1.4. The false-NE metric is the correct counterweight to flipping the gap default |
| Atomic claim schema (polarity, modality, genericity, selectedness, quantity/basis, dwelling/location) | **Accept, amended** | Claims are emitted BY the extraction call via schema growth and live in `scope_run_documents.findings` (jsonb — no migration, versioned by pipeline version). No separate normalisation pass: the pages are already in context at extraction, and a fifth model call would re-read everything and strain the 740s tick. Items table stays narrow |
| Negation AND modality | **Accept** | S3.3 widens: structured exclusions plus a modality enum (`if_required · where_required · may · indicative · typical · minimum · alternative · provision_only · selected`). Conditional language never evidences applicability |
| Arithmetic identity checks | **Accept** | S3.2 gains identity evaluation (n × unit-watts vs labelled kW) with nominal/tolerance handling; discrepancies raised deterministically |
| Entity resolver (project/dwelling/room/level/elevation/roof-plane) | **Accept, scoped down** | Wave 1 ships dwelling + a free-text location/view label + view type. That resolves W6 and the dwelling merges. A full room/level graph is deferred until a failure demands it |
| Document intelligence: split issue_status from approval_status, currency advisory | **Accept** | S3.5 revised. A building-permit stamp is an approval fact; age is a currency fact (configurable advisory, 180 days); neither is "preliminary" |
| Referenced-document dependency graph | **Accept — smaller than claimed** | `docRefs` are already captured per page at extraction (pipeline.ts:643), and `namedMissingDocuments` (analysis.ts) already matches them against the register at read time. The work is classification (dependency vs design gap), persistence, and wiring into gap_class — not a greenfield extractor |
| Applicability: priors are search triggers only; absent signal → positive NOT EXPECTED | Already in plan | S4.1/S4.2. Adopt the sharper "search triggers" language and the false-NE gate |
| Residual classifier sees evidence | Already in plan | S4.2 is the highest-leverage story in the programme; v2 concurs |
| gap_class taxonomy (design_gap · referenced_package_missing · later_consultant_package · delegated_design · commercial_allowance · contractor_obligation) | **Accept** | New nullable column on items, per the Part I no-widening rule. This is the owner-action vocabulary the product has needed since Port Melbourne |
| Abstention: internal `review_state = requires_review` | **Accept** | New nullable column. Wiring is natural: a requires_review line counts like a pending verdict, so `approveRun`'s existing gate blocks release until ops resolves it. The engine stops being forced to fabricate certainty |
| Priceability Gate separate from documentation depth | **Accept** | S4.3 splits: (a) depth honesty demotions as written; (b) a deterministic `tender_readiness` classification (`fixed_price · allowance_pc · allowance_ps · clarify · owner_interface · contractor_lump_sum · excluded`) computed from applicability, extent, selection, performance, dependency, responsibility, conflicts, authority and dwelling completeness. FULL depth is necessary but never sufficient for fixed_price |
| Evidence quotes ≥ 99% of material claims; entailment on notes and conflicts | **Accept** | S5.1/S5.2 coverage raised; unsupported material statements drop or demote to requires_review, never print with high confidence |
| Spatial grounding (bounding boxes) moved earlier | **Partial** | View type (plan/elevation/section/detail/schedule/render/general-notes) and local view identity ("Unit 1 roof plan") ship WITH the quotes schema — they are what actually resolve W4 and W6. Pixel bounding boxes stay deferred: model-emitted pixel coordinates over raw PDFs are unreliable and expensive, and view identity captures the accuracy value. Boxes return with the reviewer-UI cycle |
| Conflict kinds extended + same-entity gate | **Accept** | S5.3 gains `arithmetic_inconsistency`, `unsupported_model_inference`, `different_location`, `conditional_vs_selected`; conflicts must cite claim ids from findings, and the same subject+dwelling+location gate runs before any comparison. An LLM summary is never evidence for a later conflict |
| Responsibility as an eight-action matrix | **Accept shape, staged** | The single responsibility enum ships first (E6 as planned). An optional `responsibilityMatrix` jsonb records per-action assignments where documents actually state them. Eight mandatory columns on day one would be filled by guesswork, which is the failure mode this programme exists to end |
| Parent systems + roof/box-gutter + package completeness | Already in plan | E7 gains the roof/box-gutter/parapet system and document-package completeness checks |
| Multi-dimensional confidence + ECE calibration | **Accept, staged** | End state agreed. Start by persisting the two or three sub-scores whose producing signals will actually exist after Wave 2 (evidence, applicability, priceability); calibrate the scalar first (E2); ECE < 0.05 adopted as the mature-corpus target. Six uncalibrated numbers are not better than one |
| Tender issue gate (v2 §24) | **Accept** | A run-level deterministic safe-to-issue checklist at Wave 4, consuming conflicts, dependencies, priceability, dwelling completeness and requires_review counts |
| Incident capture: one click turns a production error into a regression case with source hashes | **Accept** | Folded into E2. The corpus grows by captured failure |
| Fine-tuning policy: not yet, and never for final judgement | **Adopted verbatim** | Matches Part I; v2's articulation of *why* (training on current outputs trains the failure modes harder) is kept |
| "What not to do" list (v2 §27) | **Adopted** | With two additions of ours: one extraction-schema release per programme (below), and every new stage must fit the 740s tick budget |

---

## 8. Where the code corrects the blueprint

1. **Findings are jsonb; items are relational.** The rich claim fields
   live in `scope_run_documents.findings`, which needs no migration and
   is already versioned by `SCOPE_PIPELINE_VERSION`. `scope_run_items`
   gains only the small set of judgement columns: `dwelling_scope`,
   `responsibility`, `gap_class`, `tender_readiness`, `review_state`.
   The v2 field table conflates the two levels; the codebase should not.
2. **Claims are born at extraction, not normalised afterwards.** The
   extraction call already holds the pages. Growing its schema costs
   output tokens (measured against the 60% headroom line, per S5.1's
   discipline); a separate normalisation pass costs a fifth model call
   per document and re-reads everything.
3. **The dependency engine is an upgrade, not a build.** docRefs +
   namedMissingDocuments exist today. W2 is fixed by classifying and
   persisting what is already captured.
4. **Correction capture already exists.** `scope_review_events` records
   structured before/after with actor and time. v2's ask is the READER
   (P0-04), which is Part I's E2 — not new capture.
5. **`scope_run_items.figures` already exists** (jsonb, per item), so
   the figure-persistence half of the claim schema is a write-path
   change, not a schema change.
6. **The entailment verifier is code-first.** With quotes persisted,
   exact-span entailment is string discipline over findings; only the
   hard residue (paraphrase entailment on material claims) may need a
   cheap model pass, and that gets measured before it ships.

---

## 9. The one sequencing improvement over both plans

`SCOPE_PIPELINE_VERSION` keys extraction reuse: every bump re-extracts
every document on the next run of any project. Part I planned two bumps
(Wave 1 and Wave 2). The blueprint implies three schema-touching waves.

**Do it once.** Every extraction-schema change in the programme —
exclusions, modality, claim semantics, genericity, quantities/basis,
dwelling/view identity, evidence quotes — lands in ONE schema release,
designed together, measured together against token headroom on the
golden corpus offline (`dev-golden-local.mts` runs the real pipeline
against local files, so the schema can be iterated without touching a
database or a customer project).

After that single bump to v7, every later wave is synthesis prompts,
residual prompts, and deterministic code — none of which invalidates
extraction reuse. Wave 3's entailment verifier reads quotes that Wave 1
already persisted.

Revised wave map:

| Wave | Bump | Content |
|---|---|---|
| 0 | none | Both golden packages labelled; shipped-pipeline scorer; metric suite (union of Part I + v2 targets); correction reader; variance + cost baselines on v6 |
| 1 | **v7, the only extraction bump** | The full extraction schema release (S3.3 + S3.6 + quotes + view identity + figures-as-claims) + the deterministic engines over it (figure parser, arithmetic identities, basis reconciliation, negation/modality index, doc-status split, dependency classification) |
| 2 | none | Calibrated judgement: applicability gates + evidence-carrying residual + gap_class + review_state + Priceability Gate + positive NOT EXPECTED (synthesis/residual prompts + code) |
| 3 | none | Evidence and conflict integrity: entailment verifier, conflict engine v2 with same-entity gate and claim-id citation, deterministic-wins arbitration |
| 4 | none | Tender intelligence: parent systems, clarification register, schedule kinds for gap_class/tender_readiness, tender issue gate, incident capture |

Every wave still gates on the golden diff (S1.3), variance (S1.4) and
the shadow re-runs of both packages (S8.2, now Dow AND Wallace).

---

## 10. Amended story ledger

Deltas only; Part I text stands where unlisted.

- **S1.1** → two packages. 108 Dow labelled from its audit; 57 Wallace
  labelled from the 241-line verification (needs the source file).
  Regression suite is the union: DOW-* and WAL-* cases as named in v2
  §20, each encoded machine-checkable.
- **S1.2** → metric suite gains false-NOT-EXPECTED (< 1%, zero on
  critical), priceable precision (≥ 98%), dependency classification
  (≥ 95%), pass-to-pass agreement (≥ 98%), ECE (< 0.05 mature).
- **S3.2** → + arithmetic identity checks with nominal/tolerance
  handling (WAL-NUM-001).
- **S3.3** → negation AND modality; a conditional or possibility phrase
  is a search trigger, never scope (WAL-MOD-001); `provision_only`
  covers symbols and rough-ins (WAL-PROV-001).
- **S3.4** → scoped to dwelling + location/view label + view type;
  same-location gate feeds S5.3 (WAL-CONF-001).
- **S3.5** → `issue_status` and `approval_status` split; 180-day
  currency advisory, configurable; dependency records classified from
  existing docRefs (WAL-DOC-001, WAL-CUR-001).
- **NEW S3.6 — the claim schema** → extraction emits, per material
  finding: polarity, modality, genericity (incl. `render_only`,
  `template_note`), selectedness, quantity/unit/basis, dwelling/view
  identity, and a short verbatim quote. One schema release with S3.3
  and S5.1's quote capture; headroom measured on the largest golden
  document before merge (WAL-GEN-001, WAL-EVID-001).
- **S4.2** → + the false-NE gate alongside the 100% genuine-gap recall
  gate. Both directions guarded.
- **S4.3** → split into S4.3a (depth honesty, as written) and S4.3b
  (the deterministic Priceability Gate producing `tender_readiness`;
  WAL-PRICE-001/002). FULL depth never implies fixed_price.
- **NEW S4.5 — abstention** → `review_state = requires_review` on items
  where evidence is insufficient or a material conflict/dependency is
  unresolved; counts as pending for `approveRun`; desk surfaces it as
  its own queue. The engine is permitted to say "I cannot decide this".
- **NEW S4.6 — gap_class** → the six-class taxonomy persisted per gap;
  pack-review and the schedule consume it (a referenced_package_missing
  line asks the owner for the document, never for a new commission).
- **S5.1** → quote coverage ≥ 99% of material claims; view identity
  attached; pixel boxes explicitly deferred.
- **S5.2** → entailment over item notes AND conflicts; unsupported
  material statements drop or demote to requires_review.
- **S5.3** → conflict kinds extended; same-entity gate; conflicts cite
  claim ids; LLM summaries inadmissible as conflict evidence.
- **E6** → + optional `responsibilityMatrix` jsonb (per-action, only
  where stated); `tender_readiness` maps into `ScheduleItemKind`.
- **E7** → + roof/box-gutter/parapet system; + document-package
  completeness; clarification register consumes dependency records.
- **E2** → + incident capture (one click, error → regression case with
  source hashes); + ECE calibration; carried verdicts stay excluded
  from accuracy math.
- **E8** → + the tender issue gate (v2 §24) as the programme's
  run-level output; + v2 §26's counter list adopted
  (negationSuppressed, conflictsReconciled, conflictRetyped,
  entailmentFailed, fullDemoted/priceabilityBlocked,
  residualDefaultedGap/NotExpected, dependencyClassified,
  spatialMismatchSuppressed).

---

## 11. Dependencies and asks

1. **The Wallace audit source file** (the full 241-line verification,
   `1_BuilderHQ_Full_241_Findings_Verification_57_Wallace`) is needed in
   `~/Downloads` to label golden package #2. Part II is built from v2's
   summary of it; the labels need the original.
2. **Confirmation to start Wave 0.** Nothing in Wave 0 touches the
   pipeline's behaviour, prompts, live data, or any customer surface —
   it is scorers, labels and readers.
3. Standing rules from Part I §0 remain in force, including: live data
   untouched, one extraction bump, no status widening, no fine-tuning.

---
---

# Part III — The strategy conversation, resolved (27 August 2026)

Aryan's seven strategic questions, plus three directives, folded into
the programme. Part I and Part II stand; this part amends and extends.

---

## 12. Ontology strategy (questions 1, 2, 4)

**The list stays.** Canonical ids are the product: comparable quotes,
carry-forward, regression scoring and analytics all key on them. The
open world already has its lane (offStandard captures → promotion; 14
items learned so far). What changes is that the list stops being a
quota and becomes a checklist that evidence activates.

**S4.1 is upgraded from metadata to a four-tier reclassification of
the whole Standard**, drafted in `docs/ontology-tiering-draft.md`:

| Tier | Count | Gap semantics |
|---|---|---|
| CORE | 89 | Silence on an applicable project is a genuine hole |
| CONDITIONAL | 119 | No activation signal → NOT EXPECTED with positive reason; may NEVER mint an unprompted gap |
| ALTERNATIVE | 26, in 9 selection groups | A selected sibling resolves the group; only "no selection at all" is one gap, on the group, never per sibling |
| COMMERCIAL | 22 | Never a document gap; gap_class contractor_obligation / statutory, priced in the lump sum |

Only 89 of 256 items retain the power to gap on silence. The tier
draft requires human ratification (Aryan + QS review) before it
becomes data; 15 starred borderline calls are listed in the draft.

**Expansion ships with the tiers, never before them** (every new item
is otherwise a new false-gap source). 66 vetted candidates with
activation signals sit in `docs/ontology-expansion-candidates.md`;
they enter as Scope Standard v1.3 in the same release as tier
metadata, via the existing vocab governance. The capture lane remains
the organic growth channel.

**New story S4.7 — the statutory layer.** Work required by law
regardless of drawings (drafted in `docs/statutory-layer-draft.md`:
smoke alarms, RCDs, wet-area waterproofing, tempering valves, safety
glazing, plumbing certificates, and the reverse list of
assumed-statutory-but-discretionary). Statutory items are never design
gaps and never lost scope: silence routes them to
gap_class=contractor_obligation with the legal basis in the note.
ACs: the layer is rule data validated by `dev-scope-validate`; golden
packages assert no statutory item ever appears as a design gap;
the reverse list asserts no discretionary item is auto-inserted.

## 13. Pack-composition-aware judgement (directive 3)

Packs range from one architectural set to a full consultant suite.
The engine must judge silence RELATIVE TO WHAT WAS SUPPLIED, so that a
sparse pack yields dependencies and clarifications, not fabricated
design gaps; and a rich pack earns stronger conclusions.

**New story S4.8 — the pack profile.**
- Ontology items gain `evidencedBy: documentKind[]` (which document
  classes normally carry this item's evidence: structural, energy,
  hydraulic, architectural...). Drafted alongside the tier review.
- Every run computes a pack profile (which kinds are present) from the
  register it already classifies.
- Gap semantics consult both: a CORE item whose evidencing kind is
  ABSENT from the pack becomes gap_class=later_consultant_package
  ("expected in the structural package, which was not supplied") —
  never a bare design gap; if a supplied document NAMES the missing
  package (docRefs), referenced_package_missing. A CORE item whose
  evidencing kind IS present and silent is a true design gap.
- The residual classifier and synthesis receive the pack profile.
- The owner pre-flight (S4.9) surfaces composition BEFORE the run:
  "no engineering set was supplied; footings, bracing and steel will
  be carried as engineer-package items" — expectation set upfront,
  reusing `namedMissingDocuments` at upload time.
- Metrics: false-gap rate reported STRATIFIED by pack completeness.
  The two golden packages are exactly the two poles (Dow ten
  documents, Wallace one), so the stratified metric is measurable from
  Wave 0.

**New story S4.9 — owner pre-flight at upload** (product surface of
S4.8; advisory only, never blocks submission).

## 14. The human layer: reversible, attributable judgement (directives 1, 2)

**New epic E9.** Verdicts and edits are decisions people make, and
people fix mistakes; the record must survive the fixing with the
label math intact.

### S9.1 — Desk verdicts are reversible
Every verdict on the run desk (item confirm/edit/remove/add, conflict
verdicts, capture promote/dismiss) gains a REOPEN action returning the
row to `pending`, available until the run is approved; after approval,
reopening requires an explicit "amend approved pack" path that records
itself. ACs:
- [ ] Reopen writes `item.reopened` (etc.) to `scope_review_events`
      with full before/after; nothing is ever deleted from the log.
- [ ] The correction reader (E2) scores only each row's FINAL
      first-hand state; reversed verdicts are excluded from label
      math, and a reversal-rate metric is reported (high reversal rate
      is itself desk-UX signal).
- [ ] `approveRun`'s pending gate naturally re-blocks on reopened rows
      (a reopened row IS pending); verdict carry (`verdictFor`) never
      carries a reopened row.
- [ ] Reversing a capture PROMOTION retires the created vocab
      extension if no other run evidences it (status `retired`
      exists); a used extension refuses retirement with a clear
      message.
- [ ] An added item can be un-added before approval; the row is
      removed and the event log keeps the full story.

### S9.2 — Owner amendments to scope items
Owners can edit scope items on their own pack. Design principles:
- Owner edits are AMENDMENTS, visibly attributed ("Amended by the
  owner"), never silently merged into AI-evidenced lines: the AI's
  citations stay with the AI's text; the owner's wording carries no
  fabricated citations.
- Before go-live: owners may amend an item's note/description, change
  a gap's answer (existing), exclude an item, or add a
  project-specific line (custom.* lane). Stored with actor identity in
  the same review-event stream (`actorRole: owner`).
- After go-live: amendments flow through the EXISTING addendum
  machinery (schedule diff already computes added/revised/removed) so
  every builder on the round sees the same change, versioned; no
  silent post-issue drift.
- Feedback loop: owner amendments are recorded as first-hand owner
  labels — lower authority than ops verdicts in accuracy math,
  reported separately (they are preference/knowledge signal, not
  ground truth about the documents).
- Guardrail: owners cannot flip a line to evidenced-with-citations;
  evidence claims remain the engine's and the desk's alone.
ACs: every amendment event-logged with before/after; builder deck
renders the owner-amended badge; addendum diff treats post-issue
amendments as revisions; golden metrics unaffected by owner edits
(separate stream); pack-review UI offers edit affordances on every
line, gated to the project's runner.

### S9.3 — Label integrity under reversal and amendment
The single rule that keeps the flywheel honest: **the event log is
append-only truth; every consumer (correction reader, calibration,
golden auto-drafts) reads final first-hand states per actor class, and
reversed or superseded decisions never count as labels.** ACs: reader
tests cover reopen-then-confirm, reopen-then-edit, owner-amend-after-
ops-confirm, and promotion-reversal; each produces exactly one label
or none, never two.

## 15. Model policy and remaining strategy rulings (questions 3, 5, 6, 7)

- **No autonomous agents in the production pipeline.** Narrow
  single-purpose calls in a deterministic DAG. Agentic workflows are
  for engineering (recon, verification, labelling), where they already
  caught a wrong regression label (WAL-CONF-001).
- **Skills for the ceremonies** (Wave 0 deliverables): golden-package
  labelling, wave release checklist, regression triage, migration
  authoring.
- **The text-layer oracle** joins S5.2: drawing PDFs carry full text
  layers (verified on Wallace: 17,850 chars on p.1). A quoted span
  absent from the cited page's text layer is fabricated — a
  deterministic, zero-cost entailment check that runs before any
  model-based verification. Visible-print rules still apply (text
  present in the layer may be residue; the oracle is
  necessary-not-sufficient, used to KILL fabrications, not to bless
  quotes).
- **Schedules-as-tables** extraction (window/door/finishes schedules
  as structured rows) joins the Wave 1 schema design.
- **Model changes only over a golden diff.** No provider or tier
  change, up or down, without corpus proof. Sonnet-per-stage
  benchmarking stays P3; OpenAI only ever as a decorrelated
  second-opinion experiment; open-source fine-tunes blocked until the
  corpus matures (extraction/mapping first, judgement never).
- **The feedback loop** is the closed measurement loop of Part I E2 +
  Part II additions, now with S9.3's integrity rule. Auto-approval
  thresholds are earned from calibration curves, never configured.

## 16. Revised wave map (final)

| Wave | Bump | Content |
|---|---|---|
| 0 | none | Golden packages ×2 (labels per the Wallace audit tiers in `docs/wallace-verification-audit.md`); shipped-pipeline scorer; metric suite incl. pack-stratified false-gap rate; correction reader; **S9.1 desk reversal + S9.3 integrity rules**; ceremony skills; variance/cost baselines |
| 1 | v7 — the only extraction bump | The full extraction schema release: claims (polarity, modality, genericity, selectedness), quantities/basis, dwelling + sheet-id/view identity, evidence quotes, schedule tables + deterministic engines over findings (figures, arithmetic identities, negation/modality index, doc-status split, dependency classification) |
| 2 | none | Calibrated judgement: ontology v1.3 (tiers + evidencedBy + expansion + statutory layer), applicability gates, evidence-carrying residual, gap_class, review_state abstention, Priceability Gate, **S4.8 pack profile + S4.9 pre-flight** |
| 3 | none | Evidence integrity: text-layer oracle + entailment verifier, conflict engine v2 (same-entity gate, claim-id citations, deterministic-wins) |
| 4 | none | Tender intelligence: parent systems, clarification register, schedule kinds for gap_class/tender_readiness, tender issue gate, **S9.2 owner amendments**, incident capture |

Status: **READY TO DEVELOP. Wave 0 first; nothing in it touches
pipeline behaviour or live data.**

---
---

# Wave 0 — DELIVERED (27 August 2026)

The measuring equipment is built, both poles of the corpus are
labelled, the flywheel is closed and the desk is reversible. Nothing in
this wave changed pipeline behaviour; all of it measures or protects
it.

| Story | Delivered |
|---|---|
| S1.2 scorer + metric suite | `src/modules/scope/golden-v2.ts` — 9 targets, 8 assertion kinds, 28 tests, 3 mutations confirmed caught |
| S1.1 golden packages | `57-wallace-street` (241 lines, sparse pole) and `108-dow-street` (54 lines, rich pole) |
| S1.3 score persistence | `eval/scope-golden/scores/<pkg>/<label>-<stamp>.json` |
| S1.5 label validator | `scripts/dev-golden-validate.mts` — refused a package on first run, correctly |
| S2.1 correction reader | `src/modules/scope-engine/corrections.ts` — 21 tests, 4 mutations, 1 test gap found and closed |
| S9.1 desk reversal | reopen for items, conflicts and captures; 9 DB-backed tests |
| S9.3 label integrity | reversals excluded from accuracy, reported as a rate |
| Ceremony skills | `.claude/skills/` — golden-label, wave-release, regression-triage, scope-migration |

## The v6 baseline

| Metric | Wallace (1 doc) | Dow (10 docs) | Target |
|---|---|---|---|
| False-gap rate | 56.2% | **62.7%** | ≤ 5% |
| Priceable precision | 46.7% | 50.0% | ≥ 98% |
| Gap-class accuracy | 0.0% | 0.0% | ≥ 95% |
| Conflict precision | 33.3% | 40.0% | ≥ 97% |
| Conflict recall | 33.3% | 40.0% | ≥ 95% |
| Citation validity | 96.2% | 100% | ≥ 98% |
| False not-expected | 8.0% | 0.0% | ≤ 1% |
| False NE on CORE | **0** | **0** | 0 |
| Dwelling merges | **0** | **0** | 0 |
| Regressions | 1/14 | 1/10 | all |

Desk corrections, production: implied agreement **88.6%** over 1,193
judged lines; 0 lines added by hand across five runs.

## Four findings that reshape the programme

1. **The false-gap rate is WORSE on the rich pack than the sparse one.**
   Ten documents produced a higher proportion of wrong gaps than one.
   The engine does not over-gap from missing information; it over-gaps
   because it does not know what a gap is. Calibration, not retrieval,
   is the primary fix — but see (4).

2. **The engine never hides work.** False not-expected is 0% on the
   rich pack and 0 on CORE items everywhere, and the desk has added
   exactly 0 lines by hand across five runs. Two independent
   measurements agree: every failure is over-production, which is the
   safe direction to correct.

3. **Confidence is two different signals wearing one number.** Every
   fabricated evidence claim sat below the 0.65 floor; gap confidence
   is a flat 0.7 constant identical to the whole-run mean. Per-dimension
   calibration is now demonstrated from production data, not argued.

4. **Ten of Dow's 51 gaps were already evidenced in the supplied pack.**
   On a ten-document pack that is a RETRIEVAL failure, distinct from
   calibration and needing its own fix. Wave 2's evidence-carrying
   residual addresses it; Wave 1's schedule extraction helps.

Of the engine's 121 Wallace gaps, **21 are true design gaps**. Of Dow's
51, **7 are**. That ratio is the programme's headline.

## Wave 1 opens

The single extraction-schema release. Nothing in Wave 1 ships until the
schema is designed whole, measured against token headroom offline, and
scored against both baselines above.
