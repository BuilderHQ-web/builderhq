/**
 * The schedule marks — the builder's answer vocabulary, pinned.
 *
 * Every mark a builder makes flows through readScheduleAnswer into the
 * tallies, the document, the comparison and the evaluation. A stray
 * field that survives parsing or a state that counts in the wrong
 * bucket corrupts every surface downstream, so the vocabulary is
 * pinned here at the source.
 */

import { describe, expect, test } from "vitest";

import {
  readScheduleAnswer,
  isScheduleAnswerShape,
  scheduleTallies,
  isScheduleComplete,
  deriveNotApplicable,
  deriveDisclosedPrices,
  deriveAllowanceRows,
  toScheduleItem,
  type TenderSchedule,
} from "./schedule";
import { computeTenderMetrics } from "./instrument";

/** A small pack built through the real Standard: five tenderable
 *  lines (one a client allowance), one client exclusion. */
function fixture(): TenderSchedule {
  const items = [
    toScheduleItem({
      itemId: "framing.wall-frames",
      kind: "evidenced",
      ownerAmountAud: null,
      citations: [{ documentName: "A-201", page: 3, revision: "B" }],
      note: "90mm MGP10 studs at 450 centres",
    }),
    toScheduleItem({
      itemId: "roofing.tile-roof",
      kind: "evidenced",
      ownerAmountAud: null,
      citations: [],
      note: null,
    }),
    toScheduleItem({
      itemId: "appliances.oven",
      kind: "owner_allowance",
      ownerAmountAud: 5_000,
      citations: [],
      note: null,
    }),
    toScheduleItem({
      itemId: "landscaping.turf",
      kind: "owner_open",
      ownerAmountAud: null,
      citations: [],
      note: null,
    }),
    toScheduleItem({
      itemId: "earthworks.site-strip",
      kind: "evidenced",
      ownerAmountAud: null,
      citations: [],
      note: null,
    }),
    toScheduleItem({
      itemId: "demolition.full-demolition",
      kind: "owner_excluded",
      ownerAmountAud: null,
      citations: [],
      note: null,
    }),
  ].filter((i): i is NonNullable<typeof i> => i !== null);
  expect(items).toHaveLength(6);
  return { runId: "run-1", standardVersion: "1.0.0", items };
}

describe("readScheduleAnswer", () => {
  test("fields only survive in their state", () => {
    const parsed = readScheduleAnswer({
      "framing.wall-frames": { s: "documented", p: 42_000, a: 999, n: "x" },
      "roofing.tile-roof": { s: "allowance", a: 8_000, p: 111, n: "y" },
      "earthworks.site-strip": { s: "na", n: " wrong site ", a: 5, p: 5 },
      "landscaping.turf": { s: "excluded", a: 1, p: 2, n: "z" },
    });
    expect(parsed["framing.wall-frames"]).toEqual({
      s: "documented",
      a: null,
      p: 42_000,
      n: null,
      c: null,
    });
    expect(parsed["roofing.tile-roof"]).toEqual({
      s: "allowance",
      a: 8_000,
      p: null,
      n: null,
      c: null,
    });
    expect(parsed["earthworks.site-strip"]).toEqual({
      s: "na",
      a: null,
      p: null,
      n: "wrong site",
      c: null,
    });
    expect(parsed["landscaping.turf"]).toEqual({
      s: "excluded",
      a: null,
      p: null,
      n: null,
      c: null,
    });
  });

  // The comment is the one field that belongs to the line, whatever
  // the mark: it survives every state, trimmed and capped.
  test("a comment rides on any state", () => {
    const parsed = readScheduleAnswer({
      "framing.wall-frames": { s: "documented", c: " priced for pine " },
      "landscaping.turf": { s: "excluded", c: "x".repeat(500) },
    });
    expect(parsed["framing.wall-frames"]!.c).toBe("priced for pine");
    expect(parsed["landscaping.turf"]!.c).toHaveLength(280);
  });

  test("junk states and shapes are dropped", () => {
    const parsed = readScheduleAnswer({
      a: { s: "maybe" },
      b: null,
      c: "documented",
      d: { s: "na", n: 42 },
    });
    expect(Object.keys(parsed)).toEqual(["d"]);
    expect(parsed.d).toEqual({ s: "na", a: null, p: null, n: null, c: null });
  });

  test("shape check admits the new fields and refuses junk", () => {
    expect(
      isScheduleAnswerShape({
        x: { s: "documented", p: 1000 },
        y: { s: "na", n: "superseded by addendum" },
      }),
    ).toBe(true);
    expect(isScheduleAnswerShape({ x: { s: "documented", p: -5 } })).toBe(
      false,
    );
    expect(isScheduleAnswerShape({ x: { s: "nope" } })).toBe(false);
  });
});

describe("scheduleTallies with marks v2", () => {
  const sched = fixture();

  test("na and disclosed prices count in their own buckets", () => {
    const t = scheduleTallies(sched, {
      "framing.wall-frames": { s: "documented", p: 42_000 },
      "roofing.tile-roof": { s: "documented" },
      "appliances.oven": { s: "allowance", a: 5_000 },
      "landscaping.turf": { s: "na", n: "no soft landscaping on this site" },
      "earthworks.site-strip": { s: "excluded" },
    });
    expect(t.total).toBe(5);
    expect(t.documented).toBe(2);
    expect(t.allowance).toBe(1);
    expect(t.excluded).toBe(1);
    expect(t.notApplicable).toBe(1);
    expect(t.unmarked).toBe(0);
    expect(t.allowanceTotal).toBe(5_000);
    expect(t.disclosedCount).toBe(1);
    expect(t.disclosedTotal).toBe(42_000);
    expect(t.ownerAllowances.carried).toBe(1);
  });

  test("the client's exclusions never enter the tallies", () => {
    const t = scheduleTallies(sched, {
      "demolition.full-demolition": { s: "documented" },
    });
    expect(t.total).toBe(5);
    expect(t.documented).toBe(0);
    expect(t.unmarked).toBe(5);
  });
});

describe("isScheduleComplete with marks v2", () => {
  const sched = fixture();
  const base = {
    "framing.wall-frames": { s: "documented" },
    "roofing.tile-roof": { s: "documented" },
    "appliances.oven": { s: "allowance", a: 5_000 },
    "earthworks.site-strip": { s: "excluded" },
  };

  test("na is a complete answer", () => {
    expect(
      isScheduleComplete(sched, {
        ...base,
        "landscaping.turf": { s: "na" },
      }),
    ).toBe(true);
  });

  test("an allowance still demands a figure", () => {
    expect(
      isScheduleComplete(sched, {
        ...base,
        "appliances.oven": { s: "allowance" },
        "landscaping.turf": { s: "na" },
      }),
    ).toBe(false);
  });

  test("an unmarked tenderable line blocks", () => {
    expect(isScheduleComplete(sched, base)).toBe(false);
  });
});

describe("derivations", () => {
  const sched = fixture();
  const marks = {
    "framing.wall-frames": { s: "documented", p: 42_000 },
    "roofing.tile-roof": { s: "na", n: "flat roof per addendum" },
    "appliances.oven": { s: "allowance", a: 6_000 },
    "landscaping.turf": { s: "na" },
    "earthworks.site-strip": { s: "documented", p: 11_500 },
  };

  test("the not-applicable register carries the reasons", () => {
    const rows = deriveNotApplicable(sched, marks);
    expect(rows.map((r) => [r.itemId, r.note])).toEqual([
      ["roofing.tile-roof", "flat roof per addendum"],
      ["landscaping.turf", null],
    ]);
  });

  test("disclosed prices derive only from documented lines", () => {
    const rows = deriveDisclosedPrices(sched, marks);
    expect(rows.map((r) => r.itemId).sort()).toEqual([
      "earthworks.site-strip",
      "framing.wall-frames",
    ]);
    expect(rows.reduce((n, r) => n + r.amountAud, 0)).toBe(53_500);
  });

  test("a repriced client allowance still derives with both figures", () => {
    const rows = deriveAllowanceRows(sched, marks);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      itemId: "appliances.oven",
      source: "client_schedule",
      amountAud: 6_000,
      ownerAmountAud: 5_000,
    });
  });
});

describe("metrics fold", () => {
  test("na shrinks nothing silently: it lands in coverage.notApplicable", () => {
    const sched = fixture();
    const m = computeTenderMetrics(
      {
        "scope.schedule": {
          "framing.wall-frames": { s: "documented", p: 42_000 },
          "roofing.tile-roof": { s: "documented", p: 8_000 },
          "appliances.oven": { s: "allowance", a: 5_000 },
          "landscaping.turf": { s: "na" },
          "earthworks.site-strip": { s: "excluded" },
        },
      },
      sched,
    );
    expect(m.coverage.included).toBe(2);
    expect(m.coverage.allowance).toBe(1);
    expect(m.coverage.excluded).toBe(1);
    expect(m.coverage.notApplicable).toBe(1);
    expect(m.coverage.unmarked).toBe(0);
    // Disclosed line prices are the schedule round's itemisation.
    expect(m.itemisedCount).toBe(2);
    expect(m.itemisedTotal).toBe(50_000);
    expect(m.allowanceExposure).toBe(5_000);
  });
});
