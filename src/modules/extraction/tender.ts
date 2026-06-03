/**
 * extraction · tender quote → structured suggestions (server-only).
 *
 * A builder uploads their quote/tender PDF; Claude reads it natively
 * (no OCR/rasterisation on our side) and returns the fields our tender
 * composer needs: headline price, programme, validity, exclusions,
 * conditions, a short pitch, and a cost breakdown mapped onto our 28
 * fixed BoQ trades. The builder then reviews + edits — we never submit
 * extracted values straight through.
 *
 * Contract: forced `tool_choice` onto a single tool whose input schema
 * IS our return shape. That guarantees a well-formed object (no prose,
 * no markdown fences), which we then re-validate with Zod and normalise
 * (clamp ranges, snap trades to the taxonomy, round to whole dollars)
 * before trusting it.
 */

import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import { TRADES, type TradeId } from "@/modules/tenders/trades";
import { logger } from "@/lib/logger";

import { anthropic, EXTRACTION_MODEL } from "./client";

// ── public shape ─────────────────────────────────────────────────────

export interface ExtractedCostLine {
  trade: TradeId;
  /** Required when `trade === "other"`; otherwise the model's verbatim
   *  heading, kept for display even when we matched a known trade. */
  label: string | null;
  amountAud: number;
}

export interface TenderExtraction {
  totalPriceAud: number | null;
  durationWeeks: number | null;
  validityDays: number | null;
  /** "YYYY-MM" if the quote names a start month, else null. */
  proposedStartMonth: string | null;
  pitch: string | null;
  conditions: string | null;
  exclusions: string[];
  costLines: ExtractedCostLine[];
  /** Diagnostics for the UI — e.g. "breakdown sums to $X, headline is
   *  $Y" so the builder knows to reconcile. Never blocks. */
  warnings: string[];
}

export type TenderExtractionResult =
  | { ok: true; value: TenderExtraction }
  | { ok: false; code: "unsupported_media" | "too_large" | "no_content" | "model_error"; message: string };

// ── limits ───────────────────────────────────────────────────────────

/** Claude's PDF document block caps at ~32MB / 100 pages. Stay under it
 *  and fail fast with a friendly message rather than a 400 from the API. */
const MAX_PDF_BYTES = 28 * 1024 * 1024;

const TRADE_IDS = TRADES.map((t) => t.id) as [TradeId, ...TradeId[]];
const TRADE_ID_SET = new Set<string>(TRADE_IDS);

// ── the forced tool (its input schema = our return shape) ────────────

const EXTRACTION_TOOL: Anthropic.Tool = {
  name: "record_tender_quote",
  description:
    "Record the structured fields extracted from a builder's construction " +
    "tender/quote PDF so they can prefill a tender form. Map every cost " +
    "line to the closest trade id; use \"other\" with a label only when " +
    "nothing fits. Use null for anything the document does not state — " +
    "never guess a price, duration, or date.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      totalPriceAud: {
        type: ["integer", "null"],
        description:
          "Headline contract sum in whole Australian dollars, GST-inclusive " +
          "if the quote is inclusive. The single bottom-line total the " +
          "builder is quoting. Null if not clearly stated.",
      },
      durationWeeks: {
        type: ["integer", "null"],
        description:
          "Construction programme length in WEEKS. Convert months×~4.33 or " +
          "business-day counts as needed. Null if not stated.",
      },
      validityDays: {
        type: ["integer", "null"],
        description:
          "How many days the quote/price stays valid for. Null if not stated.",
      },
      proposedStartMonth: {
        type: ["string", "null"],
        description:
          "Proposed commencement month as \"YYYY-MM\" if the quote names one " +
          "(e.g. \"start August 2026\" → \"2026-08\"). Null otherwise.",
      },
      pitch: {
        type: ["string", "null"],
        description:
          "A concise 1-3 sentence value pitch drawn from the quote's cover " +
          "note / summary (experience, inclusions, why pick us). Plain text, " +
          "no markdown. Null if the document has none.",
      },
      conditions: {
        type: ["string", "null"],
        description:
          "Payment terms, qualifications, assumptions, and contractual " +
          "caveats, as a short plain-text summary. Null if none.",
      },
      exclusions: {
        type: "array",
        description:
          "Explicitly excluded scope items, each a short phrase " +
          "(e.g. \"Landscaping\", \"Council fees\"). Empty array if none.",
        items: { type: "string" },
      },
      costLines: {
        type: "array",
        description:
          "The priced breakdown / bill-of-quantities lines. One entry per " +
          "priced heading. Omit zero/POA lines and any grand-total row.",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            trade: {
              type: "string",
              enum: TRADE_IDS as unknown as string[],
              description:
                "Closest matching trade id from the fixed taxonomy. Use " +
                "\"other\" only when no trade fits.",
            },
            label: {
              type: ["string", "null"],
              description:
                "The quote's own heading for this line (required when trade " +
                "is \"other\"). Keep it short.",
            },
            amountAud: {
              type: "integer",
              description: "Line amount in whole Australian dollars.",
            },
          },
          required: ["trade", "amountAud"],
        },
      },
    },
    required: ["costLines", "exclusions"],
  },
};

// ── the cached instruction prefix ────────────────────────────────────
//
// Static across every request → marked cacheable. The volatile PDF
// rides in the user turn, never here, so this prefix stays a stable
// cache key.

const TAXONOMY_LINES = TRADES.map(
  (t) => `  - ${t.id} — ${t.label}${t.hint ? ` (${t.hint})` : ""}`,
).join("\n");

const SYSTEM_PROMPT =
  "You are a quantity-surveying assistant for an Australian residential " +
  "construction tendering marketplace. You read a builder's tender/quote " +
  "PDF and extract its key commercial fields so they can prefill a tender " +
  "form for the builder to review.\n\n" +
  "Rules:\n" +
  "- Extract only what the document states. Never invent or estimate a " +
  "price, duration, validity, or date. Use null when it is not present.\n" +
  "- All money is whole Australian dollars (round cents; strip \"$\" and " +
  "commas). If the quote is GST-inclusive, the headline total is the " +
  "inclusive figure.\n" +
  "- The breakdown lines need not sum exactly to the headline total — " +
  "transcribe what is printed; do not back-solve or balance it.\n" +
  "- Map each priced line to the single closest trade id below. Only use " +
  "\"other\" (with a short label) when nothing fits. Do not emit a line " +
  "for the grand total.\n\n" +
  "Trade taxonomy (id — label):\n" +
  TAXONOMY_LINES;

// ── Zod re-validation of the tool output ─────────────────────────────

const RawLine = z.object({
  trade: z.string(),
  label: z.string().nullish(),
  amountAud: z.number(),
});

const RawExtraction = z.object({
  totalPriceAud: z.number().nullish(),
  durationWeeks: z.number().nullish(),
  validityDays: z.number().nullish(),
  proposedStartMonth: z.string().nullish(),
  pitch: z.string().nullish(),
  conditions: z.string().nullish(),
  exclusions: z.array(z.string()).nullish(),
  costLines: z.array(RawLine).nullish(),
});

// ── helpers ──────────────────────────────────────────────────────────

function clampInt(
  n: number | null | undefined,
  min: number,
  max: number,
): number | null {
  if (n == null || !Number.isFinite(n)) return null;
  const r = Math.round(n);
  if (r < min || r > max) return null;
  return r;
}

function cleanText(
  s: string | null | undefined,
  maxLen: number,
): string | null {
  if (s == null) return null;
  const t = s.replace(/\s+/g, " ").trim();
  if (!t) return null;
  return t.length > maxLen ? t.slice(0, maxLen).trim() : t;
}

function normaliseStartMonth(s: string | null | undefined): string | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return `${m[1]}-${m[2]}`;
}

function normalise(raw: z.infer<typeof RawExtraction>): TenderExtraction {
  const warnings: string[] = [];

  const totalPriceAud = clampInt(raw.totalPriceAud, 1, 100_000_000);
  const durationWeeks = clampInt(raw.durationWeeks, 1, 520);
  const validityDays = clampInt(raw.validityDays, 1, 365);

  const seenLabels = new Set<string>();
  const costLines: ExtractedCostLine[] = [];
  for (const line of raw.costLines ?? []) {
    const amountAud = clampInt(line.amountAud, 1, 100_000_000);
    if (amountAud == null) continue; // drop POA / $0 / junk rows

    let trade: TradeId = "other";
    if (TRADE_ID_SET.has(line.trade)) {
      trade = line.trade as TradeId;
    }
    let label = cleanText(line.label, 80);
    // The server requires a non-empty label for "other" lines — backfill
    // one so the builder can rename rather than hit a validation wall.
    if (trade === "other" && !label) label = "Other works";

    costLines.push({ trade, label, amountAud });
  }
  // Drop accidental duplicate "other" labels that add no signal.
  const dedupedLines = costLines.filter((l) => {
    if (l.trade !== "other") return true;
    const key = (l.label ?? "").toLowerCase();
    if (seenLabels.has(key)) return false;
    seenLabels.add(key);
    return true;
  });

  const exclusions = Array.from(
    new Set(
      (raw.exclusions ?? [])
        .map((e) => cleanText(e, 120))
        .filter((e): e is string => Boolean(e)),
    ),
  ).slice(0, 40);

  // Surface a reconcile hint when the breakdown materially diverges from
  // the headline — the composer already renders variance, but flagging it
  // here lets the review screen prompt the builder.
  const sum = dedupedLines.reduce((acc, l) => acc + l.amountAud, 0);
  if (totalPriceAud != null && sum > 0) {
    const variance = Math.abs(sum - totalPriceAud);
    if (variance > Math.max(1000, totalPriceAud * 0.02)) {
      warnings.push(
        `Breakdown sums to $${sum.toLocaleString()} but the headline total is $${totalPriceAud.toLocaleString()} — review before submitting.`,
      );
    }
  }

  return {
    totalPriceAud,
    durationWeeks,
    validityDays,
    proposedStartMonth: normaliseStartMonth(raw.proposedStartMonth),
    pitch: cleanText(raw.pitch, 1200),
    conditions: cleanText(raw.conditions, 2000),
    exclusions,
    costLines: dedupedLines.slice(0, 60),
    warnings,
  };
}

// ── entry point ──────────────────────────────────────────────────────

/**
 * Extract structured tender fields from a quote PDF.
 *
 * @param bytes        the raw PDF body (read from R2 server-side)
 * @param contentType  the stored content type — must be a PDF
 * @param filename     for logging/diagnostics only
 */
export async function extractTenderFromPdf(args: {
  bytes: Uint8Array;
  contentType: string | null;
  filename?: string;
}): Promise<TenderExtractionResult> {
  const { bytes, contentType } = args;

  // Today we only support native-PDF extraction. (Images/DWG would need
  // a different block type; out of scope for the quote flow.)
  const isPdf =
    (contentType ?? "").toLowerCase().includes("pdf") ||
    (args.filename ?? "").toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    return {
      ok: false,
      code: "unsupported_media",
      message: "Quote auto-fill needs a PDF. Upload the quote as a PDF and try again.",
    };
  }
  if (bytes.byteLength === 0) {
    return { ok: false, code: "no_content", message: "That file looks empty." };
  }
  if (bytes.byteLength > MAX_PDF_BYTES) {
    return {
      ok: false,
      code: "too_large",
      message: "That PDF is too large to scan. Try one under 28 MB.",
    };
  }

  const base64 = Buffer.from(bytes).toString("base64");

  try {
    const message = await anthropic().messages.create({
      model: EXTRACTION_MODEL,
      max_tokens: 4096,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      tools: [EXTRACTION_TOOL],
      tool_choice: { type: "tool", name: EXTRACTION_TOOL.name },
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
                "Extract the tender fields from this quote PDF and record " +
                "them with the record_tender_quote tool.",
            },
          ],
        },
      ],
    });

    const toolUse = message.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );
    if (!toolUse) {
      return {
        ok: false,
        code: "model_error",
        message: "Couldn't read that quote. Fill the form in manually.",
      };
    }

    const parsed = RawExtraction.safeParse(toolUse.input);
    if (!parsed.success) {
      logger.warn(
        { event: "extraction.tender.invalid_shape", issues: parsed.error.issues },
        "tender extraction returned an unexpected shape",
      );
      return {
        ok: false,
        code: "model_error",
        message: "Couldn't read that quote cleanly. Fill the form in manually.",
      };
    }

    logger.info(
      {
        event: "extraction.tender.ok",
        filename: args.filename,
        cacheRead: message.usage.cache_read_input_tokens ?? 0,
        cacheWrite: message.usage.cache_creation_input_tokens ?? 0,
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
      "tender quote extracted",
    );

    return { ok: true, value: normalise(parsed.data) };
  } catch (err) {
    // Typed SDK exceptions — don't string-match.
    if (err instanceof Anthropic.APIError) {
      logger.error(
        { event: "extraction.tender.api_error", status: err.status, name: err.name },
        "Anthropic API error during tender extraction",
      );
    } else {
      logger.error(
        { event: "extraction.tender.error", err },
        "unexpected error during tender extraction",
      );
    }
    return {
      ok: false,
      code: "model_error",
      message: "The quote scanner is unavailable right now. Fill the form in manually.",
    };
  }
}
