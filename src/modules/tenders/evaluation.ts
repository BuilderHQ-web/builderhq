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
  type TenderMetrics,
} from "./instrument";
import { tradeLabel, type TradeId } from "./trades";

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

export interface DimensionScore {
  key: DimensionKey;
  label: string;
  /** 0–100. A read of the DISCLOSED position, not of the builder. */
  score: number;
  /** The facts the score was computed from, signed: "+15 site inspected". */
  receipts: string[];
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

export interface MoneyPicture {
  /** Contract price ex GST as answered (null when unanswered). */
  exGst: number | null;
  /** GST-inclusive price (the headline owners fund). */
  incGst: number | null;
  /** PS + PC allowances inside the price (ex GST). */
  exposure: number;
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

export function evaluateTender(input: EvaluationInput): TenderEvaluation {
  const a = input.answers;
  const metrics = computeTenderMetrics(a);
  const rows = scopeMatrixRows();
  const matrix = (a["scope.matrix"] ?? {}) as Record<string, string>;

  /* money */
  const exGst = metrics.priceExGst;
  const exposure = metrics.allowanceExposure;
  const exposurePct =
    exGst && exGst > 0 ? Math.min(100, (exposure / exGst) * 100) : 0;
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

  /* scope */
  const excludedTrades = rows
    .filter((r) => matrix[r.id] === "excluded")
    .map((r) => tradeLabel(r.id as TradeId));
  const allowanceTrades = rows
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
  const applicable = rows.length - metrics.coverage.notApplicable;
  const scope: ScopeRead = {
    ...metrics.coverage,
    applicable,
    excludedTrades,
    allowanceTrades,
    extraExclusions,
    ownerSupplied,
    itemisedCount: metrics.itemisedCount,
    itemisedTotal: metrics.itemisedTotal,
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

  /* ── dimensions, with receipts ──────────────────────────────────── */
  const dims: DimensionScore[] = [];

  {
    // Price firmness — how much of the number is actually the number.
    const r: string[] = [];
    let s = 100;
    if (money.fixed === false) {
      s -= 40;
      r.push("−40 price is an estimate, not fixed");
    }
    const expPenalty = Math.min(60, Math.round(exposurePct * 2));
    if (expPenalty > 0) {
      s -= expPenalty;
      r.push(
        `−${expPenalty} ${Math.round(exposurePct)}% of the price sits in allowances (${aud(exposure)})`,
      );
    } else if (exGst) {
      r.push("+0 no provisional sums or prime costs, fully priced");
    }
    if (escalation === "uncapped") {
      s -= 25;
      r.push("−25 rise-and-fall clause with no cap");
    } else if (escalation === "capped") {
      s -= 10;
      r.push("−10 capped rise-and-fall clause");
    }
    const basis = str(a["pcps.basis"]);
    if (basis === "generic") {
      s -= 15;
      r.push("−15 allowances are generic figures, not priced from the documents");
    } else if (basis === "partly") {
      s -= 7;
      r.push("−7 allowances only partly priced from the documents");
    }
    if (money.permitFeesIncluded === false) {
      s -= 5;
      r.push("−5 permit and authority fees on top of the price");
    }
    if (str(a["site.rock"]) === "variation") {
      s -= 5;
      r.push("−5 rock removal charged as a variation");
    }
    dims.push({
      key: "firmness",
      label: DIMENSION_LABELS.firmness,
      score: clamp(s),
      receipts: r,
    });
  }

  {
    // Scope coverage — how much of the build the price actually carries.
    const r: string[] = [];
    const app = Math.max(applicable, 1);
    let s =
      ((metrics.coverage.included + metrics.coverage.allowance * 0.5) / app) *
      100;
    r.push(
      `${metrics.coverage.included} of ${app} applicable trades included in the price`,
    );
    if (metrics.coverage.allowance > 0) {
      r.push(
        `${metrics.coverage.allowance} carried as allowances (counted half)`,
      );
    }
    if (metrics.coverage.excluded > 0) {
      r.push(`${metrics.coverage.excluded} trades excluded`);
    }
    if (extraExclusions.length > 0) {
      s -= extraExclusions.length * 2;
      r.push(`−${extraExclusions.length * 2} ${extraExclusions.length} further written exclusions`);
    }
    dims.push({
      key: "scope",
      label: DIMENSION_LABELS.scope,
      score: clamp(s),
      receipts: r,
    });
  }

  {
    // Preparation — the diligence visible in how the tender was priced.
    const r: string[] = [];
    let s = 20;
    const insp = str(a["elig.site_inspection"]);
    if (insp === "inspected") {
      s += 20;
      r.push("+20 inspected the site");
    } else if (insp === "external_only") {
      s += 8;
      r.push("+8 viewed the site externally");
    } else if (insp === "not_inspected") {
      r.push("+0 priced without a site inspection (acknowledged)");
    }
    if (str(a["elig.docs_reviewed"]) === "full_set") {
      s += 15;
      r.push("+15 reviewed the full document set");
    } else if (str(a["elig.docs_reviewed"]) === "partial") {
      s += 4;
      r.push("+4 documents only partially reviewed");
    }
    if (str(a["site.soil_report"]) === "site_report") {
      s += 12;
      r.push("+12 priced from this site's soil report");
    } else if (str(a["site.soil_report"]) === "assumed") {
      r.push("+0 soil classification assumed, not tested");
    }
    const rfis = str(a["understand.rfis"]);
    if (rfis === "answered") {
      s += 8;
      r.push("+8 raised and resolved clarifications while pricing");
    } else if (rfis === "none_needed") {
      s += 5;
      r.push("+5 no clarifications needed");
    } else if (rfis === "awaiting") {
      r.push("+0 still awaiting answers to clarifications");
    }
    const gapsFlagged =
      a["understand.gaps"] === true &&
      arr(a["understand.gap_items"]).length > 0;
    const concernsFlagged =
      a["understand.concerns"] === true &&
      arr(a["understand.concern_items"]).length > 0;
    if (gapsFlagged) {
      s += 6;
      r.push("+6 documented the gaps they priced around");
    }
    if (concernsFlagged) {
      s += 6;
      r.push("+6 flagged design or constructability concerns");
    }
    if (metrics.itemisedCount > 0) {
      const pts = Math.min(10, metrics.itemisedCount);
      s += pts;
      r.push(`+${pts} itemised ${metrics.itemisedCount} trades by amount`);
    }
    if (input.documentCount > 0) {
      const pts = Math.min(6, input.documentCount * 2);
      s += pts;
      r.push(`+${pts} attached ${input.documentCount} supporting document${input.documentCount === 1 ? "" : "s"}`);
    }
    if (commentary.present) {
      const pts = Math.min(
        10,
        (commentary.approach ? 4 : 0) +
          ve.length * 2 +
          recommendations.length * 2 +
          riskAdvice.length * 2,
      );
      s += pts;
      r.push(`+${pts} completed the optional commentary module`);
    }
    dims.push({
      key: "preparation",
      label: DIMENSION_LABELS.preparation,
      score: clamp(s),
      receipts: r,
    });
  }

  {
    // Credentials & capacity.
    const r: string[] = [];
    let s = 0;
    const expPts: Record<string, number> = {
      "1_5": 5,
      "6_20": 12,
      "21_50": 17,
      "50_plus": 20,
    };
    if (exp) {
      s += expPts[exp] ?? 0;
      r.push(`+${expPts[exp] ?? 0} ${EXPERIENCE[exp]?.toLowerCase()}`);
    }
    const largePts: Record<string, number> = {
      under_500k: 3,
      "500k_1m": 6,
      "1m_2m": 10,
      "2m_5m": 13,
      "5m_plus": 15,
    };
    const largest = str(a["creds.largest_value"]);
    if (largest) {
      s += largePts[largest] ?? 0;
      r.push(`+${largePts[largest] ?? 0} ${LARGEST[largest]?.toLowerCase()}`);
    }
    const loadPts: Record<string, number> = { "1_2": 12, "3_5": 6, "6_plus": 0 };
    const load = str(a["team.supervisor_load"]);
    if (load) {
      s += loadPts[load] ?? 0;
      r.push(
        `${loadPts[load] ? "+" + loadPts[load] : "+0"} site lead ${LOAD[load]}`,
      );
    }
    const concPts: Record<string, number> = { "0_2": 8, "3_5": 4, "6_plus": 0 };
    if (concurrent) {
      s += concPts[concurrent] ?? 0;
      r.push(
        `${concPts[concurrent] ? "+" + concPts[concurrent] : "+0"} ${CONCURRENT[concurrent]?.toLowerCase()}`,
      );
    }
    if (tenure === "3_plus") {
      s += 8;
      r.push("+8 core crews together 3+ years");
    } else if (tenure === "1_3") {
      s += 4;
      r.push("+4 core crews together 1–3 years");
    } else if (tenure === "under_1") {
      r.push("+0 crews together under a year");
    }
    const whsPts: Record<string, number> = {
      certified: 10,
      documented: 6,
      swms: 3,
    };
    if (whs) {
      s += whsPts[whs] ?? 0;
      r.push(`+${whsPts[whs] ?? 0} ${(WHS[whs] ?? whs).toLowerCase()}`);
    }
    const qaPts = Math.min(
      10,
      (qa.includes("independent") ? 6 : 0) +
        (qa.includes("itp") ? 4 : 0) +
        (qa.includes("supervisor") ? 2 : 0),
    );
    if (qaPts > 0) {
      s += qaPts;
      r.push(`+${qaPts} quality control in place`);
    }
    const refPts = Math.min(10, references.length * 4 + refLinks);
    if (refPts > 0) {
      s += refPts;
      r.push(
        `+${refPts} ${references.length} referee${references.length === 1 ? "" : "s"}${refLinks ? " with project links" : ""}`,
      );
    } else {
      r.push("+0 no references offered");
    }
    if (inHouse.length > 0) {
      const pts = Math.min(6, inHouse.length * 2);
      s += pts;
      r.push(`+${pts} ${inHouse.length} trade${inHouse.length === 1 ? "" : "s"} in-house`);
    }
    if (memberships.length > 0) {
      s += 4;
      r.push(`+4 ${memberships.map((m) => m.toUpperCase()).join(" and ")} member`);
    }
    if (input.verification?.anyLicenceVerified) {
      s += 5;
      r.push("+5 licence verified by BuilderHQ");
    }
    dims.push({
      key: "credentials",
      label: DIMENSION_LABELS.credentials,
      score: clamp(s),
      receipts: r,
    });
  }

  {
    // Delivery & aftercare.
    const r: string[] = [];
    let s = 0;
    const updPts: Record<string, number> = {
      weekly: 15,
      fortnightly: 9,
      milestones: 5,
    };
    if (upd) {
      s += updPts[upd] ?? 0;
      r.push(`+${updPts[upd] ?? 0} ${(UPDATES[upd] ?? upd).toLowerCase()}`);
    }
    if (a["contract.variations_written"] === true) {
      s += 18;
      r.push("+18 variations always priced in writing first");
    } else if (a["contract.variations_written"] === false) {
      r.push("+0 variations not always in writing");
    }
    if (a["contract.variation_fee"] === false) {
      s += 5;
      r.push("+5 no variation admin fee");
    }
    const dlpPts: Record<string, number> = { "3": 3, "6": 8, "12": 16, "24": 22 };
    const dlp = metrics.defectsLiabilityMonths;
    if (dlp) {
      s += dlpPts[dlp] ?? 0;
      r.push(`+${dlpPts[dlp] ?? 0} ${dlp}-month defects period`);
    }
    if (a["aftercare.walkthrough"] === true) {
      s += 10;
      r.push("+10 pre-handover walkthrough");
    }
    const respPts: Record<string, number> = { "48h": 15, "1w": 8, best_effort: 2 };
    if (resp) {
      s += respPts[resp] ?? 0;
      r.push(`+${respPts[resp] ?? 0} ${(RESPONSE[resp] ?? resp).toLowerCase()}`);
    }
    if (a["aftercare.manual"] === true) {
      s += 10;
      r.push("+10 handover pack provided");
    }
    dims.push({
      key: "delivery",
      label: DIMENSION_LABELS.delivery,
      score: clamp((s / 95) * 100),
      receipts: r,
    });
  }

  {
    // Programme confidence — cushions and commitments, not speed.
    const r: string[] = [];
    let s = 0;
    if (weatherIncluded !== null && weatherIncluded > 0) {
      const pts = Math.min(30, 15 + weatherIncluded);
      s += pts;
      r.push(`+${pts} ${weatherIncluded} weather days inside the build period`);
    } else if (weatherAddon !== null) {
      const pts = 12;
      s += pts;
      r.push(`+${pts} ${weatherAddon} weather days declared on top (disclosed honestly)`);
    } else {
      r.push("+0 no weather allowance disclosed");
    }
    if (metrics.ldPerWeek !== null) {
      s += 30;
      r.push(`+30 liquidated damages offered at ${aud(metrics.ldPerWeek)}/week`);
    } else {
      r.push("+0 no liquidated damages offered");
    }
    const vd = metrics.validityDays;
    if (vd !== null) {
      const pts = vd >= 45 ? 20 : vd >= 30 ? 15 : vd >= 21 ? 8 : 3;
      s += pts;
      r.push(`+${pts} price holds ${vd} days`);
    }
    if (programme.leadTime) {
      s += 10;
      r.push(`+10 lead time stated (${programme.leadTime})`);
    }
    if (programme.handoverLabel) {
      s += 10;
      r.push(`+10 start and duration produce a checkable handover window`);
    }
    dims.push({
      key: "programme",
      label: DIMENSION_LABELS.programme,
      score: clamp(s),
      receipts: r,
    });
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
  if (exposurePct >= 12) {
    flag(
      "exposure-high",
      "high",
      `${Math.round(exposurePct)}% of the price can still move`,
      `${aud(exposure)} sits in provisional sums and prime costs (${metrics.psCount} PS, ${metrics.pcCount} PC).`,
      "Ask which allowances they would fix if the documents were finalised now.",
    );
  } else if (exposurePct >= 5) {
    flag(
      "exposure-medium",
      "attention",
      `${aud(exposure)} in allowances`,
      `${Math.round(exposurePct)}% of the price is provisional sums and prime costs.`,
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
  if (exGst && exposure === 0 && money.fixed === true) {
    highlights.push("Fully priced, no provisional sums or prime costs");
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

export function evaluateRound(inputs: EvaluationInput[]): RoundEvaluation {
  const tenders = inputs.map(evaluateTender);

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
    const certainty = [...priced].sort(
      (a, b) => b.money.firmPct - a.money.firmPct,
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
    // Compared ex GST on both sides.
    if (cheapest.money.exposure > 0) {
      const rival = [...priced]
        .filter(
          (r) =>
            r.tenderId !== cheapest.tenderId &&
            r.money.firmPct > cheapest.money.firmPct &&
            r.money.exGst! - cheapest.money.exGst! <
              cheapest.money.exposure,
        )
        .sort((a, b) => a.money.exGst! - b.money.exGst!)[0];
      if (rival) {
        const saving = rival.money.exGst! - cheapest.money.exGst!;
        breakeven = {
          cheaperId: cheapest.tenderId,
          rivalId: rival.tenderId,
          savingExGst: saving,
          exposureExGst: cheapest.money.exposure,
          breakevenPct: Math.round(
            (saving / cheapest.money.exposure) * 100,
          ),
        };
      }
    }

    if (breakeven) {
      const rival = tenders.find((t) => t.tenderId === breakeven!.rivalId)!;
      priceStory = `${cheapest.builderName} is ${aud(breakeven.savingExGst)} cheaper on paper, but ${aud(breakeven.exposureExGst)} of its price sits in allowances that ${rival.builderName} has priced in full. If those allowances overrun their stated figures by more than ${breakeven.breakevenPct}%, the saving is gone. The decision is not which number is lower; it is how much you trust the allowances.`;
    } else if (cheapest.money.exposurePct >= 8) {
      priceStory = `${cheapest.builderName} leads on price, but ${Math.round(cheapest.money.exposurePct)}% of that number sits in allowances that can still move. Weigh the firm portion, not the headline.`;
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
    const fullyPriced = priced.filter((t) => t.money.firmPct >= 99);
    if (fullyPriced.length > 0) {
      for (const t of fullyPriced) give(t.tenderId, "Fully priced");
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
  // Most consequential first: rows where someone excluded outright.
  disagreements.sort((a, b) => {
    const ex = (d: ScopeDisagreement) =>
      Object.values(d.states).filter((s) => s === "Excluded").length;
    return ex(b) - ex(a);
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
    roundQuestions.push(
      `${disagreements.length} trade${disagreements.length === 1 ? "" : "s"} are treated differently across the round. Confirm each builder priced the same scope before comparing numbers.`,
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

  return {
    tenders,
    spread,
    breakeven,
    priceStory,
    leaders,
    scopeDisagreements: disagreements,
    roundQuestions,
  };
}
