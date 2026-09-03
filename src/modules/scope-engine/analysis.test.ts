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
  enforceSourceAuthority,
  enforceNoteGrounding,
  isPreliminaryDocument,
  residualPool,
  foldResiduals,
  coverageReport,
  dedupeRegister,
  baselineFindings,
  namedMissingDocuments,
  captureHygiene,
  packReadiness,
  scopeReadyTally,
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
          offStandard: [],
          docRefs: [],
          note: null,
        },
        {
          page: 2,
          itemIds: ["tiling.floor-tiles-supply"],
          statedFigures: [],
          offStandard: [],
          docRefs: [],
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
  depth: null,
  remaining: null,
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
      depth: null,
      remaining: null,
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
      depth: null,
      remaining: null,
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

/* ── the baseline check: dates and names, cross-examined in code ────── */

describe("baselineFindings", () => {
  const doc = (
    documentId: string,
    kind: string,
    issueDate: string | null,
    clientName: string | null = null,
    revision: string | null = null,
  ) => ({ documentId, kind, docTitle: `${kind} set`, revision, issueDate, clientName });

  test("the Wheeler pattern: stale reports, ancient survey, permit question", () => {
    const findings = baselineFindings([
      doc("l", "survey", "2018-09-24"),
      doc("g", "soil", "2022-08-20"),
      doc("e", "energy", "2022-09-27"),
      doc("a", "architectural", "2023-06-01"),
      doc("s", "structural", "2025-10-29"),
    ]);
    // Soil and energy pre-date the latest design by years; the survey
    // is ancient; structural post-dates architectural by >12 months.
    expect(findings.filter((f) => f.severity === "attention").length).toBeGreaterThanOrEqual(3);
    const permit = findings.find((f) => f.severity === "high");
    expect(permit?.summary).toContain("post-dates the architectural set");
    expect(permit?.summary).toContain("building permit");
  });

  test("a coordinated pack raises nothing", () => {
    const findings = baselineFindings([
      doc("a", "architectural", "2026-03-01"),
      doc("s", "structural", "2026-04-15"),
      doc("g", "soil", "2026-01-10"),
      doc("e", "energy", "2026-02-20"),
    ]);
    expect(findings).toEqual([]);
  });

  test("no dates, no findings — conservative by construction", () => {
    expect(
      baselineFindings([doc("a", "architectural", null), doc("s", "structural", null)]),
    ).toEqual([]);
  });

  test("different client names across title blocks are flagged once", () => {
    const findings = baselineFindings([
      doc("a", "architectural", null, "Billy Residence"),
      doc("s", "structural", null, "Chok & Co Pty Ltd"),
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.summary).toContain("Billy Residence");
    expect(findings[0]!.summary).toContain("Chok & Co Pty Ltd");
  });
});

/* ── the pack's own missing-document register ───────────────────────── */

describe("namedMissingDocuments", () => {
  const withRefs = (documentId: string, filename: string, refs: string[][]) => ({
    documentId,
    filename,
    docTitle: null,
    findings: {
      pages: refs.map((r, i) => ({
        page: i + 1,
        itemIds: [],
        statedFigures: [],
        offStandard: [],
        docRefs: r,
        note: null,
      })),
    } as never,
  });

  test("references to absent documents surface; supplied ones resolve", () => {
    const out = namedMissingDocuments([
      withRefs("c", "civil-drainage.pdf", [
        ["Sheet 2 of 5", "refer plan 11637S-2"],
      ]),
      withRefs("l", "land-survey-11637S-1.pdf", [[]]),
    ]);
    const refs = out.map((r) => r.ref);
    expect(refs).toContain("Sheet 2 of 5");
    expect(refs).toContain("refer plan 11637S-2");
  });

  test("a reference matching a supplied filename does not surface", () => {
    const out = namedMissingDocuments([
      withRefs("g", "geotech.pdf", [["refer to civil-drainage layout"]]),
      withRefs("c", "civil-drainage.pdf", [[]]),
    ]);
    expect(out).toEqual([]);
  });

  test("the same reference from two pages merges with both citations", () => {
    const out = namedMissingDocuments([
      withRefs("g", "geotech.pdf", [["Soil Test 01876"], ["Soil Test 01876"]]),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]!.citations).toHaveLength(2);
  });
});

/* ── capture hygiene: the lane cannot duplicate the Standard ────────── */

describe("captureHygiene", () => {
  const capture = (label: string) => ({
    label,
    divisionId: null,
    citations: [],
    note: null,
    confidence: 0.8,
  });

  test("genuinely unnamed work is kept", () => {
    const r = captureHygiene([capture("Wine cellar conditioning plant")]);
    expect(r.kept).toHaveLength(1);
    expect(r.mappedAway).toEqual([]);
  });

  test("a label the Standard already names maps away", () => {
    const r = captureHygiene([capture("Residential lift")]);
    expect(r.kept).toEqual([]);
    expect(r.mappedAway[0]!.matchedItemId).toBe("stairs.residential-lift");
  });

  test("alias matches map away too", () => {
    const r = captureHygiene([capture("Pool heating")]);
    expect(r.kept).toEqual([]);
    expect(r.mappedAway[0]!.matchedItemId).toBe("landscaping.pool-plant");
  });
});

/* ── the readiness verdict ──────────────────────────────────────────── */

describe("packReadiness", () => {
  const ev = (depth: "full" | "partial" | null = "full") => ({
    status: "evidenced",
    depth,
  });

  test("a clean pack is fixed-price ready", () => {
    const r = packReadiness({
      items: [ev(), ev(), ev()],
      conflicts: [{ severity: "attention" }],
      namedMissingCount: 1,
      registerKinds: ["architectural", "structural"],
      projectType: "single_dwelling",
    });
    expect(r.verdict).toBe("fixed_price");
  });

  test("a high conflict alone forces budget-only", () => {
    const r = packReadiness({
      items: [ev()],
      conflicts: [{ severity: "high" }],
      namedMissingCount: 0,
      registerKinds: ["architectural", "structural"],
      projectType: "single_dwelling",
    });
    expect(r.verdict).toBe("budget_only");
    expect(r.factors).toHaveLength(1);
  });

  test("a new build without structural engineering is never fixed-price", () => {
    const r = packReadiness({
      items: [ev()],
      conflicts: [],
      namedMissingCount: 0,
      registerKinds: ["architectural"],
      projectType: "single_dwelling",
    });
    expect(r.verdict).toBe("budget_only");
  });

  test("a renovation without structural is not penalised for it", () => {
    const r = packReadiness({
      items: [ev()],
      conflicts: [],
      namedMissingCount: 0,
      registerKinds: ["architectural"],
      projectType: "renovation",
    });
    expect(r.verdict).toBe("fixed_price");
  });

  test("heavy partial share plus missing refs tips the verdict", () => {
    const r = packReadiness({
      items: [ev("partial"), ev("partial"), ev(), ev()],
      conflicts: [],
      namedMissingCount: 5,
      registerKinds: ["architectural", "structural"],
      projectType: "single_dwelling",
    });
    expect(r.verdict).toBe("budget_only");
    expect(r.factors).toHaveLength(2);
  });
});

describe("namedMissingDocuments — noise filters", () => {
  const doc = (
    documentId: string,
    filename: string,
    kind: string,
    refs: string[],
  ) => ({
    documentId,
    filename,
    docTitle: null,
    kind,
    findings: {
      pages: [
        {
          page: 1,
          itemIds: [],
          statedFigures: [],
          offStandard: [],
          docRefs: refs,
          note: null,
        },
      ],
    } as never,
  });

  test("generic kind names resolve against supplied kinds", () => {
    const out = namedMissingDocuments([
      doc("g", "geo.pdf", "soil", [
        "STRUCTURAL ENGINEERING DRAWINGS",
        "ARCHITECTURAL PLANS",
        "LANDSCAPING PLANS",
      ]),
      doc("s", "1341-struct-c4.pdf", "structural", []),
      doc("a", "wheeler-arch.pdf", "architectural", []),
    ]);
    // Structural and architectural are supplied; landscaping is not.
    expect(out.map((r) => r.ref)).toEqual(["LANDSCAPING PLANS"]);
  });

  test("internal sheet cross-references never surface", () => {
    const out = namedMissingDocuments([
      doc("s", "struct.pdf", "structural", [
        "REFER TO DETAIL PAGE S27",
        "E1 / S02",
        "SHEET S14",
        // Carries an S-code whose discipline the pack supplies, so it
        // resolves rather than flagging — the "Sheet 2/5" count is
        // what signals the incomplete set, without false alarms.
        "1341-S2 BASEMENT DRAINAGE PLAN",
      ]),
    ]);
    expect(out).toEqual([]);
  });

  test("the Wheeler screenshot: every internal ref dies, the real ones live", () => {
    // The exact reference list Aryan flagged, run against the exact
    // register: structural, architectural, civil, soil supplied.
    const out = namedMissingDocuments([
      doc("s", "1341 Struct Rev_C4.pdf", "structural", [
        "REFER CIVIL PLANS FOR SPECIFICATION",
        "REFER ON SHEET S16",
        "REFER ON SHEET S18",
        "REFER TO SUSPENDED SLAB PLAN ON S31",
        "REFER FOOTING PLAN ON S10",
        "REFER POOL PLAN ON S08",
        "REFER TO S29 FOR SPECIFICATIONS",
        "REFER TO FIRST FLOOR FRAMING PLAN ON SHEET NO. S10",
        "REFER TO PILING PLAN",
        "G.04 / S22",
        "E1 / S02",
        "010477",
      ]),
      doc("c", "1341 Civil Rev_C1.pdf", "civil", [
        "Sheet 2/5",
        "LANDSCAPING PLANS",
        "MORELAND CITY COUNCIL STANDARDS AND REQUIREMENTS",
      ]),
      doc("a", "34 Wheeler Arch.pdf", "architectural", [
        "Refer to Architectural Working Drawings",
        "STRUCTURAL ENGINEERING DRAWINGS",
      ]),
      doc("g", "geo.pdf", "soil", ["Soil Test Melbourne"]),
    ]);
    expect(out.map((r) => r.ref).sort()).toEqual([
      "010477",
      "LANDSCAPING PLANS",
      "Sheet 2/5",
      "Soil Test Melbourne",
    ]);
  });

  test("a sheet code for a discipline the pack lacks still surfaces", () => {
    const out = namedMissingDocuments([
      doc("a", "arch.pdf", "architectural", ["L01 LANDSCAPE PLAN"]),
    ]);
    expect(out.map((r) => r.ref)).toEqual(["L01 LANDSCAPE PLAN"]);
  });
});

/* ── baseline: preliminary issues and duplicate sets ────────────────── */

describe("baselineFindings — preliminary and duplicate sets", () => {
  const doc = (
    documentId: string,
    kind: string,
    docTitle: string,
    revision: string | null = null,
    issueDate: string | null = null,
  ) => ({ documentId, kind, docTitle, revision, issueDate, clientName: null });

  test("a P-revision civil sheet is a high finding", () => {
    const findings = baselineFindings([
      doc("c", "civil", "Drainage plan layout", "P2"),
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe("high");
    expect(findings[0]!.summary).toContain("revision P2");
  });

  test("a design development title is caught even with a clean revision", () => {
    const findings = baselineFindings([
      doc("a", "architectural", "REV C-E DESIGN DEVELOPMENT WHEELER ST", "E"),
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe("high");
  });

  test("two architectural sets raise the which-governs question", () => {
    const findings = baselineFindings([
      doc("a1", "architectural", "Stamped construction set", "1", "2023-06-01"),
      doc("a2", "architectural", "Design set", "C", "2022-11-01"),
    ]);
    const dup = findings.find((f) => f.summary.includes("architectural sets"));
    expect(dup).toBeTruthy();
    expect(dup!.citations).toHaveLength(2);
  });

  test("a construction-issue pack raises neither", () => {
    const findings = baselineFindings([
      doc("a", "architectural", "Working drawings", "4", "2026-03-01"),
      doc("s", "structural", "Structural set", "C4", "2026-04-01"),
    ]);
    expect(findings).toEqual([]);
  });
});

/* ── capture hygiene matches whole words, never substrings ──────────── */

describe("captureHygiene — word boundaries", () => {
  const capture = (label: string) => ({
    label,
    divisionId: null,
    citations: [],
    note: null,
    confidence: 0.8,
  });

  test("'spa' the alias cannot eat 'spatial' the word", () => {
    const r = captureHygiene([capture("Spatial audio cinema package")]);
    expect(r.kept).toHaveLength(1);
    expect(r.kept[0]!.nearestItemId).toBeUndefined();
  });

  test("a multi-word alias phrase still maps away", () => {
    const r = captureHygiene([capture("Fibreglass pool installation")]);
    expect(r.kept).toEqual([]);
    expect(r.mappedAway[0]!.matchedItemId).toBe("landscaping.pool");
  });

  test("a single word brushing a long label annotates, never drops", () => {
    // "island" must not eat an outdoor kitchen: the capture survives
    // carrying the nearest Standard item as a reviewer's hint.
    const r = captureHygiene([
      capture("Outdoor kitchen island and alfresco furniture"),
    ]);
    expect(r.mappedAway).toEqual([]);
    expect(r.kept).toHaveLength(1);
    expect(r.kept[0]!.nearestItemId).toBeTruthy();
  });
});

describe("namedMissingDocuments — index pages and bare markers", () => {
  const doc = (
    documentId: string,
    filename: string,
    kind: string,
    pages: string[][],
  ) => ({
    documentId,
    filename,
    docTitle: null,
    kind,
    findings: {
      pages: pages.map((refs, i) => ({
        page: i + 1,
        itemIds: [],
        statedFigures: [],
        offStandard: [],
        docRefs: refs,
        note: null,
      })),
    } as never,
  });

  test("a drawing set's own sheet index never flags its own sheets", () => {
    const out = namedMissingDocuments([
      doc("dd", "design-development.pdf", "other", [
        [
          "MB01 MOOD BOARD & MATERIALS",
          "FP01 SURFACE & FINISHES PLAN",
          "LP01 LANDSCAPE PLAN - BASEMENT FLOOR",
          "LP02 LANDSCAPE PLAN - GROUND FLOOR",
          "SE01 SECTIONS SHEET 1 OF 3",
          "PP01 PLANTING PALETTE",
          "Planning Permit MPS/2021/813",
        ],
      ]),
    ]);
    // Code-led index rows die; the genuinely external reference lives.
    expect(out.map((r) => r.ref)).toEqual(["Planning Permit MPS/2021/813"]);
  });

  test("digit-led bare markers die like letter-led ones", () => {
    const out = namedMissingDocuments([
      doc("s", "struct.pdf", "structural", [["02 SE01", "09 SE03"]]),
    ]);
    expect(out).toEqual([]);
  });

  test("a lone code-led ref off an index page still flags", () => {
    const out = namedMissingDocuments([
      doc("a", "arch.pdf", "architectural", [["L01 LANDSCAPE PLAN"]]),
    ]);
    expect(out.map((r) => r.ref)).toEqual(["L01 LANDSCAPE PLAN"]);
  });

  test("guides, practice notes and job-number restatements stay out", () => {
    const out = namedMissingDocuments([
      doc("g", "geo.pdf", "soil", [
        [
          "Cement and Concrete Association Note TN 61",
          "Foundation & Footings Society Practice Note 5",
          "Guide to home owners on foundation maintenance, BTF 18 (CSIRO)",
          "Report - 21 Pages",
          "JOB NUMBER: 01876",
          "PROJECT NO.: 01876",
        ],
      ]),
    ]);
    expect(out.map((r) => r.ref)).toEqual(["JOB NUMBER: 01876"]);
  });

  test("abbreviated supplied-kind references resolve", () => {
    const out = namedMissingDocuments([
      doc("s", "struct.pdf", "structural", [
        [
          "Refer to Arch's drawing",
          "Eng. Drawings",
          "Roof Plan",
          "Geotechnical Engineer's Report",
          "External Finishes Schedule",
        ],
      ]),
      doc("a", "arch.pdf", "architectural", [[]]),
      doc("g", "geo.pdf", "soil", [[]]),
    ]);
    expect(out.map((r) => r.ref)).toEqual(["External Finishes Schedule"]);
  });
});

/* ── source authority: the drawn documents govern materials ─────────── */

describe("enforceSourceAuthority", () => {
  const docs = [
    { documentId: "arch", kind: "architectural" },
    { documentId: "struct", kind: "structural" },
    { documentId: "energy", kind: "energy" },
    { documentId: "geo", kind: "soil" },
    { documentId: "dd", kind: "other" },
  ];
  const item = (
    itemId: string,
    citations: Array<{ documentId: string; page: number }>,
  ) => ({
    itemId,
    status: "evidenced" as const,
    citations,
    note: "x",
    depth: "full" as const,
    remaining: null,
    confidence: 0.8,
  });

  test("the Wheeler brick: a material claim sourced only from the energy report demotes", () => {
    const r = enforceSourceAuthority(
      [item("external-walls.brick-veneer", [{ documentId: "energy", page: 13 }])],
      docs,
      new Set(),
    );
    expect(r.items).toHaveLength(0);
    expect(r.demoted).toEqual(["external-walls.brick-veneer"]);
  });

  test("drawn evidence keeps the claim; the report citation is stripped as noise", () => {
    const r = enforceSourceAuthority(
      [
        item("external-walls.fc-cladding", [
          { documentId: "arch", page: 16 },
          { documentId: "energy", page: 7 },
        ]),
      ],
      docs,
      new Set(),
    );
    expect(r.items[0]!.citations).toEqual([{ documentId: "arch", page: 16 }]);
    expect(r.strippedCitations).toBe(1);
    expect(r.demoted).toEqual([]);
  });

  test("the geotechnical report keeps establishing ground facts untouched", () => {
    const r = enforceSourceAuthority(
      [item("earthworks.dewatering", [{ documentId: "geo", page: 3 }])],
      docs,
      new Set(),
    );
    expect(r.items).toHaveLength(1);
    expect(r.items[0]!.citations).toHaveLength(1);
    expect(r.demoted).toEqual([]);
  });

  test("the energy report keeps establishing insulation untouched", () => {
    const r = enforceSourceAuthority(
      [item("insulation.ceiling-batts", [{ documentId: "energy", page: 7 }])],
      docs,
      new Set(),
    );
    expect(r.items).toHaveLength(1);
    expect(r.demoted).toEqual([]);
  });

  test("the Wheeler feature stone: a preliminary-only source grades partial with the reason", () => {
    const r = enforceSourceAuthority(
      [item("external-walls.feature-stone", [{ documentId: "dd", page: 2 }])],
      docs,
      new Set(["dd"]),
    );
    expect(r.items[0]!.depth).toBe("partial");
    expect(r.items[0]!.remaining).toContain("preliminary");
    expect(r.prelimOnly).toEqual(["external-walls.feature-stone"]);
  });

  test("gaps and non-material divisions pass through untouched", () => {
    const gap = {
      itemId: "external-walls.brick-veneer",
      status: "gap" as const,
      citations: [],
      note: null,
      depth: null,
      remaining: null,
      confidence: 0.5,
    };
    const r = enforceSourceAuthority([gap], docs, new Set());
    expect(r.items[0]).toEqual(gap);
  });
});

/* ── note grounding: notes are local to their citations ─────────────── */

describe("enforceNoteGrounding", () => {
  const page = (page: number, note: string | null, figures: Array<[string, string]> = []) => ({
    page,
    itemIds: [],
    statedFigures: figures.map(([label, value]) => ({ label, value, itemId: null })),
    offStandard: [],
    docRefs: [],
    note,
  });
  const docsWith = (archNotes: Array<ReturnType<typeof page>>, ddNotes: Array<ReturnType<typeof page>>) =>
    [
      {
        documentId: "arch",
        filename: "arch.pdf",
        kind: "architectural",
        revision: null,
        findings: { pages: archNotes } as never,
      },
      {
        documentId: "dd",
        filename: "dd.pdf",
        kind: "other",
        revision: null,
        findings: { pages: ddNotes } as never,
      },
    ] as never[];

  test("the bluestone case: a term imported from an uncited document flags the line", () => {
    const docs = docsWith(
      [page(27, "External staircase and internal staircase details.")],
      [page(2, "Bluestone pavers to sauna area per landscape palette.")],
    ) as never;
    const r = enforceNoteGrounding(
      [
        {
          itemId: "stairs.internal-staircase",
          status: "evidenced",
          citations: [{ documentId: "arch", page: 27 }],
          note: "Internal staircase with bluestone treads.",
          depth: "full",
          remaining: null,
          confidence: 0.8,
        },
      ],
      docs,
    );
    expect(r.flagged).toHaveLength(1);
    expect(r.flagged[0]!.term).toBe("bluestone");
    expect(r.flagged[0]!.fromDocumentId).toBe("dd");
    const line = r.items[0]!;
    expect(line.depth).toBe("partial");
    expect(line.remaining).toContain("bluestone");
    // 0.8 × 0.8 = 0.64 — below the ops floor, in front of a person.
    expect(line.confidence).toBeLessThan(0.65);
  });

  test("a note grounded in its own cited pages passes untouched", () => {
    const docs = docsWith(
      [page(43, "Internal staircase elevations, mild steel handrail in clear lacquer.")],
      [page(2, "Bluestone pavers to sauna area.")],
    ) as never;
    const r = enforceNoteGrounding(
      [
        {
          itemId: "stairs.internal-staircase",
          status: "evidenced",
          citations: [{ documentId: "arch", page: 43 }],
          note: "Internal staircase with mild steel handrail in clear lacquer.",
          depth: "full",
          remaining: null,
          confidence: 0.8,
        },
      ],
      docs,
    );
    expect(r.flagged).toEqual([]);
    expect(r.items[0]!.depth).toBe("full");
    expect(r.items[0]!.confidence).toBe(0.8);
  });

  test("a paraphrase that exists nowhere else is never punished", () => {
    // "generously" appears in no document at all — style, not import.
    const docs = docsWith(
      [page(10, "Kitchen cabinetry run with overhead cupboards.")],
      [page(2, "Unrelated content.")],
    ) as never;
    const r = enforceNoteGrounding(
      [
        {
          itemId: "joinery.kitchen-cabinetry",
          status: "evidenced",
          citations: [{ documentId: "arch", page: 10 }],
          note: "Kitchen cabinetry generously proportioned with overhead cupboards.",
          depth: "full",
          remaining: null,
          confidence: 0.9,
        },
      ],
      docs,
    );
    expect(r.flagged).toEqual([]);
    expect(r.items[0]!.confidence).toBe(0.9);
  });
});

describe("isPreliminaryDocument", () => {
  test("P-revisions, prelim titles and DD titles all mark", () => {
    expect(isPreliminaryDocument("P2", "Drainage plan")).toBe(true);
    expect(isPreliminaryDocument("1", "PRELIMINARY ISSUE — working set")).toBe(true);
    expect(isPreliminaryDocument("E", "REV C-E DESIGN DEVELOPMENT")).toBe(true);
    expect(isPreliminaryDocument("C4", "Structural set")).toBe(false);
    expect(isPreliminaryDocument(null, null)).toBe(false);
  });
});

/* ── the living vocabulary ──────────────────────────────────────────── */

describe("captureHygiene — the living vocabulary", () => {
  const capture = (label: string) => ({
    label,
    divisionId: null,
    citations: [{ documentId: "d", page: 1 }],
    note: "seen on plans",
    confidence: 0.8,
  });
  const SAUNA = {
    id: "ext.landscaping.sauna",
    label: "Sauna",
    aliases: ["sauna cabin", "infrared sauna"],
  };

  test("a repeat discovery auto-maps to the learned key, no ops click", () => {
    const r = captureHygiene([capture("Infrared sauna room")], [SAUNA]);
    expect(r.kept).toEqual([]);
    expect(r.autoMapped).toHaveLength(1);
    expect(r.autoMapped[0]!.extensionId).toBe("ext.landscaping.sauna");
  });

  test("unlearned work still lands in the capture lane", () => {
    const r = captureHygiene([capture("Observatory dome")], [SAUNA]);
    expect(r.autoMapped).toEqual([]);
    expect(r.kept).toHaveLength(1);
  });
});

describe("residualPool and coverage with core extensions", () => {
  test("a core learned item joins the complement", () => {
    const pool = residualPool("single_dwelling", [], ["ext.landscaping.sauna"]);
    expect(pool).toContain("ext.landscaping.sauna");
  });

  test("coverage counts core extensions and never strays known ones", () => {
    const items = [
      ...itemsFor("single_dwelling").map((i) => ({ itemId: i.id })),
      { itemId: "ext.landscaping.sauna" },
      { itemId: "ext.joinery.wine-cellar" },
    ];
    const r = coverageReport("single_dwelling", items, {
      corePoolExtensionIds: ["ext.landscaping.sauna"],
      knownExtensionIds: ["ext.landscaping.sauna", "ext.joinery.wine-cellar"],
    });
    expect(r.missing).toEqual([]);
    expect(r.strays).toEqual([]);
    expect(r.poolSize).toBe(itemsFor("single_dwelling").length + 1);
  });

  test("folded core-extension gaps carry the learned plain sentence", () => {
    const folded = foldResiduals(
      ["ext.landscaping.sauna"],
      new Map(),
      new Map([["ext.landscaping.sauna", "A sauna room and its services."]]),
    );
    expect(folded[0]!.note).toBe("A sauna room and its services.");
  });
});

describe("captureHygiene — duplicate discoveries of one learned item", () => {
  const capture = (label: string, page: number) => ({
    label,
    divisionId: null,
    citations: [{ documentId: "d", page }],
    note: null,
    confidence: 0.8,
  });

  test("two captures matching one extension both auto-map; the caller merges to one line", () => {
    // The run-bricking case: (runId, itemId) is unique, so the service
    // MUST collapse these to a single selection line. This pins the
    // shape the service dedupes over.
    const SAUNA = {
      id: "ext.landscaping.sauna",
      label: "Sauna",
      aliases: ["sauna cabin", "infrared sauna"],
    };
    const r = captureHygiene(
      [capture("Sauna cabin to rear", 3), capture("Infrared sauna", 12)],
      [SAUNA],
    );
    expect(r.autoMapped).toHaveLength(2);
    expect(new Set(r.autoMapped.map((m) => m.extensionId)).size).toBe(1);
  });
});

describe("enforceNoteGrounding — plurals and sparse pages never punish", () => {
  const page = (page: number, note: string | null) => ({
    page,
    itemIds: [],
    statedFigures: [],
    offStandard: [],
    docRefs: [],
    note,
  });
  const docs = [
    {
      documentId: "arch",
      filename: "arch.pdf",
      kind: "architectural",
      revision: null,
      findings: {
        pages: [
          page(5, "External stairs with three concrete treads and steel stringers to the entry."),
          page(9, null),
        ],
      } as never,
    },
    {
      documentId: "other",
      filename: "o.pdf",
      kind: "other",
      revision: null,
      findings: { pages: [page(1, "Bluestone paving and tread details for the pool surround.")] } as never,
    },
  ] as never;

  test("singular in the note, plural on the page: grounded", () => {
    const r = enforceNoteGrounding(
      [
        {
          itemId: "stairs.external-stairs",
          status: "evidenced",
          citations: [{ documentId: "arch", page: 5 }],
          note: "External stair with concrete tread and steel stringer.",
          depth: "full",
          remaining: null,
          confidence: 0.8,
        },
      ],
      docs,
    );
    expect(r.flagged).toEqual([]);
  });

  test("a near-empty cited page gives no basis to flag", () => {
    const r = enforceNoteGrounding(
      [
        {
          itemId: "stairs.external-stairs",
          status: "evidenced",
          citations: [{ documentId: "arch", page: 9 }],
          note: "External stairs with bluestone treads.",
          depth: "full",
          remaining: null,
          confidence: 0.8,
        },
      ],
      docs,
    );
    expect(r.flagged).toEqual([]);
  });
});

describe("packReadiness and the structural gate", () => {
  const base = {
    items: [{ status: "evidenced", depth: "full" }],
    conflicts: [] as Array<{ severity: string }>,
    namedMissingCount: 0,
  };

  test("fails an extension with no structural set, which the old type gate let through", () => {
    const r = packReadiness({
      ...base,
      registerKinds: ["planning"],
      projectType: "extension",
    });
    expect(r.verdict).toBe("budget_only");
    expect(r.factors.join(" ")).toContain("No structural engineering");
  });

  test("still fails a new build with no structural set", () => {
    expect(
      packReadiness({
        ...base,
        registerKinds: ["architectural"],
        projectType: "multi_dwelling",
      }).verdict,
    ).toBe("budget_only");
  });

  test("does not raise it against a renovation, which may never need an engineer", () => {
    const r = packReadiness({
      ...base,
      registerKinds: ["architectural"],
      projectType: "renovation",
    });
    expect(r.factors.join(" ")).not.toContain("No structural engineering");
  });

  test("passes once the structural set is on file", () => {
    const r = packReadiness({
      ...base,
      registerKinds: ["planning", "structural"],
      projectType: "extension",
    });
    expect(r.factors.join(" ")).not.toContain("No structural engineering");
    expect(r.verdict).toBe("fixed_price");
  });
});

describe("scopeReadyTally", () => {
  const line = (
    itemId: string,
    status: string,
    resolved = false,
    opsStatus = "confirmed",
  ) => ({ itemId, status, opsStatus, resolved });

  test("a resolved gap is not a decision for the runner", () => {
    const t = scopeReadyTally([
      line("roofing.metal-roof", "evidenced"),
      line("preliminaries.scaffolding", "gap", true),
      line("approvals.soil-geotech", "gap", false),
    ]);
    expect(t.scopeItems).toBe(3);
    expect(t.documented).toBe(1);
    expect(t.builderCarried).toBe(1);
    expect(t.decisions).toBe(1);
  });

  test("removed lines and not_expected lines are not scope", () => {
    const t = scopeReadyTally([
      line("roofing.metal-roof", "evidenced"),
      line("landscaping.pool", "not_expected"),
      line("windows.flyscreens", "gap", false, "removed"),
    ]);
    expect(t.scopeItems).toBe(1);
    expect(t.decisions).toBe(0);
  });

  test("counts the open allowances inside the decisions", () => {
    const t = scopeReadyTally([
      line("appliances.cooktop", "gap", false),
      line("approvals.soil-geotech", "gap", false),
      line("preliminaries.scaffolding", "gap", true),
    ]);
    expect(t.decisions).toBe(2);
    expect(t.allowances).toBe(1);
    expect(t.allowances).toBeLessThanOrEqual(t.decisions);
  });

  test("a pack with every gap resolved leaves nothing for the runner", () => {
    const t = scopeReadyTally([
      line("roofing.metal-roof", "evidenced"),
      line("preliminaries.scaffolding", "gap", true),
    ]);
    expect(t.decisions).toBe(0);
    expect(t.allowances).toBe(0);
    expect(t.builderCarried).toBe(1);
  });

  test("the parts always add up to the scope", () => {
    const t = scopeReadyTally([
      line("roofing.metal-roof", "evidenced"),
      line("roofing.downpipes", "evidenced"),
      line("preliminaries.scaffolding", "gap", true),
      line("appliances.cooktop", "gap", false),
      line("landscaping.pool", "not_expected"),
    ]);
    expect(t.documented + t.builderCarried + t.decisions).toBe(t.scopeItems);
  });
});
