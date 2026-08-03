/**
 * The Tender Document model — the single source both renderers read.
 *
 * A submitted tender is a formal document: cover, contents, twelve
 * modules, schedules, sign-off, seal. This module turns the raw
 * instrument answers into that document's structure — every block
 * pre-formatted to plain strings — so the live HTML preview in the
 * deck and the PDF the builder downloads can never disagree. Pure and
 * client-safe: no server imports, no side effects.
 *
 * Layout stays with the renderers; CONTENT decisions (what appears,
 * in which order, labelled how) live here.
 */

import {
  sectionsFor,
  scopeMatrixRows,
  SCOPE_STATES,
  computeTenderMetrics,
  gateAllows,
  questionInPlay,
  type InstrumentQuestion,
} from "./instrument";
import { formatAnswer, formatAud } from "./comparison";
import {
  scheduleDivisions,
  scheduleTallies,
  deriveAllowanceRows,
  deriveScheduleExclusions,
  deriveNotApplicable,
  ownerExcludedItems,
  readScheduleAnswer,
  SCHEDULE_STATE_LABEL,
  type TenderSchedule,
} from "./schedule";

type Answers = Record<string, unknown>;

/* ── model ──────────────────────────────────────────────────────────── */

export interface DocQa {
  kind: "qa";
  ref: string;
  prompt: string;
  answer: string;
  /** True when the answer is an absence ("Not provided"). */
  muted: boolean;
}
export interface DocProse {
  kind: "prose";
  ref: string;
  title: string;
  text: string;
}
export interface DocTable {
  kind: "table";
  ref?: string;
  title: string;
  columns: string[];
  /** Column alignment, "l" or "r"; defaults to left. */
  align?: Array<"l" | "r">;
  rows: string[][];
  footer?: string[];
}
export interface DocChips {
  kind: "chips";
  ref: string;
  title: string;
  items: string[];
  tone: "danger" | "plain";
}
export interface DocNote {
  kind: "note";
  text: string;
}
export type DocBlock = DocQa | DocProse | DocTable | DocChips | DocNote;

export interface DocModule {
  no: string;
  title: string;
  blocks: DocBlock[];
}

export interface TenderDocumentModel {
  /** Short document reference printed on every page: "BHQ-3F92A1C4". */
  ref: string;
  verifyPath: string;
  isDraft: boolean;
  statusLabel: string;
  /** "22 July 2026" — submission date, or the render date for drafts. */
  dateLine: string;
  project: { title: string; meta: string };
  builder: { entity: string; abn: string | null; licence: string | null };
  cover: {
    priceExGst: string | null;
    priceIncGst: string | null;
    gstNote: string | null;
    cells: Array<{ k: string; v: string }>;
  };
  modules: DocModule[];
  signoff: {
    declarations: Array<{ ref: string; text: string; affirmed: boolean }>;
    signatory: string | null;
    role: string | null;
    dateLine: string;
  };
}

/* ── helpers ────────────────────────────────────────────────────────── */

function asked(q: InstrumentQuestion, answers: Answers): boolean {
  if (!q.showIf) return true;
  return gateAllows(q.showIf, answers[q.showIf.qid]);
}

const STATE_LABEL = new Map<string, string>(
  SCOPE_STATES.map((s) => [s.value, s.label]),
);

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function itemsTable(
  q: InstrumentQuestion,
  v: unknown,
): DocTable | null {
  if (!Array.isArray(v) || v.length === 0) return null;
  const fields = q.itemFields ?? [];
  const rows = (v as Array<Record<string, unknown>>).map((row) =>
    fields.map((f) => {
      const cell = row[f.key];
      if (cell === null || cell === undefined || cell === "") return "—";
      if (f.type === "currency" && typeof cell === "number") {
        return formatAud(cell);
      }
      if (f.type === "percent" && typeof cell === "number") return `${cell}%`;
      return String(cell);
    }),
  );
  return {
    kind: "table",
    ref: q.ref,
    title: q.prompt,
    columns: fields.map((f) => f.label),
    align: fields.map((f) => (f.type === "text" ? "l" : "r")),
    rows,
  };
}

/* ── the builder ────────────────────────────────────────────────────── */

export function buildTenderDocument(args: {
  tenderId: string;
  status: string;
  submittedAt: Date | string | null;
  instrumentVersion: number | null;
  answers: Answers;
  docs: Array<{ filename: string; sizeBytes: number }>;
  project: { title: string; meta: string };
  builder: {
    entity: string | null;
    abn: string | null;
    licence: string | null;
  };
  /**
   * The client's approved tender schedule, when the round was
   * published through the scope gate. Flips modules 5, 6 and 7 from
   * the generic trade grid to the line-by-line confirmation.
   */
  schedule?: TenderSchedule | null;
  /** Render moment, supplied by the caller (drafts date-stamp to it). */
  now: Date;
}): TenderDocumentModel {
  const {
    tenderId,
    status,
    submittedAt,
    instrumentVersion,
    answers,
    docs,
    project,
    builder,
    now,
  } = args;

  const schedule = args.schedule ?? null;
  const hasSchedule = schedule !== null && schedule.items.length > 0;
  const isDraft = status === "draft";
  const m = computeTenderMetrics(answers, hasSchedule ? schedule : null);
  const sections = sectionsFor(instrumentVersion);
  const rows = scopeMatrixRows();
  const matrix = (answers["scope.matrix"] ?? {}) as Record<string, string>;
  const rawAmounts = (answers["scope.amounts"] ?? {}) as Record<
    string,
    unknown
  >;
  // An amount only speaks for a trade the price includes.
  const amounts: Record<string, number> = {};
  for (const r of rows) {
    const a = rawAmounts[r.id];
    if (
      matrix[r.id] === "included" &&
      typeof a === "number" &&
      Number.isFinite(a) &&
      a > 0
    ) {
      amounts[r.id] = a;
    }
  }
  const hasAmounts = Object.keys(amounts).length > 0;

  const fmtQ = (qid: string): string | null => {
    const q = sections
      .flatMap((s) => s.questions)
      .find((x) => x.id === qid);
    return q ? formatAnswer(q, answers[qid]) : null;
  };

  /* cover cells — the facts an owner reads first */
  const cells: Array<{ k: string; v: string }> = [];
  if (m.depositPct !== null) cells.push({ k: "Deposit", v: `${m.depositPct}%` });
  if (m.validityDays !== null) {
    cells.push({ k: "Offer valid for", v: `${m.validityDays} days` });
  }
  const lead = fmtQ("prog.lead_time");
  if (lead) cells.push({ k: "Lead time to site", v: lead });
  const start = fmtQ("programme.start");
  if (start) cells.push({ k: "Start on site", v: start });
  if (m.durationWeeks !== null) {
    cells.push({ k: "Build period", v: `${m.durationWeeks} weeks` });
  }
  if (m.schedule) {
    cells.push({
      k: "Scope coverage",
      v: `${m.schedule.documented} of ${m.schedule.total} schedule lines as documented`,
    });
  } else {
    cells.push({
      k: "Scope coverage",
      v: `${m.coverage.included} of ${rows.length} trades included`,
    });
  }
  const dlp = fmtQ("contract.defects_liability");
  if (dlp) cells.push({ k: "Defects liability", v: dlp });
  if (m.ldPerWeek !== null) {
    cells.push({
      k: "Liquidated damages",
      v: `${formatAud(m.ldPerWeek)} per week`,
    });
  }

  /* modules */
  const modules: DocModule[] = [];
  let signoff: TenderDocumentModel["signoff"] = {
    declarations: [],
    signatory: null,
    role: null,
    dateLine: "",
  };

  const cleanText = (id: string): string | null => {
    const v = answers[id];
    return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
  };

  let no = 0;
  for (const section of sections) {
    no++;

    if (section.id === "signoff") {
      // Sign-off renders as the document's closing, not a module body.
      const decls = section.questions.filter((q) => q.type === "declare");
      signoff = {
        declarations: decls.map((q) => ({
          ref: q.ref ?? "",
          text: q.prompt,
          affirmed: answers[q.id] === true,
        })),
        signatory: cleanText("sign.signatory"),
        role: cleanText("sign.role"),
        dateLine: submittedAt ? fmtDate(new Date(submittedAt)) : fmtDate(now),
      };
      // Documents module sits before sign-off in the deck; keep the
      // numbering aligned by emitting it here for v2 sets.
      modules.push(docsModule(String(no).padStart(2, "0"), docs));
      no++;
      modules.push({
        no: String(no).padStart(2, "0"),
        title: section.title,
        blocks: [],
      });
      continue;
    }

    const blocks: DocBlock[] = [];

    for (const q of section.questions) {
      if (q.type === "amounts") continue;
      if (q.id === "scope.schedule_run") continue;
      if (!questionInPlay(q, hasSchedule)) continue;
      if (!asked(q, answers)) continue;

      if (q.type === "schedule" && schedule) {
        blocks.push(...scheduleBlocks(q, schedule, answers));
        continue;
      }

      if (q.id === "pcps.schedule_confirm" && schedule) {
        blocks.push(allowanceScheduleBlock(q, schedule, answers));
        continue;
      }

      if (q.id === "excl.derived_confirm" && schedule) {
        blocks.push(...scheduleExclusionBlocks(q, schedule, answers));
        continue;
      }

      if (q.type === "matrix") {
        const tableRows = rows.map((r) => {
          const state = matrix[r.id];
          const amt = amounts[r.id];
          const base = [r.label, state ? STATE_LABEL.get(state) ?? state : "—"];
          if (hasAmounts) {
            base.push(amt !== undefined ? formatAud(amt) : "—");
          }
          return base;
        });
        blocks.push({
          kind: "table",
          ref: q.ref,
          title: "Schedule of works coverage",
          columns: hasAmounts
            ? ["Trade", "Status", "Amount ex GST"]
            : ["Trade", "Status"],
          align: hasAmounts ? ["l", "l", "r"] : ["l", "l"],
          rows: tableRows,
          footer:
            hasAmounts && m.itemisedTotal > 0
              ? [
                  `Itemised across ${m.itemisedCount} trades`,
                  "",
                  formatAud(m.itemisedTotal),
                ]
              : undefined,
        });
        continue;
      }

      if (q.id === "excl.derived_confirm") {
        // The schedule is the grid's excluded trades plus the free
        // lines from 6.2, printed as one complete record.
        const excluded = rows
          .filter((r) => matrix[r.id] === "excluded")
          .map((r) => r.label);
        const extra = Array.isArray(answers["scope.exclusions_list"])
          ? (answers["scope.exclusions_list"] as Array<Record<string, unknown>>)
              .map((row) =>
                typeof row?.exclusion === "string" ? row.exclusion.trim() : "",
              )
              .filter((s) => s.length > 0)
          : [];
        const all = [...excluded, ...extra];
        blocks.push({
          kind: "chips",
          ref: q.ref ?? "",
          title: "Exclusion schedule",
          items:
            all.length > 0
              ? all
              : ["Nothing is excluded from this price."],
          tone: all.length > 0 ? "danger" : "plain",
        });
        continue;
      }

      // Folded into the exclusion schedule above.
      if (q.id === "scope.exclusions_list") continue;

      if (q.type === "items") {
        const table = itemsTable(q, answers[q.id]);
        if (table) blocks.push(table);
        else if (q.required) {
          blocks.push({
            kind: "qa",
            ref: q.ref ?? "",
            prompt: q.prompt,
            answer: "Not provided",
            muted: true,
          });
        }
        continue;
      }

      if (q.type === "text" && q.id === "comment.approach") {
        const text = answers[q.id];
        if (typeof text === "string" && text.trim().length > 0) {
          blocks.push({
            kind: "prose",
            ref: q.ref ?? "",
            title: "Our approach",
            text: text.trim(),
          });
        }
        continue;
      }

      const answer = formatAnswer(q, answers[q.id]);
      // Optional colour left empty stays out of the document; required
      // gaps print honestly as "Not provided".
      if (answer === null && !q.required) continue;
      blocks.push({
        kind: "qa",
        ref: q.ref ?? "",
        prompt: q.prompt,
        answer: answer ?? "Not provided",
        muted: answer === null,
      });
    }

    if (blocks.length === 0) {
      blocks.push({ kind: "note", text: "Nothing to declare in this module." });
    }

    modules.push({
      no: String(no).padStart(2, "0"),
      title: section.title,
      blocks,
    });
  }

  // v1 sets have no sign-off section — documents still close the set.
  if (!sections.some((s) => s.id === "signoff")) {
    no++;
    modules.push(docsModule(String(no).padStart(2, "0"), docs));
  }

  return {
    ref: `BHQ-${tenderId.slice(0, 8).toUpperCase()}`,
    verifyPath: `/verify/${tenderId}`,
    isDraft,
    statusLabel: isDraft ? "Draft" : "Submitted",
    dateLine: submittedAt ? fmtDate(new Date(submittedAt)) : fmtDate(now),
    project,
    builder: {
      entity: builder.entity ?? "The tendering builder",
      abn: builder.abn,
      licence: builder.licence,
    },
    cover: {
      priceExGst: m.priceExGst !== null ? formatAud(m.priceExGst) : null,
      priceIncGst:
        m.priceIncGst !== null && m.priceIncGst !== m.priceExGst
          ? formatAud(m.priceIncGst)
          : null,
      gstNote:
        m.priceExGst !== null && m.priceIncGst === m.priceExGst
          ? "Not registered for GST"
          : null,
      cells,
    },
    modules,
    signoff,
  };
}

/* ── schedule rendering (the flip) ──────────────────────────────────── */

/**
 * Module 5 on a schedule round: one table per division, every line of
 * the client's pack against the builder's mark, then the totals. Reads
 * like a bill of quantities because it is one — the same lines every
 * other tender on the round answered.
 */
function scheduleBlocks(
  q: InstrumentQuestion,
  schedule: TenderSchedule,
  answers: Answers,
): DocBlock[] {
  const answer = readScheduleAnswer(answers["scope.schedule"]);
  const divisions = scheduleDivisions(schedule).filter(
    (d) => d.items.length > 0,
  );
  const blocks: DocBlock[] = [];

  blocks.push({
    kind: "note",
    text: `Priced against the client's tender schedule: ${
      schedule.items.length
    } lines read from the project documents under the BuilderHQ Scope Standard v${
      schedule.standardVersion
    }. Every tender on this round answers the same lines.`,
  });

  let first = true;
  for (const d of divisions) {
    const rows = d.items.map((item) => {
      const e = answer[item.itemId];
      let state = "Not marked";
      let amount = "—";
      if (e) {
        state = SCHEDULE_STATE_LABEL.get(e.s) ?? e.s;
        if (e.s === "allowance") {
          amount = typeof e.a === "number" ? formatAud(e.a) : "—";
          if (item.kind === "owner_allowance") {
            state =
              item.ownerAmountAud !== null && e.a === item.ownerAmountAud
                ? "Allowance, client's figure"
                : "Allowance, builder's figure";
          }
        } else if (e.s === "documented" && typeof e.p === "number") {
          // A disclosed line price prints exactly as given — the
          // builder chose to show the working.
          amount = formatAud(e.p);
        }
      }
      return [item.label, state, amount];
    });
    blocks.push({
      kind: "table",
      ref: first ? q.ref : undefined,
      title: d.label,
      columns: ["Line", "In this price", "Amount ex GST"],
      align: ["l", "l", "r"],
      rows,
    });
    first = false;
  }

  const t = scheduleTallies(schedule, answers["scope.schedule"]);
  blocks.push({
    kind: "table",
    title: "Schedule totals",
    columns: ["", ""],
    align: ["l", "r"],
    rows: [
      ["Included as documented", String(t.documented)],
      [
        "Carried as allowances",
        t.allowance > 0
          ? `${t.allowance} (${formatAud(t.allowanceTotal)})`
          : "0",
      ],
      ["Excluded from this price", String(t.excluded)],
      ...(t.notApplicable > 0
        ? [["Set aside as not applicable", String(t.notApplicable)]]
        : []),
      ...(t.disclosedCount > 0
        ? [
            [
              "Line prices disclosed",
              `${t.disclosedCount} (${formatAud(t.disclosedTotal)})`,
            ],
          ]
        : []),
    ],
  });

  return blocks;
}

/** Module 7 on a schedule round: the derived allowance schedule. */
function allowanceScheduleBlock(
  q: InstrumentQuestion,
  schedule: TenderSchedule,
  answers: Answers,
): DocBlock {
  const rows = deriveAllowanceRows(schedule, answers["scope.schedule"]);
  if (rows.length === 0) {
    return {
      kind: "chips",
      ref: q.ref ?? "",
      title: "Allowance schedule",
      items: ["No allowances. Every schedule line in the price is priced as documented."],
      tone: "plain",
    };
  }
  const total = rows.reduce((n, r) => n + r.amountAud, 0);
  return {
    kind: "table",
    ref: q.ref,
    title: "Allowance schedule",
    columns: ["Allowance", "Source", "Amount ex GST"],
    align: ["l", "l", "r"],
    rows: rows.map((r) => [
      `${r.label} (${r.divisionLabel})`,
      r.source === "client_schedule"
        ? r.ownerAmountAud !== null && r.amountAud === r.ownerAmountAud
          ? "Client schedule, carried"
          : "Client schedule, repriced"
        : "Builder",
      formatAud(r.amountAud),
    ]),
    footer: [`${rows.length} allowance${rows.length === 1 ? "" : "s"}`, "", formatAud(total)],
  };
}

/**
 * Module 6 on a schedule round: the builder's exclusions (their marks
 * plus free lines), and the client's own exclusions printed separately
 * so the record shows both sides of the line.
 */
function scheduleExclusionBlocks(
  q: InstrumentQuestion,
  schedule: TenderSchedule,
  answers: Answers,
): DocBlock[] {
  const marked = deriveScheduleExclusions(
    schedule,
    answers["scope.schedule"],
  ).map((r) => `${r.label} (${r.divisionLabel})`);
  const extra = Array.isArray(answers["scope.exclusions_list"])
    ? (answers["scope.exclusions_list"] as Array<Record<string, unknown>>)
        .map((row) =>
          typeof row?.exclusion === "string" ? row.exclusion.trim() : "",
        )
        .filter((s) => s.length > 0)
    : [];
  const all = [...marked, ...extra];
  const blocks: DocBlock[] = [
    {
      kind: "chips",
      ref: q.ref ?? "",
      title: "Exclusion schedule",
      items: all.length > 0 ? all : ["Nothing is excluded from this price."],
      tone: all.length > 0 ? "danger" : "plain",
    },
  ];
  const na = deriveNotApplicable(schedule, answers["scope.schedule"]);
  if (na.length > 0) {
    blocks.push({
      kind: "table",
      ref: "",
      title: "Lines held not applicable to this project",
      columns: ["Line", "Division", "Reason stated"],
      align: ["l", "l", "l"],
      rows: na.map((r) => [
        r.label,
        r.divisionLabel,
        r.note ?? "No reason stated",
      ]),
    });
  }
  const clientOut = ownerExcludedItems(schedule).map(
    (i) => `${i.label} (${i.divisionLabel})`,
  );
  if (clientOut.length > 0) {
    blocks.push({
      kind: "chips",
      ref: "",
      title: "Outside the client's tender scope",
      items: clientOut,
      tone: "plain",
    });
  }
  return blocks;
}

function docsModule(
  no: string,
  docs: Array<{ filename: string; sizeBytes: number }>,
): DocModule {
  return {
    no,
    title: "Additional documents",
    blocks:
      docs.length > 0
        ? [
            {
              kind: "table",
              title: "Attached with this tender",
              columns: ["File", "Size"],
              align: ["l", "r"],
              rows: docs.map((d) => [d.filename, fmtBytes(d.sizeBytes)]),
            },
          ]
        : [{ kind: "note", text: "No additional documents attached." }],
  };
}

function fmtBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}
