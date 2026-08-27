/**
 * dev-golden-build-wallace.mts — build the 57 Wallace Street golden
 * package from the independent 241-line verification.
 *
 * WHY A GENERATOR RATHER THAN A HAND-WRITTEN FILE. 241 labels typed by
 * hand is 241 chances to fatigue into a wrong one, and a wrong label
 * is worse than no label: it teaches the corpus a mistake and hides
 * the regression it was built to catch. So every label is DERIVED by
 * an explicit rule from the auditor's own verdict text, the rules are
 * in one table below where they can be argued with, and anything the
 * rules cannot classify is marked for human ratification instead of
 * guessed.
 *
 * THREE INPUTS, IN PRECEDENCE ORDER:
 *   1. OVERRIDES — where our own verification of the drawings found
 *      the auditor wrong. These win. See docs/wallace-verification-audit.md.
 *   2. The auditor's verdict + his classification prefix.
 *   3. The engine's own finding, for rows the auditor approved.
 *
 * Re-runnable and deterministic: same inputs, same file.
 *
 *   pnpm dlx tsx scripts/dev-golden-build-wallace.mts [--write]
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

import { SCOPE_STANDARD_VERSION } from "../src/modules/scope/ontology";
import type {
  GoldenPackageV2,
  GoldenExpectedLineV2,
  GoldenCoverage,
  GoldenGapClass,
  GoldenTier,
  GoldenLabelSource,
} from "../src/modules/scope/golden-v2";

const SLUG = "57-wallace-street";
const OUT_DIR = join("eval/scope-golden/packages", SLUG);
const DOC = "57 Wallace Street Brunswick West - Architectural.pdf";
const SOURCE_PDF = `/Users/aryanvadera/Downloads/${DOC}`;
const ROWS = "/tmp/wallace-rows.json";
const TIERS = "/tmp/tiers.json";
const WRITE = process.argv.includes("--write");

interface AuditRow {
  n: number;
  itemId: string;
  engineFinding: string;
  verdict: "APPROVE" | "CORRECT BEFORE SENDING" | "REMOVE / NOT EXPECTED";
  position: string;
  pages?: string;
}

// ── the classification rules ────────────────────────────────────────

/**
 * The auditor opens most CORRECT rows with a capitalised
 * classification. Those prefixes are the most valuable thing in his
 * document: they are the gap taxonomy, written by a QS, before we had
 * one. Each maps to a gap class.
 *
 * Order matters — first match wins — so the specific sit above the
 * general.
 */
const PREFIX_RULES: Array<{
  match: RegExp;
  coverage: GoldenCoverage;
  gapClass?: GoldenGapClass;
  note: string;
}> = [
  {
    match: /CONTRACTOR\s*\/\s*PRELIMINARY OBLIGATION|CONTRACTOR PRELIMINARIES|BUILDER PRELIMINARIES/i,
    coverage: "gap",
    gapClass: "contractor_obligation",
    note: "builder preliminaries",
  },
  {
    match: /CONTRACT\s*\/\s*HANDOVER OBLIGATION|STATUTORY HANDOVER OBLIGATION/i,
    coverage: "gap",
    gapClass: "contractor_obligation",
    note: "contract/handover obligation",
  },
  {
    match: /STATUTORY\s*\/\s*CONTRACTOR COORDINATION|CONDITIONAL STATUTORY REQUIREMENT|STATUTORY/i,
    coverage: "gap",
    gapClass: "statutory",
    note: "statutory obligation",
  },
  {
    match: /EXPECTED (IN|ONLY IN) (A |THE )?LATER|EXPECTED IN THE STRUCTURAL|LATER STRUCTURAL PACKAGE|EXPECTED IN A LATER/i,
    coverage: "gap",
    gapClass: "later_consultant_package",
    note: "later consultant package",
  },
  {
    match: /GEOTECHNICAL\s*\/\s*LATENT-CONDITION DEPENDENCY|REFERENCED BUT NOT SUPPLIED|LATENT-CONDITION/i,
    coverage: "gap",
    gapClass: "referenced_package_missing",
    note: "referenced package not supplied",
  },
  {
    match: /CONTRACTOR (EARTHWORKS|FIT-OFF|FLOOR-PREPARATION|ROUGH-IN)|CONTRACTOR FIT-OFF|COMMERCIAL \/ LATENT-CONDITION RISK/i,
    coverage: "gap",
    gapClass: "contractor_obligation",
    note: "contractor execution obligation",
  },
  {
    match: /^NOT EXPECTED|^REMOVE \/ NOT EXPECTED|^REMOVE\b/i,
    coverage: "not_expected",
    note: "not applicable to this project",
  },
  {
    match: /^EVIDENCED/i,
    coverage: "evidenced",
    note: "evidenced with qualifications",
  },
];


/**
 * Turn the auditor's source-reference cell into citable pages.
 *
 * His column reads "p.1 general/site-management notes", "pp.4, 10, 13"
 * or "Architectural pp.5-6". Those pages are what a reader could
 * legitimately cite for the line, which is exactly what citation
 * validity needs to score against. Prose after the numbers is ignored;
 * anything that yields no page yields no citations, which the scorer
 * already treats as "nothing labelled to contradict".
 */
function parsePages(ref: string | undefined): Array<{ file: string; page: number }> {
  if (!ref) return [];
  const pages = new Set<number>();
  // Only look at the leading page reference, before any "; no ..." aside.
  const head = ref.split(";")[0]!;
  for (const m of head.matchAll(/pp?\.\s*([\d,\s-]+)/gi)) {
    for (const part of m[1]!.split(",")) {
      const range = part.trim().match(/^(\d+)\s*-\s*(\d+)$/);
      if (range) {
        const a = Number(range[1]);
        const b = Number(range[2]);
        if (b - a <= 12) for (let i = a; i <= b; i++) pages.add(i);
      } else {
        const n = Number(part.trim());
        if (Number.isInteger(n) && n >= 1 && n <= 21) pages.add(n);
      }
    }
  }
  return [...pages].sort((a, b) => a - b).map((page) => ({ file: DOC, page }));
}

/** What the engine itself concluded, normalised. */
function engineCoverage(finding: string): { coverage: GoldenCoverage; priceable: boolean } {
  const f = finding.toUpperCase();
  if (f.startsWith("NOT EXPECTED")) return { coverage: "not_expected", priceable: false };
  if (f.startsWith("GAP")) return { coverage: "gap", priceable: false };
  return { coverage: "evidenced", priceable: f.includes("PRICEABLE") };
}

/**
 * Rows where reading the drawings ourselves overturned the auditor.
 * Each carries the reasoning; see docs/wallace-verification-audit.md
 * for the full argument and the verifier quotes.
 */
const OVERRIDES: Record<
  string,
  Partial<GoldenExpectedLineV2> & { basis: string }
> = {
  "retaining.subsoil-drainage": {
    coverage: "evidenced",
    priceable: false,
    source: "adjudicated",
    basis:
      "The auditor removed this as merely conditional. Page 2 also prints mandatory AG requirements: drains 'must be installed at the base of all excavations and along the high side of a sloping site', 400mm into the soil. There is real scope; the engine was closer than the audit.",
    citations: [{ file: DOC, page: 2 }],
  },
  "external-works.deck": {
    coverage: "not_expected",
    source: "adjudicated",
    basis:
      "Page 21's six renders show no deck, balcony or platform of any kind, cross-checked against pp.4-9. The engine did not misread a render; it asserted content the cited page does not contain. This is a citation-entailment failure, and the canonical fabrication case.",
    citations: [{ file: DOC, page: 21 }],
  },
  "steel.beams-columns": {
    coverage: "gap",
    gapClass: "later_consultant_package",
    source: "adjudicated",
    basis:
      "The auditor removed steel as NOT EXPECTED while ruling elsewhere that footing and slab systems 'cannot be excluded until the structural design is supplied'. Page 1 anticipates built-in structural steel. Applied consistently, this is a later-package dependency, not an inapplicable item.",
    citations: [{ file: DOC, page: 1 }],
  },
  "steel.connections-fixings": {
    coverage: "gap",
    gapClass: "later_consultant_package",
    source: "adjudicated",
    basis: "Follows steel.beams-columns: resolved by the structural package, not inapplicable.",
  },
  "appliances.laundry-appliances": {
    coverage: "gap",
    gapClass: "commercial_allowance",
    responsibility: "provision_only",
    source: "adjudicated",
    basis:
      "Plans show washing-machine positions and power; nothing establishes who supplies the appliance. That is a provision-versus-supply question needing an allowance, not a row to delete.",
    citations: [{ file: DOC, page: 4 }],
  },
};

/**
 * Rows the rules classify but a human should still confirm, because
 * the auditor's wording left genuine ambiguity. Marked rather than
 * guessed: an unratified label is excluded from every metric.
 */
const NEEDS_RATIFICATION = new Set([
  "hvac.ducted-system",
  "hvac.split-systems",
  "roofing.roof-ventilation",
  "lining.cornice",
  "lining.square-set",
  "flooring.carpet",
]);

// ── build ───────────────────────────────────────────────────────────

const rows: AuditRow[] = JSON.parse(readFileSync(ROWS, "utf8"));
const tierData: { tiers: Record<string, string[]>; starred: string[] } = JSON.parse(
  readFileSync(TIERS, "utf8"),
);
const tierOf = new Map<string, GoldenTier>();
for (const [tier, ids] of Object.entries(tierData.tiers)) {
  for (const id of ids) tierOf.set(id, tier as GoldenTier);
}
const starred = new Set(tierData.starred);

const unclassified: string[] = [];

const lines: GoldenExpectedLineV2[] = rows.map((r) => {
  const tier = tierOf.get(r.itemId) ?? "conditional";
  const engine = engineCoverage(r.engineFinding);

  let coverage: GoldenCoverage;
  let gapClass: GoldenGapClass | undefined;
  let priceable: boolean | undefined;
  let source: GoldenLabelSource = "audit";
  let basis = r.position;

  if (r.verdict === "APPROVE") {
    // The auditor read the line and let it stand: the engine was right.
    coverage = engine.coverage;
    if (coverage === "evidenced") priceable = engine.priceable;
    if (coverage === "gap") gapClass = "design_gap";
    basis = `Auditor approved the engine's finding. ${r.position}`;
  } else if (r.verdict === "REMOVE / NOT EXPECTED") {
    coverage = "not_expected";
  } else {
    // CORRECT BEFORE SENDING — the classification lives in the prose.
    const rule = PREFIX_RULES.find((x) => x.match.test(r.position));
    if (!rule) {
      unclassified.push(`${r.n} ${r.itemId}`);
      coverage = engine.coverage;
      if (coverage === "gap") gapClass = "design_gap";
    } else {
      coverage = rule.coverage;
      gapClass = rule.gapClass;
      if (coverage === "evidenced") priceable = false; // "correct before sending" never endorses a priceable claim
    }
  }

  const cited = parsePages(r.pages);
  const line: GoldenExpectedLineV2 = {
    itemId: r.itemId,
    coverage,
    tier,
    source,
    basis: basis.slice(0, 400),
    ...(gapClass ? { gapClass } : {}),
    ...(priceable !== undefined ? { priceable } : {}),
    // Only evidenced lines can carry citations meaningfully; a gap has
    // nothing to cite, and a not_expected line's basis is its reason.
    ...(coverage === "evidenced" && cited.length > 0 ? { citations: cited } : {}),
  };

  // Overrides win over everything above.
  const o = OVERRIDES[r.itemId];
  if (o) Object.assign(line, o, { tier });

  // Mark for ratification: explicit list, unclassifiable prose, or a
  // borderline tier call that changes what the label means.
  const needsHuman =
    NEEDS_RATIFICATION.has(r.itemId) ||
    unclassified.some((u) => u.endsWith(r.itemId)) ||
    (starred.has(r.itemId) && line.coverage === "gap");
  if (needsHuman && !OVERRIDES[r.itemId]) line.reviewerConfirmation = "required";

  // A gap must carry a class; anything left without one is unsettled.
  if (line.coverage === "gap" && !line.gapClass) {
    line.gapClass = "design_gap";
    line.reviewerConfirmation = "required";
  }
  if (line.coverage !== "gap") delete line.gapClass;
  if (line.coverage !== "evidenced") delete line.priceable;

  return line;
});

// ── conflicts and regressions ───────────────────────────────────────

const conflicts: GoldenPackageV2["conflicts"] = [
  {
    id: "WAL-C1",
    summary:
      "Heating/cooling inferred as both ducted and split from generic reverse-cycle wording, then reported as a document conflict.",
    genuine: false,
    matchTerms: ["ducted", "split"],
    basis:
      "The drawings require reverse-cycle at minimum 3-star but select neither system. The engine reported a conflict between two of its own inferences, which is the unsupported-model-inference class.",
    citations: [{ file: DOC, page: 11 }],
    source: "audit",
  },
  {
    id: "WAL-C2",
    summary: "Roof pitch prints as both 2 degrees and 59 degrees.",
    genuine: true,
    matchTerms: ["pitch", "59"],
    basis:
      "OVERRIDES THE AUDIT. The auditor dismissed this as different roof planes. Reading page 6, the 59-degree note and the 2-degree notes annotate planes of the same building, the figure is anomalous against a flat parapet-and-box-gutter design with 3-degree capping falls, and it sits half under the permit stamp. It is a genuine document anomaly needing designer confirmation.",
    citations: [{ file: DOC, page: 6 }],
    source: "adjudicated",
  },
  {
    id: "WAL-C3",
    summary: "A timber deck or balcony asserted from a perspective render.",
    genuine: false,
    matchTerms: ["deck"],
    basis:
      "Page 21 shows no deck in any of its six renders. Not a misread render: content asserted that the cited page does not contain.",
    citations: [{ file: DOC, page: 21 }],
    source: "adjudicated",
  },
  {
    id: "WAL-C4",
    summary:
      "Solar labelled 2.5 kW while the same note specifies 8 panels at 330 W, which is 2.64 kW.",
    genuine: true,
    matchTerms: ["330"],
    basis:
      "Printed twice on page 6. A deterministic arithmetic identity the engine missed entirely, and the reason arithmetic must not be left to a language model.",
    citations: [{ file: DOC, page: 6 }],
    source: "audit",
  },
  {
    id: "WAL-C5",
    summary:
      "Sanitary exhaust requires 35 L/s where there is no window, while the NCC exhaust table on the same set specifies 25 L/s.",
    genuine: true,
    matchTerms: ["35", "25"],
    basis:
      "Real printed contradiction across pp.4-5/18-19 against p.15. Missed by the engine and by the audit's own conflict list.",
    citations: [
      { file: DOC, page: 18 },
      { file: DOC, page: 15 },
    ],
    source: "verification",
  },
];

const regressions: GoldenPackageV2["regressions"] = [
  {
    id: "WAL-MOD-001",
    title: "Conditional language is not evidence",
    rationale:
      "Page 11 prints 'IF IRRIGATION IS REQUIRED, DRIP IRRIGATION AND MULCH IS TO BE USED'. The engine read a conditional as a selected system.",
    assertions: [
      { kind: "coverageNot", itemId: "landscaping.irrigation", notEquals: "evidenced" },
    ],
  },
  {
    id: "WAL-EVID-001",
    title: "No scope asserted from content a cited page does not contain",
    rationale: "The deck fabrication: asserted from page 21, which shows no deck.",
    assertions: [
      { kind: "coverageNot", itemId: "external-works.deck", notEquals: "evidenced" },
      { kind: "conflictAbsent", matchTerms: ["deck"] },
    ],
  },
  {
    id: "WAL-CONF-001",
    title: "The roof-pitch anomaly is raised, not dismissed",
    rationale:
      "Corrects the audit. 2 and 59 degrees annotate the same building; the engine must keep asking, and the v2 blueprint's 'different locations, no conflict' test would have locked in the wrong answer.",
    assertions: [{ kind: "conflictPresent", matchTerms: ["pitch", "59"] }],
  },
  {
    id: "WAL-CONF-002",
    title: "Two model inferences are not a document conflict",
    rationale: "Generic reverse-cycle wording became a ducted-versus-split contradiction.",
    assertions: [{ kind: "conflictAbsent", matchTerms: ["ducted", "split"] }],
  },
  {
    id: "WAL-NUM-001",
    title: "Arithmetic identities are checked deterministically",
    rationale: "8 x 330 W = 2.64 kW against a printed 2.5 kW label.",
    assertions: [{ kind: "conflictPresent", matchTerms: ["330"] }],
  },
  {
    id: "WAL-APP-001",
    title: "Conditional items do not gap without an activation signal",
    rationale:
      "Flyscreens, outdoor kitchen, shaving cabinets, pool and lift were gapped from possibility. 'Fly screen' appears in the set exactly once, describing a rainwater-tank strainer.",
    assertions: [
      { kind: "coverageNot", itemId: "windows.flyscreens", notEquals: "gap" },
      { kind: "coverageNot", itemId: "appliances.outdoor-kitchen", notEquals: "gap" },
      { kind: "coverageNot", itemId: "joinery.mirror-cabinets", notEquals: "gap" },
      { kind: "coverageNot", itemId: "landscaping.pool", notEquals: "gap" },
      { kind: "coverageNot", itemId: "stairs.residential-lift", notEquals: "gap" },
    ],
  },
  {
    id: "WAL-BAL-001",
    title: "An explicit N/A suppresses the item",
    rationale: "Page 1 records 'BAL Level : N/A'; the engine raised a bushfire-compliance gap.",
    assertions: [{ kind: "coverage", itemId: "approvals.bushfire-compliance", equals: "not_expected" }],
  },
  {
    id: "WAL-PRELIM-001",
    title: "Preliminaries are contractor obligations, never design gaps",
    rationale:
      "Thirteen preliminaries lines were presented to the owner as missing documents. No drawing has ever shown scaffolding.",
    assertions: [
      { kind: "gapClass", itemId: "preliminaries.scaffolding", equals: "contractor_obligation" },
      { kind: "gapClass", itemId: "preliminaries.supervision", equals: "contractor_obligation" },
      { kind: "gapClass", itemId: "preliminaries.final-clean", equals: "contractor_obligation" },
      { kind: "gapClass", itemId: "preliminaries.site-amenities", equals: "contractor_obligation" },
    ],
  },
  {
    id: "WAL-DOC-001",
    title: "A referenced-but-unsupplied package is a dependency, not a design commission",
    rationale:
      "The set repeatedly refers slab, bracing and lintels to engineering. The owner must be told to obtain the package, not to commission a new design.",
    assertions: [
      { kind: "gapClass", itemId: "approvals.engineering-design", equals: "later_consultant_package" },
    ],
  },
  {
    id: "WAL-PRICE-001",
    title: "Precise dimensions do not make a line priceable",
    rationale:
      "Wall framing schedules stud sizes and spacings while bracing and lintels remain 'refer engineering'; box gutters give minimum dimensions while sump and overflow sizing is left to AS/NZS 3500.3.",
    assertions: [
      { kind: "priceable", itemId: "framing.wall-frames", equals: false },
      { kind: "priceable", itemId: "roofing.box-gutters", equals: false },
    ],
  },
];

// ── assemble ────────────────────────────────────────────────────────

const sha = existsSync(SOURCE_PDF)
  ? createHash("sha256").update(readFileSync(SOURCE_PDF)).digest("hex")
  : undefined;

const pkg: GoldenPackageV2 = {
  schemaVersion: 2,
  slug: SLUG,
  title: "57 Wallace Street, Brunswick West — two attached dwellings",
  projectType: "multi_dwelling",
  labelledAgainst: SCOPE_STANDARD_VERSION,
  labelledBy:
    "Independent 241-line QS verification (Aug 2026), adjudicated against the source drawings — see docs/wallace-verification-audit.md",
  labelledAt: "2026-08-27",
  packProfile: { suppliedKinds: ["architectural"], completeness: "sparse" },
  documents: [
    {
      file: DOC,
      kind: "architectural",
      revision: "D",
      pages: 21,
      page: null,
      ...(sha ? { sha256: sha } : {}),
    },
  ],
  lines,
  conflicts,
  regressions,
  notes:
    "The sparse pole of the corpus: one architectural set, no consultant packages. Tests whether silence is judged against WHAT WAS SUPPLIED rather than against an idealised full pack. Labels derive from the independent verification, except where our own read of the drawings overturned it (source: adjudicated) — the roof-pitch conflict, sub-soil drainage, steel, and the deck. Rows the auditor's wording left ambiguous carry reviewerConfirmation: required and are excluded from metrics until ratified.",
};

// ── report ──────────────────────────────────────────────────────────

const count = (f: (l: GoldenExpectedLineV2) => boolean) => lines.filter(f).length;
console.log(`\n${SLUG} — built from ${rows.length} audit rows\n`);
console.log(`  coverage    evidenced ${count((l) => l.coverage === "evidenced")}  gap ${count((l) => l.coverage === "gap")}  not_expected ${count((l) => l.coverage === "not_expected")}`);
console.log(`  tiers       core ${count((l) => l.tier === "core")}  conditional ${count((l) => l.tier === "conditional")}  alternative ${count((l) => l.tier === "alternative")}  commercial ${count((l) => l.tier === "commercial")}`);
const classes = new Map<string, number>();
for (const l of lines) if (l.gapClass) classes.set(l.gapClass, (classes.get(l.gapClass) ?? 0) + 1);
console.log(`  gap classes ${[...classes].map(([k, v]) => `${k} ${v}`).join("  ") || "none"}`);
console.log(`  priceable   true ${count((l) => l.priceable === true)}  false ${count((l) => l.priceable === false)}`);
console.log(`  adjudicated ${count((l) => l.source === "adjudicated")}  awaiting ratification ${count((l) => l.reviewerConfirmation === "required")}`);
console.log(`  conflicts   ${conflicts.length} (${conflicts.filter((c) => c.genuine).length} genuine, ${conflicts.filter((c) => !c.genuine).length} must-not-raise)`);
console.log(`  regressions ${regressions.length}`);
if (unclassified.length > 0) {
  console.log(`\n  unclassified prose (marked for ratification): ${unclassified.length}`);
  for (const u of unclassified.slice(0, 12)) console.log(`      ${u}`);
}
if (!sha) console.log(`\n  ! source PDF not found at ${SOURCE_PDF}; sha256 omitted`);

if (!WRITE) {
  console.log(`\nDRY RUN — pass --write to emit ${OUT_DIR}/expected.json\n`);
  process.exit(0);
}

mkdirSync(join(OUT_DIR, "docs"), { recursive: true });
writeFileSync(join(OUT_DIR, "expected.json"), JSON.stringify(pkg, null, 2) + "\n");
console.log(`\n✓ wrote ${OUT_DIR}/expected.json\n`);
process.exit(0);
