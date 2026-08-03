/**
 * The Owner Brief — validation and display, pinned.
 *
 * The brief gates going live and its labels are shown to builders, so
 * junk answers must never save and unanswered questions must never
 * read as complete.
 */

import { describe, expect, test } from "vitest";

import {
  OWNER_BRIEF_QUESTIONS,
  questionsForOwnerBrief,
  isOwnerBriefComplete,
  isOwnerBriefShape,
  briefLabel,
  briefForBuilders,
} from "./owner-brief";

const FULL = Object.fromEntries(
  OWNER_BRIEF_QUESTIONS.map((q) => [q.id, q.options[0]!.value]),
);

describe("shape", () => {
  test("empty is a valid partial", () => {
    expect(isOwnerBriefShape({})).toBe(true);
  });
  test("a listed answer is valid", () => {
    expect(isOwnerBriefShape({ funding: "finance_approved" })).toBe(true);
  });
  test("an unlisted value is rejected", () => {
    expect(isOwnerBriefShape({ funding: "trust me" })).toBe(false);
  });
  test("an unknown question is rejected", () => {
    expect(isOwnerBriefShape({ favourite_colour: "teal" })).toBe(false);
  });
  test("non-objects are rejected", () => {
    expect(isOwnerBriefShape(null)).toBe(false);
    expect(isOwnerBriefShape([])).toBe(false);
    expect(isOwnerBriefShape("yes")).toBe(false);
  });
});

describe("type scoping", () => {
  test("occupancy is asked on renovations and extensions only", () => {
    const ids = (t: string) => questionsForOwnerBrief(t).map((q) => q.id);
    expect(ids("renovation")).toContain("occupancy");
    expect(ids("extension")).toContain("occupancy");
    // A multi-dwelling or new-build site is vacant by definition.
    expect(ids("multi_dwelling")).not.toContain("occupancy");
    expect(ids("single_dwelling")).not.toContain("occupancy");
  });
  test("planning approval is asked of everyone", () => {
    for (const t of ["renovation", "multi_dwelling", "single_dwelling"]) {
      expect(questionsForOwnerBrief(t).map((q) => q.id)).toContain("planning");
    }
  });
});

describe("completeness", () => {
  test("every question answered is complete for any type", () => {
    expect(isOwnerBriefComplete(FULL, "renovation")).toBe(true);
    expect(isOwnerBriefComplete(FULL, "multi_dwelling")).toBe(true);
  });
  test("a missing answer blocks completion", () => {
    const { funding: _dropped, ...partial } = FULL;
    expect(isOwnerBriefComplete(partial, "multi_dwelling")).toBe(false);
  });
  test("a junk value blocks completion", () => {
    expect(
      isOwnerBriefComplete({ ...FULL, funding: "maybe" }, "multi_dwelling"),
    ).toBe(false);
  });
  // The scoping rule doing real work: the same answers read differently
  // by project type. No occupancy answer is fine on a new build and a
  // blocker on a renovation.
  test("occupancy is required only where it is asked", () => {
    const { occupancy: _dropped, ...withoutOccupancy } = FULL;
    expect(isOwnerBriefComplete(withoutOccupancy, "multi_dwelling")).toBe(true);
    expect(isOwnerBriefComplete(withoutOccupancy, "renovation")).toBe(false);
  });
});

describe("display", () => {
  test("labels resolve", () => {
    expect(briefLabel("funding", "finance_approved")).toBe("Finance approved");
    expect(briefLabel("funding", undefined)).toBeNull();
  });
  test("builders see only answered rows, funding first", () => {
    const rows = briefForBuilders({ funding: "savings" });
    expect(rows).toEqual([{ k: "Funding", v: "Own funds" }]);
  });
  test("a full brief renders every answered row", () => {
    expect(briefForBuilders(FULL)).toHaveLength(OWNER_BRIEF_QUESTIONS.length);
  });
  test("planning approval reaches the builder read", () => {
    const rows = briefForBuilders({ planning: "approved" });
    expect(rows).toEqual([{ k: "Planning approval", v: "Approved and in hand" }]);
  });
  test("junk never renders", () => {
    expect(briefForBuilders(null)).toEqual([]);
    expect(briefForBuilders({ funding: 42 })).toEqual([]);
  });
});
