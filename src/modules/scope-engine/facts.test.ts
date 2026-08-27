/**
 * The deterministic layer, pinned to the cases that produced it.
 *
 * Every test here is a real failure from one of the two audited
 * projects, with the document's own words. That is deliberate: a
 * synthetic case proves the function runs, and a real one proves it
 * would have caught the thing that reached a customer.
 *
 * The named regression cases these correspond to are in the golden
 * packages — DOW-NEG-001, DOW-NUM-001, WAL-NUM-001, WAL-MOD-001.
 */

import { describe, expect, test } from "vitest";

import {
  parseFigure,
  parseFigures,
  findArithmeticIdentities,
  reconcileBases,
  indexSemantics,
  suppressedItems,
  unselectedItems,
  classifyDependencies,
  type FigureInput,
  type ClaimInput,
} from "./facts";

const fig = (over: Partial<FigureInput> & { value: string }): FigureInput => ({
  itemId: "electrical.solar-pv",
  label: "Solar",
  page: 1,
  ...over,
});

const claim = (over: Partial<ClaimInput> & { itemId: string }): ClaimInput => ({
  polarity: "positive",
  modality: "selected",
  genericity: "project_specific",
  quote: "",
  page: 1,
  ...over,
});

// ── reading a printed figure ────────────────────────────────────────

describe("parseFigure reads what is printed and nothing else", () => {
  test("units are normalised so two figures can be compared", () => {
    expect(parseFigure("2.5KW")).toMatchObject({ value: 2.5, normalised: 2500, canonicalUnit: "W" });
    expect(parseFigure("330w")).toMatchObject({ value: 330, normalised: 330 });
    expect(parseFigure("2000 litres")).toMatchObject({ normalised: 2000, canonicalUnit: "L" });
    expect(parseFigure("100kPa")).toMatchObject({ value: 100, canonicalUnit: "kPa" });
    expect(parseFigure("7.1 star")).toMatchObject({ value: 7.1, canonicalUnit: "star" });
    // Length collapses to millimetres so 300mm and 0.3m compare.
    expect(parseFigure("300 mm")!.normalised).toBe(300);
    expect(parseFigure("0.3m")!.normalised).toBe(300);
  });

  test("a component statement is read as count and each, not as one number", () => {
    // The Wallace roof note, verbatim.
    const p = parseFigure("8 panels @330w each");
    expect(p!.composite).toEqual({ count: 8, each: 330, total: 2640 });
    expect(p!.normalised, "the total is what gets compared").toBe(2640);
  });

  test("other component spellings read the same way", () => {
    expect(parseFigure("2 x 2.5kW")!.composite).toEqual({ count: 2, each: 2.5, total: 5 });
    expect(parseFigure("2 no. @ 2000L")!.composite).toEqual({ count: 2, each: 2000, total: 4000 });
  });

  test("a prefixed qualifier does not stop the number being read", () => {
    expect(parseFigure("min 300mm")).toMatchObject({ value: 300, canonicalUnit: "mm" });
    expect(parseFigure("minimum capacity of 2000 litres")).toMatchObject({ normalised: 2000 });
  });

  test("nothing printed means nothing returned", () => {
    expect(parseFigure("as per engineer's design")).toBeNull();
    expect(parseFigure("")).toBeNull();
    // A ratio is not a quantity; inventing one would be worse than none.
    expect(parseFigure("1:200")?.unit ?? null).toBeNull();
  });

  test("an unrecognised unit is not coerced into a known one", () => {
    const p = parseFigure("42 furlongs");
    expect(p?.canonicalUnit ?? null, "never guess a unit").toBeNull();
  });
});

// ── the arithmetic the model kept getting wrong ─────────────────────

describe("component totals are checked, not trusted", () => {
  test("WAL-NUM-001: 8 x 330W against a printed 2.5kW is flagged", () => {
    const figures = parseFigures([
      fig({ value: "8 panels @330w each", page: 6 }),
      fig({ value: "2.5KW", page: 6 }),
    ]);
    const found = findArithmeticIdentities(figures);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ computed: 2640, stated: 2500, unit: "W" });
    expect(found[0]!.drift).toBeCloseTo(140 / 2500, 4);
    expect(found[0]!.detail).toContain("2640");
  });

  test("components that DO add up raise nothing", () => {
    const figures = parseFigures([
      fig({ value: "8 x 330W" }),
      fig({ value: "2.64kW" }),
    ]);
    expect(findArithmeticIdentities(figures)).toHaveLength(0);
  });

  test("a stated minimum is not a claimed total", () => {
    // "min 2kW" against 8 x 330W is a floor being met, not a
    // contradiction. Basis reconciliation owns this case, not
    // arithmetic, and double-reporting it would put a false conflict
    // in front of every builder.
    const figures = parseFigures([
      fig({ value: "8 panels @330w each" }),
      fig({ value: "2kW", basis: "minimum" }),
    ]);
    expect(findArithmeticIdentities(figures)).toHaveLength(0);
  });

  test("figures on different items are never compared", () => {
    const figures = parseFigures([
      fig({ itemId: "electrical.solar-pv", value: "8 x 330W" }),
      fig({ itemId: "site-services.rainwater-tank", value: "2.5kW" }),
    ]);
    expect(findArithmeticIdentities(figures)).toHaveLength(0);
  });

  test("tolerance absorbs nominal rounding but not a real gap", () => {
    const near = parseFigures([fig({ value: "8 x 330W" }), fig({ value: "2600W" })]);
    expect(findArithmeticIdentities(near, 0.05), "1.5% apart").toHaveLength(0);
    expect(findArithmeticIdentities(near, 0.005), "still 1.5% apart").toHaveLength(1);
  });
});

// ── the conflicts that were never conflicts ─────────────────────────

describe("bases reconcile instead of contradicting", () => {
  test("DOW-NUM-001: 2kW per dwelling and 4kW total on two dwellings agree", () => {
    const figures = parseFigures([
      fig({ value: "2kW", basis: "per_dwelling", page: 3 }),
      fig({ value: "4kW", basis: "total_project", page: 7 }),
    ]);
    const r = reconcileBases(figures, { dwellings: 2 });
    expect(r).toHaveLength(1);
    expect(r[0]!.verdict).toBe("consistent");
    expect(r[0]!.detail).toContain("One fact stated twice");
  });

  test("the same pair on ONE dwelling does not reconcile", () => {
    const figures = parseFigures([
      fig({ value: "2kW", basis: "per_dwelling" }),
      fig({ value: "4kW", basis: "total_project" }),
    ]);
    expect(reconcileBases(figures, { dwellings: 1 })[0]!.verdict).toBe("unresolved");
  });

  test("DOW-NUM-002: a selected 2.5kW meets a 2kW minimum", () => {
    const figures = parseFigures([
      fig({ value: "2kW", basis: "minimum" }),
      fig({ value: "2.5kW", basis: "selected" }),
    ]);
    const r = reconcileBases(figures);
    expect(r[0]!.verdict).toBe("minimum_satisfied");
  });

  test("a selection BELOW the minimum is a real problem, not a shrug", () => {
    const figures = parseFigures([
      fig({ value: "3kW", basis: "minimum" }),
      fig({ value: "2.5kW", basis: "selected" }),
    ]);
    expect(reconcileBases(figures)[0]!.verdict).toBe("minimum_breached");
  });

  test("two plain figures that disagree stay unresolved rather than being picked between", () => {
    // 100kPa geotech against 120kPa structural: code must NOT choose.
    const figures = parseFigures([
      fig({ itemId: "footings-slab.raft-slab", value: "100kPa", page: 2 }),
      fig({ itemId: "footings-slab.raft-slab", value: "120kPa", page: 9 }),
    ]);
    const r = reconcileBases(figures);
    expect(r[0]!.verdict).toBe("unresolved");
    expect(r[0]!.pages).toEqual([2, 9]);
  });

  test("identical figures produce no finding at all", () => {
    const figures = parseFigures([
      fig({ value: "2.5kW", basis: "selected" }),
      fig({ value: "2.5kW", basis: "selected", page: 9 }),
    ]);
    expect(reconcileBases(figures)).toHaveLength(0);
  });

  test("figures in different units are never compared", () => {
    const figures = parseFigures([
      fig({ value: "2.5kW" }),
      fig({ value: "2000L" }),
    ]);
    expect(reconcileBases(figures)).toHaveLength(0);
  });
});

// ── negation and modality ───────────────────────────────────────────

describe("what a document refuses is a decision, not an absence", () => {
  test("DOW-NEG-001: an explicit refusal suppresses the item", () => {
    const s = indexSemantics([
      claim({
        itemId: "landscaping.irrigation",
        polarity: "not_required",
        quote: "NO IRRIGATION IS TO BE IMPLEMENTED",
        page: 4,
      }),
    ]);
    const sup = suppressedItems(s);
    expect(sup).toEqual([
      { itemId: "landscaping.irrigation", quote: "NO IRRIGATION IS TO BE IMPLEMENTED", page: 4 },
    ]);
  });

  test("a refusal outranks a positive claim on the same item", () => {
    // The exact Dow shape: a symbol somewhere, a prohibition elsewhere.
    const s = indexSemantics([
      claim({ itemId: "landscaping.irrigation", quote: "irrigation shown", page: 2 }),
      claim({
        itemId: "landscaping.irrigation",
        polarity: "not_required",
        quote: "NO IRRIGATION",
        page: 4,
      }),
    ]);
    expect(s.get("landscaping.irrigation")!.suppressedBy).toMatchObject({ page: 4 });
  });

test("the EARLIEST refusal is the one quoted back", () => {
    // Caught by mutation testing. Two pages refuse the same work; the
    // reader must keep the first, because that is the page a reviewer
    // will be sent to and the one the pack's own order makes
    // authoritative. Letting the last win silently reattributes the
    // decision to whichever page happened to be read last.
    const s = indexSemantics([
      claim({
        itemId: "site-services.gas-connection",
        polarity: "not_required",
        quote: "No Gas Conection will be supplied to the site",
        page: 2,
      }),
      claim({
        itemId: "site-services.gas-connection",
        polarity: "excluded",
        quote: "all-electric, gas excluded",
        page: 18,
      }),
    ]);
    const sem = s.get("site-services.gas-connection")!;
    expect(sem.suppressedBy!.page).toBe(2);
    expect(sem.suppressedBy!.polarity).toBe("not_required");
  });

  test("the earliest conditional is likewise the one kept", () => {
    const s = indexSemantics([
      claim({ itemId: "x.y", modality: "if_required", quote: "first", page: 3 }),
      claim({ itemId: "x.y", modality: "may", quote: "second", page: 9 }),
    ]);
    expect(s.get("x.y")!.conditionalBy!.quote).toBe("first");
  });

  test("DOW-NEG-002: the sentence that refuses one thing selects the other", () => {
    // "No cornice - square set finished ceilings" is TWO claims. The
    // engine read only the first half and then gapped cornice anyway.
    const s = indexSemantics([
      claim({
        itemId: "lining.cornice",
        polarity: "not_required",
        quote: "No cornice - square set finished ceilings",
      }),
      claim({
        itemId: "lining.square-set",
        polarity: "positive",
        modality: "selected",
        quote: "No cornice - square set finished ceilings",
      }),
    ]);
    expect(suppressedItems(s).map((x) => x.itemId)).toEqual(["lining.cornice"]);
    expect(
      s.get("lining.square-set")!.suppressedBy,
      "the alternative is selected, not suppressed",
    ).toBeUndefined();
  });

  test("work assigned to someone else is tracked apart from work refused", () => {
    const s = indexSemantics([
      claim({
        itemId: "stairs.internal-balustrade",
        polarity: "by_others",
        quote: "BY OTHERS including all fixings",
      }),
    ]);
    const sem = s.get("stairs.internal-balustrade")!;
    expect(sem.assignedAway).toBeTruthy();
    expect(sem.suppressedBy, "assigned away is still project scope").toBeUndefined();
    expect(suppressedItems(s)).toHaveLength(0);
  });
});

describe("a possibility is not a selection", () => {
  test("WAL-MOD-001: conditional language cannot select scope", () => {
    const s = indexSemantics([
      claim({
        itemId: "landscaping.irrigation",
        modality: "if_required",
        quote: "IF IRRIGATION IS REQUIRED, DRIP IRRIGATION AND MULCH IS TO BE USED",
        page: 11,
      }),
    ]);
    const un = unselectedItems(s, new Set());
    expect(un).toHaveLength(1);
    expect(un[0]!.reason).toContain("conditional");
  });

  test("generic boilerplate cannot select scope either", () => {
    const s = indexSemantics([
      claim({
        itemId: "external-works.deck",
        genericity: "render_only",
        quote: "shown in perspective",
      }),
    ]);
    expect(unselectedItems(s, new Set())[0]!.reason).toContain("generic");
  });

  test("an item genuinely shown elsewhere is not demoted by a stray generic note", () => {
    const s = indexSemantics([
      claim({ itemId: "roofing.metal-roof", genericity: "template_note", quote: "roofing generally" }),
    ]);
    expect(
      unselectedItems(s, new Set(["roofing.metal-roof"])),
      "real evidence wins over a boilerplate mention",
    ).toHaveLength(0);
  });

  test("a suppressed item is not also reported as merely unselected", () => {
    const s = indexSemantics([
      claim({ itemId: "x.y", polarity: "not_required", modality: "if_required", quote: "no" }),
    ]);
    expect(suppressedItems(s)).toHaveLength(1);
    expect(unselectedItems(s, new Set()), "one verdict per item, the strongest").toHaveLength(0);
  });
});

// ── referenced documents ────────────────────────────────────────────

describe("a referenced document is asked for, not commissioned", () => {
  test("a reference the pack satisfies is marked supplied", () => {
    const d = classifyDependencies(
      [{ ref: "Soil Report 2233564-1", page: 1 }],
      ["SOIL TEST 108 Dow Street, Port Melb.pdf"],
      ["Soil Report 2233564-1"],
    );
    expect(d[0]!.verdict).toBe("supplied");
    expect(d[0]!.matchedFile).toContain("Soil Report");
  });

  test("a reference nothing satisfies is a missing package, not a missing design", () => {
    const d = classifyDependencies(
      [{ ref: "Thermal Performance Assessment Report", page: 10 }],
      ["57 Wallace Street Brunswick West - Architectural.pdf"],
    );
    expect(d[0]!.verdict).toBe("referenced_not_supplied");
  });

  test("common words alone never match a document", () => {
    // "refer plan" must not match "Endorsed landscape plan".
    const d = classifyDependencies(
      [{ ref: "refer plan", page: 1 }],
      ["PDPD-00158-2025 - Endorsed landscape plan.pdf"],
    );
    expect(d[0]!.verdict).toBe("referenced_not_supplied");
  });

test("short noise words do not stop a genuine match", () => {
    // Caught by mutation testing. Matching requires EVERY distinctive
    // word to be present, so without the length filter a date or a
    // stray digit in the reference would sink an otherwise exact
    // match, and the owner would be told to commission a report that
    // is sitting in the pack.
    const d = classifyDependencies(
      [{ ref: "Soil Report 2233564-1 dated 8 11 23", page: 1 }],
      ["SOIL TEST 108 Dow Street, Port Melb.pdf"],
      ["Soil Report 2233564-1"],
    );
    expect(d[0]!.verdict).toBe("supplied");
  });

  test("short words are not REQUIRED, or a plain match would be lost", () => {
    // Caught by mutation testing. Requiring every token means "by" and
    // "abc" must also appear in the supplied title, and this obvious
    // match fails for a reason no reader would accept.
    const d = classifyDependencies(
      [{ ref: "Structural Drawings by ABC", page: 1 }],
      ["Structural Drawings.pdf"],
    );
    expect(d[0]!.verdict).toBe("supplied");
  });

  test("the same reference on many pages is one dependency", () => {
    const d = classifyDependencies(
      [
        { ref: "Engineers Design", page: 1 },
        { ref: "Engineers Design", page: 10 },
        { ref: "Engineers Design", page: 12 },
      ],
      ["arch.pdf"],
    );
    expect(d).toHaveLength(1);
    expect(d[0]!.pages).toEqual([1, 10, 12]);
  });
});
