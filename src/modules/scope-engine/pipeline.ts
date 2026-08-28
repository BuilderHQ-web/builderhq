/**
 * scope-engine · the pipeline (server-only, DB-free).
 *
 * Three stages, each a pure function over inputs, so the run
 * processor (DB-backed) and the golden runner (file-backed) execute
 * the SAME code:
 *
 *   1. classifyDocument   — cheap tier. What IS this document: kind,
 *                           title, revision from the title block,
 *                           page count.
 *   2. extractDocument    — strong tier. Page-level evidence against
 *                           the Scope Standard: which items each page
 *                           evidences, and the STATED figures on it.
 *   3. synthesiseRun      — strong tier, adaptive thinking. All
 *                           documents' findings folded onto the
 *                           ontology: the selection with merged
 *                           citations, the gap list, the conflicts.
 *
 * THE TWO INTEGRITY RULES, enforced in prompt and in code:
 *   - Stated figures only. The model records what documents SAY. It
 *     never measures, scales or infers quantities off drawings.
 *   - No citation, no claim. An evidenced item without at least one
 *     (document, page) citation is dropped in post-processing and
 *     logged. The synthesis cannot invent scope.
 *
 * Model policy (ratified): classification on the cheap tier,
 * extraction and synthesis on the Opus tier; the ontology digest
 * rides the system prompt under prompt caching so a 12-document run
 * pays for it once.
 */

import "server-only";

import type Anthropic from "@anthropic-ai/sdk";
import { PDFDocument } from "pdf-lib";
import { z } from "zod";

import { anthropic } from "@/modules/extraction/client";
import { logger } from "@/lib/logger";
import {
  applyDeterministicGuards,
  collectFacts,
  renderFacts,
} from "./deterministic";
import {
  SCOPE_DIVISIONS,
  SCOPE_STANDARD_VERSION,
  getScopeItem,
  itemsFor,
  type ScopeProjectType,
} from "@/modules/scope";

export const CLASSIFY_MODEL = "claude-haiku-4-5-20251001";
export const EXTRACT_MODEL = "claude-opus-4-8";
export const SYNTHESIS_MODEL = "claude-opus-4-8";

/**
 * Output ceilings, named and watched.
 *
 * The 2026-08-20 incident: synthesis pass one was capped at 32k while
 * the first multi-dwelling pack needed ~35.5k, and nothing anywhere
 * reported how close earlier runs had come (the largest real single
 * dwelling used 24k). The ceiling was not wrong, it was invisible.
 * Every long call now logs its share of the ceiling on the way out,
 * and warns at 60 percent, so the next limit is raised on a chart
 * rather than discovered in front of a customer. Thinking tokens
 * count against these caps too.
 */
/**
 * MEASURED, not chosen. v7's page schema costs 586 output tokens per
 * page on the Wallace architectural set (21 pages, a dense
 * notes-heavy document), up from 462 under v6 — the claim axes,
 * evidence quotes and page identity are worth about 27%.
 *
 * The old 24,000 was already unsafe before v7: at 462 tok/page an
 * 80-page chunk produced ~37,000 tokens, so a dense long document hit
 * `stop_reason: max_tokens` and threw, having saved nothing. Dow's two
 * largest documents already sat at 71% and 69% of the ceiling.
 *
 * 48,000 with CHUNK_PAGES at 40 puts a full chunk at ~23,500 tokens,
 * 49% of the ceiling and comfortably under the 60% warn line, leaving
 * room for a document roughly twice as dense as any measured. Output
 * tokens are billed as used, so the headroom costs nothing until it is
 * needed.
 */
export const EXTRACT_MAX_TOKENS = 48_000;
export const SYNTHESIS_MAX_TOKENS = 64_000;
export const RESIDUAL_MAX_TOKENS = 32_000;

export function logHeadroom(
  stage: string,
  outputTokens: number,
  ceiling: number,
  context: Record<string, unknown> = {},
): void {
  const pct = Math.round((outputTokens / ceiling) * 100);
  const line = {
    event: "scope.headroom",
    stage,
    outputTokens,
    ceiling,
    pct,
    ...context,
  };
  if (pct >= 60) {
    logger.warn(line, `scope ${stage} used ${pct}% of its output ceiling`);
  } else {
    logger.info(line, `scope ${stage} headroom ${pct}%`);
  }
}

/**
 * Bumped whenever a prompt, schema or model changes in a way that
 * makes older stage outputs incomparable. Extraction reuse across
 * runs keys on this: findings from a prior version are re-extracted,
 * never silently mixed.
 *
 * v3 — the open capture lane (off-standard work recorded, never
 * silently dropped), issue dates and client names read at
 * classification, document references mined per page, and the
 * Partial depth grade on evidenced items.
 *
 * v4 — the capture lane errs toward capturing (a capture costs a
 * human ten seconds; a silent drop costs the client a missing line),
 * and docRefs exclude internal sheet cross-references at the source.
 *
 * v5 — source authority (the drawn documents govern materials; a
 * template wall type in an energy report cannot clad a building),
 * note locality (each note written only from its cited pages), and
 * one line per distinct cladding system.
 */
export const SCOPE_PIPELINE_VERSION = 7;

/** 28 MB — the same ceiling the plan auto-fill extractor uses. */
export const MAX_PDF_BYTES = 28 * 1024 * 1024;

/**
 * The API reads at most 100 PDF pages per request. Documents beyond
 * CHUNK_PAGES are split and extracted in ranges, findings re-mapped
 * to absolute page numbers. 80 leaves headroom under the hard limit
 * and keeps each chunk's output well inside the token ceiling.
 */
/**
 * Halved from 80, which no measurement ever supported. See
 * EXTRACT_MAX_TOKENS: at the measured 586 tokens per page an 80-page
 * chunk needs ~47,000 output tokens, which would have sat at 98% of
 * even the raised ceiling. 40 pages is ~23,500, and the API's own
 * 100-page-per-request limit is no longer the binding constraint —
 * the output ceiling is.
 */
export const CHUNK_PAGES = 40;

/** Classification needs the cover and title block, not the whole set. */
export const CLASSIFY_PAGES = 8;

export interface StageUsage {
  inputTokens: number;
  outputTokens: number;
  /** Prompt-cache traffic — billed at 1.25× (write) and 0.1× (read). */
  cacheWriteTokens?: number;
  cacheReadTokens?: number;
}

function usageOf(m: Anthropic.Message): StageUsage {
  return {
    inputTokens: m.usage.input_tokens,
    outputTokens: m.usage.output_tokens,
    cacheWriteTokens: m.usage.cache_creation_input_tokens ?? 0,
    cacheReadTokens: m.usage.cache_read_input_tokens ?? 0,
  };
}

function sumUsage(a: StageUsage, b: StageUsage): StageUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheWriteTokens: (a.cacheWriteTokens ?? 0) + (b.cacheWriteTokens ?? 0),
    cacheReadTokens: (a.cacheReadTokens ?? 0) + (b.cacheReadTokens ?? 0),
  };
}

// ── schema salvage ──────────────────────────────────────────────────────

/**
 * The overview lesson, generalised: one malformed element must never
 * discard a stage that read everything else correctly. Arrays parse
 * element-by-element; failures drop with a count instead of failing
 * the whole response. The caller decides what a salvage count means —
 * a stray element is noise, a majority malformed is a real failure.
 */
export function salvageArray<T>(
  raw: unknown,
  schema: z.ZodType<T>,
  cap: number,
): { values: T[]; salvaged: number } {
  if (!Array.isArray(raw)) {
    return { values: [], salvaged: raw == null ? 0 : 1 };
  }
  const values: T[] = [];
  let salvaged = 0;
  for (const el of raw.slice(0, cap)) {
    const p = schema.safeParse(el);
    if (p.success) values.push(p.data);
    else salvaged += 1;
  }
  return { values, salvaged: salvaged + Math.max(0, raw.length - cap) };
}

/** Salvage is for the one bad element in two hundred. When the
 *  majority of a non-trivial array is malformed, the stage output is
 *  garbage and must fail loudly, not publish quietly. */
export function salvageIsFailure(values: number, salvaged: number): boolean {
  return salvaged > values && salvaged > 2;
}

// ── pdf plumbing (pure byte work, no API calls) ─────────────────────────

interface PdfShape {
  pageCount: number;
  /** Slice pages [from..to] (1-based, inclusive) into a fresh PDF. */
  slice: (from: number, to: number) => Promise<Uint8Array>;
}

/**
 * Load a PDF for counting and slicing. Returns null on anything
 * pdf-lib cannot open — callers fall back to whole-document requests,
 * exactly the pre-chunking behaviour.
 */
async function loadPdfShape(bytes: Uint8Array): Promise<PdfShape | null> {
  try {
    const doc = await PDFDocument.load(bytes, {
      ignoreEncryption: true,
      updateMetadata: false,
    });
    const pageCount = doc.getPageCount();
    if (pageCount < 1) return null;
    return {
      pageCount,
      slice: async (from: number, to: number) => {
        const out = await PDFDocument.create();
        const indices = [];
        for (let i = from - 1; i <= to - 1; i++) indices.push(i);
        const pages = await out.copyPages(doc, indices);
        for (const p of pages) out.addPage(p);
        return out.save();
      },
    };
  } catch {
    return null;
  }
}

/** The chunk plan for an N-page document: 1-based inclusive ranges. */
export function planChunks(
  pageCount: number,
  chunkPages = CHUNK_PAGES,
): Array<{ from: number; to: number }> {
  if (pageCount <= chunkPages) return [{ from: 1, to: pageCount }];
  const ranges: Array<{ from: number; to: number }> = [];
  for (let from = 1; from <= pageCount; from += chunkPages) {
    ranges.push({ from, to: Math.min(from + chunkPages - 1, pageCount) });
  }
  return ranges;
}

// ── the ontology digest (system prompt, cached) ─────────────────────────

/**
 * An item the platform LEARNED from a past project — the living
 * vocabulary beside the authored Standard. Extensions ride the digest
 * so the model can evidence them directly; their absence is never a
 * gap. Passed in by the caller: the pipeline stays DB-free.
 */
export interface ExtensionItem {
  /** Permanent key, "ext.<division>.<slug>". */
  id: string;
  label: string;
  division: string;
  plain?: string | null;
  aliases?: string[];
  /** True when this item is core for the CURRENT project's type —
   *  expected, so its absence is judged like any authored item's. */
  core?: boolean;
}

/**
 * The Scope Standard rendered for the model: one line per item with
 * id, label and aliases. ~10k tokens; cache_control makes the second
 * and every later call on a run read it from cache. Learned
 * extensions append as their own section with their own law.
 */
export function ontologyDigest(
  projectType: ScopeProjectType,
  extensions: ExtensionItem[] = [],
): string {
  const pool = itemsFor(projectType);
  const byDivision = new Map<string, string[]>();
  for (const item of pool) {
    const line = `  ${item.id} — ${item.label}${
      item.aliases?.length ? ` (aka: ${item.aliases.join(", ")})` : ""
    }`;
    const arr = byDivision.get(item.division) ?? [];
    arr.push(line);
    byDivision.set(item.division, arr);
  }
  const parts: string[] = [
    `THE SCOPE STANDARD v${SCOPE_STANDARD_VERSION} — project type: ${projectType}`,
    `Item ids are the ONLY valid vocabulary. Never invent an id.`,
  ];
  for (const d of SCOPE_DIVISIONS) {
    const lines = byDivision.get(d.id);
    if (!lines) continue;
    parts.push(`\n${d.order}. ${d.label} [${d.id}]`);
    parts.push(...lines);
  }
  const line = (e: ExtensionItem) =>
    `  ${e.id} — ${e.label}${
      e.aliases?.length ? ` (aka: ${e.aliases.join(", ")})` : ""
    }`;
  const core = extensions.filter((e) => e.core);
  const evidenceOnly = extensions.filter((e) => !e.core);
  if (core.length > 0) {
    parts.push(
      `\nLEARNED CORE ITEMS — expected on this project type, exactly like the Standard's own items. Evidence them when shown; judge their absence like any other item's.`,
    );
    parts.push(...core.map(line));
  }
  if (evidenceOnly.length > 0) {
    parts.push(
      `\nEXTENDED ITEMS — real work learned from past projects. Use these ids when THIS project's documents show the work; they are evidence-only and never gaps. Prefer an extended id over an offStandard capture when one fits.`,
    );
    parts.push(...evidenceOnly.map(line));
  }
  return parts.join("\n");
}

// ── stage 1 · classify ──────────────────────────────────────────────────

const DOC_KINDS = [
  "architectural",
  "structural",
  "civil",
  "specification",
  "energy",
  "soil",
  "survey",
  "planning",
  "other",
] as const;

const ClassificationSchema = z.object({
  kind: z.enum(DOC_KINDS),
  // Clip, never reject: a consultant's forty-word cover title must not
  // fail the document.
  title: z
    .string()
    .min(1)
    .transform((v) => v.trim().slice(0, 160)),
  revision: z
    .string()
    .nullish()
    .transform((v) => (v ? v.trim().slice(0, 20) : null)),
  /** The latest issue date printed in the title block or revision
   *  table, ISO formatted. The baseline check's raw material. */
  issueDate: z
    .string()
    .nullish()
    .transform((v) => {
      if (!v) return null;
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.trim());
      if (!m) return null;
      const year = Number(m[1]);
      return year >= 1980 && year <= 2035 ? v.trim() : null;
    }),
  /** The client or project name in the title block, for the entity
   *  consistency check. */
  clientName: z
    .string()
    .nullish()
    .transform((v) => (v ? v.trim().slice(0, 120) : null)),
  /** Soil reports only: the AS 2870 site classification the report
   *  states. Normalised to the standard codes; anything else is
   *  dropped rather than shown to a builder wrong. */
  siteClass: z
    .string()
    .nullish()
    .transform((v) => {
      if (!v) return null;
      const cleaned = v.trim().toUpperCase().replace(/^CLASS\s+/, "");
      return /^(A|S|M|M-D|H1|H1-D|H2|H2-D|E|E-D|P)$/.test(cleaned)
        ? cleaned
        : null;
    }),
  /** Energy reports only: the NatHERS star rating the certificate
   *  states (6.2). Out-of-range values drop to null. */
  energyStars: z
    .number()
    .nullish()
    .transform((v) =>
      typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 10
        ? Math.round(v * 10) / 10
        : null,
    ),
  pageCount: z
    .number()
    .int()
    .transform((v) => Math.min(Math.max(v, 1), 5000)),
});
export type DocumentClassification = z.infer<typeof ClassificationSchema>;

const CLASSIFY_TOOL: Anthropic.Tool = {
  name: "record_document_classification",
  description: "Record what this construction document is.",
  input_schema: {
    type: "object" as const,
    properties: {
      kind: { type: "string", enum: [...DOC_KINDS] },
      title: {
        type: "string",
        description: "The document set's own title, from its title block or cover.",
      },
      revision: {
        type: ["string", "null"],
        description:
          "The revision printed in the title block (e.g. 'C', 'Rev B', '03'). Null if none is printed.",
      },
      issueDate: {
        type: ["string", "null"],
        description:
          "The LATEST issue/revision date printed in the title block or revision table, as YYYY-MM-DD. Null when no date is printed. Never guess.",
      },
      clientName: {
        type: ["string", "null"],
        description:
          "The client, project or company name the title block carries (e.g. 'Billy Residence', 'Chok & Co Pty Ltd'). Null when none is printed.",
      },
      siteClass: {
        type: ["string", "null"],
        description:
          "GEOTECHNICAL/SOIL REPORTS ONLY: the AS 2870 site classification the report states (one of A, S, M, M-D, H1, H1-D, H2, H2-D, E, E-D, P). Null for every other document kind, and null when the report does not state one. Never guess.",
      },
      energyStars: {
        type: ["number", "null"],
        description:
          "ENERGY REPORTS/CERTIFICATES ONLY: the NatHERS star rating the certificate states (e.g. 6.2). Null for every other document kind, and null when no rating is printed. Never guess.",
      },
      pageCount: { type: "integer", description: "Total pages in this PDF." },
    },
    required: ["kind", "title", "revision", "issueDate", "clientName", "siteClass", "energyStars", "pageCount"],
  },
};

export async function classifyDocument(args: {
  bytes: Uint8Array;
  filename: string;
}): Promise<{ classification: DocumentClassification; usage: StageUsage }> {
  // Classification reads the cover and title block, so it gets the
  // first pages, not the whole set: a 50-page PDF costs the same to
  // classify as an 8-page one. The page count comes from code, which
  // cannot miscount. When pdf-lib cannot open the file, the whole
  // document goes through exactly as before.
  const shape = await loadPdfShape(args.bytes);
  let sendBytes = args.bytes;
  if (shape && shape.pageCount > CLASSIFY_PAGES) {
    try {
      sendBytes = await shape.slice(1, CLASSIFY_PAGES);
    } catch {
      sendBytes = args.bytes;
    }
  }
  const base64 = Buffer.from(sendBytes).toString("base64");
  const message = await anthropic().messages.create({
    model: CLASSIFY_MODEL,
    max_tokens: 1024,
    system:
      "You classify Australian residential construction documents. Read the title block and cover. Report only what is printed; never guess a revision that is not there. You may be given only the first pages of a longer document.",
    tools: [CLASSIFY_TOOL],
    tool_choice: { type: "tool", name: CLASSIFY_TOOL.name },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: base64 },
          },
          {
            type: "text",
            text: `Classify this document (uploaded as "${args.filename}") with the record_document_classification tool.`,
          },
        ],
      },
    ],
  });
  const toolUse = message.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  const parsed = ClassificationSchema.safeParse(toolUse?.input);
  if (!parsed.success) {
    logger.warn(
      { event: "scope.classify.invalid_shape", file: args.filename, stop: message.stop_reason, issues: parsed.error.issues.slice(0, 5) },
      "classification shape rejected",
    );
    throw new Error(
      `classification returned an invalid shape for ${args.filename}`,
    );
  }
  return {
    classification: shape
      ? { ...parsed.data, pageCount: shape.pageCount }
      : parsed.data,
    usage: usageOf(message),
  };
}

/**
 * Fact recovery for soil and energy documents. The classifier reads
 * only the cover pages, but a geotechnical report often states its
 * AS 2870 classification in the body and an energy report its rating
 * mid-document. When classification comes back without the fact, one
 * cheap follow-up reads deeper — soil and energy documents only, so
 * the cost is two extra haiku calls per round at most.
 */
const FACT_RECOVERY_PAGES = 24;

const FactRecoverySchema = z.object({
  siteClass: z
    .string()
    .nullish()
    .transform((v) => {
      if (!v) return null;
      const cleaned = v.trim().toUpperCase().replace(/^CLASS\s+/, "");
      return /^(A|S|M|M-D|H1|H1-D|H2|H2-D|E|E-D|P)$/.test(cleaned)
        ? cleaned
        : null;
    }),
  energyStars: z
    .number()
    .nullish()
    .transform((v) =>
      typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 10
        ? Math.round(v * 10) / 10
        : null,
    ),
});

const FACT_RECOVERY_TOOL: Anthropic.Tool = {
  name: "record_document_facts",
  description: "Record the stated facts from this report.",
  input_schema: {
    type: "object" as const,
    properties: {
      siteClass: {
        type: ["string", "null"],
        description:
          "SOIL/GEOTECHNICAL REPORTS: the AS 2870 site classification the report states (one of A, S, M, M-D, H1, H1-D, H2, H2-D, E, E-D, P). Null when the report does not state one. Never guess.",
      },
      energyStars: {
        type: ["number", "null"],
        description:
          "ENERGY REPORTS/CERTIFICATES: the NatHERS star rating stated (e.g. 6.2). Null when no star rating is printed (a performance solution has none). Never guess.",
      },
    },
    required: ["siteClass", "energyStars"],
  },
};

export async function recoverDocFacts(args: {
  bytes: Uint8Array;
  filename: string;
  kind: "soil" | "energy";
}): Promise<{
  siteClass: string | null;
  energyStars: number | null;
  usage: StageUsage;
}> {
  const shape = await loadPdfShape(args.bytes);
  let sendBytes = args.bytes;
  if (shape && shape.pageCount > FACT_RECOVERY_PAGES) {
    try {
      sendBytes = await shape.slice(1, FACT_RECOVERY_PAGES);
    } catch {
      sendBytes = args.bytes;
    }
  }
  const base64 = Buffer.from(sendBytes).toString("base64");
  const message = await anthropic().messages.create({
    model: CLASSIFY_MODEL,
    max_tokens: 512,
    system:
      "You read Australian residential construction reports. Report only what is printed; never guess.",
    tools: [FACT_RECOVERY_TOOL],
    tool_choice: { type: "tool", name: FACT_RECOVERY_TOOL.name },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64,
            },
          },
          {
            type: "text",
            text:
              args.kind === "soil"
                ? `This is a geotechnical/soil report ("${args.filename}"). Record the AS 2870 site classification it states with the record_document_facts tool.`
                : `This is an energy report or certificate ("${args.filename}"). Record the NatHERS star rating it states with the record_document_facts tool.`,
          },
        ],
      },
    ],
  });
  const toolUse = message.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  const parsed = FactRecoverySchema.safeParse(toolUse?.input);
  return {
    siteClass: parsed.success ? parsed.data.siteClass : null,
    energyStars: parsed.success ? parsed.data.energyStars : null,
    usage: usageOf(message),
  };
}

// ── stage 2 · extract ───────────────────────────────────────────────────

/** Clip a free-text field instead of rejecting the element it sits on. */
const clipped = (max: number) =>
  z
    .string()
    .min(1)
    .transform((v) => v.trim().slice(0, max));

/**
 * v7 — the claim axes.
 *
 * Every one of these exists because the engine got something wrong in a
 * way `itemIds: string[]` could not express. A bare id says "this page
 * shows this work"; it cannot say the page shows it being REFUSED, or
 * shows it CONDITIONALLY, or shows it only in a marketing render.
 *
 * They are deliberately NOT emitted for every item. An ordinary
 * positive, selected, project-specific claim stays in `itemIds`, which
 * costs one string. A claim row costs roughly forty tokens, so it is
 * reserved for items whose meaning is modified — which is exactly the
 * set the deterministic engines need to read.
 */
export const CLAIM_POLARITY = [
  "positive",
  "excluded",
  "not_required",
  "by_owner",
  "by_others",
  "deleted",
] as const;

export const CLAIM_MODALITY = [
  "selected",
  "minimum",
  "maximum",
  "if_required",
  "where_required",
  "may",
  "indicative",
  "typical",
  "alternative",
  "provision_only",
] as const;

export const CLAIM_GENERICITY = [
  "project_specific",
  "schedule",
  "detail",
  "general_note",
  "template_note",
  "render_only",
] as const;

export const VIEW_TYPES = [
  "plan",
  "elevation",
  "section",
  "detail",
  "schedule",
  "render",
  "notes",
  "title",
  "other",
] as const;

/**
 * WHY a gap exists, which is a different question from whether one
 * does. Sending an owner back to their architect for work their
 * builder was always going to carry is the single most expensive kind
 * of wrong answer this engine can give.
 *
 * Mirrors GoldenGapClass in modules/scope/golden-v2.ts. The two must
 * stay in step: the corpus grades against this vocabulary, and a class
 * the scorer does not know is scored as wrong rather than as unknown.
 */
export const GAP_CLASSES = [
  /** The documents simply never resolved it. Back to the designer. */
  "design_gap",
  /** Named in the pack and not supplied. Ask for it; do not commission it. */
  "referenced_package_missing",
  /** Belongs to engineering or a consultant package not yet issued. */
  "later_consultant_package",
  /** A trade designs it under the building contract. */
  "delegated_design",
  /** Carried as a sum rather than designed. */
  "commercial_allowance",
  /** The builder's own obligation. Never a design question. */
  "contractor_obligation",
  /** An authority decides it. */
  "statutory",
] as const;

export const FIGURE_BASIS = [
  "per_dwelling",
  "total_project",
  "per_room",
  "shared",
  "minimum",
  "maximum",
  "selected",
  "nominal",
] as const;

const enumish = <T extends readonly string[]>(vals: T, fallback: T[number]) =>
  z
    .string()
    .nullish()
    .transform((v) => (v && (vals as readonly string[]).includes(v) ? v : fallback));

export const PageFindingSchema = z.object({
  page: z.number().int().min(1),

  /**
   * The printed sheet identifier (WD12), which is NOT the PDF page. On
   * the Wallace set the two diverge — PDF page 11 is sheet WD12 — so a
   * page-only citation silently crosses sheets.
   */
  sheetId: z
    .string()
    .nullish()
    .transform((v) => (v ? v.trim().slice(0, 24) : null)),
  /** What kind of drawing this is. A render cannot establish scope. */
  viewType: enumish(VIEW_TYPES, "other"),
  /** Local identity: "Unit 1 roof plan - north". Two figures on two
   *  different views are not a contradiction. */
  viewLabel: z
    .string()
    .nullish()
    .transform((v) => (v ? v.trim().slice(0, 80) : null)),
  /** Set only where the whole page belongs to one dwelling. */
  dwelling: z
    .string()
    .nullish()
    .transform((v) => (v ? v.trim().slice(0, 40) : null)),

  itemIds: z
    .array(z.string())
    .default([])
    .transform((a) => a.slice(0, 60)),

  /**
   * Items this page says something ABOUT, beyond showing them. The
   * quote is what makes entailment checkable: a claim whose words are
   * absent from the page is a fabrication, and until now nothing could
   * tell the difference.
   */
  claims: z
    .array(
      z.object({
        itemId: z.string(),
        polarity: enumish(CLAIM_POLARITY, "positive"),
        modality: enumish(CLAIM_MODALITY, "selected"),
        genericity: enumish(CLAIM_GENERICITY, "project_specific"),
        quote: clipped(180),
        dwelling: z
          .string()
          .nullish()
          .transform((v) => (v ? v.trim().slice(0, 40) : null)),
      }),
    )
    .default([])
    .transform((a) => a.slice(0, 20)),

  /**
   * Schedules present on the page, by identity rather than by row. A
   * window schedule EXISTING is what decides whether window sizes are
   * specified; transcribing every row would cost more than it tells.
   */
  schedules: z
    .array(
      z.object({
        title: clipped(80),
        kind: enumish(
          ["window", "door", "finishes", "fixture", "electrical", "other"] as const,
          "other",
        ),
        rows: z
          .number()
          .int()
          .nullish()
          .transform((v) => (typeof v === "number" && v >= 0 ? Math.min(v, 999) : null)),
      }),
    )
    .default([])
    .transform((a) => a.slice(0, 6)),

  statedFigures: z
    .array(
      z.object({
        label: clipped(200),
        value: clipped(200),
        itemId: z
          .string()
          .nullish()
          .transform((v) => v ?? null),
        /**
         * What the figure is measured against. Without this, 2 kW per
         * dwelling and 4 kW total look like a contradiction rather
         * than the same fact stated twice.
         */
        basis: z
          .string()
          .nullish()
          .transform((v) =>
            v && (FIGURE_BASIS as readonly string[]).includes(v) ? v : null,
          ),
        dwelling: z
          .string()
          .nullish()
          .transform((v) => (v ? v.trim().slice(0, 40) : null)),
      }),
    )
    .default([])
    .transform((a) => a.slice(0, 60)),
  /** Work visibly present that NO Standard item names — the open
   *  capture lane. The end of the silent drop. */
  offStandard: z
    .array(
      z.object({
        label: clipped(120),
        note: z
          .string()
          .nullish()
          .transform((v) => (v ? v.trim().slice(0, 300) : null)),
      }),
    )
    .default([])
    .transform((a) => a.slice(0, 10)),
  /** Other documents this page NAMES: sheets in a set, report
   *  numbers, plans referred to. The pack's own missing-document
   *  register writes itself from these. */
  docRefs: z
    .array(clipped(160))
    .default([])
    .transform((a) => a.slice(0, 12)),
  note: z
    .string()
    .nullish()
    .transform((v) => (v ? v.trim().slice(0, 600) : null)),
});
export type DocumentFindings = {
  pages: Array<z.infer<typeof PageFindingSchema>>;
};

const EXTRACT_TOOL: Anthropic.Tool = {
  name: "record_page_findings",
  description:
    "Record, per page, which Scope Standard items this document evidences and the figures it states.",
  input_schema: {
    type: "object" as const,
    properties: {
      pages: {
        type: "array",
        items: {
          type: "object",
          properties: {
            page: { type: "integer", description: "1-based page number." },
            sheetId: {
              type: ["string", "null"],
              description:
                "The sheet identifier PRINTED on the drawing (e.g. 'WD12', 'A-104'), not the page number. Null when the page prints none.",
            },
            viewType: {
              type: "string",
              enum: ["plan", "elevation", "section", "detail", "schedule", "render", "notes", "title", "other"],
              description:
                "What this page IS. Use 'render' for perspectives and 3D visuals, 'notes' for specification/general-note sheets, 'schedule' for tabulated schedules.",
            },
            viewLabel: {
              type: ["string", "null"],
              description:
                "The view's own title as printed, e.g. 'Unit 1 Roof Plan' or 'North Elevation'. This is how two figures are known to describe different parts of the building.",
            },
            dwelling: {
              type: ["string", "null"],
              description:
                "Set ONLY where the whole page belongs to one dwelling, e.g. 'Unit 2'. Null for shared or whole-project pages.",
            },
            claims: {
              type: "array",
              description:
                "Items this page says something ABOUT, beyond simply showing them. Emit a claim ONLY when at least one of these is true: the page refuses, excludes or deletes the work; the page makes it conditional or indicative rather than selected; the evidence is a generic/template note or a render rather than project-specific drawing. Ordinary positive selected work belongs in itemIds alone. At most 20 per page.",
              items: {
                type: "object",
                properties: {
                  itemId: { type: "string", description: "The Scope Standard item id." },
                  polarity: {
                    type: "string",
                    enum: ["positive", "excluded", "not_required", "by_owner", "by_others", "deleted"],
                    description:
                      "'not_required' for 'NO IRRIGATION' or 'no cornice'. 'by_owner'/'by_others' where the page assigns it away. 'deleted' where a revision removes it.",
                  },
                  modality: {
                    type: "string",
                    enum: ["selected", "minimum", "maximum", "if_required", "where_required", "may", "indicative", "typical", "alternative", "provision_only"],
                    description:
                      "'if_required' for 'if irrigation is required'. 'minimum' for 'min 2kW'. 'provision_only' for a symbol, space or rough-in without a supplied product. 'selected' only where the document actually chooses it.",
                  },
                  genericity: {
                    type: "string",
                    enum: ["project_specific", "schedule", "detail", "general_note", "template_note", "render_only"],
                    description:
                      "'template_note' for boilerplate/BCA clauses that apply to any project. 'render_only' where the ONLY evidence is a perspective image. Neither can establish selected scope.",
                  },
                  quote: {
                    type: "string",
                    description:
                      "The exact printed words that carry this claim, copied verbatim from the page. Short. This is checked against the page later, so never paraphrase and never invent.",
                  },
                  dwelling: {
                    type: ["string", "null"],
                    description: "Which dwelling this claim is about, when the page says.",
                  },
                },
                required: ["itemId", "polarity", "modality", "genericity", "quote", "dwelling"],
              },
            },
            schedules: {
              type: "array",
              description:
                "Tabulated schedules printed on this page, by identity only — do not transcribe rows. At most 6.",
              items: {
                type: "object",
                properties: {
                  title: { type: "string", description: "The schedule's printed title." },
                  kind: {
                    type: "string",
                    enum: ["window", "door", "finishes", "fixture", "electrical", "other"],
                  },
                  rows: { type: ["integer", "null"], description: "How many rows it has, if countable." },
                },
                required: ["title", "kind", "rows"],
              },
            },
            itemIds: {
              type: "array",
              items: { type: "string" },
              description:
                "Scope Standard item ids this page provides real evidence for. Empty array when a page evidences nothing.",
            },
            statedFigures: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: { type: "string", description: "What the figure is, in the document's words." },
                  value: { type: "string", description: "The figure EXACTLY as printed, with its unit." },
                  itemId: {
                    type: ["string", "null"],
                    description: "The Scope Standard item it belongs to, when clear.",
                  },
                  basis: {
                    type: ["string", "null"],
                    enum: ["per_dwelling", "total_project", "per_room", "shared", "minimum", "maximum", "selected", "nominal", null],
                    description:
                      "What the figure is measured against. '2 kW per dwelling' is per_dwelling; '4 kW total' is total_project; 'min 2 kW' is minimum. Null when the page does not say.",
                  },
                  dwelling: {
                    type: ["string", "null"],
                    description: "Which dwelling the figure belongs to, when stated.",
                  },
                },
                required: ["label", "value", "itemId", "basis", "dwelling"],
              },
            },
            offStandard: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: {
                    type: "string",
                    description: "Short professional name for the work, as a scope of works would print it (e.g. 'Residential lift').",
                  },
                  note: {
                    type: ["string", "null"],
                    description: "One line: what this page shows of it.",
                  },
                },
                required: ["label", "note"],
              },
              description:
                "Work VISIBLY present on this page that no Scope Standard item covers. Empty array when everything maps. Never use this for variations of existing items.",
            },
            docRefs: {
              type: "array",
              items: { type: "string" },
              description:
                "Other documents this page NAMES: 'Sheet 2 of 5', 'refer plan 11637S-2', a soil report number, a referenced schedule. As printed, one entry each. Empty array when none.",
            },
            note: {
              type: ["string", "null"],
              description: "One short line only when something on the page needs a human's eye.",
            },
          },
          required: ["page", "sheetId", "viewType", "viewLabel", "dwelling", "itemIds", "claims", "schedules", "statedFigures", "offStandard", "docRefs", "note"],
        },
      },
    },
    required: ["pages"],
  },
};

const EXTRACT_RULES = `You are reading one document from an Australian residential construction tender package, against the Scope Standard below.

THE RULES — these are absolute:
1. STATED FIGURES ONLY. Record numbers exactly as the document prints them (with units). NEVER measure off a drawing, NEVER scale, NEVER compute or estimate a quantity. If a figure is not printed, it does not exist.
2. EVIDENCE, NOT INFERENCE. An item id belongs on a page only when the page genuinely shows or specifies that work. A kitchen on a floor plan evidences kitchen cabinetry; it does not evidence appliances unless appliances are shown or scheduled.
3. THE VOCABULARY IS CLOSED, BUT NOTHING IS DROPPED. Use only ids from the Scope Standard for itemIds. When the page visibly shows work the Standard does not name — a distinct piece of work, a specialist system, a package a builder must price — record it under offStandard with a short professional label and what the page shows. Check the Standard honestly first, then ERR TOWARD CAPTURING: a capture costs a reviewer ten seconds, a silent drop costs the client a missing scope line. Only brands, sizes and product selections for work an item already names stay out.
4. Every page gets an entry, even if empty, so coverage is auditable.
5. VISIBLE CONTENT ONLY. Consultants build reports on templates from earlier jobs, and a PDF's text layer often carries invisible residue: white or hidden text, content buried under images, another project's details surviving beneath the printed page. Evidence is what the RENDERED page visibly shows a person holding the printout. If the text layer offers content that does not appear on the visible page — a different address, another report number, a second client or title block — treat it as template residue and ignore it entirely: no item, no figure, no note, no citation may rest on it. Text that IS visibly printed on the page is always in scope, even when it looks like an error; errors a reader can see are exactly what notes are for.
6. THE PACK NAMES ITS OWN GAPS. When a page refers to a SEPARATE document — a report number, a named plan or schedule, a specification it depends on, a sheet count revealing an incomplete set ('Sheet 2 of 5') — record the reference under docRefs exactly as printed. Do NOT record internal navigation within the same drawing set: 'refer to S31', elevation and section markers, 'see detail on sheet S10' are the set talking to itself, never a missing document.
7. RESPONSIBILITY DISCLAIMERS NEED EYES. When a page assigns work to others or excludes it ('waterproofing by others', 'pool overflow by others', 'NIC'), record it as a CLAIM with the matching polarity and the disclaimer quoted. Unassigned responsibility is a risk a human must see.
8. A REFUSAL IS EVIDENCE TOO. 'NO IRRIGATION', 'no cornice - square set', 'no gas connection' are among the most valuable things a document says, and they are NOT absences: they settle a question. Record every one as a claim with polarity 'not_required' and the words quoted. Where the same sentence SELECTS the alternative — 'no cornice, square set ceilings' chooses square-set — record that as a second, positive claim. A negation that only deletes has been half read.
9. CONDITIONAL IS NOT CHOSEN. 'If irrigation is required', 'where required', 'may be fitted', 'indicative only', 'minimum 2kW', 'or similar approved' do not select anything. Put the item in itemIds only if the work is genuinely shown, and record a claim carrying the modality with the words quoted. A possibility read as a selection puts work in a tender nobody asked for.
10. A NOTE THAT FITS ANY PROJECT SPECIFIES NONE. Boilerplate compliance clauses, standard construction notes and code extracts describe what would apply IF the work occurred; they do not establish that it occurs here. Record such evidence with genericity 'template_note' or 'general_note'. A perspective or 3D visual is 'render_only' and can never, on its own, establish that a structure exists — if the plans and elevations do not show it, it is not scope.
11. QUOTE, DO NOT PARAPHRASE. Every claim carries the printed words that support it, copied exactly. These are checked against the page afterwards, and a claim whose words are not there is treated as fabricated. Where you cannot quote it, do not claim it.
12. SAY WHERE YOU ARE. Record the printed sheet id, what kind of view the page is, and the view's own title. Two figures on two different roof planes are not a contradiction, and only the view identity can tell anyone that. Where a page belongs to one dwelling, say which — per-dwelling requirements must never be merged.`;

/** One extraction call over one PDF (whole document or a page range). */
async function extractCall(args: {
  bytes: Uint8Array;
  filename: string;
  kind: string;
  projectType: ScopeProjectType;
  extensions?: ExtensionItem[];
  /** When set, the PDF is pages [from..to] of a larger document. */
  range?: { from: number; to: number; total: number };
}): Promise<{
  pages: DocumentFindings["pages"];
  usage: StageUsage;
  salvaged: number;
}> {
  const base64 = Buffer.from(args.bytes).toString("base64");
  const rangeNote = args.range
    ? ` You are given pages ${args.range.from} to ${args.range.to} of a ${args.range.total}-page document; number pages 1-based within the PDF you were given, and they will be re-mapped.`
    : "";
  // Streamed: dense plan sets can exceed the SDK's non-streaming
  // duration guard. finalMessage() collects the complete response.
  const message = await anthropic()
    .messages.stream({
    model: EXTRACT_MODEL,
    max_tokens: EXTRACT_MAX_TOKENS,
    system: [
      { type: "text", text: EXTRACT_RULES },
      {
        type: "text",
        text: ontologyDigest(args.projectType, args.extensions ?? []),
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [EXTRACT_TOOL],
    tool_choice: { type: "tool", name: EXTRACT_TOOL.name },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: base64 },
          },
          {
            type: "text",
            text: `This is a ${args.kind} document ("${args.filename}").${rangeNote} Record every page's findings with the record_page_findings tool.`,
          },
        ],
      },
    ],
  })
    .finalMessage();
  const toolUse = message.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (message.stop_reason === "max_tokens") {
    throw new Error(
      `extraction truncated for ${args.filename}: the findings did not fit the token ceiling`,
    );
  }
  const raw = (toolUse?.input as { pages?: unknown } | undefined)?.pages;
  // Element-level salvage: one malformed page entry drops with a
  // count; it must not discard the ninety-nine read correctly.
  const { values: pages, salvaged } = salvageArray(raw, PageFindingSchema, 500);
  if (salvageIsFailure(pages.length, salvaged) || (pages.length === 0 && raw != null)) {
    logger.warn(
      { event: "scope.extract.invalid_shape", file: args.filename, stop: message.stop_reason, salvaged, kept: pages.length },
      "extraction shape rejected",
    );
    throw new Error(
      `extraction returned an invalid shape for ${args.filename}: ${pages.length} usable page(s), ${salvaged} rejected`,
    );
  }
  if (salvaged > 0) {
    logger.warn(
      { event: "scope.extract.salvaged", file: args.filename, salvaged, kept: pages.length },
      "malformed page entries dropped, extraction kept",
    );
  }
  const offset = args.range ? args.range.from - 1 : 0;
  logHeadroom("extract", message.usage.output_tokens, EXTRACT_MAX_TOKENS, {
    file: args.filename,
  });
  return {
    pages: offset === 0 ? pages : pages.map((p) => ({ ...p, page: p.page + offset })),
    usage: usageOf(message),
    salvaged,
  };
}

export async function extractDocument(args: {
  bytes: Uint8Array;
  filename: string;
  kind: string;
  projectType: ScopeProjectType;
  /** The living vocabulary — learned items the model may evidence. */
  extensions?: ExtensionItem[];
}): Promise<{
  findings: DocumentFindings;
  usage: StageUsage;
  /** Ids the model proposed that the Standard does not define. */
  unknownIds: string[];
  /** Malformed elements dropped by schema salvage. */
  salvaged: number;
}> {
  // The API reads at most 100 PDF pages per request. Longer documents
  // used to fail outright — a 120-page specification was simply lost
  // from the pack. Now they extract in ranges and merge, findings
  // re-mapped to absolute page numbers.
  const shape = await loadPdfShape(args.bytes);
  let calls: Array<{ bytes: Uint8Array; range?: { from: number; to: number; total: number } }>;
  if (shape && shape.pageCount > CHUNK_PAGES) {
    const ranges = planChunks(shape.pageCount);
    calls = await Promise.all(
      ranges.map(async (r) => ({
        bytes: await shape.slice(r.from, r.to),
        range: { ...r, total: shape.pageCount },
      })),
    );
    logger.info(
      { event: "scope.extract.chunked", file: args.filename, pages: shape.pageCount, chunks: ranges.length },
      "document over the per-request page limit; extracting in ranges",
    );
  } else {
    calls = [{ bytes: args.bytes }];
  }

  let usage: StageUsage = { inputTokens: 0, outputTokens: 0 };
  let salvaged = 0;
  const allPages: DocumentFindings["pages"] = [];
  for (const call of calls) {
    const r = await extractCall({ ...args, bytes: call.bytes, range: call.range });
    usage = sumUsage(usage, r.usage);
    salvaged += r.salvaged;
    allPages.push(...r.pages);
  }

  // Closed vocabulary, enforced in code as well as prompt: unknown ids
  // are dropped, never stored. The dropped VALUES are logged, not just
  // the count: an id the model keeps reaching for is a candidate the
  // Scope Standard may be missing, and that is how the vocabulary
  // learns from real packages. Learned extensions are valid ids too.
  const extIds = new Set((args.extensions ?? []).map((e) => e.id));
  const validId = (id: string) => getScopeItem(id) != null || extIds.has(id);
  const unknown = new Set<string>();
  const pages = allPages.map((p) => ({
    ...p,
    itemIds: p.itemIds.filter((id) => {
      const ok = validId(id);
      if (!ok) unknown.add(id);
      return ok;
    }),
    statedFigures: p.statedFigures.map((f) => ({
      ...f,
      itemId: f.itemId && validId(f.itemId) ? f.itemId : null,
    })),
  }));
  if (unknown.size > 0) {
    logger.warn(
      {
        event: "scope.extract.unknown_ids_dropped",
        file: args.filename,
        dropped: unknown.size,
        ids: [...unknown].slice(0, 40),
      },
      "extraction proposed ids outside the Scope Standard — dropped",
    );
  }
  return {
    findings: { pages },
    usage,
    unknownIds: [...unknown],
    salvaged,
  };
}

// ── stage 3 · synthesis ─────────────────────────────────────────────────

export interface SynthesisDocumentInput {
  documentId: string;
  filename: string;
  kind: string;
  revision: string | null;
  findings: DocumentFindings;
}

export const SelectionEntrySchema = z.object({
  itemId: z.string(),
  status: z.enum(["evidenced", "gap", "not_expected"]),
  citations: z
    .array(z.object({ documentId: z.string(), page: z.number().int().min(1) }))
    .default([])
    .transform((a) => a.slice(0, 20)),
  note: z
    .string()
    .nullish()
    .transform((v) => (v ? v.trim().slice(0, 600) : null)),
  /** The Partial grade: full = a builder can price this from the
   *  documents without assumption; partial = shown but quantities,
   *  specification or performance incomplete. Evidenced items only. */
  depth: z
    .enum(["full", "partial"])
    .nullish()
    .transform((v) => v ?? null),
  /** What is still needed, when depth is partial. */
  remaining: z
    .string()
    .nullish()
    .transform((v) => (v ? v.trim().slice(0, 300) : null)),
  /**
   * WHY the work is missing. Gaps only; null elsewhere.
   *
   * Deliberately NOT `enumish`, which substitutes a fallback for an
   * absent value. A fallback here would stamp "design_gap" on every
   * evidenced line in the pack and score as a confident wrong answer
   * on lines the model never meant to classify. Absent must stay
   * absent, and an unrecognised class must become absent too.
   */
  gapClass: z
    .string()
    .nullish()
    .transform((v) =>
      v && (GAP_CLASSES as readonly string[]).includes(v) ? v : null,
    ),
  /**
   * Could a builder put a fixed price on this without a material
   * assumption? Kept apart from `depth` because the Wallace pack
   * proved they are different questions: a wall-frame line carried a
   * full stud schedule and was still unpriceable, because bracing said
   * "refer engineering".
   */
  priceable: z
    .boolean()
    .nullish()
    .transform((v) => (typeof v === "boolean" ? v : null)),
  confidence: z.number().min(0).max(1).nullish().transform((v) => v ?? 0.5),
});

/** An off-standard capture: work no Standard item names, proposed by
 *  the synthesis with citations. The end of the silent drop. */
export const CaptureSchema = z.object({
  label: z
    .string()
    .min(3)
    .transform((v) => v.trim().slice(0, 120)),
  divisionId: z
    .string()
    .nullish()
    .transform((v) => v ?? null),
  citations: z
    .array(z.object({ documentId: z.string(), page: z.number().int().min(1) }))
    .default([])
    .transform((a) => a.slice(0, 10)),
  note: z
    .string()
    .nullish()
    .transform((v) => (v ? v.trim().slice(0, 300) : null)),
  confidence: z.number().min(0).max(1).nullish().transform((v) => v ?? 0.5),
});
export type SynthesisCapture = z.infer<typeof CaptureSchema>;
/** The published ceiling for overview prose. */
export const OVERVIEW_MAX_CHARS = 900;

/**
 * Clip prose to a ceiling at the last sentence boundary, so a long
 * overview reads as finished rather than truncated mid-word.
 */
function clipToSentence(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastStop = Math.max(
    cut.lastIndexOf(". "),
    cut.lastIndexOf("! "),
    cut.lastIndexOf("? "),
  );
  return lastStop > max * 0.5 ? cut.slice(0, lastStop + 1) : `${cut.trimEnd()}.`;
}

/**
 * The overview is the only PROSE the synthesis produces, and prose
 * runs long. It must never be able to discard the selection: a
 * summary over the ceiling is clipped at a sentence boundary, and
 * anything else malformed degrades the overview to null rather than
 * failing a run that read two hundred scope lines correctly.
 */
const OverviewSchema = z
  .object({
    summary: z
      .string()
      .min(60)
      .transform((v) => clipToSentence(v, OVERVIEW_MAX_CHARS)),
    dwellings: z.number().int().min(1).max(99).nullish().transform((v) => v ?? null),
    bedrooms: z.number().int().min(1).max(99).nullish().transform((v) => v ?? null),
    bathrooms: z.number().int().min(1).max(99).nullish().transform((v) => v ?? null),
    storeys: z.number().int().min(1).max(20).nullish().transform((v) => v ?? null),
  })
  .nullish()
  .transform((v) => v ?? null)
  .catch(null);


export type SynthesisOverview = NonNullable<z.infer<typeof OverviewSchema>>;

/**
 * A conflict summary over the ceiling clips at a sentence boundary —
 * the overview lesson applied to the other prose field. One long
 * summary must never discard a synthesis.
 */
export const ConflictSchema = z.object({
  summary: z
    .string()
    .min(10)
    .transform((v) => clipToSentence(v, 400)),
  citations: z
    .array(z.object({ documentId: z.string(), page: z.number().int().min(1) }))
    .default([])
    .transform((a) => a.slice(0, 10)),
  severity: z.enum(["attention", "high"]),
});

export interface SynthesisResult {
  overview: z.infer<typeof OverviewSchema>;
  items: Array<z.infer<typeof SelectionEntrySchema>>;
  conflicts: Array<z.infer<typeof ConflictSchema>>;
  captures: SynthesisCapture[];
}

/** Exposed so the overview's resilience rules can be pinned directly. */
export const SynthesisSchemaForTest = z.object({
  overview: OverviewSchema,
  items: z.array(SelectionEntrySchema),
  conflicts: z.array(ConflictSchema),
  captures: z.array(CaptureSchema).default([]),
});

const SYNTHESIS_TOOL: Anthropic.Tool = {
  name: "record_scope_synthesis",
  description:
    "Record the project's scope selection, gaps and conflicts from all documents' findings.",
  input_schema: {
    type: "object" as const,
    properties: {
      overview: {
        type: "object",
        description:
          "A short factual overview of the project as the documents describe it.",
        properties: {
          summary: {
            type: "string",
            description:
              "Two to four sentences (STRICTLY UNDER 900 CHARACTERS) describing the project purely from the documents: form, storeys, construction, notable systems and finishes. NEVER include the street address, lot number or any occupant name. Written for a homeowner, no jargon.",
          },
          dwellings: { type: "integer", description: "Dwelling count the documents show, if stated or clearly drawn." },
          bedrooms: { type: "integer", description: "Total bedrooms across all dwellings, only if countable from the documents." },
          bathrooms: { type: "integer", description: "Total bathrooms/ensuites across all dwellings, only if countable." },
          storeys: { type: "integer", description: "Storeys, if shown." },
        },
        required: ["summary"],
      },
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            itemId: { type: "string" },
            status: {
              type: "string",
              enum: ["evidenced", "gap", "not_expected"],
              description:
                "evidenced = the documents show it. gap = expected for this project type but not documented. not_expected = absent and legitimately so for this project.",
            },
            citations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  documentId: { type: "string" },
                  page: { type: "integer" },
                },
                required: ["documentId", "page"],
              },
              description:
                "MANDATORY for evidenced items: the strongest pages, up to 5. Empty for gap and not_expected.",
            },
            note: {
              type: ["string", "null"],
              description:
                "One line: for evidenced, what the documents say; for gap, why it is expected; for not_expected, why absence is fine.",
            },
            depth: {
              type: ["string", "null"],
              enum: ["full", "partial", null],
              description:
                "Evidenced items only. 'full' = a builder can price this work from the documents without assumption. 'partial' = the work is shown or implied but quantities, specification, performance or interfaces are incomplete. Null otherwise.",
            },
            remaining: {
              type: ["string", "null"],
              description:
                "When depth is 'partial': one line naming what is still needed ('shown on plans; no written specification or product schedule').",
            },
            gapClass: {
              type: ["string", "null"],
              enum: [
                "design_gap",
                "referenced_package_missing",
                "later_consultant_package",
                "delegated_design",
                "commercial_allowance",
                "contractor_obligation",
                "statutory",
                null,
              ],
              description:
                "GAPS ONLY, null otherwise. WHY the work is missing, which decides who the owner should go to. design_gap = the designer never resolved it. referenced_package_missing = the documents name a package that is not in the pack; ask for it, do not commission it. later_consultant_package = it belongs to engineering or a consultant set not yet issued. delegated_design = a trade designs it under the building contract (trusses, waterproofing falls). commercial_allowance = carried as a sum rather than designed (PC and PS items). contractor_obligation = the builder's own to arrange and was never a design question (scaffolding, site supervision, temporary works, waste, insurances). statutory = an authority decides it.",
            },
            priceable: {
              type: ["boolean", "null"],
              description:
                "EVIDENCED ITEMS ONLY, null otherwise. Could a builder put a FIXED price on this line today without a material assumption? This is a stricter question than depth. A line can be fully drawn and dimensioned and still be false here, because one governing input is deferred: anything that says 'refer engineering', 'to engineer's details', 'by others', 'TBC', 'allow', or that depends on a document the pack does not contain, is NOT priceable no matter how completely the rest is drawn.",
            },
            confidence: { type: "number", description: "0 to 1." },
          },
          required: ["itemId", "status", "citations", "note", "depth", "remaining", "gapClass", "priceable", "confidence"],
        },
      },
      captures: {
        type: "array",
        items: {
          type: "object",
          properties: {
            label: {
              type: "string",
              description: "Short professional name for the work, as a scope of works would print it.",
            },
            divisionId: {
              type: ["string", "null"],
              description: "The Scope Standard division this work belongs to, when clear.",
            },
            citations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  documentId: { type: "string" },
                  page: { type: "integer" },
                },
                required: ["documentId", "page"],
              },
            },
            note: {
              type: ["string", "null"],
              description: "One line: what the documents show of this work.",
            },
            confidence: { type: "number", description: "0 to 1." },
          },
          required: ["label", "divisionId", "citations", "note", "confidence"],
        },
        description:
          "Work the findings' offStandard entries name that NO Scope Standard item covers — one entry per distinct piece of work, citations merged. Empty array when everything maps.",
      },
      conflicts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            summary: { type: "string", description: "The contradiction, plainly stated with both readings." },
            citations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  documentId: { type: "string" },
                  page: { type: "integer" },
                },
                required: ["documentId", "page"],
              },
            },
            severity: { type: "string", enum: ["attention", "high"] },
          },
          required: ["summary", "citations", "severity"],
        },
      },
    },
    required: ["overview", "items", "conflicts", "captures"],
  },
};

const SYNTHESIS_RULES = `You are synthesising an Australian residential tender package: several documents' page-level findings, produced against the Scope Standard, are given as JSON.

Your job, in order:
0. THE OVERVIEW. Describe the project as the documents describe it: two to four sentences a homeowner would be proud to publish (form, storeys, construction, notable systems and finishes), plus the countable facts (dwellings, total bedrooms, total bathrooms, storeys) ONLY where the documents state or clearly show them; omit a count rather than guess it. NEVER include the street address, lot or plan numbers, or any person's name: the overview is published to builders before they unlock the address.
1. THE SELECTION. For every item id that any document evidences, emit ONE entry with status "evidenced", merged citations (the strongest pages across documents, up to 5) and a one-line note in the documents' own terms. No citation, no claim: an evidenced entry without citations will be discarded. For every evidenced item also judge DEPTH: "full" when the documents give a builder enough to price the work without assumption; "partial" when the work is shown or implied but quantities, specification, performance or interfaces are incomplete — and say in "remaining", in one line, what is still needed. Documented is not the same as priceable, and the difference is exactly what a builder needs to know.
   Selection discipline:
   - THE DRAWN DOCUMENTS GOVERN MATERIALS. What a building is framed, clad, roofed or finished in is established by elevations, sections, wall-type schedules and material legends on the architectural, structural and civil sets, and by a written specification. Energy reports model template constructions ("brick veneer" on a job with no brick), and generic construction notes repeat boilerplate; neither may establish a material system the drawings do not show. Where note or report text disagrees with the drawn system, the drawn system governs — mark the boilerplate variant not_expected with the reason, exactly as you would any absent system. Energy reports REMAIN authoritative for insulation values, glazing performance and air sealing; the geotechnical report REMAINS authoritative for ground conditions, footings and retaining recommendations.
   - ONE LINE PER SYSTEM. Each distinct external cladding or roofing system the documents show gets its OWN item line: metal cladding, fibre cement, timber, render, lightweight panel, stone are separate items, never folded into one line's note.
   - NOTES ARE LOCAL. Write each note ONLY from the pages you cite for that item. Never blend a material, product or figure from another document or another item into a note — external and internal variants of the same work take materials only from their own cited pages. A note that reaches beyond its citations will be caught and flagged in post-processing.
1b. THE CAPTURES. The findings' offStandard entries name work no Standard item covers. Carry EVERY distinct piece of off-standard work through as a capture — with a short professional label, the division it belongs to, merged citations and a one-line note. Merge only true duplicates of the same work; never editorialise a distinct finding away. If a Standard item genuinely covers the work it belongs in the selection instead, and post-processing checks this again, so when unsure keep the capture.
2. THE GAPS YOU CAN GROUND. Emit "gap" for items where the DOCUMENTS THEMSELVES make the silence pointed, with a one-line reason a homeowner could understand ("The drawings show a kitchen but no appliance schedule names the appliances"). Use "not_expected" where absence is clearly legitimate for this project (no pool shown anywhere means pool items are not_expected). Do NOT attempt an exhaustive sweep: every Standard item you do not mention is classified downstream in a dedicated pass, so completeness is not your burden here — precision and grounded notes are. When unsure between gap and not_expected, choose gap.
3. THE CONFLICTS. Where documents contradict each other (different figures for the same thing, plan vs specification mismatches, stale revisions disagreeing), record the conflict. Conflict discipline:
   - VISIBLE PRINT ONLY. A conflict may rest only on what pages visibly print. Where a finding's note reports hidden or template residue in a document's text layer (another project's details that the printed page does not show), that is document hygiene, not a conflict: never raise it, alone or merged into another conflict. A visible error on a printed page (a wrong address in a report's own introduction, say) IS a conflict; invisible residue never is.
   - THE PACK ANSWERS FIRST. Before recording an apparent breach or contradiction, check whether the pack itself resolves it — and say so. A NatHERS rating under the deemed-to-satisfy minimum inside a report that is itself a Performance Solution or Verification Method is not a breach: record at most "attention", naming the pathway and what remains to confirm. A geotechnical report stating a site classification (say Class P) alongside engineer-designed slab classes (H2, M) is standard AS 2870 practice, not a contradiction. An either/or compliance option (rainwater tank OR solar hot water) is a selection the owner must make; say "a selection is required", not that documents disagree.
   - BOTH SIDES CITED. Cite the page for EACH side of the disagreement — both documents, or both pages of one document. A conflict without citations is dropped in post-processing.
   - NAME THE RESOLUTION. End every summary with what settles it: which document governs, what the owner must select, or what a consultant must confirm.
   - SEVERITY IS EARNED. "high" is for unresolved contradictions that move price, design or compliance. Anything the pack itself already answers, and anything cosmetic, is at most "attention".
   - UNASSIGNED RESPONSIBILITY. Where the findings' notes show documents assigning a work package to others or excluding it without naming who carries it ("waterproofing by others", "NIC"), record an attention conflict quoting the disclaimer and naming what must be confirmed: who designs it, who warrants it, whose price carries it.

Discipline: cite only (documentId, page) pairs that exist in the findings you were given. Never invent evidence. When unsure between gap and not_expected, choose gap: a false gap costs a question, a false not_expected hides a hole in the tender.`;

export async function synthesiseRun(args: {
  projectType: ScopeProjectType;
  documents: SynthesisDocumentInput[];
  /** The living vocabulary — learned items the model may evidence. */
  extensions?: ExtensionItem[];
}): Promise<{ synthesis: SynthesisResult; usage: StageUsage; salvaged: number }> {
  // The filter drops pages carrying nothing, to keep the context on
  // pages that say something. It must test EVERY channel v7 added:
  // a general-notes sheet whose only content is "NO IRRIGATION" has no
  // itemIds and no figures, and dropping it would throw away the one
  // page in the pack that settles the question.
  const payload = JSON.stringify(
    args.documents.map((d) => ({
      documentId: d.documentId,
      filename: d.filename,
      kind: d.kind,
      revision: d.revision,
      pages: d.findings.pages.filter(
        (p) =>
          p.itemIds.length > 0 ||
          p.statedFigures.length > 0 ||
          (p.claims?.length ?? 0) > 0 ||
          (p.schedules?.length ?? 0) > 0 ||
          (p.offStandard?.length ?? 0) > 0 ||
          (p.docRefs?.length ?? 0) > 0 ||
          p.note,
      ),
    })),
  );

  // Everything code can settle, settled before the model is asked.
  const facts = collectFacts(args.documents);
  const factsBlock = renderFacts(facts);
  const message = await anthropic()
    .messages.stream({
    model: SYNTHESIS_MODEL,
    max_tokens: SYNTHESIS_MAX_TOKENS,
    // Adaptive thinking is live on the API for this model; the pinned
    // SDK's types predate it, hence the cast.
    thinking: { type: "adaptive" } as unknown as Anthropic.ThinkingConfigParam,
    system: [
      { type: "text", text: SYNTHESIS_RULES },
      {
        type: "text",
        text: ontologyDigest(args.projectType, args.extensions ?? []),
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [SYNTHESIS_TOOL],
    tool_choice: { type: "tool", name: SYNTHESIS_TOOL.name },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              `Project type: ${args.projectType}. The documents' findings:\n\n${payload}\n\n` +
              (factsBlock ? `${factsBlock}\n\n` : "") +
              `Record the synthesis with the record_scope_synthesis tool.`,
          },
        ],
      },
    ],
  })
    .finalMessage();
  const toolUse = message.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (message.stop_reason === "max_tokens") {
    throw new Error("synthesis truncated: the selection did not fit the token ceiling");
  }
  // Element-level salvage on both arrays: a malformed entry drops with
  // a count instead of discarding a synthesis that read two hundred
  // lines correctly. A dropped item is lossless downstream — it joins
  // the residual pool and the classifier answers it. Majority-malformed
  // still fails loudly.
  const rawInput = toolUse?.input as
    | { overview?: unknown; items?: unknown; conflicts?: unknown; captures?: unknown }
    | undefined;
  const itemsSalvage = salvageArray(rawInput?.items, SelectionEntrySchema, 400);
  const conflictsSalvage = salvageArray(rawInput?.conflicts, ConflictSchema, 40);
  const capturesSalvage = salvageArray(rawInput?.captures, CaptureSchema, 20);
  if (
    salvageIsFailure(itemsSalvage.values.length, itemsSalvage.salvaged) ||
    (itemsSalvage.values.length === 0 && rawInput?.items != null)
  ) {
    logger.warn(
      { event: "scope.synthesis.invalid_shape", stop: message.stop_reason, salvaged: itemsSalvage.salvaged },
      "synthesis shape rejected",
    );
    throw new Error(
      `synthesis returned an invalid shape: ${itemsSalvage.salvaged} entries rejected`,
    );
  }
  const salvagedCount =
    itemsSalvage.salvaged + conflictsSalvage.salvaged + capturesSalvage.salvaged;
  if (salvagedCount > 0) {
    logger.warn(
      { event: "scope.synthesis.salvaged", items: itemsSalvage.salvaged, conflicts: conflictsSalvage.salvaged, captures: capturesSalvage.salvaged },
      "malformed synthesis elements dropped, synthesis kept",
    );
  }
  const parsedOverview = OverviewSchema.safeParse(rawInput?.overview);

  // Post-processing enforcement, belt to the prompt's braces:
  //   - unknown ids dropped
  //   - evidenced without citations demoted to nothing (logged)
  //   - citations must reference documents that were actually given
  //   - one entry per item (first wins, duplicates logged)
  const validDocIds = new Set(args.documents.map((d) => d.documentId));
  const seen = new Set<string>();
  const items: SynthesisResult["items"] = [];
  let droppedUnknown = 0;
  let droppedUncited = 0;
  const synthesisExtIds = new Set((args.extensions ?? []).map((e) => e.id));
  const coreExtIds = new Set(
    (args.extensions ?? []).filter((e) => e.core).map((e) => e.id),
  );
  for (const entry of itemsSalvage.values) {
    if (!getScopeItem(entry.itemId) && !synthesisExtIds.has(entry.itemId)) {
      droppedUnknown += 1;
      continue;
    }
    // An evidence-only learned extension may not be declared a gap or
    // not_expected — its absence is simply silence. Core-tier learned
    // items ARE expected, so they take any status like authored items.
    if (
      synthesisExtIds.has(entry.itemId) &&
      !coreExtIds.has(entry.itemId) &&
      entry.status !== "evidenced"
    ) {
      continue;
    }
    if (seen.has(entry.itemId)) continue;
    seen.add(entry.itemId);
    const citations = entry.citations.filter((c) => validDocIds.has(c.documentId));
    if (entry.status === "evidenced" && citations.length === 0) {
      droppedUncited += 1;
      continue;
    }
    // Depth is an evidenced-only annotation; remaining rides only on
    // partial. Anything else is stripped so the grade stays honest.
    const depth = entry.status === "evidenced" ? entry.depth : null;
    items.push({
      ...entry,
      citations: entry.status === "evidenced" ? citations : [],
      depth,
      remaining: depth === "partial" ? entry.remaining : null,
    });
  }
  const conflicts = conflictsSalvage.values.map((c) => ({
    ...c,
    citations: c.citations.filter((x) => validDocIds.has(x.documentId)),
  }));
  // Captures: real documents only, and a division id the Standard
  // actually defines (or none). Standard-overlap hygiene runs in the
  // analysis layer where it is unit-testable.
  const captures = capturesSalvage.values.map((c) => ({
    ...c,
    divisionId:
      c.divisionId && SCOPE_DIVISIONS.some((d) => d.id === c.divisionId)
        ? c.divisionId
        : null,
    citations: c.citations.filter((x) => validDocIds.has(x.documentId)),
  }));
  if (droppedUnknown > 0 || droppedUncited > 0) {
    logger.warn(
      { event: "scope.synthesis.enforcement", droppedUnknown, droppedUncited },
      "synthesis entries dropped by post-processing rules",
    );
  }
  // Address hygiene, enforced beyond the prompt: an overview that
  // leaks digits-and-street shapes is blanked rather than published.
  let overview = parsedOverview.success ? parsedOverview.data : null;
  if (overview && /\b\d{1,5}[a-z]?\s+[A-Z][a-z]+\s+(Street|St|Road|Rd|Avenue|Ave|Court|Ct|Drive|Dr|Lane|Ln|Place|Pl|Crescent|Cres|Parade|Pde|Terrace|Tce|Grove|Gr|Close|Cl|Way|Boulevard|Blvd)\b/i.test(overview.summary)) {
    logger.warn(
      { event: "scope.synthesis.overview_address_blanked" },
      "overview summary looked like it carried an address; withheld",
    );
    overview = null;
  }
  logHeadroom("synthesis", message.usage.output_tokens, SYNTHESIS_MAX_TOKENS);

  // The guards run LAST, after every other enforcement rule, so nothing
  // downstream can undo them. They re-read the facts with the dwelling
  // count the synthesis just produced, which is a better number than
  // the one counted off the findings before the model had spoken.
  const finalFacts =
    overview?.dwellings && overview.dwellings !== facts.dwellings
      ? collectFacts(args.documents, { dwellings: overview.dwellings })
      : facts;
  const guarded = applyDeterministicGuards(
    { overview, items, conflicts, captures },
    finalFacts,
  );
  if (guarded.corrections.length > 0 || guarded.addedConflicts > 0) {
    logger.info(
      {
        event: "scope.synthesis.deterministic_guards",
        corrections: guarded.corrections.length,
        addedConflicts: guarded.addedConflicts,
        // The rules that fired, and how often. This is the line that
        // says WHICH rule moved a golden score.
        byRule: guarded.corrections.reduce<Record<string, number>>((acc, c) => {
          acc[c.rule] = (acc[c.rule] ?? 0) + 1;
          return acc;
        }, {}),
      },
      "deterministic guards overruled the synthesis",
    );
  }
  return {
    synthesis: guarded.synthesis,
    usage: usageOf(message),
    salvaged: salvagedCount,
  };
}

/* ── the residual classifier ────────────────────────────────────────── */

export const ResidualVerdictSchema = z.object({
  itemId: z.string(),
  verdict: z.enum(["gap", "not_expected"]),
  note: z
    .string()
    .nullish()
    .transform((v) => (v ? v.trim().slice(0, 300) : null)),
});

const RESIDUAL_TOOL: Anthropic.Tool = {
  name: "record_residual_verdicts",
  description:
    "For every listed item id, record whether its absence from the documents is a gap or legitimately not expected.",
  input_schema: {
    type: "object" as const,
    properties: {
      verdicts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            itemId: { type: "string" },
            verdict: {
              type: "string",
              enum: ["gap", "not_expected"],
              description:
                "gap = a builder would need this priced or answered for this project and the documents are silent. not_expected = absence is clearly legitimate for THIS project (no basement drawn means no basement tanking; single storey means no stairs).",
            },
            note: {
              type: ["string", "null"],
              description:
                "One line a homeowner understands: for a gap, what is missing and why it matters; for not_expected, why absence is fine. Ground it in this project's documents.",
            },
          },
          required: ["itemId", "verdict", "note"],
        },
      },
    },
    required: ["verdicts"],
  },
};

const RESIDUAL_RULES = `You are completing the read of an Australian residential tender package. The synthesis has already named every item the documents evidence. You are given the RESIDUAL list: every remaining item of the Scope Standard for this project type. The documents are silent on all of them; your only job is to judge each silence.

For EVERY item in the residual list, record exactly one verdict:
- "gap": a builder pricing this project would need the item answered, and the documents do not answer it. Most residuals on a drawings-only package are gaps: engineering, reports, service connections, selections, external works.
- "not_expected": absence is clearly legitimate for THIS project, judged from the overview and what IS evidenced. No pool anywhere means pool items are not_expected. Single storey means stairs are not_expected. A renovation with no roof work shown may make roofing items not_expected.

When unsure, choose "gap": a false gap costs one question; a false not_expected hides a hole in a tender. Never invent evidence and never cite; these items have none. Answer every id you are given and no others.`;

export async function classifyResidualItems(args: {
  projectType: ScopeProjectType;
  overviewSummary: string | null;
  registerKinds: string[];
  evidencedIds: string[];
  residualIds: string[];
  /** Learned items whose core tier put them in the expected pool. */
  extensions?: ExtensionItem[];
}): Promise<{
  verdicts: Map<string, { verdict: "gap" | "not_expected"; note: string | null }>;
  usage: StageUsage;
}> {
  if (args.residualIds.length === 0) {
    return { verdicts: new Map(), usage: { inputTokens: 0, outputTokens: 0 } };
  }
  const payload = JSON.stringify({
    projectType: args.projectType,
    overview: args.overviewSummary,
    documentKinds: args.registerKinds,
    evidencedItemIds: args.evidencedIds,
    residualItemIds: args.residualIds,
  });
  const message = await anthropic()
    .messages.stream({
      model: SYNTHESIS_MODEL,
      max_tokens: RESIDUAL_MAX_TOKENS,
      thinking: { type: "adaptive" } as unknown as Anthropic.ThinkingConfigParam,
      system: [
        { type: "text", text: RESIDUAL_RULES },
        {
          type: "text",
          text: ontologyDigest(args.projectType, args.extensions ?? []),
          cache_control: { type: "ephemeral" },
        },
      ],
      tools: [RESIDUAL_TOOL],
      tool_choice: { type: "tool", name: RESIDUAL_TOOL.name },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `The package's read so far:\n\n${payload}\n\nRecord a verdict for every residual item id with the record_residual_verdicts tool.`,
            },
          ],
        },
      ],
    })
    .finalMessage();
  if (message.stop_reason === "max_tokens") {
    throw new Error("residual classification truncated at the token ceiling");
  }
  const toolUse = message.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  // Salvage here is doubly safe: an unanswered residual defaults to a
  // gap carrying the Standard's own sentence, so a dropped verdict can
  // only ever make the read MORE cautious.
  const rawVerdicts = (toolUse?.input as { verdicts?: unknown } | undefined)
    ?.verdicts;
  const { values, salvaged } = salvageArray(rawVerdicts, ResidualVerdictSchema, 400);
  if (values.length === 0 && rawVerdicts != null && args.residualIds.length > 0) {
    logger.warn(
      { event: "scope.residual.invalid_shape", salvaged },
      "residual classification shape rejected",
    );
    throw new Error("residual classification invalid");
  }
  if (salvaged > 0) {
    logger.warn(
      { event: "scope.residual.salvaged", salvaged, kept: values.length },
      "malformed residual verdicts dropped; unanswered ids default to gap",
    );
  }
  const residualSet = new Set(args.residualIds);
  const verdicts = new Map<
    string,
    { verdict: "gap" | "not_expected"; note: string | null }
  >();
  for (const v of values) {
    if (!residualSet.has(v.itemId)) continue;
    if (verdicts.has(v.itemId)) continue;
    verdicts.set(v.itemId, { verdict: v.verdict, note: v.note });
  }
  logHeadroom("residual", message.usage.output_tokens, RESIDUAL_MAX_TOKENS);
  return { verdicts, usage: usageOf(message) };
}

/** Rough cost in USD for a run's usage ledger, using published
 *  per-million rates. Cache traffic is billed at 1.25× (write) and
 *  0.1× (read) of the input rate. Bookkeeping, not billing. */
export function estimateCostUsd(
  stages: Record<string, StageUsage | undefined>,
): number {
  const RATES: Record<string, { in: number; out: number }> = {
    classify: { in: 1, out: 5 },
    extract: { in: 5, out: 25 },
    synthesis: { in: 5, out: 25 },
    residual: { in: 5, out: 25 },
  };
  let usd = 0;
  for (const [stage, usage] of Object.entries(stages)) {
    if (!usage || typeof usage.inputTokens !== "number") continue;
    const rate = RATES[stage] ?? { in: 5, out: 25 };
    usd +=
      (usage.inputTokens / 1_000_000) * rate.in +
      (usage.outputTokens / 1_000_000) * rate.out +
      ((usage.cacheWriteTokens ?? 0) / 1_000_000) * rate.in * 1.25 +
      ((usage.cacheReadTokens ?? 0) / 1_000_000) * rate.in * 0.1;
  }
  return usd;
}
