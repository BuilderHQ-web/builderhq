/**
 * The deterministic half of extraction accuracy, pinned.
 *
 * These rules exist because the generative half proved unstable: the
 * same pack produced 76 gaps one run and 0 the next. The complement
 * and the coverage invariant make that class of failure impossible,
 * and the citation cross-check turns "no citation, no claim" from a
 * prompt aspiration into enforced arithmetic. Every rule here is
 * pinned both ways: what it must catch, and what it must never touch.
 */

import { describe, expect, test } from "vitest";

import {
  enforceCitationConsistency,
  enforceConflictIntegrity,
  residualPool,
  foldResiduals,
  coverageReport,
  dedupeRegister,
  SOFT_CITATION_PENALTY,
} from "./analysis";
import { itemsFor } from "@/modules/scope";
import {
  CHUNK_PAGES,
  ConflictSchema,
  OVERVIEW_MAX_CHARS,
  PageFindingSchema,
  ResidualVerdictSchema,
  SelectionEntrySchema,
  SynthesisSchemaForTest,
  planChunks,
  salvageArray,
  salvageIsFailure,
  type SynthesisDocumentInput,
} from "./pipeline";

const DOCS: SynthesisDocumentInput[] = [
  {
    documentId: "doc-a",
    filename: "arch.pdf",
    kind: "architectural",
    revision: "B",
    findings: {
      pages: [
        {
          page: 1,
          itemIds: ["framing.wall-frames", "roofing.tile-roof"],
          statedFigures: [],
          note: null,
        },
        {
          page: 2,
          itemIds: ["tiling.floor-tiles-supply"],
          statedFigures: [],
          note: null,
        },
      ],
    } as SynthesisDocumentInput["findings"],
  },
];

const entry = (
  itemId: string,
  citations: Array<{ documentId: string; page: number }>,
  confidence = 0.9,
) => ({
  itemId,
  status: "evidenced" as const,
  citations,
  note: null,
  confidence,
});

describe("enforceCitationConsistency", () => {
  test("a clean citation passes untouched", () => {
    const r = enforceCitationConsistency(
      [entry("framing.wall-frames", [{ documentId: "doc-a", page: 1 }])],
      DOCS,
    );
    expect(r.items[0]!.confidence).toBe(0.9);
    expect(r.hardDropped).toBe(0);
    expect(r.softFlagged).toBe(0);
  });

  test("a fabricated page is dropped hard", () => {
    const r = enforceCitationConsistency(
      [
        entry("framing.wall-frames", [
          { documentId: "doc-a", page: 1 },
          { documentId: "doc-a", page: 99 },
        ]),
      ],
      DOCS,
    );
    expect(r.items[0]!.citations).toHaveLength(1);
    expect(r.hardDropped).toBe(1);
  });

  test("a stage disagreement keeps the citation but pays the penalty", () => {
    // Page 2 exists, but extraction never listed wall frames on it.
    const r = enforceCitationConsistency(
      [entry("framing.wall-frames", [{ documentId: "doc-a", page: 2 }])],
      DOCS,
    );
    expect(r.items).toHaveLength(1);
    expect(r.softFlagged).toBe(1);
    // 0.9 × 0.7 = 0.63 — lands below the 0.65 ops floor, so a person
    // reviews the claim before the client sees it.
    expect(r.items[0]!.confidence).toBe(
      Math.round(0.9 * SOFT_CITATION_PENALTY * 100) / 100,
    );
    expect(r.items[0]!.confidence).toBeLessThan(0.65);
  });

  test("an entry with every citation fabricated leaves the selection", () => {
    const r = enforceCitationConsistency(
      [entry("framing.wall-frames", [{ documentId: "doc-b", page: 1 }])],
      DOCS,
    );
    expect(r.items).toHaveLength(0);
    expect(r.demoted).toEqual(["framing.wall-frames"]);
  });

  test("gap and not_expected entries pass through untouched", () => {
    const gap = {
      itemId: "appliances.oven",
      status: "gap" as const,
      citations: [],
      note: "No appliance schedule.",
      confidence: 0.8,
    };
    const r = enforceCitationConsistency([gap], DOCS);
    expect(r.items[0]).toEqual(gap);
  });
});

describe("residualPool and foldResiduals", () => {
  test("the complement is exact arithmetic over the type's pool", () => {
    const pool = itemsFor("multi_dwelling");
    const accounted = pool.slice(0, 100).map((i) => ({ itemId: i.id }));
    const residual = residualPool("multi_dwelling", accounted);
    expect(residual).toHaveLength(pool.length - 100);
    const accountedSet = new Set(accounted.map((a) => a.itemId));
    expect(residual.every((id) => !accountedSet.has(id))).toBe(true);
  });

  test("classifier verdicts fold in; silence defaults to a gap", () => {
    const folded = foldResiduals(
      ["appliances.oven", "landscaping.turf"],
      new Map([
        [
          "landscaping.turf",
          { verdict: "not_expected" as const, note: "No landscaping shown." },
        ],
      ]),
    );
    const byId = new Map(folded.map((f) => [f.itemId, f]));
    expect(byId.get("landscaping.turf")!.status).toBe("not_expected");
    // The unanswered residual can never vanish: it becomes a gap
    // carrying the Standard's own plain sentence.
    const oven = byId.get("appliances.oven")!;
    expect(oven.status).toBe("gap");
    expect(oven.note).toBeTruthy();
    expect(oven.confidence).toBeLessThan(0.65);
  });
});

describe("coverageReport — the invariant", () => {
  test("full coverage reports clean", () => {
    const items = itemsFor("multi_dwelling").map((i) => ({ itemId: i.id }));
    const r = coverageReport("multi_dwelling", items);
    expect(r.missing).toEqual([]);
    expect(r.strays).toEqual([]);
    expect(r.covered).toBe(r.poolSize);
  });

  test("a missing item and a stray id are both named", () => {
    const pool = itemsFor("multi_dwelling");
    const items = pool.slice(1).map((i) => ({ itemId: i.id }));
    items.push({ itemId: "no-such.item" });
    const r = coverageReport("multi_dwelling", items);
    expect(r.missing).toEqual([pool[0]!.id]);
    expect(r.strays).toEqual(["no-such.item"]);
  });

  test("the pipeline's guarantee: enforced + folded always covers", () => {
    // Whatever the model does — here, it accounts for 40 items and
    // fabricates one — enforcement plus the complement always
    // reconstructs exact coverage.
    const pool = itemsFor("single_dwelling");
    const modelItems = pool.slice(0, 40).map((i) => ({
      itemId: i.id,
      status: "evidenced" as const,
      citations: [{ documentId: "doc-a", page: 1 }],
      note: null,
      confidence: 0.9,
    }));
    const enforced = enforceCitationConsistency(modelItems, DOCS);
    const residual = residualPool("single_dwelling", enforced.items);
    const final = [...enforced.items, ...foldResiduals(residual, new Map())];
    const r = coverageReport("single_dwelling", final);
    expect(r.missing).toEqual([]);
    expect(r.strays).toEqual([]);
  });
});

describe("dedupeRegister", () => {
  const doc = (documentId: string, title: string | null, pages: number | null) => ({
    documentId,
    kind: "architectural",
    docTitle: title,
    pageCount: pages,
  });

  test("an identical re-upload synthesises once", () => {
    const r = dedupeRegister([
      doc("a", "Working Drawings", 6),
      doc("b", "working drawings", 6),
    ]);
    expect(r.keep.map((d) => d.documentId)).toEqual(["a"]);
    expect(r.duplicates.map((d) => d.documentId)).toEqual(["b"]);
  });

  test("same title, different page count is NOT a duplicate", () => {
    const r = dedupeRegister([
      doc("a", "Working Drawings", 6),
      doc("b", "Working Drawings", 8),
    ]);
    expect(r.duplicates).toEqual([]);
  });

  test("unclassified documents are never deduped", () => {
    const r = dedupeRegister([doc("a", null, 6), doc("b", null, 6)]);
    expect(r.keep).toHaveLength(2);
  });
});

/* ── the overview must never sink a run ─────────────────────────────── */

describe("overview resilience", () => {
  test("a long summary is clipped at a sentence, not rejected", () => {
    const long =
      "A double storey dwelling with a basement garage. " .repeat(30);
    const parsed = SynthesisSchemaForTest.safeParse({
      overview: { summary: long, storeys: 2 },
      items: [],
      conflicts: [],
    });
    expect(parsed.success).toBe(true);
    const summary = parsed.success ? parsed.data.overview?.summary ?? "" : "";
    expect(summary.length).toBeLessThanOrEqual(OVERVIEW_MAX_CHARS);
    // Clipped at a sentence boundary, so it reads as finished prose.
    expect(summary.endsWith(".")).toBe(true);
    expect(parsed.success && parsed.data.overview?.storeys).toBe(2);
  });

  test("a malformed overview degrades to null and keeps the selection", () => {
    // Two real packages failed on this: one bad prose field discarded a
    // correct read of two hundred scope lines.
    const parsed = SynthesisSchemaForTest.safeParse({
      overview: { summary: "too short", storeys: 99_999 },
      items: [
        {
          itemId: "framing.wall-frames",
          status: "evidenced",
          citations: [{ documentId: "d", page: 1 }],
          note: null,
          confidence: 0.9,
        },
      ],
      conflicts: [],
    });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.overview).toBeNull();
    expect(parsed.success && parsed.data.items).toHaveLength(1);
  });
});

/* ── conflicts obey the same law as evidence ────────────────────────── */

describe("enforceConflictIntegrity", () => {
  const conflict = (
    citations: Array<{ documentId: string; page: number }>,
    severity: "attention" | "high" = "high",
  ) => ({
    summary: "The plan and the schedule disagree; confirm which governs.",
    citations,
    severity,
  });

  test("a conflict citing real pages passes untouched", () => {
    const r = enforceConflictIntegrity(
      [conflict([{ documentId: "doc-a", page: 1 }, { documentId: "doc-a", page: 2 }])],
      DOCS,
    );
    expect(r.conflicts).toHaveLength(1);
    expect(r.conflicts[0]!.citations).toHaveLength(2);
    expect(r.droppedCitations).toBe(0);
    expect(r.droppedConflicts).toBe(0);
  });

  test("a fabricated page drops the citation, the rest survive", () => {
    // Extraction emits an entry for EVERY page, so page 40 of a
    // two-page document does not exist anywhere in its findings.
    const r = enforceConflictIntegrity(
      [conflict([{ documentId: "doc-a", page: 40 }, { documentId: "doc-a", page: 2 }])],
      DOCS,
    );
    expect(r.conflicts).toHaveLength(1);
    expect(r.conflicts[0]!.citations).toEqual([{ documentId: "doc-a", page: 2 }]);
    expect(r.droppedCitations).toBe(1);
  });

  test("a conflict that loses every citation drops entirely", () => {
    const r = enforceConflictIntegrity(
      [conflict([{ documentId: "doc-a", page: 40 }, { documentId: "ghost", page: 1 }])],
      DOCS,
    );
    expect(r.conflicts).toHaveLength(0);
    expect(r.droppedCitations).toBe(2);
    expect(r.droppedConflicts).toBe(1);
  });

  test("an uncited conflict is an uncited claim and drops", () => {
    const r = enforceConflictIntegrity([conflict([])], DOCS);
    expect(r.conflicts).toHaveLength(0);
    expect(r.droppedConflicts).toBe(1);
  });
});

/* ── schema salvage: the overview lesson, generalised ───────────────── */

describe("schema salvage", () => {
  test("one malformed element drops with a count; the rest parse", () => {
    const raw = [
      { itemId: "a", status: "evidenced", citations: [], note: null, confidence: 0.9 },
      { itemId: "b", status: "no_such_status", citations: [], note: null, confidence: 0.9 },
      { itemId: "c", status: "gap", citations: [], note: null, confidence: 0.9 },
    ];
    const r = salvageArray(raw, SelectionEntrySchema, 400);
    expect(r.values.map((v) => v.itemId)).toEqual(["a", "c"]);
    expect(r.salvaged).toBe(1);
  });

  test("a conflict summary over the ceiling clips at a sentence, never rejects", () => {
    // The overview bug's sibling: before this rule, one long conflict
    // summary discarded the entire synthesis.
    const long = "The stormwater layout disagrees with the civil design. ".repeat(20);
    const p = ConflictSchema.safeParse({
      summary: long,
      citations: [{ documentId: "d", page: 1 }],
      severity: "high",
    });
    expect(p.success).toBe(true);
    if (p.success) {
      expect(p.data.summary.length).toBeLessThanOrEqual(400);
      expect(p.data.summary.endsWith(".")).toBe(true);
    }
  });

  test("long notes and oversized arrays clip and slice, never reject", () => {
    const p = PageFindingSchema.safeParse({
      page: 3,
      itemIds: Array.from({ length: 80 }, (_, i) => `id-${i}`),
      statedFigures: [{ label: "x".repeat(500), value: "y".repeat(500), itemId: null }],
      note: "n".repeat(2000),
    });
    expect(p.success).toBe(true);
    if (p.success) {
      expect(p.data.itemIds).toHaveLength(60);
      expect(p.data.statedFigures[0]!.label.length).toBe(200);
      expect(p.data.note!.length).toBe(600);
    }
  });

  test("a residual verdict with a long note clips and keeps the verdict", () => {
    const p = ResidualVerdictSchema.safeParse({
      itemId: "painting.internal",
      verdict: "gap",
      note: "z".repeat(900),
    });
    expect(p.success).toBe(true);
    if (p.success) expect(p.data.note!.length).toBe(300);
  });

  test("majority-malformed is a failure, a stray element is not", () => {
    expect(salvageIsFailure(199, 1)).toBe(false);
    expect(salvageIsFailure(10, 2)).toBe(false);
    expect(salvageIsFailure(2, 40)).toBe(true);
    // Tiny arrays never fail on counts alone.
    expect(salvageIsFailure(1, 2)).toBe(false);
  });

  test("non-array input salvages to empty", () => {
    expect(salvageArray("garbage", SelectionEntrySchema, 10)).toEqual({
      values: [],
      salvaged: 1,
    });
    expect(salvageArray(undefined, SelectionEntrySchema, 10)).toEqual({
      values: [],
      salvaged: 0,
    });
  });
});

/* ── chunk plan: long documents extract in ranges ───────────────────── */

describe("planChunks", () => {
  test("a document inside the limit is one whole-document call", () => {
    expect(planChunks(50)).toEqual([{ from: 1, to: 50 }]);
    expect(planChunks(CHUNK_PAGES)).toEqual([{ from: 1, to: CHUNK_PAGES }]);
  });

  test("a long specification splits into covering, non-overlapping ranges", () => {
    const ranges = planChunks(190);
    expect(ranges).toEqual([
      { from: 1, to: 80 },
      { from: 81, to: 160 },
      { from: 161, to: 190 },
    ]);
    // Every page covered exactly once.
    const pages = ranges.flatMap((r) =>
      Array.from({ length: r.to - r.from + 1 }, (_, i) => r.from + i),
    );
    expect(pages).toHaveLength(190);
    expect(new Set(pages).size).toBe(190);
  });
});
