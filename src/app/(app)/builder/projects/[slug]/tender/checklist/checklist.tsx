"use client";

/**
 * The Submission Checklist — the client wizard for the structured
 * tender instrument (instrument.ts). One section on screen at a time,
 * a rail that shows exactly where you are, and autosave on every
 * answer, so a builder who knows their quote moves through it in
 * about ten minutes.
 *
 * Rendering is driven entirely by the instrument data: each question
 * type has one renderer, showIf gates hide dependants until their
 * gate matches, and prefilled questions arrive already answered from
 * the tender's headline fields (confirm, not retype).
 *
 * Progress here is stricter than the server gate on purpose: the
 * client counts a matrix answered only when every row is marked and a
 * text only when non-empty, so the UI never claims "complete" for a
 * submission the server would refuse.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardCheck,
  Loader2,
  Plus,
  ShieldCheck,
  X,
} from "lucide-react";

import {
  INSTRUMENT_SECTIONS,
  SCOPE_STATES,
  scopeMatrixRows,
  isAnswerComplete,
  type InstrumentQuestion,
  type InstrumentSection,
} from "@/modules/tenders/instrument";
import { saveTenderResponsesAction } from "@/app/(app)/_actions/tenders";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";

type Answers = Record<string, unknown>;
type SaveState = "idle" | "saving" | "saved" | "error";

/** Plain value, or an updater applied to the latest saved answer. */
type AnswerPatch = unknown | ((prev: unknown) => unknown);

const MATRIX_ROWS = scopeMatrixRows();

// Answer completeness is shared with the server (isAnswerComplete in
// instrument.ts) so the progress ring here and the submit gate there
// can never disagree.

function gatePasses(q: InstrumentQuestion, answers: Answers): boolean {
  if (!q.showIf) return true;
  return answers[q.showIf.qid] === q.showIf.equals;
}

/* ── component ──────────────────────────────────────────────────────── */

export function ChecklistWizard({
  slug,
  projectTitle,
  tenderId,
  initialAnswers,
  prefills,
}: {
  slug: string;
  projectTitle: string;
  tenderId: string;
  initialAnswers: Array<{ qid: string; v: unknown }>;
  prefills: {
    "tender.totalPriceAud": number | null;
    "tender.durationWeeks": number | null;
    "tender.validityDays": number | null;
    "tender.proposedStartMonth": string | null;
  };
}) {
  const router = useRouter();

  const [answers, setAnswers] = useState<Answers>(() =>
    Object.fromEntries(initialAnswers.map((a) => [a.qid, a.v])),
  );
  // Live mirror of `answers` so same-tick updates (e.g. tapping several
  // matrix rows quickly) compose instead of clobbering each other via
  // stale render props.
  const liveAnswers = useRef<Answers>(
    Object.fromEntries(initialAnswers.map((a) => [a.qid, a.v])),
  );
  const [sectionIdx, setSectionIdx] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  // ── autosave pipeline ────────────────────────────────────────────
  const pending = useRef<Map<string, unknown>>(new Map());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef(false);

  const flush = useCallback(async () => {
    if (inflight.current || pending.current.size === 0) return;
    const entries = Array.from(pending.current, ([qid, value]) => ({
      qid,
      value,
    }));
    pending.current = new Map();
    inflight.current = true;
    setSaveState("saving");
    try {
      const r = await saveTenderResponsesAction(tenderId, entries);
      if (!r.ok) {
        // Transient failures (network, DB) retry on the next change.
        // Validation failures are deterministic — requeueing them would
        // poison every later batch into an endless retry loop, so the
        // batch is dropped; values stay in local state and re-queue the
        // next time their field is edited.
        if (r.error.code !== "validation") {
          for (const e of entries) {
            if (!pending.current.has(e.qid)) pending.current.set(e.qid, e.value);
          }
        }
        setSaveState("error");
        toast.error("Couldn't save", r.error.message);
        return;
      }
      setSaveState("saved");
    } finally {
      inflight.current = false;
      if (pending.current.size > 0) {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(flush, 700);
      }
    }
  }, [tenderId]);

  const queue = useCallback(
    (qid: string, patch: AnswerPatch) => {
      const next =
        typeof patch === "function"
          ? (patch as (prev: unknown) => unknown)(liveAnswers.current[qid])
          : patch;
      liveAnswers.current = { ...liveAnswers.current, [qid]: next };
      setAnswers(liveAnswers.current);
      pending.current.set(qid, next);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 700);
    },
    [flush],
  );

  useEffect(() => {
    const onBeforeUnload = () => {
      if (pending.current.size > 0) flush();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [flush]);

  // ── prefill (confirm, not retype) ────────────────────────────────
  const prefilledRef = useRef(false);
  useEffect(() => {
    if (prefilledRef.current) return;
    prefilledRef.current = true;
    for (const section of INSTRUMENT_SECTIONS) {
      for (const q of section.questions) {
        if (!q.prefill) continue;
        if (answers[q.id] !== undefined) continue;
        const seed = prefills[q.prefill];
        if (seed === null || seed === undefined) continue;
        queue(q.id, seed);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── progress ─────────────────────────────────────────────────────
  const progress = useMemo(() => {
    const perSection = INSTRUMENT_SECTIONS.map((s) => {
      const visible = s.questions.filter((q) => gatePasses(q, answers));
      const required = visible.filter((q) => q.required);
      const answered = required.filter((q) => isAnswerComplete(q, answers[q.id]));
      return {
        id: s.id,
        required: required.length,
        answered: answered.length,
        complete: answered.length >= required.length,
      };
    });
    const required = perSection.reduce((n, s) => n + s.required, 0);
    const answered = perSection.reduce((n, s) => n + s.answered, 0);
    return {
      perSection,
      required,
      answered,
      complete: answered >= required,
      pct: required === 0 ? 100 : Math.round((answered / required) * 100),
    };
  }, [answers]);

  const section = INSTRUMENT_SECTIONS[sectionIdx]!;
  const isLast = sectionIdx === INSTRUMENT_SECTIONS.length - 1;

  const goSection = useCallback((idx: number) => {
    setSectionIdx(Math.max(0, Math.min(INSTRUMENT_SECTIONS.length - 1, idx)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="pb-24">
      {/* ── header ──────────────────────────────────────────────── */}
      <div className="border-b border-border-subtle bg-bg-deep/30">
        <div className="px-4 sm:px-6 lg:px-10 py-5 sm:py-6 mx-auto max-w-[1200px]">
          <Link
            href={`/builder/projects/${slug}/tender`}
            className="inline-flex items-center gap-1.5 text-[12px] text-text-dim hover:text-text transition-colors mb-4"
          >
            <ArrowLeft className="size-3.5" />
            Back to your tender
          </Link>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <span className="text-[10px] tracking-[0.22em] uppercase text-accent font-ui font-medium inline-flex items-center gap-2">
                <ShieldCheck className="size-3.5" />
                BuilderHQ Submission Standard
              </span>
              <h1 className="mt-2 font-display uppercase tracking-[-0.018em] text-[26px] sm:text-[36px] leading-[0.95] text-text">
                Submission checklist
              </h1>
              <p className="mt-2 text-[13px] leading-[1.6] text-text-muted max-w-[560px]">
                Every builder answers the same set, so your tender for{" "}
                <span className="text-text">{projectTitle}</span> is compared
                like for like on scope, not just the headline number. About ten
                minutes. Saves as you go.
              </p>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <SaveWhisper state={saveState} />
              <div className="text-right">
                <p className="font-display text-[24px] leading-none text-text tabular-nums">
                  {progress.answered}
                  <span className="text-text-dim text-[15px]">
                    /{progress.required}
                  </span>
                </p>
                <p className="mt-1 text-[10px] tracking-[0.14em] uppercase text-text-dim">
                  Required answered
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* overall progress bar */}
        <div className="h-[3px] bg-border-subtle/50">
          <div
            className="h-full bg-accent transition-[width] duration-300"
            style={{ width: `${progress.pct}%` }}
          />
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 mx-auto max-w-[1200px] grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-6 lg:gap-10">
        {/* ── section rail ─────────────────────────────────────────── */}
        <nav className="lg:sticky lg:top-20 self-start">
          {/* mobile: horizontal chips */}
          <div className="flex lg:hidden gap-2 overflow-x-auto pb-2 -mx-4 px-4">
            {INSTRUMENT_SECTIONS.map((s, i) => {
              const p = progress.perSection[i]!;
              const active = i === sectionIdx;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => goSection(i)}
                  className={cn(
                    "shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border text-[12px] transition-colors",
                    active
                      ? "border-border-accent bg-[rgba(0,212,200,0.06)] text-text"
                      : "border-border-subtle text-text-muted",
                  )}
                >
                  {p.complete ? (
                    <Check className="size-3 text-accent-light" />
                  ) : null}
                  {s.title}
                </button>
              );
            })}
          </div>

          {/* desktop: vertical list */}
          <ol className="hidden lg:block space-y-1">
            {INSTRUMENT_SECTIONS.map((s, i) => {
              const p = progress.perSection[i]!;
              const active = i === sectionIdx;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => goSection(i)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors",
                      active
                        ? "bg-[rgba(0,212,200,0.06)] border border-border-accent/60"
                        : "border border-transparent hover:bg-surface-1",
                    )}
                  >
                    <span
                      className={cn(
                        "size-[22px] rounded-full border flex items-center justify-center text-[10.5px] font-ui font-semibold shrink-0 transition-colors",
                        p.complete
                          ? "bg-accent-light text-navy border-accent-light"
                          : active
                            ? "border-border-accent text-accent-light"
                            : "border-border-subtle text-text-dim",
                      )}
                    >
                      {p.complete ? (
                        <Check className="size-3" strokeWidth={3} />
                      ) : (
                        i + 1
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block text-[12.5px] font-ui truncate",
                          active
                            ? "text-text font-semibold"
                            : "text-text-muted",
                        )}
                      >
                        {s.title}
                      </span>
                    </span>
                    {!p.complete && p.required > 0 ? (
                      <span className="text-[10.5px] text-text-dim tabular-nums shrink-0">
                        {p.answered}/{p.required}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ol>

          <p className="hidden lg:flex items-center gap-1.5 mt-4 px-3 text-[10px] tracking-[0.14em] uppercase text-text-dim">
            <ClipboardCheck className="size-3" />
            Instrument v1
          </p>
        </nav>

        {/* ── section panel ────────────────────────────────────────── */}
        <div className="min-w-0">
          {progress.complete ? (
            <div className="mb-5 rounded-md border border-border-accent/60 bg-[rgba(0,212,200,0.05)] px-4 sm:px-5 py-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="size-9 rounded-full bg-accent-light text-navy flex items-center justify-center shrink-0">
                  <Check className="size-4" strokeWidth={3} />
                </span>
                <div>
                  <p className="font-ui font-semibold text-[13.5px] text-text">
                    Checklist complete
                  </p>
                  <p className="text-[12px] text-text-muted">
                    Every required answer is in. Review anything below, or head
                    back and submit.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => router.push(`/builder/projects/${slug}/tender`)}
                className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-accent text-accent-contrast font-ui font-semibold text-[12.5px] hover:bg-accent-hover transition-colors"
              >
                Back to your tender
                <ArrowRight className="size-3.5" />
              </button>
            </div>
          ) : null}

          <SectionPanel
            key={section.id}
            section={section}
            index={sectionIdx}
            answers={answers}
            onAnswer={queue}
          />

          {/* section nav */}
          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => goSection(sectionIdx - 1)}
              disabled={sectionIdx === 0}
              className={cn(
                "inline-flex items-center gap-1.5 h-11 px-5 rounded-full border text-[12.5px] tracking-[0.02em] transition-colors",
                sectionIdx === 0
                  ? "opacity-40 cursor-not-allowed border-border-subtle text-text-dim"
                  : "border-border-strong text-text hover:bg-surface-1",
              )}
            >
              <ArrowLeft className="size-3.5" />
              {sectionIdx === 0
                ? "Back"
                : INSTRUMENT_SECTIONS[sectionIdx - 1]!.title}
            </button>

            {isLast ? (
              <button
                type="button"
                onClick={() => {
                  flush();
                  router.push(`/builder/projects/${slug}/tender`);
                }}
                className="inline-flex items-center gap-1.5 h-11 px-6 rounded-full bg-accent text-accent-contrast font-ui font-semibold text-[13px] hover:bg-accent-hover transition-colors"
              >
                Finish
                <Check className="size-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => goSection(sectionIdx + 1)}
                className="inline-flex items-center gap-1.5 h-11 px-6 rounded-full bg-accent text-accent-contrast font-ui font-semibold text-[13px] hover:bg-accent-hover transition-colors"
              >
                {INSTRUMENT_SECTIONS[sectionIdx + 1]!.title}
                <ArrowRight className="size-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── section panel ──────────────────────────────────────────────────── */

function SectionPanel({
  section,
  index,
  answers,
  onAnswer,
}: {
  section: InstrumentSection;
  index: number;
  answers: Answers;
  onAnswer: (qid: string, value: AnswerPatch) => void;
}) {
  const visible = section.questions.filter((q) => gatePasses(q, answers));

  return (
    <section className="rounded-md border border-border-subtle bg-surface-1 card-elev overflow-hidden shadow-[0_18px_44px_-22px_rgba(15,23,32,0.19)]">
      <header className="px-4 sm:px-6 py-5 border-b border-border-subtle/60">
        <span className="text-[10px] tracking-[0.18em] uppercase text-text-dim font-ui">
          Section {index + 1} of {INSTRUMENT_SECTIONS.length}
        </span>
        <h2 className="mt-1 font-display uppercase tracking-[-0.014em] text-[20px] sm:text-[24px] leading-[1] text-text">
          {section.title}
        </h2>
        <p className="mt-1.5 text-[12.5px] leading-[1.6] text-text-muted">
          {section.intro}
        </p>
      </header>

      <div className="divide-y divide-border-subtle/50">
        {visible.map((q) => (
          <QuestionRow
            key={q.id}
            question={q}
            value={answers[q.id]}
            onAnswer={onAnswer}
          />
        ))}
      </div>
    </section>
  );
}

/* ── one question ───────────────────────────────────────────────────── */

function QuestionRow({
  question: q,
  value,
  onAnswer,
}: {
  question: InstrumentQuestion;
  value: unknown;
  onAnswer: (qid: string, value: AnswerPatch) => void;
}) {
  const done = isAnswerComplete(q, value);

  return (
    <div className="px-4 sm:px-6 py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13.5px] leading-[1.5] font-ui font-medium text-text">
            {q.prompt}
            {!q.required ? (
              <span className="ml-2 align-middle text-[9.5px] tracking-[0.12em] uppercase text-text-dim border border-border-subtle rounded-full px-1.5 py-0.5">
                Optional
              </span>
            ) : null}
          </p>
          {q.help ? (
            <p className="mt-1 text-[11.5px] leading-[1.55] text-text-dim">
              {q.help}
            </p>
          ) : null}
        </div>
        {done && q.required ? (
          <Check className="size-4 text-accent-light shrink-0 mt-0.5" />
        ) : null}
      </div>

      <div className="mt-3">
        <AnswerControl question={q} value={value} onAnswer={onAnswer} />
      </div>
    </div>
  );
}

function AnswerControl({
  question: q,
  value,
  onAnswer,
}: {
  question: InstrumentQuestion;
  value: unknown;
  onAnswer: (qid: string, value: AnswerPatch) => void;
}) {
  switch (q.type) {
    case "bool":
      return (
        <div className="flex gap-2">
          {[
            { v: true, label: "Yes" },
            { v: false, label: "No" },
          ].map((o) => (
            <Pill
              key={o.label}
              active={value === o.v}
              onClick={() => onAnswer(q.id, o.v)}
            >
              {o.label}
            </Pill>
          ))}
        </div>
      );

    case "select":
      return (
        <div className="flex flex-wrap gap-2">
          {(q.options ?? []).map((o) => (
            <Pill
              key={o.value}
              active={value === o.value}
              onClick={() => onAnswer(q.id, o.value)}
            >
              {o.label}
            </Pill>
          ))}
        </div>
      );

    case "multi": {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="flex flex-wrap gap-2">
          {(q.options ?? []).map((o) => (
            <Pill
              key={o.value}
              active={arr.includes(o.value)}
              onClick={() =>
                onAnswer(q.id, (prev: unknown) => {
                  const cur = Array.isArray(prev) ? (prev as string[]) : [];
                  return cur.includes(o.value)
                    ? cur.filter((v) => v !== o.value)
                    : [...cur, o.value];
                })
              }
            >
              {o.label}
            </Pill>
          ))}
        </div>
      );
    }

    case "currency":
      return (
        <CurrencyBox
          value={typeof value === "number" ? value : null}
          onChange={(v) => onAnswer(q.id, v)}
        />
      );

    case "number":
    case "percent":
      return (
        <NumberBox
          value={typeof value === "number" ? value : null}
          unit={q.type === "percent" ? "%" : q.unit}
          max={q.type === "percent" ? 100 : undefined}
          onChange={(v) => onAnswer(q.id, v)}
        />
      );

    case "month":
      return (
        <input
          type="month"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onAnswer(q.id, e.target.value || null)}
          className="h-11 px-3.5 rounded-md border border-border-subtle bg-[rgba(24,34,44,0.035)] text-[13.5px] text-text focus:outline-none focus:border-border-accent transition-colors w-[200px]"
        />
      );

    case "text":
      return (
        <textarea
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onAnswer(q.id, e.target.value)}
          rows={2}
          maxLength={2000}
          placeholder="Optional"
          className="w-full px-3.5 py-2.5 rounded-md border border-border-subtle bg-[rgba(24,34,44,0.035)] text-[13px] leading-[1.55] text-text placeholder:text-text-dim/60 focus:outline-none focus:border-border-accent transition-colors resize-y"
        />
      );

    case "items":
      return (
        <ItemsEditor
          question={q}
          value={Array.isArray(value) ? (value as Record<string, unknown>[]) : []}
          onChange={(update) =>
            onAnswer(q.id, (prev: unknown) =>
              update(Array.isArray(prev) ? (prev as Record<string, unknown>[]) : []),
            )
          }
        />
      );

    case "matrix":
      return (
        <ScopeMatrix
          value={(value ?? {}) as Record<string, string>}
          onMark={(rowId, state) =>
            onAnswer(q.id, (prev: unknown) => ({
              ...((prev ?? {}) as Record<string, string>),
              [rowId]: state,
            }))
          }
        />
      );
  }
}

/* ── controls ───────────────────────────────────────────────────────── */

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-10 px-4 rounded-full border text-[12.5px] font-ui transition-colors",
        active
          ? "border-border-accent bg-[rgba(0,212,200,0.08)] text-text font-semibold"
          : "border-border-subtle bg-[rgba(24,34,44,0.02)] text-text-muted hover:border-border-strong",
      )}
    >
      {children}
    </button>
  );
}

function CurrencyBox({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const display = value === null ? "" : value.toLocaleString("en-AU");
  return (
    <div className="flex items-center rounded-md border border-border-subtle bg-[rgba(24,34,44,0.035)] h-11 w-full max-w-[260px] focus-within:border-border-accent focus-within:bg-[rgba(0,212,200,0.025)] transition-colors">
      <span className="px-3 text-text-dim font-mono text-[13px]">$</span>
      <input
        type="text"
        inputMode="numeric"
        value={display}
        onChange={(e) => {
          const cleaned = e.target.value.replace(/[^\d]/g, "");
          onChange(cleaned === "" ? null : Number(cleaned));
        }}
        placeholder="0"
        className="flex-1 min-w-0 bg-transparent border-0 outline-none focus-visible:shadow-none text-text font-display text-[14px] tabular-nums pr-3"
      />
      <span className="px-3 text-[10px] tracking-[0.16em] uppercase text-text-dim shrink-0">
        ex GST
      </span>
    </div>
  );
}

function NumberBox({
  value,
  unit,
  max,
  onChange,
}: {
  value: number | null;
  unit?: string;
  max?: number;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="flex items-center rounded-md border border-border-subtle bg-[rgba(24,34,44,0.035)] h-11 w-[180px] focus-within:border-border-accent focus-within:bg-[rgba(0,212,200,0.025)] transition-colors">
      <input
        type="number"
        inputMode="numeric"
        value={value ?? ""}
        min={0}
        max={max}
        onChange={(e) => {
          const raw = e.target.value === "" ? null : Number(e.target.value);
          // min/max attributes don't stop typed values — clamp before
          // emitting so the save path never sees an out-of-range number.
          const v =
            raw !== null && Number.isFinite(raw)
              ? Math.min(max ?? Infinity, Math.max(0, raw))
              : null;
          onChange(v);
        }}
        placeholder="0"
        className="flex-1 min-w-0 px-3.5 bg-transparent border-0 outline-none focus-visible:shadow-none text-text font-display text-[14px] tabular-nums"
      />
      {unit ? (
        <span className="px-3 text-[10px] tracking-[0.16em] uppercase text-text-dim shrink-0">
          {unit}
        </span>
      ) : null}
    </div>
  );
}

/* ── items (repeating rows) ─────────────────────────────────────────── */

function ItemsEditor({
  question: q,
  value,
  onChange,
}: {
  question: InstrumentQuestion;
  value: Record<string, unknown>[];
  /** Functional update against the latest saved rows. */
  onChange: (
    update: (rows: Record<string, unknown>[]) => Record<string, unknown>[],
  ) => void;
}) {
  const fields = q.itemFields ?? [];

  const setCell = (rowIdx: number, key: string, v: unknown) => {
    onChange((rows) =>
      rows.map((row, i) => (i === rowIdx ? { ...row, [key]: v } : row)),
    );
  };

  return (
    <div className="space-y-2">
      {value.map((row, i) => (
        <div
          key={i}
          className="flex flex-wrap sm:flex-nowrap items-center gap-2 rounded-md border border-border-subtle bg-[rgba(24,34,44,0.02)] p-2.5"
        >
          {fields.map((f) => {
            if (f.type === "text") {
              return (
                <input
                  key={f.key}
                  type="text"
                  value={typeof row[f.key] === "string" ? (row[f.key] as string) : ""}
                  onChange={(e) => setCell(i, f.key, e.target.value)}
                  maxLength={500}
                  placeholder={f.label}
                  className="flex-1 min-w-[160px] h-10 px-3 rounded-md border border-border-subtle bg-surface-1 text-[12.5px] text-text placeholder:text-text-dim/60 focus:outline-none focus:border-border-accent transition-colors"
                />
              );
            }
            const num = typeof row[f.key] === "number" ? (row[f.key] as number) : null;
            return (
              <div
                key={f.key}
                className="flex items-center h-10 rounded-md border border-border-subtle bg-surface-1 focus-within:border-border-accent transition-colors shrink-0"
              >
                <span className="pl-2.5 text-[11px] text-text-dim font-mono">
                  {f.type === "currency" ? "$" : ""}
                </span>
                <input
                  type="text"
                  inputMode={f.type === "percent" ? "decimal" : "numeric"}
                  value={
                    num === null
                      ? ""
                      : f.type === "percent"
                        ? String(num)
                        : num.toLocaleString("en-AU")
                  }
                  onChange={(e) => {
                    if (f.type === "percent") {
                      // Stage shares are legitimately decimal ("12.5").
                      // Stripping the point would silently turn 12.5
                      // into 125, so parse it properly and clamp.
                      const cleaned = e.target.value.replace(/[^\d.]/g, "");
                      const n = cleaned === "" ? null : Number(cleaned);
                      setCell(
                        i,
                        f.key,
                        n !== null && Number.isFinite(n)
                          ? Math.min(100, Math.max(0, n))
                          : null,
                      );
                      return;
                    }
                    const cleaned = e.target.value.replace(/[^\d]/g, "");
                    setCell(i, f.key, cleaned === "" ? null : Number(cleaned));
                  }}
                  placeholder="0"
                  title={f.label}
                  className={cn(
                    "bg-transparent border-0 outline-none focus-visible:shadow-none text-text text-[12.5px] tabular-nums px-1.5",
                    f.type === "currency" ? "w-[110px]" : "w-[64px]",
                  )}
                />
                {f.type === "percent" ? (
                  <span className="pr-2.5 text-[11px] text-text-dim">%</span>
                ) : null}
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => onChange((rows) => rows.filter((_, j) => j !== i))}
            title="Remove row"
            className="size-9 rounded-md border border-border-subtle text-text-dim hover:text-danger hover:border-[rgba(255,80,80,0.45)] transition-colors flex items-center justify-center shrink-0 ml-auto"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() =>
          onChange((rows) => [
            ...rows,
            Object.fromEntries(fields.map((f) => [f.key, f.type === "text" ? "" : null])),
          ])
        }
        className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-border-strong text-[12px] text-text hover:bg-surface-1 transition-colors"
      >
        <Plus className="size-3.5" />
        Add {value.length === 0 ? "the first one" : "another"}
      </button>
    </div>
  );
}

/* ── scope matrix ───────────────────────────────────────────────────── */

function ScopeMatrix({
  value,
  onMark,
}: {
  value: Record<string, string>;
  onMark: (rowId: string, state: string) => void;
}) {
  const marked = MATRIX_ROWS.filter((r) => !!value[r.id]).length;

  return (
    <div>
      {/* legend */}
      <div className="rounded-md border border-border-subtle/70 bg-[rgba(24,34,44,0.025)] px-3.5 py-3 mb-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
          <p className="text-[11px] leading-[1.5] text-text-dim">
            <span className="text-text-muted font-medium">Included</span>
            {" · "}priced in the contract sum
          </p>
          <p className="text-[11px] leading-[1.5] text-text-dim">
            <span className="text-text-muted font-medium">Allowance</span>
            {" · "}a provisional sum or prime cost
          </p>
          <p className="text-[11px] leading-[1.5] text-text-dim">
            <span className="text-text-muted font-medium">Excluded</span>
            {" · "}not in this price
          </p>
          <p className="text-[11px] leading-[1.5] text-text-dim">
            <span className="text-text-muted font-medium">N/A</span>
            {" · "}not part of this project
          </p>
        </div>
      </div>

      <p className="text-[11px] text-text-dim mb-2 tabular-nums">
        {marked} of {MATRIX_ROWS.length} marked
      </p>

      <ul className="space-y-1.5">
        {MATRIX_ROWS.map((row) => {
          const state = value[row.id];
          return (
            <li
              key={row.id}
              className={cn(
                "flex flex-col sm:flex-row sm:items-center gap-2 rounded-md border px-3 py-2.5 transition-colors",
                state
                  ? "border-border-subtle bg-[rgba(24,34,44,0.02)]"
                  : "border-border-subtle/70 bg-transparent",
              )}
            >
              <span
                className={cn(
                  "flex-1 min-w-0 text-[12.5px] truncate",
                  state ? "text-text" : "text-text-muted",
                )}
              >
                {row.label}
              </span>
              <div className="flex gap-1 shrink-0">
                {SCOPE_STATES.map((s) => {
                  const on = state === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => onMark(row.id, s.value)}
                      aria-pressed={on}
                      className={cn(
                        "h-8 px-2.5 rounded-md border text-[11px] font-ui transition-colors",
                        on
                          ? s.value === "included"
                            ? "border-border-accent bg-[rgba(0,212,200,0.09)] text-text font-semibold"
                            : "border-border-strong bg-[rgba(24,34,44,0.06)] text-text font-semibold"
                          : "border-border-subtle text-text-dim hover:border-border-strong",
                      )}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ── save whisper ───────────────────────────────────────────────────── */

function SaveWhisper({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-text-dim">
      {state === "saving" ? (
        <>
          <Loader2 className="size-3 animate-spin" />
          Saving
        </>
      ) : state === "saved" ? (
        <>
          <Check className="size-3 text-accent-light" />
          Saved
        </>
      ) : (
        <span className="text-danger">Not saved. Retrying on next change.</span>
      )}
    </span>
  );
}
