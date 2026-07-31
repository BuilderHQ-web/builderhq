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
 * Bumped whenever a prompt, schema or model changes in a way that
 * makes older stage outputs incomparable. Extraction reuse across
 * runs keys on this: findings from a prior version are re-extracted,
 * never silently mixed.
 */
export const SCOPE_PIPELINE_VERSION = 2;

/** 28 MB — the same ceiling the plan auto-fill extractor uses. */
export const MAX_PDF_BYTES = 28 * 1024 * 1024;

/**
 * The API reads at most 100 PDF pages per request. Documents beyond
 * CHUNK_PAGES are split and extracted in ranges, findings re-mapped
 * to absolute page numbers. 80 leaves headroom under the hard limit
 * and keeps each chunk's output well inside the token ceiling.
 */
export const CHUNK_PAGES = 80;

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
 * The Scope Standard rendered for the model: one line per item with
 * id, label and aliases. ~10k tokens; cache_control makes the second
 * and every later call on a run read it from cache.
 */
export function ontologyDigest(projectType: ScopeProjectType): string {
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
      pageCount: { type: "integer", description: "Total pages in this PDF." },
    },
    required: ["kind", "title", "revision", "pageCount"],
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
      `classification invalid for ${args.filename} (stop: ${message.stop_reason})`,
    );
  }
  return {
    classification: shape
      ? { ...parsed.data, pageCount: shape.pageCount }
      : parsed.data,
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

export const PageFindingSchema = z.object({
  page: z.number().int().min(1),
  itemIds: z
    .array(z.string())
    .default([])
    .transform((a) => a.slice(0, 60)),
  statedFigures: z
    .array(
      z.object({
        label: clipped(200),
        value: clipped(200),
        itemId: z
          .string()
          .nullish()
          .transform((v) => v ?? null),
      }),
    )
    .default([])
    .transform((a) => a.slice(0, 60)),
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
                },
                required: ["label", "value", "itemId"],
              },
            },
            note: {
              type: ["string", "null"],
              description: "One short line only when something on the page needs a human's eye.",
            },
          },
          required: ["page", "itemIds", "statedFigures", "note"],
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
3. THE VOCABULARY IS CLOSED. Use only ids from the Scope Standard. If work appears that has no matching item, mention it in the page note instead.
4. Every page gets an entry, even if empty, so coverage is auditable.
5. VISIBLE CONTENT ONLY. Consultants build reports on templates from earlier jobs, and a PDF's text layer often carries invisible residue: white or hidden text, content buried under images, another project's details surviving beneath the printed page. Evidence is what the RENDERED page visibly shows a person holding the printout. If the text layer offers content that does not appear on the visible page — a different address, another report number, a second client or title block — treat it as template residue and ignore it entirely: no item, no figure, no note, no citation may rest on it. Text that IS visibly printed on the page is always in scope, even when it looks like an error; errors a reader can see are exactly what notes are for.`;

/** One extraction call over one PDF (whole document or a page range). */
async function extractCall(args: {
  bytes: Uint8Array;
  filename: string;
  kind: string;
  projectType: ScopeProjectType;
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
    max_tokens: 24_000,
    system: [
      { type: "text", text: EXTRACT_RULES },
      {
        type: "text",
        text: ontologyDigest(args.projectType),
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
      `extraction invalid for ${args.filename} (stop: ${message.stop_reason})`,
    );
  }
  if (salvaged > 0) {
    logger.warn(
      { event: "scope.extract.salvaged", file: args.filename, salvaged, kept: pages.length },
      "malformed page entries dropped, extraction kept",
    );
  }
  const offset = args.range ? args.range.from - 1 : 0;
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
  // learns from real packages.
  const unknown = new Set<string>();
  const pages = allPages.map((p) => ({
    ...p,
    itemIds: p.itemIds.filter((id) => {
      const ok = getScopeItem(id) != null;
      if (!ok) unknown.add(id);
      return ok;
    }),
    statedFigures: p.statedFigures.map((f) => ({
      ...f,
      itemId: f.itemId && getScopeItem(f.itemId) ? f.itemId : null,
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
  confidence: z.number().min(0).max(1).nullish().transform((v) => v ?? 0.5),
});
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
}

/** Exposed so the overview's resilience rules can be pinned directly. */
export const SynthesisSchemaForTest = z.object({
  overview: OverviewSchema,
  items: z.array(SelectionEntrySchema),
  conflicts: z.array(ConflictSchema),
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
            confidence: { type: "number", description: "0 to 1." },
          },
          required: ["itemId", "status", "citations", "note", "confidence"],
        },
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
    required: ["overview", "items", "conflicts"],
  },
};

const SYNTHESIS_RULES = `You are synthesising an Australian residential tender package: several documents' page-level findings, produced against the Scope Standard, are given as JSON.

Your job, in order:
0. THE OVERVIEW. Describe the project as the documents describe it: two to four sentences a homeowner would be proud to publish (form, storeys, construction, notable systems and finishes), plus the countable facts (dwellings, total bedrooms, total bathrooms, storeys) ONLY where the documents state or clearly show them; omit a count rather than guess it. NEVER include the street address, lot or plan numbers, or any person's name: the overview is published to builders before they unlock the address.
1. THE SELECTION. For every item id that any document evidences, emit ONE entry with status "evidenced", merged citations (the strongest pages across documents, up to 5) and a one-line note in the documents' own terms. No citation, no claim: an evidenced entry without citations will be discarded.
2. THE GAPS YOU CAN GROUND. Emit "gap" for items where the DOCUMENTS THEMSELVES make the silence pointed, with a one-line reason a homeowner could understand ("The drawings show a kitchen but no appliance schedule names the appliances"). Use "not_expected" where absence is clearly legitimate for this project (no pool shown anywhere means pool items are not_expected). Do NOT attempt an exhaustive sweep: every Standard item you do not mention is classified downstream in a dedicated pass, so completeness is not your burden here — precision and grounded notes are. When unsure between gap and not_expected, choose gap.
3. THE CONFLICTS. Where documents contradict each other (different figures for the same thing, plan vs specification mismatches, stale revisions disagreeing), record the conflict. Conflict discipline:
   - VISIBLE PRINT ONLY. A conflict may rest only on what pages visibly print. Where a finding's note reports hidden or template residue in a document's text layer (another project's details that the printed page does not show), that is document hygiene, not a conflict: never raise it, alone or merged into another conflict. A visible error on a printed page (a wrong address in a report's own introduction, say) IS a conflict; invisible residue never is.
   - THE PACK ANSWERS FIRST. Before recording an apparent breach or contradiction, check whether the pack itself resolves it — and say so. A NatHERS rating under the deemed-to-satisfy minimum inside a report that is itself a Performance Solution or Verification Method is not a breach: record at most "attention", naming the pathway and what remains to confirm. A geotechnical report stating a site classification (say Class P) alongside engineer-designed slab classes (H2, M) is standard AS 2870 practice, not a contradiction. An either/or compliance option (rainwater tank OR solar hot water) is a selection the owner must make; say "a selection is required", not that documents disagree.
   - BOTH SIDES CITED. Cite the page for EACH side of the disagreement — both documents, or both pages of one document. A conflict without citations is dropped in post-processing.
   - NAME THE RESOLUTION. End every summary with what settles it: which document governs, what the owner must select, or what a consultant must confirm.
   - SEVERITY IS EARNED. "high" is for unresolved contradictions that move price, design or compliance. Anything the pack itself already answers, and anything cosmetic, is at most "attention".

Discipline: cite only (documentId, page) pairs that exist in the findings you were given. Never invent evidence. When unsure between gap and not_expected, choose gap: a false gap costs a question, a false not_expected hides a hole in the tender.`;

export async function synthesiseRun(args: {
  projectType: ScopeProjectType;
  documents: SynthesisDocumentInput[];
}): Promise<{ synthesis: SynthesisResult; usage: StageUsage; salvaged: number }> {
  const payload = JSON.stringify(
    args.documents.map((d) => ({
      documentId: d.documentId,
      filename: d.filename,
      kind: d.kind,
      revision: d.revision,
      pages: d.findings.pages.filter(
        (p) => p.itemIds.length > 0 || p.statedFigures.length > 0 || p.note,
      ),
    })),
  );
  const message = await anthropic()
    .messages.stream({
    model: SYNTHESIS_MODEL,
    max_tokens: 32_000,
    // Adaptive thinking is live on the API for this model; the pinned
    // SDK's types predate it, hence the cast.
    thinking: { type: "adaptive" } as unknown as Anthropic.ThinkingConfigParam,
    system: [
      { type: "text", text: SYNTHESIS_RULES },
      {
        type: "text",
        text: ontologyDigest(args.projectType),
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
            text: `Project type: ${args.projectType}. The documents' findings:\n\n${payload}\n\nRecord the synthesis with the record_scope_synthesis tool.`,
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
    | { overview?: unknown; items?: unknown; conflicts?: unknown }
    | undefined;
  const itemsSalvage = salvageArray(rawInput?.items, SelectionEntrySchema, 400);
  const conflictsSalvage = salvageArray(rawInput?.conflicts, ConflictSchema, 40);
  if (
    salvageIsFailure(itemsSalvage.values.length, itemsSalvage.salvaged) ||
    (itemsSalvage.values.length === 0 && rawInput?.items != null)
  ) {
    logger.warn(
      { event: "scope.synthesis.invalid_shape", stop: message.stop_reason, salvaged: itemsSalvage.salvaged },
      "synthesis shape rejected",
    );
    throw new Error(`synthesis invalid (stop: ${message.stop_reason})`);
  }
  const salvagedCount = itemsSalvage.salvaged + conflictsSalvage.salvaged;
  if (salvagedCount > 0) {
    logger.warn(
      { event: "scope.synthesis.salvaged", items: itemsSalvage.salvaged, conflicts: conflictsSalvage.salvaged },
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
  for (const entry of itemsSalvage.values) {
    if (!getScopeItem(entry.itemId)) {
      droppedUnknown += 1;
      continue;
    }
    if (seen.has(entry.itemId)) continue;
    seen.add(entry.itemId);
    const citations = entry.citations.filter((c) => validDocIds.has(c.documentId));
    if (entry.status === "evidenced" && citations.length === 0) {
      droppedUncited += 1;
      continue;
    }
    items.push({ ...entry, citations: entry.status === "evidenced" ? citations : [] });
  }
  const conflicts = conflictsSalvage.values.map((c) => ({
    ...c,
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
  return {
    synthesis: { overview, items, conflicts },
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
      max_tokens: 24_000,
      thinking: { type: "adaptive" } as unknown as Anthropic.ThinkingConfigParam,
      system: [
        { type: "text", text: RESIDUAL_RULES },
        {
          type: "text",
          text: ontologyDigest(args.projectType),
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
