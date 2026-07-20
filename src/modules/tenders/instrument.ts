/**
 * The Tender Submission Instrument — the structured question set every
 * builder completes after uploading their quote PDF.
 *
 * WHY THIS EXISTS. Two builder PDFs are incomparable by design: they
 * price different inclusions, hide different allowances and attach
 * different conditions. The instrument turns each submission into
 * structured data so the platform can put every quote against the same
 * scope — the coverage matrix, normalised totals and risk flags in the
 * comparison are all computed from these answers.
 *
 * DESIGN RULES
 *   - Fast to answer: yes/no, single selects, small numbers. A builder
 *     who knows their quote should finish in about ten minutes.
 *   - Nothing open-ended unless it genuinely can't be structured;
 *     every free-text field is optional colour, never required data.
 *   - Neutral wording. The instrument never implies a "right" answer —
 *     an honest "excluded" must feel as acceptable as "included".
 *     Comparison does the judging, not the form.
 *   - Prefill everything we already know (headline fields, cost
 *     lines), never ask twice.
 *
 * VERSIONING. The set is versioned as a whole (INSTRUMENT_VERSION).
 * Answers are stored per question id in tender_responses; a tender
 * records the version it answered (tenders.instrument_version).
 * Question ids are STABLE — never reuse an id for a different
 * meaning; retire and add instead.
 *
 * Sources consulted for coverage: HIA + Master Builders fixed-price
 * residential contract structures (VIC/NSW), Domestic Building
 * Contracts Act 1995 (VIC) deposit and progress-stage rules, Home
 * Building Act 1989 (NSW), first-resort Home Warranty (VIC, 1 July
 * 2026), and the recurring dispute drivers: provisional sums, prime
 * costs, site costs, exclusions and variations.
 */

import { TRADES, type TradeId } from "./trades";

export const INSTRUMENT_VERSION = 1;

/* ── question model ─────────────────────────────────────────────────── */

export type InstrumentQuestionType =
  | "bool" // yes / no
  | "select" // one of options
  | "multi" // any of options
  | "number" // plain integer (weeks, days, count)
  | "currency" // whole AUD
  | "percent" // 0–100
  | "text" // short free text (optional colour only)
  | "month" // "YYYY-MM"
  | "items" // repeating rows, shaped by itemFields
  | "matrix"; // scope coverage grid, rows from the trade list

export interface InstrumentOption {
  value: string;
  label: string;
}

export interface InstrumentItemField {
  key: string;
  label: string;
  type: "text" | "currency" | "percent";
}

export interface InstrumentQuestion {
  /** Stable id, namespaced by section: "price.fixed". Never reused. */
  id: string;
  /** The question as the builder reads it. */
  prompt: string;
  /** One quiet line under the prompt when the term needs no jargon. */
  help?: string;
  type: InstrumentQuestionType;
  options?: InstrumentOption[];
  itemFields?: InstrumentItemField[];
  /** Unit chip rendered beside numeric inputs: "weeks", "days", "%". */
  unit?: string;
  /**
   * Show only when another answer matches. Single-level on purpose —
   * deep branching makes forms feel endless.
   */
  showIf?: { qid: string; equals: boolean | string };
  /**
   * Prefill from data we already hold. The form seeds the answer and
   * the builder confirms rather than retypes.
   */
  prefill?:
    | "tender.totalPriceAud"
    | "tender.durationWeeks"
    | "tender.validityDays"
    | "tender.proposedStartMonth";
  /** Required for submission. Optional questions are colour, not gaps. */
  required: boolean;
}

export interface InstrumentSection {
  id: string;
  title: string;
  /** One sentence of intent shown under the section title. */
  intro: string;
  questions: InstrumentQuestion[];
}

/* ── option sets used more than once ────────────────────────────────── */

const YES_NO_ALLOWANCE: InstrumentOption[] = [
  { value: "included", label: "Included" },
  { value: "allowance", label: "Allowance only" },
  { value: "excluded", label: "Excluded" },
];

const WHO_OPTIONS: InstrumentOption[] = [
  { value: "builder", label: "We handle it" },
  { value: "owner", label: "Owner arranges" },
  { value: "already_done", label: "Already in place" },
];

/* ── the instrument ─────────────────────────────────────────────────── */

export const INSTRUMENT_SECTIONS: InstrumentSection[] = [
  {
    id: "price",
    title: "Price",
    intro:
      "What the headline number is, and how firmly it holds.",
    questions: [
      {
        id: "price.total",
        prompt: "Contract price, excluding GST",
        type: "currency",
        prefill: "tender.totalPriceAud",
        required: true,
      },
      {
        id: "price.fixed",
        prompt: "Is this a fixed price, not an estimate?",
        help: "Fixed means the contract sum only moves through variations, provisional sums and prime costs.",
        type: "bool",
        required: true,
      },
      {
        id: "price.validity",
        prompt: "How long does this price hold?",
        type: "number",
        unit: "days",
        prefill: "tender.validityDays",
        required: true,
      },
      {
        id: "price.escalation",
        prompt: "Does the contract contain a rise and fall or cost escalation clause?",
        help: "Any clause that lets the contract sum increase with material or labour costs.",
        type: "bool",
        required: true,
      },
      {
        id: "price.escalation_scope",
        prompt: "What can escalate?",
        type: "multi",
        options: [
          { value: "materials", label: "Materials" },
          { value: "labour", label: "Labour" },
          { value: "other", label: "Other costs" },
        ],
        showIf: { qid: "price.escalation", equals: true },
        required: true,
      },
      {
        id: "price.escalation_cap",
        prompt: "Is the escalation capped?",
        type: "select",
        options: [
          { value: "capped", label: "Yes, capped" },
          { value: "uncapped", label: "No cap" },
        ],
        showIf: { qid: "price.escalation", equals: true },
        required: true,
      },
      {
        id: "price.margin",
        prompt: "Builder's margin applied to variations",
        help: "The percentage added to cost when pricing a variation.",
        type: "percent",
        required: true,
      },
    ],
  },

  {
    id: "pcps",
    title: "Provisional sums and prime costs",
    intro:
      "The allowances inside the price, where two quotes most often part ways.",
    questions: [
      {
        id: "pcps.has_ps",
        prompt: "Does the quote contain provisional sums?",
        help: "An allowance for work that can't be priced exactly yet, e.g. site works or a retaining wall.",
        type: "bool",
        required: true,
      },
      {
        id: "pcps.ps_items",
        prompt: "List each provisional sum",
        type: "items",
        itemFields: [
          { key: "description", label: "What it covers", type: "text" },
          { key: "allowance", label: "Allowance (ex GST)", type: "currency" },
        ],
        showIf: { qid: "pcps.has_ps", equals: true },
        required: true,
      },
      {
        id: "pcps.has_pc",
        prompt: "Does the quote contain prime cost items?",
        help: "An allowance for a product not selected yet, e.g. appliances, tapware, tiles.",
        type: "bool",
        required: true,
      },
      {
        id: "pcps.pc_items",
        prompt: "List each prime cost item",
        type: "items",
        itemFields: [
          { key: "description", label: "Item", type: "text" },
          { key: "allowance", label: "Allowance (ex GST)", type: "currency" },
        ],
        showIf: { qid: "pcps.has_pc", equals: true },
        required: true,
      },
      {
        id: "pcps.overrun_margin",
        prompt: "Margin applied when a provisional sum or prime cost runs over its allowance",
        type: "percent",
        required: true,
      },
      {
        id: "pcps.basis",
        prompt: "Are the allowances based on the documented selections for this project?",
        help: "Answer no if any allowance is a generic figure rather than priced from these drawings and schedules.",
        type: "select",
        options: [
          { value: "documented", label: "Yes, priced from the documents" },
          { value: "partly", label: "Partly" },
          { value: "generic", label: "Generic allowances" },
        ],
        required: true,
      },
    ],
  },

  {
    id: "scope",
    title: "Scope coverage",
    intro:
      "Tap through what the price covers. This grid is what makes every quote comparable against the same scope.",
    questions: [
      {
        id: "scope.matrix",
        prompt: "For each part of the build, is it included in the price?",
        type: "matrix",
        required: true,
      },
      {
        id: "scope.exclusions_other",
        prompt: "Anything else excluded that an owner might assume is in?",
        type: "text",
        required: false,
      },
    ],
  },

  {
    id: "site",
    title: "Site and ground",
    intro:
      "Ground conditions sink more budgets than any other cause. What has been allowed for?",
    questions: [
      {
        id: "site.soil_report",
        prompt: "Is the price based on a soil report for this block?",
        type: "select",
        options: [
          { value: "site_report", label: "Yes, this site's report" },
          { value: "assumed", label: "Assumed classification" },
        ],
        required: true,
      },
      {
        id: "site.soil_class",
        prompt: "Soil classification the price assumes",
        type: "select",
        options: [
          { value: "a", label: "A · mostly sand or rock" },
          { value: "s", label: "S · slightly reactive" },
          { value: "m", label: "M · moderately reactive" },
          { value: "h", label: "H1/H2 · highly reactive" },
          { value: "e", label: "E · extremely reactive" },
          { value: "p", label: "P · problem site" },
        ],
        required: true,
      },
      {
        id: "site.rock",
        prompt: "If rock is found during excavation, is removal covered?",
        type: "select",
        options: [
          { value: "included", label: "Included in the price" },
          { value: "allowance", label: "Allowance only" },
          { value: "variation", label: "Charged as a variation" },
        ],
        required: true,
      },
      {
        id: "site.survey",
        prompt: "Contour and boundary survey",
        type: "select",
        options: WHO_OPTIONS,
        required: true,
      },
      {
        id: "site.engineering",
        prompt: "Structural engineering design and computations",
        type: "select",
        options: WHO_OPTIONS,
        required: true,
      },
      {
        id: "site.asbestos",
        prompt: "Asbestos testing and removal, where relevant",
        type: "select",
        options: [
          ...YES_NO_ALLOWANCE,
          { value: "not_applicable", label: "Not applicable" },
        ],
        required: true,
      },
      {
        id: "site.service_connections",
        prompt: "Which service connections does the price include?",
        type: "multi",
        options: [
          { value: "power", label: "Power" },
          { value: "water", label: "Water" },
          { value: "sewer", label: "Sewer" },
          { value: "stormwater", label: "Stormwater" },
          { value: "gas", label: "Gas" },
          { value: "nbn", label: "NBN / data" },
        ],
        required: true,
      },
    ],
  },

  {
    id: "compliance",
    title: "Approvals and insurance",
    intro:
      "Who gets the paperwork through, and what protects the owner while you build.",
    questions: [
      {
        id: "compliance.permit",
        prompt: "Building permit",
        type: "select",
        options: [
          { value: "builder", label: "We obtain it" },
          { value: "owner", label: "Owner obtains it" },
          { value: "in_place", label: "Already issued" },
        ],
        required: true,
      },
      {
        id: "compliance.permit_fees",
        prompt: "Are permit and authority fees included in the price?",
        type: "bool",
        required: true,
      },
      {
        id: "compliance.warranty_insurance",
        prompt: "Home warranty insurance will be provided for this job",
        help: "Domestic building insurance / Home Warranty (VIC), HBCF (NSW), QBCC home warranty (QLD).",
        type: "bool",
        required: true,
      },
      {
        id: "compliance.public_liability",
        prompt: "Public liability cover held",
        type: "select",
        options: [
          { value: "5m", label: "$5 million" },
          { value: "10m", label: "$10 million" },
          { value: "20m", label: "$20 million or more" },
        ],
        required: true,
      },
      {
        id: "compliance.contract_works",
        prompt: "Contract works insurance for the build period",
        type: "bool",
        required: true,
      },
      {
        id: "compliance.energy",
        prompt: "Energy compliance included",
        help: "NatHERS assessment (or BASIX in NSW) and any upgrades the report requires.",
        type: "select",
        options: [
          { value: "assessment_and_upgrades", label: "Assessment and required upgrades" },
          { value: "assessment_only", label: "Assessment only" },
          { value: "excluded", label: "Excluded" },
          { value: "in_place", label: "Already certified" },
        ],
        required: true,
      },
    ],
  },

  {
    id: "programme",
    title: "Programme",
    intro: "When you can start, how long you need, and what you commit to.",
    questions: [
      {
        id: "programme.start",
        prompt: "Earliest month you can start on site",
        type: "month",
        prefill: "tender.proposedStartMonth",
        required: true,
      },
      {
        id: "programme.duration",
        prompt: "Build period",
        type: "number",
        unit: "weeks",
        prefill: "tender.durationWeeks",
        required: true,
      },
      {
        id: "programme.weather",
        prompt: "Does the build period already include an inclement weather allowance?",
        type: "bool",
        required: true,
      },
      {
        id: "programme.weather_days",
        prompt: "Weather days allowed",
        type: "number",
        unit: "days",
        showIf: { qid: "programme.weather", equals: true },
        required: true,
      },
      {
        id: "programme.liquidated_damages",
        prompt: "Do you offer liquidated damages if handover runs late?",
        help: "A weekly amount payable to the owner when the build passes the contracted end date.",
        type: "bool",
        required: true,
      },
      {
        id: "programme.ld_amount",
        prompt: "Liquidated damages per week",
        type: "currency",
        showIf: { qid: "programme.liquidated_damages", equals: true },
        required: true,
      },
      {
        id: "programme.concurrent",
        prompt: "Projects you expect to be running alongside this one",
        type: "select",
        options: [
          { value: "0_2", label: "Up to 2" },
          { value: "3_5", label: "3 to 5" },
          { value: "6_plus", label: "6 or more" },
        ],
        required: true,
      },
    ],
  },

  {
    id: "payments",
    title: "Payments",
    intro: "The deposit and how progress claims arrive.",
    questions: [
      {
        id: "payments.deposit",
        prompt: "Deposit",
        help: "Statutory caps apply: in Victoria 5% for contracts over $20,000; in NSW 10%.",
        type: "percent",
        required: true,
      },
      {
        id: "payments.schedule_type",
        prompt: "How are progress payments structured?",
        type: "select",
        options: [
          { value: "standard_stages", label: "Standard stages (base, frame, lock-up, fixing, completion)" },
          { value: "custom_stages", label: "Custom stages" },
          { value: "monthly", label: "Monthly claims" },
        ],
        required: true,
      },
      {
        id: "payments.stages",
        prompt: "Set out the stages and their share of the price",
        type: "items",
        itemFields: [
          { key: "stage", label: "Stage", type: "text" },
          { key: "share", label: "Share of price", type: "percent" },
        ],
        showIf: { qid: "payments.schedule_type", equals: "custom_stages" },
        required: true,
      },
      {
        id: "payments.terms",
        prompt: "Payment terms on each claim",
        type: "select",
        options: [
          { value: "7", label: "7 days" },
          { value: "14", label: "14 days" },
          { value: "30", label: "30 days" },
        ],
        required: true,
      },
      {
        id: "payments.final_claim",
        prompt: "When is the final claim payable?",
        type: "select",
        options: [
          { value: "practical_completion", label: "At practical completion" },
          { value: "handover", label: "At handover, after the walkthrough" },
        ],
        required: true,
      },
    ],
  },

  {
    id: "contract",
    title: "Contract",
    intro: "The paper the price lives on.",
    questions: [
      {
        id: "contract.form",
        prompt: "Which contract will this job use?",
        type: "select",
        options: [
          { value: "hia", label: "HIA fixed price" },
          { value: "mba", label: "Master Builders fixed price" },
          { value: "cost_plus", label: "Cost plus" },
          { value: "custom", label: "Our own contract" },
        ],
        required: true,
      },
      {
        id: "contract.defects_liability",
        prompt: "Defects liability period after handover",
        type: "select",
        options: [
          { value: "3", label: "3 months" },
          { value: "6", label: "6 months" },
          { value: "12", label: "12 months" },
          { value: "24", label: "24 months" },
        ],
        required: true,
      },
      {
        id: "contract.variations_written",
        prompt: "Are variations always priced in writing before the work proceeds?",
        type: "bool",
        required: true,
      },
      {
        id: "contract.variation_fee",
        prompt: "Is there an administration fee per variation?",
        type: "bool",
        required: true,
      },
    ],
  },

  {
    id: "team",
    title: "Team and delivery",
    intro: "Who actually runs the job, day to day.",
    questions: [
      {
        id: "team.supervisor",
        prompt: "Will this project have a dedicated site supervisor?",
        type: "bool",
        required: true,
      },
      {
        id: "team.supervisor_load",
        prompt: "How many concurrent jobs does that supervisor carry?",
        type: "select",
        options: [
          { value: "1_2", label: "1 to 2" },
          { value: "3_5", label: "3 to 5" },
          { value: "6_plus", label: "6 or more" },
        ],
        showIf: { qid: "team.supervisor", equals: true },
        required: true,
      },
      {
        id: "team.in_house",
        prompt: "Which trades are your own people, rather than subcontractors?",
        type: "multi",
        options: [
          { value: "carpentry", label: "Carpentry" },
          { value: "concreting", label: "Concreting" },
          { value: "bricklaying", label: "Bricklaying" },
          { value: "plastering", label: "Plastering" },
          { value: "painting", label: "Painting" },
          { value: "none", label: "All trades subcontracted" },
        ],
        required: true,
      },
      {
        id: "team.crew_tenure",
        prompt: "How long have your core subcontract crews worked with you?",
        type: "select",
        options: [
          { value: "under_1", label: "Under a year" },
          { value: "1_3", label: "1 to 3 years" },
          { value: "3_plus", label: "3 years or more" },
        ],
        required: true,
      },
      {
        id: "team.contact",
        prompt: "Who is the owner's day-to-day contact?",
        type: "select",
        options: [
          { value: "director", label: "Director / owner of the business" },
          { value: "supervisor", label: "Site supervisor" },
          { value: "project_manager", label: "Project manager" },
        ],
        required: true,
      },
      {
        id: "team.updates",
        prompt: "How often do you commit to progress updates?",
        type: "select",
        options: [
          { value: "weekly", label: "Weekly" },
          { value: "fortnightly", label: "Fortnightly" },
          { value: "milestones", label: "At each stage" },
        ],
        required: true,
      },
    ],
  },

  {
    id: "aftercare",
    title: "After handover",
    intro: "What the owner can expect once they have the keys.",
    questions: [
      {
        id: "aftercare.walkthrough",
        prompt: "Pre-handover walkthrough with the owner to agree a defect list",
        type: "bool",
        required: true,
      },
      {
        id: "aftercare.response",
        prompt: "Response time you commit to for defect calls inside the liability period",
        type: "select",
        options: [
          { value: "48h", label: "Within 48 hours" },
          { value: "1w", label: "Within a week" },
          { value: "best_effort", label: "As soon as we can" },
        ],
        required: true,
      },
      {
        id: "aftercare.manual",
        prompt: "Owner receives a handover pack",
        help: "Warranties, manuals, certificates and finishes schedule in one place.",
        type: "bool",
        required: true,
      },
    ],
  },
];

/* ── scope matrix rows ──────────────────────────────────────────────── */

/**
 * Coverage states a builder can tap for each scope row. Kept to four
 * so the grid stays fast; nuance belongs in the PS/PC tables.
 */
export const SCOPE_STATES = [
  { value: "included", label: "Included" },
  { value: "allowance", label: "Allowance" },
  { value: "excluded", label: "Excluded" },
  { value: "not_applicable", label: "N/A" },
] as const;

export type ScopeState = (typeof SCOPE_STATES)[number]["value"];

/**
 * The scope grid rides on the same 28 trade categories the cost lines
 * use, so the coverage matrix and the price breakdown line up
 * one-for-one in comparison.
 */
export function scopeMatrixRows(): Array<{ id: TradeId; label: string }> {
  return TRADES.filter((t) => t.id !== "other").map((t) => ({
    id: t.id,
    label: t.label,
  }));
}

/* ── helpers ────────────────────────────────────────────────────────── */

export function allQuestions(): InstrumentQuestion[] {
  return INSTRUMENT_SECTIONS.flatMap((s) => s.questions);
}

const QUESTION_INDEX = new Map(allQuestions().map((q) => [q.id, q]));

export function getQuestion(qid: string): InstrumentQuestion | undefined {
  return QUESTION_INDEX.get(qid);
}

/**
 * Ids required for a complete submission, honouring showIf against a
 * given answer set (an unanswered gate keeps its dependants optional
 * until the gate is answered).
 */
export function requiredQuestionIds(
  answers: ReadonlyMap<string, unknown>,
): string[] {
  const ids: string[] = [];
  for (const q of allQuestions()) {
    if (!q.required) continue;
    if (q.showIf) {
      const gate = answers.get(q.showIf.qid);
      const gateValue =
        typeof gate === "object" && gate !== null && "v" in gate
          ? (gate as { v: unknown }).v
          : gate;
      if (gateValue !== q.showIf.equals) continue;
    }
    ids.push(q.id);
  }
  return ids;
}

/* ── answer validation ──────────────────────────────────────────────── */

const MATRIX_ROW_IDS = new Set(scopeMatrixRows().map((r) => r.id));
const SCOPE_STATE_VALUES = new Set<string>(SCOPE_STATES.map((s) => s.value));

/**
 * Save-time shape check: is this a well-formed value for the question
 * type? Deliberately permissive of PARTIAL answers (a half-marked
 * matrix, an items row mid-typing) — completeness is a separate,
 * stricter question answered by isAnswerComplete. `null` always
 * passes: it is how an answer is cleared.
 */
export function isValidAnswerShape(
  q: InstrumentQuestion,
  v: unknown,
): boolean {
  if (v === null) return true;
  switch (q.type) {
    case "bool":
      return typeof v === "boolean";
    case "select":
      return (
        typeof v === "string" && (q.options ?? []).some((o) => o.value === v)
      );
    case "multi":
      return (
        Array.isArray(v) &&
        v.every(
          (x) =>
            typeof x === "string" &&
            (q.options ?? []).some((o) => o.value === x),
        )
      );
    case "number":
    case "currency":
      return typeof v === "number" && Number.isFinite(v) && v >= 0;
    case "percent":
      return typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100;
    case "text":
      return typeof v === "string" && v.length <= 2000;
    case "month":
      return typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
    case "items": {
      if (!Array.isArray(v) || v.length > 50) return false;
      const fields = q.itemFields ?? [];
      const keys = new Set(fields.map((f) => f.key));
      return v.every((row) => {
        if (row === null || typeof row !== "object" || Array.isArray(row)) {
          return false;
        }
        return Object.entries(row as Record<string, unknown>).every(
          ([k, val]) => {
            if (!keys.has(k)) return false;
            if (val === null) return true;
            const f = fields.find((ff) => ff.key === k)!;
            if (f.type === "text") {
              return typeof val === "string" && val.length <= 500;
            }
            return (
              typeof val === "number" &&
              Number.isFinite(val) &&
              val >= 0 &&
              (f.type !== "percent" || val <= 100)
            );
          },
        );
      });
    }
    case "matrix": {
      if (typeof v !== "object" || Array.isArray(v)) return false;
      return Object.entries(v as Record<string, unknown>).every(
        ([rowId, state]) =>
          MATRIX_ROW_IDS.has(rowId as TradeId) &&
          typeof state === "string" &&
          SCOPE_STATE_VALUES.has(state),
      );
    }
  }
}

/**
 * Gate-time completeness: does this value FULLY answer the question?
 * The single definition shared by the checklist UI (progress ring,
 * "complete" banner) and the server submit gate, so the client can
 * never claim complete for a submission the server would refuse.
 */
export function isAnswerComplete(q: InstrumentQuestion, v: unknown): boolean {
  if (v === undefined || v === null) return false;
  // Completeness implies savability: a value the save path would refuse
  // (out-of-range percent, oversized text) must never show as "done".
  if (!isValidAnswerShape(q, v)) return false;
  switch (q.type) {
    case "bool":
      return typeof v === "boolean";
    case "select":
      return typeof v === "string" && v.length > 0;
    case "multi":
      return Array.isArray(v) && v.length > 0;
    case "number":
    case "currency":
    case "percent":
      return typeof v === "number" && Number.isFinite(v);
    case "text":
      return typeof v === "string" && v.trim().length > 0;
    case "month":
      return typeof v === "string" && v.length > 0;
    case "items": {
      if (!Array.isArray(v) || v.length === 0) return false;
      const fields = q.itemFields ?? [];
      return v.every((row) => {
        if (row === null || typeof row !== "object") return false;
        const r = row as Record<string, unknown>;
        return fields.every((f) =>
          f.type === "text"
            ? typeof r[f.key] === "string" &&
              (r[f.key] as string).trim().length > 0
            : typeof r[f.key] === "number" && Number.isFinite(r[f.key]),
        );
      });
    }
    case "matrix": {
      if (typeof v !== "object" || Array.isArray(v)) return false;
      const m = v as Record<string, unknown>;
      return scopeMatrixRows().every(
        (r) => typeof m[r.id] === "string" && SCOPE_STATE_VALUES.has(m[r.id] as string),
      );
    }
  }
}
