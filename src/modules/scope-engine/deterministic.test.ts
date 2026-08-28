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
    expect(r.items[0]!.status).toBe("not_expected");
    expect(r.items[0]!.note).toContain("NO IRRIGATION");
    expect(r.corrections[0]!.rule).toBe("refused-by-documents");
  });

  test("a refused item cannot be raised as a gap either", () => {
    const r = applyDeterministicGuards(
      synth([item("landscaping.irrigation", { status: "gap", citations: [] })]),
      suppressedFacts,
    );
    expect(r.items[0]!.status).toBe("not_expected");
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
    expect(r.items[0]!.status).toBe("evidenced");
    expect(r.corrections).toEqual([]);
  });

  test("a conditionally-mentioned item does not become a gap", () => {
    // Uses a CONDITIONAL item deliberately. This originally used
    // windows.flyscreens, which the tier table calls core while the
    // corpus labels it not_expected on Wallace — a real disagreement
    // between the two, recorded rather than fitted to.
    const facts = collectFacts([
      doc([
        page({
          claims: [
            claim("appliances.outdoor-kitchen", {
              modality: "if_required",
              quote: "outdoor kitchen if required",
            }),
          ],
        }),
      ]),
    ]);
    const r = applyDeterministicGuards(
      synth([item("appliances.outdoor-kitchen", { status: "gap", citations: [] })]),
      facts,
    );
    expect(r.items[0]!.status).toBe("not_expected");
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
    expect(r.items[0]!.note).toContain("EXCLUDED");
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
    expect(r.items.map((i) => i.gapClass)).toEqual([
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
    expect(r.items[0]!.gapClass).toBeNull();
  });

  test("a gap outside preliminaries keeps the model's class", () => {
    const r = applyDeterministicGuards(
      synth([item("framing.wall-frames", { status: "gap", citations: [], gapClass: "design_gap" })]),
      empty,
    );
    expect(r.items[0]!.gapClass).toBe("design_gap");
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
    expect(r.items[0]!.gapClass).toBe("later_consultant_package");
  });

  test("deferred work can never be called priceable", () => {
    const r = applyDeterministicGuards(
      synth([
        item("framing.hardware-bracing", { status: "evidenced", depth: "full", priceable: true }),
      ]),
      deferredFacts,
    );
    expect(r.items[0]!.priceable).toBe(false);
    expect(r.corrections[0]!.rule).toBe("deferred-work-cannot-be-priced");
  });

  test("work nothing defers keeps the model's priceability claim", () => {
    const r = applyDeterministicGuards(
      synth([item("framing.wall-frames", { status: "evidenced", depth: "full", priceable: true })]),
      deferredFacts,
    );
    expect(r.items[0]!.priceable).toBe(true);
  });

  test("a gap carries no priceability claim", () => {
    const r = applyDeterministicGuards(
      synth([item("framing.wall-frames", { status: "gap", citations: [], priceable: true })]),
      empty,
    );
    expect(r.items[0]!.priceable).toBeNull();
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
    expect(r.items[0]!.status).toBe("not_expected");
    expect(r.items[0]!.priceable).toBeNull();
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
    expect(r.items[0]!.status).toBe("not_expected");
    expect(r.items[0]!.gapClass).toBeNull();
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
    expect(r.conflicts[0]!.severity).toBe("high");
    expect(r.conflicts[0]!.summary).toContain("330");
  });

  test("a contradiction the model already raised is not doubled", () => {
    const r = applyDeterministicGuards(
      synth([], [
        { summary: "The array computes to 2640W against a stated 2500W.", citations: [], severity: "high" },
      ]),
      arithmeticFacts,
    );
    expect(r.addedConflicts).toBe(0);
    expect(r.conflicts).toHaveLength(1);
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
    expect(r.items[0]!.status).toBe("evidenced");
  });
});

describe("the tier rules", () => {
  const empty2 = collectFacts([doc([page()])]);

  const mentioning = (itemId: string) =>
    collectFacts([doc([page({ itemIds: [itemId] })])]);

  test("weak evidence on a CORE item is a gap, never not applicable", () => {
    // Cost two lines on the first scored run. Every house has termite
    // management: a passing note about the standard does not select a
    // system, and it does not remove the requirement either.
    const facts = collectFacts([
      doc([
        page({
          claims: [
            claim("footings-slab.termite-management", {
              genericity: "template_note",
              quote: "termite management to AS3660",
            }),
          ],
        }),
      ]),
    ]);
    const r = applyDeterministicGuards(
      synth([item("footings-slab.termite-management", { status: "not_expected", citations: [] })]),
      facts,
    );
    expect(r.items[0]!.status).toBe("gap");
    expect(r.corrections[0]!.rule).toBe("mentioned-not-selected");
  });

  test("weak evidence on a CONDITIONAL item is still not applicable", () => {
    const facts = collectFacts([
      doc([
        page({
          claims: [
            claim("landscaping.pool", { modality: "if_required", quote: "pool if required" }),
          ],
        }),
      ]),
    ]);
    const r = applyDeterministicGuards(
      synth([item("landscaping.pool", { status: "gap", citations: [] })]),
      facts,
    );
    expect(r.items[0]!.status).toBe("not_expected");
  });

  test("weak evidence never demotes an EVIDENCED core line", () => {
    // The documents may show it properly on another page. One weak
    // mention must not outrank a real one.
    const facts = collectFacts([
      doc([
        page({
          claims: [
            claim("footings-slab.termite-management", { genericity: "template_note", quote: "to AS3660" }),
          ],
        }),
      ]),
    ]);
    const r = applyDeterministicGuards(
      synth([item("footings-slab.termite-management", { status: "evidenced" })]),
      facts,
    );
    expect(r.items[0]!.status).toBe("evidenced");
  });

  test("a commercial item is never not applicable", () => {
    // Scaffolding does not stop being needed because nobody drew it.
    // Not one of the 31 commercial lines across both golden packages
    // is not_expected.
    const r = applyDeterministicGuards(
      synth([item("preliminaries.temporary-fencing", { status: "not_expected", citations: [] })]),
      empty2,
    );
    expect(r.items[0]!.status).toBe("gap");
    expect(r.items[0]!.gapClass).toBe("contractor_obligation");
    expect(r.corrections[0]!.rule).toBe("commercial-work-is-always-owed");
  });

  test("an EVIDENCED commercial item is left alone", () => {
    const r = applyDeterministicGuards(
      synth([item("preliminaries.temporary-fencing", { status: "evidenced" })]),
      empty2,
    );
    expect(r.items[0]!.status).toBe("evidenced");
    expect(r.corrections).toEqual([]);
  });

  test("a conditional item nothing mentions is not a gap", () => {
    // The single largest source of wrong answers in both baselines:
    // asking an owner about a lift on a house that has no lift.
    const r = applyDeterministicGuards(
      synth([item("stairs.residential-lift", { status: "gap", citations: [] })]),
      empty2,
    );
    expect(r.items[0]!.status).toBe("not_expected");
    expect(r.corrections[0]!.rule).toBe("conditional-without-an-activation-signal");
  });

  test("a conditional item the documents DO mention may still gap", () => {
    // The separating case, and the reason this rule reads `mentioned`
    // instead of demoting every non-core gap. A lift drawn but never
    // specified is a real hole, and demoting it would hide it.
    const r = applyDeterministicGuards(
      synth([item("stairs.residential-lift", { status: "gap", citations: [] })]),
      mentioning("stairs.residential-lift"),
    );
    expect(r.items[0]!.status).toBe("gap");
    expect(r.corrections).toEqual([]);
  });

  test("a CORE item nothing mentions is still a gap", () => {
    // Wall linings are owed by every house. Silence about them is
    // exactly what a gap is for, and this rule must never touch one.
    const r = applyDeterministicGuards(
      synth([item("lining.wall-plasterboard", { status: "gap", citations: [] })]),
      empty2,
    );
    expect(r.items[0]!.status).toBe("gap");
  });

  test("a commercial item nothing mentions is still a gap", () => {
    // Scaffolding is not mentioned on any drawing ever. It is still
    // owed; it is just owed by the builder, which is a gap CLASS
    // question and not an applicability one.
    const r = applyDeterministicGuards(
      synth([item("preliminaries.scaffolding", { status: "gap", citations: [] })]),
      empty2,
    );
    expect(r.items[0]!.status).toBe("gap");
    expect(r.items[0]!.gapClass).toBe("contractor_obligation");
  });

  test("commercial gap class reaches beyond preliminaries", () => {
    const r = applyDeterministicGuards(
      synth([item("approvals.building-permit", { status: "gap", citations: [] })]),
      empty2,
    );
    expect(r.items[0]!.gapClass).toBe("contractor_obligation");
  });

  test("a document beats the Standard on gap class", () => {
    // A commercial item the documents defer belongs to the package
    // that will carry it, not to the builder's preliminaries.
    const facts = collectFacts([
      doc([
        page({
          claims: [
            claim("approvals.engineering-design", {
              polarity: "by_others",
              quote: "engineering by others",
            }),
          ],
        }),
      ]),
    ]);
    const r = applyDeterministicGuards(
      synth([item("approvals.engineering-design", { status: "gap", citations: [] })]),
      facts,
    );
    expect(r.items[0]!.gapClass).toBe("later_consultant_package");
  });

  test("an evidenced system rules out what it structurally precludes", () => {
    // Box gutters sit behind parapet capping. There is no eave, so
    // there is no soffit to line, and both the engine and an
    // independent auditor called the missing soffit a finish gap.
    const r = applyDeterministicGuards(
      synth([
        item("roofing.box-gutters", { status: "evidenced" }),
        item("external-walls.eaves-soffits", { status: "gap", citations: [] }),
      ]),
      mentioning("external-walls.eaves-soffits"),
    );
    const soffits = r.items.find(
      (i) => i.itemId === "external-walls.eaves-soffits",
    )!;
    expect(soffits.status).toBe("not_expected");
    expect(soffits.note).toContain("roofing.box-gutters");
    expect(r.corrections[0]!.rule).toBe("ruled-out-by-an-evidenced-system");
  });

  test("an exclusion does not fire when the documents show the item anyway", () => {
    // The separating case. If the drawings genuinely show eaves, the
    // rule must yield to them: the documents beat the inference.
    const r = applyDeterministicGuards(
      synth([
        item("roofing.box-gutters", { status: "evidenced" }),
        item("external-walls.eaves-soffits", { status: "evidenced" }),
      ]),
      empty2,
    );
    expect(
      r.items.find((i) => i.itemId === "external-walls.eaves-soffits")!.status,
    ).toBe("evidenced");
  });

  test("exclusion is directional, never symmetric", () => {
    // Box gutters exclude eaves. Eaves say nothing about box gutters,
    // and a symmetric relation would let a missing item delete a
    // present one.
    const r = applyDeterministicGuards(
      synth([
        item("external-walls.eaves-soffits", { status: "evidenced" }),
        item("roofing.box-gutters", { status: "gap", citations: [] }),
      ]),
      mentioning("roofing.box-gutters"),
    );
    expect(
      r.items.find((i) => i.itemId === "roofing.box-gutters")!.status,
    ).toBe("gap");
  });

  test("a chosen alternative settles its siblings", () => {
    const r = applyDeterministicGuards(
      synth([
        item("roofing.metal-roof", { status: "evidenced" }),
        item("roofing.tile-roof", { status: "gap", citations: [] }),
      ]),
      mentioning("roofing.tile-roof"),
    );
    const tile = r.items.find((i) => i.itemId === "roofing.tile-roof")!;
    expect(tile.status).toBe("not_expected");
    expect(tile.note).toContain("roofing.metal-roof");
    expect(r.corrections[0]!.rule).toBe("alternative-already-chosen");
  });

  test("a required group with NOTHING chosen or mentioned stays a gap", () => {
    // Every building stands on something. All four members silent is a
    // real hole, and the activation rule must not swallow it.
    const r = applyDeterministicGuards(
      synth([item("footings-slab.waffle-slab", { status: "gap", citations: [] })]),
      empty2,
    );
    expect(r.items[0]!.status).toBe("gap");
  });

  test("an optional group with nothing chosen is settled, not gapped", () => {
    // A tiled-throughout home answers the hard-floor question from the
    // tiling division. Asking for engineered timber as well is asking
    // about a decision nobody made.
    const r = applyDeterministicGuards(
      synth([item("flooring.engineered-timber", { status: "gap", citations: [] })]),
      empty2,
    );
    expect(r.items[0]!.status).toBe("not_expected");
  });
});
