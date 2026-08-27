# The Wallace verification, audited

**27 August 2026.** The 241-line verification of 57 Wallace Street
(`1_BuilderHQ_Full_241_Findings_Verification_57_Wallace.pdf`) was
checked against the primary source: the 21-page architectural set
itself. Five independent verifiers read the drawings adversarially,
instructed to refute the auditor's claims. This file records what
survived, what did not, and the label policy for golden package #2.

Headline: **the verification is substantially sound — most factual
claims checked out verbatim — but it is not label-grade as-is.** Two of
its verdicts are wrong on the evidence, its page citations drift, and
its three-value vocabulary (approve / correct / remove) loses
distinctions our schema exists to keep. And in one decisive case the
auditor, ChatGPT's v2 synthesis, and the engine are all wrong in
different ways about the same page.

---

## 1. Confirmed against the drawings (safe basis for labels)

Every one of these was verified by direct read, with the printed words:

- **p.1 prints "BAL Level : N/A"** — the engine's bushfire gap was a
  false positive. Auditor right.
- **p.1 is a dense general-notes sheet**: site management plan, hoarding,
  temporary footpath crossing, waste recycling, silt fences, corrosion
  protection for built-in steel, tie-downs to BCA 5.6.6, exhaust flow
  rates. The auditor's reclassification of the 13 preliminaries gaps to
  contractor obligations has the printed basis he claimed.
- **p.2**: TPZ arcs with the 1.80 m tree-protection fence spec; two MB
  and two WM locations; "Level 2 (Mode 3) 32AMP EV Car Charging" in
  both garages.
- **p.4**: the room is labelled **"Pantry"** — no "Butler's Pantry"
  anywhere. The engine's evidenced line (conf 0.55) overreached.
  No French/hinged external doors. "Roll-A-Door" at 5,000 openings.
  Knauf Partiwall PWT60.1 FRL 60/60/60 printed twice.
- **p.6**: "2.5KW Solar PV System 25deg Pitch North Facing (8 panels
  @330w each)" — printed twice. 8 × 330 = 2,640 W vs the 2.5 kW label:
  the missed arithmetic discrepancy is real.
- **p.10/12**: "Concrete Slab As per Engineers Design" verbatim — the
  raft-slab line overreached. Energy tables print insulation NIL to
  ground floors, and Unit 2 alone carries "INTERNAL WALLS
  POWDER/ENSUITE R2.5" and "SKYLIGHT SHAFT R2.5". Framing schedule is
  timber-only with "Refer Engineering" on bracing and lintels.
- **Flyscreens: zero occurrences in the whole set.** The only "fly
  screen" string in 21 pages is a rainwater-tank strainer simile
  ("fine stainless steel mesh is similar to fly screen mesh") — a
  perfect trap for naive text search. The engine's flyscreen gap was a
  prior leak; the auditor's removal is right.
- **p.11**: "IF IRRIGATION IS REQUIRED, DRIP IRRIGATION AND MULCH IS TO
  BE USED" verbatim; the ASD adjustable-shading spec (east/west
  operable, north fixed) is real, so the privacy-screens line was a
  misread of shading devices; "13% OF THE SITE USED FOR VEGETATION".
- **p.14**: "Shale Grey" lives on the colour schedule; it is NOT
  printed on pp.5/6 or the sections the engine cited for its
  metal-roof note. The citation-grounding complaint stands.
- **pp.16-17**: DFT or 24-hour water test required; no applicator
  certificate anywhere; multiple substrates permitted; no proprietary
  membrane fixed.
- **pp.18-19**: "**No Gas Conection will be supplied to the site**"
  (sic) on both electrical sheets; interconnected smoke detectors;
  video intercom wording is on p.18.
- **The 35 vs 25 L/s exhaust contradiction is real and printed** —
  35 L/s in the sanitary-compartment notes (pp.4, 5, 18, 19) against
  25 L/s in the NCC exhaust tables (p.1 and p.15).

## 2. Where the auditor is wrong on the evidence (override)

### 2a. The roof pitch conflict — the auditor's dismissal is incorrect

Auditor: *"The 2-degree and 59-degree notes apply to different roof
planes and are explicitly shown together. Not a contradiction."*
Verifier, reading p.6: the 59° note and the 2° notes annotate roof
planes of the **same building**; the 59° appears once, is anomalous
against the flat parapet-and-box-gutter design (cappings at minimum 3°
fall), is partially overlaid by the building-permit stamp, and is
plausibly a typo. The page is internally inconsistent.

The ENGINE's original card — confirm whether 59° is a feature slope or
a drafting error — was the right instinct. The correct label is a
document-anomaly clarification (requires_review), neither the engine's
"system contradiction" framing nor the auditor's silent dismissal.
**WAL-CONF-001 as drafted by v2 ("different locations; no conflict")
would lock a wrong answer into the regression suite. It must be
rewritten before any labelling.**

### 2b. Sub-soil drainage — removal overturned

Auditor called the AG-drain note "only conditional". p.2 also prints
mandatory AG requirements: "must be installed at the base of all
excavations and along the high side of a sloping site… 400mm into the
soil and 100mm below any adjacent footing." There is real AG scope.
The engine's evidenced-partial was closer than the auditor's REMOVE.

### 2c. The deck — everyone was wrong differently

- Engine: "Timber deck/balcony structure visible in perspective
  render" (conf 0.35). **Fabrication** — p.21's six renders show no
  deck, balcony, platform or pergola of any kind, cross-checked
  against pp.4-9.
- v2's synthesis: framed it as a render *misread* needing lower render
  authority. Wrong — there was nothing deck-like to misread.
- Auditor: right that it must be removed; his "visual false positive"
  undersells it.

Reclassified: this is a **citation-entailment failure** (the cited page
does not contain the asserted content), which moves its remediation
weight from the genericity axis to the entailment verifier. The
genericity axis is still justified — by the ducted/split inference and
template notes — but not by this case.

### 2d. Steel members — his own logic, applied consistently

He removed steel beams/columns as NOT EXPECTED while ruling strip/pad
footings and waffle slabs "do not mark NOT EXPECTED yet — engineer
decides", and while p.1 expressly anticipates "built-in structural
steel members such as steel lintels" and his own row keeps steel
lintels evidenced. Steel members are a **later-structural-package
dependency**, not NOT EXPECTED. Same for laundry appliances: the plans
show provision (W/M positions, power), nothing establishes supply —
that is `provision_only` responsibility, not a row to delete.

## 3. Systematic weaknesses in the verification

1. **Lossy vocabulary.** "REMOVE / NOT EXPECTED" bundles at least four
   meanings: genuinely inapplicable, later-package dependency,
   duplicate-alternative (square-set vs cornice), and
   responsibility-move (laundry). Labels must map his verdicts into
   gap_class / tender_readiness / responsibility, not copy his column.
2. **Citation drift.** Solar attributed to p.11 (it is p.6); "video
   intercom p.14" (video wording is p.18); 25 L/s attributed to p.1
   general services (the governing pair is pp.15/18-19). Substance
   usually survives; his page numbers do not. Golden labels re-cite
   from verifier quotes.
3. **He graded lines, not the pack.** Correct per his own scope note,
   but it means his APPROVEs include lines whose notes carry importable
   wording; approval ≠ note-quality endorsement.

## 4. What five fresh readers found that everyone missed

- **The PDF's page order and the sheet numbers diverge**: PDF p.11 is
  WD12 (ESD) and PDF p.12 is WD11 (garage section). Any citation by
  PDF page silently diverges from any citation by sheet number.
  Consequence for the programme: citations should carry the printed
  sheet id ("WD12") alongside the PDF page — this goes into the Wave 1
  extraction schema (view identity).
- **The permit stamp overlays content** — the 59° note is partially
  under it. Stamps are noise layered on evidence; extraction must read
  through them, and did not flag it.
- **The dwellings are NOT clones.** Different areas (216.3 vs
  219.31 m²), different render colours per unit, different wet-area
  layouts, Unit 2 carrying insulation rows Unit 1 lacks. Clone pricing
  per dwelling is unsafe, which strengthens the dwelling-namespace case
  beyond "don't merge certificates".
- Cost lines both passes under-served: the front-fence package (brick
  piers, powdercoated gates, intercom, letterboxes), the 1500 Colorbond
  inter-tenancy dividing fence, the temporary footpath crossing and
  council crossovers, charged-rainwater components (pump, mains backup,
  first-flush), ASD shading as a purchased product, and the ventilating
  skylight in the energy schedule.
- The building permit was **issued 27/08/2024, after Rev D's
  4/08/2024** — a clean example of approval-status and currency being
  separate facts.

## 5. Label policy for golden package #2

| Tier | Rows | Policy |
|---|---|---|
| 1 | APPROVE rows + absence-removals whose basis a verifier confirmed | Label from the verdict, cite from verifier quotes |
| 2 | Contractor-obligation / later-package / statutory reclassifications | Map into gap_class + tender_readiness + responsibility; never store as bare remove |
| 3 | The overrides in §2 (roof pitch, sub-soil drainage, deck framing, steel, laundry) | Label from this document, not the auditor |
| 4 | Contested rows where drawings alone cannot decide | Mark `reviewer_confirmation: required`; Aryan or a QS adjudicates |

Regression edits against v2's suite: rewrite WAL-CONF-001 (anomaly →
requires_review, not "no conflict"); reframe WAL-EVID-001 as
fabricated-evidence entailment; add WAL-DRAIN-001 (mandatory AG notes
are evidence, the conditional clause does not erase them) and
WAL-SHEET-001 (citations record the printed sheet id; the WD11/WD12
swap must not corrupt page-keyed citations).

## 6. One calibration fact worth keeping

Matched to the engine's export, the 62 removed rows split cleanly:
every row where the engine had claimed EVIDENCED and the auditor called
overreach sat **below the 0.65 confidence floor** (deck 0.35 → butler's
pantry 0.55) — for evidence claims, the model's self-doubt is real
signal. The other 55 are gaps carrying the residual pass's flat 0.7,
identical to the whole-run mean (0.670 vs 0.668): on gaps, confidence
is a constant, and encodes nothing. Per-dimension calibration is not a
nice-to-have; our own production data already proves the two dimensions
behave differently.
