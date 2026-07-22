/**
 * tenders · comparison derivation.
 *
 * Pure functions that turn a tender's instrument answers into the
 * decision surfaces the comparison page renders: the firm/soft price
 * split, the scope coverage summary, and the risk flags. No DB, no
 * server-only imports — the service loads responses, this file reasons
 * about them, the page renders the result.
 *
 * RISK FLAG PRINCIPLES. Flags are FACTS the owner should weigh, never
 * verdicts. Every label states what the answer says, in the builder's
 * own terms ("Rock removal charged as a variation"), not what to think
 * of it. An honest "excluded" already cost the builder the point of
 * difference — the flag must not punish them twice with loaded
 * language. Severity is about money-at-risk, not morality:
 *
 *   attention — worth reading before you decide
 *   high      — can materially move the final price or the owner's
 *               protection; deserves a question back to the builder
 */

import {
  getQuestion,
  scopeMatrixRows,
  type InstrumentQuestion,
  type ScopeState,
} from "./instrument";
import type { TradeId } from "./trades";

/* ── types ──────────────────────────────────────────────────────────── */

export type RiskSeverity = "attention" | "high";

export interface RiskFlag {
  id: string;
  severity: RiskSeverity;
  /** Short factual label, e.g. "Uncapped cost escalation". */
  label: string;
  /** One sentence of why it matters, neutral voice. */
  detail: string;
}

export interface AllowanceExposure {
  /** Sum of provisional sums, whole AUD. */
  psTotal: number;
  /** Sum of prime cost allowances, whole AUD. */
  pcTotal: number;
  /** psTotal + pcTotal. */
  total: number;
  /** Number of PS + PC line items. */
  itemCount: number;
  /** exposure as a share of the contract price (0-100), null when no price. */
  shareOfPrice: number | null;
}

export interface CoverageSummary {
  /** State per trade row; missing rows are simply absent. */
  states: Partial<Record<TradeId, ScopeState>>;
  included: number;
  allowance: number;
  excluded: number;
  notApplicable: number;
  unmarked: number;
}

export interface TenderInstrumentSummary {
  /** qid → raw answer value (unwrapped from the {v} envelope). */
  answers: Record<string, unknown>;
  exposure: AllowanceExposure;
  coverage: CoverageSummary;
  flags: RiskFlag[];
}

/* ── helpers ────────────────────────────────────────────────────────── */

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function itemsTotal(v: unknown, key: string): { total: number; count: number } {
  if (!Array.isArray(v)) return { total: 0, count: 0 };
  let total = 0;
  for (const row of v) {
    if (row && typeof row === "object") {
      const n = num((row as Record<string, unknown>)[key]);
      if (n !== null) total += n;
    }
  }
  return { total, count: v.length };
}

/* ── derivation ─────────────────────────────────────────────────────── */

export function deriveExposure(
  answers: Record<string, unknown>,
  totalPriceAud: number | null,
): AllowanceExposure {
  // Gate answers rule: a PS/PC list only counts when the builder's
  // has_ps / has_pc answer is Yes. Stale dependant rows (listed, then
  // the gate flipped to No) must not poison the firm/soft split.
  const ps =
    answers["pcps.has_ps"] === true
      ? itemsTotal(answers["pcps.ps_items"], "allowance")
      : { total: 0, count: 0 };
  const pc =
    answers["pcps.has_pc"] === true
      ? itemsTotal(answers["pcps.pc_items"], "allowance")
      : { total: 0, count: 0 };
  const total = ps.total + pc.total;
  return {
    psTotal: ps.total,
    pcTotal: pc.total,
    total,
    itemCount: ps.count + pc.count,
    shareOfPrice:
      totalPriceAud && totalPriceAud > 0
        ? Math.round((total / totalPriceAud) * 1000) / 10
        : null,
  };
}

export function deriveCoverage(
  answers: Record<string, unknown>,
): CoverageSummary {
  const raw = answers["scope.matrix"];
  const map =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, string>)
      : {};
  const states: Partial<Record<TradeId, ScopeState>> = {};
  let included = 0;
  let allowance = 0;
  let excluded = 0;
  let notApplicable = 0;
  let unmarked = 0;
  for (const row of scopeMatrixRows()) {
    const s = map[row.id] as ScopeState | undefined;
    if (!s) {
      unmarked += 1;
      continue;
    }
    states[row.id] = s;
    if (s === "included") included += 1;
    else if (s === "allowance") allowance += 1;
    else if (s === "excluded") excluded += 1;
    else notApplicable += 1;
  }
  return { states, included, allowance, excluded, notApplicable, unmarked };
}

/**
 * Facts worth weighing, derived from the answers. Order = severity
 * first, then instrument order, so two builders' flag lists read in
 * the same sequence.
 */
export function deriveRiskFlags(
  answers: Record<string, unknown>,
  opts: {
    totalPriceAud: number | null;
    /** Project state drives the deposit-cap wording (VIC 5%, NSW 10%). */
    projectState: string | null;
    exposure: AllowanceExposure;
  },
): RiskFlag[] {
  const flags: RiskFlag[] = [];
  const a = answers;

  // ── price firmness ────────────────────────────────────────────────
  if (a["price.fixed"] === false) {
    flags.push({
      id: "estimate",
      severity: "high",
      label: "Estimate, not a fixed price",
      detail:
        "The contract sum can move without a variation. Ask what would firm it up.",
    });
  }
  if (a["price.escalation"] === true) {
    const capped = a["price.escalation_cap"] === "capped";
    flags.push({
      id: "escalation",
      severity: capped ? "attention" : "high",
      label: capped ? "Capped cost escalation" : "Uncapped cost escalation",
      detail: capped
        ? "The price can rise with material or labour costs, up to an agreed cap."
        : "The price can rise with material or labour costs, with no cap stated.",
    });
  }
  const validity = num(a["price.validity"]);
  if (validity !== null && validity < 30) {
    flags.push({
      id: "validity",
      severity: "attention",
      label: `Price holds ${validity} days`,
      detail: "A short validity window puts the decision on a clock.",
    });
  }

  // ── allowances ────────────────────────────────────────────────────
  const basis = str(a["pcps.basis"]);
  if (basis === "generic") {
    flags.push({
      id: "allowance-basis",
      severity: "high",
      label: "Generic allowances",
      detail:
        "Allowances are standard figures, not priced from this project's documents.",
    });
  } else if (basis === "partly") {
    flags.push({
      id: "allowance-basis",
      severity: "attention",
      label: "Allowances partly document-based",
      detail:
        "Some allowances are priced from the documents, some are standard figures.",
    });
  }
  if (opts.exposure.shareOfPrice !== null && opts.exposure.shareOfPrice >= 15) {
    flags.push({
      id: "allowance-share",
      severity: opts.exposure.shareOfPrice >= 25 ? "high" : "attention",
      label: `${opts.exposure.shareOfPrice}% of the price is allowances`,
      detail:
        "Provisional sums and prime costs can move at cost. The larger the share, the softer the headline number.",
    });
  }

  // ── ground risk ───────────────────────────────────────────────────
  if (str(a["site.soil_report"]) === "assumed") {
    flags.push({
      id: "soil",
      severity: "attention",
      label: "Soil classification assumed",
      detail:
        "The price assumes a soil class rather than this site's own report. A worse result on testing becomes a variation.",
    });
  }
  if (str(a["site.rock"]) === "variation") {
    flags.push({
      id: "rock",
      severity: "attention",
      label: "Rock removal charged as a variation",
      detail: "If excavation hits rock, removal is priced on top.",
    });
  }

  // ── protection ────────────────────────────────────────────────────
  // v1 asked compliance.warranty_insurance; v2 asks elig.warranty_eligible.
  // Same risk either way: no warranty cover behind the contract.
  if (
    a["compliance.warranty_insurance"] === false ||
    a["elig.warranty_eligible"] === false
  ) {
    flags.push({
      id: "warranty",
      severity: "high",
      label: "No home warranty insurance nominated",
      detail:
        "Domestic building insurance protects the owner if the builder cannot finish. Ask why it is not provided.",
    });
  }
  if (a["compliance.permit_fees"] === false) {
    flags.push({
      id: "permit-fees",
      severity: "attention",
      label: "Permit and authority fees not included",
      detail: "Budget for these on top of the contract price.",
    });
  }

  // ── payments ──────────────────────────────────────────────────────
  const deposit = num(a["payments.deposit"]);
  if (deposit !== null) {
    const price = opts.totalPriceAud;
    const overStatutoryFloor = price === null || price > 20000;
    const vic = opts.projectState === "VIC";
    const nsw = opts.projectState === "NSW";
    const qld = opts.projectState === "QLD";
    if (vic && deposit > 5 && overStatutoryFloor) {
      flags.push({
        id: "deposit",
        severity: "high",
        label: `${deposit}% deposit`,
        detail:
          "Victoria caps deposits at 5 per cent for contracts over $20,000.",
      });
    } else if (qld && deposit > 5 && overStatutoryFloor) {
      flags.push({
        id: "deposit",
        severity: "high",
        label: `${deposit}% deposit`,
        detail:
          "Queensland caps deposits at 5 per cent for contracts of $20,000 or more.",
      });
    } else if (nsw && deposit > 10) {
      flags.push({
        id: "deposit",
        severity: "high",
        label: `${deposit}% deposit`,
        detail: "New South Wales caps deposits at 10 per cent.",
      });
    } else if (!vic && !nsw && !qld && deposit > 10) {
      flags.push({
        id: "deposit",
        severity: "attention",
        label: `${deposit}% deposit`,
        detail: "A deposit above 10 per cent is worth querying.",
      });
    }
  }

  // ── consistency ───────────────────────────────────────────────────
  const declaredTotal = num(a["price.total"]);
  if (
    declaredTotal !== null &&
    opts.totalPriceAud !== null &&
    declaredTotal !== opts.totalPriceAud
  ) {
    flags.push({
      id: "price-mismatch",
      severity: "high",
      label: "Checklist price differs from the tender price",
      detail: `The submission checklist states ${formatAud(declaredTotal)} against a tender price of ${formatAud(opts.totalPriceAud)}. Ask which one stands.`,
    });
  }

  // ── programme ─────────────────────────────────────────────────────
  if (a["programme.weather"] === false) {
    flags.push({
      id: "weather",
      severity: "attention",
      label: "No weather allowance in the build period",
      detail:
        "Wet weather extends the programme rather than being absorbed by it.",
    });
  }

  // ── contract ──────────────────────────────────────────────────────
  const form = str(a["contract.form"]);
  if (form === "cost_plus") {
    flags.push({
      id: "contract-form",
      severity: "high",
      label: "Cost plus contract",
      detail:
        "The owner pays actual cost plus margin. There is no fixed contract sum.",
    });
  } else if (form === "custom") {
    flags.push({
      id: "contract-form",
      severity: "attention",
      label: "Builder's own contract",
      detail:
        "Not an industry-standard form. Worth a legal read before signing.",
    });
  }
  if (a["contract.variations_written"] === false) {
    flags.push({
      id: "variations",
      severity: "high",
      label: "Variations can proceed without written pricing",
      detail:
        "Cost surprises usually arrive exactly here. Written-first is the protective standard.",
    });
  }

  const order: Record<RiskSeverity, number> = { high: 0, attention: 1 };
  return flags.sort((x, y) => order[x.severity] - order[y.severity]);
}

/** Full per-tender summary from raw responses. */
export function summariseInstrument(
  responses: Array<{ qid: string; value: unknown }>,
  opts: { totalPriceAud: number | null; projectState: string | null },
): TenderInstrumentSummary {
  const answers: Record<string, unknown> = {};
  for (const r of responses) {
    const v =
      r.value && typeof r.value === "object" && "v" in (r.value as object)
        ? (r.value as { v: unknown }).v
        : r.value;
    answers[r.qid] = v;
  }
  const exposure = deriveExposure(answers, opts.totalPriceAud);
  const coverage = deriveCoverage(answers);
  const flags = deriveRiskFlags(answers, {
    totalPriceAud: opts.totalPriceAud,
    projectState: opts.projectState,
    exposure,
  });
  return { answers, exposure, coverage, flags };
}

/* ── display formatting ─────────────────────────────────────────────── */

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const formatAud = (n: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);

/**
 * One canonical way to render an instrument answer as text. Items and
 * matrix values are structural and render with their own components —
 * this covers every scalar type.
 */
export function formatAnswer(q: InstrumentQuestion, v: unknown): string | null {
  if (v === undefined || v === null) return null;
  switch (q.type) {
    case "bool":
      return v === true ? "Yes" : v === false ? "No" : null;
    case "declare":
      return v === true ? "Declared" : null;
    case "confirm":
      return v === true ? "Confirmed" : null;
    case "select": {
      const opt = (q.options ?? []).find((o) => o.value === v);
      return opt?.label ?? String(v);
    }
    case "multi": {
      if (!Array.isArray(v) || v.length === 0) return null;
      const labels = v.map(
        (x) => (q.options ?? []).find((o) => o.value === x)?.label ?? String(x),
      );
      return labels.join(" · ");
    }
    case "currency": {
      const n = num(v);
      return n === null ? null : formatAud(n);
    }
    case "percent": {
      const n = num(v);
      return n === null ? null : `${n}%`;
    }
    case "number": {
      const n = num(v);
      if (n === null) return null;
      return q.unit ? `${n} ${q.unit}` : String(n);
    }
    case "month": {
      const s = str(v);
      if (!s) return null;
      const [y, m] = s.split("-");
      const mi = Number(m) - 1;
      return mi >= 0 && mi < 12 ? `${MONTH_NAMES[mi]} ${y}` : s;
    }
    case "text": {
      const s = typeof v === "string" ? v.trim() : "";
      return s.length > 0 ? s : null;
    }
    case "items":
    case "matrix":
    case "amounts":
      return null;
  }
}

/**
 * Do the given answers to one question genuinely differ? Nulls (not
 * answered) count as their own value so "answered vs not" highlights.
 */
export function answersDiffer(q: InstrumentQuestion, values: unknown[]): boolean {
  if (values.length < 2) return false;
  const keys = values.map((v) => {
    if (v === undefined || v === null) return "∅";
    if (q.type === "multi" && Array.isArray(v)) {
      return [...v].sort().join("|");
    }
    if (q.type === "items" || q.type === "matrix") {
      return JSON.stringify(v);
    }
    return String(v);
  });
  return new Set(keys).size > 1;
}
