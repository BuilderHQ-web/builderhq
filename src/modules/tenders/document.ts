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
  type InstrumentQuestion,
} from "./instrument";
import { formatAnswer, formatAud } from "./comparison";

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

  const isDraft = status === "draft";
  const m = computeTenderMetrics(answers);
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
  cells.push({
    k: "Scope coverage",
    v: `${m.coverage.included} of ${rows.length} trades included`,
  });
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
      if (!asked(q, answers)) continue;

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
