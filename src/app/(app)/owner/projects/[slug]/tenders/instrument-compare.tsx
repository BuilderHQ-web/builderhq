"use client";

/**
 * The like-for-like read — the instrument-powered heart of the
 * comparison page. Every builder answered the same structured set, so
 * this region puts those answers side by side and does the one job a
 * pile of PDFs can't: show where the quotes genuinely part ways.
 *
 * Design principles:
 *
 *   DIFFERENCES FIRST. Agreement is reassuring but not actionable.
 *   The scope matrix sorts rows the builders disagree on to the top;
 *   the answer sections default to differences only, with the count
 *   of identical answers stated so nothing feels hidden.
 *
 *   FACTS, NOT VERDICTS. Risk flags state what an answer says in
 *   neutral language. An honest "excluded" must never read worse than
 *   a vague inclusion — the comparison does the judging by making the
 *   difference visible, not by scolding.
 *
 *   THE SOFT PART OF THE PRICE. A headline number with 25% of it in
 *   allowances is a different promise than the same number fully
 *   priced. The price integrity strip splits every contract sum into
 *   firm vs allowances so "cheapest" gets an honest asterisk.
 */

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";

import {
  sectionsFor,
  allQuestionsFor,
  scopeMatrixRows,
  gateAllows,
  questionInPlay,
  inPlayContextFromAnswers,
  type InstrumentQuestion,
  type InstrumentSection,
  type ScopeState,
} from "@/modules/tenders/instrument";
import {
  answersDiffer,
  formatAnswer,
  formatAud,
} from "@/modules/tenders/comparison";
import {
  tenderableItems,
  readScheduleAnswer,
  type TenderSchedule,
  type ScheduleState,
} from "@/modules/tenders/schedule";
import type {
  TenderForOwner,
  TenderInstrumentSummary,
} from "@/modules/tenders";
import { cn } from "@/lib/utils";

/* ── shared bits ────────────────────────────────────────────────────── */

type Summaries = Record<string, TenderInstrumentSummary | null>;

function builderName(t: TenderForOwner): string {
  return t.builder.companyName ?? t.builder.name ?? "Builder";
}

/** Column grid shared by every row so all surfaces align perfectly. */
function colStyle(n: number): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: `minmax(150px, 220px) repeat(${n}, minmax(150px, 1fr))`,
  };
}

const SCOPE_META: Record<
  ScopeState,
  { label: string; dot: string; cls: string }
> = {
  included: {
    label: "Included",
    dot: "bg-accent-light",
    cls: "text-[#0a7d73]",
  },
  allowance: {
    label: "Provisional sum",
    dot: "bg-[#c99422]",
    cls: "text-[#8a6414]",
  },
  excluded: {
    label: "Excluded",
    dot: "bg-[#c25550]",
    cls: "text-[#a8433e]",
  },
  not_applicable: {
    label: "N/A",
    dot: "bg-[rgba(24,34,44,0.25)]",
    cls: "text-text-dim",
  },
};

/* ── region ─────────────────────────────────────────────────────────── */

export function InstrumentCompare({
  selected,
  summaries,
  schedule = null,
}: {
  selected: TenderForOwner[];
  summaries: Summaries;
  /** The client's approved pack on gate rounds — flips the scope block. */
  schedule?: TenderSchedule | null;
}) {
  const withData = selected.filter((t) => summaries[t.id]);
  const legacy = selected.filter((t) => !summaries[t.id]);

  // Price baseline spans ALL selected tenders (legacy included) so
  // "Lowest price" here never contradicts the cards above.
  const selectedPrices = selected
    .map((t) => t.totalPriceAud)
    .filter((n): n is number => n !== null && n > 0);
  const lowestSelected =
    selectedPrices.length > 0 ? Math.min(...selectedPrices) : null;

  if (selected.length === 0 || withData.length === 0) return null;

  return (
    <section className="rounded-lg border border-border-subtle bg-surface-1 card-elev overflow-hidden shadow-[0_18px_44px_-22px_rgba(15,23,32,0.19)]">
      {/* Region header */}
      <header className="px-4 sm:px-6 py-5 border-b border-border-subtle/60 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="text-[10px] tracking-[0.22em] uppercase text-accent-light font-ui font-medium inline-flex items-center gap-2">
            <Scale className="size-3.5" />
            The like-for-like read
          </span>
          <h2 className="mt-1.5 font-display uppercase tracking-[-0.014em] text-[22px] sm:text-[28px] leading-[1] text-text">
            Same questions, every builder
          </h2>
          <p className="mt-1.5 text-[12.5px] leading-[1.6] text-text-muted max-w-[62ch]">
            Each tender below answered the BuilderHQ submission standard, so
            price, scope and conditions compare on the same terms. Differences
            surface first.
          </p>
        </div>
        {legacy.length > 0 ? (
          <p className="text-[11px] text-text-dim max-w-[32ch]">
            {legacy.map(builderName).join(" and ")}{" "}
            {legacy.length === 1 ? "was" : "were"} submitted before the
            standard and {legacy.length === 1 ? "appears" : "appear"} in the
            sections further down only.
          </p>
        ) : null}
      </header>

      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <PriceIntegrityStrip
            tenders={withData}
            summaries={summaries}
            lowestSelected={lowestSelected}
          />
          <RiskFlagsRow tenders={withData} summaries={summaries} />
          {schedule ? (
            <ScheduleAlignment
              tenders={withData}
              summaries={summaries}
              schedule={schedule}
            />
          ) : (
            <CoverageMatrix tenders={withData} summaries={summaries} />
          )}
          <AnswerSections tenders={withData} summaries={summaries} />
        </div>
      </div>
    </section>
  );
}

/* ── 1 · price integrity ────────────────────────────────────────────── */

function PriceIntegrityStrip({
  tenders,
  summaries,
  lowestSelected,
}: {
  tenders: TenderForOwner[];
  summaries: Summaries;
  /** Lowest price across ALL selected tenders, legacy included. */
  lowestSelected: number | null;
}) {
  const lowest = lowestSelected;

  return (
    <div className="border-b border-border-subtle/60">
      <div style={colStyle(tenders.length)}>
        <div className="px-4 sm:px-6 py-4">
          <p className="text-[10px] tracking-[0.16em] uppercase text-text-dim font-ui font-semibold">
            The price
          </p>
          <p className="mt-1 text-[11px] leading-[1.55] text-text-dim">
            Firm means priced in the contract sum. Allowances can move at
            cost once the real quantity or selection is known.
          </p>
        </div>

        {tenders.map((t) => {
          const s = summaries[t.id]!;
          const price = t.totalPriceAud;
          const firm =
            price !== null ? Math.max(0, price - s.exposure.total) : null;
          const softPct =
            price && price > 0
              ? Math.min(100, Math.round((s.exposure.total / price) * 100))
              : 0;
          const delta =
            price !== null && lowest !== null && price !== lowest
              ? price - lowest
              : null;

          return (
            <div
              key={t.id}
              className="px-4 py-4 border-l border-border-subtle/50 min-w-0"
            >
              <p className="text-[11px] font-ui font-semibold text-text-muted truncate">
                {builderName(t)}
              </p>
              <p className="mt-1 font-display text-[24px] leading-none text-text tabular-nums">
                {price !== null ? formatAud(price) : "—"}
              </p>
              <p className="mt-1 text-[10.5px] tabular-nums h-[14px]">
                {delta !== null ? (
                  <span className="text-text-dim">
                    +{formatAud(delta)} vs lowest
                  </span>
                ) : lowest !== null && price === lowest && tenders.length > 1 ? (
                  <span className="text-[#0a7d73] font-ui font-semibold">
                    Lowest price
                  </span>
                ) : null}
              </p>

              {/* firm / soft split */}
              <div className="mt-3">
                <div className="h-[6px] rounded-full overflow-hidden bg-border-subtle/50 flex">
                  <div
                    className="h-full bg-accent-light"
                    style={{ width: `${100 - softPct}%` }}
                  />
                  {softPct > 0 ? (
                    <div
                      className="h-full bg-[#c99422]"
                      style={{ width: `${softPct}%` }}
                    />
                  ) : null}
                </div>
                <p className="mt-1.5 text-[10.5px] leading-[1.5] text-text-dim tabular-nums">
                  {firm !== null ? (
                    <>
                      Firm {formatAud(firm)}
                      {s.exposure.total > 0 ? (
                        <>
                          {" · "}
                          <span className="text-[#8a6414]">
                            allowances {formatAud(s.exposure.total)}
                            {s.exposure.shareOfPrice !== null
                              ? ` (${s.exposure.shareOfPrice}%)`
                              : ""}
                          </span>
                        </>
                      ) : (
                        " · fully priced"
                      )}
                    </>
                  ) : (
                    "No price given"
                  )}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── 2 · risk flags ─────────────────────────────────────────────────── */

function RiskFlagsRow({
  tenders,
  summaries,
}: {
  tenders: TenderForOwner[];
  summaries: Summaries;
}) {
  const [open, setOpen] = useState(true);
  const totalFlags = tenders.reduce(
    (n, t) => n + (summaries[t.id]?.flags.length ?? 0),
    0,
  );

  return (
    <div className="border-b border-border-subtle/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-[rgba(24,34,44,0.015)] transition-colors"
      >
        <span className="inline-flex items-center gap-2.5">
          <span className="text-[10px] tracking-[0.16em] uppercase text-text-dim font-ui font-semibold">
            Worth weighing
          </span>
          <span
            className={cn(
              "text-[10px] font-ui font-semibold px-1.5 py-0.5 rounded-full tabular-nums",
              totalFlags > 0
                ? "bg-[rgba(217,164,65,0.14)] text-[#8a6414]"
                : "bg-[rgba(0,166,155,0.10)] text-[#0a7d73]",
            )}
          >
            {totalFlags === 0 ? "Nothing flagged" : totalFlags}
          </span>
        </span>
        {open ? (
          <ChevronUp className="size-3.5 text-text-dim" />
        ) : (
          <ChevronDown className="size-3.5 text-text-dim" />
        )}
      </button>

      {open ? (
        <div style={colStyle(tenders.length)} className="pb-4">
          <div className="px-4 sm:px-6">
            <p className="text-[11px] leading-[1.55] text-text-dim">
              Facts from the answers, not verdicts. Each one is a good
              question to put back to the builder.
            </p>
          </div>
          {tenders.map((t) => {
            const flags = summaries[t.id]!.flags;
            return (
              <div
                key={t.id}
                className="px-4 border-l border-border-subtle/50 min-w-0 space-y-2"
              >
                {flags.length === 0 ? (
                  <p className="inline-flex items-center gap-1.5 text-[11.5px] text-[#0a7d73]">
                    <ShieldCheck className="size-3.5" />
                    Nothing flagged
                  </p>
                ) : (
                  flags.map((f) => (
                    <div key={f.id} className="flex items-start gap-2">
                      <span
                        className={cn(
                          "mt-[3px] size-2 rounded-full shrink-0",
                          f.severity === "high"
                            ? "bg-[#c25550]"
                            : "bg-[#c99422]",
                        )}
                      />
                      <div className="min-w-0">
                        <p className="text-[11.5px] font-ui font-medium text-text leading-[1.4]">
                          {f.label}
                        </p>
                        <p className="text-[10.5px] leading-[1.5] text-text-dim">
                          {f.detail}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/* ── 3 · coverage matrix ────────────────────────────────────────────── */

function CoverageMatrix({
  tenders,
  summaries,
}: {
  tenders: TenderForOwner[];
  summaries: Summaries;
}) {
  const [diffFirst, setDiffFirst] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const rows = useMemo(() => {
    const all = scopeMatrixRows().map((row) => {
      const states = tenders.map(
        (t) => summaries[t.id]!.coverage.states[row.id] ?? null,
      );
      const differs =
        tenders.length > 1 && new Set(states.map((s) => s ?? "∅")).size > 1;
      // A row everyone marked N/A is noise for this project.
      const allNa = states.every((s) => s === "not_applicable");
      return { ...row, states, differs, allNa };
    });
    const relevant = all.filter((r) => !r.allNa);
    if (!diffFirst) return relevant;
    return [
      ...relevant.filter((r) => r.differs),
      ...relevant.filter((r) => !r.differs),
    ];
  }, [tenders, summaries, diffFirst]);

  const differCount = rows.filter((r) => r.differs).length;
  // Collapsing assumes differing rows sit at the top — only true in
  // differences-first order, so trade order always shows everything.
  const visible =
    showAll || !diffFirst ? rows : rows.slice(0, Math.max(differCount, 8));
  const hiddenCount = rows.length - visible.length;

  return (
    <div className="border-b border-border-subtle/60">
      <div className="px-4 sm:px-6 pt-5 pb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] tracking-[0.16em] uppercase text-text-dim font-ui font-semibold">
            Scope coverage
          </p>
          <p className="mt-1 text-[12.5px] text-text-muted">
            {tenders.length > 1 ? (
              differCount > 0 ? (
                <>
                  Builders part ways on{" "}
                  <span className="font-ui font-semibold text-text">
                    {differCount} of {rows.length}
                  </span>{" "}
                  scope lines. That is where the price difference lives.
                </>
              ) : (
                "Every builder covers the same scope. The comparison is price and conditions."
              )
            ) : (
              "What this price covers, line by line."
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* legend */}
          <div className="hidden sm:flex items-center gap-3">
            {(Object.keys(SCOPE_META) as ScopeState[]).map((k) => (
              <span
                key={k}
                className="inline-flex items-center gap-1.5 text-[10px] text-text-dim"
              >
                <span
                  className={cn("size-2 rounded-full", SCOPE_META[k].dot)}
                />
                {SCOPE_META[k].label}
              </span>
            ))}
          </div>
          {tenders.length > 1 && differCount > 0 ? (
            <button
              type="button"
              onClick={() => setDiffFirst((d) => !d)}
              className={cn(
                "inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-[11px] transition-colors",
                diffFirst
                  ? "border-border-accent bg-[rgba(0,212,200,0.06)] text-text"
                  : "border-border-subtle text-text-muted hover:border-border-strong",
              )}
            >
              <SlidersHorizontal className="size-3" />
              Differences first
            </button>
          ) : null}
        </div>
      </div>

      {/* column headers */}
      <div
        style={colStyle(tenders.length)}
        className="border-t border-border-subtle/40"
      >
        <div className="px-4 sm:px-6 py-2" />
        {tenders.map((t) => (
          <div
            key={t.id}
            className="px-4 py-2 border-l border-border-subtle/50 min-w-0"
          >
            <p className="text-[10.5px] font-ui font-semibold text-text-muted truncate">
              {builderName(t)}
            </p>
          </div>
        ))}
      </div>

      <ul>
        {visible.map((row, i) => (
          <li
            key={row.id}
            style={colStyle(tenders.length)}
            className={cn(
              "border-t border-border-subtle/30",
              row.differs
                ? "bg-[rgba(0,212,200,0.03)]"
                : i % 2 === 1
                  ? "bg-[rgba(24,34,44,0.012)]"
                  : undefined,
            )}
          >
            <div className="px-4 sm:px-6 py-2 flex items-center gap-2 min-w-0">
              {row.differs ? (
                <span
                  className="size-1.5 rounded-full bg-accent shrink-0"
                  title="Builders differ on this line"
                />
              ) : (
                <span className="size-1.5 shrink-0" />
              )}
              <span
                className={cn(
                  "text-[12px] truncate",
                  row.differs
                    ? "text-text font-ui font-medium"
                    : "text-text-muted",
                )}
              >
                {row.label}
              </span>
            </div>
            {row.states.map((s, j) => (
              <div
                key={j}
                className="px-4 py-2 border-l border-border-subtle/40 flex items-center min-w-0"
              >
                {s ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 text-[11px] font-ui",
                      SCOPE_META[s].cls,
                      row.differs && "font-semibold",
                    )}
                  >
                    <span
                      className={cn("size-2 rounded-full", SCOPE_META[s].dot)}
                    />
                    {SCOPE_META[s].label}
                  </span>
                ) : (
                  <span className="text-[11px] text-text-dim/60">
                    Not marked
                  </span>
                )}
              </div>
            ))}
          </li>
        ))}
      </ul>

      {hiddenCount > 0 ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="w-full py-2.5 text-[11.5px] text-text-muted hover:text-text border-t border-border-subtle/40 transition-colors"
        >
          {tenders.length > 1
            ? `Show the ${hiddenCount} lines the builders agree on`
            : `Show the remaining ${hiddenCount} lines`}
          <ChevronDown className="inline size-3 ml-1" />
        </button>
      ) : showAll && rows.length > 8 ? (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className="w-full py-2.5 text-[11.5px] text-text-muted hover:text-text border-t border-border-subtle/40 transition-colors"
        >
          Collapse to the lines that differ
          <ChevronUp className="inline size-3 ml-1" />
        </button>
      ) : null}
    </div>
  );
}

/* ── 3b · the schedule alignment (gate rounds) ──────────────────────── */

const SCHED_META: Record<
  ScheduleState,
  { label: string; dot: string; cls: string }
> = {
  documented: {
    label: "As documented",
    dot: "bg-accent-light",
    cls: "text-[#0a7d73]",
  },
  allowance: {
    label: "Provisional sum",
    dot: "bg-[#c99422]",
    cls: "text-[#8a6414]",
  },
  excluded: {
    label: "Excluded",
    dot: "bg-[#c25550]",
    cls: "text-[#a8433e]",
  },
  na: {
    label: "Not applicable",
    dot: "bg-[#8a8577]",
    cls: "text-text-dim",
  },
};

/**
 * The item-level read only a gate round can produce: every line of the
 * client's pack against every builder's mark, allowance figures in the
 * cells, disagreements sorted to the top. This is the surface two
 * builder PDFs can never give an owner.
 */
function ScheduleAlignment({
  tenders,
  summaries,
  schedule,
}: {
  tenders: TenderForOwner[];
  summaries: Summaries;
  schedule: TenderSchedule;
}) {
  const [diffFirst, setDiffFirst] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const rows = useMemo(() => {
    const marks = new Map(
      tenders.map((t) => [
        t.id,
        readScheduleAnswer(summaries[t.id]!.answers["scope.schedule"]),
      ]),
    );
    const all = tenderableItems(schedule).map((item) => {
      const cells = tenders.map((t) => marks.get(t.id)![item.itemId] ?? null);
      const differs =
        tenders.length > 1 &&
        new Set(cells.map((e) => e?.s ?? "∅")).size > 1;
      return { item, cells, differs };
    });
    if (!diffFirst) return all;
    return [...all.filter((r) => r.differs), ...all.filter((r) => !r.differs)];
  }, [tenders, summaries, schedule, diffFirst]);

  const differCount = rows.filter((r) => r.differs).length;
  const visible =
    showAll || !diffFirst ? rows : rows.slice(0, Math.max(differCount, 10));
  const hiddenCount = rows.length - visible.length;

  return (
    <div className="border-b border-border-subtle/60">
      <div className="px-4 sm:px-6 pt-5 pb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] tracking-[0.16em] uppercase text-text-dim font-ui font-semibold">
            The schedule alignment
          </p>
          <p className="mt-1 text-[12.5px] text-text-muted max-w-[62ch]">
            {tenders.length > 1 ? (
              differCount > 0 ? (
                <>
                  Every builder answered the same {rows.length}-line tender
                  schedule. They part ways on{" "}
                  <span className="font-ui font-semibold text-text">
                    {differCount} line{differCount === 1 ? "" : "s"}
                  </span>
                  . That is where the price difference lives.
                </>
              ) : (
                "Every builder priced the same schedule the same way. The comparison is price and conditions."
              )
            ) : (
              "What this price does with every line of your tender schedule."
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3">
            {(Object.keys(SCHED_META) as ScheduleState[]).map((k) => (
              <span
                key={k}
                className="inline-flex items-center gap-1.5 text-[10px] text-text-dim"
              >
                <span
                  className={cn("size-2 rounded-full", SCHED_META[k].dot)}
                />
                {SCHED_META[k].label}
              </span>
            ))}
          </div>
          {tenders.length > 1 && differCount > 0 ? (
            <button
              type="button"
              onClick={() => setDiffFirst((d) => !d)}
              className={cn(
                "inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-[11px] transition-colors",
                diffFirst
                  ? "border-border-accent bg-[rgba(0,212,200,0.06)] text-text"
                  : "border-border-subtle text-text-muted hover:border-border-strong",
              )}
            >
              <SlidersHorizontal className="size-3" />
              Differences first
            </button>
          ) : null}
        </div>
      </div>

      <div
        style={colStyle(tenders.length)}
        className="border-t border-border-subtle/40"
      >
        <div className="px-4 sm:px-6 py-2" />
        {tenders.map((t) => (
          <div
            key={t.id}
            className="px-4 py-2 border-l border-border-subtle/50 min-w-0"
          >
            <p className="text-[10.5px] font-ui font-semibold text-text-muted truncate">
              {builderName(t)}
            </p>
          </div>
        ))}
      </div>

      <ul>
        {visible.map((row, i) => (
          <li
            key={row.item.itemId}
            style={colStyle(tenders.length)}
            className={cn(
              "border-t border-border-subtle/30",
              row.differs
                ? "bg-[rgba(0,212,200,0.03)]"
                : i % 2 === 1
                  ? "bg-[rgba(24,34,44,0.012)]"
                  : undefined,
            )}
          >
            <div className="px-4 sm:px-6 py-2 flex items-center gap-2 min-w-0">
              {row.differs ? (
                <span
                  className="size-1.5 rounded-full bg-accent shrink-0"
                  title="Builders differ on this line"
                />
              ) : (
                <span className="size-1.5 shrink-0" />
              )}
              <span className="min-w-0">
                <span
                  className={cn(
                    "block text-[12px] truncate",
                    row.differs
                      ? "text-text font-ui font-medium"
                      : "text-text-muted",
                  )}
                >
                  {row.item.label}
                </span>
                <span className="block text-[10px] text-text-dim truncate">
                  {row.item.divisionLabel}
                  {row.item.kind === "owner_allowance" &&
                  row.item.ownerAmountAud !== null
                    ? ` · your provisional sum ${formatAud(row.item.ownerAmountAud)}`
                    : ""}
                </span>
              </span>
            </div>
            {row.cells.map((e, j) => (
              <div
                key={j}
                className="px-4 py-2 border-l border-border-subtle/40 flex items-center min-w-0"
              >
                {e ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 text-[11px] font-ui min-w-0",
                      SCHED_META[e.s].cls,
                      row.differs && "font-semibold",
                    )}
                    title={
                      typeof e.c === "string" && e.c.length > 0
                        ? `Builder's comment: ${e.c}`
                        : undefined
                    }
                  >
                    <span
                      className={cn(
                        "size-2 rounded-full shrink-0",
                        SCHED_META[e.s].dot,
                      )}
                    />
                    <span className="truncate">
                      {e.s === "allowance" && typeof e.a === "number"
                        ? formatAud(e.a)
                        : e.s === "documented" && typeof e.p === "number"
                          ? `${formatAud(e.p)} firm`
                          : SCHED_META[e.s].label}
                      {typeof e.c === "string" && e.c.length > 0
                        ? ` · ${e.c}`
                        : ""}
                    </span>
                  </span>
                ) : (
                  <span className="text-[11px] text-text-dim/60">
                    Not marked
                  </span>
                )}
              </div>
            ))}
          </li>
        ))}
      </ul>

      {hiddenCount > 0 ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="w-full py-2.5 text-[11.5px] text-text-muted hover:text-text border-t border-border-subtle/40 transition-colors"
        >
          {tenders.length > 1
            ? `Show the ${hiddenCount} lines the builders agree on`
            : `Show the remaining ${hiddenCount} lines`}
          <ChevronDown className="inline size-3 ml-1" />
        </button>
      ) : showAll && rows.length > 10 ? (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className="w-full py-2.5 text-[11.5px] text-text-muted hover:text-text border-t border-border-subtle/40 transition-colors"
        >
          Collapse to the lines that differ
          <ChevronUp className="inline size-3 ml-1" />
        </button>
      ) : null}
    </div>
  );
}

/* ── 4 · answers, section by section ────────────────────────────────── */

/** Headline numbers already own the top of the page — no repeats. */
const SKIP_QIDS = new Set(["price.total"]);

/** Which question ids a version defines — cached, tiny. */
const VERSION_QIDS = new Map<number, Set<string>>();
function qidsFor(version: number): Set<string> {
  let s = VERSION_QIDS.get(version);
  if (!s) {
    s = new Set(allQuestionsFor(version).map((q) => q.id));
    VERSION_QIDS.set(version, s);
  }
  return s;
}

function AnswerSections({
  tenders,
  summaries,
}: {
  tenders: TenderForOwner[];
  summaries: Summaries;
}) {
  const [diffOnly, setDiffOnly] = useState(tenders.length > 1);

  // Sections follow the newest instrument version as the spine, then
  // fold in any question an OLDER version in the comparison carries
  // that the spine dropped — v3 retired whole questions, and a sealed
  // v2 tender's answers to them must never vanish from a mixed round.
  // The per-row filters below hide anything nobody answered and mask
  // tenders whose version never asked. Scope's matrix has its own
  // block.
  const answerSections = useMemo(() => {
    const versions = [...new Set(tenders.map((t) => t.instrumentVersion ?? 1))];
    const newest = Math.max(1, ...versions);
    const spine = sectionsFor(newest)
      .filter((s) => s.id !== "scope")
      .map((s) => ({ ...s, questions: [...s.questions] }));
    const seen = new Set(spine.flatMap((s) => s.questions.map((q) => q.id)));
    for (const v of versions) {
      if (v === newest) continue;
      for (const s of sectionsFor(v)) {
        if (s.id === "scope") continue;
        const target =
          spine.find((t) => t.id === s.id) ?? spine[spine.length - 1]!;
        for (const q of s.questions) {
          if (seen.has(q.id)) continue;
          seen.add(q.id);
          target.questions.push(q);
        }
      }
    }
    return spine;
  }, [tenders]);

  return (
    <div>
      <div className="px-4 sm:px-6 pt-5 pb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] tracking-[0.16em] uppercase text-text-dim font-ui font-semibold">
            The conditions behind the number
          </p>
          <p className="mt-1 text-[12.5px] text-text-muted max-w-[60ch]">
            Ground risk, insurance, programme, payments, contract terms and
            the team. Answered by the builders themselves, in the same order.
          </p>
        </div>
        {tenders.length > 1 ? (
          <button
            type="button"
            onClick={() => setDiffOnly((d) => !d)}
            className={cn(
              "inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-[11px] transition-colors",
              diffOnly
                ? "border-border-accent bg-[rgba(0,212,200,0.06)] text-text"
                : "border-border-subtle text-text-muted hover:border-border-strong",
            )}
          >
            <SlidersHorizontal className="size-3" />
            Differences only
          </button>
        ) : null}
      </div>

      {answerSections.map((section) => (
        <AnswerSection
          key={section.id}
          section={section}
          tenders={tenders}
          summaries={summaries}
          diffOnly={diffOnly}
        />
      ))}
    </div>
  );
}

function AnswerSection({
  section,
  tenders,
  summaries,
  diffOnly,
}: {
  section: InstrumentSection;
  tenders: TenderForOwner[];
  summaries: Summaries;
  diffOnly: boolean;
}) {
  const rows = useMemo(() => {
    return section.questions
      .filter((q) => !SKIP_QIDS.has(q.id))
      .map((q) => {
        // A question a builder was never asked renders "—", not "Not
        // answered": their version may not define it, its report
        // presence may have excluded it, or a gate answer skipped it.
        // Stale values behind any of those are masked to null so
        // differs and answered bookkeeping match what the owner sees.
        const notAsked = tenders.map((t) => {
          const a = summaries[t.id]!.answers;
          if (!qidsFor(t.instrumentVersion ?? 1).has(q.id)) return true;
          if (
            q.presentWhen &&
            !questionInPlay(q, inPlayContextFromAnswers(a, true))
          ) {
            return true;
          }
          return q.showIf ? !gateAllows(q.showIf, a[q.showIf.qid]) : false;
        });
        const values = tenders.map((t, i) =>
          notAsked[i] ? null : summaries[t.id]!.answers[q.id],
        );
        const anyAnswered = values.some((v) => v !== undefined && v !== null);
        const differs = answersDiffer(q, values);
        return { q, values, notAsked, anyAnswered, differs };
      })
      .filter((r) => r.anyAnswered);
  }, [section, tenders, summaries]);

  const differCount = rows.filter((r) => r.differs).length;
  const [open, setOpen] = useState(differCount > 0);
  const shown = diffOnly && tenders.length > 1
    ? rows.filter((r) => r.differs)
    : rows;
  const identicalHidden = rows.length - shown.length;

  if (rows.length === 0) return null;

  return (
    <div className="border-t border-border-subtle/50">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-[rgba(24,34,44,0.015)] transition-colors"
      >
        <span className="flex items-center gap-3 min-w-0">
          <span className="font-ui font-semibold text-[13px] text-text">
            {section.title}
          </span>
          {tenders.length > 1 ? (
            differCount > 0 ? (
              <span className="text-[10px] font-ui font-semibold px-1.5 py-0.5 rounded-full bg-[rgba(0,212,200,0.10)] text-[#0a7d73] tabular-nums">
                {differCount} differ
              </span>
            ) : (
              <span className="text-[10px] text-text-dim">
                identical answers
              </span>
            )
          ) : null}
        </span>
        {open ? (
          <ChevronUp className="size-3.5 text-text-dim shrink-0" />
        ) : (
          <ChevronDown className="size-3.5 text-text-dim shrink-0" />
        )}
      </button>

      {open ? (
        <div className="pb-2">
          {shown.length === 0 ? (
            <p className="px-4 sm:px-6 pb-3 text-[11.5px] text-text-dim">
              All {rows.length} answers in this section are identical.
            </p>
          ) : (
            <>
              {shown.map(({ q, values, notAsked, differs }) => (
                <AnswerRow
                  key={q.id}
                  question={q}
                  values={values}
                  notAsked={notAsked}
                  differs={differs && tenders.length > 1}
                  cols={tenders.length}
                />
              ))}
              {identicalHidden > 0 ? (
                <p className="px-4 sm:px-6 pt-2 pb-1 text-[11px] text-text-dim">
                  {identicalHidden} identical answer
                  {identicalHidden === 1 ? "" : "s"} hidden.
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function AnswerRow({
  question: q,
  values,
  notAsked,
  differs,
  cols,
}: {
  question: InstrumentQuestion;
  values: unknown[];
  notAsked: boolean[];
  differs: boolean;
  cols: number;
}) {
  return (
    <div
      style={colStyle(cols)}
      className={cn(
        "border-t border-border-subtle/25",
        differs && "bg-[rgba(0,212,200,0.03)]",
      )}
    >
      <div className="px-4 sm:px-6 py-2.5 flex items-start gap-2 min-w-0">
        {differs ? (
          <span className="mt-[5px] size-1.5 rounded-full bg-accent shrink-0" />
        ) : (
          <span className="mt-[5px] size-1.5 shrink-0" />
        )}
        <span
          className={cn(
            "text-[11.5px] leading-[1.5]",
            differs ? "text-text font-ui font-medium" : "text-text-muted",
          )}
        >
          {q.prompt}
        </span>
      </div>
      {values.map((v, i) => (
        <div
          key={i}
          className="px-4 py-2.5 border-l border-border-subtle/40 min-w-0"
        >
          {notAsked[i] ? (
            <span
              className="text-[12px] text-text-dim/50"
              title="Not applicable given this builder's other answers"
            >
              —
            </span>
          ) : (
            <AnswerCell question={q} value={v} emphasis={differs} />
          )}
        </div>
      ))}
    </div>
  );
}

function AnswerCell({
  question: q,
  value,
  emphasis,
}: {
  question: InstrumentQuestion;
  value: unknown;
  emphasis: boolean;
}) {
  if (value === undefined || value === null) {
    return <span className="text-[11.5px] text-text-dim/60">Not answered</span>;
  }

  if (q.type === "items" && Array.isArray(value)) {
    const fields = q.itemFields ?? [];
    if (value.length === 0) {
      return <span className="text-[11.5px] text-text-dim/60">None listed</span>;
    }
    return (
      <ul className="space-y-1">
        {(value as Record<string, unknown>[]).map((row, i) => (
          <li
            key={i}
            className="flex items-baseline justify-between gap-2 text-[11.5px]"
          >
            <span className="text-text-muted truncate">
              {typeof row[fields[0]?.key ?? ""] === "string"
                ? (row[fields[0]!.key] as string)
                : `Item ${i + 1}`}
            </span>
            <span className="text-text tabular-nums shrink-0">
              {(() => {
                const f = fields[1];
                if (!f) return null;
                const n = row[f.key];
                if (typeof n !== "number") return null;
                return f.type === "percent" ? `${n}%` : formatAud(n);
              })()}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  if (q.type === "bool") {
    return value === true ? (
      <span className="inline-flex items-center gap-1.5 text-[12px] text-[#0a7d73] font-ui">
        <Check className="size-3" strokeWidth={3} />
        Yes
      </span>
    ) : (
      <span className="text-[12px] text-text-muted font-ui">No</span>
    );
  }

  const label = formatAnswer(q, value);
  if (label === null) {
    return <span className="text-[11.5px] text-text-dim/60">Not answered</span>;
  }
  return (
    <span
      className={cn(
        "text-[12px] leading-[1.5] break-words",
        emphasis ? "text-text font-ui font-medium" : "text-text-muted",
      )}
    >
      {label}
    </span>
  );
}

/* ── degraded state (no instrument data at all) ─────────────────────── */

export function InstrumentComparePlaceholder({
  count,
}: {
  count: number;
}) {
  return (
    <section className="rounded-lg border border-border-subtle bg-[rgba(24,34,44,0.02)] px-5 py-6 flex items-start gap-3">
      <AlertTriangle className="size-4 text-text-dim shrink-0 mt-0.5" />
      <p className="text-[12.5px] leading-[1.6] text-text-dim">
        {count === 1
          ? "This tender was submitted before the structured submission standard, so the like-for-like comparison is not available for it."
          : "These tenders were submitted before the structured submission standard, so the like-for-like comparison is not available."}{" "}
        The sections below still compare their headline numbers, cost
        breakdowns and documents.
      </p>
    </section>
  );
}
