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
 *   Record<itemId, { s: ScheduleState; a?: number; p?: number; n?: string }>
 *   - "documented"  — in the price exactly as the documents describe;
 *                     `p` optionally discloses the line's price
 *   - "allowance"   — carried as an allowance; `a` = whole AUD ex GST
 *   - "excluded"    — not in the price
 *   - "na"          — the builder holds the line does not apply to this
 *                     project (wrong for the site, already superseded);
 *                     `n` optionally says why in one line. An NA line
 *                     leaves the applicable set rather than reading as
 *                     a refusal — but a split against rivals who priced
 *                     it surfaces as a round disagreement.
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
  /**
   * The documents are silent and the client left the line to the
   * builders: each prices it within their quote, exactly as ordinary
   * tendering works. Tenderable, no locked figure.
   */
  | "owner_open"
  /** The client excluded it from the tender; shown, never priced. */
  | "owner_excluded";

export interface TenderScheduleCitation {
  documentName: string | null;
  page: number;
  revision: string | null;
}

export interface TenderScheduleItem {
  /** Scope Standard id ("division.slug"), or a project-scoped custom
   *  line ("custom.division.slug") promoted from an off-standard
   *  capture. Permanent either way. */
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
  /** The Partial grade: 'full' = priceable from the documents without
   *  assumption; 'partial' = shown but incompletely specified;
   *  null/absent = ungraded (runs before the grade existed). */
  depth?: "full" | "partial" | null;
  /** What is still needed, when depth is partial. */
  remaining?: string | null;
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
  { value: "documented", label: "Included" },
  { value: "allowance", label: "Provisional sum" },
  { value: "excluded", label: "Excluded" },
  { value: "na", label: "N/A" },
] as const;

/**
 * The standard note behind every schedule line's (i): what the line's
 * notes are and where they come from. One text, used identically on
 * the deck, the schedule browser and the printed document.
 */
export const SCHEDULE_NOTE_HINT =
  "Written by BuilderHQ from the client's documents. It states what the documents say about this line, or what they leave open.";

/**
 * The short standard paragraph on every scope of works download.
 * One text, everywhere, so no download ever explains itself
 * differently.
 */
export const SCOPE_PDF_NOTE =
  "This scope of works was prepared by BuilderHQ. Our AI reads every page of the client's documents and writes what it finds into the lines below. Each line notes what the documents say and where. Read it beside the documents themselves.";

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
  /**
   * Optional disclosed line price, whole AUD ex GST; meaningful only
   * when s === "documented". Never required — disclosure is a
   * strength the builder chooses, and it reads as itemisation.
   */
  p?: number | null;
  /** One line on why a line is "na"; meaningful only for that state. */
  n?: string | null;
  /**
   * The builder's own comment on the line, any state. Prints beside
   * the mark on the tender document and reads on the comparison.
   */
  c?: string | null;
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
    const money = (v: unknown): number | null =>
      typeof v === "number" && Number.isFinite(v) && v >= 0
        ? Math.round(v)
        : null;
    const state = e.s as ScheduleState;
    const note =
      typeof e.n === "string" && e.n.trim().length > 0
        ? e.n.trim().slice(0, 200)
        : null;
    const comment =
      typeof e.c === "string" && e.c.trim().length > 0
        ? e.c.trim().slice(0, 280)
        : null;
    // Fields only mean something in their state; strip strays so no
    // derivation downstream ever needs to re-check. The comment is
    // the exception: it belongs to the line, whatever the mark.
    out[itemId] = {
      s: state,
      a: state === "allowance" ? money(e.a) : null,
      p: state === "documented" ? money(e.p) : null,
      n: state === "na" ? note : null,
      c: comment,
    };
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
    const moneyOk = (v: unknown) =>
      v === undefined ||
      v === null ||
      (typeof v === "number" && Number.isFinite(v) && v >= 0);
    const noteOk = (v: unknown) =>
      v === undefined || v === null || (typeof v === "string" && v.length <= 400);
    return moneyOk(e.a) && moneyOk(e.p) && noteOk(e.n) && noteOk(e.c);
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
  /** Lines the builder holds do not apply to this project. */
  notApplicable: number;
  unmarked: number;
  /** Sum of every allowance the price carries, whole AUD ex GST. */
  allowanceTotal: number;
  /**
   * The split that matters for judging firmness: allowance money on
   * the CLIENT'S allowance lines is the round's own exposure — every
   * tender carries those lines by the client's instruction — while
   * allowance money on any other line is movement the builder chose.
   */
  clientAllowanceTotal: number;
  builderAllowanceTotal: number;
  /** Documented lines whose price the builder chose to disclose. */
  disclosedCount: number;
  /** Sum of the disclosed line prices, whole AUD ex GST. */
  disclosedTotal: number;
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
    notApplicable: 0,
    unmarked: 0,
    allowanceTotal: 0,
    clientAllowanceTotal: 0,
    builderAllowanceTotal: 0,
    disclosedCount: 0,
    disclosedTotal: 0,
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
      if (typeof e.p === "number" && e.p > 0) {
        t.disclosedCount++;
        t.disclosedTotal += e.p;
      }
      if (isOwner) t.ownerAllowances.firmPriced++;
    } else if (e.s === "excluded") {
      t.excluded++;
      if (isOwner) t.ownerAllowances.excluded++;
    } else if (e.s === "na") {
      t.notApplicable++;
    } else {
      t.allowance++;
      const amt = typeof e.a === "number" ? e.a : 0;
      t.allowanceTotal += amt;
      if (isOwner) {
        t.clientAllowanceTotal += amt;
        if (item.ownerAmountAud !== null && amt === item.ownerAmountAud) {
          t.ownerAllowances.carried++;
        } else {
          t.ownerAllowances.repriced++;
        }
      } else {
        t.builderAllowanceTotal += amt;
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
    // "documented", "excluded" and "na" are complete answers as they
    // stand; a disclosed price and an NA reason are optional strengths.
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

export interface DerivedNotApplicableRow {
  itemId: string;
  label: string;
  divisionLabel: string;
  /** The builder's one-line reason, when offered. */
  note: string | null;
}

/**
 * Lines the builder set aside as not applicable. These print as their
 * own register — a challenge to the pack is a disclosure, not an
 * exclusion, and the client deserves to see it stated plainly.
 */
export function deriveNotApplicable(
  schedule: TenderSchedule,
  answerValue: unknown,
): DerivedNotApplicableRow[] {
  const answer = readScheduleAnswer(answerValue);
  return tenderableItems(schedule)
    .filter((item) => answer[item.itemId]?.s === "na")
    .map((item) => ({
      itemId: item.itemId,
      label: item.label,
      divisionLabel: item.divisionLabel,
      note: answer[item.itemId]?.n ?? null,
    }));
}

export interface DisclosedPriceRow {
  itemId: string;
  label: string;
  divisionLabel: string;
  amountAud: number;
}

/** Documented lines whose price the builder chose to disclose. */
export function deriveDisclosedPrices(
  schedule: TenderSchedule,
  answerValue: unknown,
): DisclosedPriceRow[] {
  const answer = readScheduleAnswer(answerValue);
  const rows: DisclosedPriceRow[] = [];
  for (const item of tenderableItems(schedule)) {
    const e = answer[item.itemId];
    if (!e || e.s !== "documented") continue;
    if (typeof e.p !== "number" || e.p <= 0) continue;
    rows.push({
      itemId: item.itemId,
      label: item.label,
      divisionLabel: item.divisionLabel,
      amountAud: e.p,
    });
  }
  return rows;
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
  /** Display label for custom lines; ignored for Standard items. */
  label?: string | null;
  depth?: "full" | "partial" | null;
  remaining?: string | null;
}): TenderScheduleItem | null {
  const def = getScopeItem(row.itemId);
  if (!def) {
    // A learned line: "ext.<divisionId>.<slug>" from the living
    // vocabulary, or a legacy project-scoped "custom.<divisionId>.
    // <slug>". Its label rides on the row because the authored
    // Standard, by definition, does not name it.
    const m = /^(?:custom|ext)\.([a-z0-9-]+)\.[a-z0-9-]+(?:-\d+)?$/.exec(row.itemId);
    if (!m || !row.label) return null;
    const division = getScopeDivision(m[1]!);
    return {
      itemId: row.itemId,
      divisionId: division?.id ?? m[1]!,
      divisionLabel: division?.label ?? "Project-specific work",
      label: row.label,
      plain:
        "A scope line specific to this project, added from its own documents.",
      kind: row.kind,
      ownerAmountAud: row.ownerAmountAud,
      citations: row.citations,
      note: row.note,
      depth: row.depth ?? null,
      remaining: row.remaining ?? null,
    };
  }
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
    depth: row.depth ?? null,
    remaining: row.remaining ?? null,
  };
}

/* ── addenda (pure halves) ──────────────────────────────────────────── */

export interface ScheduleDiffLine {
  itemId: string;
  label: string;
  divisionLabel: string;
  /** The line's shape on the side it exists on (or moved to). */
  kind: ScheduleItemKind;
  ownerAmountAud: number | null;
}

export interface ScheduleDiffChange {
  itemId: string;
  label: string;
  divisionLabel: string;
  fromKind: ScheduleItemKind;
  toKind: ScheduleItemKind;
  fromAmountAud: number | null;
  toAmountAud: number | null;
}

export interface ScheduleDiff {
  /** Priceable on the new pack, absent (or client-excluded) before. */
  added: ScheduleDiffLine[];
  /** Priceable before, gone (or client-excluded) now. */
  removed: ScheduleDiffLine[];
  /** Priceable both sides, but the line's shape or figure moved. */
  changed: ScheduleDiffChange[];
}

/**
 * What an addendum actually says: the movement of the PRICEABLE set
 * between two packs. Membership changes land in added/removed (a line
 * the client pulls out of the round is "removed" for tenderers, even
 * though it still prints as context); shape changes — an evidenced
 * line becoming a client allowance, a figure moving — land in changed.
 */
export function diffSchedules(
  prev: TenderSchedule,
  next: TenderSchedule,
): ScheduleDiff {
  const prevBy = new Map(tenderableItems(prev).map((i) => [i.itemId, i]));
  const nextBy = new Map(tenderableItems(next).map((i) => [i.itemId, i]));
  const line = (i: TenderScheduleItem): ScheduleDiffLine => ({
    itemId: i.itemId,
    label: i.label,
    divisionLabel: i.divisionLabel,
    kind: i.kind,
    ownerAmountAud: i.ownerAmountAud,
  });

  const added: ScheduleDiffLine[] = [];
  const removed: ScheduleDiffLine[] = [];
  const changed: ScheduleDiffChange[] = [];

  for (const [id, n] of nextBy) {
    const p = prevBy.get(id);
    if (!p) {
      added.push(line(n));
    } else if (p.kind !== n.kind || p.ownerAmountAud !== n.ownerAmountAud) {
      changed.push({
        itemId: id,
        label: n.label,
        divisionLabel: n.divisionLabel,
        fromKind: p.kind,
        toKind: n.kind,
        fromAmountAud: p.ownerAmountAud,
        toAmountAud: n.ownerAmountAud,
      });
    }
  }
  for (const [id, p] of prevBy) {
    if (!nextBy.has(id)) removed.push(line(p));
  }
  return { added, removed, changed };
}

/** "2 lines added, 1 revised, 1 removed" — the addendum's one-liner. */
export function summariseDiff(diff: ScheduleDiff): string {
  const bits = [
    diff.added.length
      ? `${diff.added.length} line${diff.added.length === 1 ? "" : "s"} added`
      : null,
    diff.changed.length
      ? `${diff.changed.length} revised`
      : null,
    diff.removed.length
      ? `${diff.removed.length} removed`
      : null,
  ].filter(Boolean);
  return bits.length > 0 ? bits.join(", ") : "No priceable lines moved";
}

/* ── the pack, for browsing ─────────────────────────────────────────── */

export interface PackHighlight {
  itemId: string;
  label: string;
  divisionLabel: string;
  /** The reader's line — what the documents actually say. */
  note: string;
}

export interface PackSummary {
  runId: string;
  standardVersion: string;
  lines: number;
  tenderable: number;
  evidenced: number;
  ownerAllowances: number;
  ownerAllowanceTotal: number;
  ownerExcluded: number;
  divisions: string[];
  /** A spread of evidenced lines with substantive notes, build order. */
  highlights: PackHighlight[];
}

/**
 * The pack shaped for the marketplace: what a builder weighs before
 * unlocking. Counts and division names carry no document content;
 * highlights DO quote the documents and belong behind the unlock.
 */
export function packSummary(schedule: TenderSchedule, opts?: {
  highlightLimit?: number;
}): PackSummary {
  const limit = opts?.highlightLimit ?? 8;
  const tenderable = tenderableItems(schedule);
  const allowances = schedule.items.filter(
    (i) => i.kind === "owner_allowance",
  );
  const divisions: string[] = [];
  for (const d of scheduleDivisions(schedule)) {
    if (d.items.length > 0) divisions.push(d.label);
  }
  // One highlight per division until the limit — a spread of the pack,
  // not eight lines about the slab. Substantive notes only.
  const highlights: PackHighlight[] = [];
  const seenDivision = new Set<string>();
  for (const pass of [true, false]) {
    for (const item of schedule.items) {
      if (highlights.length >= limit) break;
      if (item.kind !== "evidenced") continue;
      const note = item.note?.trim() ?? "";
      if (note.length < 24) continue;
      if (pass && seenDivision.has(item.divisionId)) continue;
      if (!pass && highlights.some((h) => h.itemId === item.itemId)) continue;
      seenDivision.add(item.divisionId);
      highlights.push({
        itemId: item.itemId,
        label: item.label,
        divisionLabel: item.divisionLabel,
        note,
      });
    }
  }
  return {
    runId: schedule.runId,
    standardVersion: schedule.standardVersion,
    lines: schedule.items.length,
    tenderable: tenderable.length,
    evidenced: schedule.items.filter((i) => i.kind === "evidenced").length,
    ownerAllowances: allowances.length,
    ownerAllowanceTotal: allowances.reduce(
      (n, i) => n + (i.ownerAmountAud ?? 0),
      0,
    ),
    ownerExcluded: ownerExcludedItems(schedule).length,
    divisions,
    highlights,
  };
}
