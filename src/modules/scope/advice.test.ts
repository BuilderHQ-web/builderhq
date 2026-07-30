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
  adviseMissingDocuments,
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
