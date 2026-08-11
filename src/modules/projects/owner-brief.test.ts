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
  ARCHITECT_BRIEF_QUESTIONS,
  questionsForOwnerBrief,
  questionsForBrief,
  isOwnerBriefComplete,
  isOwnerBriefShape,
  briefLabel,
  briefForBuilders,
  rememberedBriefAnswers,
} from "./owner-brief";

const FULL = Object.fromEntries(
  OWNER_BRIEF_QUESTIONS.map((q) => [q.id, q.options[0]!.value]),
);

const FULL_ARCHITECT = Object.fromEntries(
  ARCHITECT_BRIEF_QUESTIONS.map((q) => [q.id, q.options[0]!.value]),
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

describe("architect audience", () => {
  test("the architect set asks about the role; the owner set never does", () => {
    expect(questionsForBrief("single_dwelling", "architect").map((q) => q.id)).toContain("role");
    expect(questionsForBrief("single_dwelling", "owner").map((q) => q.id)).not.toContain("role");
  });
  test("occupancy scoping applies to the architect set too", () => {
    const ids = (t: string) =>
      questionsForBrief(t, "architect").map((q) => q.id);
    expect(ids("renovation")).toContain("occupancy");
    expect(ids("single_dwelling")).not.toContain("occupancy");
  });
  test("a full architect brief is complete", () => {
    expect(isOwnerBriefComplete(FULL_ARCHITECT, "multi_dwelling")).toBe(true);
  });
  test("an architect brief missing the role is not complete", () => {
    const { role: _dropped, ...withoutRole } = FULL_ARCHITECT;
    // Without role it is judged as an owner brief — and passes only if
    // it satisfies THAT set, which it does here (shared ids/values).
    expect(isOwnerBriefComplete(withoutRole, "multi_dwelling")).toBe(true);
    // But drop a shared answer too and neither set is satisfied.
    const { funding: _also, ...neither } = withoutRole;
    expect(isOwnerBriefComplete(neither, "multi_dwelling")).toBe(false);
  });
  test("architect answers are valid shape", () => {
    expect(isOwnerBriefShape({ role: "contract_admin" })).toBe(true);
    expect(isOwnerBriefShape({ role: "site dictator" })).toBe(false);
  });
  test("builders read an architect brief with architect labels and the role row", () => {
    const rows = briefForBuilders({
      role: "contract_admin",
      selections: "decided",
    });
    expect(rows).toContainEqual({
      k: "Designer during construction",
      v: "Contract administration",
    });
    expect(rows).toContainEqual({
      k: "Selections",
      v: "Documented and decided",
    });
  });
});

describe("memory", () => {
  test("remembered answers carry only remember-flagged questions", () => {
    const carried = rememberedBriefAnswers(FULL, "owner");
    expect(Object.keys(carried)).toEqual(["experience"]);
  });
  test("the architect set remembers the role", () => {
    const carried = rememberedBriefAnswers(FULL_ARCHITECT, "architect");
    expect(Object.keys(carried)).toEqual(["role"]);
  });
  test("a value the audience's question does not list is not carried", () => {
    // "Our first build" exists for both audiences, so it carries; a
    // junk value never does.
    expect(rememberedBriefAnswers({ experience: "junk" }, "owner")).toEqual({});
    expect(rememberedBriefAnswers(null, "owner")).toEqual({});
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
