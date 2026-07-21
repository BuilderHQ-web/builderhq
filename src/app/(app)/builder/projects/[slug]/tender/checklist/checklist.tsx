"use client";

/**
 * The Submission Checklist — one question per slide.
 *
 * The structured instrument (instrument.ts) rendered as a focused
 * deck: a single question fills the screen, a tap answers it and the
 * deck advances with a slide animation, typed answers continue on
 * Enter, and the scope matrix runs as rapid-fire rows with four big
 * state buttons. Every answer autosaves (700ms debounce), so leaving
 * and returning resumes at the first unanswered required question.
 * A review slide closes the deck with per-section completeness.
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
import { AnimatePresence, motion } from "motion/react";

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

  // ── the deck: one slide per visible question; the scope matrix
  //    fans out to one slide per row; a review slide closes it ──────
  type Slide =
    | {
        key: string;
        kind: "q";
        sIdx: number;
        section: InstrumentSection;
        q: InstrumentQuestion;
      }
    | {
        key: string;
        kind: "row";
        sIdx: number;
        section: InstrumentSection;
        q: InstrumentQuestion;
        row: { id: string; label: string };
        rIdx: number;
      }
    | { key: string; kind: "review" };

  const deck = useMemo<Slide[]>(() => {
    const out: Slide[] = [];
    INSTRUMENT_SECTIONS.forEach((sec, sIdx) => {
      for (const q of sec.questions) {
        if (!gatePasses(q, answers)) continue;
        if (q.type === "matrix") {
          MATRIX_ROWS.forEach((row, rIdx) => {
            out.push({
              key: `${q.id}:${row.id}`,
              kind: "row",
              sIdx,
              section: sec,
              q,
              row,
              rIdx,
            });
          });
        } else {
          out.push({ key: q.id, kind: "q", sIdx, section: sec, q });
        }
      }
    });
    out.push({ key: "review", kind: "review" });
    return out;
  }, [answers]);

  const slideDone = useCallback(
    (sl: Slide): boolean => {
      if (sl.kind === "review") return true;
      if (sl.kind === "row") {
        const v = answers[sl.q.id];
        return (
          !!v &&
          typeof v === "object" &&
          !!(v as Record<string, unknown>)[sl.row.id]
        );
      }
      return isAnswerComplete(sl.q, answers[sl.q.id]);
    },
    [answers],
  );

  // Resume at the first unanswered slide (required or not — the deck
  // is the path); all answered → the review slide.
  const [cursor, setCursor] = useState(() => {
    const init = Object.fromEntries(initialAnswers.map((a) => [a.qid, a.v]));
    let i = 0;
    for (const sec of INSTRUMENT_SECTIONS) {
      for (const q of sec.questions) {
        if (q.showIf && init[q.showIf.qid] !== q.showIf.equals) continue;
        if (q.type === "matrix") {
          for (const row of MATRIX_ROWS) {
            const v = init[q.id] as Record<string, unknown> | undefined;
            if (!v || !v[row.id]) return i;
            i++;
          }
        } else {
          if (!isAnswerComplete(q, init[q.id])) return i;
          i++;
        }
      }
    }
    return i; // review
  });
  const [dir, setDir] = useState(1);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const idx = Math.max(0, Math.min(cursor, deck.length - 1));
  const slide = deck[idx]!;

  const goto = useCallback(
    (i: number, d: 1 | -1) => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      setDir(d);
      setCursor(Math.max(0, Math.min(i, deck.length - 1)));
    },
    [deck.length],
  );
  const next = useCallback(() => goto(idx + 1, 1), [goto, idx]);
  const back = useCallback(() => goto(idx - 1, -1), [goto, idx]);

  // Tap-to-answer types advance on their own after a beat — long
  // enough to see the selection land, short enough to feel instant.
  const answerAndMaybeAdvance = useCallback(
    (qid: string, patch: AnswerPatch, auto: boolean) => {
      queue(qid, patch);
      if (auto) {
        if (advanceTimer.current) clearTimeout(advanceTimer.current);
        advanceTimer.current = setTimeout(() => {
          setDir(1);
          setCursor((c) => Math.min(c + 1, deck.length - 1));
        }, 260);
      }
    },
    [queue, deck.length],
  );
  useEffect(
    () => () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    },
    [],
  );

  // Enter continues whenever the current slide is answered.
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== "Enter") return;
      const t = e.target as HTMLElement;
      if (t.tagName === "TEXTAREA" || t.tagName === "BUTTON") return;
      if (slide.kind !== "review" && slideDone(slide)) {
        e.preventDefault();
        next();
      }
    },
    [slide, slideDone, next],
  );

  const sectionOf = slide.kind === "review" ? null : slide.section;
  const sectionNo = slide.kind === "review" ? null : slide.sIdx + 1;

  // Jump helper for the review slide: first not-done slide of a section.
  const firstGapInSection = useCallback(
    (sIdx: number) => {
      const i = deck.findIndex(
        (sl) => sl.kind !== "review" && sl.sIdx === sIdx && !slideDone(sl),
      );
      return i === -1
        ? deck.findIndex((sl) => sl.kind !== "review" && sl.sIdx === sIdx)
        : i;
    },
    [deck, slideDone],
  );

  return (
    <div
      // Fills the viewport under the 56px app topbar so the footer
      // controls always sit on screen.
      className="min-h-[calc(100dvh-3.5rem)] flex flex-col"
      onKeyDown={onKeyDown}
    >
      {/* ── slim bar: exit · where you are · save state ──────────── */}
      <div className="border-b border-border-subtle">
        <div className="px-4 sm:px-6 lg:px-10 py-3 mx-auto max-w-[1100px] flex items-center justify-between gap-4">
          <Link
            href={`/builder/projects/${slug}/tender`}
            className="inline-flex items-center gap-1.5 text-[12px] text-text-dim hover:text-text transition-colors shrink-0"
          >
            <ArrowLeft className="size-3.5" />
            Save and exit
          </Link>
          <div className="min-w-0 text-center">
            <p className="text-[10px] tracking-[0.2em] uppercase text-accent-light font-ui font-semibold truncate">
              {slide.kind === "review"
                ? "Review"
                : `Section ${sectionNo} of ${INSTRUMENT_SECTIONS.length} · ${sectionOf!.title}`}
            </p>
            <p className="mt-0.5 text-[10.5px] text-text-dim truncate hidden sm:block">
              {projectTitle}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <SaveWhisper state={saveState} />
            <p className="text-[12px] text-text-dim tabular-nums">
              <span className="text-text font-medium">{progress.answered}</span>
              /{progress.required}
            </p>
          </div>
        </div>
        <div className="h-[3px] bg-border-subtle/50">
          <div
            className="h-full bg-accent transition-[width] duration-300"
            style={{ width: `${progress.pct}%` }}
          />
        </div>
      </div>

      {/* ── the slide ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-x-clip">
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div
            key={slide.key}
            custom={dir}
            initial={{ opacity: 0, x: 44 * dir }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -44 * dir }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 flex flex-col"
          >
            <div className="flex-1 w-full mx-auto max-w-[780px] px-5 sm:px-8 pt-12 sm:pt-16 lg:pt-20 pb-10">
              {slide.kind === "review" ? (
                <ReviewSlide
                  slug={slug}
                  progress={progress}
                  onJump={(sIdx) => goto(firstGapInSection(sIdx), -1)}
                />
              ) : slide.kind === "row" ? (
                <MatrixRowSlide
                  q={slide.q}
                  row={slide.row}
                  rIdx={slide.rIdx}
                  total={MATRIX_ROWS.length}
                  value={
                    ((answers[slide.q.id] as Record<string, string>) ?? {})[
                      slide.row.id
                    ]
                  }
                  onMark={(state) =>
                    answerAndMaybeAdvance(
                      slide.q.id,
                      (prev: unknown) => ({
                        ...((prev as Record<string, string>) ?? {}),
                        [slide.row.id]: state,
                      }),
                      true,
                    )
                  }
                />
              ) : (
                <div>
                  <p className="text-[10px] tracking-[0.2em] uppercase text-text-dim font-ui font-semibold">
                    {slide.q.required ? "Required" : "Optional"}
                  </p>
                  <h2 className="mt-2.5 font-ui font-semibold tracking-[-0.02em] text-[22px] sm:text-[27px] leading-[1.25] text-text max-w-[26ch]">
                    {slide.q.prompt}
                  </h2>
                  {slide.q.help ? (
                    <p className="mt-2.5 text-[13.5px] leading-[1.65] text-text-muted max-w-[58ch]">
                      {slide.q.help}
                    </p>
                  ) : null}
                  <div className="mt-8">
                    <AnswerControl
                      question={slide.q}
                      value={answers[slide.q.id]}
                      onAnswer={(qid, patch) =>
                        answerAndMaybeAdvance(
                          qid,
                          patch,
                          slide.q.type === "bool" || slide.q.type === "select",
                        )
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            {/* footer controls */}
            {slide.kind !== "review" ? (
              <div className="border-t border-border-subtle/60">
                <div className="w-full mx-auto max-w-[780px] px-5 sm:px-8 py-4 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={back}
                    disabled={idx === 0}
                    className={cn(
                      "inline-flex items-center gap-1.5 text-[12.5px] transition-colors",
                      idx === 0
                        ? "text-text-faint cursor-default"
                        : "text-text-muted hover:text-text",
                    )}
                  >
                    <ArrowLeft className="size-3.5" />
                    Back
                  </button>
                  <div className="flex items-center gap-4">
                    {slide.kind === "q" &&
                    !slide.q.required &&
                    !slideDone(slide) ? (
                      <button
                        type="button"
                        onClick={next}
                        className="text-[12.5px] text-text-dim hover:text-text transition-colors"
                      >
                        Skip
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={next}
                      disabled={!slideDone(slide)}
                      className={cn(
                        "inline-flex items-center gap-2 h-11 px-6 rounded-full text-[13px] font-semibold tracking-[0.02em] transition-colors",
                        slideDone(slide)
                          ? "bg-accent text-accent-contrast hover:bg-accent-hover shadow-[0_0_0_1px_rgba(0,212,200,0.35)]"
                          : "border border-border-subtle text-text-faint cursor-default",
                      )}
                    >
                      Continue
                      <ArrowRight className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── slides ─────────────────────────────────────────────────────────── */

const SCOPE_STATE_HELP: Record<string, string> = {
  included: "Priced in the contract sum",
  allowance: "A provisional sum or prime cost",
  excluded: "Not in this price",
  na: "Not part of this project",
};

function MatrixRowSlide({
  q,
  row,
  rIdx,
  total,
  value,
  onMark,
}: {
  q: InstrumentQuestion;
  row: { id: string; label: string };
  rIdx: number;
  total: number;
  value: string | undefined;
  onMark: (state: string) => void;
}) {
  return (
    <div>
      <p className="text-[10px] tracking-[0.2em] uppercase text-text-dim font-ui font-semibold tabular-nums">
        Scope of works · {rIdx + 1} of {total}
      </p>
      <h2 className="mt-2.5 font-ui font-semibold tracking-[-0.02em] text-[22px] sm:text-[27px] leading-[1.25] text-text">
        {row.label}
      </h2>
      <p className="mt-2.5 text-[13.5px] leading-[1.65] text-text-muted max-w-[58ch]">
        How does your price treat this trade?
      </p>
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {SCOPE_STATES.map((st) => {
          const on = value === st.value;
          return (
            <button
              key={st.value}
              type="button"
              onClick={() => onMark(st.value)}
              aria-pressed={on}
              className={cn(
                "text-left rounded-lg border px-4.5 py-3.5 transition-colors",
                on
                  ? "border-border-accent bg-[rgba(0,212,200,0.07)]"
                  : "border-border-subtle bg-surface-1 card-elev hover:border-border-strong",
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "size-4 rounded-full border flex items-center justify-center shrink-0",
                    on
                      ? "border-transparent bg-accent text-accent-contrast"
                      : "border-border-strong",
                  )}
                >
                  {on ? <Check className="size-2.5" strokeWidth={3.5} /> : null}
                </span>
                <span
                  className={cn(
                    "text-[14px] font-ui font-semibold",
                    on ? "text-text" : "text-text",
                  )}
                >
                  {st.label}
                </span>
              </span>
              <span className="block mt-1 pl-6 text-[11.5px] leading-[1.5] text-text-muted">
                {SCOPE_STATE_HELP[st.value] ?? ""}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ReviewSlide({
  slug,
  progress,
  onJump,
}: {
  slug: string;
  progress: {
    perSection: Array<{
      id: string;
      required: number;
      answered: number;
      complete: boolean;
    }>;
    required: number;
    answered: number;
    complete: boolean;
    pct: number;
  };
  onJump: (sIdx: number) => void;
}) {
  return (
    <div>
      <p className="text-[10px] tracking-[0.2em] uppercase text-accent-light font-ui font-semibold">
        Review
      </p>
      <h2 className="mt-2.5 font-ui font-semibold tracking-[-0.02em] text-[24px] sm:text-[28px] leading-[1.2] text-text">
        {progress.complete
          ? "Checklist complete."
          : `${progress.required - progress.answered} required answer${progress.required - progress.answered === 1 ? "" : "s"} to go.`}
      </h2>
      <p className="mt-2.5 text-[13.5px] leading-[1.65] text-text-muted max-w-[56ch]">
        {progress.complete
          ? "Every required question is answered. Owners will read your tender like for like against the others on the round."
          : "Jump back to any section below. Your answers are saved as you go."}
      </p>

      <ul className="mt-8 flex flex-col divide-y divide-border-subtle/60 border-y border-border-subtle/60">
        {INSTRUMENT_SECTIONS.map((sec, i) => {
          const p = progress.perSection[i]!;
          return (
            <li key={sec.id}>
              <button
                type="button"
                onClick={() => onJump(i)}
                className="w-full flex items-center gap-3.5 py-3 text-left group"
              >
                <span
                  className={cn(
                    "size-5 rounded-full flex items-center justify-center shrink-0",
                    p.complete
                      ? "bg-accent text-accent-contrast"
                      : "border border-[rgba(201,148,34,0.55)] text-[#8a6414]",
                  )}
                >
                  {p.complete ? (
                    <Check className="size-3" strokeWidth={3} />
                  ) : (
                    <span className="text-[9px] font-semibold tabular-nums">
                      {p.required - p.answered}
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1 text-[13.5px] font-ui font-medium text-text truncate group-hover:text-accent-light transition-colors">
                  {sec.title}
                </span>
                <span className="text-[11.5px] text-text-dim tabular-nums shrink-0">
                  {p.answered}/{p.required}
                </span>
                <ArrowRight className="size-3.5 text-text-dim group-hover:text-text transition-colors shrink-0" />
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-9 flex flex-wrap items-center gap-3">
        <Link
          href={`/builder/projects/${slug}/tender`}
          className="inline-flex items-center gap-2 h-12 px-7 rounded-full bg-accent text-accent-contrast text-[13px] font-semibold tracking-[0.02em] hover:bg-accent-hover transition-colors shadow-[0_0_0_1px_rgba(0,212,200,0.4),_0_8px_24px_-8px_rgba(0,212,200,0.4)]"
        >
          Back to your tender
          <ArrowRight className="size-4" />
        </Link>
        {!progress.complete ? (
          <p className="text-[11.5px] text-text-dim">
            You can finish the rest any time before you submit.
          </p>
        ) : null}
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
