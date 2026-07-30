/**
 * The evaluation rubric — pinned at both ends.
 *
 * The scoring system's whole claim is objectivity: fixed weights,
 * fixed slot values, and a ledger whose two sides always reconcile.
 * These tests pin the claim: a tender that discloses everything and
 * commits to the strongest terms scores EXACTLY 100 on every
 * disclosure dimension with nothing missed; a tender that discloses
 * nothing scores 0 with misses accounting for every one of the 100
 * points; and the weighted composite is plain arithmetic anyone can
 * check. The ledger invariants themselves (lines sum to the score;
 * earned plus missed equals the rubric) are asserted inside the
 * engine in dev, so every test here also exercises them.
 */

import { describe, expect, test } from "vitest";

import {
  evaluateTender,
  evaluateRound,
  weightedOverall,
  DIMENSION_WEIGHTS,
  DIMENSION_LABELS,
  type DimensionKey,
  type EvaluationInput,
} from "./evaluation";
import { scopeMatrixRows } from "./instrument";
import { toScheduleItem, type TenderSchedule } from "./schedule";

const KEYS = Object.keys(DIMENSION_LABELS) as DimensionKey[];

function input(answers: Record<string, unknown>, extra?: Partial<EvaluationInput>): EvaluationInput {
  return {
    tenderId: "t1",
    builderName: "Test Constructions",
    status: "submitted",
    submittedAt: null,
    totalPriceAud: null,
    documentCount: 0,
    answers,
    projectState: "VIC",
    ...extra,
  };
}

/** Every disclosure made, every strongest term committed. */
function perfectAnswers(): Record<string, unknown> {
  const matrix: Record<string, string> = {};
  const amounts: Record<string, number> = {};
  const rows = scopeMatrixRows();
  for (const r of rows) matrix[r.id] = "included";
  for (const r of rows.slice(0, 10)) amounts[r.id] = 50_000;
  return {
    "price.total": 1_000_000,
    "price.fixed": true,
    "price.escalation": false,
    "price.validity": 45,
    "compliance.permit_fees": true,
    "site.rock": "included",
    "pcps.basis": "documented",
    "scope.matrix": matrix,
    "scope.amounts": amounts,
    "elig.site_inspection": "inspected",
    "elig.docs_reviewed": "full_set",
    "site.soil_report": "site_report",
    "understand.rfis": "answered",
    "understand.gaps": true,
    "understand.gap_items": [{ gap: "north boundary levels" }],
    "understand.concerns": true,
    "understand.concern_items": [{ concern: "eaves junction detail" }],
    "comment.approach": "Staged delivery with the party wall first.",
    "comment.value_engineering": [{ suggestion: "Reuse spoil on site", saving: 8_000 }],
    "comment.recommendations": [{ area: "Drainage", recommendation: "Confirm legal point" }],
    "comment.risk_advice": [{ risk: "Rock", handling: "Priced from bore logs" }],
    "creds.experience_type": "50_plus",
    "creds.largest_value": "5m_plus",
    "team.supervisor_load": "1_2",
    "programme.concurrent": "0_2",
    "team.crew_tenure": "3_plus",
    "creds.whs": "certified",
    "creds.qa": ["independent", "itp"],
    "creds.references": [
      { name: "A Client", link: "https://example.com/a" },
      { name: "B Client", link: "https://example.com/b" },
    ],
    "team.in_house": ["carpentry", "joinery"],
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
    "programme.ld_amount": 2_000,
    "prog.lead_time": "4_8",
    "programme.start": "2026-10",
    "programme.duration": 40,
  };
}

describe("the rubric's two ends", () => {
  test("full disclosure on the strongest terms scores exactly 100 everywhere", () => {
    const e = evaluateTender(input(perfectAnswers(), { documentCount: 3 }));
    for (const d of e.dimensions) {
      expect(d.score, d.key).toBe(100);
      // Nothing missed: the misses column is empty at the top.
      expect(
        d.receipts.filter((r) => r.kind === "miss"),
        d.key,
      ).toEqual([]);
    }
    expect(e.overall).toBe(100);
  });

  test("silence scores 0 on disclosure dimensions, with misses accounting for all 100", () => {
    const e = evaluateTender(input({}));
    for (const key of ["preparation", "credentials", "delivery", "programme"] as const) {
      const d = e.dimensions.find((x) => x.key === key)!;
      expect(d.score, key).toBe(0);
      const missed = d.receipts.reduce(
        (n, r) => n + (r.kind === "miss" ? (r.potential ?? 0) : 0),
        0,
      );
      expect(missed, key).toBe(100);
    }
  });

  test("partial credit shows both sides of the slot", () => {
    const e = evaluateTender(
      input({ ...perfectAnswers(), "elig.site_inspection": "external_only" }, { documentCount: 3 }),
    );
    const prep = e.dimensions.find((d) => d.key === "preparation")!;
    expect(prep.score).toBe(86);
    const gain = prep.receipts.find((r) => r.label.includes("externally"));
    expect(gain?.value).toBe(8);
    const miss = prep.receipts.find((r) => r.kind === "miss");
    expect(miss?.potential).toBe(14);
  });
});

describe("weights", () => {
  test("the weights sum to exactly 100 and cover every dimension", () => {
    expect(KEYS.every((k) => DIMENSION_WEIGHTS[k] > 0)).toBe(true);
    expect(KEYS.reduce((n, k) => n + DIMENSION_WEIGHTS[k], 0)).toBe(100);
  });

  test("the composite is the weighted mean, checkable by hand", () => {
    const dims = KEYS.map((key) => ({
      key,
      label: DIMENSION_LABELS[key],
      score: key === "firmness" ? 80 : key === "scope" ? 60 : 50,
      receipts: [],
    }));
    // 80×25 + 60×25 + 50×(15+15+12+8) = 2000+1500+2500 = 6000 → 60.
    expect(weightedOverall(dims)).toBe(60);
  });
});

describe("firmness states its helds", () => {
  test("a firm price shows what it protects, not just an empty ledger", () => {
    const e = evaluateTender(input(perfectAnswers()));
    const firm = e.dimensions.find((d) => d.key === "firmness")!;
    expect(firm.score).toBe(100);
    const helds = firm.receipts.filter(
      (r) => r.kind === "note" && r.label.includes("held"),
    );
    expect(helds.length).toBeGreaterThanOrEqual(4);
  });
});

describe("na marks on a schedule round", () => {
  function pack(): TenderSchedule {
    const items = [
      ["framing.wall-frames", "evidenced"],
      ["roofing.tile-roof", "evidenced"],
      ["earthworks.site-strip", "evidenced"],
      ["appliances.oven", "owner_allowance"],
      ["landscaping.turf", "evidenced"],
    ].map(([itemId, kind]) =>
      toScheduleItem({
        itemId: itemId!,
        kind: kind as "evidenced" | "owner_allowance",
        ownerAmountAud: kind === "owner_allowance" ? 5_000 : null,
        citations: [],
        note: null,
      }),
    );
    return {
      runId: "run-1",
      standardVersion: "1.0.0",
      items: items.filter((i): i is NonNullable<typeof i> => i !== null),
    };
  }

  test("na lines leave the denominator instead of reading as refusals", () => {
    const sched = pack();
    const marks = {
      "framing.wall-frames": { s: "documented" },
      "roofing.tile-roof": { s: "documented" },
      "earthworks.site-strip": { s: "documented" },
      "appliances.oven": { s: "allowance", a: 5_000 },
      "landscaping.turf": { s: "na", n: "no landscaping in this contract" },
    };
    const e = evaluateTender(input({ "scope.schedule": marks }), sched);
    const scope = e.dimensions.find((d) => d.key === "scope")!;
    // 3 documented + 1 allowance at half, over 4 applicable (5 − 1 na).
    expect(scope.score).toBe(88);
    expect(e.scope.notApplicable).toBe(1);
  });

  test("three or more na marks raise the round-hygiene flag", () => {
    const sched = pack();
    const marks = {
      "framing.wall-frames": { s: "na" },
      "roofing.tile-roof": { s: "na" },
      "earthworks.site-strip": { s: "na" },
      "appliances.oven": { s: "allowance", a: 5_000 },
      "landscaping.turf": { s: "documented" },
    };
    const e = evaluateTender(input({ "scope.schedule": marks }), sched);
    expect(e.flags.some((f) => f.id === "na-heavy")).toBe(true);
  });

  test("a split between priced and na surfaces as a round disagreement", () => {
    const sched = pack();
    const a = input({
      "scope.schedule": {
        "landscaping.turf": { s: "documented" },
      },
    });
    const b = {
      ...input({
        "scope.schedule": {
          "landscaping.turf": { s: "na" },
        },
      }),
      tenderId: "t2",
      builderName: "Rival Builds",
    };
    const round = evaluateRound([a, b], sched);
    const row = round.scopeDisagreements.find((d) =>
      d.trade.startsWith("Turf"),
    );
    expect(row).toBeDefined();
    expect(Object.values(row!.states)).toContain("Not applicable");
  });
});
