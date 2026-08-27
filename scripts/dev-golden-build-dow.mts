/**
 * dev-golden-build-dow.mts — build the 108 Dow Street golden package.
 *
 * THE RICH POLE of the corpus. Ten documents: architectural, structural,
 * two NatHERS certificates, endorsed planning set, landscape plan, SDA,
 * soil test, survey and an inclusions list. Wallace tests whether the
 * engine judges silence honestly when almost nothing was supplied; Dow
 * tests whether it judges well when almost everything was.
 *
 * WHAT THIS PACKAGE LABELS, AND WHAT IT DELIBERATELY DOES NOT.
 * The Dow audit is an analysis, not a line-by-line table: it
 * reclassifies all 51 gaps, validates all 10 conflicts, names 8
 * material findings and specifies 10 regression cases. So this package
 * labels exactly those — the 51 gap rows, the conflicts and the
 * regressions — and stays silent on the 179 evidenced rows the audit
 * did not individually adjudicate. The scorer only scores labelled
 * lines, so a partial package produces honest numbers on the part
 * that is settled rather than fake numbers on the whole.
 *
 * The five reclassification buckets map onto our vocabulary:
 *   true design gap        -> gap / design_gap
 *   NOT EXPECTED           -> not_expected
 *   contractor obligation  -> gap / contractor_obligation
 *   already has evidence   -> evidenced (never priceable; the audit's
 *                             own word for these is "partial")
 *   latent condition       -> gap / commercial_allowance
 *
 *   pnpm dlx tsx scripts/dev-golden-build-dow.mts [--write]
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

import { SCOPE_STANDARD_VERSION } from "../src/modules/scope/ontology";
import type {
  GoldenPackageV2,
  GoldenExpectedLineV2,
  GoldenExpectedConflict,
  GoldenTier,
} from "../src/modules/scope/golden-v2";

const SLUG = "108-dow-street";
const OUT_DIR = join("eval/scope-golden/packages", SLUG);
const SRC_DIR = "/Users/aryanvadera/Downloads/108 Dow Street - Port Melbourne";
const WRITE = process.argv.includes("--write");

const ARCH = "DOW 108 WDs ISSUE 6.pdf";
const STRUCT = "STRUCTURAL DRGs LATEST 108 Dow Street, Port Melbourne-Stru-A.pdf";
const SOIL = "SOIL TEST 108 Dow Street, Port Melb.pdf";
const INCL = "INCLUSIONS LIST 108 Dow St for HQ.pdf";
const CERT1 = "2511067 Certificate Unit 1.pdf";
const CERT2 = "2511067 Certificate Unit 2.pdf";
const LAND = "PDPD-00158-2025 - Endorsed landscape plan - 108 Dow Street PORT MELBOURNE.pdf";
const PLANS = "PDPD-00158-2025 - Endorsed plans - 108 Dow Street PORT MELBOURNE.pdf";
const SDA = "PDPD-00158-2025 - Endorsed SDA - 108 Dow Street PORT MELBOURNE.pdf";
const SURVEY = "updated SURVEY 10779F&LevEMAIL.pdf";

const DOCS: Array<{ file: string; kind: GoldenPackageV2["documents"][number]["kind"] }> = [
  { file: ARCH, kind: "architectural" },
  { file: STRUCT, kind: "structural" },
  { file: SOIL, kind: "soil" },
  { file: SURVEY, kind: "survey" },
  { file: INCL, kind: "specification" },
  { file: CERT1, kind: "energy" },
  { file: CERT2, kind: "energy" },
  { file: PLANS, kind: "planning" },
  { file: LAND, kind: "planning" },
  { file: SDA, kind: "planning" },
];

type Bucket =
  | "design_gap"
  | "not_expected"
  | "contractor_obligation"
  | "already_evidenced"
  | "latent_condition";

interface Reclass {
  name: string;
  newClass: Bucket;
  reason: string;
}

// ── inputs ──────────────────────────────────────────────────────────

const matched: Record<string, Reclass> = JSON.parse(readFileSync("/tmp/dow-matched.json", "utf8"));
const audit = JSON.parse(readFileSync("/tmp/dow-audit.json", "utf8"));
const tierData: { tiers: Record<string, string[]>; starred: string[] } = JSON.parse(
  readFileSync("/tmp/tiers.json", "utf8"),
);
const tierOf = new Map<string, GoldenTier>();
for (const [tier, ids] of Object.entries(tierData.tiers)) {
  for (const id of ids) tierOf.set(id, tier as GoldenTier);
}

// ── the reclassification, applied ───────────────────────────────────

const lines: GoldenExpectedLineV2[] = Object.entries(matched).map(([itemId, r]) => {
  const tier = tierOf.get(itemId) ?? "conditional";
  const base: GoldenExpectedLineV2 = {
    itemId,
    tier,
    coverage: "gap",
    source: "audit",
    basis: r.reason.slice(0, 400),
  };

  switch (r.newClass) {
    case "design_gap":
      return { ...base, coverage: "gap", gapClass: "design_gap" };
    case "contractor_obligation":
      return { ...base, coverage: "gap", gapClass: "contractor_obligation" };
    case "latent_condition":
      return { ...base, coverage: "gap", gapClass: "commercial_allowance" };
    case "not_expected":
      return { ...base, coverage: "not_expected" };
    case "already_evidenced":
      // The audit's own word for these is "partial": the documents do
      // carry the work, but not to a fixed price.
      return { ...base, coverage: "evidenced", priceable: false };
  }
});

/**
 * Ratified against the Wallace precedent, 27 August 2026.
 *
 * Two rules Aryan established on Wallace apply identically here, and
 * applying them consistently across packages is the point of having
 * rules rather than per-project opinions.
 */
const RATIFIED: Record<string, Partial<GoldenExpectedLineV2> & { basis: string }> = {
  // Same rule as Wallace: the shaftliner/party-wall build-up as
  // supplied meets the requirement; a report is triggered by an
  // apartment class or a high-noise location. The audit reached the
  // same place by a different route, calling the build-ups evidenced.
  "approvals.acoustic-report": {
    coverage: "not_expected",
    tier: "conditional",
    source: "adjudicated",
    basis:
      "RATIFIED, consistent with Wallace: party-wall and acoustic build-ups are documented and meet the minimum separation requirement, so no separate acoustic report is required. An apartment class or a high-noise location would trigger one; neither applies.",
  },
  // The FULL-001 case, which the audit raises as a material finding
  // rather than a gap: the coating regimes conflict, so the line
  // cannot be priceable whatever its documentation depth.
  "steel.protective-coating": {
    coverage: "evidenced",
    tier: "conditional",
    priceable: false,
    source: "audit",
    basis:
      "The governing documents specify materially different coating regimes (hot-dip galvanising versus an epoxy/coastal treatment). Documented, but not priceable while the governing regime is unresolved. This is the FULL-001 case.",
  },
};

for (const [id, r] of Object.entries(RATIFIED)) {
  const i = lines.findIndex((l) => l.itemId === id);
  const tier = tierOf.get(id) ?? "conditional";
  if (i >= 0) lines[i] = { ...lines[i]!, ...r, tier: r.tier ?? tier } as GoldenExpectedLineV2;
  else lines.push({ itemId: id, tier: r.tier ?? tier, coverage: "evidenced", ...r } as GoldenExpectedLineV2);
}


/**
 * Lines the audit labels through its REGRESSION CASES rather than
 * through the 51-gap reclassification. Without these the regressions
 * would assert on rows this package never labels, which the validator
 * correctly refuses.
 *
 * All three come from one sentence in the inclusions list: "No cornice
 * - square set finished ceilings". A negation that both suppresses one
 * item and SELECTS its alternative, which is why negation cannot be
 * modelled as deletion alone.
 */
const FROM_REGRESSIONS: Record<string, Partial<GoldenExpectedLineV2> & { basis: string }> = {
  "landscaping.irrigation": {
    coverage: "not_expected",
    source: "audit",
    basis:
      "NEG-001. The inclusions list prints 'NO IRRIGATION'. The engine evidenced irrigation from that document at 0.32 confidence, reading a prohibition as a specification. It must never be evidenced.",
  },
  "lining.square-set": {
    coverage: "evidenced",
    source: "audit",
    basis:
      "NEG-002, the half the engine got right: 'No cornice - square set finished ceilings' SELECTS square-set. A negation is not only a deletion. No priceability claim is labelled here; the audit does not adjudicate it.",
  },
  "lining.cornice": {
    coverage: "not_expected",
    source: "audit",
    basis:
      "NEG-002, the half it got wrong: having evidenced square-set from that sentence, the engine still raised a cornice gap, asking a question its own answer had resolved. The same sentence that selects one sibling suppresses the other.",
  },
};

for (const [id, r] of Object.entries(FROM_REGRESSIONS)) {
  const tier = tierOf.get(id) ?? "conditional";
  const i = lines.findIndex((l) => l.itemId === id);
  const built = { itemId: id, tier, ...r } as GoldenExpectedLineV2;
  if (i >= 0) lines[i] = { ...lines[i]!, ...r, tier };
  else lines.push(built);
}

// Tidy: a non-gap line must not carry a gap class, and only an
// evidenced line may carry priceable.
for (const l of lines) {
  if (l.coverage !== "gap") delete l.gapClass;
  if (l.coverage !== "evidenced") delete l.priceable;
}

// ── conflicts ───────────────────────────────────────────────────────

interface AuditConflict {
  n: number;
  subject: string;
  verdict: "confirmed" | "partly_correct" | "incorrect" | "unsupported";
  detail?: string;
  keyTerms?: string[];
}

const conflicts: GoldenExpectedConflict[] = (audit.conflicts.conflicts as AuditConflict[]).map(
  (c) => ({
    id: `DOW-C${c.n}`,
    summary: c.subject,
    // Confirmed and partly-correct conflicts SHOULD be raised: a
    // partly-correct conflict is a real disagreement described
    // imprecisely, and suppressing it would lose the disagreement.
    // Incorrect and unsupported must never be raised again.
    genuine: c.verdict === "confirmed" || c.verdict === "partly_correct",
    matchTerms: (c.keyTerms ?? []).slice(0, 3),
    basis: `Audit verdict: ${c.verdict}. ${c.detail ?? ""}`.slice(0, 400),
    source: "audit",
  }),
);

// The two material findings the engine MISSED entirely are labelled as
// conflicts it should have raised, so recall counts them.
conflicts.push({
  id: "DOW-C11",
  summary:
    "Geotechnical report allows 100 kPa bearing while the structural design assumes 120 kPa.",
  genuine: true,
  matchTerms: ["100", "120"],
  basis:
    "CRITICAL material finding. A real engineering contradiction between two supplied consultant documents, and the canonical case for what a true conflict looks like.",
  source: "audit",
});
conflicts.push({
  id: "DOW-C12",
  summary:
    "Working drawings are labelled PRELIMINARY, NOT FOR CONSTRUCTION while being issued as the tender basis.",
  genuine: true,
  matchTerms: ["preliminary"],
  basis:
    "CRITICAL material finding. Document status must be read from the stamp; issuing a preliminary set as the tender basis is a document-status failure, not a scope gap.",
  source: "audit",
});

// ── regressions ─────────────────────────────────────────────────────

const regressions: GoldenPackageV2["regressions"] = [
  {
    id: "DOW-NEG-001",
    title: "An explicit negation suppresses the item",
    rationale:
      "The inclusions list prints 'NO IRRIGATION'. The engine evidenced irrigation from it — reading a prohibition as a specification.",
    assertions: [{ kind: "coverageNot", itemId: "landscaping.irrigation", notEquals: "evidenced" }],
  },
  {
    id: "DOW-NEG-002",
    title: "A negation that selects its alternative",
    rationale:
      "'No cornice - square set finished ceilings' both suppresses cornice AND selects square-set. A negation is not only a deletion.",
    assertions: [
      { kind: "coverage", itemId: "lining.cornice", equals: "not_expected" },
      { kind: "coverageNot", itemId: "lining.square-set", notEquals: "gap" },
    ],
  },
  {
    id: "DOW-APP-001",
    title: "Conditional items need an activation signal",
    rationale:
      "Residential lift, fireplace, sewer pump, sprinklers and outdoor kitchen were gapped from possibility on a pack that shows none of them.",
    assertions: [
      { kind: "coverageNot", itemId: "stairs.residential-lift", notEquals: "gap" },
      { kind: "coverageNot", itemId: "hvac.fireplace", notEquals: "gap" },
      { kind: "coverageNot", itemId: "site-services.sewer-pump", notEquals: "gap" },
      { kind: "coverageNot", itemId: "fire-services.sprinklers", notEquals: "gap" },
      { kind: "coverageNot", itemId: "appliances.outdoor-kitchen", notEquals: "gap" },
    ],
  },
  {
    id: "DOW-CONF-001",
    title: "A real engineering contradiction is detected",
    rationale:
      "100 kPa allowable bearing in the geotechnical report against 120 kPa assumed in the structural design. Two supplied documents disagreeing on a number that moves the footing design.",
    assertions: [{ kind: "conflictPresent", matchTerms: ["100", "120"] }],
  },
  {
    id: "DOW-NUM-001",
    title: "Per-unit and project totals reconcile rather than conflict",
    rationale: "2 kW per dwelling and 4 kW project total are the same fact stated two ways.",
    assertions: [{ kind: "conflictAbsent", matchTerms: ["2 kw", "4 kw"] }],
  },
  {
    id: "DOW-EVID-001",
    title: "A quotation must exist in the source it cites",
    rationale:
      "The engine quoted 'BY OTHERS including all fixings' for balustrades; the audit could not find that wording in the cited structural source. The Wallace deck is the same failure in a different costume.",
    assertions: [{ kind: "conflictAbsent", matchTerms: ["balustrade", "fixings"] }],
  },
  {
    id: "DOW-FULL-001",
    title: "Conflicting governing regimes block a priceable claim",
    rationale:
      "Protective coating was graded FULL while hot-dip galvanising and an epoxy/coastal treatment both governed. Documentation depth is not priceability.",
    assertions: [{ kind: "priceable", itemId: "steel.protective-coating", equals: false }],
  },
  {
    id: "DOW-PRELIM-001",
    title: "Preliminaries are contractor obligations on a rich pack too",
    rationale:
      "The same eight preliminaries lines were presented as design gaps here as on Wallace, despite ten documents being supplied. Pack richness never makes scaffolding a drawing.",
    assertions: [
      { kind: "gapClass", itemId: "preliminaries.scaffolding", equals: "contractor_obligation" },
      { kind: "gapClass", itemId: "preliminaries.supervision", equals: "contractor_obligation" },
      { kind: "gapClass", itemId: "preliminaries.craneage", equals: "contractor_obligation" },
      { kind: "gapClass", itemId: "preliminaries.traffic-management", equals: "contractor_obligation" },
    ],
  },
  {
    id: "DOW-EVIDENCED-001",
    title: "Evidence present in a supplied document is not a gap",
    rationale:
      "Ten of the 51 gaps were already evidenced somewhere in the pack — raked ceiling framing called up in WD Issue 6, tree protection zones on the drawings, garden edging in the landscape notes. On a ten-document pack this is a retrieval failure, not a judgement one.",
    assertions: [
      { kind: "coverageNot", itemId: "framing.cathedral-raked", notEquals: "gap" },
      { kind: "coverageNot", itemId: "landscaping.tree-protection", notEquals: "gap" },
      { kind: "coverageNot", itemId: "external-works.retaining-garden", notEquals: "gap" },
      { kind: "coverageNot", itemId: "plumbing.fit-off", notEquals: "gap" },
    ],
  },
  {
    id: "DOW-DOC-001",
    title: "Document status is read from the stamp",
    rationale:
      "The working drawings are labelled PRELIMINARY, NOT FOR CONSTRUCTION while serving as the tender basis. The engine did not surface it.",
    assertions: [{ kind: "conflictPresent", matchTerms: ["preliminary"] }],
  },
];

// ── assemble ────────────────────────────────────────────────────────

const documents = DOCS.map((d) => {
  const path = join(SRC_DIR, d.file);
  const sha = existsSync(path)
    ? createHash("sha256").update(readFileSync(path)).digest("hex")
    : undefined;
  return { file: d.file, kind: d.kind, revision: null, pages: null, page: null, ...(sha ? { sha256: sha } : {}) };
});

const pkg: GoldenPackageV2 = {
  schemaVersion: 2,
  slug: SLUG,
  title: "108 Dow Street, Port Melbourne — two-dwelling development",
  projectType: "multi_dwelling",
  labelledAgainst: SCOPE_STANDARD_VERSION,
  labelledBy:
    "Independent QS analysis of the 108 Dow scope run (Aug 2026), with two rules ratified from the Wallace precedent",
  labelledAt: "2026-08-27",
  packProfile: {
    suppliedKinds: ["architectural", "structural", "soil", "survey", "specification", "energy", "planning"],
    completeness: "full",
  },
  documents,
  lines,
  conflicts,
  regressions,
  notes:
    "The rich pole of the corpus: ten documents across seven disciplines. Labels the 51 gap rows the audit reclassified, all 10 conflicts it validated, and 2 material findings the engine missed entirely. Deliberately silent on the 179 evidenced rows the audit did not individually adjudicate — the scorer only scores labelled lines, so a partial package gives honest numbers on the settled part rather than invented numbers on the whole. Paired with 57-wallace-street, which is the same engine on one document.",
};

// ── report ──────────────────────────────────────────────────────────

const count = (f: (l: GoldenExpectedLineV2) => boolean) => lines.filter(f).length;
console.log(`\n${SLUG} — ${lines.length} labelled lines from ${Object.keys(matched).length} reclassified gaps\n`);
console.log(`  coverage    evidenced ${count((l) => l.coverage === "evidenced")}  gap ${count((l) => l.coverage === "gap")}  not_expected ${count((l) => l.coverage === "not_expected")}`);
const classes = new Map<string, number>();
for (const l of lines) if (l.gapClass) classes.set(l.gapClass, (classes.get(l.gapClass) ?? 0) + 1);
console.log(`  gap classes ${[...classes].map(([k, v]) => `${k} ${v}`).join("  ")}`);
console.log(`  tiers       core ${count((l) => l.tier === "core")}  conditional ${count((l) => l.tier === "conditional")}  alternative ${count((l) => l.tier === "alternative")}  commercial ${count((l) => l.tier === "commercial")}`);
console.log(`  conflicts   ${conflicts.length} (${conflicts.filter((c) => c.genuine).length} genuine, ${conflicts.filter((c) => !c.genuine).length} must-not-raise)`);
console.log(`  regressions ${regressions.length}`);
console.log(`  documents   ${documents.length} (${documents.filter((d) => d.sha256).length} hashed)`);

if (!WRITE) {
  console.log(`\nDRY RUN — pass --write to emit ${OUT_DIR}/expected.json\n`);
  process.exit(0);
}
mkdirSync(join(OUT_DIR, "docs"), { recursive: true });
writeFileSync(join(OUT_DIR, "expected.json"), JSON.stringify(pkg, null, 2) + "\n");
console.log(`\n✓ wrote ${OUT_DIR}/expected.json\n`);
process.exit(0);
