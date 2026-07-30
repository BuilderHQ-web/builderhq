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
  residualPool,
  foldResiduals,
  coverageReport,
  dedupeRegister,
  SOFT_CITATION_PENALTY,
} from "./analysis";
import { itemsFor } from "@/modules/scope";
import type { SynthesisDocumentInput } from "./pipeline";

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
