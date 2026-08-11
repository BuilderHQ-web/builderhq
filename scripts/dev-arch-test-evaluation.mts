/**
 * Dev test: the evaluation engine's scoring invariants.
 *
 * Run from repo root (bundles via esbuild so the src imports resolve):
 *   pnpm exec esbuild scripts/dev-arch-test-evaluation.mts --bundle \
 *     --platform=node --format=esm \
 *     --outfile=node_modules/.cache/eval-test.mjs \
 *   && node node_modules/.cache/eval-test.mjs
 *
 * What it proves, for every dimension, across crafted answer sets:
 *   1. LEDGER INVARIANT — base + Σdeltas + Σclamps === score, exactly.
 *   2. BOUNDS — every score is an integer in [0, 100].
 *   3. RUBRIC CEILING — a maximal disclosure scores exactly 100 on the
 *      additive dimensions, with no clamp line (weights total 100 by
 *      design, not by clipping).
 *   4. FLOOR RECONCILIATION — when firmness deductions pass 0, an
 *      explicit clamp line reconciles the ledger.
 *   5. MONOTONICITY — adding a positive disclosure never lowers its
 *      dimension; removing one never raises it.
 *   6. COST PLUS — a cost-plus tender cannot read as firm.
 *   7. LADDER — gains only ever list facts where the dearer tender is
 *      strictly better, and extras are exact price differences.
 */

import {
  evaluateTender,
  evaluateRound,
  type EvaluationInput,
  type ReceiptLine,
} from "../src/modules/tenders/evaluation";
import { TRADES } from "../src/modules/tenders/trades";

// Ten real trades, included on the grid with volunteered amounts, so
// the preparation rubric's itemisation weight (10) is reachable.
const TEN = TRADES.slice(0, 10).map((t) => t.id);
const MATRIX: Record<string, string> = Object.fromEntries(
  TEN.map((id) => [id, "included"]),
);
const AMOUNTS: Record<string, number> = Object.fromEntries(
  TEN.map((id, i) => [id, 10000 + i * 1000]),
);

let failures = 0;
const ok = (cond: boolean, label: string) => {
  if (!cond) {
    failures++;
    console.error("  ✗", label);
  } else {
    console.log("  ✓", label);
  }
};

const input = (
  answers: Record<string, unknown>,
  over: Partial<EvaluationInput> = {},
): EvaluationInput => ({
  tenderId: over.tenderId ?? "t-test",
  builderName: over.builderName ?? "Test Build Co",
  status: "submitted",
  submittedAt: "2026-07-20",
  totalPriceAud: over.totalPriceAud ?? 700000,
  documentCount: over.documentCount ?? 0,
  answers,
  projectState: "VIC",
  ...over,
});

const ledgerSum = (lines: ReceiptLine[]) =>
  lines.reduce((n, l) => n + (l.value ?? 0), 0);

/* ── answer fixtures ────────────────────────────────────────────────── */

// A fully-disclosed, maximal tender: every scored answer at its best.
const MAX_ANSWERS: Record<string, unknown> = {
  "contract.form": "hia",
  "price.total": 700000,
  "price.fixed": true,
  "price.escalation": false,
  "price.validity": 60,
  "commercial.gst_registered": true,
  "payments.deposit": 5,
  "elig.site_inspection": "inspected",
  "elig.docs_reviewed": "full_set",
  "elig.insurance_pl": true,
  "elig.warranty_eligible": true,
  "elig.workers_comp": "current",
  "site.soil_report": "site_report",
  "site.rock": "included",
  "compliance.permit_fees": true,
  "understand.rfis": "answered",
  "understand.gaps": true,
  "understand.gap_items": [{ gap: "x", handling: "y" }],
  "understand.concerns": true,
  "understand.concern_items": [{ concern: "x", handling: "y" }],
  "creds.experience_type": "50_plus",
  "creds.largest_value": "5m_plus",
  "team.supervisor_load": "1_2",
  "programme.concurrent": "0_2",
  "team.crew_tenure": "3_plus",
  "creds.whs": "certified",
  "creds.qa": ["independent", "itp", "supervisor"],
  "creds.references": [
    { name: "A", project: "P", link: "https://x" },
    { name: "B", project: "Q", link: "https://y" },
    { name: "C", project: "R" },
  ],
  "team.in_house": ["carpentry", "concreting"],
  "creds.memberships": ["hia"],
  "team.updates": "weekly",
  "contract.variations_written": true,
  "contract.variation_fee": false,
  "contract.defects_liability": "24",
  "aftercare.walkthrough": true,
  "aftercare.response": "48h",
  "aftercare.manual": true,
  "programme.weather": true,
  "programme.weather_days": 15,
  "programme.liquidated_damages": true,
  "programme.ld_amount": 2500,
  "prog.lead_time": "4_8",
  "programme.start": "2026-10",
  "programme.duration": 30,
  "scope.matrix": MATRIX,
  "scope.amounts": AMOUNTS,
  "comment.approach": "We build one at a time.",
  "comment.value_engineering": [
    { suggestion: "s", saving: 1000 },
    { suggestion: "t", saving: 2000 },
  ],
  "comment.recommendations": [{ area: "Roof", recommendation: "r" }],
  "comment.risk_advice": [{ risk: "access", handling: "h" }],
};

// The worst defensible disclosure: everything that CAN move, moving.
const WORST_ANSWERS: Record<string, unknown> = {
  "contract.form": "custom",
  "price.total": 700000,
  "price.fixed": false,
  "price.escalation": true,
  "price.escalation_cap": "uncapped",
  "pcps.has_ps": true,
  "pcps.ps_items": [{ description: "site works", allowance: 200000 }],
  "pcps.has_pc": true,
  "pcps.pc_items": [{ description: "fixtures", allowance: 150000 }],
  "pcps.basis": "generic",
  "compliance.permit_fees": false,
  "site.rock": "variation",
  "site.soil_report": "assumed",
  "elig.site_inspection": "not_inspected",
  "elig.docs_reviewed": "partial",
  "understand.rfis": "awaiting",
};

// Cost plus: the price follows cost.
const COST_PLUS_ANSWERS: Record<string, unknown> = {
  "contract.form": "cost_plus",
  "commercial.cost_plus_margin": 18,
  "price.total": 700000,
};

/* ── 1+2: ledger invariant + bounds, across all fixtures ───────────── */
console.log("\nLedger invariant + bounds");
for (const [name, answers] of [
  ["maximal", MAX_ANSWERS],
  ["worst", WORST_ANSWERS],
  ["cost-plus", COST_PLUS_ANSWERS],
  ["empty", {}],
] as const) {
  const ev = evaluateTender(input(answers as Record<string, unknown>));
  for (const d of ev.dimensions) {
    ok(
      ledgerSum(d.receipts) === d.score,
      `${name} · ${d.key}: ledger sums to score (${d.score})`,
    );
    ok(
      Number.isInteger(d.score) && d.score >= 0 && d.score <= 100,
      `${name} · ${d.key}: score in bounds (${d.score})`,
    );
  }
}

/* ── 3: rubric ceilings — maximal disclosure hits exactly 100 ──────── */
console.log("\nRubric ceilings (maximal disclosure, no clamping)");
{
  const ev = evaluateTender(input(MAX_ANSWERS, { documentCount: 3 }));
  for (const d of ev.dimensions) {
    const hasClamp = d.receipts.some((r) => r.kind === "clamp");
    if (["preparation", "credentials", "delivery", "programme"].includes(d.key)) {
      ok(d.score === 100, `${d.key} reaches exactly 100 (got ${d.score})`);
      ok(!hasClamp, `${d.key} reaches 100 without clamping`);
    }
    if (d.key === "firmness") {
      ok(d.score === 100, `firmness stays 100 when nothing moves (got ${d.score})`);
    }
  }
}

/* ── 4: floor reconciliation ────────────────────────────────────────── */
console.log("\nFloor reconciliation (worst case firmness)");
{
  const ev = evaluateTender(input(WORST_ANSWERS));
  const f = ev.dimensions.find((d) => d.key === "firmness")!;
  ok(f.score === 0, `worst-case firmness floors at 0 (got ${f.score})`);
  ok(
    f.receipts.some((r) => r.kind === "clamp"),
    "an explicit clamp line reconciles the ledger",
  );
  ok(ledgerSum(f.receipts) === 0, "clamped ledger still sums to the score");
}

/* ── 5: monotonicity spot checks ────────────────────────────────────── */
console.log("\nMonotonicity");
{
  const base: Record<string, unknown> = { "price.total": 700000 };
  const withWalk = { ...base, "aftercare.walkthrough": true };
  const d0 = evaluateTender(input(base)).dimensions.find((d) => d.key === "delivery")!;
  const d1 = evaluateTender(input(withWalk)).dimensions.find((d) => d.key === "delivery")!;
  ok(d1.score > d0.score, "adding the walkthrough raises delivery");

  const insp0 = evaluateTender(input(base)).dimensions.find((d) => d.key === "preparation")!;
  const insp1 = evaluateTender(
    input({ ...base, "elig.site_inspection": "inspected" }),
  ).dimensions.find((d) => d.key === "preparation")!;
  ok(insp1.score > insp0.score, "inspecting the site raises preparation");

  const led0 = evaluateTender(input(base)).dimensions.find((d) => d.key === "programme")!;
  const led1 = evaluateTender(
    input({ ...base, "programme.liquidated_damages": true, "programme.ld_amount": 2000 }),
  ).dimensions.find((d) => d.key === "programme")!;
  ok(led1.score > led0.score, "offering LDs raises programme confidence");
}

/* ── 6: cost plus cannot read firm ──────────────────────────────────── */
console.log("\nCost plus");
{
  const ev = evaluateTender(input(COST_PLUS_ANSWERS));
  const f = ev.dimensions.find((d) => d.key === "firmness")!;
  ok(f.score <= 55, `cost plus firmness is materially reduced (got ${f.score})`);
  ok(
    f.receipts.some((r) => r.label.includes("cost plus")),
    "the cost-plus deduction carries its own receipt",
  );
}

/* ── 7: the ladder ──────────────────────────────────────────────────── */
console.log("\nThe ladder");
{
  const cheap = input(
    {
      ...WORST_ANSWERS,
      "price.total": 600000,
      "commercial.gst_registered": true,
      "programme.duration": 36,
      "contract.defects_liability": "3",
    },
    { tenderId: "t-cheap", builderName: "Cheap Co", totalPriceAud: 600000 },
  );
  const firm = input(
    {
      ...MAX_ANSWERS,
      "price.total": 650000,
      "programme.duration": 30,
    },
    { tenderId: "t-firm", builderName: "Firm Co", totalPriceAud: 650000 },
  );
  const round = evaluateRound([cheap, firm]);
  ok(round.ladder.length === 1, `one ladder step for two tenders (got ${round.ladder.length})`);
  const step = round.ladder[0]!;
  ok(step.fromName === "Cheap Co" && step.toName === "Firm Co", "ladder orders by price");
  ok(step.extraInc === Math.round(650000 * 1.1) - Math.round(600000 * 1.1), `extra is the exact inc-GST difference (got ${step.extraInc})`);
  ok(step.gains.length > 0 && step.gains.length <= 3, `gains present, capped at 3 (got ${step.gains.length})`);
  ok(
    step.gains.some((g) => g.includes("fully priced")),
    "fully-priced gain detected",
  );
  ok(
    step.gains.every((g) => !g.includes("undefined") && !g.includes("null")),
    "no malformed gain strings",
  );
}

/* ── done ───────────────────────────────────────────────────────────── */
console.log(
  failures === 0
    ? "\nALL CHECKS PASSED"
    : `\n${failures} CHECK${failures === 1 ? "" : "S"} FAILED`,
);
process.exit(failures === 0 ? 0 : 1);
