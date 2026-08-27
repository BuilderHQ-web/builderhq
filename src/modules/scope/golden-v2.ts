/**
 * scope · the golden set, v2.
 *
 * WHY A SECOND FORMAT. v1 (`golden.ts`) scores two binary sets: did the
 * pipeline evidence the right items, did it gap the right items. Two
 * independent audits then proved the engine's failures are not set
 * membership at all. They are CALIBRATION: gaps minted from possibility
 * rather than evidence, "priceable" claimed while engineering is
 * unresolved, conflicts invented between two of the model's own
 * inferences, evidence quoted from a page that does not contain it.
 * None of that is visible to a set-membership scorer, so v2 labels the
 * dimensions those failures live on and scores each one separately.
 *
 * THE SHAPE. A label is one row per Standard item carrying what a
 * careful human concluded and WHY, plus the provenance of that
 * conclusion. Contested rows are marked rather than guessed: a label
 * nobody has ratified is worth less than one that has been, and the
 * scorer needs to know the difference.
 *
 * Pure functions, no I/O — the runner, the CI gate and any future
 * harness all call the same arithmetic on the same numbers.
 */

import type { ScopeProjectType } from "./types";

// ── vocabulary ──────────────────────────────────────────────────────

/** What the persisted three-state status should be for this line. */
export type GoldenCoverage = "evidenced" | "gap" | "not_expected";

/**
 * The applicability tier. Only `core` items may become a gap on
 * silence alone; everything else needs a positive signal, which is the
 * whole calibration fix. See docs/ontology-tiering-draft.md.
 */
export type GoldenTier = "core" | "conditional" | "alternative" | "commercial";

/**
 * WHY a line is a gap, which decides what the owner is asked to do. A
 * design gap sends them to a consultant; a referenced package sends
 * them to a filing cabinet; a contractor obligation sends them
 * nowhere. Collapsing these into one word is what made 51 gaps out of
 * 7 on the first audited project.
 */
export type GoldenGapClass =
  | "design_gap"
  | "referenced_package_missing"
  | "later_consultant_package"
  | "delegated_design"
  | "commercial_allowance"
  | "contractor_obligation"
  | "statutory";

/** Who carries the line, where the documents say so. */
export type GoldenResponsibility =
  | "builder"
  | "owner_supply"
  | "owner_package"
  | "third_party"
  | "provision_only"
  | "unresolved";

/** Where a label came from, because labels are evidence too. */
export type GoldenLabelSource =
  /** Taken from an independent audit's own verdict. */
  | "audit"
  /** Read back off the source documents by a verifier. */
  | "verification"
  /** The audit and the documents disagreed; a human decided. */
  | "adjudicated";

export type GoldenDocumentKind =
  | "architectural"
  | "structural"
  | "civil"
  | "specification"
  | "energy"
  | "soil"
  | "survey"
  | "planning"
  | "other";

// ── the label ───────────────────────────────────────────────────────

export interface GoldenCitation {
  /** Filename inside the package's docs/ directory. */
  file: string;
  page: number | null;
  /**
   * The printed sheet id (WD12), where the drawing carries one. The
   * Wallace set's PDF page order and sheet numbers diverge — PDF p.11
   * is sheet WD12 — so a page-only citation silently crosses sheets.
   */
  sheet?: string | null;
}

export interface GoldenExpectedLineV2 {
  itemId: string;
  /** The coverage verdict a careful reader would reach. */
  coverage: GoldenCoverage;
  /** Applicability tier, from the ratified tier table. */
  tier: GoldenTier;

  /** Required when coverage is `gap`; meaningless otherwise. */
  gapClass?: GoldenGapClass;

  /**
   * Only for `evidenced` lines: could a builder put a fixed price on
   * this without a material assumption? Deliberately separate from
   * documentation depth — Wallace proved a line can carry precise stud
   * schedules and still be unpriceable because bracing is "refer
   * engineering".
   */
  priceable?: boolean;

  /** Which dwelling, on a multi-dwelling project. Null = whole project. */
  dwellingScope?: string | null;

  responsibility?: GoldenResponsibility;

  /**
   * Pages a reader could legitimately cite. Used to score citation
   * validity: a citation OUTSIDE this set is not automatically wrong
   * (readers differ), but a citation to a document that carries
   * nothing on this item is.
   */
  citations?: GoldenCitation[];

  /** One line on why. The next labeller reads this before disagreeing. */
  basis?: string;

  source: GoldenLabelSource;

  /**
   * Set when the row is contested and a human has not yet ratified it.
   * Such rows are EXCLUDED from headline metrics and reported
   * separately — an unratified guess must never look like ground truth.
   */
  reviewerConfirmation?: "required" | "confirmed";
}

export interface GoldenExpectedConflict {
  /** Stable id so a regression can name it. */
  id: string;
  /** What the conflict is, in a sentence. */
  summary: string;
  /**
   * Whether a correct engine SHOULD raise this. `false` records a
   * conflict the engine did raise and must stop raising — those are as
   * valuable as the true ones.
   */
  genuine: boolean;
  /** Words that identify this conflict in engine output, lowercased. */
  matchTerms: string[];
  citations?: GoldenCitation[];
  basis?: string;
  source: GoldenLabelSource;
}

// ── regressions ─────────────────────────────────────────────────────

/**
 * A named, machine-checkable assertion. Every production incident
 * becomes one of these, so a bug fixed once is a bug that cannot
 * return quietly.
 */
export type GoldenAssertion =
  | { kind: "coverage"; itemId: string; equals: GoldenCoverage }
  | { kind: "coverageNot"; itemId: string; notEquals: GoldenCoverage }
  | { kind: "gapClass"; itemId: string; equals: GoldenGapClass }
  | { kind: "priceable"; itemId: string; equals: boolean }
  | { kind: "conflictPresent"; matchTerms: string[] }
  | { kind: "conflictAbsent"; matchTerms: string[] }
  /** Every citation on this item must land on a labelled page. */
  | { kind: "citationsGrounded"; itemId: string }
  /** These items must not be collapsed onto one dwelling. */
  | { kind: "dwellingsDistinct"; itemIds: string[] };

export interface GoldenRegression {
  /** e.g. "WAL-NEG-001". */
  id: string;
  title: string;
  /** Why this case exists — usually an incident. */
  rationale?: string;
  assertions: GoldenAssertion[];
}

// ── the package ─────────────────────────────────────────────────────

/**
 * What the pack actually contained. Metrics are stratified by this,
 * because "did we judge silence well" is a different question on a
 * ten-document pack than on a single architectural set, and an
 * average across both hides the answer to each.
 */
export interface GoldenPackProfile {
  suppliedKinds: GoldenDocumentKind[];
  /** sparse = drawings only; partial = some consultants; full = the suite. */
  completeness: "sparse" | "partial" | "full";
}

export interface GoldenExpectedDocumentV2 extends GoldenCitation {
  kind: GoldenDocumentKind;
  revision: string | null;
  pages: number | null;
  /** sha256 of the file, so a package cannot silently change under its labels. */
  sha256?: string;
}

export interface GoldenPackageV2 {
  schemaVersion: 2;
  slug: string;
  title: string;
  projectType: ScopeProjectType;
  /** Scope Standard version these labels were written against. */
  labelledAgainst: string;
  labelledBy: string;
  labelledAt: string;
  packProfile: GoldenPackProfile;
  documents: GoldenExpectedDocumentV2[];
  lines: GoldenExpectedLineV2[];
  conflicts: GoldenExpectedConflict[];
  regressions: GoldenRegression[];
  notes?: string;
}

// ── what the pipeline produced ──────────────────────────────────────

export interface ScoredItem {
  itemId: string;
  status: GoldenCoverage;
  depth?: "full" | "partial" | null;
  /** Present once the Priceability Gate ships; falls back to depth. */
  priceable?: boolean | null;
  gapClass?: string | null;
  dwellingScope?: string | null;
  citations?: Array<{ file?: string; page?: number | null }>;
}

export interface ScoredConflict {
  summary: string;
}

export interface PipelineOutputForScoring {
  items: ScoredItem[];
  conflicts: ScoredConflict[];
}

// ── metrics ─────────────────────────────────────────────────────────

export interface PRF {
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1: number;
  missed: string[];
  invented: string[];
}

export interface MetricTarget {
  /** Human name, used in the report. */
  label: string;
  value: number;
  /** The number the programme committed to. */
  target: number;
  /** Which side of the target passes. */
  direction: "min" | "max";
  passed: boolean;
  /** What the number is made of, so a failure is diagnosable. */
  detail?: string;
}

export interface RegressionResult {
  id: string;
  title: string;
  passed: boolean;
  failures: string[];
}

export interface GoldenScoreV2 {
  slug: string;
  completeness: GoldenPackProfile["completeness"];
  /** Rows excluded from every metric because nobody has ratified them. */
  unratified: number;
  scoredLines: number;

  evidenced: PRF;
  gaps: PRF;
  conflicts: PRF;

  targets: MetricTarget[];
  regressions: RegressionResult[];

  /** True when every hard target passed and every regression passed. */
  passed: boolean;
}

function prf(tp: number, fp: number, fn: number, missed: string[], invented: string[]): PRF {
  const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 1 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return {
    truePositives: tp,
    falsePositives: fp,
    falseNegatives: fn,
    precision,
    recall,
    f1,
    missed,
    invented,
  };
}

function scoreSet(expected: string[], got: string[]): PRF {
  const want = new Set(expected);
  const have = new Set(got);
  const missed = [...want].filter((id) => !have.has(id)).sort();
  const invented = [...have].filter((id) => !want.has(id)).sort();
  const tp = [...have].filter((id) => want.has(id)).length;
  return prf(tp, invented.length, missed.length, missed, invented);
}

const pct = (n: number, d: number) => (d === 0 ? 0 : n / d);

/**
 * Whether the pipeline called a line priceable. Until the
 * Priceability Gate ships, `depth === "full"` is the closest thing the
 * engine has to that claim, and scoring it is how we prove the gate
 * was needed.
 */
function claimedPriceable(item: ScoredItem): boolean {
  if (typeof item.priceable === "boolean") return item.priceable;
  return item.depth === "full";
}

// ── the scorer ──────────────────────────────────────────────────────

/**
 * Score one pipeline run against one labelled package.
 *
 * Unratified rows are dropped up front rather than counted, so a
 * package can be part-labelled and still produce honest numbers on the
 * part that is settled.
 */
export function scorePackage(
  pkg: GoldenPackageV2,
  out: PipelineOutputForScoring,
): GoldenScoreV2 {
  const unratified = pkg.lines.filter(
    (l) => l.reviewerConfirmation === "required",
  );
  const lines = pkg.lines.filter((l) => l.reviewerConfirmation !== "required");
  const byId = new Map(lines.map((l) => [l.itemId, l]));

  // Only score items the package actually labels; an engine line for
  // an unlabelled id is outside this package's scope, not an error.
  const scored = out.items.filter((i) => byId.has(i.itemId));

  const wantEvidenced = lines.filter((l) => l.coverage === "evidenced").map((l) => l.itemId);
  const wantGap = lines.filter((l) => l.coverage === "gap").map((l) => l.itemId);
  const gotEvidenced = scored.filter((i) => i.status === "evidenced").map((i) => i.itemId);
  const gotGap = scored.filter((i) => i.status === "gap").map((i) => i.itemId);

  const evidenced = scoreSet(wantEvidenced, gotEvidenced);
  const gaps = scoreSet(wantGap, gotGap);

  // ── false gaps: the headline calibration failure ──
  const falseGaps = gotGap.filter((id) => byId.get(id)!.coverage !== "gap");
  const falseGapRate = pct(falseGaps.length, gotGap.length);

  // ── false not-expected: the counterweight. A missed requirement is
  //    more dangerous than a false question, so its target is tighter.
  const gotNotExpected = scored
    .filter((i) => i.status === "not_expected")
    .map((i) => i.itemId);
  const falseNotExpected = gotNotExpected.filter(
    (id) => byId.get(id)!.coverage !== "not_expected",
  );
  const falseNotExpectedOnCore = falseNotExpected.filter(
    (id) => byId.get(id)!.tier === "core",
  );

  // ── priceability ──
  const priceableClaims = scored.filter(
    (i) => i.status === "evidenced" && claimedPriceable(i),
  );
  const falsePriceable = priceableClaims.filter((i) => {
    const l = byId.get(i.itemId)!;
    return l.priceable === false;
  });
  const priceablePrecision =
    priceableClaims.length === 0
      ? 1
      : 1 - pct(falsePriceable.length, priceableClaims.length);

  // ── gap classification ──
  const gapClassLabelled = scored.filter((i) => {
    const l = byId.get(i.itemId)!;
    return i.status === "gap" && l.coverage === "gap" && l.gapClass;
  });
  const gapClassCorrect = gapClassLabelled.filter(
    (i) => i.gapClass === byId.get(i.itemId)!.gapClass,
  );
  const gapClassAccuracy =
    gapClassLabelled.length === 0 ? 1 : pct(gapClassCorrect.length, gapClassLabelled.length);

  // ── citation grounding ──
  const docFiles = new Set(pkg.documents.map((d) => d.file));
  let citationsChecked = 0;
  let citationsValid = 0;
  for (const item of scored) {
    const label = byId.get(item.itemId)!;
    for (const c of item.citations ?? []) {
      citationsChecked++;
      // A citation is invalid when it names a file outside the package,
      // or a page the label says carries nothing for this item.
      if (c.file && !docFiles.has(c.file)) continue;
      const plausible = label.citations ?? [];
      if (plausible.length === 0) {
        citationsValid++; // nothing labelled to contradict it
        continue;
      }
      const ok = plausible.some(
        (p) => (c.page == null || p.page == null || p.page === c.page) &&
               (!c.file || p.file === c.file),
      );
      if (ok) citationsValid++;
    }
  }
  const citationValidity = citationsChecked === 0 ? 1 : pct(citationsValid, citationsChecked);

  // ── dwelling merges ──
  const dwellingMergeErrors = lines.filter((l) => {
    if (!l.dwellingScope) return false;
    const got = scored.find((i) => i.itemId === l.itemId);
    if (!got) return false;
    return (got.dwellingScope ?? null) !== l.dwellingScope;
  }).length;

  // ── conflicts ──
  const conflicts = scoreConflicts(pkg.conflicts, out.conflicts);

  const targets: MetricTarget[] = [
    t("False-gap rate", falseGapRate, 0.05, "max",
      `${falseGaps.length}/${gotGap.length} emitted gaps not labelled gap`),
    t("False not-expected rate", pct(falseNotExpected.length, gotNotExpected.length), 0.01, "max",
      `${falseNotExpected.length}/${gotNotExpected.length}`),
    t("False not-expected on CORE", falseNotExpectedOnCore.length, 0, "max",
      falseNotExpectedOnCore.join(", ") || "none"),
    t("Priceable precision", priceablePrecision, 0.98, "min",
      `${falsePriceable.length} false of ${priceableClaims.length} claims`),
    t("Citation validity", citationValidity, 0.98, "min",
      `${citationsValid}/${citationsChecked}`),
    t("Conflict precision", conflicts.precision, 0.97, "min",
      `${conflicts.falsePositives} invented`),
    t("Conflict recall", conflicts.recall, 0.95, "min",
      `${conflicts.falseNegatives} missed`),
    t("Gap-class accuracy", gapClassAccuracy, 0.95, "min",
      `${gapClassCorrect.length}/${gapClassLabelled.length}`),
    t("Dwelling merge errors", dwellingMergeErrors, 0, "max"),
  ];

  const regressions = pkg.regressions.map((r) => runRegression(r, pkg, out));

  return {
    slug: pkg.slug,
    completeness: pkg.packProfile.completeness,
    unratified: unratified.length,
    scoredLines: lines.length,
    evidenced,
    gaps,
    conflicts,
    targets,
    regressions,
    passed: targets.every((x) => x.passed) && regressions.every((r) => r.passed),
  };
}

function t(
  label: string,
  value: number,
  target: number,
  direction: "min" | "max",
  detail?: string,
): MetricTarget {
  const passed = direction === "min" ? value >= target : value <= target;
  return { label, value, target, direction, passed, ...(detail ? { detail } : {}) };
}

/**
 * Conflicts match on terms rather than ids, because the engine writes
 * its own prose. A labelled conflict is FOUND when an emitted summary
 * contains all of its match terms.
 */
function scoreConflicts(
  expected: GoldenExpectedConflict[],
  got: ScoredConflict[],
): PRF {
  const genuine = expected.filter((c) => c.genuine);
  const forbidden = expected.filter((c) => !c.genuine);
  const summaries = got.map((c) => c.summary.toLowerCase());

  const matches = (c: GoldenExpectedConflict) =>
    summaries.some((s) => c.matchTerms.every((term) => s.includes(term.toLowerCase())));

  const found = genuine.filter(matches);
  const missed = genuine.filter((c) => !matches(c)).map((c) => c.id);
  // A forbidden conflict that appears is a false positive, as is any
  // emitted conflict matching nothing labelled.
  const raisedForbidden = forbidden.filter(matches).map((c) => c.id);
  const unexplained = summaries.filter(
    (s) => !expected.some((c) => c.matchTerms.every((term) => s.includes(term.toLowerCase()))),
  );
  const invented = [...raisedForbidden, ...unexplained.map((s) => s.slice(0, 60))];

  return prf(found.length, invented.length, missed.length, missed, invented);
}

function runRegression(
  reg: GoldenRegression,
  pkg: GoldenPackageV2,
  out: PipelineOutputForScoring,
): RegressionResult {
  const byId = new Map(out.items.map((i) => [i.itemId, i]));
  const labelById = new Map(pkg.lines.map((l) => [l.itemId, l]));
  const summaries = out.conflicts.map((c) => c.summary.toLowerCase());
  const failures: string[] = [];

  const hit = (terms: string[]) =>
    summaries.some((s) => terms.every((term) => s.includes(term.toLowerCase())));

  for (const a of reg.assertions) {
    switch (a.kind) {
      case "coverage": {
        const got = byId.get(a.itemId);
        if (!got) failures.push(`${a.itemId} absent from output`);
        else if (got.status !== a.equals)
          failures.push(`${a.itemId} is ${got.status}, expected ${a.equals}`);
        break;
      }
      case "coverageNot": {
        const got = byId.get(a.itemId);
        if (got && got.status === a.notEquals)
          failures.push(`${a.itemId} is ${a.notEquals}, which is forbidden`);
        break;
      }
      case "gapClass": {
        const got = byId.get(a.itemId);
        if (!got) failures.push(`${a.itemId} absent from output`);
        else if ((got.gapClass ?? null) !== a.equals)
          failures.push(`${a.itemId} gapClass ${got.gapClass ?? "null"}, expected ${a.equals}`);
        break;
      }
      case "priceable": {
        const got = byId.get(a.itemId);
        if (!got) failures.push(`${a.itemId} absent from output`);
        else if (claimedPriceable(got) !== a.equals)
          failures.push(
            `${a.itemId} priceable=${claimedPriceable(got)}, expected ${a.equals}`,
          );
        break;
      }
      case "conflictPresent":
        if (!hit(a.matchTerms))
          failures.push(`no conflict matching [${a.matchTerms.join(", ")}]`);
        break;
      case "conflictAbsent":
        if (hit(a.matchTerms))
          failures.push(`forbidden conflict matching [${a.matchTerms.join(", ")}]`);
        break;
      case "citationsGrounded": {
        const got = byId.get(a.itemId);
        const label = labelById.get(a.itemId);
        const plausible = label?.citations ?? [];
        for (const c of got?.citations ?? []) {
          const ok = plausible.some(
            (p) => (c.page == null || p.page == null || p.page === c.page) &&
                   (!c.file || p.file === c.file),
          );
          if (!ok) failures.push(`${a.itemId} cites ${c.file ?? "?"} p${c.page ?? "?"}, unsupported`);
        }
        break;
      }
      case "dwellingsDistinct": {
        const scopes = a.itemIds.map((id) => byId.get(id)?.dwellingScope ?? null);
        const present = scopes.filter((s): s is string => !!s);
        if (new Set(present).size < present.length)
          failures.push(`dwelling scopes collapsed: ${scopes.join(" | ")}`);
        break;
      }
    }
  }

  return { id: reg.id, title: reg.title, passed: failures.length === 0, failures };
}

// ── aggregation ─────────────────────────────────────────────────────

export interface AggregateScore {
  packages: number;
  /** Micro-averaged across every package. */
  evidenced: { precision: number; recall: number; f1: number };
  gaps: { precision: number; recall: number; f1: number };
  /** The same metrics, split by how complete each pack was. */
  byCompleteness: Record<string, { packages: number; falseGapRate: number }>;
  regressionsPassed: number;
  regressionsTotal: number;
  passed: boolean;
}

export function aggregate(scores: GoldenScoreV2[]): AggregateScore {
  const micro = (pick: (s: GoldenScoreV2) => PRF) => {
    let tp = 0, fp = 0, fn = 0;
    for (const s of scores) {
      const x = pick(s);
      tp += x.truePositives; fp += x.falsePositives; fn += x.falseNegatives;
    }
    const p = prf(tp, fp, fn, [], []);
    return { precision: p.precision, recall: p.recall, f1: p.f1 };
  };

  const byCompleteness: AggregateScore["byCompleteness"] = {};
  for (const s of scores) {
    const key = s.completeness;
    const fg = s.targets.find((t) => t.label === "False-gap rate")?.value ?? 0;
    const prev = byCompleteness[key] ?? { packages: 0, falseGapRate: 0 };
    byCompleteness[key] = {
      packages: prev.packages + 1,
      // running mean, so adding a package never rewrites history wrongly
      falseGapRate: (prev.falseGapRate * prev.packages + fg) / (prev.packages + 1),
    };
  }

  const regs = scores.flatMap((s) => s.regressions);
  return {
    packages: scores.length,
    evidenced: micro((s) => s.evidenced),
    gaps: micro((s) => s.gaps),
    byCompleteness,
    regressionsPassed: regs.filter((r) => r.passed).length,
    regressionsTotal: regs.length,
    passed: scores.every((s) => s.passed),
  };
}
