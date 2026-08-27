/**
 * The correction reader, pinned.
 *
 * These numbers will decide which part of the engine gets worked on
 * next, and later whether auto-approval is safe. Three rules keep them
 * honest and each is easy to break by accident, so each is tested from
 * both sides: the case that would pass under a wrong implementation,
 * and the case that separates it.
 */

import { describe, expect, test } from "vitest";

import {
  analyseCorrections,
  worstDivisions,
  type ReviewEventInput,
} from "./corrections";

let clock = 0;
const at = (n: number) => new Date(2026, 7, 20, 0, 0, n);

const ev = (
  action: string,
  subject: string,
  over: Partial<ReviewEventInput> = {},
): ReviewEventInput => ({
  runId: "run-1",
  subject,
  action,
  before: null,
  after: null,
  actorId: "ops-1",
  createdAt: at(clock++),
  ...over,
});

const move = (from: string, to: string) => ({
  before: { status: from },
  after: { status: to },
});

// ── rule 1: final state only ────────────────────────────────────────

describe("a line is scored once, on the last word said about it", () => {
  test("confirmed then edited counts as edited, not as both", () => {
    const r = analyseCorrections([
      ev("item.confirmed", "framing.wall-frames", { createdAt: at(1) }),
      ev("item.edited", "framing.wall-frames", { createdAt: at(2) }),
    ]);
    expect(r.counts.firstHand, "one line, one verdict").toBe(1);
    expect(r.counts.edited).toBe(1);
    expect(r.counts.confirmed).toBe(0);
  });

  test("event order in the input does not change the answer", () => {
    // The reducer must sort, not trust arrival order.
    const later = ev("item.removed", "a.one", { createdAt: at(9) });
    const earlier = ev("item.confirmed", "a.one", { createdAt: at(1) });
    const forwards = analyseCorrections([earlier, later]);
    const backwards = analyseCorrections([later, earlier]);
    expect(forwards.counts.removed).toBe(1);
    expect(backwards.counts.removed).toBe(1);
    expect(backwards.counts.confirmed).toBe(0);
  });

  test("the same item id on two different runs is two lines", () => {
    const r = analyseCorrections([
      ev("item.confirmed", "a.one", { runId: "run-1" }),
      ev("item.removed", "a.one", { runId: "run-2" }),
    ]);
    expect(r.runs).toBe(2);
    expect(r.counts.firstHand).toBe(2);
  });
});

// ── rule 2: reversals erase ─────────────────────────────────────────

describe("a reversed verdict is not evidence about the model", () => {
  test("reopening removes the line from accuracy and counts as a reversal", () => {
    const r = analyseCorrections([
      ev("item.removed", "a.one", { createdAt: at(1) }),
      ev("item.reopened", "a.one", { createdAt: at(2) }),
    ]);
    expect(r.counts.firstHand, "nothing to score: the line is pending again").toBe(0);
    expect(r.counts.removed).toBe(0);
    expect(r.reversed).toBe(1);
    expect(r.reversalRate).toBe(1);
  });

  test("reopening then judging again scores the SECOND judgement only", () => {
    const r = analyseCorrections([
      ev("item.removed", "a.one", { createdAt: at(1) }),
      ev("item.reopened", "a.one", { createdAt: at(2) }),
      ev("item.confirmed", "a.one", { createdAt: at(3) }),
    ]);
    expect(r.counts.firstHand).toBe(1);
    expect(r.counts.confirmed).toBe(1);
    expect(r.counts.removed, "the reversed removal must not survive").toBe(0);
    expect(r.reversed, "no longer outstanding").toBe(0);
  });


  test("a reversal contributes nothing below it either", () => {
    // Caught by mutation testing: dropping the `continue` after a
    // reversal leaves the switch harmlessly unmatched, but the
    // confusion matrix and the division rollup below it would still
    // run and record a phantom move on a line nobody has judged.
    const r = analyseCorrections([
      ev("item.reopened", "framing.wall-frames", {
        before: { status: "gap" },
        after: { status: "evidenced" },
      }),
    ]);
    expect(r.moves, "a reopen is not a status decision").toHaveLength(0);
    expect(r.byDivision, "and it belongs to no division's score").toHaveLength(0);
    expect(r.reversed).toBe(1);
  });

  test("reversal rate is reported without polluting agreement", () => {
    const r = analyseCorrections([
      ev("item.confirmed", "a.one", { createdAt: at(1) }),
      ev("item.confirmed", "a.two", { createdAt: at(2) }),
      ev("item.removed", "a.three", { createdAt: at(3) }),
      ev("item.reopened", "a.three", { createdAt: at(4) }),
    ]);
    expect(r.rates.agreement, "2 of 2 judged lines confirmed").toBe(1);
    expect(r.reversalRate).toBeCloseTo(1 / 3, 6);
  });
});

// ── rule 3: bulk is not a judgement ─────────────────────────────────

describe("a bulk sweep is counted but never mixed into agreement", () => {
  test("bulk confirmations do not inflate the agreement rate", () => {
    const r = analyseCorrections([
      ev("run.bulk_confirmed", "run", { after: { status: null }, ...{} }),
      ev("run.bulk_confirmed", "run", {}),
      ev("item.removed", "a.one"),
    ]);
    // Two bulk events with no counts, one considered removal.
    expect(r.counts.firstHand).toBe(1);
    expect(r.rates.agreement, "one judged line, and it was a removal").toBe(0);
  });

  test("the swept count is read from the event payload", () => {
    const r = analyseCorrections([
      ev("run.bulk_confirmed", "run", { after: { status: null } as never }),
      ev("run.bulk_confirmed", "run", { after: { confirmed: 162 } as never }),
    ]);
    expect(r.bulkConfirmed).toBe(162);
  });

  test("run.approved is recorded but is not a verdict about any line", () => {
    const r = analyseCorrections([ev("run.approved", "run")]);
    expect(r.counts.firstHand).toBe(0);
    expect(r.events).toBe(1);
  });
});

// ── added lines ─────────────────────────────────────────────────────

describe("work the model missed is the most expensive error", () => {
  test("an added line does not improve the agreement rate", () => {
    const withAdd = analyseCorrections([
      ev("item.confirmed", "a.one"),
      ev("item.added", "a.new"),
    ]);
    const withoutAdd = analyseCorrections([ev("item.confirmed", "a.one")]);
    expect(withAdd.rates.agreement, "adding work must not look like accuracy").toBe(
      withoutAdd.rates.agreement,
    );
    expect(withAdd.counts.added).toBe(1);
    expect(withAdd.rates.falseNegative).toBeCloseTo(1 / 2, 6);
  });
});

// ── the confusion matrix ────────────────────────────────────────────

describe("what the model said versus what the desk decided", () => {
  test("moves are counted only where the status actually changed", () => {
    const r = analyseCorrections([
      ev("item.edited", "a.one", move("gap", "not_expected")),
      ev("item.edited", "a.two", move("gap", "not_expected")),
      ev("item.edited", "a.three", move("evidenced", "gap")),
      // Same status on both sides: an edit to the note, not a move.
      ev("item.edited", "a.four", move("gap", "gap")),
    ]);
    expect(r.moves).toHaveLength(2);
    expect(r.moves[0]).toMatchObject({ from: "gap", to: "not_expected", count: 2 });
    expect(r.moves[0]!.subjects).toContain("a.one");
    expect(r.moves[1]).toMatchObject({ from: "evidenced", to: "gap", count: 1 });
  });

  test("a removal with a recorded before-status still shows its move", () => {
    const r = analyseCorrections([
      ev("item.removed", "a.one", {
        before: { status: "gap" },
        after: { status: "removed" },
      }),
    ]);
    expect(r.moves[0]).toMatchObject({ from: "gap", to: "removed", count: 1 });
  });
});

// ── grouping ────────────────────────────────────────────────────────

describe("division rollup points at where the work pays back", () => {
  test("divisions come from the item id, including learned ids", () => {
    const r = analyseCorrections([
      ev("item.removed", "preliminaries.craneage"),
      ev("item.removed", "preliminaries.supervision"),
      ev("item.confirmed", "framing.wall-frames"),
      ev("item.confirmed", "ext.landscaping.spa-halo"),
    ]);
    const names = r.byDivision.map((d) => d.division);
    expect(names).toContain("preliminaries");
    expect(names).toContain("framing");
    expect(names, "a learned id reports under its real division").toContain("landscaping");
    const prelim = r.byDivision.find((d) => d.division === "preliminaries")!;
    expect(prelim.rates.falsePositive).toBe(1);
    expect(prelim.rates.agreement).toBe(0);
  });

  test("worstDivisions ignores divisions too small to mean anything", () => {
    const events: ReviewEventInput[] = [];
    // A big division at 50% agreement.
    for (let i = 0; i < 6; i++) {
      events.push(ev(i % 2 === 0 ? "item.confirmed" : "item.removed", `big.item${i}`));
    }
    // A tiny division at 0% — noisier, and must not top the list.
    events.push(ev("item.removed", "tiny.one"));

    const r = analyseCorrections(events);
    const worst = worstDivisions(r, { minLines: 5 });
    expect(worst.map((d) => d.division)).toEqual(["big"]);
    expect(worst[0]!.rates.agreement).toBeCloseTo(0.5, 6);
  });
});

// ── conflicts and captures ──────────────────────────────────────────

describe("conflicts and captures are judged but are not scope lines", () => {
  test("they are counted apart so they cannot dilute item accuracy", () => {
    const r = analyseCorrections([
      ev("item.confirmed", "a.one"),
      ev("conflict.dismissed", "conflict:abc"),
      ev("conflict.confirmed", "conflict:def"),
      ev("capture.promoted", "ext.landscaping.spa"),
    ]);
    expect(r.counts.firstHand, "only the item counts").toBe(1);
    expect(r.rates.agreement).toBe(1);
    expect(r.conflictVerdicts["conflict.dismissed"]).toBe(1);
    expect(r.captureVerdicts["capture.promoted"]).toBe(1);
  });
});


// ── the selection-bias correction ───────────────────────────────────

describe("implied agreement corrects for how the desk actually works", () => {
  test("a bulk sweep counts as the agreement it is", () => {
    // The desk reads a pack, opens the three lines worth changing, and
    // sweeps the other ninety-seven. Considered agreement reads 0%,
    // which is true and useless; implied agreement reads 97%, which is
    // the figure about the model.
    const r = analyseCorrections([
      ev("item.removed", "a.one"),
      ev("item.removed", "a.two"),
      ev("item.removed", "a.three"),
      ev("run.bulk_confirmed", "run", { after: { confirmed: 97 } as never }),
    ]);
    expect(r.rates.agreement, "selection-biased by construction").toBe(0);
    expect(r.impliedAgreement).toBeCloseTo(97 / 100, 6);
  });

  test("with no bulk sweep the two figures agree", () => {
    const r = analyseCorrections([
      ev("item.confirmed", "a.one"),
      ev("item.removed", "a.two"),
    ]);
    expect(r.impliedAgreement).toBeCloseTo(r.rates.agreement, 6);
  });

  test("no judgements at all is zero, not NaN", () => {
    expect(analyseCorrections([]).impliedAgreement).toBe(0);
  });
});

// ── degenerate input ────────────────────────────────────────────────

describe("empty and odd input", () => {
  test("no events produces zeros, not NaN", () => {
    const r = analyseCorrections([]);
    expect(r.counts.firstHand).toBe(0);
    expect(r.rates.agreement).toBe(0);
    expect(r.rates.falseNegative).toBe(0);
    expect(r.reversalRate).toBe(0);
    expect(Number.isNaN(r.rates.agreement)).toBe(false);
  });

  test("an unknown action is ignored rather than miscounted", () => {
    const r = analyseCorrections([
      ev("item.something_new", "a.one"),
      ev("item.confirmed", "a.two"),
    ]);
    expect(r.counts.firstHand).toBe(1);
  });
});
