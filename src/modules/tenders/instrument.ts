/**
 * The Tender Submission Instrument — the structured question set that
 * IS the tender. A builder answers the deck; the answers form the
 * tender document; the evaluation reads the answers.
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
 *     who knows their quote finishes in about thirty minutes the first
 *     time, and far less once standing answers are saved.
 *   - Nothing open-ended unless it genuinely can't be structured;
 *     every free-text field is optional colour, never required data.
 *   - Neutral wording. The instrument never implies a "right" answer —
 *     an honest "excluded" must feel as acceptable as "included".
 *     Comparison does the judging, not the form.
 *   - Prefill everything we already know; never ask twice.
 *   - Single-level gates only (showIf): a question may depend on one
 *     earlier answer, never a chain.
 *
 * VERSIONING. The set is versioned as a whole (INSTRUMENT_VERSION).
 * Answers are stored per question id in tender_responses; a tender
 * records the version it answered (tenders.instrument_version).
 * Question ids are STABLE — never reuse an id for a different
 * meaning; retire and add instead. v1 remains defined below so tenders
 * submitted against it stay readable forever.
 *
 * v2 (2026-07): the twelve-module flow that reads the way a real
 * tender reads — eligibility, understanding, credentials, the offer,
 * inclusions, exclusions, allowances, programme, delivery, commentary,
 * documents, sign-off. Credibility before price. (Module 11,
 * supporting documents, lives on the tender workspace rather than in
 * the question set — uploads are files, not answers.)
 *
 * Sources consulted: HIA + Master Builders fixed-price residential
 * contract structures (VIC/NSW), Domestic Building Contracts Act 1995
 * (VIC) ss 11 + 40, Home Building Act 1989 (NSW), icare HBCF, QBCC
 * deposit and Home Warranty Scheme rules, and the recurring dispute
 * drivers: provisional sums, prime costs, site costs, exclusions and
 * variations. Statutory figures verified July 2026.
 */

import { TRADES, type TradeId } from "./trades";
import {
  isScheduleAnswerShape,
  isScheduleComplete,
  scheduleTallies,
  type ScheduleTallies,
  type TenderSchedule,
} from "./schedule";

export const INSTRUMENT_VERSION = 3;

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
  | "matrix" // scope coverage grid, rows from the trade list
  | "amounts" // optional per-trade dollars, captured on the grid rows
  | "schedule" // per-item confirmation of the client's tender schedule
  | "declare" // a declaration — complete only when affirmed
  | "confirm"; // confirm facts shown on the slide — complete only when affirmed

export interface InstrumentOption {
  value: string;
  label: string;
}

export interface InstrumentItemField {
  key: string;
  label: string;
  type: "text" | "currency" | "percent";
  /** A row is complete without this field. */
  optional?: boolean;
}

export interface InstrumentQuestion {
  /** Stable id, namespaced by section: "price.fixed". Never reused. */
  id: string;
  /** Display reference printed on the document ("4.6"). v2 only. */
  ref?: string;
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
   * deep branching makes forms feel endless. `equals` accepts one
   * value or a set of values (any match shows the question).
   */
  showIf?: {
    qid: string;
    equals: boolean | string | Array<boolean | string>;
  };
  /**
   * Multi questions only: the builder may add their own entries
   * beside the listed options. Custom values are free strings.
   */
  allowCustom?: boolean;
  /**
   * Not a slide of its own — captured inline within another question's
   * slide (e.g. extra exclusions edited on the confirm slide). Skipped
   * by the deck, resume, contents and review, like `amounts`.
   */
  inline?: boolean;
  /**
   * Prefill from data we already hold. The form seeds the answer and
   * the builder confirms rather than retypes.
   */
  prefill?:
    | "tender.totalPriceAud"
    | "tender.durationWeeks"
    | "tender.validityDays"
    | "tender.proposedStartMonth";
  /**
   * Builder-constant: the answer describes the business, not this
   * project, so it can carry from tender to tender. The standing-
   * answer vault (Phase B) persists these; the flag is authoritative
   * now so the deck can badge them.
   */
  standing?: boolean;
  /**
   * Which rounds ask this question. "legacy" questions are asked only
   * when the project has no approved tender schedule; "schedule"
   * questions only when it does. Unset asks always. Every surface
   * resolves presence through questionInPlay so the deck, the submit
   * gate, the document and the comparison can never disagree.
   */
  audience?: "legacy" | "schedule";
  /**
   * Document-aware presence (v3): the question exists only for rounds
   * whose register carries (or lacks) a key report. A soil report on
   * file turns "which class did you assume?" into "confirm you priced
   * to class M"; no structural on file removes the engineering
   * confirmation entirely. Resolved through questionInPlay, same as
   * audience, so every surface agrees.
   */
  presentWhen?:
    | "soil_on_file"
    | "soil_off_file"
    | "structural_on_file"
    | "energy_on_file";
  /** Required for submission. Optional questions are colour, not gaps. */
  required: boolean;
}

export interface InstrumentSection {
  id: string;
  title: string;
  /** One sentence of intent shown under the section title. */
  intro: string;
  /** The module's question in the builder's voice ("Can I actually
   *  tender this project?"). v2 only; drives the deck interstitials. */
  ask?: string;
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

const SUPERVISOR_LOAD_OPTIONS: InstrumentOption[] = [
  { value: "1_2", label: "1 to 2" },
  { value: "3_5", label: "3 to 5" },
  { value: "6_plus", label: "6 or more" },
];

/* ════════════════════════════════════════════════════════════════════
   INSTRUMENT v2 — the twelve-module tender
   ════════════════════════════════════════════════════════════════════ */

export const INSTRUMENT_SECTIONS_V2: InstrumentSection[] = [
  {
    id: "eligibility",
    title: "Eligibility",
    ask: "Can I actually tender this project?",
    intro:
      "Quick confirmations before the real work. They protect you as much as the owner, and most are one tap.",
    questions: [
      {
        id: "elig.authority",
        ref: "1.1",
        prompt: "I am authorised to submit this tender for my company",
        help: "Your registered entity and ABN print on your tender document exactly as they appear on your BuilderHQ profile, so the owner sees a proper letterhead from the first page.",
        type: "declare",
        required: true,
      },
      {
        id: "elig.licence",
        ref: "1.2",
        prompt: "My builder licence is current and covers work of this class",
        help: "The licence on your profile prints on the document. If it needs updating, update your profile before submitting.",
        type: "confirm",
        standing: true,
        required: true,
      },
      {
        id: "elig.insurance_pl",
        ref: "1.3",
        prompt: "My public liability insurance is current",
        type: "confirm",
        standing: true,
        required: true,
      },
      {
        id: "elig.warranty_eligible",
        ref: "1.4",
        prompt: "I can obtain home warranty cover for a contract of this size",
        help: "Domestic Building Insurance in Victoria (required over $16,000), HBCF in NSW (over $20,000), the QBCC Home Warranty Scheme in Queensland (over $3,300).",
        type: "bool",
        required: true,
      },
      {
        id: "elig.workers_comp",
        ref: "1.5",
        prompt: "Workers compensation cover",
        type: "select",
        options: [
          { value: "current", label: "Current policy" },
          { value: "not_required", label: "Not required, no employees" },
        ],
        standing: true,
        required: true,
      },
      {
        id: "elig.site_inspection",
        ref: "1.6",
        prompt: "Have you inspected the site?",
        type: "select",
        options: [
          { value: "inspected", label: "Inspected" },
          { value: "not_inspected", label: "Not inspected" },
        ],
        required: true,
      },
      {
        id: "elig.no_inspection_ack",
        ref: "1.6a",
        prompt: "I acknowledge this tender is priced without a full site inspection",
        help: "This is recorded on the tender document.",
        type: "declare",
        showIf: { qid: "elig.site_inspection", equals: "not_inspected" },
        required: true,
      },
      {
        id: "elig.docs_reviewed",
        ref: "1.7",
        prompt: "Have you reviewed the full tender document set?",
        help: "Every drawing, schedule and report the owner has provided, plus any addenda issued during the round.",
        type: "select",
        options: [
          { value: "full_set", label: "Full set reviewed" },
          { value: "partial", label: "Partially reviewed" },
        ],
        required: true,
      },
      {
        id: "elig.docs_outstanding",
        ref: "1.7a",
        prompt: "Which documents remain unreviewed?",
        type: "text",
        showIf: { qid: "elig.docs_reviewed", equals: "partial" },
        required: true,
      },
      {
        id: "elig.conditions",
        ref: "1.8",
        prompt: "I accept the conditions of this tender round",
        help: "The close date, the minimum validity period, confidentiality of the project documents, and the BuilderHQ Submission Standard. The same conditions bind every builder on the round, so you compete on a level field.",
        type: "declare",
        required: true,
      },
    ],
  },

  {
    id: "understanding",
    title: "Project understanding",
    ask: "Show them you know this job.",
    intro:
      "This is where careful builders pull ahead. Flagging a gap or a risk here reads as diligence, never as weakness, and it protects your price.",
    questions: [
      {
        id: "understand.scope_confirm",
        ref: "2.1",
        prompt: "Does the documented scope match the project as listed?",
        help: "Flag anything the drawings tell you that the listing does not.",
        type: "select",
        options: [
          { value: "matches", label: "Matches the documents" },
          { value: "discrepancy", label: "I found a discrepancy" },
        ],
        required: true,
      },
      {
        id: "understand.discrepancy",
        ref: "2.1a",
        prompt: "What differs between the listing and the documents?",
        type: "text",
        showIf: { qid: "understand.scope_confirm", equals: "discrepancy" },
        required: true,
      },
      {
        id: "understand.rfis",
        ref: "2.2",
        prompt: "Did you need clarifications while pricing?",
        type: "select",
        options: [
          { value: "none_needed", label: "None needed" },
          { value: "answered", label: "Asked and answered" },
          { value: "awaiting", label: "Awaiting answers" },
          { value: "assumed", label: "Priced on stated assumptions" },
        ],
        required: true,
      },
      {
        id: "understand.gaps",
        ref: "2.3",
        prompt: "Any gaps in the documents you priced around?",
        help: "A missing detail, an unclear junction, a schedule that stops short.",
        type: "bool",
        required: true,
      },
      {
        id: "understand.gap_items",
        ref: "2.3a",
        prompt: "List each gap and the assumption you made",
        type: "items",
        itemFields: [
          { key: "area", label: "Area", type: "text" },
          { key: "assumption", label: "Assumption made", type: "text" },
        ],
        showIf: { qid: "understand.gaps", equals: true },
        required: true,
      },
      {
        id: "understand.concerns",
        ref: "2.4",
        prompt: "Any design or constructability concerns to flag?",
        type: "bool",
        required: true,
      },
      {
        id: "understand.concern_items",
        ref: "2.4a",
        prompt: "List each concern",
        type: "items",
        itemFields: [
          { key: "area", label: "Area", type: "text" },
          { key: "concern", label: "Concern", type: "text" },
        ],
        showIf: { qid: "understand.concerns", equals: true },
        required: true,
      },
      {
        id: "understand.risks",
        ref: "2.5",
        prompt: "Which risks stand out on this project?",
        type: "multi",
        options: [
          { value: "site_access", label: "Site access" },
          { value: "ground", label: "Ground conditions" },
          { value: "existing_structure", label: "Existing structure unknowns" },
          { value: "services", label: "Services relocation" },
          { value: "overlays", label: "Overlays or heritage" },
          { value: "lead_times", label: "Material lead times" },
          { value: "labour", label: "Labour availability" },
          { value: "weather", label: "Weather window" },
          { value: "other", label: "Other" },
          { value: "none", label: "None significant" },
        ],
        required: true,
      },
      {
        id: "understand.risks_other",
        ref: "2.5a",
        prompt: "What other risk stands out?",
        help: "A line or two is plenty. Naming it shows the owner you have thought it through.",
        type: "text",
        showIf: { qid: "understand.risks", equals: "other" },
        required: true,
      },
    ],
  },

  {
    id: "credentials",
    title: "Company credentials",
    ask: "Why you, before your number.",
    intro:
      "Your track record and your team. This is what lets an owner choose you with confidence, even when you are not the cheapest. Saved once, it carries to your next tender.",
    questions: [
      {
        id: "creds.supervisor_role",
        ref: "3.1",
        prompt: "Who runs this project on site, day to day?",
        help: "Owners read hands-on supervision as a strength, whichever way you run it.",
        type: "select",
        options: [
          { value: "myself_director", label: "Myself, the director" },
          { value: "dedicated_supervisor", label: "A dedicated site supervisor" },
          { value: "project_manager", label: "A project manager" },
        ],
        required: true,
      },
      {
        id: "creds.supervisor",
        ref: "3.1a",
        prompt: "Their name and registration number",
        help: "Prints beside your programme so the owner knows exactly who runs their job. Include the registration number where your state registers supervisors.",
        type: "text",
        showIf: {
          qid: "creds.supervisor_role",
          equals: ["dedicated_supervisor", "project_manager"],
        },
        required: true,
      },
      {
        id: "team.supervisor_load",
        ref: "3.2",
        prompt: "How many jobs does that person carry at once?",
        help: "A low number here is a genuine selling point; answer honestly either way.",
        type: "select",
        options: SUPERVISOR_LOAD_OPTIONS,
        required: true,
      },
      {
        id: "team.contact",
        ref: "3.3",
        prompt: "Who is the owner's day-to-day contact?",
        type: "select",
        options: [
          { value: "director", label: "Director / owner of the business" },
          { value: "supervisor", label: "Site supervisor" },
          { value: "project_manager", label: "Project manager" },
        ],
        standing: true,
        required: true,
      },
      {
        id: "creds.experience_type",
        ref: "3.4",
        prompt: "Projects of this type you have completed",
        help: "Ranges are enough; nobody expects an exact count.",
        type: "select",
        options: [
          { value: "1_5", label: "1 to 5" },
          { value: "6_20", label: "6 to 20" },
          { value: "21_50", label: "21 to 50" },
          { value: "50_plus", label: "More than 50" },
        ],
        standing: true,
        required: true,
      },
      {
        id: "creds.largest_value",
        ref: "3.4a",
        prompt: "Largest completed contract value",
        type: "select",
        options: [
          { value: "under_500k", label: "Under $500k" },
          { value: "500k_1m", label: "$500k to $1m" },
          { value: "1m_2m", label: "$1m to $2m" },
          { value: "2m_5m", label: "$2m to $5m" },
          { value: "5m_plus", label: "Over $5m" },
        ],
        standing: true,
        required: true,
      },
      {
        id: "creds.references",
        ref: "3.5",
        prompt: "References the owner may contact",
        help: "Optional, but two referees regularly tip close decisions your way. Listing someone confirms they are happy to be contacted, and a link to the finished project helps the owner picture your work.",
        type: "items",
        itemFields: [
          { key: "name", label: "Name", type: "text" },
          { key: "project", label: "Project", type: "text" },
          { key: "year", label: "Year", type: "text" },
          { key: "contact", label: "Phone or email", type: "text" },
          {
            key: "link",
            label: "Link to the project (optional)",
            type: "text",
            optional: true,
          },
        ],
        standing: true,
        required: false,
      },
      {
        id: "programme.concurrent",
        ref: "3.6",
        prompt: "Projects you expect to be running alongside this one",
        help: "Capacity is asked fresh each tender. It shows the owner you have room for their job.",
        type: "select",
        options: [
          { value: "0_2", label: "Up to 2" },
          { value: "3_5", label: "3 to 5" },
          { value: "6_plus", label: "6 or more" },
        ],
        required: true,
      },
      {
        id: "team.in_house",
        ref: "3.7",
        prompt: "Which trades are your own people, rather than subcontractors?",
        help: "In-house trades signal control over quality and programme. Add any of yours that are not listed.",
        type: "multi",
        allowCustom: true,
        options: [
          { value: "carpentry", label: "Carpentry" },
          { value: "concreting", label: "Concreting" },
          { value: "bricklaying", label: "Bricklaying" },
          { value: "plastering", label: "Plastering" },
          { value: "painting", label: "Painting" },
          { value: "none", label: "All trades subcontracted" },
        ],
        standing: true,
        required: true,
      },
      {
        id: "team.crew_tenure",
        ref: "3.7a",
        prompt: "How long have your core subcontract crews worked with you?",
        help: "Long-standing crews are one of the strongest quality signals an owner can read.",
        type: "select",
        options: [
          { value: "under_1", label: "Under a year" },
          { value: "1_3", label: "1 to 3 years" },
          { value: "3_plus", label: "3 years or more" },
        ],
        standing: true,
        required: true,
      },
      {
        id: "creds.whs",
        ref: "3.8",
        prompt: "Your safety system",
        help: "Work health and safety. A certified system is externally audited, such as ISO 45001. A documented system is your own written procedures. SWMS are the safe work method statements every builder prepares for high-risk work, so that option is the compliant baseline, not a mark against you.",
        type: "select",
        options: [
          { value: "certified", label: "Certified WHS management system" },
          { value: "documented", label: "Documented system" },
          { value: "swms", label: "SWMS prepared as required" },
        ],
        standing: true,
        required: true,
      },
      {
        id: "creds.qa",
        ref: "3.8a",
        prompt: "Your quality control",
        help: "How finished work gets checked before the owner sees it. Choose every method you use.",
        type: "multi",
        options: [
          { value: "independent", label: "Independent stage inspections" },
          { value: "itp", label: "Documented inspection and test plans" },
          { value: "supervisor", label: "Supervisor checks" },
        ],
        standing: true,
        required: true,
      },
      {
        id: "creds.memberships",
        ref: "3.9",
        prompt: "Industry memberships",
        type: "multi",
        options: [
          { value: "hia", label: "HIA" },
          { value: "mba", label: "Master Builders" },
          { value: "none", label: "None" },
        ],
        standing: true,
        required: true,
      },
    ],
  },

  {
    id: "commercial",
    title: "Commercial submission",
    ask: "Your offer, put properly.",
    intro:
      "The number, and every term that shapes it. Each answer here is a question the owner would otherwise ring you about, so settling them now keeps your price credible.",
    questions: [
      {
        id: "contract.form",
        ref: "4.1",
        prompt: "Which contract will this job use?",
        type: "select",
        options: [
          { value: "hia", label: "HIA fixed price" },
          { value: "mba", label: "Master Builders fixed price" },
          { value: "cost_plus", label: "Cost plus" },
          { value: "custom", label: "Our own contract" },
        ],
        standing: true,
        required: true,
      },
      {
        id: "commercial.cost_plus_margin",
        ref: "4.1a",
        prompt: "Your cost-plus margin",
        help: "Cost-plus contracting for domestic work is restricted in most states; stating the margin plainly here is what makes a cost-plus offer readable.",
        type: "percent",
        showIf: { qid: "contract.form", equals: "cost_plus" },
        required: true,
      },
      {
        id: "price.total",
        ref: "4.2",
        prompt: "Contract price, excluding GST",
        type: "currency",
        prefill: "tender.totalPriceAud",
        required: true,
      },
      {
        id: "commercial.gst_registered",
        ref: "4.3",
        prompt: "I am registered for GST, and it applies to this price under the contract",
        help: "The GST-inclusive figure is calculated and shown beside your price, so the owner never mistakes which number is which.",
        type: "declare",
        standing: true,
        required: true,
      },
      {
        id: "price.fixed",
        ref: "4.4",
        prompt: "Is your price fixed, rather than an estimate?",
        help: "Fixed means the contract sum only moves through variations and the allowances you declare in module 7. Owners and their lenders strongly prefer fixed prices, so if yours is fixed, say so proudly. This question is not asked for cost-plus offers.",
        type: "bool",
        showIf: { qid: "contract.form", equals: ["hia", "mba", "custom"] },
        required: true,
      },
      {
        id: "price.validity",
        ref: "4.5",
        prompt: "How long does this price hold?",
        type: "number",
        unit: "days",
        prefill: "tender.validityDays",
        required: true,
      },
      {
        id: "payments.deposit",
        ref: "4.6",
        prompt: "Deposit",
        help: "Statutory caps apply: Victoria 5% at $20,000 or more, NSW 10%, Queensland 5% at $20,000 or more.",
        type: "percent",
        required: true,
      },
      {
        id: "payments.schedule_type",
        ref: "4.7",
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
        ref: "4.7a",
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
        ref: "4.8",
        prompt: "Payment terms on each claim",
        type: "select",
        options: [
          { value: "7", label: "7 days" },
          { value: "14", label: "14 days" },
          { value: "30", label: "30 days" },
        ],
        standing: true,
        required: true,
      },
      {
        id: "payments.final_claim",
        ref: "4.9",
        prompt: "When is the final claim payable?",
        type: "select",
        options: [
          { value: "practical_completion", label: "At practical completion" },
          { value: "handover", label: "At handover, after the walkthrough" },
        ],
        standing: true,
        required: true,
      },
      {
        id: "price.escalation",
        ref: "4.10",
        prompt: "Does the contract contain a rise and fall or cost escalation clause?",
        help: "Any clause that lets the contract sum increase with material or labour costs.",
        type: "bool",
        required: true,
      },
      {
        id: "price.escalation_scope",
        ref: "4.10a",
        prompt: "What can escalate?",
        help: "Add your own category if the listed ones do not fit.",
        type: "multi",
        allowCustom: true,
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
        ref: "4.10b",
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
        ref: "4.11",
        prompt: "Builder's margin applied to variations",
        help: "The percentage added to cost when pricing a variation.",
        type: "percent",
        standing: true,
        required: true,
      },
      {
        id: "commercial.alternatives",
        ref: "4.12",
        prompt: "Are you offering any alternative to the documented design or specification?",
        help: "Your price above must be for the documented scope. Alternatives are priced options beside it, never instead of it.",
        type: "bool",
        required: true,
      },
      {
        id: "commercial.alternative_items",
        ref: "4.12a",
        prompt: "List each alternative and its effect on the price",
        type: "items",
        itemFields: [
          { key: "description", label: "What changes", type: "text" },
          { key: "note", label: "Effect on price and programme", type: "text" },
        ],
        showIf: { qid: "commercial.alternatives", equals: true },
        required: true,
      },
    ],
  },

  {
    id: "scope",
    title: "What's included",
    ask: "Make your price readable.",
    intro:
      "Tap through what your price covers. A clear schedule is what stops a cheaper, vaguer quote from beating a properly priced one, and an honest exclusion never reads as a black mark.",
    questions: [
      {
        id: "scope.matrix",
        ref: "5.1",
        prompt: "For each part of the build, is it included in the price?",
        type: "matrix",
        audience: "legacy",
        required: true,
      },
      {
        // Captured inline on the coverage rows (an included trade offers
        // an optional amount field), never a slide of its own. The
        // amounts print as the itemised column of the coverage schedule.
        id: "scope.amounts",
        prompt: "Amount in your price, by trade",
        type: "amounts",
        audience: "legacy",
        required: false,
      },
      {
        // The schedule flip. On a round published through the scope
        // gate, the client's approved pack replaces the generic trade
        // grid: the builder walks the schedule division by division and
        // states what the price does with every line. One slide per
        // division; answers land as Record<itemId, {s, a?}>.
        id: "scope.schedule",
        ref: "5.1",
        prompt: "For each line of the tender schedule, what does your price do with it?",
        help: "Every line comes from the client's documents, read and checked before the round opened. Included as documented means priced exactly as drawn and specified.",
        type: "schedule",
        audience: "schedule",
        required: true,
      },
      {
        // The approved scope run the builder answered against, written
        // by the deck beside the first mark. Pins the tender to the
        // pack version it confirmed, so a later re-read can never
        // silently change what a submitted price meant.
        id: "scope.schedule_run",
        prompt: "Schedule reference",
        type: "text",
        audience: "schedule",
        inline: true,
        required: false,
      },
      {
        id: "site.soil_report",
        ref: "5.2",
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
        ref: "5.2a",
        prompt: "Soil classification the price assumes",
        help: "The class you have priced against, since there is no site report to confirm it.",
        type: "select",
        options: [
          { value: "a", label: "A · mostly sand or rock" },
          { value: "s", label: "S · slightly reactive" },
          { value: "m", label: "M · moderately reactive" },
          { value: "h", label: "H1/H2 · highly reactive" },
          { value: "e", label: "E · extremely reactive" },
          { value: "p", label: "P · problem site" },
        ],
        showIf: { qid: "site.soil_report", equals: "assumed" },
        required: true,
      },
      {
        id: "site.rock",
        ref: "5.3",
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
        ref: "5.4",
        prompt: "Contour and boundary survey",
        type: "select",
        options: WHO_OPTIONS,
        required: true,
      },
      {
        id: "site.engineering",
        ref: "5.5",
        prompt: "Structural engineering design and computations",
        type: "select",
        options: WHO_OPTIONS,
        required: true,
      },
      {
        id: "site.asbestos",
        ref: "5.6",
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
        ref: "5.7",
        prompt: "Which service connections does the price include?",
        type: "multi",
        options: [
          { value: "power", label: "Power" },
          { value: "water", label: "Water" },
          { value: "sewer", label: "Sewer" },
          { value: "stormwater", label: "Stormwater" },
          { value: "gas", label: "Gas" },
          { value: "nbn", label: "NBN / data" },
          { value: "none", label: "None included" },
        ],
        required: true,
      },
      {
        id: "compliance.permit",
        ref: "5.8",
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
        ref: "5.8a",
        prompt: "Are permit and authority fees included in the price?",
        type: "bool",
        required: true,
      },
      {
        id: "compliance.energy",
        ref: "5.9",
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
    id: "exclusions",
    title: "What's not included",
    ask: "Exclusions, stated plainly.",
    intro:
      "Your coverage grid already wrote most of your exclusion schedule. Confirm it, add anything the grid could not capture, and no owner can ever say they were not told.",
    questions: [
      {
        id: "excl.derived_confirm",
        ref: "6.1",
        prompt: "This is my exclusion schedule",
        help: "The lines you marked excluded are listed below. Add anything the marks could not capture on the same screen, then confirm. A written exclusion schedule is your best protection against scope disputes later.",
        type: "confirm",
        required: true,
      },
      {
        // Extra exclusions the grid can't express, added inline on the
        // 6.1 confirm slide (in front of the derived rows), never its
        // own screen. Prints on the exclusion schedule beside the grid's.
        id: "scope.exclusions_list",
        prompt: "Other exclusions",
        type: "items",
        itemFields: [{ key: "exclusion", label: "Exclusion", type: "text" }],
        inline: true,
        required: false,
      },
      {
        id: "excl.owner_supplied",
        ref: "6.2",
        prompt: "Is the owner supplying anything you will install or work around?",
        help: "Recording it here keeps the responsibility split clean from day one.",
        type: "bool",
        required: true,
      },
      {
        id: "excl.owner_supplied_items",
        ref: "6.2a",
        prompt: "List each owner-supplied item",
        type: "items",
        itemFields: [{ key: "item", label: "Item", type: "text" }],
        showIf: { qid: "excl.owner_supplied", equals: true },
        required: true,
      },
    ],
  },

  {
    id: "pcps",
    title: "Allowances",
    ask: "Provisional sums, prime costs, assumptions.",
    intro:
      "Declaring your allowances precisely is what makes your price trustworthy. Vague allowances are where other builders' quotes fall apart under an owner's questions; yours will not.",
    questions: [
      {
        id: "pcps.has_ps",
        ref: "7.1",
        prompt: "Does the price contain provisional sums?",
        help: "An allowance for work that can't be priced exactly yet, e.g. site works or a retaining wall.",
        type: "bool",
        audience: "legacy",
        required: true,
      },
      {
        id: "pcps.ps_items",
        ref: "7.1a",
        prompt: "List each provisional sum",
        type: "items",
        itemFields: [
          { key: "description", label: "What it covers", type: "text" },
          { key: "allowance", label: "Allowance (ex GST)", type: "currency" },
        ],
        showIf: { qid: "pcps.has_ps", equals: true },
        audience: "legacy",
        required: true,
      },
      {
        id: "pcps.has_pc",
        ref: "7.2",
        prompt: "Does the price contain prime cost items?",
        help: "An allowance for a product not selected yet, e.g. appliances, tapware, tiles.",
        type: "bool",
        audience: "legacy",
        required: true,
      },
      {
        id: "pcps.pc_items",
        ref: "7.2a",
        prompt: "List each prime cost item",
        type: "items",
        itemFields: [
          { key: "description", label: "Item", type: "text" },
          { key: "allowance", label: "Allowance (ex GST)", type: "currency" },
        ],
        showIf: { qid: "pcps.has_pc", equals: true },
        audience: "legacy",
        required: true,
      },
      {
        // The schedule flip. The allowance schedule is DERIVED from the
        // builder's line-by-line marks in module 5 — client allowances
        // carried or repriced, plus any line the builder flipped to an
        // allowance of their own. Nothing free-form to invent; the
        // builder reads the derived schedule and puts their name to it.
        id: "pcps.schedule_confirm",
        ref: "7.1",
        prompt: "This is my allowance schedule",
        help: "Built from your schedule answers: the client's allowances as you carried them, and every line you marked as an allowance with your figure. Change any line by returning to module 5.",
        type: "confirm",
        audience: "schedule",
        required: true,
      },
      {
        id: "pcps.overrun_margin",
        ref: "7.3",
        prompt: "Margin applied when a provisional sum or prime cost runs over its allowance",
        type: "percent",
        required: true,
      },
      {
        id: "pcps.basis",
        ref: "7.4",
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
      {
        id: "pcps.assumptions",
        ref: "7.5",
        prompt: "Any pricing assumptions the contract should record?",
        help: "Access, existing services capacity, staging, working hours, or anything else the price relies on.",
        type: "items",
        itemFields: [{ key: "assumption", label: "Assumption", type: "text" }],
        required: false,
      },
    ],
  },

  {
    id: "programme",
    title: "Programme",
    ask: "When you can start, how long you need.",
    intro:
      "Lead time first, so the owner never confuses can start in March with on site in March. A realistic programme you can hold beats an optimistic one you cannot.",
    questions: [
      {
        id: "prog.lead_time",
        ref: "8.1",
        prompt: "Lead time from acceptance to starting on site",
        help: "Contract signing, insurance certificates, permits and engineering all live in this window.",
        type: "select",
        options: [
          { value: "2_4", label: "2 to 4 weeks" },
          { value: "4_8", label: "4 to 8 weeks" },
          { value: "8_12", label: "8 to 12 weeks" },
          { value: "12_plus", label: "More than 12 weeks" },
        ],
        required: true,
      },
      {
        id: "programme.start",
        ref: "8.2",
        prompt: "Earliest month you can start on site",
        type: "month",
        prefill: "tender.proposedStartMonth",
        required: true,
      },
      {
        id: "programme.duration",
        ref: "8.3",
        prompt: "Build period",
        type: "number",
        unit: "weeks",
        prefill: "tender.durationWeeks",
        required: true,
      },
      {
        id: "programme.weather",
        ref: "8.4",
        prompt: "Does the build period already include an inclement weather allowance?",
        type: "bool",
        required: true,
      },
      {
        id: "programme.weather_days",
        ref: "8.4a",
        prompt: "Weather days allowed",
        help: "How many bad-weather days the build period already absorbs.",
        type: "number",
        unit: "days",
        showIf: { qid: "programme.weather", equals: true },
        required: true,
      },
      {
        id: "programme.weather_addon_days",
        ref: "8.4b",
        prompt: "Weather days assumed on top of the build period",
        help: "Days the programme may extend by for weather, so the owner reads a realistic finish rather than an optimistic one.",
        type: "number",
        unit: "days",
        showIf: { qid: "programme.weather", equals: false },
        required: true,
      },
      {
        id: "programme.liquidated_damages",
        ref: "8.5",
        prompt: "Do you offer liquidated damages if handover runs late?",
        help: "A weekly amount payable to the owner when the build passes the contracted end date.",
        type: "bool",
        required: true,
      },
      {
        id: "programme.ld_amount",
        ref: "8.5a",
        prompt: "Liquidated damages per week",
        type: "currency",
        showIf: { qid: "programme.liquidated_damages", equals: true },
        required: true,
      },
    ],
  },

  {
    id: "delivery",
    title: "Delivery",
    ask: "How you run a job, in writing.",
    intro:
      "Communication, variations, defects and aftercare. Owners choose builders they can picture working with; this module is where they picture you. Saved once, it carries to your next tender.",
    questions: [
      {
        id: "team.updates",
        ref: "9.1",
        prompt: "How often do you commit to progress updates?",
        type: "select",
        options: [
          { value: "weekly", label: "Weekly" },
          { value: "fortnightly", label: "Fortnightly" },
          { value: "milestones", label: "At each stage" },
        ],
        standing: true,
        required: true,
      },
      {
        id: "contract.variations_written",
        ref: "9.2",
        prompt: "Are variations always priced in writing before the work proceeds?",
        type: "bool",
        standing: true,
        required: true,
      },
      {
        id: "contract.variation_fee",
        ref: "9.2a",
        prompt: "Is there an administration fee per variation?",
        type: "bool",
        standing: true,
        required: true,
      },
      {
        id: "contract.defects_liability",
        ref: "9.3",
        prompt: "Defects liability period after handover",
        type: "select",
        options: [
          { value: "3", label: "3 months" },
          { value: "6", label: "6 months" },
          { value: "12", label: "12 months" },
          { value: "24", label: "24 months" },
        ],
        standing: true,
        required: true,
      },
      {
        id: "aftercare.walkthrough",
        ref: "9.4",
        prompt: "Pre-handover walkthrough with the owner to agree a defect list",
        type: "bool",
        standing: true,
        required: true,
      },
      {
        id: "aftercare.response",
        ref: "9.5",
        prompt: "Response time you commit to for defect calls inside the liability period",
        type: "select",
        options: [
          { value: "48h", label: "Within 48 hours" },
          { value: "1w", label: "Within a week" },
          { value: "best_effort", label: "As soon as we can" },
        ],
        standing: true,
        required: true,
      },
      {
        id: "aftercare.manual",
        ref: "9.6",
        prompt: "Owner receives a handover pack",
        help: "Warranties, manuals, certificates and finishes schedule in one place.",
        type: "bool",
        standing: true,
        required: true,
      },
    ],
  },

  {
    id: "commentary",
    title: "Builder commentary",
    ask: "This is where you stand out.",
    intro:
      "This module is yours. Every question so far made you comparable; this one makes you memorable. Most tenders never say why the builder is the right choice, and a few specific lines here regularly decide close rounds. All optional, all printed under your name.",
    questions: [
      {
        id: "comment.approach",
        ref: "10.1",
        prompt: "Your approach to this project",
        help: "Two or three sentences on how you would run this job well and what the owner can expect working with you. This is often the first thing an owner reads twice, so make it yours; specific beats long.",
        type: "text",
        required: false,
      },
      {
        id: "comment.value_engineering",
        ref: "10.2",
        prompt: "Value engineering suggestions",
        help: "Ways to save money or build smarter, with an indicative saving where you can put one. Nothing signals experience like a builder who finds the owner money.",
        type: "items",
        itemFields: [
          { key: "suggestion", label: "Suggestion", type: "text" },
          { key: "saving", label: "Indicative saving ($)", type: "currency", optional: true },
        ],
        required: false,
      },
      {
        id: "comment.recommendations",
        ref: "10.3",
        prompt: "Design recommendations",
        help: "Improvements you would raise before contract. Owners remember the builder who caught what others missed.",
        type: "items",
        itemFields: [
          { key: "area", label: "Area", type: "text" },
          { key: "recommendation", label: "Recommendation", type: "text" },
        ],
        required: false,
      },
      {
        id: "comment.risk_advice",
        ref: "10.4",
        prompt: "Risk advice for the owner",
        help: "Risks they should plan for, and how you would handle them. Straight talk here builds more trust than any brochure.",
        type: "items",
        itemFields: [
          { key: "risk", label: "Risk", type: "text" },
          { key: "handling", label: "How you would handle it", type: "text" },
        ],
        required: false,
      },
    ],
  },

  {
    id: "signoff",
    title: "Sign-off",
    ask: "The declaration that makes it a tender.",
    intro:
      "Read once, sign once. These declarations are what give your document its weight; your tender seals on submission and prints with a proper signature block.",
    questions: [
      {
        id: "sign.true_complete",
        ref: "12.1",
        prompt: "The information in this tender is true and complete",
        type: "declare",
        required: true,
      },
      {
        id: "sign.capable",
        ref: "12.2",
        prompt: "This offer stands and is capable of acceptance for its validity period",
        type: "declare",
        required: true,
      },
      {
        id: "sign.no_collusion",
        ref: "12.3",
        prompt: "This tender was prepared without collusion with any other tenderer",
        type: "declare",
        required: true,
      },
      {
        id: "sign.signatory",
        ref: "12.4",
        prompt: "Signatory full name",
        help: "Prints on the signature block of your tender document.",
        type: "text",
        required: true,
      },
      {
        id: "sign.role",
        ref: "12.5",
        prompt: "Signatory role",
        help: "Director, general manager, estimator — however you sign.",
        type: "text",
        required: true,
      },
    ],
  },
];

/* ════════════════════════════════════════════════════════════════════
   INSTRUMENT v1 — retained so tenders submitted against it stay
   readable forever. Closed: never edit meanings here.
   ════════════════════════════════════════════════════════════════════ */

export const INSTRUMENT_SECTIONS_V1: InstrumentSection[] = [
  {
    id: "price",
    title: "Price",
    intro: "What the headline number is, and how firmly it holds.",
    questions: [
      { id: "price.total", prompt: "Contract price, excluding GST", type: "currency", prefill: "tender.totalPriceAud", required: true },
      { id: "price.fixed", prompt: "Is this a fixed price, not an estimate?", help: "Fixed means the contract sum only moves through variations, provisional sums and prime costs.", type: "bool", required: true },
      { id: "price.validity", prompt: "How long does this price hold?", type: "number", unit: "days", prefill: "tender.validityDays", required: true },
      { id: "price.escalation", prompt: "Does the contract contain a rise and fall or cost escalation clause?", help: "Any clause that lets the contract sum increase with material or labour costs.", type: "bool", required: true },
      { id: "price.escalation_scope", prompt: "What can escalate?", type: "multi", options: [ { value: "materials", label: "Materials" }, { value: "labour", label: "Labour" }, { value: "other", label: "Other costs" } ], showIf: { qid: "price.escalation", equals: true }, required: true },
      { id: "price.escalation_cap", prompt: "Is the escalation capped?", type: "select", options: [ { value: "capped", label: "Yes, capped" }, { value: "uncapped", label: "No cap" } ], showIf: { qid: "price.escalation", equals: true }, required: true },
      { id: "price.margin", prompt: "Builder's margin applied to variations", help: "The percentage added to cost when pricing a variation.", type: "percent", required: true },
    ],
  },
  {
    id: "pcps",
    title: "Provisional sums and prime costs",
    intro: "The allowances inside the price, where two quotes most often part ways.",
    questions: [
      { id: "pcps.has_ps", prompt: "Does the quote contain provisional sums?", help: "An allowance for work that can't be priced exactly yet, e.g. site works or a retaining wall.", type: "bool", required: true },
      { id: "pcps.ps_items", prompt: "List each provisional sum", type: "items", itemFields: [ { key: "description", label: "What it covers", type: "text" }, { key: "allowance", label: "Allowance (ex GST)", type: "currency" } ], showIf: { qid: "pcps.has_ps", equals: true }, required: true },
      { id: "pcps.has_pc", prompt: "Does the quote contain prime cost items?", help: "An allowance for a product not selected yet, e.g. appliances, tapware, tiles.", type: "bool", required: true },
      { id: "pcps.pc_items", prompt: "List each prime cost item", type: "items", itemFields: [ { key: "description", label: "Item", type: "text" }, { key: "allowance", label: "Allowance (ex GST)", type: "currency" } ], showIf: { qid: "pcps.has_pc", equals: true }, required: true },
      { id: "pcps.overrun_margin", prompt: "Margin applied when a provisional sum or prime cost runs over its allowance", type: "percent", required: true },
      { id: "pcps.basis", prompt: "Are the allowances based on the documented selections for this project?", help: "Answer no if any allowance is a generic figure rather than priced from these drawings and schedules.", type: "select", options: [ { value: "documented", label: "Yes, priced from the documents" }, { value: "partly", label: "Partly" }, { value: "generic", label: "Generic allowances" } ], required: true },
    ],
  },
  {
    id: "scope",
    title: "Scope coverage",
    intro: "Tap through what the price covers. This grid is what makes every quote comparable against the same scope.",
    questions: [
      { id: "scope.matrix", prompt: "For each part of the build, is it included in the price?", type: "matrix", required: true },
      { id: "scope.exclusions_other", prompt: "Anything else excluded that an owner might assume is in?", type: "text", required: false },
    ],
  },
  {
    id: "site",
    title: "Site and ground",
    intro: "Ground conditions sink more budgets than any other cause. What has been allowed for?",
    questions: [
      { id: "site.soil_report", prompt: "Is the price based on a soil report for this block?", type: "select", options: [ { value: "site_report", label: "Yes, this site's report" }, { value: "assumed", label: "Assumed classification" } ], required: true },
      { id: "site.soil_class", prompt: "Soil classification the price assumes", type: "select", options: [ { value: "a", label: "A · mostly sand or rock" }, { value: "s", label: "S · slightly reactive" }, { value: "m", label: "M · moderately reactive" }, { value: "h", label: "H1/H2 · highly reactive" }, { value: "e", label: "E · extremely reactive" }, { value: "p", label: "P · problem site" } ], required: true },
      { id: "site.rock", prompt: "If rock is found during excavation, is removal covered?", type: "select", options: [ { value: "included", label: "Included in the price" }, { value: "allowance", label: "Allowance only" }, { value: "variation", label: "Charged as a variation" } ], required: true },
      { id: "site.survey", prompt: "Contour and boundary survey", type: "select", options: WHO_OPTIONS, required: true },
      { id: "site.engineering", prompt: "Structural engineering design and computations", type: "select", options: WHO_OPTIONS, required: true },
      { id: "site.asbestos", prompt: "Asbestos testing and removal, where relevant", type: "select", options: [ ...YES_NO_ALLOWANCE, { value: "not_applicable", label: "Not applicable" } ], required: true },
      { id: "site.service_connections", prompt: "Which service connections does the price include?", type: "multi", options: [ { value: "power", label: "Power" }, { value: "water", label: "Water" }, { value: "sewer", label: "Sewer" }, { value: "stormwater", label: "Stormwater" }, { value: "gas", label: "Gas" }, { value: "nbn", label: "NBN / data" } ], required: true },
    ],
  },
  {
    id: "compliance",
    title: "Approvals and insurance",
    intro: "Who gets the paperwork through, and what protects the owner while you build.",
    questions: [
      { id: "compliance.permit", prompt: "Building permit", type: "select", options: [ { value: "builder", label: "We obtain it" }, { value: "owner", label: "Owner obtains it" }, { value: "in_place", label: "Already issued" } ], required: true },
      { id: "compliance.permit_fees", prompt: "Are permit and authority fees included in the price?", type: "bool", required: true },
      { id: "compliance.warranty_insurance", prompt: "Home warranty insurance will be provided for this job", help: "Domestic building insurance / Home Warranty (VIC), HBCF (NSW), QBCC home warranty (QLD).", type: "bool", required: true },
      { id: "compliance.public_liability", prompt: "Public liability cover held", type: "select", options: [ { value: "5m", label: "$5 million" }, { value: "10m", label: "$10 million" }, { value: "20m", label: "$20 million or more" } ], required: true },
      { id: "compliance.contract_works", prompt: "Contract works insurance for the build period", type: "bool", required: true },
      { id: "compliance.energy", prompt: "Energy compliance included", help: "NatHERS assessment (or BASIX in NSW) and any upgrades the report requires.", type: "select", options: [ { value: "assessment_and_upgrades", label: "Assessment and required upgrades" }, { value: "assessment_only", label: "Assessment only" }, { value: "excluded", label: "Excluded" }, { value: "in_place", label: "Already certified" } ], required: true },
    ],
  },
  {
    id: "programme",
    title: "Programme",
    intro: "When you can start, how long you need, and what you commit to.",
    questions: [
      { id: "programme.start", prompt: "Earliest month you can start on site", type: "month", prefill: "tender.proposedStartMonth", required: true },
      { id: "programme.duration", prompt: "Build period", type: "number", unit: "weeks", prefill: "tender.durationWeeks", required: true },
      { id: "programme.weather", prompt: "Does the build period already include an inclement weather allowance?", type: "bool", required: true },
      { id: "programme.weather_days", prompt: "Weather days allowed", type: "number", unit: "days", showIf: { qid: "programme.weather", equals: true }, required: true },
      { id: "programme.liquidated_damages", prompt: "Do you offer liquidated damages if handover runs late?", help: "A weekly amount payable to the owner when the build passes the contracted end date.", type: "bool", required: true },
      { id: "programme.ld_amount", prompt: "Liquidated damages per week", type: "currency", showIf: { qid: "programme.liquidated_damages", equals: true }, required: true },
      { id: "programme.concurrent", prompt: "Projects you expect to be running alongside this one", type: "select", options: [ { value: "0_2", label: "Up to 2" }, { value: "3_5", label: "3 to 5" }, { value: "6_plus", label: "6 or more" } ], required: true },
    ],
  },
  {
    id: "payments",
    title: "Payments",
    intro: "The deposit and how progress claims arrive.",
    questions: [
      { id: "payments.deposit", prompt: "Deposit", help: "Statutory caps apply: in Victoria 5% for contracts over $20,000; in NSW 10%.", type: "percent", required: true },
      { id: "payments.schedule_type", prompt: "How are progress payments structured?", type: "select", options: [ { value: "standard_stages", label: "Standard stages (base, frame, lock-up, fixing, completion)" }, { value: "custom_stages", label: "Custom stages" }, { value: "monthly", label: "Monthly claims" } ], required: true },
      { id: "payments.stages", prompt: "Set out the stages and their share of the price", type: "items", itemFields: [ { key: "stage", label: "Stage", type: "text" }, { key: "share", label: "Share of price", type: "percent" } ], showIf: { qid: "payments.schedule_type", equals: "custom_stages" }, required: true },
      { id: "payments.terms", prompt: "Payment terms on each claim", type: "select", options: [ { value: "7", label: "7 days" }, { value: "14", label: "14 days" }, { value: "30", label: "30 days" } ], required: true },
      { id: "payments.final_claim", prompt: "When is the final claim payable?", type: "select", options: [ { value: "practical_completion", label: "At practical completion" }, { value: "handover", label: "At handover, after the walkthrough" } ], required: true },
    ],
  },
  {
    id: "contract",
    title: "Contract",
    intro: "The paper the price lives on.",
    questions: [
      { id: "contract.form", prompt: "Which contract will this job use?", type: "select", options: [ { value: "hia", label: "HIA fixed price" }, { value: "mba", label: "Master Builders fixed price" }, { value: "cost_plus", label: "Cost plus" }, { value: "custom", label: "Our own contract" } ], required: true },
      { id: "contract.defects_liability", prompt: "Defects liability period after handover", type: "select", options: [ { value: "3", label: "3 months" }, { value: "6", label: "6 months" }, { value: "12", label: "12 months" }, { value: "24", label: "24 months" } ], required: true },
      { id: "contract.variations_written", prompt: "Are variations always priced in writing before the work proceeds?", type: "bool", required: true },
      { id: "contract.variation_fee", prompt: "Is there an administration fee per variation?", type: "bool", required: true },
    ],
  },
  {
    id: "team",
    title: "Team and delivery",
    intro: "Who actually runs the job, day to day.",
    questions: [
      { id: "team.supervisor", prompt: "Will this project have a dedicated site supervisor?", type: "bool", required: true },
      { id: "team.supervisor_load", prompt: "How many concurrent jobs does that supervisor carry?", type: "select", options: SUPERVISOR_LOAD_OPTIONS, showIf: { qid: "team.supervisor", equals: true }, required: true },
      { id: "team.in_house", prompt: "Which trades are your own people, rather than subcontractors?", type: "multi", options: [ { value: "carpentry", label: "Carpentry" }, { value: "concreting", label: "Concreting" }, { value: "bricklaying", label: "Bricklaying" }, { value: "plastering", label: "Plastering" }, { value: "painting", label: "Painting" }, { value: "none", label: "All trades subcontracted" } ], required: true },
      { id: "team.crew_tenure", prompt: "How long have your core subcontract crews worked with you?", type: "select", options: [ { value: "under_1", label: "Under a year" }, { value: "1_3", label: "1 to 3 years" }, { value: "3_plus", label: "3 years or more" } ], required: true },
      { id: "team.contact", prompt: "Who is the owner's day-to-day contact?", type: "select", options: [ { value: "director", label: "Director / owner of the business" }, { value: "supervisor", label: "Site supervisor" }, { value: "project_manager", label: "Project manager" } ], required: true },
      { id: "team.updates", prompt: "How often do you commit to progress updates?", type: "select", options: [ { value: "weekly", label: "Weekly" }, { value: "fortnightly", label: "Fortnightly" }, { value: "milestones", label: "At each stage" } ], required: true },
    ],
  },
  {
    id: "aftercare",
    title: "After handover",
    intro: "What the owner can expect once they have the keys.",
    questions: [
      { id: "aftercare.walkthrough", prompt: "Pre-handover walkthrough with the owner to agree a defect list", type: "bool", required: true },
      { id: "aftercare.response", prompt: "Response time you commit to for defect calls inside the liability period", type: "select", options: [ { value: "48h", label: "Within 48 hours" }, { value: "1w", label: "Within a week" }, { value: "best_effort", label: "As soon as we can" } ], required: true },
      { id: "aftercare.manual", prompt: "Owner receives a handover pack", help: "Warranties, manuals, certificates and finishes schedule in one place.", type: "bool", required: true },
    ],
  },
];

/* ════════════════════════════════════════════════════════════════════
   INSTRUMENT v3 — derived from v2. FROZEN DELTA: v2 above is a closed
   version (tenders answered it; never edit meanings there), and this
   derivation IS the v3 definition. Edit the current instrument HERE.

   v3 (2026-08):
   - Eligibility loses the round-conditions declaration (1.8): the
     conditions bind by participation, not by an extra tap.
   - Project understanding loses the listing check, the clarifications
     question and the gaps list (2.1, 2.2, 2.3): the platform's own
     reading already carries that record. Concerns and risks remain,
     renumbered.
   - The soil, structural and energy questions become document-aware.
     A report on file turns the question into a confirmation of what
     the report says; no report either asks for the assumed basis
     (soil) or removes the question (structural, energy).
   - The final claim gains "pursuant to the terms of the contract";
     the allowance basis gains "provided by the client".
   ════════════════════════════════════════════════════════════════════ */

const V3_DROPPED = new Set([
  "elig.conditions",
  "understand.scope_confirm",
  "understand.discrepancy",
  "understand.rfis",
  "understand.gaps",
  "understand.gap_items",
  "site.soil_report",
  "site.soil_class",
  "site.engineering",
  "compliance.energy",
]);

/** Renumbered display refs for questions v3 keeps. */
const V3_REREF: Record<string, string> = {
  "understand.concerns": "2.1",
  "understand.concern_items": "2.1a",
  "understand.risks": "2.2",
  "understand.risks_other": "2.2a",
};

const SOIL_CLASS_OPTIONS: InstrumentOption[] = [
  { value: "a", label: "A · mostly sand or rock" },
  { value: "s", label: "S · slightly reactive" },
  { value: "m", label: "M · moderately reactive" },
  { value: "h", label: "H1/H2 · highly reactive" },
  { value: "e", label: "E · extremely reactive" },
  { value: "p", label: "P · problem site" },
  { value: "not_stated", label: "No classification assumed" },
];

export const INSTRUMENT_SECTIONS_V3: InstrumentSection[] =
  INSTRUMENT_SECTIONS_V2.map((s) => ({
    ...s,
    // The industry term is provisional sum; the module says so.
    ...(s.id === "pcps"
      ? {
          title: "Provisional sums and prime costs",
          intro:
            "Declaring your provisional sums precisely is what makes your price trustworthy. Vague figures are where other builders' quotes fall apart under an owner's questions; yours will not.",
        }
      : null),
    questions: s.questions.flatMap((q): InstrumentQuestion[] => {
      if (V3_DROPPED.has(q.id)) {
        // The soil pair is replaced in place, keeping slide order.
        if (q.id === "site.soil_report") {
          return [
            {
              id: "site.soil_class_confirm",
              ref: "5.2",
              prompt: "I have priced to the soil report provided",
              help: "The soil report in the document set sets the ground conditions the price rests on.",
              type: "confirm",
              presentWhen: "soil_on_file",
              required: true,
            },
            {
              id: "site.soil_class_basis",
              ref: "5.2",
              prompt: "Which soil classification is your price based on?",
              help: "No soil report was provided for this site, so state the classification you have assumed.",
              type: "select",
              options: SOIL_CLASS_OPTIONS,
              presentWhen: "soil_off_file",
              required: true,
            },
          ];
        }
        if (q.id === "site.engineering") {
          return [
            {
              id: "site.engineering_confirm",
              ref: "5.5",
              prompt: "My price is based on the structural engineering provided",
              help: "The structural drawings and computations in the document set.",
              type: "confirm",
              presentWhen: "structural_on_file",
              required: true,
            },
          ];
        }
        if (q.id === "compliance.energy") {
          return [
            {
              id: "compliance.energy_confirm",
              ref: "5.9",
              prompt: "I have priced to the energy report provided",
              help: "The energy report in the document set sets the thermal performance the build must meet.",
              type: "confirm",
              presentWhen: "energy_on_file",
              required: true,
            },
          ];
        }
        return [];
      }
      if (q.id === "payments.final_claim") {
        return [
          {
            ...q,
            options: [
              ...(q.options ?? []),
              {
                value: "contract_terms",
                label: "Pursuant to the terms of the contract",
              },
            ],
          },
        ];
      }
      if (q.id === "pcps.has_ps") {
        return [
          {
            ...q,
            help: "A sum set aside for work that can't be priced exactly yet, e.g. site works or a retaining wall.",
          },
        ];
      }
      if (q.id === "pcps.has_pc") {
        return [
          {
            ...q,
            help: "A sum set aside for a product not selected yet, e.g. appliances, tapware, tiles.",
          },
        ];
      }
      if (q.id === "pcps.ps_items" || q.id === "pcps.pc_items") {
        return [
          {
            ...q,
            itemFields: (q.itemFields ?? []).map((f) =>
              f.key === "allowance" ? { ...f, label: "Amount (ex GST)" } : f,
            ),
          },
        ];
      }
      if (q.id === "pcps.overrun_margin") {
        return [
          {
            ...q,
            prompt:
              "Margin applied when a provisional sum or prime cost runs over its figure",
          },
        ];
      }
      if (q.id === "pcps.basis") {
        return [
          {
            ...q,
            prompt:
              "Are your provisional sums priced from this project's documents?",
            help: "Answer no if any figure is generic rather than priced from these drawings and schedules.",
            options: [
              { value: "documented", label: "Yes, priced from the documents" },
              { value: "partly", label: "Partly" },
              { value: "generic", label: "Generic figures" },
              { value: "client_provided", label: "Provided by the client" },
            ],
          },
        ];
      }
      if (q.id === "scope.schedule") {
        return [
          {
            ...q,
            help: "Every line comes from the client's documents, read and checked before the round opened. Included means priced exactly as drawn and specified.",
          },
        ];
      }
      if (q.id === "pcps.schedule_confirm") {
        return [
          {
            ...q,
            prompt: "This is my provisional sum schedule",
            help: "Built from your schedule answers: the client's provisional sums as you carried them, and every line you marked as a provisional sum with your figure. Change any line by returning to module 5.",
          },
        ];
      }
      const ref = V3_REREF[q.id];
      return [ref ? { ...q, ref } : q];
    }),
  }));

/* ── version resolution ─────────────────────────────────────────────── */

/** The current instrument. */
export const INSTRUMENT_SECTIONS = INSTRUMENT_SECTIONS_V3;

/**
 * The section set a given tender answered. Unknown or null versions
 * resolve to the current set — new drafts adopt the current version.
 */
export function sectionsFor(
  version: number | null | undefined,
): InstrumentSection[] {
  if (version === 1) return INSTRUMENT_SECTIONS_V1;
  if (version === 2) return INSTRUMENT_SECTIONS_V2;
  return INSTRUMENT_SECTIONS_V3;
}

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

export function allQuestionsFor(
  version: number | null | undefined,
): InstrumentQuestion[] {
  return sectionsFor(version).flatMap((s) => s.questions);
}

/** Current-version questions. */
export function allQuestions(): InstrumentQuestion[] {
  return allQuestionsFor(INSTRUMENT_VERSION);
}

// Union index across versions, current version winning on shared ids.
// Shared ids carry the same meaning by rule, so save-time validation
// can resolve from the union without knowing the tender's version.
const QUESTION_INDEX = new Map<string, InstrumentQuestion>();
for (const q of INSTRUMENT_SECTIONS_V1.flatMap((s) => s.questions)) {
  QUESTION_INDEX.set(q.id, q);
}
for (const q of INSTRUMENT_SECTIONS_V2.flatMap((s) => s.questions)) {
  QUESTION_INDEX.set(q.id, q);
}
for (const q of INSTRUMENT_SECTIONS_V3.flatMap((s) => s.questions)) {
  QUESTION_INDEX.set(q.id, q);
}

export function getQuestion(qid: string): InstrumentQuestion | undefined {
  return QUESTION_INDEX.get(qid);
}

/**
 * The round shape presence resolves against: whether an approved
 * schedule exists, and which key reports the register carries. Every
 * surface builds one of these from the same server facts, so a
 * question can never be asked in one place and skipped in another.
 * The report flags default safe: absent flags read as "not on file",
 * which asks rather than hides (soil) and hides rather than asks
 * (structural, energy) — never a phantom confirmation of a document
 * that may not exist.
 */
export interface InPlayContext {
  hasSchedule: boolean;
  soilOnFile?: boolean;
  structuralOnFile?: boolean;
  energyOnFile?: boolean;
}

/**
 * Is this question asked on this round? Audience-flagged questions
 * exist for exactly one round shape — the generic trade grid when no
 * approved schedule exists, the schedule confirmation when one does.
 * Document-aware questions (v3) exist only when the register carries
 * (or lacks) their report. The single definition every surface uses.
 */
export function questionInPlay(
  q: InstrumentQuestion,
  ctx: InPlayContext,
): boolean {
  if (q.audience === "legacy" && ctx.hasSchedule) return false;
  if (q.audience === "schedule" && !ctx.hasSchedule) return false;
  switch (q.presentWhen) {
    case "soil_on_file":
      return ctx.soilOnFile === true;
    case "soil_off_file":
      return ctx.soilOnFile !== true;
    case "structural_on_file":
      return ctx.structuralOnFile === true;
    case "energy_on_file":
      return ctx.energyOnFile === true;
    default:
      return true;
  }
}

/**
 * Rebuild the presence context a finished answer set implies — for
 * surfaces that read a tender without the round's live register (the
 * printed document, the sealed outcome). An answered document-aware
 * question proves it was in play when the tender was priced; the
 * register may have changed since, and a sealed tender must render
 * what was actually asked.
 */
export function inPlayContextFromAnswers(
  answers: Record<string, unknown>,
  hasSchedule: boolean,
): InPlayContext {
  // Only an AFFIRMED confirmation proves its report was on file; a
  // stored false is a leftover from a register that changed under the
  // draft, and must not hide the question the tender actually
  // answered.
  const affirmed = (qid: string) => answers[qid] === true;
  const has = (qid: string) =>
    answers[qid] !== undefined && answers[qid] !== null;
  return {
    hasSchedule,
    soilOnFile: affirmed("site.soil_class_confirm")
      ? true
      : has("site.soil_class_basis")
        ? false
        : undefined,
    structuralOnFile: affirmed("site.engineering_confirm") ? true : undefined,
    energyOnFile: affirmed("compliance.energy_confirm") ? true : undefined,
  };
}

/**
 * Does a gate value satisfy a showIf condition? The single definition
 * every surface uses (deck, submit gate, document, comparison), so a
 * question can never be "asked" in one place and skipped in another.
 */
export function gateAllows(
  showIf: NonNullable<InstrumentQuestion["showIf"]>,
  gateValue: unknown,
): boolean {
  const wanted = Array.isArray(showIf.equals)
    ? showIf.equals
    : [showIf.equals];
  // A multi answer is an array — the gate passes when the chosen set
  // includes any wanted value. Scalar gates (bool/select) match
  // directly. One rule covers eligibility, select, and multi gates.
  if (Array.isArray(gateValue)) {
    return gateValue.some((v) => wanted.includes(v as boolean | string));
  }
  return wanted.includes(gateValue as boolean | string);
}

/**
 * Ids required for a complete submission against a version, honouring
 * showIf against a given answer set (an unanswered gate keeps its
 * dependants optional until the gate is answered).
 */
export function requiredQuestionIds(
  answers: ReadonlyMap<string, unknown>,
  version: number | null | undefined = INSTRUMENT_VERSION,
  ctx: InPlayContext = { hasSchedule: false },
): string[] {
  const ids: string[] = [];
  for (const q of allQuestionsFor(version)) {
    if (!q.required) continue;
    if (!questionInPlay(q, ctx)) continue;
    if (q.showIf) {
      const gate = answers.get(q.showIf.qid);
      const gateValue =
        typeof gate === "object" && gate !== null && "v" in gate
          ? (gate as { v: unknown }).v
          : gate;
      if (!gateAllows(q.showIf, gateValue)) continue;
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
    case "declare":
    case "confirm":
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
            ((q.options ?? []).some((o) => o.value === x) ||
              (q.allowCustom === true && x.trim().length > 0 && x.length <= 60)),
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
    case "amounts": {
      if (typeof v !== "object" || Array.isArray(v)) return false;
      return Object.entries(v as Record<string, unknown>).every(
        ([rowId, amt]) =>
          MATRIX_ROW_IDS.has(rowId as TradeId) &&
          (amt === null ||
            (typeof amt === "number" && Number.isFinite(amt) && amt >= 0)),
      );
    }
    case "schedule":
      // Item ids can only be judged against the round's pack, which
      // save time does not load — shape here, membership at the
      // submit gate.
      return isScheduleAnswerShape(v);
  }
}

/**
 * Gate-time completeness: does this value FULLY answer the question?
 * The single definition shared by the checklist UI (progress ring,
 * "complete" banner) and the server submit gate, so the client can
 * never claim complete for a submission the server would refuse.
 */
export function isAnswerComplete(
  q: InstrumentQuestion,
  v: unknown,
  ctx?: { schedule?: TenderSchedule | null },
): boolean {
  if (v === undefined || v === null) return false;
  // Completeness implies savability: a value the save path would refuse
  // (out-of-range percent, oversized text) must never show as "done".
  if (!isValidAnswerShape(q, v)) return false;
  switch (q.type) {
    case "bool":
      return typeof v === "boolean";
    case "declare":
    case "confirm":
      // A declaration is only answered by affirming it.
      return v === true;
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
        return fields.every((f) => {
          const val = r[f.key];
          if (f.optional && (val === null || val === undefined)) return true;
          if (f.type === "text") {
            return typeof val === "string" && val.trim().length > 0;
          }
          return typeof val === "number" && Number.isFinite(val);
        });
      });
    }
    case "matrix": {
      if (typeof v !== "object" || Array.isArray(v)) return false;
      const m = v as Record<string, unknown>;
      return scopeMatrixRows().every(
        (r) =>
          typeof m[r.id] === "string" &&
          SCOPE_STATE_VALUES.has(m[r.id] as string),
      );
    }
    case "amounts":
      // Optional colour by definition — any well-formed value counts.
      return true;
    case "schedule":
      // Complete only when every tenderable line of the pack is
      // marked and every allowance carries a figure. Without the pack
      // in hand (callers that only summarise), a well-formed value
      // passes — the deck and the submit gate always supply it.
      return ctx?.schedule
        ? isScheduleComplete(ctx.schedule, v)
        : true;
  }
}

/* ── tender metrics ─────────────────────────────────────────────────── */

/**
 * The headline facts an owner reads first, rolled up from the answers.
 * Rendered on the deck's review slide and, later, the tender document.
 */
export interface TenderMetrics {
  priceExGst: number | null;
  priceIncGst: number | null;
  validityDays: number | null;
  depositPct: number | null;
  scheduleType: string | null;
  leadTime: string | null;
  startMonth: string | null;
  durationWeeks: number | null;
  psCount: number;
  psTotal: number;
  pcCount: number;
  pcTotal: number;
  /** psTotal + pcTotal: the part of the price that can still move. */
  allowanceExposure: number;
  coverage: {
    included: number;
    allowance: number;
    excluded: number;
    notApplicable: number;
    unmarked: number;
  };
  /** Per-trade amounts volunteered on the coverage grid. */
  itemisedCount: number;
  itemisedTotal: number;
  ldPerWeek: number | null;
  defectsLiabilityMonths: string | null;
  alternativesCount: number;
  /**
   * Present on schedule rounds only: the line-by-line tallies against
   * the client's pack. When set, `coverage` mirrors it (documented →
   * included) so legacy readers stay truthful, and allowanceExposure
   * is the schedule's allowance total.
   */
  schedule: ScheduleTallies | null;
}

/** Pure roll-up over the raw answers record (unwrapped values). */
export function computeTenderMetrics(
  answers: Record<string, unknown>,
  schedule?: TenderSchedule | null,
): TenderMetrics {
  const num = (id: string): number | null => {
    const v = answers[id];
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  };
  const str = (id: string): string | null => {
    const v = answers[id];
    return typeof v === "string" && v.length > 0 ? v : null;
  };
  const itemsOf = (id: string): Array<Record<string, unknown>> => {
    const v = answers[id];
    return Array.isArray(v)
      ? (v.filter((r) => r && typeof r === "object") as Array<
          Record<string, unknown>
        >)
      : [];
  };
  const sumField = (
    rows: Array<Record<string, unknown>>,
    key: string,
  ): number =>
    rows.reduce((n, r) => {
      const v = r[key];
      return typeof v === "number" && Number.isFinite(v) ? n + v : n;
    }, 0);

  const priceExGst = num("price.total");
  const priceIncGst =
    priceExGst !== null
      ? answers["commercial.gst_registered"] === false
        ? priceExGst
        : Math.round(priceExGst * 1.1)
      : null;

  const ps = itemsOf("pcps.ps_items");
  const pc = itemsOf("pcps.pc_items");
  const psTotal = sumField(ps, "allowance");
  const pcTotal = sumField(pc, "allowance");

  const matrix = (answers["scope.matrix"] ?? {}) as Record<string, string>;
  const coverage = {
    included: 0,
    allowance: 0,
    excluded: 0,
    notApplicable: 0,
    unmarked: 0,
  };
  for (const r of scopeMatrixRows()) {
    const s = matrix[r.id];
    if (s === "included") coverage.included++;
    else if (s === "allowance") coverage.allowance++;
    else if (s === "excluded") coverage.excluded++;
    else if (s === "not_applicable") coverage.notApplicable++;
    else coverage.unmarked++;
  }

  // Amounts only count for trades the price actually includes — a
  // figure left behind on a row later marked excluded must not inflate
  // the itemised total.
  const amounts = (answers["scope.amounts"] ?? {}) as Record<string, unknown>;
  let itemisedCount = 0;
  let itemisedTotal = 0;
  for (const r of scopeMatrixRows()) {
    const a = amounts[r.id];
    if (
      matrix[r.id] === "included" &&
      typeof a === "number" &&
      Number.isFinite(a) &&
      a > 0
    ) {
      itemisedCount++;
      itemisedTotal += a;
    }
  }

  // Schedule rounds: coverage and exposure read from the pack marks.
  // The tallies fold into `coverage` so every legacy reader (cover
  // cells, risk flags, comparison chips) keeps telling the truth.
  const tallies = schedule
    ? scheduleTallies(schedule, answers["scope.schedule"])
    : null;
  if (tallies) {
    coverage.included = tallies.documented;
    coverage.allowance = tallies.allowance;
    coverage.excluded = tallies.excluded;
    coverage.notApplicable = tallies.notApplicable;
    coverage.unmarked = tallies.unmarked;
    // Disclosed line prices ARE itemisation on a schedule round — the
    // same act of showing the working, line by line instead of trade
    // by trade.
    itemisedCount = tallies.disclosedCount;
    itemisedTotal = tallies.disclosedTotal;
  }

  return {
    priceExGst,
    priceIncGst,
    validityDays: num("price.validity"),
    depositPct: num("payments.deposit"),
    scheduleType: str("payments.schedule_type"),
    leadTime: str("prog.lead_time"),
    startMonth: str("programme.start"),
    durationWeeks: num("programme.duration"),
    psCount: ps.length,
    psTotal,
    pcCount: pc.length,
    pcTotal,
    allowanceExposure: tallies ? tallies.allowanceTotal : psTotal + pcTotal,
    coverage,
    itemisedCount,
    itemisedTotal,
    ldPerWeek: num("programme.ld_amount"),
    defectsLiabilityMonths: str("contract.defects_liability"),
    alternativesCount: itemsOf("commercial.alternative_items").length,
    schedule: tallies,
  };
}
