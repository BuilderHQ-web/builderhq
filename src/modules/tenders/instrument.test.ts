/**
 * The instrument's versioning and presence rules, pinned.
 *
 * v3's whole promise is that the deck, the submit gate, the document
 * and the comparison resolve the SAME question set from the same
 * facts. These tests pin the two edges that promise lives on: which
 * questions each version carries, and how document-aware presence
 * answers to the round's register.
 */

import { describe, expect, test } from "vitest";

import {
  INSTRUMENT_VERSION,
  INSTRUMENT_SECTIONS_V2,
  INSTRUMENT_SECTIONS_V3,
  sectionsFor,
  allQuestionsFor,
  questionInPlay,
  requiredQuestionIds,
  inPlayContextFromAnswers,
  getQuestion,
  type InPlayContext,
} from "./instrument";

const idsOf = (version: number) =>
  new Set(allQuestionsFor(version).map((q) => q.id));

describe("version resolution", () => {
  test("the current instrument is v3", () => {
    expect(INSTRUMENT_VERSION).toBe(3);
    expect(sectionsFor(3)).toBe(INSTRUMENT_SECTIONS_V3);
    expect(sectionsFor(null)).toBe(INSTRUMENT_SECTIONS_V3);
    expect(sectionsFor(2)).toBe(INSTRUMENT_SECTIONS_V2);
  });

  test("v3 retires the questions it says it retires, and v2 keeps them", () => {
    const v2 = idsOf(2);
    const v3 = idsOf(3);
    for (const id of [
      "elig.conditions",
      "understand.scope_confirm",
      "understand.discrepancy",
      "understand.rfis",
      "understand.gaps",
      "understand.gap_items",
      "site.soil_report",
      "site.soil_class",
      "site.engineering",
      "compliance.energy",
    ]) {
      expect(v2.has(id), `${id} in v2`).toBe(true);
      expect(v3.has(id), `${id} out of v3`).toBe(false);
    }
    for (const id of [
      "site.soil_class_confirm",
      "site.soil_class_basis",
      "site.engineering_confirm",
      "compliance.energy_confirm",
    ]) {
      expect(v3.has(id), `${id} in v3`).toBe(true);
      expect(v2.has(id), `${id} out of v2`).toBe(false);
    }
  });

  test("v3 renumbers the surviving understanding questions", () => {
    const byId = new Map(allQuestionsFor(3).map((q) => [q.id, q]));
    expect(byId.get("understand.concerns")?.ref).toBe("2.1");
    expect(byId.get("understand.risks")?.ref).toBe("2.2");
  });

  test("v3 widens the option sets it says it widens", () => {
    const byId = new Map(allQuestionsFor(3).map((q) => [q.id, q]));
    expect(
      byId
        .get("payments.final_claim")
        ?.options?.some((o) => o.value === "contract_terms"),
    ).toBe(true);
    expect(
      byId
        .get("pcps.basis")
        ?.options?.some((o) => o.value === "client_provided"),
    ).toBe(true);
    // v2 stays frozen.
    const v2ById = new Map(allQuestionsFor(2).map((q) => [q.id, q]));
    expect(
      v2ById
        .get("payments.final_claim")
        ?.options?.some((o) => o.value === "contract_terms"),
    ).toBe(false);
  });

  test("the union index resolves shared ids to the current version", () => {
    expect(
      getQuestion("pcps.basis")?.options?.some(
        (o) => o.value === "client_provided",
      ),
    ).toBe(true);
  });
});

describe("document-aware presence", () => {
  const q = (id: string) => allQuestionsFor(3).find((x) => x.id === id)!;

  test("a soil report on file asks the confirmation, never the basis", () => {
    const ctx: InPlayContext = { hasSchedule: true, soilOnFile: true };
    expect(questionInPlay(q("site.soil_class_confirm"), ctx)).toBe(true);
    expect(questionInPlay(q("site.soil_class_basis"), ctx)).toBe(false);
  });

  test("no soil report asks the basis, never the confirmation", () => {
    const ctx: InPlayContext = { hasSchedule: true, soilOnFile: false };
    expect(questionInPlay(q("site.soil_class_confirm"), ctx)).toBe(false);
    expect(questionInPlay(q("site.soil_class_basis"), ctx)).toBe(true);
  });

  test("unknown report flags default safe: ask soil, hide the confirmations", () => {
    const ctx: InPlayContext = { hasSchedule: false };
    expect(questionInPlay(q("site.soil_class_basis"), ctx)).toBe(true);
    expect(questionInPlay(q("site.soil_class_confirm"), ctx)).toBe(false);
    expect(questionInPlay(q("site.engineering_confirm"), ctx)).toBe(false);
    expect(questionInPlay(q("compliance.energy_confirm"), ctx)).toBe(false);
  });

  test("structural and energy confirmations exist only when on file", () => {
    const on: InPlayContext = {
      hasSchedule: true,
      structuralOnFile: true,
      energyOnFile: true,
    };
    expect(questionInPlay(q("site.engineering_confirm"), on)).toBe(true);
    expect(questionInPlay(q("compliance.energy_confirm"), on)).toBe(true);
  });

  test("the submit gate follows the same presence", () => {
    const none = new Map<string, unknown>();
    const withSoil = requiredQuestionIds(none, 3, {
      hasSchedule: true,
      soilOnFile: true,
      structuralOnFile: true,
      energyOnFile: true,
    });
    expect(withSoil).toContain("site.soil_class_confirm");
    expect(withSoil).not.toContain("site.soil_class_basis");
    expect(withSoil).toContain("site.engineering_confirm");
    expect(withSoil).toContain("compliance.energy_confirm");

    const bare = requiredQuestionIds(none, 3, { hasSchedule: true });
    expect(bare).toContain("site.soil_class_basis");
    expect(bare).not.toContain("site.soil_class_confirm");
    expect(bare).not.toContain("site.engineering_confirm");
    expect(bare).not.toContain("compliance.energy_confirm");
  });

  test("a sealed tender's answers rebuild the context it was asked under", () => {
    const ctx = inPlayContextFromAnswers(
      { "site.soil_class_confirm": true, "compliance.energy_confirm": true },
      true,
    );
    expect(ctx.soilOnFile).toBe(true);
    expect(ctx.energyOnFile).toBe(true);
    expect(ctx.structuralOnFile).toBeUndefined();
    const basisCtx = inPlayContextFromAnswers(
      { "site.soil_class_basis": "m" },
      true,
    );
    expect(basisCtx.soilOnFile).toBe(false);
  });
});
