/**
 * The Tender Evaluation Engine — BuilderHQ's analytical read of a
 * round, computed entirely from what each builder disclosed through
 * the submission instrument.
 *
 * PRINCIPLES
 *   - Facts first, verdicts never. The engine ranks, scores and
 *     flags, but every number carries RECEIPTS — the disclosed facts
 *     it was computed from — so an architect can defend any line of
 *     it to their client, and a builder could read their own
 *     evaluation without feeling ambushed.
 *   - An honest "excluded" must never read worse than a vague
 *     inclusion. Disclosure is rewarded throughout: flagging a gap,
 *     itemising an allowance or declaring a weather add-on IMPROVES
 *     a builder's read, because it is the vague tender that wrecks
 *     projects, not the candid one.
 *   - Relative claims ("sharpest price") are computed, not written.
 *     A superlative is only ever attached when it is arithmetically
 *     true within the round.
 *
 * Pure and client-safe: no server imports, no side effects. The UI
 * (owner + architect evaluation surface) and, later, the Tender
 * Evaluation Report PDF both read this one model.
 */

import {
  scopeMatrixRows,
  computeTenderMetrics,
  INSTRUMENT_VERSION,
  type TenderMetrics,
} from "./instrument";
import { tradeLabel, type TradeId } from "./trades";
import {
  tenderableItems,
  readScheduleAnswer,
  deriveAllowanceRows,
  deriveScheduleExclusions,
  deriveNotApplicable,
  deriveDisclosedPrices,
  collapseGroupedLabels,
  type TenderSchedule,
} from "./schedule";

type Answers = Record<string, unknown>;

/* ── inputs ─────────────────────────────────────────────────────────── */

export interface EvaluationInput {
  tenderId: string;
  builderName: string;
  builderSlug?: string | null;
  yearsInOperation?: number | null;
  status: string;
  submittedAt: Date | string | null;
  /** Headline price as stored on the tender row (GST-inclusive). */
  totalPriceAud: number | null;
  documentCount: number;
  verification?: { abnVerified: boolean; anyLicenceVerified: boolean };
  answers: Answers;
  /** Project home state ("VIC") for statutory checks. */
  projectState?: string | null;
  /**
   * The instrument version the tender answered. v3 removed the
   * clarifications and gaps questions and made soil document-aware,
   * so the preparation rubric reads differently by version. Unknown
   * resolves to the current version.
   */
  instrumentVersion?: number | null;
}

/* ── output model ───────────────────────────────────────────────────── */

export type FlagSeverity = "high" | "attention" | "note";

export interface EvalFlag {
  id: string;
  severity: FlagSeverity;
  label: string;
  /** What the disclosed answer actually says, in neutral language. */
  detail: string;
  /** The question worth asking the builder before deciding. */
  ask?: string;
}

/**
 * One line of a dimension's working. The lines are a ledger: the
 * optional base opens it, deltas adjust it, an explicit clamp line
 * reconciles any floor or ceiling, and notes carry context without
 * points. base + Σdeltas + Σclamps ALWAYS equals the score — the
 * arithmetic is checkable by the reader, and asserted in dev.
 */
export interface ReceiptLine {
  kind: "base" | "delta" | "note" | "clamp" | "miss";
  /** Signed points; null for notes and misses. */
  value: number | null;
  label: string;
  /**
   * "miss" lines only: the points that were available on this rubric
   * slot and not earned. In a disclosure dimension the misses account
   * for every point between the score and 100 — the reader sees both
   * sides of the ledger, exactly.
   */
  potential?: number;
  /**
   * The question this line reads from, when changing an answer could
   * move it — the anchor a draft scorecard uses to jump straight to
   * that slide. The sentinel "__docs" points at the documents module.
   */
  qid?: string;
}

export interface DimensionScore {
  key: DimensionKey;
  label: string;
  /** 0–100 under a fixed rubric (each dimension totals exactly 100). */
  score: number;
  /** The ledger the score was computed from. */
  receipts: ReceiptLine[];
}

export type DimensionKey =
  | "firmness"
  | "scope"
  | "preparation"
  | "credentials"
  | "delivery"
  | "programme";

export const DIMENSION_LABELS: Record<DimensionKey, string> = {
  firmness: "Price firmness",
  scope: "Scope coverage",
  preparation: "Preparation",
  credentials: "Credentials & capacity",
  delivery: "Delivery & aftercare",
  programme: "Programme confidence",
};

/*
 * DIMENSION WEIGHTS (sum exactly 100). The overall read is a weighted
 * composite, because the dimensions are not equally consequential.
 * The ordering follows where residential building disputes actually
 * start: state building-commission complaint data and industry
 * dispute analyses put cost blowouts (allowances moving, escalation)
 * and "I thought that was included" scope arguments far ahead of
 * every other cause, so the two dimensions that measure them carry
 * half the composite. Preparation predicts whether the price
 * survives contact with the site; credentials predict execution;
 * delivery and aftercare shape life after signing; programme carries
 * the least because dates are the most renegotiated, least binding
 * disclosure in any tender. Fixed, published, applied identically.
 */
export const DIMENSION_WEIGHTS: Record<DimensionKey, number> = {
  firmness: 25,
  scope: 25,
  preparation: 15,
  credentials: 15,
  delivery: 12,
  programme: 8,
};

/** The weighted composite, 0 to 100. */
export function weightedOverall(dimensions: DimensionScore[]): number {
  let sum = 0;
  for (const d of dimensions) {
    sum += d.score * (DIMENSION_WEIGHTS[d.key] ?? 0);
  }
  return Math.round(sum / 100);
}

export interface MoneyPicture {
  /** Contract price ex GST as answered (null when unanswered). */
  exGst: number | null;
  /** GST-inclusive price (the headline owners fund). */
  incGst: number | null;
  /** PS + PC allowances inside the price (ex GST). */
  exposure: number;
  /**
   * The part of the exposure that is the CLIENT'S: allowance money
   * carried on the client's own allowance lines. Every tender on the
   * round carries these by instruction, so they never count against
   * a builder's firmness.
   */
  clientAllowanceExGst: number;
  /** exposure − clientAllowanceExGst: movement the builder chose. */
  builderExposureExGst: number;
  /** 100 − the builder-originated share of the price. The number that
   *  fairly compares tenders on a schedule round. */
  builderFirmPct: number;
  psCount: number;
  pcCount: number;
  /** Share of the ex-GST price that can still move. 0 when no price. */
  exposurePct: number;
  /** 100 − exposurePct. */
  firmPct: number;
  /** The part of the price that cannot move: exGst − exposure. */
  firmExGst: number | null;
  escalation: "none" | "capped" | "uncapped" | "undisclosed";
  overrunMarginPct: number | null;
  variationMarginPct: number | null;
  fixed: boolean | null;
  permitFeesIncluded: boolean | null;
  validityDays: number | null;
  depositPct: number | null;
  /** Deposit sits above the statutory cap for the project's state. */
  depositAboveCap: boolean;
}

export interface ProgrammeRead {
  leadTime: string | null;
  startMonth: string | null;
  weeks: number | null;
  weatherDaysIncluded: number | null;
  weatherAddonDays: number | null;
  ldPerWeek: number | null;
  /** "Jul – Aug 2027", start + duration (+ declared weather add-on). */
  handoverLabel: string | null;
  handoverFromISO: string | null;
}

export interface ScopeRead {
  included: number;
  allowance: number;
  excluded: number;
  notApplicable: number;
  unmarked: number;
  applicable: number;
  excludedTrades: string[];
  allowanceTrades: string[];
  extraExclusions: string[];
  ownerSupplied: string[];
  itemisedCount: number;
  itemisedTotal: number;
  /** Lines the builder held do not apply, with their stated reasons. */
  notApplicableRows: Array<{ label: string; note: string | null }>;
  /** Documented lines whose price the builder chose to show. */
  disclosedRows: Array<{ label: string; amountAud: number }>;
}

export interface CommentaryRead {
  approach: string | null;
  valueEngineering: Array<{ suggestion: string; saving: number | null }>;
  veSavingsTotal: number;
  recommendations: Array<{ area: string; recommendation: string }>;
  riskAdvice: Array<{ risk: string; handling: string }>;
  /** Any commentary at all — the differentiator module was used. */
  present: boolean;
}

export interface FactRow {
  label: string;
  value: string;
  /** Draw the eye: this row is a genuine strength. */
  strong?: boolean;
}

export interface TenderEvaluation {
  tenderId: string;
  builderName: string;
  builderSlug: string | null;
  status: string;
  monogram: string;
  metrics: TenderMetrics;
  money: MoneyPicture;
  scope: ScopeRead;
  programme: ProgrammeRead;
  commentary: CommentaryRead;
  credentialRows: FactRow[];
  deliveryRows: FactRow[];
  dimensions: DimensionScore[];
  /** The weighted composite of the six dimensions, 0 to 100. */
  overall: number;
  /**
   * Module 1 insurance declarations, made under signature. Declared,
   * not register-verified — the UI labels them accordingly.
   */
  insurance: {
    publicLiability: boolean;
    warrantyEligible: boolean | null;
    workersComp: "current" | "not_required" | null;
  };
  flags: EvalFlag[];
  highlights: string[];
  /** The pre-decision agenda: every flag's ask, deduped and ordered. */
  questions: string[];
  /** Arithmetically-true superlatives within the round. */
  positions: string[];
  documentCount: number;
  verification: { abnVerified: boolean; anyLicenceVerified: boolean };
}

export interface ScopeDisagreement {
  trade: string;
  /** tenderId → state label ("Included" | "Allowance" | "Excluded" | "N/A" | "—"). */
  states: Record<string, string>;
}

export interface RoundEvaluation {
  tenders: TenderEvaluation[];
  /** Present when at least two tenders carry a price. */
  spread: {
    lowestInc: number;
    highestInc: number;
    range: number;
    cheapestHeadlineId: string;
    /** Highest firm share of price among priced tenders. */
    certaintyId: string;
  } | null;
  /**
   * The breakeven read. When the cheapest headline carries allowances
   * a firmer rival has priced in full, this is the arithmetic that
   * tests the saving: if the cheaper tender's allowances overrun their
   * stated figures by more than `breakevenPct`, the paper saving is
   * gone. Pure division — no assumptions about what WILL happen.
   */
  breakeven: {
    cheaperId: string;
    rivalId: string;
    savingExGst: number;
    exposureExGst: number;
    breakevenPct: number;
  } | null;
  /** One computed sentence: the thing this round most needs read. */
  priceStory: string | null;
  /**
   * The ladder: for tenders ordered by price, what each step up
   * actually buys, computed only from facts where the dearer tender
   * is strictly better. The homeowner's real question, answered.
   */
  ladder: Array<{
    fromId: string;
    toId: string;
    fromName: string;
    toName: string;
    extraInc: number;
    gains: string[];
  }>;
  /** Dimension key → tenderId of the leader (ties → first). */
  leaders: Partial<Record<DimensionKey, string>>;
  /** Trades where the builders genuinely disagree on coverage. */
  scopeDisagreements: ScopeDisagreement[];
  /** Round-level asks that apply across tenders. */
  roundQuestions: string[];
}

/* ── small helpers ──────────────────────────────────────────────────── */

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;
const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim().length > 0 ? v : null;
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

const clamp = (n: number, lo = 0, hi = 100) =>
  Math.max(lo, Math.min(hi, Math.round(n)));

const aud = (n: number) => `$${Math.round(n).toLocaleString("en-AU")}`;

/**
 * Ledger builder for dimension scores. Guarantees the published
 * invariant: base + Σdeltas + Σclamps === score, exactly, in every
 * case. All points are integers.
 */
function ledger(base: number, baseLabel: string | null) {
  const lines: ReceiptLine[] = [];
  if (baseLabel !== null) {
    lines.push({ kind: "base", value: base, label: baseLabel });
  }
  let sum = base;
  return {
    add(points: number, label: string, qid?: string) {
      if (points === 0) {
        lines.push({ kind: "note", value: null, label, qid });
        return;
      }
      sum += Math.round(points);
      lines.push({ kind: "delta", value: Math.round(points), label, qid });
    },
    note(label: string) {
      lines.push({ kind: "note", value: null, label });
    },
    /** Points available on a rubric slot and not earned. */
    miss(potential: number, label: string, qid?: string) {
      if (potential <= 0) return;
      lines.push({
        kind: "miss",
        value: null,
        label,
        potential: Math.round(potential),
        qid,
      });
    },
    settle(key: DimensionKey, opts?: { rubricTotal?: number }): DimensionScore {
      const raw = Math.round(sum);
      const score = clamp(raw);
      if (score !== raw) {
        lines.push({
          kind: "clamp",
          value: score - raw,
          label: score === 0 ? "held at the floor of 0" : "capped at 100",
        });
      }
      if (process.env.NODE_ENV !== "production") {
        const check = lines.reduce((n, l) => n + (l.value ?? 0), 0);
        if (check !== score) {
          throw new Error(
            `evaluation ledger mismatch for ${key}: lines sum to ${check}, score is ${score}`,
          );
        }
        // Disclosure dimensions must account for both sides: earned
        // plus missed is the whole rubric, exactly.
        if (opts?.rubricTotal !== undefined && score === raw) {
          const missed = lines.reduce(
            (n, l) => n + (l.kind === "miss" ? (l.potential ?? 0) : 0),
            0,
          );
          if (score + missed !== opts.rubricTotal) {
            throw new Error(
              `evaluation rubric mismatch for ${key}: ${score} earned + ${missed} missed !== ${opts.rubricTotal}`,
            );
          }
        }
      }
      return {
        key,
        label: DIMENSION_LABELS[key],
        score,
        receipts: lines,
      };
    },
  };
}

function monogramOf(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function handover(
  startMonth: string | null,
  weeks: number | null,
  addonDays: number | null,
): { label: string | null; fromISO: string | null } {
  if (!startMonth || !weeks || !/^\d{4}-\d{2}$/.test(startMonth)) {
    return { label: null, fromISO: null };
  }
  const [y = 0, m = 1] = startMonth.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const from = new Date(start.getTime() + weeks * 7 * 86400_000);
  const to = new Date(
    from.getTime() + Math.max(addonDays ?? 0, 0) * 86400_000,
  );
  const sameMonth =
    from.getUTCFullYear() === to.getUTCFullYear() &&
    from.getUTCMonth() === to.getUTCMonth();
  const label = sameMonth
    ? `${MONTHS[from.getUTCMonth()]} ${from.getUTCFullYear()}`
    : `${MONTHS[from.getUTCMonth()]} – ${MONTHS[to.getUTCMonth()]} ${to.getUTCFullYear()}`;
  return { label, fromISO: from.toISOString().slice(0, 10) };
}

const LEAD_LABEL: Record<string, string> = {
  "2_4": "2–4 weeks",
  "4_8": "4–8 weeks",
  "8_12": "8–12 weeks",
  "12_plus": "12+ weeks",
};

/** Statutory deposit caps for fixed-price domestic work (contract
 *  values in the marketplace's range). Verified July 2026. */
const DEPOSIT_CAP: Record<string, number> = { VIC: 5, NSW: 10, QLD: 5 };

/* ── per-tender evaluation ──────────────────────────────────────────── */

export function evaluateTender(
  input: EvaluationInput,
  schedule: TenderSchedule | null = null,
): TenderEvaluation {
  const a = input.answers;
  const metrics = computeTenderMetrics(a, schedule);
  const rows = scopeMatrixRows();
  const matrix = (a["scope.matrix"] ?? {}) as Record<string, string>;

  /* money */
  const exGst = metrics.priceExGst;
  const exposure = metrics.allowanceExposure;
  const exposurePct =
    exGst && exGst > 0 ? Math.min(100, (exposure / exGst) * 100) : 0;
  // Movement the BUILDER chose, as opposed to allowance lines the
  // client put on the pack. Legacy rounds have no client lines, so
  // the builder share is the whole exposure there.
  const clientCarried = metrics.schedule?.clientAllowanceTotal ?? 0;
  const builderExposure = Math.max(0, exposure - clientCarried);
  const builderExposurePct =
    exGst && exGst > 0 ? Math.min(100, (builderExposure / exGst) * 100) : 0;
  const escalation: MoneyPicture["escalation"] =
    a["price.escalation"] === true
      ? a["price.escalation_cap"] === "capped"
        ? "capped"
        : a["price.escalation_cap"] === "uncapped"
          ? "uncapped"
          : "undisclosed"
      : a["price.escalation"] === false
        ? "none"
        : "undisclosed";
  const depositPct = metrics.depositPct;
  const cap = input.projectState
    ? DEPOSIT_CAP[input.projectState.toUpperCase()]
    : undefined;
  const money: MoneyPicture = {
    exGst,
    incGst: metrics.priceIncGst,
    exposure,
    clientAllowanceExGst: clientCarried,
    builderExposureExGst: builderExposure,
    builderFirmPct: 100 - builderExposurePct,
    psCount: metrics.psCount,
    pcCount: metrics.pcCount,
    exposurePct,
    firmPct: 100 - exposurePct,
    firmExGst: exGst !== null ? exGst - exposure : null,
    escalation,
    overrunMarginPct: num(a["pcps.overrun_margin"]),
    variationMarginPct: num(a["price.margin"]),
    fixed:
      typeof a["price.fixed"] === "boolean"
        ? (a["price.fixed"] as boolean)
        : null,
    permitFeesIncluded:
      typeof a["compliance.permit_fees"] === "boolean"
        ? (a["compliance.permit_fees"] as boolean)
        : null,
    validityDays: metrics.validityDays,
    depositPct,
    depositAboveCap:
      depositPct !== null && cap !== undefined && depositPct > cap,
  };

  /* scope — schedule rounds read the pack marks; legacy the trade grid */
  const excludedTrades = schedule
    ? collapseGroupedLabels(
        schedule,
        deriveScheduleExclusions(schedule, a["scope.schedule"]),
      )
    : rows
        .filter((r) => matrix[r.id] === "excluded")
        .map((r) => tradeLabel(r.id as TradeId));
  const allowanceTrades = schedule
    ? collapseGroupedLabels(
        schedule,
        deriveAllowanceRows(schedule, a["scope.schedule"]),
      )
    : rows
        .filter((r) => matrix[r.id] === "allowance")
        .map((r) => tradeLabel(r.id as TradeId));
  const extraExclusions = arr(a["scope.exclusions_list"])
    .map((row) =>
      row && typeof row === "object"
        ? str((row as Record<string, unknown>).exclusion)
        : null,
    )
    .filter((s): s is string => !!s);
  const ownerSupplied = arr(a["excl.owner_supplied_items"])
    .map((row) =>
      row && typeof row === "object"
        ? str((row as Record<string, unknown>).item)
        : null,
    )
    .filter((s): s is string => !!s);
  const applicable = metrics.schedule
    ? metrics.schedule.total - metrics.schedule.notApplicable
    : rows.length - metrics.coverage.notApplicable;
  const scope: ScopeRead = {
    ...metrics.coverage,
    applicable,
    excludedTrades,
    allowanceTrades,
    extraExclusions,
    ownerSupplied,
    itemisedCount: metrics.itemisedCount,
    itemisedTotal: metrics.itemisedTotal,
    notApplicableRows: schedule
      ? deriveNotApplicable(schedule, a["scope.schedule"]).map((r) => ({
          label: r.label,
          note: r.note,
        }))
      : [],
    disclosedRows: schedule
      ? deriveDisclosedPrices(schedule, a["scope.schedule"]).map((r) => ({
          label: r.label,
          amountAud: r.amountAud,
        }))
      : [],
  };

  /* programme */
  const weatherIncluded =
    a["programme.weather"] === true ? num(a["programme.weather_days"]) : null;
  const weatherAddon =
    a["programme.weather"] === false
      ? num(a["programme.weather_addon_days"])
      : null;
  const ho = handover(
    metrics.startMonth,
    metrics.durationWeeks,
    weatherAddon,
  );
  const programme: ProgrammeRead = {
    leadTime: metrics.leadTime ? LEAD_LABEL[metrics.leadTime] ?? null : null,
    startMonth: metrics.startMonth,
    weeks: metrics.durationWeeks,
    weatherDaysIncluded: weatherIncluded,
    weatherAddonDays: weatherAddon,
    ldPerWeek: metrics.ldPerWeek,
    handoverLabel: ho.label,
    handoverFromISO: ho.fromISO,
  };

  /* commentary */
  const ve = arr(a["comment.value_engineering"])
    .map((row) => {
      const r = (row ?? {}) as Record<string, unknown>;
      const suggestion = str(r.suggestion);
      return suggestion ? { suggestion, saving: num(r.saving) } : null;
    })
    .filter((x): x is { suggestion: string; saving: number | null } => !!x);
  const recommendations = arr(a["comment.recommendations"])
    .map((row) => {
      const r = (row ?? {}) as Record<string, unknown>;
      const area = str(r.area);
      const recommendation = str(r.recommendation);
      return area && recommendation ? { area, recommendation } : null;
    })
    .filter((x): x is { area: string; recommendation: string } => !!x);
  const riskAdvice = arr(a["comment.risk_advice"])
    .map((row) => {
      const r = (row ?? {}) as Record<string, unknown>;
      const risk = str(r.risk);
      const handling = str(r.handling);
      return risk && handling ? { risk, handling } : null;
    })
    .filter((x): x is { risk: string; handling: string } => !!x);
  const commentary: CommentaryRead = {
    approach: str(a["comment.approach"]),
    valueEngineering: ve,
    veSavingsTotal: ve.reduce((n, x) => n + (x.saving ?? 0), 0),
    recommendations,
    riskAdvice,
    present:
      !!str(a["comment.approach"]) ||
      ve.length > 0 ||
      recommendations.length > 0 ||
      riskAdvice.length > 0,
  };

  /* fact tables */
  const references = arr(a["creds.references"]).filter(
    (r) =>
      r &&
      typeof r === "object" &&
      str((r as Record<string, unknown>).name),
  );
  const refLinks = references.filter((r) =>
    str((r as Record<string, unknown>).link),
  ).length;

  const EXPERIENCE: Record<string, string> = {
    "1_5": "1–5 projects of this type",
    "6_20": "6–20 projects of this type",
    "21_50": "21–50 projects of this type",
    "50_plus": "50+ projects of this type",
  };
  const LARGEST: Record<string, string> = {
    under_500k: "Largest contract under $500k",
    "500k_1m": "Largest contract $500k–$1m",
    "1m_2m": "Largest contract $1m–$2m",
    "2m_5m": "Largest contract $2m–$5m",
    "5m_plus": "Largest contract over $5m",
  };
  const SUPER_ROLE: Record<string, string> = {
    myself_director: "The director runs the site",
    dedicated_supervisor: "Dedicated site supervisor",
    project_manager: "Project manager led",
  };
  const LOAD: Record<string, string> = {
    "1_2": "carrying 1–2 jobs",
    "3_5": "carrying 3–5 jobs",
    "6_plus": "carrying 6+ jobs",
  };
  const CONCURRENT: Record<string, string> = {
    "0_2": "Up to 2 concurrent projects",
    "3_5": "3–5 concurrent projects",
    "6_plus": "6+ concurrent projects",
  };
  const TENURE: Record<string, string> = {
    under_1: "Crews together under a year",
    "1_3": "Crews together 1–3 years",
    "3_plus": "Crews together 3+ years",
  };
  const WHS: Record<string, string> = {
    certified: "Certified WHS system",
    documented: "Documented safety system",
    swms: "SWMS as required",
  };
  const supervisorRole = str(a["creds.supervisor_role"]);
  const supervisorName = str(a["creds.supervisor"]);
  const inHouse = arr(a["team.in_house"]).filter(
    (t) => t !== "none",
  ) as string[];
  const qa = arr(a["creds.qa"]) as string[];
  const memberships = (arr(a["creds.memberships"]) as string[]).filter(
    (m) => m !== "none",
  );

  const credentialRows: FactRow[] = [];
  if (supervisorRole) {
    credentialRows.push({
      label: "Site leadership",
      value:
        (SUPER_ROLE[supervisorRole] ?? supervisorRole) +
        (supervisorName ? `, ${supervisorName}` : "") +
        (str(a["team.supervisor_load"])
          ? `, ${LOAD[str(a["team.supervisor_load"])!]}`
          : ""),
      strong: str(a["team.supervisor_load"]) === "1_2",
    });
  }
  const contractForm = str(a["contract.form"]);
  const exp = str(a["creds.experience_type"]);
  if (exp) {
    credentialRows.push({
      label: "Experience",
      value:
        (EXPERIENCE[exp] ?? exp) +
        (str(a["creds.largest_value"])
          ? ` · ${LARGEST[str(a["creds.largest_value"])!]}`
          : ""),
      strong: exp === "21_50" || exp === "50_plus",
    });
  }
  if (input.yearsInOperation) {
    credentialRows.push({
      label: "In operation",
      value: `${input.yearsInOperation} years`,
      strong: input.yearsInOperation >= 10,
    });
  }
  const concurrent = str(a["programme.concurrent"]);
  if (concurrent) {
    credentialRows.push({
      label: "Capacity",
      value: CONCURRENT[concurrent] ?? concurrent,
      strong: concurrent === "0_2",
    });
  }
  credentialRows.push({
    label: "Own trades",
    value:
      inHouse.length > 0
        ? inHouse
            .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
            .join(", ")
        : "All trades subcontracted",
    strong: inHouse.length >= 2,
  });
  const tenure = str(a["team.crew_tenure"]);
  if (tenure) {
    credentialRows.push({
      label: "Crew tenure",
      value: TENURE[tenure] ?? tenure,
      strong: tenure === "3_plus",
    });
  }
  const whs = str(a["creds.whs"]);
  if (whs || qa.length > 0) {
    credentialRows.push({
      label: "Safety & QA",
      value: [
        whs ? WHS[whs] ?? whs : null,
        qa.length > 0
          ? qa
              .map(
                (q) =>
                  ({
                    independent: "independent inspections",
                    itp: "documented ITPs",
                    supervisor: "supervisor checks",
                  })[q] ?? q,
              )
              .join(" + ")
          : null,
      ]
        .filter(Boolean)
        .join(" · "),
      strong: whs === "certified" || qa.includes("independent"),
    });
  }
  credentialRows.push({
    label: "References",
    value:
      references.length > 0
        ? `${references.length} referee${references.length === 1 ? "" : "s"}${refLinks > 0 ? `, ${refLinks} with project links` : ""}`
        : "None provided",
    strong: references.length >= 2,
  });
  if (memberships.length > 0) {
    credentialRows.push({
      label: "Memberships",
      value: memberships.map((m) => m.toUpperCase()).join(" · "),
    });
  }

  const RESPONSE: Record<string, string> = {
    "48h": "Defect calls answered within 48 hours",
    "1w": "Defect calls answered within a week",
    best_effort: "Defect calls answered as soon as possible",
  };
  const UPDATES: Record<string, string> = {
    weekly: "Weekly progress updates",
    fortnightly: "Fortnightly progress updates",
    milestones: "Updates at each stage",
  };
  const deliveryRows: FactRow[] = [];
  const upd = str(a["team.updates"]);
  if (upd) {
    deliveryRows.push({
      label: "Communication",
      value: UPDATES[upd] ?? upd,
      strong: upd === "weekly",
    });
  }
  deliveryRows.push({
    label: "Variations",
    value:
      a["contract.variations_written"] === true
        ? "Always priced in writing before work proceeds" +
          (a["contract.variation_fee"] === true
            ? ", admin fee applies"
            : ", no admin fee")
        : a["contract.variations_written"] === false
          ? "Not always priced in writing"
          : "Not disclosed",
    strong:
      a["contract.variations_written"] === true &&
      a["contract.variation_fee"] !== true,
  });
  if (metrics.defectsLiabilityMonths) {
    deliveryRows.push({
      label: "Defects period",
      value: `${metrics.defectsLiabilityMonths} months after handover`,
      strong:
        metrics.defectsLiabilityMonths === "24" ||
        metrics.defectsLiabilityMonths === "12",
    });
  }
  const resp = str(a["aftercare.response"]);
  if (resp) {
    deliveryRows.push({
      label: "Aftercare",
      value:
        (RESPONSE[resp] ?? resp) +
        (a["aftercare.walkthrough"] === true
          ? " · pre-handover walkthrough"
          : "") +
        (a["aftercare.manual"] === true ? " · handover pack" : ""),
      strong: resp === "48h",
    });
  }

  /* ── dimensions, with ledger receipts ───────────────────────────────
     THE RUBRIC (fixed, published, applied identically to every tender):
     every dimension is scored out of exactly 100. Deduction dimensions
     (firmness, scope) open at a stated base and subtract; disclosure
     dimensions (preparation, credentials, delivery, programme) build
     from 0 with weights that total exactly 100, so a perfect
     disclosure scores 100 without clamping. Verification by BuilderHQ
     (ABN, licence) is deliberately NOT scored — it is a separate
     trust layer shown in About the builders; scores read only what
     the builder disclosed under signature. ─────────────────────────── */
  const dims: DimensionScore[] = [];

  {
    // Price firmness — how much of the number is actually the number.
    // Base 100; deductions for everything that lets it move.
    // Every deduction that does NOT fire is stated as held ground, so
    // the reader sees what this price protects as clearly as what it
    // leaves open.
    const L = ledger(100, "every tender starts fully firm");
    if (contractForm === "cost_plus") {
      L.add(-45, "cost plus contract: the price follows cost, not the tender", "contract.form");
    } else if (money.fixed === false) {
      L.add(-40, "price is an estimate, not fixed", "price.fixed");
    } else if (money.fixed === true) {
      L.note("fixed contract sum, held");
    }
    if (clientCarried > 0) {
      L.note(
        `carries the client's stated allowances (${aud(clientCarried)}), the round's own exposure, no deduction`,
      );
    }
    const expPenalty = Math.min(60, Math.round(builderExposurePct * 2));
    if (expPenalty > 0) {
      const pctLabel =
        builderExposurePct >= 1
          ? `${Math.round(builderExposurePct)}%`
          : `${builderExposurePct.toFixed(1)}%`;
      L.add(
        -expPenalty,
        `${pctLabel} of the price sits in the builder's own allowances (${aud(builderExposure)}), 2 points per percent`,
        metrics.schedule ? "scope.schedule" : "pcps.has_ps",
      );
    } else if (exGst) {
      L.note(
        clientCarried > 0
          ? "no allowances of the builder's own, held"
          : "no provisional sums or prime costs, fully priced, held",
      );
    }
    if (escalation === "uncapped") {
      L.add(-25, "rise-and-fall clause with no cap", "price.escalation");
    } else if (escalation === "capped") {
      L.add(-10, "capped rise-and-fall clause", "price.escalation");
    } else if (escalation === "none") {
      L.note("no rise-and-fall clause, held");
    }
    const basis = str(a["pcps.basis"]);
    if (basis === "generic") {
      L.add(-15, "allowances are generic figures, not priced from the documents", "pcps.basis");
    } else if (basis === "partly") {
      L.add(-7, "allowances only partly priced from the documents", "pcps.basis");
    } else if (basis === "documented") {
      L.note("allowances priced from this project's documents, held");
    }
    if (money.permitFeesIncluded === false) {
      L.add(-5, "permit and authority fees on top of the price", "compliance.permit_fees");
    } else if (money.permitFeesIncluded === true) {
      L.note("permit and authority fees inside the price, held");
    }
    if (str(a["site.rock"]) === "variation") {
      L.add(-5, "rock removal charged as a variation", "site.rock");
    } else if (str(a["site.rock"]) === "included") {
      L.note("rock removal inside the price, held");
    }
    // A deposit above the legal cap is not a preference, it is a
    // compliance problem the owner would have to correct at contract.
    if (money.depositAboveCap && input.projectState) {
      const capPct = DEPOSIT_CAP[input.projectState.toUpperCase()];
      L.add(
        -12,
        `deposit of ${money.depositPct}% sits above the ${capPct}% statutory cap in ${input.projectState.toUpperCase()}`,
        "payments.deposit",
      );
    } else if (
      money.depositPct !== null &&
      input.projectState &&
      DEPOSIT_CAP[input.projectState.toUpperCase()] !== undefined
    ) {
      L.note("deposit within the statutory cap, held");
    }
    dims.push(L.settle("firmness"));
  }

  {
    // Scope coverage — how much of the build the price actually
    // carries. Base = the coverage marks themselves; written
    // exclusions narrow it further (capped, so honest listing is
    // never ruinous). Schedule rounds score line by line against the
    // client's pack; legacy rounds against the trade grid.
    const app = Math.max(applicable, 1);
    // On a schedule round, an allowance mark on the CLIENT'S allowance
    // line is exactly what the pack asked for — full compliance, never
    // half. Half credit is reserved for lines the builder chose to
    // allow instead of price.
    const ownerCompliant = metrics.schedule
      ? metrics.schedule.ownerAllowances.carried +
        metrics.schedule.ownerAllowances.repriced
      : 0;
    const halfCredit = Math.max(0, metrics.coverage.allowance - ownerCompliant);
    const base = Math.round(
      ((metrics.coverage.included + ownerCompliant + halfCredit * 0.5) / app) *
        100,
    );
    const unit = metrics.schedule ? "schedule line" : "applicable trade";
    const parts = [
      `${metrics.coverage.included} of ${app} ${unit}s ${
        metrics.schedule ? "priced as documented" : "in the price"
      }`,
    ];
    if (ownerCompliant > 0) {
      parts.push(
        `${ownerCompliant} client allowance line${ownerCompliant === 1 ? "" : "s"} carried in full`,
      );
    }
    if (halfCredit > 0) {
      parts.push(
        `${halfCredit} builder allowance${halfCredit === 1 ? "" : "s"} counted half`,
      );
    }
    const L = ledger(base, parts.join(", plus "));
    if (metrics.coverage.excluded > 0) {
      L.note(
        `${metrics.coverage.excluded} ${unit}${metrics.coverage.excluded === 1 ? "" : "s"} excluded, already outside the base`,
      );
    }
    if (metrics.coverage.notApplicable > 0 && metrics.schedule) {
      L.note(
        `${metrics.coverage.notApplicable} line${metrics.coverage.notApplicable === 1 ? "" : "s"} set aside as not applicable, outside the denominator`,
      );
    }
    if (extraExclusions.length > 0) {
      L.add(
        -Math.min(10, extraExclusions.length * 2),
        `${extraExclusions.length} further written exclusion${extraExclusions.length === 1 ? "" : "s"}, 2 points each`,
        "excl.derived_confirm",
      );
    }
    dims.push(L.settle("scope"));
  }

  {
    // Preparation — the diligence visible in how this tender was
    // priced. Two rubrics, both totalling exactly 100:
    //   v2 and earlier: inspection 22 · documents 16 · soil 14 ·
    //     clarifications 10 · gaps 6 · concerns 6 · itemisation 10 ·
    //     attachments 6 · commentary 10
    //   v3 (clarifications and gaps questions retired; soil is
    //     document-aware): inspection 26 · documents 20 · soil 16 ·
    //     concerns 8 · itemisation 12 · attachments 8 · commentary 10
    const isV3 = (input.instrumentVersion ?? INSTRUMENT_VERSION) >= 3;
    const W = isV3
      ? { insp: 26, docs: 20, soil: 16, concerns: 8, item: 12, attach: 8 }
      : { insp: 22, docs: 16, soil: 14, concerns: 6, item: 10, attach: 6 };
    const L = ledger(0, null);
    const insp = str(a["elig.site_inspection"]);
    if (insp === "inspected") {
      L.add(W.insp, "inspected the site");
    } else {
      if (insp === "not_inspected") {
        L.note("priced without a site inspection, acknowledged");
      }
      L.miss(W.insp, "walking the site earns these", "elig.site_inspection");
    }
    const docs = str(a["elig.docs_reviewed"]);
    if (docs === "full_set") L.add(W.docs, "reviewed the full document set");
    else if (docs === "partial") {
      L.add(5, "documents only partially reviewed");
      L.miss(W.docs - 5, "reading the full set earns the balance", "elig.docs_reviewed");
    } else {
      L.miss(W.docs, "document review not recorded", "elig.docs_reviewed");
    }
    if (isV3) {
      // Document-aware soil: a report on file is confirmed; no report
      // asks for the assumed basis instead.
      const SOIL_LABEL: Record<string, string> = {
        a: "A",
        s: "S",
        m: "M",
        h: "H1/H2",
        e: "E",
        p: "P",
      };
      const basis = str(a["site.soil_class_basis"]);
      if (a["site.soil_class_confirm"] === true) {
        L.add(W.soil, "priced to the site's soil report");
      } else if (basis && basis !== "not_stated") {
        L.add(
          10,
          `assumed class ${SOIL_LABEL[basis] ?? basis.toUpperCase()} stated plainly, no report provided`,
        );
        L.miss(W.soil - 10, "a soil report for this site earns the full 16", "site.soil_class_basis");
      } else {
        if (basis === "not_stated") {
          L.note("no soil classification stated for the price");
        }
        L.miss(W.soil, "stating the soil basis of the price earns these", "site.soil_class_basis");
      }
    } else {
      const soil = str(a["site.soil_report"]);
      if (soil === "site_report") {
        L.add(W.soil, "priced from this site's soil report");
      } else {
        if (soil === "assumed") {
          L.note("soil classification assumed, not tested");
        }
        L.miss(W.soil, "pricing from this site's soil report earns these", "site.soil_report");
      }
      const rfis = str(a["understand.rfis"]);
      if (rfis === "answered") {
        L.add(10, "raised and resolved clarifications while pricing");
      } else if (rfis === "none_needed") {
        L.add(6, "no clarifications needed");
        L.miss(4, "raising and closing out questions earns the full weight", "understand.rfis");
      } else {
        if (rfis === "awaiting") {
          L.note("still awaiting answers to clarifications");
        }
        L.miss(10, "clarifications not raised or not closed out", "understand.rfis");
      }
      if (
        a["understand.gaps"] === true &&
        arr(a["understand.gap_items"]).length > 0
      ) {
        L.add(6, "documented the gaps they priced around");
      } else {
        L.miss(6, "documenting the gaps priced around earns these", "understand.gaps");
      }
    }
    if (
      a["understand.concerns"] === true &&
      arr(a["understand.concern_items"]).length > 0
    ) {
      L.add(W.concerns, "flagged design or constructability concerns");
    } else {
      L.miss(
        W.concerns,
        "flagging design or constructability concerns earns these",
        "understand.concerns",
      );
    }
    const itemPts = Math.min(W.item, metrics.itemisedCount);
    if (itemPts > 0) {
      L.add(
        itemPts,
        metrics.schedule
          ? `disclosed ${metrics.itemisedCount} line price${metrics.itemisedCount === 1 ? "" : "s"} on the schedule, to ${W.item}`
          : `itemised ${metrics.itemisedCount} trade${metrics.itemisedCount === 1 ? "" : "s"} by amount, to ${W.item}`,
      );
    }
    if (itemPts < W.item) {
      L.miss(
        W.item - itemPts,
        metrics.schedule
          ? `disclosing line prices earns up to the full ${W.item}`
          : `itemising trades by amount earns up to the full ${W.item}`,
        metrics.schedule ? "scope.schedule" : "scope.matrix",
      );
    }
    const docPts = Math.min(W.attach, input.documentCount * 2);
    if (docPts > 0) {
      L.add(
        docPts,
        `attached ${input.documentCount} supporting document${input.documentCount === 1 ? "" : "s"}, 2 each to ${W.attach}`,
      );
    }
    if (docPts < W.attach) {
      L.miss(W.attach - docPts, `supporting documents earn 2 each, to ${W.attach}`, "__docs");
    }
    const commPts = commentary.present
      ? Math.min(
          10,
          (commentary.approach ? 4 : 0) +
            ve.length * 2 +
            recommendations.length * 2 +
            riskAdvice.length * 2,
        )
      : 0;
    if (commPts > 0) {
      L.add(commPts, "completed the optional commentary module");
    }
    if (commPts < 10) {
      L.miss(
        10 - commPts,
        "approach, value engineering and risk advice earn up to the full 10",
        "comment.approach",
      );
    }
    dims.push(L.settle("preparation", { rubricTotal: 100 }));
  }

  {
    // Credentials & capacity — who they are and how much attention
    // your project gets. Weights total exactly 100:
    //   experience 20 · largest contract 15 · site-lead load 12
    //   concurrent projects 8 · crew tenure 8 · WHS 10 · QA 10
    //   references 10 · in-house trades 4 · memberships 3
    // Platform verification (ABN, licence) is shown in About the
    // builders and deliberately not scored here.
    const L = ledger(0, null);
    const slot = (
      earned: number,
      max: number,
      gainLabel: string | null,
      missLabel: string,
      qid?: string,
    ) => {
      if (earned > 0 && gainLabel) L.add(earned, gainLabel, qid);
      if (earned < max) L.miss(max - earned, missLabel, qid);
    };
    const expPts: Record<string, number> = {
      "1_5": 5,
      "6_20": 12,
      "21_50": 17,
      "50_plus": 20,
    };
    slot(
      exp ? (expPts[exp] ?? 0) : 0,
      20,
      exp ? `${EXPERIENCE[exp]?.toLowerCase()}` : null,
      "full marks need 50 or more comparable projects",
      "creds.experience_type",
    );
    const largePts: Record<string, number> = {
      under_500k: 3,
      "500k_1m": 6,
      "1m_2m": 10,
      "2m_5m": 13,
      "5m_plus": 15,
    };
    const largest = str(a["creds.largest_value"]);
    slot(
      largest ? (largePts[largest] ?? 0) : 0,
      15,
      largest ? `${LARGEST[largest]?.toLowerCase()}` : null,
      "full marks need a largest contract over $5m",
      "creds.largest_value",
    );
    const loadPts: Record<string, number> = { "1_2": 12, "3_5": 6, "6_plus": 0 };
    const load = str(a["team.supervisor_load"]);
    slot(
      load ? (loadPts[load] ?? 0) : 0,
      12,
      load ? `site lead ${LOAD[load]}` : null,
      "full marks need a site lead carrying 1 to 2 jobs",
      "team.supervisor_load",
    );
    const concPts: Record<string, number> = { "0_2": 8, "3_5": 4, "6_plus": 0 };
    slot(
      concurrent ? (concPts[concurrent] ?? 0) : 0,
      8,
      concurrent ? `${CONCURRENT[concurrent]?.toLowerCase()}` : null,
      "full marks need at most 2 concurrent projects",
      "programme.concurrent",
    );
    if (tenure === "under_1") L.note("crews together under a year");
    slot(
      tenure === "3_plus" ? 8 : tenure === "1_3" ? 4 : 0,
      8,
      tenure === "3_plus"
        ? "core crews together 3+ years"
        : tenure === "1_3"
          ? "core crews together 1–3 years"
          : null,
      "full marks need core crews together 3 or more years",
      "team.crew_tenure",
    );
    const whsPts: Record<string, number> = {
      certified: 10,
      documented: 6,
      swms: 3,
    };
    slot(
      whs ? (whsPts[whs] ?? 0) : 0,
      10,
      whs ? `${(WHS[whs] ?? whs).toLowerCase()}` : null,
      "full marks need a certified WHS system",
      "creds.whs",
    );
    const qaPts = Math.min(
      10,
      (qa.includes("independent") ? 6 : 0) +
        (qa.includes("itp") ? 4 : 0) +
        (qa.includes("supervisor") ? 2 : 0),
    );
    slot(
      qaPts,
      10,
      "quality control in place",
      "full marks need independent inspections with documented ITPs",
      "creds.qa",
    );
    const refPts = Math.min(10, references.length * 4 + refLinks);
    if (refPts === 0) L.note("no references offered");
    slot(
      refPts,
      10,
      `${references.length} referee${references.length === 1 ? "" : "s"}${refLinks ? " with project links" : ""}, 4 each to 10`,
      "referees earn 4 each, project links 1 each, to 10",
      "creds.references",
    );
    slot(
      Math.min(4, inHouse.length * 2),
      4,
      `${inHouse.length} trade${inHouse.length === 1 ? "" : "s"} in-house`,
      "in-house trades earn 2 each, to 4",
      "team.in_house",
    );
    slot(
      memberships.length > 0 ? 3 : 0,
      3,
      memberships.length > 0
        ? `${memberships.map((m) => m.toUpperCase()).join(" and ")} member`
        : null,
      "industry membership earns 3",
      "creds.memberships",
    );
    dims.push(L.settle("credentials", { rubricTotal: 100 }));
  }

  {
    // Delivery & aftercare — how the build is run and what happens
    // after the keys. Weights total exactly 100 (no rescaling; the
    // ledger IS the score):
    //   updates 16 · variations in writing 18 · no variation fee 6
    //   defects period 22 · walkthrough 10 · response 16 · pack 12
    const L = ledger(0, null);
    const slot = (
      earned: number,
      max: number,
      gainLabel: string | null,
      missLabel: string,
      qid?: string,
    ) => {
      if (earned > 0 && gainLabel) L.add(earned, gainLabel, qid);
      if (earned < max) L.miss(max - earned, missLabel, qid);
    };
    const updPts: Record<string, number> = {
      weekly: 16,
      fortnightly: 10,
      milestones: 5,
    };
    slot(
      upd ? (updPts[upd] ?? 0) : 0,
      16,
      upd ? `${(UPDATES[upd] ?? upd).toLowerCase()}` : null,
      "full marks need weekly progress updates",
      "team.updates",
    );
    if (a["contract.variations_written"] === false) {
      L.note("variations not always in writing");
    }
    slot(
      a["contract.variations_written"] === true ? 18 : 0,
      18,
      "variations always priced in writing first",
      "committing to written variations before work earns 18",
      "contract.variations_written",
    );
    slot(
      a["contract.variation_fee"] === false ? 6 : 0,
      6,
      "no variation admin fee",
      "waiving the variation admin fee earns 6",
      "contract.variation_fee",
    );
    const dlpPts: Record<string, number> = { "3": 3, "6": 8, "12": 16, "24": 22 };
    const dlp = metrics.defectsLiabilityMonths;
    slot(
      dlp ? (dlpPts[dlp] ?? 0) : 0,
      22,
      dlp ? `${dlp}-month defects period` : null,
      "full marks need a 24 month defects period",
      "contract.defects_liability",
    );
    slot(
      a["aftercare.walkthrough"] === true ? 10 : 0,
      10,
      "pre-handover walkthrough",
      "a pre-handover walkthrough earns 10",
      "aftercare.walkthrough",
    );
    const respPts: Record<string, number> = { "48h": 16, "1w": 8, best_effort: 2 };
    slot(
      resp ? (respPts[resp] ?? 0) : 0,
      16,
      resp ? `${(RESPONSE[resp] ?? resp).toLowerCase()}` : null,
      "full marks need defect calls answered within 48 hours",
      "aftercare.response",
    );
    slot(
      a["aftercare.manual"] === true ? 12 : 0,
      12,
      "handover pack provided",
      "a handover pack earns 12",
      "aftercare.manual",
    );
    dims.push(L.settle("delivery", { rubricTotal: 100 }));
  }

  {
    // Programme confidence — cushions and commitments, not speed.
    // Weights total exactly 100:
    //   weather realism 30 · liquidated damages 30 · validity 20
    //   lead time 10 · checkable handover 10
    const L = ledger(0, null);
    const weatherPts =
      weatherIncluded !== null && weatherIncluded > 0
        ? Math.min(30, 15 + weatherIncluded)
        : weatherAddon !== null
          ? 12
          : 0;
    if (weatherPts > 0) {
      L.add(
        weatherPts,
        weatherIncluded !== null && weatherIncluded > 0
          ? `${weatherIncluded} weather days inside the build period`
          : `${weatherAddon} weather days declared on top, disclosed honestly`,
      );
    } else {
      L.note("no weather allowance disclosed");
    }
    if (weatherPts < 30) {
      L.miss(
        30 - weatherPts,
        "full marks need 15 or more weather days inside the build period",
        "programme.weather",
      );
    }
    if (metrics.ldPerWeek !== null) {
      L.add(30, `liquidated damages offered at ${aud(metrics.ldPerWeek)}/week`);
    } else {
      L.note("no liquidated damages offered");
      L.miss(30, "backing the programme with liquidated damages earns 30", "programme.liquidated_damages");
    }
    const vd = metrics.validityDays;
    const vdPts = vd !== null ? (vd >= 45 ? 20 : vd >= 30 ? 15 : vd >= 21 ? 8 : 3) : 0;
    if (vdPts > 0) L.add(vdPts, `price holds ${vd} days`);
    if (vdPts < 20) {
      L.miss(20 - vdPts, "full marks need a price held 45 days or more", "price.validity");
    }
    if (programme.leadTime) {
      L.add(10, `lead time stated, ${programme.leadTime}`);
    } else {
      L.miss(10, "stating the lead time earns 10", "prog.lead_time");
    }
    if (programme.handoverLabel) {
      L.add(10, "start and duration produce a checkable handover window");
    } else {
      L.miss(10, "a stated start and duration earn 10", "programme.start");
    }
    dims.push(L.settle("programme", { rubricTotal: 100 }));
  }

  /* ── flags ──────────────────────────────────────────────────────── */
  const flags: EvalFlag[] = [];
  const flag = (
    id: string,
    severity: FlagSeverity,
    label: string,
    detail: string,
    ask?: string,
  ) => flags.push({ id, severity, label, detail, ask });

  if (money.fixed === false) {
    flag(
      "not-fixed",
      "high",
      "Price is an estimate",
      "The builder answered that this is not a fixed price.",
      "Ask what would convert this to a fixed contract sum, and what it would cost.",
    );
  }
  if (escalation === "uncapped") {
    flag(
      "escalation-uncapped",
      "high",
      "Uncapped rise-and-fall clause",
      "The contract sum can increase with material or labour costs, with no ceiling.",
      "Ask for the escalation clause in writing, and whether they will cap it.",
    );
  } else if (escalation === "capped") {
    flag(
      "escalation-capped",
      "note",
      "Capped rise-and-fall clause",
      "Costs can escalate within a stated cap.",
      "Ask for the cap and the trigger conditions in writing.",
    );
  }
  if (builderExposurePct >= 12) {
    flag(
      "exposure-high",
      "high",
      `${Math.round(builderExposurePct)}% of the price can still move`,
      metrics.schedule
        ? `${aud(builderExposure)} sits in allowances of the builder's own choosing, beyond the client's stated allowance lines.`
        : `${aud(exposure)} sits in provisional sums and prime costs (${metrics.psCount} PS, ${metrics.pcCount} PC).`,
      "Ask which allowances they would fix if the documents were finalised now.",
    );
  } else if (builderExposurePct >= 5) {
    flag(
      "exposure-medium",
      "attention",
      `${aud(builderExposure)} in the builder's own allowances`,
      metrics.schedule
        ? `${Math.round(builderExposurePct)}% of the price moves beyond the client's stated allowance lines.`
        : `${Math.round(exposurePct)}% of the price is provisional sums and prime costs.`,
      "Ask what each allowance is based on for this site.",
    );
  }
  if (str(a["pcps.basis"]) === "generic") {
    flag(
      "generic-allowances",
      "attention",
      "Generic allowances",
      "Allowances are standard figures, not priced from this project's documents.",
      "Ask them to re-price the allowances from the drawings and schedules.",
    );
  }
  if (str(a["site.soil_report"]) === "assumed") {
    flag(
      "soil-assumed",
      "attention",
      "Soil classification assumed",
      `Priced on an assumed ${(str(a["site.soil_class"]) ?? "").toUpperCase()} class site, not a report for this block.`,
      "Share the soil report if one exists, or ask what a class change would cost.",
    );
  }
  {
    // v3: the basis question only exists when the round has no soil
    // report, so an answer here means the price rests on an
    // assumption — unless a later addendum brought the report and the
    // builder affirmed it, in which case the stale basis stays quiet.
    const basis = str(a["site.soil_class_basis"]);
    if (basis && a["site.soil_class_confirm"] !== true) {
      flag(
        "soil-assumed",
        "attention",
        "Soil classification assumed",
        basis === "not_stated"
          ? "No soil report was provided for this site and the tender states no assumed classification."
          : `Priced on an assumed class ${basis === "h" ? "H1/H2" : basis.toUpperCase()} site; no soil report was provided for this block.`,
        "Commission a soil report before contract, or ask what a class change would cost.",
      );
    }
  }
  if (str(a["site.rock"]) === "variation") {
    flag(
      "rock-variation",
      "attention",
      "Rock removal is a variation",
      "If excavation hits rock, removal is charged on top of the price.",
      "Ask for their rock rate per cubic metre now, not when it happens.",
    );
  }
  if (money.permitFeesIncluded === false) {
    flag(
      "permit-fees",
      "attention",
      "Permit and authority fees excluded",
      "Budget for these on top of the contract price.",
      "Ask for their estimate of the fees for this project.",
    );
  }
  if (money.depositAboveCap && input.projectState) {
    flag(
      "deposit-cap",
      "high",
      "Deposit above the statutory cap",
      `${money.depositPct}% deposit exceeds the ${DEPOSIT_CAP[input.projectState.toUpperCase()]}% cap for a contract of this size in ${input.projectState.toUpperCase()}.`,
      "Ask them to correct the deposit to the legal maximum.",
    );
  }
  if (metrics.schedule && metrics.schedule.notApplicable >= 3) {
    flag(
      "na-heavy",
      "attention",
      `${metrics.schedule.notApplicable} schedule lines marked not applicable`,
      "The builder holds these lines do not apply to this project.",
      "Confirm you agree these lines sit outside the project before comparing prices.",
    );
  }
  if (str(a["elig.site_inspection"]) === "not_inspected") {
    flag(
      "no-inspection",
      "attention",
      "Priced without a site inspection",
      "The builder acknowledged pricing this tender without visiting the site.",
      "Invite them to walk the site before you rely on this price.",
    );
  }
  if (str(a["elig.docs_reviewed"]) === "partial") {
    flag(
      "partial-docs",
      "attention",
      "Documents only partially reviewed",
      str(a["elig.docs_outstanding"])
        ? `Outstanding: ${str(a["elig.docs_outstanding"])}.`
        : "Part of the document set was not reviewed before pricing.",
      "Ask them to confirm the price after reading the full set.",
    );
  }
  if (str(a["understand.rfis"]) === "awaiting") {
    flag(
      "rfis-open",
      "attention",
      "Clarifications still open",
      "The builder priced while awaiting answers to their questions.",
      "Close out their questions and ask whether the price changes.",
    );
  }
  if (str(a["team.supervisor_load"]) === "6_plus") {
    flag(
      "supervisor-load",
      "attention",
      "Site lead carries 6+ jobs",
      "Whoever runs your site is spread across at least six projects.",
      "Ask how often they will personally be on your site each week.",
    );
  }
  if (str(a["programme.concurrent"]) === "6_plus") {
    flag(
      "capacity",
      "note",
      "6+ concurrent projects",
      "The business expects to run six or more jobs alongside yours.",
    );
  }
  if (str(a["team.crew_tenure"]) === "under_1") {
    flag(
      "crew-tenure",
      "note",
      "New crews",
      "Core subcontract crews have been with the builder under a year.",
    );
  }
  if (metrics.defectsLiabilityMonths === "3") {
    flag(
      "short-defects",
      "attention",
      "3-month defects period",
      "Defects cover after handover is the shortest offered band.",
      "Ask whether they will match a 12-month defects period.",
    );
  }
  if (str(a["aftercare.response"]) === "best_effort") {
    flag(
      "aftercare-loose",
      "note",
      "No committed defect response time",
      "Defect calls are answered on a best-effort basis.",
    );
  }
  if (
    weatherIncluded === null &&
    weatherAddon === null &&
    metrics.durationWeeks !== null
  ) {
    flag(
      "no-weather",
      "note",
      "No weather allowance disclosed",
      "Neither an included weather allowance nor an add-on was declared.",
      "Ask how many wet days the programme can absorb before the date moves.",
    );
  }
  if (a["contract.variations_written"] === false) {
    flag(
      "variations-verbal",
      "high",
      "Variations not always in writing",
      "Work can proceed on variations before they are priced in writing.",
      "Make written variations a condition of contract.",
    );
  }
  if ((money.validityDays ?? 99) < 21) {
    flag(
      "short-validity",
      "note",
      `Price holds only ${money.validityDays} days`,
      "A short validity window puts pressure on your decision.",
      "Ask for an extension to at least 30 days.",
    );
  }

  const sevRank: Record<FlagSeverity, number> = {
    high: 0,
    attention: 1,
    note: 2,
  };
  flags.sort((x, y) => sevRank[x.severity] - sevRank[y.severity]);

  /* highlights — the strengths, in the same plain register */
  const highlights: string[] = [];
  if (exGst && builderExposure === 0 && money.fixed === true) {
    highlights.push(
      clientCarried > 0
        ? "No allowances beyond the client's own stated lines"
        : "Fully priced, no provisional sums or prime costs",
    );
  }
  if (escalation === "none") highlights.push("No rise-and-fall clause");
  if (metrics.ldPerWeek !== null) {
    highlights.push(
      `Backs their programme with ${aud(metrics.ldPerWeek)}/week liquidated damages`,
    );
  }
  if (metrics.defectsLiabilityMonths === "24") {
    highlights.push("24-month defects period, double the common cover");
  }
  if (whs === "certified") highlights.push("Certified WHS management system");
  if (qa.includes("independent")) {
    highlights.push("Independent stage inspections on quality");
  }
  if (inHouse.length >= 2) {
    highlights.push(
      `${inHouse.length} trades delivered by their own people`,
    );
  }
  if (references.length >= 3) {
    highlights.push(`${references.length} referees offered`);
  }
  if (metrics.itemisedCount >= 5) {
    highlights.push(
      `Itemised ${metrics.itemisedCount} trades (${aud(metrics.itemisedTotal)} accounted)`,
    );
  }
  if (commentary.veSavingsTotal > 0) {
    highlights.push(
      `Found the owner ${aud(commentary.veSavingsTotal)} in value-engineering ideas`,
    );
  }
  if (
    str(a["elig.site_inspection"]) === "inspected" &&
    str(a["elig.docs_reviewed"]) === "full_set"
  ) {
    highlights.push("Inspected the site and read the full document set");
  }
  if (input.verification?.anyLicenceVerified) {
    highlights.push("Licence verified by BuilderHQ");
  }

  const questions = Array.from(
    new Set(flags.map((f) => f.ask).filter((q): q is string => !!q)),
  );

  return {
    tenderId: input.tenderId,
    builderName: input.builderName,
    builderSlug: input.builderSlug ?? null,
    status: input.status,
    monogram: monogramOf(input.builderName),
    metrics,
    money,
    scope,
    programme,
    commentary,
    credentialRows,
    deliveryRows,
    dimensions: dims,
    overall: weightedOverall(dims),
    insurance: {
      publicLiability: a["elig.insurance_pl"] === true,
      warrantyEligible:
        typeof a["elig.warranty_eligible"] === "boolean"
          ? a["elig.warranty_eligible"]
          : null,
      workersComp:
        str(a["elig.workers_comp"]) === "current"
          ? "current"
          : str(a["elig.workers_comp"]) === "not_required"
            ? "not_required"
            : null,
    },
    flags,
    highlights,
    questions,
    positions: [], // filled at round level
    documentCount: input.documentCount,
    verification: input.verification ?? {
      abnVerified: false,
      anyLicenceVerified: false,
    },
  };
}

/* ── round evaluation ───────────────────────────────────────────────── */

export function evaluateRound(
  inputs: EvaluationInput[],
  schedule: TenderSchedule | null = null,
): RoundEvaluation {
  const tenders = inputs.map((i) => evaluateTender(i, schedule));

  /* spread, breakeven, price story */
  const priced = tenders.filter(
    (t) => t.money.incGst !== null && t.money.exGst !== null,
  );
  let spread: RoundEvaluation["spread"] = null;
  let breakeven: RoundEvaluation["breakeven"] = null;
  let priceStory: string | null = null;

  if (priced.length >= 2) {
    const byHeadline = [...priced].sort(
      (a, b) => a.money.incGst! - b.money.incGst!,
    );
    const cheapest = byHeadline[0]!;
    // Certainty compares what each BUILDER left open. The client's own
    // allowance lines sit on every tender identically, so a builder
    // who carried them as instructed must never rank below one who
    // firm-priced figures the client asked to hold.
    const certainty = [...priced].sort(
      (a, b) => b.money.builderFirmPct - a.money.builderFirmPct,
    )[0]!;
    spread = {
      lowestInc: cheapest.money.incGst!,
      highestInc: byHeadline[byHeadline.length - 1]!.money.incGst!,
      range:
        byHeadline[byHeadline.length - 1]!.money.incGst! -
        cheapest.money.incGst!,
      cheapestHeadlineId: cheapest.tenderId,
      certaintyId: certainty.tenderId,
    };

    // Breakeven: among firmer rivals within reach of the allowance
    // pool, take the NEAREST price — the tightest test of the saving.
    // Compared ex GST on both sides, and only on the allowances the
    // cheapest builder CHOSE: the client's own lines move identically
    // for everyone, so they can never eat a saving between tenders.
    if (cheapest.money.builderExposureExGst > 0) {
      const rival = [...priced]
        .filter(
          (r) =>
            r.tenderId !== cheapest.tenderId &&
            r.money.builderFirmPct > cheapest.money.builderFirmPct &&
            r.money.exGst! - cheapest.money.exGst! <
              cheapest.money.builderExposureExGst,
        )
        .sort((a, b) => a.money.exGst! - b.money.exGst!)[0];
      if (rival) {
        const saving = rival.money.exGst! - cheapest.money.exGst!;
        breakeven = {
          cheaperId: cheapest.tenderId,
          rivalId: rival.tenderId,
          savingExGst: saving,
          exposureExGst: cheapest.money.builderExposureExGst,
          breakevenPct: Math.round(
            (saving / cheapest.money.builderExposureExGst) * 100,
          ),
        };
      }
    }

    if (breakeven) {
      const rival = tenders.find((t) => t.tenderId === breakeven!.rivalId)!;
      priceStory = `${cheapest.builderName} is ${aud(breakeven.savingExGst)} cheaper on paper, but ${aud(breakeven.exposureExGst)} of its price sits in allowances of its own choosing that ${rival.builderName} has priced in full. If those allowances overrun their stated figures by more than ${breakeven.breakevenPct}%, the saving is gone. The decision is not which number is lower; it is how much you trust the allowances.`;
    } else if (100 - cheapest.money.builderFirmPct >= 8) {
      priceStory = `${cheapest.builderName} leads on price, but ${Math.round(100 - cheapest.money.builderFirmPct)}% of that number sits in allowances of the builder's own choosing. Weigh the firm portion, not the headline.`;
    } else {
      const runner = byHeadline[1]!;
      priceStory = `${cheapest.builderName} leads on price by ${aud(runner.money.incGst! - cheapest.money.incGst!)}, and the number is largely firm. This round is more likely decided on scope, credentials and delivery than on price.`;
    }
  }

  /* dimension leaders */
  const leaders: Partial<Record<DimensionKey, string>> = {};
  const dimKeys = Object.keys(DIMENSION_LABELS) as DimensionKey[];
  for (const key of dimKeys) {
    let best: TenderEvaluation | null = null;
    for (const t of tenders) {
      const d = t.dimensions.find((x) => x.key === key);
      if (!d) continue;
      const bestScore = best?.dimensions.find((x) => x.key === key)?.score ?? -1;
      if (d.score > bestScore) best = t;
    }
    if (best) leaders[key] = best.tenderId;
  }

  /* positions — arithmetically-true superlatives, max two each */
  if (priced.length >= 2) {
    const give = (id: string, label: string) => {
      const t = tenders.find((x) => x.tenderId === id);
      if (t && t.positions.length < 2 && !t.positions.includes(label)) {
        t.positions.push(label);
      }
    };
    give(spread!.cheapestHeadlineId, "Lowest headline price");
    const fullyPriced = priced.filter((t) => t.money.builderFirmPct >= 99);
    if (fullyPriced.length > 0) {
      for (const t of fullyPriced) {
        give(
          t.tenderId,
          t.money.clientAllowanceExGst > 0
            ? "Firm beyond your allowances"
            : "Fully priced",
        );
      }
    } else {
      const firmest = tenders.find(
        (t) => t.tenderId === spread!.certaintyId,
      )!;
      if (firmest.tenderId !== spread!.cheapestHeadlineId) {
        give(firmest.tenderId, "Highest price certainty");
      }
    }
    const fastest = [...tenders]
      .filter((t) => t.programme.weeks !== null)
      .sort((a, b) => a.programme.weeks! - b.programme.weeks!)[0];
    if (fastest) give(fastest.tenderId, "Shortest build period");
    if (leaders.credentials) {
      give(leaders.credentials, "Strongest credentials");
    }
    if (leaders.scope) give(leaders.scope, "Broadest scope");
    if (leaders.preparation) give(leaders.preparation, "Most prepared");
    for (const t of tenders) {
      if (t.metrics.defectsLiabilityMonths === "24") {
        give(t.tenderId, "Longest defects cover");
      }
    }
  }

  /* scope disagreements — the same project, read differently */
  const rows = scopeMatrixRows();
  const disagreements: ScopeDisagreement[] = [];
  const STATE_LABEL: Record<string, string> = {
    included: "Included",
    allowance: "Allowance",
    excluded: "Excluded",
    not_applicable: "N/A",
  };
  if (schedule) {
    // Schedule rounds disagree line by line: every builder answered
    // the same pack, so a split state on any line is a real, precise
    // question for the round — not a category-level shrug.
    const SCHED_LABEL: Record<string, string> = {
      documented: "As documented",
      allowance: "Allowance",
      excluded: "Excluded",
      na: "Not applicable",
    };
    for (const item of tenderableItems(schedule)) {
      const states = new Map<string, string>();
      for (const t of inputs) {
        const marks = readScheduleAnswer(t.answers["scope.schedule"]);
        states.set(t.tenderId, marks[item.itemId]?.s ?? "");
      }
      const distinct = new Set([...states.values()].filter((s) => s));
      if (distinct.size > 1) {
        const rec: Record<string, string> = {};
        for (const [id, s] of states) rec[id] = SCHED_LABEL[s] ?? "—";
        disagreements.push({
          trade: `${item.label} (${item.divisionLabel})`,
          states: rec,
        });
      }
    }
  } else {
    for (const row of rows) {
      const states = new Map<string, string>();
      for (const t of inputs) {
        const m = (t.answers["scope.matrix"] ?? {}) as Record<string, string>;
        states.set(t.tenderId, m[row.id] ?? "");
      }
      const distinct = new Set(
        [...states.values()].filter((s) => s && s !== "not_applicable"),
      );
      if (distinct.size > 1) {
        const rec: Record<string, string> = {};
        for (const [id, s] of states) rec[id] = STATE_LABEL[s] ?? "—";
        disagreements.push({
          trade: tradeLabel(row.id as TradeId),
          states: rec,
        });
      }
    }
  }
  // Most consequential first: rows where someone excluded outright.
  disagreements.sort((a, b) => {
    const weightOf = (d: ScopeDisagreement) =>
      Object.values(d.states).reduce(
        (n, s) =>
          n + (s === "Excluded" ? 2 : s === "Not applicable" ? 1 : 0),
        0,
      );
    return weightOf(b) - weightOf(a);
  });

  /* round-level questions */
  const roundQuestions: string[] = [];
  const assumedSoil = tenders.filter(
    (t) => t.flags.some((f) => f.id === "soil-assumed"),
  );
  if (assumedSoil.length > 0 && assumedSoil.length < tenders.length) {
    roundQuestions.push(
      "Share the soil report with every builder so all prices rest on the same ground conditions.",
    );
  }
  if (disagreements.length > 0) {
    const unit = schedule ? "schedule line" : "trade";
    roundQuestions.push(
      `${disagreements.length} ${unit}${disagreements.length === 1 ? " is" : "s are"} treated differently across the round. Confirm each builder priced the same scope before comparing numbers.`,
    );
  }
  const noWeather = tenders.filter((t) =>
    t.flags.some((f) => f.id === "no-weather"),
  );
  if (noWeather.length > 0) {
    roundQuestions.push(
      "Ask every builder to state their weather allowance the same way, inside or on top of the programme.",
    );
  }

  /* the ladder — what each step up the price order actually buys.
     Only facts where the dearer tender is STRICTLY better ever
     appear; if a step buys nothing measurable, it says so. */
  const ladder: RoundEvaluation["ladder"] = [];
  {
    const live = priced
      .filter((t) => t.status !== "rejected")
      .sort((x, y) => x.money.incGst! - y.money.incGst!);
    for (let i = 0; i + 1 < live.length; i++) {
      const lo = live[i]!;
      const hi = live[i + 1]!;
      const gains: string[] = [];
      if (hi.money.builderExposureExGst < lo.money.builderExposureExGst) {
        gains.push(
          hi.money.builderExposureExGst === 0
            ? `nothing of its own in allowances, removing ${aud(lo.money.builderExposureExGst)} of movement`
            : `${aud(lo.money.builderExposureExGst - hi.money.builderExposureExGst)} less held in allowances of its own`,
        );
      }
      if (
        lo.money.escalation === "uncapped" &&
        (hi.money.escalation === "none" || hi.money.escalation === "capped")
      ) {
        gains.push(
          hi.money.escalation === "none"
            ? "no rise-and-fall clause"
            : "a capped rise-and-fall clause",
        );
      }
      if (
        hi.programme.weeks !== null &&
        lo.programme.weeks !== null &&
        hi.programme.weeks < lo.programme.weeks
      ) {
        gains.push(`keys ${lo.programme.weeks - hi.programme.weeks} weeks sooner`);
      }
      const dlpLo = Number(lo.metrics.defectsLiabilityMonths ?? 0);
      const dlpHi = Number(hi.metrics.defectsLiabilityMonths ?? 0);
      if (dlpHi > dlpLo) {
        gains.push(`${dlpHi - dlpLo} more months of defects cover`);
      }
      if (hi.programme.ldPerWeek !== null && lo.programme.ldPerWeek === null) {
        gains.push("a programme backed by liquidated damages");
      }
      const respLo = lo.deliveryRows.find((r) => r.label === "Aftercare");
      const respHi = hi.deliveryRows.find((r) => r.label === "Aftercare");
      const rr = (v?: string) =>
        v?.includes("48 hours") ? 2 : v?.includes("week") ? 1 : 0;
      if (respHi && respLo && rr(respHi.value) > rr(respLo.value)) {
        gains.push("faster defect response after handover");
      }
      ladder.push({
        fromId: lo.tenderId,
        toId: hi.tenderId,
        fromName: lo.builderName,
        toName: hi.builderName,
        extraInc: hi.money.incGst! - lo.money.incGst!,
        gains: gains.slice(0, 3),
      });
    }
  }

  return {
    tenders,
    spread,
    breakeven,
    ladder,
    priceStory,
    leaders,
    scopeDisagreements: disagreements,
    roundQuestions,
  };
}
