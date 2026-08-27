/**
 * scope-engine · corrections — reading the desk's verdicts back as
 * accuracy data.
 *
 * Every time somebody on the desk confirms, edits, removes or adds a
 * line, the service writes an append-only row to `scope_review_events`
 * holding what the model said and what the human decided. The code
 * that does it has carried the comment "every one is training data"
 * since the day it was written, and until now nothing has ever read
 * it. This module is the reader.
 *
 * THREE RULES MAKE THE NUMBERS HONEST.
 *
 * 1. FINAL STATE ONLY. A subject can be judged more than once —
 *    confirmed, then reconsidered and edited. Counting both would
 *    score one line twice and let an indecisive session outvote a
 *    careful one. Only the last verdict on each subject counts.
 *
 * 2. REVERSALS ERASE, THEY DO NOT ACCUMULATE. When the desk reopens a
 *    line it returns to pending, and a line awaiting a verdict is not
 *    evidence about the model. The reversal is kept in the log (it is
 *    a fact about the desk) and excluded from accuracy (it is not a
 *    fact about the engine). Reversal rate is reported separately,
 *    because a desk that reverses often is telling us something about
 *    the desk.
 *
 * 3. BULK IS NOT A JUDGEMENT. `run.bulk_confirmed` sweeps everything
 *    pending in one click. It is a real operational act and a weak
 *    label: nobody looked at those lines individually. It is counted
 *    and reported, never mixed into the agreement rate.
 *
 * Carried verdicts need no special handling here: the re-read carry
 * writes `ops_status` straight onto the row during synthesis persist
 * and never emits an event, so everything in this table is first-hand
 * by construction. That is worth stating because it is load-bearing —
 * if carry ever starts emitting events, this module starts lying.
 *
 * Pure functions, no I/O, so the arithmetic is testable without a
 * database and the same code serves the report, the metrics page and
 * any future gate.
 */

// ── the shape the desk records ──────────────────────────────────────

export interface ReviewEventInput {
  runId: string;
  /** Item id, `conflict:<uuid>`, a capture key, or "run". */
  subject: string;
  action: string;
  /** What the engine had concluded. */
  before: { status?: string | null; note?: string | null } | null;
  /** What the human decided. */
  after: { status?: string | null; note?: string | null; opsNote?: string | null } | null;
  actorId: string | null;
  createdAt: Date;
}

/** Verdicts that speak about ONE line, attributable to a human. */
const ITEM_VERDICTS = new Set([
  "item.confirmed",
  "item.edited",
  "item.removed",
  "item.added",
]);

/**
 * Actions that return a subject to pending. `item.reopened` does not
 * exist yet — S9.1 introduces it — and this module is written to
 * handle it from the day it lands rather than being retrofitted, so
 * that the first reversal cannot silently corrupt a metric.
 */
const REVERSALS = new Set(["item.reopened", "conflict.reopened", "capture.reopened"]);

// ── outputs ─────────────────────────────────────────────────────────

export interface VerdictCounts {
  confirmed: number;
  edited: number;
  removed: number;
  added: number;
  /** Individually-judged lines: the denominator for every rate below. */
  firstHand: number;
}

export interface CorrectionRates {
  /**
   * Confirmed / firstHand.
   *
   * READ THIS BEFORE QUOTING IT. This rate is computed over lines a
   * human chose to open individually, and a reviewer opens a line
   * BECAUSE they mean to change it — everything they agree with gets
   * swept by the bulk button instead. So it is not the model's error
   * rate; it is the hit rate of the desk's own attention, and on real
   * data it runs near zero by construction. Use it to compare
   * DIVISIONS against each other, and use `impliedAgreement` for a
   * figure about the model.
   */
  agreement: number;
  /** Removed / firstHand. The model raised a line that should not exist. */
  falsePositive: number;
  /** Edited / firstHand. Right line, wrong verdict or wrong words. */
  edit: number;
  /**
   * Added / (firstHand + added). Work the model missed entirely, which
   * a human had to type in. The rarest and most expensive error.
   */
  falseNegative: number;
}

/** What the model said versus what the human decided, per pair. */
export interface StatusMove {
  from: string;
  to: string;
  count: number;
  /** Item ids behind the number, so a rate is always diagnosable. */
  subjects: string[];
}

export interface DivisionStats {
  division: string;
  counts: VerdictCounts;
  rates: CorrectionRates;
}

export interface CorrectionsReport {
  runs: number;
  events: number;
  counts: VerdictCounts;
  rates: CorrectionRates;
  /** Swept in bulk: real operational acts, deliberately weak labels. */
  bulkConfirmed: number;
  /**
   * (confirmed + bulkConfirmed) / (firstHand + bulkConfirmed).
   *
   * The honest headline. A bulk sweep IS agreement — the reviewer read
   * the pack, chose the lines worth changing, and accepted the rest —
   * it is simply weaker evidence than a considered confirmation. This
   * figure counts it, which corrects the selection bias in `agreement`
   * without pretending a sweep is a careful read. Where the two
   * diverge sharply, the desk is leaning on the sweep.
   */
  impliedAgreement: number;
  /** Subjects whose verdict was reversed and not re-judged. */
  reversed: number;
  /** Reversals / (firstHand + reversals). A desk-quality signal. */
  reversalRate: number;
  /** Conflicts and captures, which are judged but are not scope lines. */
  conflictVerdicts: Record<string, number>;
  captureVerdicts: Record<string, number>;
  /** Where the model and the desk disagreed, most common first. */
  moves: StatusMove[];
  byDivision: DivisionStats[];
}

// ── arithmetic ──────────────────────────────────────────────────────

const rate = (n: number, d: number) => (d === 0 ? 0 : n / d);

function ratesFrom(c: VerdictCounts): CorrectionRates {
  return {
    agreement: rate(c.confirmed, c.firstHand),
    falsePositive: rate(c.removed, c.firstHand),
    edit: rate(c.edited, c.firstHand),
    falseNegative: rate(c.added, c.firstHand + c.added),
  };
}

const emptyCounts = (): VerdictCounts => ({
  confirmed: 0,
  edited: 0,
  removed: 0,
  added: 0,
  firstHand: 0,
});

/** `preliminaries.craneage` → `preliminaries`. */
function divisionOf(itemId: string): string {
  const i = itemId.indexOf(".");
  if (i < 0) return itemId;
  // Learned ids are `ext.<division>.<slug>`; the division is segment 2.
  if (itemId.startsWith("ext.") || itemId.startsWith("custom.")) {
    return itemId.split(".")[1] ?? itemId;
  }
  return itemId.slice(0, i);
}

/**
 * Reduce a stream of review events to accuracy figures.
 *
 * Events may arrive in any order; the reducer sorts per subject and
 * keeps only the last word.
 */
export function analyseCorrections(events: ReviewEventInput[]): CorrectionsReport {
  const runs = new Set(events.map((e) => e.runId));

  // Bulk sweeps and run-level acts are not per-subject verdicts.
  let bulkConfirmed = 0;
  for (const e of events) {
    if (e.action === "run.bulk_confirmed") {
      const n = (e.after as { confirmed?: number } | null)?.confirmed;
      bulkConfirmed += typeof n === "number" ? n : 0;
    }
  }

  // Conflicts and captures are judged too, but they are not scope
  // lines and must not dilute item accuracy.
  const conflictVerdicts: Record<string, number> = {};
  const captureVerdicts: Record<string, number> = {};

  // Group per-subject verdicts by (run, subject), keeping the last.
  const latest = new Map<string, ReviewEventInput>();
  for (const e of events) {
    if (e.action.startsWith("conflict.")) {
      conflictVerdicts[e.action] = (conflictVerdicts[e.action] ?? 0) + 1;
      continue;
    }
    if (e.action.startsWith("capture.")) {
      captureVerdicts[e.action] = (captureVerdicts[e.action] ?? 0) + 1;
      continue;
    }
    if (!ITEM_VERDICTS.has(e.action) && !REVERSALS.has(e.action)) continue;

    const key = `${e.runId}::${e.subject}`;
    const prev = latest.get(key);
    if (!prev || e.createdAt.getTime() >= prev.createdAt.getTime()) latest.set(key, e);
  }

  const counts = emptyCounts();
  const byDivision = new Map<string, VerdictCounts>();
  const moveKey = new Map<string, StatusMove>();
  let reversed = 0;

  for (const e of latest.values()) {
    // Rule 2: a reopened line is awaiting a verdict, not evidence.
    if (REVERSALS.has(e.action)) {
      reversed++;
      continue;
    }

    const division = divisionOf(e.subject);
    const d = byDivision.get(division) ?? emptyCounts();

    switch (e.action) {
      case "item.confirmed":
        counts.confirmed++; d.confirmed++; counts.firstHand++; d.firstHand++;
        break;
      case "item.edited":
        counts.edited++; d.edited++; counts.firstHand++; d.firstHand++;
        break;
      case "item.removed":
        counts.removed++; d.removed++; counts.firstHand++; d.firstHand++;
        break;
      case "item.added":
        // An added line was never the model's to get right, so it is
        // counted but deliberately kept out of firstHand — otherwise
        // adding work would improve the agreement rate.
        counts.added++; d.added++;
        break;
    }
    byDivision.set(division, d);

    // The confusion matrix: only where a status actually moved.
    const from = e.before?.status ?? null;
    const to = e.after?.status ?? null;
    if (from && to && from !== to) {
      const k = `${from}->${to}`;
      const m = moveKey.get(k) ?? { from, to, count: 0, subjects: [] };
      m.count++;
      if (m.subjects.length < 20) m.subjects.push(e.subject);
      moveKey.set(k, m);
    }
  }

  return {
    runs: runs.size,
    events: events.length,
    counts,
    rates: ratesFrom(counts),
    bulkConfirmed,
    impliedAgreement: rate(
      counts.confirmed + bulkConfirmed,
      counts.firstHand + bulkConfirmed,
    ),
    reversed,
    reversalRate: rate(reversed, counts.firstHand + reversed),
    conflictVerdicts,
    captureVerdicts,
    moves: [...moveKey.values()].sort((a, b) => b.count - a.count),
    byDivision: [...byDivision.entries()]
      .map(([division, c]) => ({ division, counts: c, rates: ratesFrom(c) }))
      .sort((a, b) => b.counts.firstHand - a.counts.firstHand),
  };
}

/**
 * Divisions the desk corrects most, which is where engine work pays
 * back fastest. Only divisions with enough judged lines to mean
 * anything: three corrections out of four lines is noise, not a signal.
 */
export function worstDivisions(
  report: CorrectionsReport,
  { minLines = 5, limit = 10 }: { minLines?: number; limit?: number } = {},
): DivisionStats[] {
  return report.byDivision
    .filter((d) => d.counts.firstHand >= minLines)
    .sort((a, b) => a.rates.agreement - b.rates.agreement)
    .slice(0, limit);
}
