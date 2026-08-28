/**
 * The deterministic layer, pinned.
 *
 * These rules exist to overrule a language model, so the thing that
 * must be tested is not that they fire but that they fire on exactly
 * the right lines. A guard that over-reaches deletes real scope from a
 * tender, which is worse than the false gap it was built to remove.
 *
 * Every rule is therefore tested from both sides: the case it must
 * catch, and the neighbouring case it must leave alone.
 */

import { describe, expect, test } from "vitest";

import {
  applyDeterministicGuards,
  collectFacts,
  renderFacts,
} from "./deterministic";
import type { SynthesisDocumentInput, SynthesisResult } from "./pipeline";

// ── fixtures ────────────────────────────────────────────────────────

type Page = SynthesisDocumentInput["findings"]["pages"][number];

const page = (over: Partial<Page> = {}): Page => ({
  page: 1,
  sheetId: null,
  viewType: "plan",
  viewLabel: null,
  dwelling: null,
  itemIds: [],
  claims: [],
  schedules: [],
  statedFigures: [],
  offStandard: [],
  docRefs: [],
  note: null,
  ...over,
});

const doc = (pages: Page[], id = "doc-a"): SynthesisDocumentInput => ({
  documentId: id,
  filename: `${id}.pdf`,
  kind: "architectural",
  revision: null,
  findings: { pages },
});

const claim = (
  itemId: string,
  over: Partial<Page["claims"][number]> = {},
): Page["claims"][number] => ({
  itemId,
  polarity: "positive",
  modality: "selected",
  genericity: "project_specific",
  quote: "shown on the plan",
  dwelling: null,
  ...over,
});

const item = (
  itemId: string,
  over: Partial<SynthesisResult["items"][number]> = {},
): SynthesisResult["items"][number] => ({
  itemId,
  status: "evidenced",
  citations: [{ documentId: "doc-a", page: 1 }],
  note: "shown",
  depth: null,
  remaining: null,
  gapClass: null,
  priceable: null,
  confidence: 0.8,
  ...over,
});

const synth = (
  items: SynthesisResult["items"],
  conflicts: SynthesisResult["conflicts"] = [],
): SynthesisResult => ({ overview: null, items, conflicts, captures: [] });

// ── collectFacts ────────────────────────────────────────────────────

describe("collectFacts", () => {
  test("an explicit refusal suppresses the item", () => {
    const f = collectFacts([
      doc([
        page({
          claims: [
            claim("landscaping.irrigation", {
              polarity: "not_required",
              quote: "NO IRRIGATION",
            }),
          ],
        }),
      ]),
    ]);
    expect(f.suppressed.map((s) => s.itemId)).toEqual(["landscaping.irrigation"]);
    expect(f.suppressed[0]!.quote).toBe("NO IRRIGATION");
  });

  test("a refusal scoped to ONE dwelling does not suppress the project", () => {
    // The separating case. On a two-unit job, "no irrigation" on unit
    // 1's landscape plan says nothing about unit 2, and a guard that
    // treated it as project-wide would delete real scope.
    const f = collectFacts([
      doc([
        page({
          claims: [
            claim("landscaping.irrigation", {
              polarity: "not_required",
              quote: "NO IRRIGATION",
              dwelling: "Unit 1",
            }),
          ],
        }),
      ]),
    ]);
    expect(f.suppressed).toEqual([]);
  });

  test("a page-level dwelling label scopes its claims too", () => {
    const f = collectFacts([
      doc([
        page({
          dwelling: "Unit 2",
          claims: [claim("landscaping.irrigation", { polarity: "excluded" })],
        }),
      ]),
    ]);
    expect(f.suppressed).toEqual([]);
  });

  test("an item shown only on a render does not count as shown", () => {
    const f = collectFacts([
      doc([page({ viewType: "render", itemIds: ["joinery.island-bench"] })]),
    ]);
    expect(f.shown.has("joinery.island-bench")).toBe(false);
  });

  test("the same item on a plan does count as shown", () => {
    const f = collectFacts([
      doc([page({ viewType: "plan", itemIds: ["joinery.island-bench"] })]),
    ]);
    expect(f.shown.has("joinery.island-bench")).toBe(true);
  });

  test("conditional-only support makes an item unselected", () => {
    const f = collectFacts([
      doc([
        page({
          claims: [
            claim("windows.flyscreens", {
              modality: "if_required",
              quote: "flyscreens if required",
            }),
          ],
        }),
      ]),
    ]);
    expect(f.unselected.map((u) => u.itemId)).toEqual(["windows.flyscreens"]);
  });

  test("an item conditionally mentioned AND genuinely shown is not unselected", () => {
    const f = collectFacts([
      doc([
        page({
          itemIds: ["windows.flyscreens"],
          claims: [claim("windows.flyscreens", { modality: "if_required" })],
        }),
      ]),
    ]);
    expect(f.unselected).toEqual([]);
  });

  test("work handed to another party is recorded as deferred", () => {
    const f = collectFacts([
      doc([
        page({
          claims: [
            claim("framing.hardware-bracing", {
              polarity: "by_others",
              quote: "bracing refer engineering",
            }),
          ],
        }),
      ]),
    ]);
    expect(f.deferred.get("framing.hardware-bracing")?.quote).toBe(
      "bracing refer engineering",
    );
  });

  test("ordinary selected work is not deferred", () => {
    const f = collectFacts([
      doc([page({ claims: [claim("framing.wall-frames")] })]),
    ]);
    expect(f.deferred.size).toBe(0);
  });

  test("counts dwellings from the labels the documents carry", () => {
    const f = collectFacts([
      doc([page({ dwelling: "Unit 1" }), page({ page: 2, dwelling: "Unit 2" })]),
    ]);
    expect(f.dwellings).toBe(2);
  });

  test("a pack that names no dwelling is one dwelling, never zero", () => {
    // Zero would make every per-dwelling reconciliation compute to nil.
    expect(collectFacts([doc([page()])]).dwellings).toBe(1);
  });

  test("catches a components-against-total contradiction", () => {
    const f = collectFacts([
      doc([
        page({
          statedFigures: [
            { label: "PV array", value: "8 panels @ 330W", itemId: "electrical.solar-pv", basis: null, dwelling: null },
            { label: "System size", value: "2.5 kW", itemId: "electrical.solar-pv", basis: null, dwelling: null },
          ],
        }),
      ]),
    ]);
    expect(f.arithmetic).toHaveLength(1);
    expect(f.arithmetic[0]!.detail).toContain("330");
  });

  test("per-dwelling against a project total is reconciled, not a conflict", () => {
    const f = collectFacts([
      doc([
        page({
          dwelling: "Unit 1",
          statedFigures: [
            { label: "PV", value: "2 kW", itemId: "electrical.solar-pv", basis: "per_dwelling", dwelling: "Unit 1" },
          ],
        }),
        page({
          page: 2,
          dwelling: "Unit 2",
          statedFigures: [
            { label: "PV total", value: "4 kW", itemId: "electrical.solar-pv", basis: "total_project", dwelling: null },
          ],
        }),
      ]),
    ]);
    expect(f.dwellings).toBe(2);
    expect(f.reconciliations.map((r) => r.verdict)).toContain("consistent");
  });
});

// ── renderFacts ─────────────────────────────────────────────────────

describe("renderFacts", () => {
  test("says nothing when there is nothing settled", () => {
    expect(renderFacts(collectFacts([doc([page()])]))).toBe("");
  });

  test("states a refusal as an instruction, not as data", () => {
    const text = renderFacts(
      collectFacts([
        doc([
          page({
            claims: [
              claim("landscaping.irrigation", {
                polarity: "not_required",
                quote: "NO IRRIGATION",
              }),
            ],
          }),
        ]),
      ]),
    );
    expect(text).toContain("landscaping.irrigation");
    expect(text).toContain("NO IRRIGATION");
    expect(text).toContain("not_expected");
    expect(text).toContain("governs");
  });

  test("tells the model not to raise a reconciled pair", () => {
    const f = collectFacts([
      doc([
        page({
          statedFigures: [
            { label: "min", value: "2 kW", itemId: "electrical.solar-pv", basis: "minimum", dwelling: null },
            { label: "selected", value: "2.5 kW", itemId: "electrical.solar-pv", basis: "selected", dwelling: null },
          ],
        }),
      ]),
    ]);
    expect(renderFacts(f)).toContain("ALREADY RECONCILED");
  });
});

// ── the guards ──────────────────────────────────────────────────────

describe("applyDeterministicGuards", () => {
  const suppressedFacts = collectFacts([
    doc([
      page({
        claims: [
          claim("landscaping.irrigation", {
            polarity: "not_required",
            quote: "NO IRRIGATION",
          }),
        ],
      }),
    ]),
  ]);

  test("a refused item cannot stay evidenced", () => {
    const r = applyDeterministicGuards(
      synth([item("landscaping.irrigation", { status: "evidenced" })]),
      suppressedFacts,
    );
    expect(r.synthesis.items[0]!.status).toBe("not_expected");
    expect(r.synthesis.items[0]!.note).toContain("NO IRRIGATION");
    expect(r.corrections[0]!.rule).toBe("refused-by-documents");
  });

  test("a refused item cannot be raised as a gap either", () => {
    const r = applyDeterministicGuards(
      synth([item("landscaping.irrigation", { status: "gap", citations: [] })]),
      suppressedFacts,
    );
    expect(r.synthesis.items[0]!.status).toBe("not_expected");
  });

  test("a refused item already called not_expected is left alone", () => {
    const r = applyDeterministicGuards(
      synth([item("landscaping.irrigation", { status: "not_expected", citations: [] })]),
      suppressedFacts,
    );
    expect(r.corrections).toEqual([]);
  });

  test("an item nothing refuses is untouched", () => {
    const r = applyDeterministicGuards(
      synth([item("framing.wall-frames", { status: "evidenced" })]),
      suppressedFacts,
    );
    expect(r.synthesis.items[0]!.status).toBe("evidenced");
    expect(r.corrections).toEqual([]);
  });

  test("a conditionally-mentioned item does not become a gap", () => {
    const facts = collectFacts([
      doc([
        page({
          claims: [
            claim("windows.flyscreens", {
              modality: "if_required",
              quote: "flyscreens if required",
            }),
          ],
        }),
      ]),
    ]);
    const r = applyDeterministicGuards(
      synth([item("windows.flyscreens", { status: "gap", citations: [] })]),
      facts,
    );
    expect(r.synthesis.items[0]!.status).toBe("not_expected");
    expect(r.corrections[0]!.rule).toBe("mentioned-not-selected");
  });

  test("refusal beats conditional mention when both apply", () => {
    // Precedence. A decision outranks a possibility, and the note the
    // owner reads should say they decided against it, not that nobody
    // chose it.
    const facts = collectFacts([
      doc([
        page({
          claims: [
            claim("landscaping.irrigation", { modality: "if_required", quote: "irrigation if required" }),
            claim("landscaping.irrigation", { polarity: "excluded", quote: "IRRIGATION EXCLUDED" }),
          ],
        }),
      ]),
    ]);
    const r = applyDeterministicGuards(
      synth([item("landscaping.irrigation", { status: "gap", citations: [] })]),
      facts,
    );
    expect(r.corrections.filter((c) => c.itemId === "landscaping.irrigation")).toHaveLength(1);
    expect(r.corrections[0]!.rule).toBe("refused-by-documents");
    expect(r.synthesis.items[0]!.note).toContain("EXCLUDED");
  });

  const empty = collectFacts([doc([page()])]);

  test("every preliminaries gap is a contractor obligation", () => {
    const r = applyDeterministicGuards(
      synth([
        item("preliminaries.scaffolding", { status: "gap", citations: [], gapClass: "design_gap" }),
        item("preliminaries.supervision", { status: "gap", citations: [], gapClass: null }),
      ]),
      empty,
    );
    expect(r.synthesis.items.map((i) => i.gapClass)).toEqual([
      "contractor_obligation",
      "contractor_obligation",
    ]);
  });

  test("an EVIDENCED preliminaries line gets no gap class", () => {
    // The separating case: gap class only means anything on a gap.
    const r = applyDeterministicGuards(
      synth([item("preliminaries.scaffolding", { status: "evidenced" })]),
      empty,
    );
    expect(r.synthesis.items[0]!.gapClass).toBeNull();
  });

  test("a gap outside preliminaries keeps the model's class", () => {
    const r = applyDeterministicGuards(
      synth([item("framing.wall-frames", { status: "gap", citations: [], gapClass: "design_gap" })]),
      empty,
    );
    expect(r.synthesis.items[0]!.gapClass).toBe("design_gap");
    expect(r.corrections).toEqual([]);
  });

  const deferredFacts = collectFacts([
    doc([
      page({
        itemIds: ["framing.hardware-bracing", "framing.wall-frames"],
        claims: [
          claim("framing.hardware-bracing", {
            polarity: "by_others",
            quote: "bracing to engineer's details",
          }),
        ],
      }),
    ]),
  ]);

  test("deferred work gaps as a later consultant package", () => {
    const r = applyDeterministicGuards(
      synth([item("framing.hardware-bracing", { status: "gap", citations: [], gapClass: "design_gap" })]),
      deferredFacts,
    );
    expect(r.synthesis.items[0]!.gapClass).toBe("later_consultant_package");
  });

  test("deferred work can never be called priceable", () => {
    const r = applyDeterministicGuards(
      synth([
        item("framing.hardware-bracing", { status: "evidenced", depth: "full", priceable: true }),
      ]),
      deferredFacts,
    );
    expect(r.synthesis.items[0]!.priceable).toBe(false);
    expect(r.corrections[0]!.rule).toBe("deferred-work-cannot-be-priced");
  });

  test("work nothing defers keeps the model's priceability claim", () => {
    const r = applyDeterministicGuards(
      synth([item("framing.wall-frames", { status: "evidenced", depth: "full", priceable: true })]),
      deferredFacts,
    );
    expect(r.synthesis.items[0]!.priceable).toBe(true);
  });

  test("a gap carries no priceability claim", () => {
    const r = applyDeterministicGuards(
      synth([item("framing.wall-frames", { status: "gap", citations: [], priceable: true })]),
      empty,
    );
    expect(r.synthesis.items[0]!.priceable).toBeNull();
  });

  test("a suppressed line loses the priceability claim it carried", () => {
    // This is what "hygiene runs last" is for. The line arrives
    // evidenced and priced; suppression makes it not_expected; the
    // stale claim must not survive the move. Run hygiene first and it
    // does, because at that moment the line was still evidenced.
    const r = applyDeterministicGuards(
      synth([
        item("landscaping.irrigation", {
          status: "evidenced",
          depth: "full",
          priceable: true,
        }),
      ]),
      suppressedFacts,
    );
    expect(r.synthesis.items[0]!.status).toBe("not_expected");
    expect(r.synthesis.items[0]!.priceable).toBeNull();
  });

  test("a suppressed line loses the gap class it carried", () => {
    const r = applyDeterministicGuards(
      synth([
        item("landscaping.irrigation", {
          status: "gap",
          citations: [],
          gapClass: "design_gap",
        }),
      ]),
      suppressedFacts,
    );
    expect(r.synthesis.items[0]!.status).toBe("not_expected");
    expect(r.synthesis.items[0]!.gapClass).toBeNull();
  });

  const arithmeticFacts = collectFacts([
    doc([
      page({
        statedFigures: [
          { label: "PV array", value: "8 panels @ 330W", itemId: "electrical.solar-pv", basis: null, dwelling: null },
          { label: "System size", value: "2.5 kW", itemId: "electrical.solar-pv", basis: null, dwelling: null },
        ],
      }),
    ]),
  ]);

  test("a contradiction the model missed is added as a conflict", () => {
    const r = applyDeterministicGuards(synth([]), arithmeticFacts);
    expect(r.addedConflicts).toBe(1);
    expect(r.synthesis.conflicts[0]!.severity).toBe("high");
    expect(r.synthesis.conflicts[0]!.summary).toContain("330");
  });

  test("a contradiction the model already raised is not doubled", () => {
    const r = applyDeterministicGuards(
      synth([], [
        { summary: "The array computes to 2640W against a stated 2500W.", citations: [], severity: "high" },
      ]),
      arithmeticFacts,
    );
    expect(r.addedConflicts).toBe(0);
    expect(r.synthesis.conflicts).toHaveLength(1);
  });

  test("every override is recorded, never made silently", () => {
    const r = applyDeterministicGuards(
      synth([item("landscaping.irrigation", { status: "evidenced" })]),
      suppressedFacts,
    );
    expect(r.corrections).toHaveLength(1);
    expect(r.corrections[0]).toMatchObject({
      itemId: "landscaping.irrigation",
      field: "status",
      from: "evidenced",
      to: "not_expected",
    });
  });

  test("a synthesis nothing applies to comes back unchanged", () => {
    const before = synth([item("framing.wall-frames", { status: "evidenced" })]);
    const r = applyDeterministicGuards(before, empty);
    expect(r.corrections).toEqual([]);
    expect(r.addedConflicts).toBe(0);
    expect(r.synthesis.items[0]!.status).toBe("evidenced");
  });
});
