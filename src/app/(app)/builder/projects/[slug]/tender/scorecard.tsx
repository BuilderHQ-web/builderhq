"use client";

/**
 * The builder's scorecard — the evaluation, on the builder's side of
 * the table.
 *
 * The client's comparison scores every tender under one fixed,
 * published rubric. This shows the builder their own read under that
 * exact rubric BEFORE they seal (and after), with every point earned,
 * every point still on the table, and the questions the client will
 * be coached to ask. Nothing here is relative to rivals; it is the
 * builder's own working, and every lever it exposes is a genuine
 * improvement to the tender: disclose more, commit to stronger terms.
 */

import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  Gauge,
  MessageCircleQuestion,
} from "lucide-react";

import {
  evaluateTender,
  DIMENSION_WEIGHTS,
  type EvaluationInput,
  type TenderEvaluation,
  type ReceiptLine,
} from "@/modules/tenders/evaluation";
import type { TenderSchedule } from "@/modules/tenders/schedule";
import { cn } from "@/lib/utils";

export function useSelfEvaluation(args: {
  answers: Record<string, unknown>;
  schedule: TenderSchedule | null;
  documentCount: number;
  companyName: string | null;
  projectState: string | null;
  instrumentVersion?: number | null;
}): TenderEvaluation {
  const {
    answers,
    schedule,
    documentCount,
    companyName,
    projectState,
    instrumentVersion,
  } = args;
  return useMemo(() => {
    const input: EvaluationInput = {
      tenderId: "self",
      builderName: companyName ?? "Your tender",
      status: "draft",
      submittedAt: null,
      totalPriceAud: null,
      documentCount,
      answers,
      projectState,
      instrumentVersion,
    };
    return evaluateTender(input, schedule);
  }, [
    answers,
    schedule,
    documentCount,
    companyName,
    projectState,
    instrumentVersion,
  ]);
}

export function BuilderScorecard({
  ev,
  mode,
  onJump,
}: {
  ev: TenderEvaluation;
  mode: "draft" | "sealed";
  /**
   * Draft deck only: jump straight to the answer a ledger line reads
   * from. Lines carrying an anchor render as buttons when present.
   */
  onJump?: (qid: string) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-1 card-elev overflow-hidden">
      <div className="px-4.5 py-4 flex items-start justify-between gap-4 border-b border-border-subtle/60">
        <div className="min-w-0">
          <p className="text-[10px] tracking-[0.2em] uppercase text-accent-light font-ui font-semibold inline-flex items-center gap-1.5">
            <Gauge className="size-3.5" />
            How your tender reads
          </p>
          <p className="mt-1.5 text-[12px] leading-[1.6] text-text-muted max-w-[52ch]">
            {mode === "draft"
              ? "This is the same scoring the client sees, run on your answers before you submit. Open a row to see every point: what you have been awarded, and what you can still earn by changing an answer."
              : "The same scoring the client sees, run on your submitted answers."}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-display text-[34px] leading-none text-text tabular-nums">
            {ev.overall}
          </p>
          <p className="mt-1 text-[9.5px] tracking-[0.14em] uppercase text-text-dim font-ui font-semibold">
            Weighted overall
          </p>
        </div>
      </div>

      <div className="px-4.5 py-3 divide-y divide-border-subtle/50">
        {ev.dimensions.map((d) => {
          const isOpen = open === d.key;
          const gains = d.receipts.filter(
            (r) =>
              r.kind === "base" ||
              r.kind === "note" ||
              (r.kind === "delta" && (r.value ?? 0) > 0),
          );
          const onTable = d.receipts.filter(
            (r) =>
              r.kind === "miss" ||
              r.kind === "clamp" ||
              (r.kind === "delta" && (r.value ?? 0) < 0),
          );
          return (
            <div key={d.key} className="py-2 first:pt-0 last:pb-0">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : d.key)}
                aria-expanded={isOpen}
                className="w-full text-left"
              >
                <span className="flex items-center gap-3">
                  <span className="w-[150px] shrink-0 text-[11.5px] font-ui text-text-muted truncate">
                    {d.label}
                    <span className="text-text-dim">
                      {" "}
                      · {DIMENSION_WEIGHTS[d.key]}%
                    </span>
                  </span>
                  <span
                    className="flex-1 block h-[4px] overflow-hidden rounded-full"
                    style={{ background: "rgba(24,34,44,0.07)" }}
                  >
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${d.score}%`,
                        background:
                          d.score >= 70
                            ? "linear-gradient(90deg, #14343c, #0a7d73)"
                            : "rgba(24,34,44,0.4)",
                      }}
                    />
                  </span>
                  <span className="w-7 shrink-0 text-right font-display text-[14px] tabular-nums text-text">
                    {d.score}
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-3.5 text-text-dim shrink-0 transition-transform",
                      isOpen && "rotate-180",
                    )}
                  />
                </span>
              </button>
              {isOpen ? (
                <div className="mt-2 mb-1 rounded-md bg-[rgba(24,34,44,0.025)] px-3 py-2.5">
                  <div>
                    {gains.length > 0 ? (
                      <p className="mb-1 text-[9.5px] tracking-[0.16em] uppercase text-[#0a7d73] font-ui font-semibold">
                        Points awarded
                      </p>
                    ) : null}
                    {gains.map((r, i) => (
                      <ScoreLine key={`g-${i}`} r={r} />
                    ))}
                    {onTable.length > 0 ? (
                      <>
                        <p className="mt-2 mb-1 text-[9.5px] tracking-[0.16em] uppercase text-[#8a6414] font-ui font-semibold">
                          Points not awarded
                        </p>
                        {mode === "draft" ? (
                          <p className="mb-1 text-[10.5px] leading-[1.5] text-text-dim">
                            {onJump
                              ? "Each line says what earns the points. Select one to go straight to that answer."
                              : "Each line says what earns the points. Change that answer and they are yours."}
                          </p>
                        ) : null}
                      </>
                    ) : null}
                    {onTable.map((r, i) => (
                      <ScoreLine key={`m-${i}`} r={r} onJump={onJump} />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {ev.flags.length > 0 ? (
        <div className="px-4.5 py-3.5 border-t border-border-subtle/60 bg-[rgba(24,34,44,0.015)]">
          <p className="text-[10px] tracking-[0.16em] uppercase text-text-dim font-ui font-semibold inline-flex items-center gap-1.5">
            <MessageCircleQuestion className="size-3.5" />
            What the client will be asked about this tender
          </p>
          <ul className="mt-2 space-y-1.5">
            {ev.flags.slice(0, 6).map((f) => (
              <li key={f.id} className="text-[12px] leading-[1.55]">
                <span
                  className={cn(
                    "font-ui font-medium",
                    f.severity === "high" ? "text-[#a8433e]" : "text-text",
                  )}
                >
                  {f.label}.
                </span>{" "}
                {f.ask ? (
                  <span className="text-text-muted">
                    They will be advised: {f.ask.toLowerCase().startsWith("ask") ? f.ask.replace(/^Ask /, "ask ") : f.ask}
                  </span>
                ) : (
                  <span className="text-text-dim">{f.detail}</span>
                )}
              </li>
            ))}
          </ul>
          {mode === "draft" ? (
            <p className="mt-2 text-[11px] text-text-dim">
              Each of these clears by changing the answer it reads from.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * One sign convention everywhere: awarded points are +, points not
 * awarded are −, whether they were deducted by an answer (red) or
 * simply not earned yet (amber). The colour tells the two apart; the
 * sign never contradicts the group heading.
 */
function ScoreLine({
  r,
  onJump,
}: {
  r: ReceiptLine;
  onJump?: (qid: string) => void;
}) {
  const points = (
    <span
      className={cn(
        "w-8 shrink-0 text-right font-mono text-[10.5px] tabular-nums",
        r.kind === "note" && "text-text-dim",
        r.kind === "base" && "font-semibold text-[#0a7d73]",
        r.kind === "delta" &&
          ((r.value ?? 0) > 0
            ? "font-medium text-[#0a7d73]"
            : "font-medium text-[#a8433e]"),
        r.kind === "miss" && "text-[#8a6414]",
        r.kind === "clamp" && "text-text-dim",
      )}
    >
      {r.kind === "miss"
        ? `−${r.potential ?? 0}`
        : r.value === null
          ? "·"
          : r.value > 0
            ? `+${r.value}`
            : r.value === 0
              ? "0"
              : `−${Math.abs(r.value)}`}
    </span>
  );
  const labelTone =
    r.kind === "note" || r.kind === "miss" ? "text-text-dim" : "text-text-muted";

  // A line that knows its question is a door, not a caption: the whole
  // row is the control, and the arrow only surfaces on hover so the
  // ledger keeps reading as a ledger.
  if (onJump && r.qid) {
    const qid = r.qid;
    return (
      <button
        type="button"
        onClick={() => onJump(qid)}
        className="group w-full flex items-baseline gap-2.5 py-[2.5px] -mx-1.5 px-1.5 rounded-[5px] text-left hover:bg-[rgba(0,212,200,0.07)] transition-colors"
      >
        {points}
        <span
          className={cn(
            "text-[11.5px] leading-[1.45] group-hover:text-text transition-colors",
            labelTone,
          )}
        >
          {r.label}
          <ArrowUpRight
            className="inline-block size-3 ml-1 align-[-1px] text-accent-deep opacity-0 group-hover:opacity-100 transition-opacity"
            aria-hidden
          />
        </span>
      </button>
    );
  }

  return (
    <div className="flex items-baseline gap-2.5 py-[2.5px]">
      {points}
      <span className={cn("text-[11.5px] leading-[1.45]", labelTone)}>
        {r.label}
      </span>
    </div>
  );
}
