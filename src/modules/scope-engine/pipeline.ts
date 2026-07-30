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

/** 28 MB — the same ceiling the plan auto-fill extractor uses. */
export const MAX_PDF_BYTES = 28 * 1024 * 1024;

export interface StageUsage {
  inputTokens: number;
  outputTokens: number;
}

function usageOf(m: Anthropic.Message): StageUsage {
  return {
    inputTokens: m.usage.input_tokens,
    outputTokens: m.usage.output_tokens,
  };
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
  title: z.string().min(1).max(160),
  revision: z
    .string()
    .max(20)
    .nullish()
    .transform((v) => v ?? null),
  pageCount: z.number().int().min(1).max(500),
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
  const base64 = Buffer.from(args.bytes).toString("base64");
  const message = await anthropic().messages.create({
    model: CLASSIFY_MODEL,
    max_tokens: 1024,
    system:
      "You classify Australian residential construction documents. Read the title block and cover. Report only what is printed; never guess a revision that is not there.",
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
  return { classification: parsed.data, usage: usageOf(message) };
}

// ── stage 2 · extract ───────────────────────────────────────────────────

const PageFindingSchema = z.object({
  page: z.number().int().min(1),
  itemIds: z.array(z.string()).max(60).default([]),
  statedFigures: z
    .array(
      z.object({
        label: z.string().min(1).max(200),
        value: z.string().min(1).max(200),
        itemId: z
          .string()
          .nullish()
          .transform((v) => v ?? null),
      }),
    )
    .max(60)
    .default([]),
  note: z
    .string()
    .max(600)
    .nullish()
    .transform((v) => v ?? null),
});
const ExtractionSchema = z.object({ pages: z.array(PageFindingSchema).max(500) });
export type DocumentFindings = z.infer<typeof ExtractionSchema>;

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
4. Every page gets an entry, even if empty, so coverage is auditable.`;

export async function extractDocument(args: {
  bytes: Uint8Array;
  filename: string;
  kind: string;
  projectType: ScopeProjectType;
}): Promise<{ findings: DocumentFindings; usage: StageUsage }> {
  const base64 = Buffer.from(args.bytes).toString("base64");
  // Streamed: dense plan sets can exceed the SDK's non-streaming
  // duration guard. finalMessage() collects the complete response.
  const message = await anthropic()
    .messages.stream({
    model: EXTRACT_MODEL,
    max_tokens: 16_384,
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
            text: `This is a ${args.kind} document ("${args.filename}"). Record every page's findings with the record_page_findings tool.`,
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
  const parsed = ExtractionSchema.safeParse(toolUse?.input);
  if (!parsed.success) {
    logger.warn(
      { event: "scope.extract.invalid_shape", file: args.filename, stop: message.stop_reason, issues: parsed.error.issues.slice(0, 5) },
      "extraction shape rejected",
    );
    throw new Error(
      `extraction invalid for ${args.filename} (stop: ${message.stop_reason})`,
    );
  }
  // Closed vocabulary, enforced in code as well as prompt: unknown ids
  // are dropped and logged, never stored.
  let dropped = 0;
  const pages = parsed.data.pages.map((p) => ({
    ...p,
    itemIds: p.itemIds.filter((id) => {
      const ok = getScopeItem(id) != null;
      if (!ok) dropped += 1;
      return ok;
    }),
    statedFigures: p.statedFigures.map((f) => ({
      ...f,
      itemId: f.itemId && getScopeItem(f.itemId) ? f.itemId : null,
    })),
  }));
  if (dropped > 0) {
    logger.warn(
      { event: "scope.extract.unknown_ids_dropped", file: args.filename, dropped },
      "extraction proposed ids outside the Scope Standard — dropped",
    );
  }
  return { findings: { pages }, usage: usageOf(message) };
}

// ── stage 3 · synthesis ─────────────────────────────────────────────────

export interface SynthesisDocumentInput {
  documentId: string;
  filename: string;
  kind: string;
  revision: string | null;
  findings: DocumentFindings;
}

const SelectionEntrySchema = z.object({
  itemId: z.string(),
  status: z.enum(["evidenced", "gap", "not_expected"]),
  citations: z
    .array(z.object({ documentId: z.string(), page: z.number().int().min(1) }))
    .max(20)
    .default([]),
  note: z
    .string()
    .max(600)
    .nullish()
    .transform((v) => v ?? null),
  confidence: z.number().min(0).max(1).nullish().transform((v) => v ?? 0.5),
});
const OverviewSchema = z
  .object({
    summary: z.string().min(60).max(900),
    dwellings: z.number().int().min(1).max(99).nullish().transform((v) => v ?? null),
    bedrooms: z.number().int().min(1).max(99).nullish().transform((v) => v ?? null),
    bathrooms: z.number().int().min(1).max(99).nullish().transform((v) => v ?? null),
    storeys: z.number().int().min(1).max(20).nullish().transform((v) => v ?? null),
  })
  .nullish()
  .transform((v) => v ?? null);
export type SynthesisOverview = NonNullable<z.infer<typeof OverviewSchema>>;

const SynthesisSchema = z.object({
  overview: OverviewSchema,
  items: z.array(SelectionEntrySchema).max(400),
  conflicts: z
    .array(
      z.object({
        summary: z.string().min(10).max(400),
        citations: z
          .array(z.object({ documentId: z.string(), page: z.number().int().min(1) }))
          .max(10),
        severity: z.enum(["attention", "high"]),
      }),
    )
    .max(40),
});
export type SynthesisResult = z.infer<typeof SynthesisSchema>;

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
              "Two to four sentences describing the project purely from the documents: form, storeys, construction, notable systems and finishes. NEVER include the street address, lot number or any occupant name. Written for a homeowner, no jargon.",
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
2. THE GAPS. This step is NOT optional and an empty gap list on an incomplete package is a wrong answer. Walk EVERY division of the Scope Standard for this project type, in order, and for each commonly required item that no document evidences, emit "gap" with a one-line reason a homeowner could understand ("No soil report is included, so footing design cannot be confirmed"). A typical package with only architectural drawings should produce roughly 15 to 40 gaps: structural engineering, soil report, service connections, finishes selections and external works are usually silent. Use "not_expected" only where absence is clearly legitimate for this project (no pool shown anywhere means pool items are not_expected, not gaps); include not_expected entries only where a reader might genuinely wonder.
3. THE CONFLICTS. Where documents contradict each other (different figures for the same thing, plan vs specification mismatches, stale revisions disagreeing), record each conflict with both citations and severity "high" when it would change price or compliance.

Discipline: cite only (documentId, page) pairs that exist in the findings you were given. Never invent evidence. When unsure between gap and not_expected, choose gap: a false gap costs a question, a false not_expected hides a hole in the tender.`;

export async function synthesiseRun(args: {
  projectType: ScopeProjectType;
  documents: SynthesisDocumentInput[];
}): Promise<{ synthesis: SynthesisResult; usage: StageUsage }> {
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
  const parsed = SynthesisSchema.safeParse(toolUse?.input);
  if (!parsed.success) {
    logger.warn(
      { event: "scope.synthesis.invalid_shape", stop: message.stop_reason, issues: parsed.error.issues.slice(0, 5) },
      "synthesis shape rejected",
    );
    throw new Error(`synthesis invalid (stop: ${message.stop_reason})`);
  }

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
  for (const entry of parsed.data.items) {
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
  const conflicts = parsed.data.conflicts.map((c) => ({
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
  let overview = parsed.data.overview;
  if (overview && /\b\d{1,5}[a-z]?\s+[A-Z][a-z]+\s+(Street|St|Road|Rd|Avenue|Ave|Court|Ct|Drive|Dr|Lane|Ln|Place|Pl|Crescent|Cres|Parade|Pde|Terrace|Tce|Grove|Gr|Close|Cl|Way|Boulevard|Blvd)\b/i.test(overview.summary)) {
    logger.warn(
      { event: "scope.synthesis.overview_address_blanked" },
      "overview summary looked like it carried an address; withheld",
    );
    overview = null;
  }
  return { synthesis: { overview, items, conflicts }, usage: usageOf(message) };
}

/** Rough cost in USD for a run's usage ledger, using published
 *  per-million rates. Bookkeeping, not billing. */
export function estimateCostUsd(
  stages: Record<string, StageUsage | undefined>,
): number {
  const RATES: Record<string, { in: number; out: number }> = {
    classify: { in: 1, out: 5 },
    extract: { in: 5, out: 25 },
    synthesis: { in: 5, out: 25 },
  };
  let usd = 0;
  for (const [stage, usage] of Object.entries(stages)) {
    if (!usage) continue;
    const rate = RATES[stage] ?? { in: 5, out: 25 };
    usd +=
      (usage.inputTokens / 1_000_000) * rate.in +
      (usage.outputTokens / 1_000_000) * rate.out;
  }
  return usd;
}
