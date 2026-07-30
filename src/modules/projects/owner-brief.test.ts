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

describe("completeness", () => {
  test("all six answered is complete", () => {
    expect(isOwnerBriefComplete(FULL)).toBe(true);
  });
  test("five of six is not", () => {
    const { funding: _dropped, ...partial } = FULL;
    expect(isOwnerBriefComplete(partial)).toBe(false);
  });
  test("six answers with one junk value is not", () => {
    expect(isOwnerBriefComplete({ ...FULL, funding: "maybe" })).toBe(false);
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
  test("a full brief renders all six rows", () => {
    expect(briefForBuilders(FULL)).toHaveLength(6);
  });
  test("junk never renders", () => {
    expect(briefForBuilders(null)).toEqual([]);
    expect(briefForBuilders({ funding: 42 })).toEqual([]);
  });
});
