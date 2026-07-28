/**
 * The Tender Schedule — the client's approved scope pack, shaped for
 * tendering. Pure and client-safe: types plus derivations only, no DB,
 * no side effects. The scope engine RESOLVES a schedule from an
 * approved run (server-side, in @/modules/scope-engine); everything
 * downstream — the deck, the document, the comparison, the evaluation
 * — reads this shape and never touches the engine.
 *
 * WHY THIS EXISTS. On a round published through the scope gate, the
 * pack IS the scope. The builder no longer self-declares a generic
 * trade grid; they walk the client's own schedule item by item and
 * state exactly what their price does with each line. Every tender on
 * the round answers the same closed vocabulary, so the comparison can
 * put quote against quote at item level — the thing two builder PDFs
 * can never do.
 *
 * ANSWER CHANNEL. `scope.schedule` holds the builder's confirmations:
 *   Record<itemId, { s: ScheduleState; a?: number }>
 *   - "documented"  — in the price exactly as the documents describe
 *   - "allowance"   — carried as an allowance; `a` = whole AUD ex GST
 *   - "excluded"    — not in the price
 * `scope.schedule_run` pins the approved run the builder answered
 * against, written by the deck alongside the first mark.
 */

import { getScopeItem, getScopeDivision } from "@/modules/scope";

/* ── the schedule ───────────────────────────────────────────────────── */

export type ScheduleItemKind =
  /** The documents cover it; the pack cites where. */
  | "evidenced"
  /** The client resolved a gap by locking an allowance figure. */
  | "owner_allowance"
  /** The client excluded it from the tender; shown, never priced. */
  | "owner_excluded";

export interface TenderScheduleCitation {
  documentName: string | null;
  page: number;
  revision: string | null;
}

export interface TenderScheduleItem {
  /** Scope Standard id, "division.slug". Permanent. */
  itemId: string;
  divisionId: string;
  divisionLabel: string;
  label: string;
  /** The homeowner-grade sentence from the Scope Standard. */
  plain: string;
  kind: ScheduleItemKind;
  /** The client's locked figure — owner_allowance items only. */
  ownerAmountAud: number | null;
  /** Where the documents say it — evidenced items only. */
  citations: TenderScheduleCitation[];
  /** The reader's line about what was found or missing, when kept. */
  note: string | null;
}

export interface TenderSchedule {
  /** The approved scope run this schedule was resolved from. */
  runId: string;
  /** Scope Standard version the run selected against. */
  standardVersion: string;
  /** Every line of the pack, in build order. */
  items: TenderScheduleItem[];
}

/* ── the builder's states ───────────────────────────────────────────── */

export const SCHEDULE_STATES = [
  { value: "documented", label: "Included as documented" },
  { value: "allowance", label: "Allowance" },
  { value: "excluded", label: "Excluded" },
] as const;

export type ScheduleState = (typeof SCHEDULE_STATES)[number]["value"];

const SCHEDULE_STATE_VALUES = new Set<string>(
  SCHEDULE_STATES.map((s) => s.value),
);

export const SCHEDULE_STATE_LABEL = new Map<string, string>(
  SCHEDULE_STATES.map((s) => [s.value, s.label]),
);

export interface ScheduleEntry {
  s: ScheduleState;
  /** Whole AUD ex GST; meaningful only when s === "allowance". */
  a?: number | null;
}

export type ScheduleAnswer = Record<string, ScheduleEntry>;

/** Safe parse of the raw `scope.schedule` answer value. */
export function readScheduleAnswer(v: unknown): ScheduleAnswer {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return {};
  const out: ScheduleAnswer = {};
  for (const [itemId, entry] of Object.entries(v as Record<string, unknown>)) {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }
    const e = entry as Record<string, unknown>;
    if (typeof e.s !== "string" || !SCHEDULE_STATE_VALUES.has(e.s)) continue;
    const a =
      typeof e.a === "number" && Number.isFinite(e.a) && e.a >= 0
        ? Math.round(e.a)
        : null;
    out[itemId] = { s: e.s as ScheduleState, a };
  }
  return out;
}

/** Well-formed shape for save-time checks (partial answers welcome). */
export function isScheduleAnswerShape(v: unknown): boolean {
  if (v === null) return true;
  if (typeof v !== "object" || Array.isArray(v)) return false;
  return Object.entries(v as Record<string, unknown>).every(([id, entry]) => {
    if (typeof id !== "string" || id.length === 0 || id.length > 80) {
      return false;
    }
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      return false;
    }
    const e = entry as Record<string, unknown>;
    if (typeof e.s !== "string" || !SCHEDULE_STATE_VALUES.has(e.s)) {
      return false;
    }
    return (
      e.a === undefined ||
      e.a === null ||
      (typeof e.a === "number" && Number.isFinite(e.a) && e.a >= 0)
    );
  });
}

/* ── derivations ────────────────────────────────────────────────────── */

/** Lines the builder prices. The client's exclusions are context. */
export function tenderableItems(
  schedule: TenderSchedule,
): TenderScheduleItem[] {
  return schedule.items.filter((i) => i.kind !== "owner_excluded");
}

export function ownerExcludedItems(
  schedule: TenderSchedule,
): TenderScheduleItem[] {
  return schedule.items.filter((i) => i.kind === "owner_excluded");
}

export interface ScheduleDivision {
  divisionId: string;
  label: string;
  /** Lines the builder answers, in build order. */
  items: TenderScheduleItem[];
  /** The client's exclusions in this division — shown locked. */
  locked: TenderScheduleItem[];
}

/** The schedule grouped by division, preserving build order. */
export function scheduleDivisions(
  schedule: TenderSchedule,
): ScheduleDivision[] {
  const by = new Map<string, ScheduleDivision>();
  const order: string[] = [];
  for (const item of schedule.items) {
    let d = by.get(item.divisionId);
    if (!d) {
      d = {
        divisionId: item.divisionId,
        label: item.divisionLabel,
        items: [],
        locked: [],
      };
      by.set(item.divisionId, d);
      order.push(item.divisionId);
    }
    if (item.kind === "owner_excluded") d.locked.push(item);
    else d.items.push(item);
  }
  // A division holding only client exclusions still prints (the record
  // is complete) but never asks anything.
  return order.map((id) => by.get(id)!);
}

export interface ScheduleTallies {
  total: number;
  documented: number;
  allowance: number;
  excluded: number;
  unmarked: number;
  /** Sum of every allowance the price carries, whole AUD ex GST. */
  allowanceTotal: number;
  /** Client allowances on the pack, and what the builder did with them. */
  ownerAllowances: {
    count: number;
    /** Carried at the client's exact figure. */
    carried: number;
    /** Carried as an allowance at a different figure. */
    repriced: number;
    /** Priced firm instead — no allowance left on the line. */
    firmPriced: number;
    /** Left out of the price entirely. */
    excluded: number;
  };
}

export function scheduleTallies(
  schedule: TenderSchedule,
  answerValue: unknown,
): ScheduleTallies {
  const answer = readScheduleAnswer(answerValue);
  const t: ScheduleTallies = {
    total: 0,
    documented: 0,
    allowance: 0,
    excluded: 0,
    unmarked: 0,
    allowanceTotal: 0,
    ownerAllowances: {
      count: 0,
      carried: 0,
      repriced: 0,
      firmPriced: 0,
      excluded: 0,
    },
  };
  for (const item of tenderableItems(schedule)) {
    t.total++;
    const e = answer[item.itemId];
    const isOwner = item.kind === "owner_allowance";
    if (isOwner) t.ownerAllowances.count++;
    if (!e) {
      t.unmarked++;
      continue;
    }
    if (e.s === "documented") {
      t.documented++;
      if (isOwner) t.ownerAllowances.firmPriced++;
    } else if (e.s === "excluded") {
      t.excluded++;
      if (isOwner) t.ownerAllowances.excluded++;
    } else {
      t.allowance++;
      const amt = typeof e.a === "number" ? e.a : 0;
      t.allowanceTotal += amt;
      if (isOwner) {
        if (item.ownerAmountAud !== null && amt === item.ownerAmountAud) {
          t.ownerAllowances.carried++;
        } else {
          t.ownerAllowances.repriced++;
        }
      }
    }
  }
  return t;
}

/**
 * Gate-time completeness for the schedule answer: every tenderable
 * line marked, and every allowance carrying a figure above zero.
 */
export function isScheduleComplete(
  schedule: TenderSchedule,
  answerValue: unknown,
): boolean {
  const answer = readScheduleAnswer(answerValue);
  return tenderableItems(schedule).every((item) => {
    const e = answer[item.itemId];
    if (!e) return false;
    if (e.s === "allowance") {
      return typeof e.a === "number" && e.a > 0;
    }
    return true;
  });
}

export interface DerivedAllowanceRow {
  itemId: string;
  label: string;
  divisionLabel: string;
  /** Who put the allowance on the table. */
  source: "client_schedule" | "builder";
  amountAud: number;
  /** The client's figure, when the line came from their schedule. */
  ownerAmountAud: number | null;
}

/**
 * The tender's allowance schedule, derived from the builder's marks:
 * every line answered "allowance", client-set lines first. This is
 * what module 7 confirms and what the document prints.
 */
export function deriveAllowanceRows(
  schedule: TenderSchedule,
  answerValue: unknown,
): DerivedAllowanceRow[] {
  const answer = readScheduleAnswer(answerValue);
  const rows: DerivedAllowanceRow[] = [];
  for (const item of tenderableItems(schedule)) {
    const e = answer[item.itemId];
    if (!e || e.s !== "allowance") continue;
    rows.push({
      itemId: item.itemId,
      label: item.label,
      divisionLabel: item.divisionLabel,
      source: item.kind === "owner_allowance" ? "client_schedule" : "builder",
      amountAud: typeof e.a === "number" ? e.a : 0,
      ownerAmountAud: item.ownerAmountAud,
    });
  }
  rows.sort((a, b) =>
    a.source === b.source ? 0 : a.source === "client_schedule" ? -1 : 1,
  );
  return rows;
}

export interface DerivedExclusionRow {
  itemId: string;
  label: string;
  divisionLabel: string;
}

/** Lines the builder marked excluded — their exclusion schedule. */
export function deriveScheduleExclusions(
  schedule: TenderSchedule,
  answerValue: unknown,
): DerivedExclusionRow[] {
  const answer = readScheduleAnswer(answerValue);
  return tenderableItems(schedule)
    .filter((item) => answer[item.itemId]?.s === "excluded")
    .map((item) => ({
      itemId: item.itemId,
      label: item.label,
      divisionLabel: item.divisionLabel,
    }));
}

/** "Sheet 3 of 6, Rev B" — the trust line under an evidenced item. */
export function formatCitation(c: TenderScheduleCitation): string {
  const doc = c.documentName ? `${c.documentName}, page ${c.page}` : `Page ${c.page}`;
  return c.revision ? `${doc}, Rev ${c.revision}` : doc;
}

/* ── resolution helper (pure half) ──────────────────────────────────── */

/**
 * Shape one engine row into a schedule item via the Scope Standard.
 * Returns null for ids the Standard no longer knows (never expected —
 * the engine drops unknown ids — but a schedule must not explode on
 * one bad row).
 */
export function toScheduleItem(row: {
  itemId: string;
  kind: ScheduleItemKind;
  ownerAmountAud: number | null;
  citations: TenderScheduleCitation[];
  note: string | null;
}): TenderScheduleItem | null {
  const def = getScopeItem(row.itemId);
  if (!def) return null;
  const division = getScopeDivision(def.division);
  return {
    itemId: row.itemId,
    divisionId: def.division,
    divisionLabel: division?.label ?? def.division,
    label: def.label,
    plain: def.plain,
    kind: row.kind,
    ownerAmountAud: row.ownerAmountAud,
    citations: row.citations,
    note: row.note,
  };
}
