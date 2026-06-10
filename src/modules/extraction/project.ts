/**
 * extraction · architectural plans → structured project suggestions
 * (server-only).
 *
 * An owner uploads their architectural plan set (PDF); Claude reads the
 * drawings natively and returns the fields our publish wizard collects:
 * project type, address (from the title block), bed/bath/floors (from
 * the floor plans), land + build size bands (from the site plan / area
 * schedule), and a generated title + description. The owner then
 * reviews + edits every step — extraction only pre-fills.
 *
 * Same contract as the tender extractor: forced `tool_choice` onto one
 * tool whose input schema IS the return shape, then Zod re-validation +
 * enum-snapping before we trust it.
 */

import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import { logger } from "@/lib/logger";
import {
  projectTypeEnum,
  australianStateEnum,
  projectBudgetBandEnum,
  renovationScopeEnum,
  extensionTypeEnum,
  landSizeBandEnum,
  buildSizeBandEnum,
  extensionSizeBandEnum,
  existingAgeBandEnum,
} from "@/modules/projects/schema";

import { anthropic, EXTRACTION_MODEL } from "./client";

// ── public shape ─────────────────────────────────────────────────────

export interface ProjectExtraction {
  type: string | null;
  title: string | null;
  description: string | null;
  addressLine1: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floors: number | null;
  landSizeBand: string | null;
  buildSizeBand: string | null;
  dwellingCount: number | null;
  renovationScopeTags: string[];
  existingAgeBand: string | null;
  extensionType: string | null;
  extensionSizeBand: string | null;
  budgetBand: string | null;
  targetStartMonth: string | null;
  targetCompletionMonth: string | null;
  warnings: string[];
}

export type ProjectExtractionResult =
  | { ok: true; value: ProjectExtraction }
  | {
      ok: false;
      code: "unsupported_media" | "too_large" | "no_content" | "model_error";
      message: string;
    };

// ── limits + enum value sets ─────────────────────────────────────────

const MAX_PDF_BYTES = 28 * 1024 * 1024;

const TYPES = projectTypeEnum.enumValues;
const STATES = australianStateEnum.enumValues;
const BUDGETS = projectBudgetBandEnum.enumValues;
const SCOPES = renovationScopeEnum.enumValues;
const EXT_TYPES = extensionTypeEnum.enumValues;
const LAND_BANDS = landSizeBandEnum.enumValues;
const BUILD_BANDS = buildSizeBandEnum.enumValues;
const EXT_SIZE_BANDS = extensionSizeBandEnum.enumValues;
const AGE_BANDS = existingAgeBandEnum.enumValues;

const has = (vals: readonly string[], v: unknown): v is string =>
  typeof v === "string" && (vals as readonly string[]).includes(v);

// ── the forced tool ──────────────────────────────────────────────────

const EXTRACTION_TOOL: Anthropic.Tool = {
  name: "record_project_details",
  description:
    "Record the structured project details extracted from a set of " +
    "residential architectural plans, to pre-fill a project listing form. " +
    "Map every value to the closest enum option. Use null for anything the " +
    "drawings do not show — never invent an address, size, or count.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      type: {
        type: ["string", "null"],
        enum: [...TYPES, null] as unknown as string[],
        description:
          "Project type. New house → single_dwelling. Townhouses/units/" +
          "duplex/apartments (2+ dwellings) → multi_dwelling. Alterations " +
          "to an existing home → renovation. Adding floor area to an " +
          "existing home → extension.",
      },
      title: {
        type: ["string", "null"],
        description:
          "A short, specific listing title, e.g. \"Double-storey home, " +
          "Essendon\" or \"3-townhouse development, Niddrie\". From the " +
          "title block / project name. Max ~70 chars.",
      },
      description: {
        type: ["string", "null"],
        description:
          "A concise 2-4 sentence scope summary a builder would read first: " +
          "what's being built, storeys, key rooms/areas, notable inclusions " +
          "(garage, pool, alfresco). Plain text, drawn only from the plans. " +
          "NEVER include the street address, street name, unit number, or " +
          "postcode here — it is shown publicly before unlock, so the exact " +
          "location must stay out of the description.",
      },
      addressLine1: {
        type: ["string", "null"],
        description: "Street address from the title block, e.g. \"3 Deakin Street\".",
      },
      suburb: { type: ["string", "null"], description: "Suburb from the title block." },
      state: {
        type: ["string", "null"],
        enum: [...STATES, null] as unknown as string[],
        description: "Australian state/territory abbreviation.",
      },
      postcode: { type: ["string", "null"], description: "4-digit Australian postcode." },
      bedrooms: {
        type: ["integer", "null"],
        description: "Total bedrooms across the dwelling, counted from floor-plan room labels.",
      },
      bathrooms: {
        type: ["integer", "null"],
        description:
          "Total bathrooms (count ensuites + bathrooms; a powder room counts as 0.5, round to nearest whole).",
      },
      floors: {
        type: ["integer", "null"],
        description:
          "Number of storeys/levels (Ground=1, Ground+First=2, etc). From floor-plan sheet names or elevations.",
      },
      landSizeBand: {
        type: ["string", "null"],
        enum: [...LAND_BANDS, null] as unknown as string[],
        description:
          "Site/allotment area in m² mapped to a band: under_200 (<200), " +
          "200_400, 400_600, 600_800, 800_1000, over_1000 (>1000). From the " +
          "site plan area/title.",
      },
      buildSizeBand: {
        type: ["string", "null"],
        enum: [...BUILD_BANDS, null] as unknown as string[],
        description:
          "Total building floor area (GFA, incl. garage) in m² mapped to a " +
          "band: under_100 (<100), 100_150, 150_200, 200_250, 250_300, " +
          "300_400, over_400 (>400). From the area schedule if present.",
      },
      dwellingCount: {
        type: ["integer", "null"],
        description: "Number of dwellings (only for multi_dwelling — townhouses/units). Else null.",
      },
      renovationScopeTags: {
        type: "array",
        description:
          "For renovations only: which areas. Options: kitchen, bathroom, " +
          "kitchen_and_bathroom, full_internal, full_internal_and_external, " +
          "structural. Empty array otherwise.",
        items: { type: "string", enum: SCOPES as unknown as string[] },
      },
      existingAgeBand: {
        type: ["string", "null"],
        enum: [...AGE_BANDS, null] as unknown as string[],
        description:
          "For renovations/extensions: approx age of the existing building " +
          "in years (under_10, 10_25, 25_50, 50_75, over_75) if shown. Else null.",
      },
      extensionType: {
        type: ["string", "null"],
        enum: [...EXT_TYPES, null] as unknown as string[],
        description:
          "For extensions only: ground_floor, first_floor, ground_and_first, rear, or side.",
      },
      extensionSizeBand: {
        type: ["string", "null"],
        enum: [...EXT_SIZE_BANDS, null] as unknown as string[],
        description:
          "For extensions only: added area in m² mapped to under_20, 20_40, " +
          "40_60, 60_80, 80_100, over_100.",
      },
      budgetBand: {
        type: ["string", "null"],
        enum: [...BUDGETS, null] as unknown as string[],
        description:
          "Only if a construction cost/budget is explicitly stated on the " +
          "plans (rare). Bands: under_500k, 500k_1m, 1m_1_5m, 1_5m_2m, " +
          "2m_3m, 3m_5m, over_5m. Else null — do NOT estimate from size.",
      },
      targetStartMonth: {
        type: ["string", "null"],
        description: "\"YYYY-MM\" only if a commencement date is stated. Else null.",
      },
      targetCompletionMonth: {
        type: ["string", "null"],
        description: "\"YYYY-MM\" only if a completion date is stated. Else null.",
      },
    },
    required: ["renovationScopeTags"],
  },
};

// ── cached system prompt ─────────────────────────────────────────────

const SYSTEM_PROMPT =
  "You are an assistant for an Australian residential construction " +
  "marketplace. You read a set of architectural plans (a PDF of drawings) " +
  "and extract the project's key details to pre-fill a listing form that " +
  "the owner will review.\n\n" +
  "How to read residential plans:\n" +
  "- The TITLE BLOCK (usually bottom-right of each sheet, or the cover) " +
  "carries the project address, client/project name, and revision info — " +
  "use it for address, suburb, state, postcode, and the title.\n" +
  "- FLOOR PLANS show room labels — count BED/BEDROOM for bedrooms and " +
  "BATH/ENSUITE/WC for bathrooms. Sheet names like \"GROUND FLOOR PLAN\" / " +
  "\"FIRST FLOOR PLAN\" (or elevations) tell you the number of storeys.\n" +
  "- A SITE PLAN gives the allotment/site area (m²) → map to a land band. " +
  "An AREA SCHEDULE / GFA table gives total floor area (m²) → map to a " +
  "build band.\n" +
  "- Determine TYPE from what's drawn: a single new house = single_dwelling; " +
  "multiple units/townhouses = multi_dwelling (set dwellingCount); " +
  "alterations to an existing dwelling = renovation; added floor area = " +
  "extension.\n\n" +
  "Rules:\n" +
  "- Extract only what the drawings actually show. Use null when something " +
  "isn't present — never guess an address, size, budget, or date.\n" +
  "- Always map sizes/areas to the nearest provided band rather than " +
  "returning a raw number.\n" +
  "- Construction budget and dates are almost never on plans — leave them " +
  "null unless explicitly written.\n" +
  "- PRIVACY: the description is shown publicly to builders before they " +
  "unlock the project, so it must NEVER contain the street address, street " +
  "name, unit number, or postcode. Put those only in the address fields.\n" +
  "- Write a clean, specific title and a helpful 2-4 sentence description " +
  "of the building and its scope (never the street address) from what you " +
  "see.";

// ── Zod re-validation ────────────────────────────────────────────────

const RawExtraction = z.object({
  type: z.string().nullish(),
  title: z.string().nullish(),
  description: z.string().nullish(),
  addressLine1: z.string().nullish(),
  suburb: z.string().nullish(),
  state: z.string().nullish(),
  postcode: z.string().nullish(),
  bedrooms: z.number().nullish(),
  bathrooms: z.number().nullish(),
  floors: z.number().nullish(),
  landSizeBand: z.string().nullish(),
  buildSizeBand: z.string().nullish(),
  dwellingCount: z.number().nullish(),
  renovationScopeTags: z.array(z.string()).nullish(),
  existingAgeBand: z.string().nullish(),
  extensionType: z.string().nullish(),
  extensionSizeBand: z.string().nullish(),
  budgetBand: z.string().nullish(),
  targetStartMonth: z.string().nullish(),
  targetCompletionMonth: z.string().nullish(),
});

// ── helpers ──────────────────────────────────────────────────────────

function clampInt(
  n: number | null | undefined,
  min: number,
  max: number,
): number | null {
  if (n == null || !Number.isFinite(n)) return null;
  const r = Math.round(n);
  return r < min || r > max ? null : r;
}

function cleanText(s: string | null | undefined, maxLen: number): string | null {
  if (s == null) return null;
  const t = s.replace(/\s+/g, " ").trim();
  if (!t) return null;
  return t.length > maxLen ? t.slice(0, maxLen).trim() : t;
}

function pickEnum(vals: readonly string[], v: unknown): string | null {
  return has(vals, v) ? v : null;
}

function normaliseMonth(s: string | null | undefined): string | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const month = Number(m[2]);
  return month >= 1 && month <= 12 ? `${m[1]}-${m[2]}` : null;
}

function normalisePostcode(s: string | null | undefined): string | null {
  if (!s) return null;
  const m = /\b(\d{4})\b/.exec(s.trim());
  return m?.[1] ?? null;
}

/**
 * Belt-and-suspenders: if the model slips the street address or postcode
 * into the description (the prompt forbids it, but models drift), strip it.
 * The description is shown to builders before they unlock, so the exact
 * location must never leak through it.
 */
function stripAddressFromDescription(
  desc: string | null,
  addressLine1: string | null,
  postcode: string | null,
): string | null {
  if (!desc) return desc;
  let out = desc;
  for (const needle of [addressLine1, postcode]) {
    const n = needle?.trim();
    if (n && n.length >= 3) {
      const re = new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      out = out.replace(re, " ");
    }
  }
  out = out
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/^[\s,;:.-]+|[\s,;:.-]+$/g, "")
    .trim();
  return out || null;
}

function normalise(raw: z.infer<typeof RawExtraction>): ProjectExtraction {
  const type = pickEnum(TYPES, raw.type);
  const scopeTags = Array.from(
    new Set((raw.renovationScopeTags ?? []).filter((t) => has(SCOPES, t))),
  );
  const addressLine1 = cleanText(raw.addressLine1, 200);
  const postcode = normalisePostcode(raw.postcode);
  const description = stripAddressFromDescription(
    cleanText(raw.description, 2000),
    addressLine1,
    postcode,
  );

  return {
    type,
    title: cleanText(raw.title, 90),
    description,
    addressLine1,
    suburb: cleanText(raw.suburb, 80),
    state: pickEnum(STATES, raw.state?.toUpperCase?.() ?? raw.state),
    postcode,
    bedrooms: clampInt(raw.bedrooms, 0, 50),
    bathrooms: clampInt(raw.bathrooms, 0, 50),
    floors: clampInt(raw.floors, 1, 10),
    landSizeBand: pickEnum(LAND_BANDS, raw.landSizeBand),
    buildSizeBand: pickEnum(BUILD_BANDS, raw.buildSizeBand),
    dwellingCount: type === "multi_dwelling" ? clampInt(raw.dwellingCount, 2, 500) : null,
    renovationScopeTags: type === "renovation" ? scopeTags : [],
    existingAgeBand: pickEnum(AGE_BANDS, raw.existingAgeBand),
    extensionType: type === "extension" ? pickEnum(EXT_TYPES, raw.extensionType) : null,
    extensionSizeBand:
      type === "extension" ? pickEnum(EXT_SIZE_BANDS, raw.extensionSizeBand) : null,
    budgetBand: pickEnum(BUDGETS, raw.budgetBand),
    targetStartMonth: normaliseMonth(raw.targetStartMonth),
    targetCompletionMonth: normaliseMonth(raw.targetCompletionMonth),
    warnings: [],
  };
}

// ── entry point ──────────────────────────────────────────────────────

export async function extractProjectFromPdf(args: {
  bytes: Uint8Array;
  contentType: string | null;
  filename?: string;
}): Promise<ProjectExtractionResult> {
  const { bytes, contentType } = args;

  const isPdf =
    (contentType ?? "").toLowerCase().includes("pdf") ||
    (args.filename ?? "").toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    return {
      ok: false,
      code: "unsupported_media",
      message: "Plan auto-fill needs a PDF. Upload your plans as a PDF and try again.",
    };
  }
  if (bytes.byteLength === 0) {
    return { ok: false, code: "no_content", message: "That file looks empty." };
  }
  if (bytes.byteLength > MAX_PDF_BYTES) {
    return {
      ok: false,
      code: "too_large",
      message: "That plan set is too large to scan. Try one under 28 MB.",
    };
  }

  const base64 = Buffer.from(bytes).toString("base64");

  try {
    const message = await anthropic().messages.create({
      model: EXTRACTION_MODEL,
      max_tokens: 4096,
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      ],
      tools: [EXTRACTION_TOOL],
      tool_choice: { type: "tool", name: EXTRACTION_TOOL.name },
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
              text:
                "Extract the project details from these architectural plans " +
                "and record them with the record_project_details tool.",
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
        message: "Couldn't read those plans. Fill the form in manually.",
      };
    }

    const parsed = RawExtraction.safeParse(toolUse.input);
    if (!parsed.success) {
      logger.warn(
        { event: "extraction.project.invalid_shape", issues: parsed.error.issues },
        "project extraction returned an unexpected shape",
      );
      return {
        ok: false,
        code: "model_error",
        message: "Couldn't read those plans cleanly. Fill the form in manually.",
      };
    }

    logger.info(
      {
        event: "extraction.project.ok",
        filename: args.filename,
        cacheRead: message.usage.cache_read_input_tokens ?? 0,
        cacheWrite: message.usage.cache_creation_input_tokens ?? 0,
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
      "architectural plans extracted",
    );

    return { ok: true, value: normalise(parsed.data) };
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      logger.error(
        { event: "extraction.project.api_error", status: err.status, name: err.name },
        "Anthropic API error during project extraction",
      );
    } else {
      logger.error(
        { event: "extraction.project.error", err },
        "unexpected error during project extraction",
      );
    }
    return {
      ok: false,
      code: "model_error",
      message: "The plan scanner is unavailable right now. Fill the form in manually.",
    };
  }
}
