/**
 * Scope advice — the judgement rules, pinned.
 *
 * Two rules with real consequences live here. The allowance
 * eligibility rule decides which lines a CLIENT may put a locked
 * figure on: get it wrong one way and a homeowner prices structural
 * steel; get it wrong the other and they cannot set their own
 * appliance budget. The advisory rules put sentences in front of
 * clients under the BuilderHQ name, so each must fire exactly when
 * its condition holds and never otherwise.
 */

import { describe, expect, test } from "vitest";

import {
  ownerAllowanceEligible,
  isOwnerDocGap,
  isOwnerAskableGap,
  adviseMissingDocuments,
  buildAllowancePackages,
  coveredSelectionPackages,
  selectionPackageKey,
  splitPackageAmount,
  OWNER_DOC_ITEMS,
} from "./advice";
import { getScopeItem, SCOPE_ITEMS } from "./index";

describe("ownerAllowanceEligible", () => {
  test.each([
    "appliances.oven",
    "plumbing.tapware",
    "tiling.floor-tiles-supply",
    "joinery.benchtops",
    "electrical.light-fittings",
    "flooring.carpet",
  ])("selections are eligible: %s", (id) => {
    expect(ownerAllowanceEligible(id)).toBe(true);
  });

  test.each([
    "landscaping.soft-landscaping",
    "landscaping.turf",
    "external-works.fencing",
    "joinery.custom-features",
  ])("cosmetic provisional sums are eligible: %s", (id) => {
    expect(ownerAllowanceEligible(id)).toBe(true);
  });

  // The rule this suite exists for: fundamentals are never the
  // client's to price, whatever flag they carry.
  test.each([
    "earthworks.rock-excavation",
    "footings-slab.piers-piles",
    "retaining.shoring",
    "demolition.asbestos-removal",
    "alterations.underpinning",
    "site-services.septic-treatment",
  ])("structural and ground-risk sums are NOT: %s", (id) => {
    expect(ownerAllowanceEligible(id)).toBe(false);
  });

  test.each([
    "preliminaries.craneage",
    "framing.wall-framing",
    "steel.beams-columns",
    "earthworks.site-strip",
  ])("unflagged fundamentals are NOT: %s", (id) => {
    expect(ownerAllowanceEligible(id)).toBe(false);
  });

  test("an unknown id is never eligible", () => {
    expect(ownerAllowanceEligible("no-such.thing")).toBe(false);
  });

  // Exhaustive sanity: every eligible line lives in a division a
  // homeowner could sensibly hold a figure for. If a future ontology
  // edit flags something structural as pc, this fails loudly.
  test("every eligible item sits in a selections-or-cosmetic division", () => {
    const FUNDAMENTAL = new Set([
      "preliminaries",
      "demolition",
      "alterations",
      "earthworks",
      "retaining",
      "footings-slab",
      "framing",
      "steel",
      "approvals",
      "site-services",
    ]);
    const offenders = SCOPE_ITEMS.filter(
      (i) => ownerAllowanceEligible(i.id) && FUNDAMENTAL.has(i.division),
    );
    expect(offenders.map((o) => o.id)).toEqual([]);
  });
});

describe("isOwnerDocGap", () => {
  test("client-suppliable reports qualify", () => {
    expect(isOwnerDocGap("approvals.soil-geotech")).toBe(true);
    expect(isOwnerDocGap("approvals.engineering-design")).toBe(true);
  });

  // Aryan's exact report: these are builder deliverables the tender
  // asks about, never paperwork a homeowner owes.
  test("builder deliverables do NOT qualify", () => {
    expect(isOwnerDocGap("approvals.occupancy-certificate")).toBe(false);
    expect(isOwnerDocGap("approvals.handover-documentation")).toBe(false);
    expect(isOwnerDocGap("approvals.mandatory-inspections")).toBe(false);
    expect(isOwnerDocGap("approvals.building-permit")).toBe(false);
  });

  test("every owner-doc id exists in the Standard", () => {
    for (const id of OWNER_DOC_ITEMS) {
      expect(getScopeItem(id), id).not.toBeNull();
    }
  });
});

describe("adviseMissingDocuments", () => {
  const base = {
    registerKinds: ["architectural"],
    evidencedDivisions: [] as string[],
    divisionSources: {} as Record<string, string[]>,
    projectType: "multi_dwelling",
  };

  test("an architectural-only multi-dwelling set draws the full core advice", () => {
    const keys = adviseMissingDocuments(base).map((a) => a.key);
    expect(keys).toContain("structural");
    expect(keys).toContain("soil");
    expect(keys).toContain("civil");
    expect(keys).toContain("specification");
  });

  test("a present kind silences its advisory", () => {
    const keys = adviseMissingDocuments({
      ...base,
      registerKinds: ["architectural", "structural", "soil", "civil"],
    }).map((a) => a.key);
    expect(keys).not.toContain("structural");
    expect(keys).not.toContain("soil");
    expect(keys).not.toContain("civil");
  });

  test("civil advice is multi-dwelling only", () => {
    const keys = adviseMissingDocuments({
      ...base,
      projectType: "single_dwelling",
    }).map((a) => a.key);
    expect(keys).not.toContain("civil");
  });

  test("soil and survey advice never fires on renovations", () => {
    const keys = adviseMissingDocuments({
      ...base,
      projectType: "renovation",
    }).map((a) => a.key);
    expect(keys).not.toContain("soil");
    expect(keys).not.toContain("survey");
  });

  // The joinery-package rule, exactly as reported: cabinetry evidenced,
  // but every citation points at the architect's drawings.
  test("joinery evidenced only from architectural drawings raises the package", () => {
    const advice = adviseMissingDocuments({
      ...base,
      evidencedDivisions: ["joinery"],
      divisionSources: { joinery: ["architectural"] },
    });
    expect(advice.map((a) => a.key)).toContain("joinery-package");
  });

  test("a real joinery package silences it", () => {
    const advice = adviseMissingDocuments({
      ...base,
      evidencedDivisions: ["joinery"],
      divisionSources: { joinery: ["architectural", "other"] },
    });
    expect(advice.map((a) => a.key)).not.toContain("joinery-package");
  });

  test("no joinery evidence at all raises nothing about joinery", () => {
    const advice = adviseMissingDocuments(base);
    expect(advice.map((a) => a.key)).not.toContain("joinery-package");
  });
});

describe("isOwnerAskableGap", () => {
  test.each([
    "appliances.oven",
    "landscaping.turf",
    "approvals.soil-geotech",
    "demolition.asbestos-removal",
  ])("cosmetic, document and demolition gaps ask the client: %s", (id) => {
    expect(isOwnerAskableGap(id)).toBe(true);
  });

  // The rule the whole rework hangs on: builders' ordinary work never
  // reaches the client as a question.
  test.each([
    "preliminaries.site-establishment",
    "preliminaries.temporary-fencing",
    "preliminaries.waste-management",
    "earthworks.spoil-removal",
    "earthworks.site-strip",
    "framing.wall-framing",
    "steel.beams-columns",
    "approvals.occupancy-certificate",
    "approvals.handover-documentation",
    "site-services.power-connection",
    "electrical.rough-in",
    "plumbing.rough-in",
  ])("builder work never asks the client: %s", (id) => {
    expect(isOwnerAskableGap(id)).toBe(false);
  });

  // Exhaustive: every askable gap is cosmetic, a document, or
  // demolition. Nothing else may ever slip into the client's lap.
  test("the askable set is exactly the three sanctioned shapes", () => {
    for (const item of SCOPE_ITEMS) {
      const askable = isOwnerAskableGap(item.id);
      const sanctioned =
        ownerAllowanceEligible(item.id) ||
        isOwnerDocGap(item.id) ||
        item.division === "demolition";
      expect(askable, item.id).toBe(sanctioned);
    }
  });
});

describe("allowance packages", () => {
  const GAPS = [
    "appliances.oven",
    "appliances.cooktop",
    "appliances.rangehood",
    "joinery.benchtops",
    "joinery.vanities",
    "plumbing.tapware",
    "landscaping.turf",
    "preliminaries.craneage", // not eligible: must never appear
    "earthworks.spoil-removal", // not eligible: must never appear
  ];

  test("groups cosmetic gaps into packages and prices from the band", () => {
    const packs = buildAllowancePackages(GAPS, "1_5m_2m");
    const byKey = new Map(packs.map((p) => [p.key, p]));

    expect(byKey.get("appliances")?.itemIds.sort()).toEqual([
      "appliances.cooktop",
      "appliances.oven",
      "appliances.rangehood",
    ]);
    expect(byKey.get("joinery")?.itemIds.sort()).toEqual([
      "joinery.benchtops",
      "joinery.vanities",
    ]);
    expect(byKey.get("plumbing-fixtures")?.itemIds).toEqual([
      "plumbing.tapware",
    ]);
    expect(byKey.get("landscaping")?.itemIds).toEqual(["landscaping.turf"]);

    // The non-cosmetic gaps appear in NO package.
    const allPackaged = packs.flatMap((p) => p.itemIds);
    expect(allPackaged).not.toContain("preliminaries.craneage");
    expect(allPackaged).not.toContain("earthworks.spoil-removal");

    // Appliances at 1 to 2.5 percent of a $1.75m midpoint: $30,625
    // midway, rounded to the nearest thousand.
    expect(byKey.get("appliances")?.suggestedAud).toBe(31_000);
    expect(byKey.get("appliances")?.budgetLabel).toBe("around $1.75m");
  });

  test("no budget band means guidance without a figure", () => {
    const packs = buildAllowancePackages(["appliances.oven"], null);
    expect(packs[0]?.suggestedAud).toBeNull();
    expect(packs[0]?.budgetLabel).toBeNull();
    expect(packs[0]?.pctRange).toEqual([1, 2.5]);
  });

  // Finishes carry a larger share of renovation budgets, so the same
  // gap on the same band suggests a higher figure on a renovation.
  test("renovations scale the suggestion up; new builds do not", () => {
    const newBuild = buildAllowancePackages(
      ["appliances.oven"],
      "1_5m_2m",
      "multi_dwelling",
    );
    const reno = buildAllowancePackages(
      ["appliances.oven"],
      "1_5m_2m",
      "renovation",
    );
    // $30,625 base; times 1.25 on a renovation is $38,281, rounded.
    expect(newBuild[0]?.suggestedAud).toBe(31_000);
    expect(reno[0]?.suggestedAud).toBe(38_000);
  });

  test("every gap lands in at most one package", () => {
    const packs = buildAllowancePackages(GAPS, "1m_1_5m");
    const seen = new Set<string>();
    for (const p of packs) {
      for (const id of p.itemIds) {
        expect(seen.has(id), id).toBe(false);
        seen.add(id);
      }
    }
  });
});

describe("splitPackageAmount", () => {
  test("splits by weight and sums exactly", () => {
    const parts = splitPackageAmount(
      "appliances",
      ["appliances.oven", "appliances.cooktop", "appliances.rangehood"],
      10_000,
    );
    const total = parts.reduce((n, p) => n + p.amountAud, 0);
    expect(total).toBe(10_000);
    const byId = new Map(parts.map((p) => [p.itemId, p.amountAud]));
    // Weights 3:2:1 — the oven carries the most, remainder included.
    expect(byId.get("appliances.oven")).toBeGreaterThan(
      byId.get("appliances.cooktop")!,
    );
    expect(byId.get("appliances.cooktop")).toBeGreaterThan(
      byId.get("appliances.rangehood")!,
    );
  });

  test("unknown package splits equally and still sums exactly", () => {
    const parts = splitPackageAmount("no-such-package", ["a", "b", "c"], 100);
    expect(parts.reduce((n, p) => n + p.amountAud, 0)).toBe(100);
  });

  test("a single line takes the whole figure", () => {
    expect(splitPackageAmount("landscaping", ["landscaping.turf"], 7_500)).toEqual([
      { itemId: "landscaping.turf", amountAud: 7_500 },
    ]);
  });
});

describe("coveredSelectionPackages", () => {
  const doc = (title: string, kind: string | null = null) => ({ kind, title });

  test("an appliance or FFE schedule covers appliances and bathroom fittings", () => {
    for (const title of [
      "Appliance Schedule",
      "FFE Schedule",
      "Fixtures and Fittings Schedule",
      "Fixtures & Equipment",
    ]) {
      const covered = coveredSelectionPackages([doc(title)]);
      expect(covered.has("appliances"), title).toBe(true);
      expect(covered.has("plumbing-fixtures"), title).toBe(true);
      expect(covered.has("landscaping"), title).toBe(false);
    }
  });

  test("landscape documentation covers the garden and external features", () => {
    const covered = coveredSelectionPackages([doc("Landscape Plans Rev B")]);
    expect(covered.has("landscaping")).toBe(true);
    expect(covered.has("external-features")).toBe(true);
    expect(covered.has("joinery")).toBe(false);
  });

  // Only documentation a builder prices from suppresses the sum: a
  // concept, sketch or quote never does.
  test("landscape concepts and quotes cover nothing", () => {
    for (const title of [
      "Landscape Concept",
      "Preliminary Landscape Sketch",
      "Landscaping Quote",
    ]) {
      expect(coveredSelectionPackages([doc(title)]).size, title).toBe(0);
    }
  });

  test("separator-named files match like their spaced twins", () => {
    expect(
      coveredSelectionPackages([doc("", null)].map(() => ({ kind: null, title: null, filename: "finishes-schedule.pdf" }))).has("flooring"),
    ).toBe(true);
    expect(
      coveredSelectionPackages([{ kind: null, title: "Internal_Elevations_RevB", filename: null }]).has("joinery"),
    ).toBe(true);
  });

  test("internal elevations or a joinery package cover joinery", () => {
    expect(coveredSelectionPackages([doc("Internal Elevations")]).has("joinery")).toBe(true);
    expect(coveredSelectionPackages([doc("Joinery Package")]).has("joinery")).toBe(true);
    expect(coveredSelectionPackages([doc("Cabinetry Details")]).has("joinery")).toBe(true);
  });

  test("a finishes schedule covers flooring, tiling and feature finishes", () => {
    const covered = coveredSelectionPackages([doc("Finishes Schedule")]);
    expect(covered.has("flooring")).toBe(true);
    expect(covered.has("tiling")).toBe(true);
    expect(covered.has("feature-finishes")).toBe(true);
  });

  // The rule the mapping exists to respect: a title has to actually
  // name the covering document. Ordinary sets never suppress anything.
  test("an ordinary drawing set covers nothing", () => {
    const covered = coveredSelectionPackages([
      doc("Architectural Plans", "architectural"),
      doc("Structural Engineering", "structural"),
      doc("Geotechnical Report", "soil"),
      doc("Project Specifications", "specification"),
    ]);
    expect(covered.size).toBe(0);
  });

  test("empty and untitled registers cover nothing", () => {
    expect(coveredSelectionPackages([]).size).toBe(0);
    expect(coveredSelectionPackages([doc("")]).size).toBe(0);
  });

  // Surfaces standardise display titles ("Project Specifications"),
  // so the covering nature often lives only in the filename.
  test("the filename carries the signal when the title is standardised", () => {
    const covered = coveredSelectionPackages([
      {
        kind: "specification",
        title: "Project Specifications",
        filename: "FFE Schedule Pascoe Vale S Rev F.pdf",
      },
    ]);
    expect(covered.has("appliances")).toBe(true);
    expect(covered.has("plumbing-fixtures")).toBe(true);
  });
});

describe("covered packages are consumed, never asked", () => {
  test("a covered package emits no card", () => {
    const packs = buildAllowancePackages(
      ["appliances.oven", "landscaping.turf"],
      "1m_1_5m",
      null,
      new Set(["appliances"]),
    );
    expect(packs.map((p) => p.key)).toEqual(["landscaping"]);
  });

  // The leak this API shape prevents: a suppressed package's items
  // falling through to the feature-finishes catch-all and being asked
  // about anyway under a different name.
  test("a covered package's items never leak into the catch-all", () => {
    const packs = buildAllowancePackages(
      ["appliances.oven", "appliances.dishwasher"],
      "1m_1_5m",
      null,
      new Set(["appliances"]),
    );
    expect(packs).toEqual([]);
  });

  test("no covered set keeps today's behaviour", () => {
    const before = buildAllowancePackages(["appliances.oven"], "1m_1_5m");
    expect(before.map((p) => p.key)).toEqual(["appliances"]);
  });
});

describe("selectionPackageKey", () => {
  test("maps a cosmetic gap to its package, first match wins", () => {
    expect(selectionPackageKey("appliances.oven")).toBe("appliances");
    expect(selectionPackageKey("landscaping.turf")).toBe("landscaping");
    expect(selectionPackageKey("joinery.benchtops")).toBe("joinery");
  });
  test("non-cosmetic lines have no package", () => {
    expect(selectionPackageKey("earthworks.rock-excavation")).toBeNull();
    expect(selectionPackageKey("approvals.soil-geotech")).toBeNull();
  });
});
