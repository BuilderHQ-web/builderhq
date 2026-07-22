"use client";

/**
 * The Tender Deck — the submission instrument rendered as a journey.
 *
 * Three stages:
 *
 *   OPENING. A calm letterhead: what this is, how long it takes, that
 *   everything saves as you go. Returning builders see their progress
 *   and resume where they stopped.
 *
 *   THE DECK. One question per slide. A tap answers and advances,
 *   typed answers continue on Enter, the scope grid runs as rapid-fire
 *   rows. Crossing into a new module plays a short bridge: the module
 *   number, its question in the builder's voice, a rule drawing
 *   across. Every ceremony is skippable with a click or key press and
 *   collapses entirely under prefers-reduced-motion.
 *
 *   REVIEW. Key tender metrics rolled up from the answers, then every
 *   module as a numbered, expandable ledger with per-question jumps.
 *
 * A contents control in the top bar lists all modules and questions
 * with their completion, so nothing is ever more than two taps away.
 *
 * Rendering is driven entirely by the instrument data for the
 * tender's version (sectionsFor): each question type has one renderer,
 * showIf gates hide dependants until their gate matches, and prefilled
 * questions arrive already answered from the tender's headline fields.
 *
 * Every answer autosaves (700ms debounce). Progress here is stricter
 * than the server gate on purpose: the client counts a matrix answered
 * only when every row is marked, so the UI never claims "complete" for
 * a submission the server would refuse.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ListOrdered,
  Loader2,
  Plus,
  X,
} from "lucide-react";

import {
  sectionsFor,
  SCOPE_STATES,
  scopeMatrixRows,
  isAnswerComplete,
  computeTenderMetrics,
  getQuestion,
  type InstrumentQuestion,
  type InstrumentSection,
} from "@/modules/tenders/instrument";
import { formatAnswer, formatAud } from "@/modules/tenders/comparison";
import { saveTenderResponsesAction } from "@/app/(app)/_actions/tenders";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";

type Answers = Record<string, unknown>;
type SaveState = "idle" | "saving" | "saved" | "error";

/** Plain value, or an updater applied to the latest saved answer. */
type AnswerPatch = unknown | ((prev: unknown) => unknown);

const MATRIX_ROWS = scopeMatrixRows();

/** The slide easing every movement in the deck shares. */
const EASE = [0.22, 1, 0.36, 1] as const;

// Answer completeness is shared with the server (isAnswerComplete in
// instrument.ts) so the progress ring here and the submit gate there
// can never disagree.

function gatePasses(q: InstrumentQuestion, answers: Answers): boolean {
  if (!q.showIf) return true;
  return answers[q.showIf.qid] === q.showIf.equals;
}

/** "3 items", "24 included · 2 excluded", or the plain formatted value. */
function summariseValue(q: InstrumentQuestion, v: unknown): string | null {
  if (q.type === "items") {
    return Array.isArray(v) && v.length > 0
      ? `${v.length} listed`
      : null;
  }
  if (q.type === "matrix") {
    const m = (v ?? {}) as Record<string, string>;
    const marked = MATRIX_ROWS.filter((r) => !!m[r.id]);
    if (marked.length === 0) return null;
    const count = (s: string) =>
      marked.filter((r) => m[r.id] === s).length;
    const parts = [
      `${count("included")} included`,
      count("allowance") ? `${count("allowance")} allowance` : null,
      count("excluded") ? `${count("excluded")} excluded` : null,
      count("not_applicable") ? `${count("not_applicable")} n/a` : null,
    ].filter(Boolean);
    return parts.join(" · ");
  }
  return formatAnswer(q, v);
}

/* ── component ──────────────────────────────────────────────────────── */

export function ChecklistWizard({
  slug,
  projectTitle,
  tenderId,
  instrumentVersion,
  initialAnswers,
  prefills,
}: {
  slug: string;
  projectTitle: string;
  tenderId: string;
  instrumentVersion: number;
  initialAnswers: Array<{ qid: string; v: unknown }>;
  prefills: {
    "tender.totalPriceAud": number | null;
    "tender.durationWeeks": number | null;
    "tender.validityDays": number | null;
    "tender.proposedStartMonth": string | null;
  };
}) {
  const reduceMotion = useReducedMotion();
  const SECTIONS = useMemo(
    () => sectionsFor(instrumentVersion),
    [instrumentVersion],
  );

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
    for (const section of SECTIONS) {
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
    const perSection = SECTIONS.map((s) => {
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
  }, [SECTIONS, answers]);

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
    SECTIONS.forEach((sec, sIdx) => {
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
  }, [SECTIONS, answers]);

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
    for (const sec of sectionsFor(instrumentVersion)) {
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
  const idxRef = useRef(idx);
  idxRef.current = idx;

  // ── stages: opening → (bridge) → deck ────────────────────────────
  const [stage, setStage] = useState<"opening" | "bridge" | "deck">("opening");
  type Bridge = { moduleIdx: number; target: number };
  const [bridge, setBridge] = useState<Bridge | null>(null);
  const bridgeRef = useRef<Bridge | null>(null);
  bridgeRef.current = bridge;
  const bridgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commitBridge = useCallback(() => {
    if (bridgeTimer.current) {
      clearTimeout(bridgeTimer.current);
      bridgeTimer.current = null;
    }
    const b = bridgeRef.current;
    if (b) {
      setDir(1);
      setCursor(Math.max(0, Math.min(b.target, deck.length - 1)));
    }
    setBridge(null);
    setStage("deck");
  }, [deck.length]);

  const startBridge = useCallback(
    (moduleIdx: number, target: number, ms: number) => {
      if (bridgeTimer.current) clearTimeout(bridgeTimer.current);
      setBridge({ moduleIdx, target });
      setStage("bridge");
      bridgeTimer.current = setTimeout(commitBridge, ms);
    },
    [commitBridge],
  );

  const begin = useCallback(() => {
    const sl = deck[idxRef.current]!;
    if (reduceMotion || sl.kind === "review") {
      setStage("deck");
      return;
    }
    // Hold on the module the builder is resuming into, then land.
    startBridge(sl.sIdx, idxRef.current, 2050);
  }, [deck, reduceMotion, startBridge]);

  // Advance one slide; crossing into a new module plays its bridge.
  const advance = useCallback(() => {
    const i = idxRef.current;
    const target = Math.min(i + 1, deck.length - 1);
    if (target === i) return;
    const cur = deck[i]!;
    const nxt = deck[target]!;
    if (
      !reduceMotion &&
      cur.kind !== "review" &&
      nxt.kind !== "review" &&
      nxt.sIdx !== cur.sIdx
    ) {
      startBridge(nxt.sIdx, target, 1600);
    } else {
      setDir(1);
      setCursor(target);
    }
  }, [deck, reduceMotion, startBridge]);
  const advanceRef = useRef(advance);
  advanceRef.current = advance;

  const jumpTo = useCallback(
    (target: number) => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      if (bridgeTimer.current) clearTimeout(bridgeTimer.current);
      const clamped = Math.max(0, Math.min(target, deck.length - 1));
      setDir(clamped >= idxRef.current ? 1 : -1);
      setCursor(clamped);
      setBridge(null);
      setStage("deck");
    },
    [deck.length],
  );

  const next = advance;
  const back = useCallback(() => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setDir(-1);
    setCursor((c) => Math.max(0, c - 1));
  }, []);

  // Tap-to-answer types advance on their own after a beat — long
  // enough to see the selection land, short enough to feel instant.
  const answerAndMaybeAdvance = useCallback(
    (qid: string, patch: AnswerPatch, auto: boolean) => {
      queue(qid, patch);
      if (auto) {
        if (advanceTimer.current) clearTimeout(advanceTimer.current);
        advanceTimer.current = setTimeout(() => advanceRef.current(), 260);
      }
    },
    [queue],
  );
  useEffect(
    () => () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      if (bridgeTimer.current) clearTimeout(bridgeTimer.current);
    },
    [],
  );

  // Enter continues whenever the current slide is answered.
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (stage !== "deck") return;
      if (e.key !== "Enter") return;
      const t = e.target as HTMLElement;
      if (t.tagName === "TEXTAREA" || t.tagName === "BUTTON") return;
      if (slide.kind !== "review" && slideDone(slide)) {
        e.preventDefault();
        next();
      }
    },
    [stage, slide, slideDone, next],
  );

  // The opening begins and a bridge skips on Enter, Space or Escape.
  useEffect(() => {
    if (stage === "deck") return;
    const h = (e: KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " " && e.key !== "Escape") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "A" || t.tagName === "BUTTON")) return;
      e.preventDefault();
      if (stage === "opening") begin();
      else commitBridge();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [stage, begin, commitBridge]);

  // ── lookups for contents + review jumps ──────────────────────────
  const slideIndex = useMemo(() => {
    const byQ = new Map<string, number>();
    const byRow = new Map<string, number>();
    deck.forEach((sl, i) => {
      if (sl.kind === "review") return;
      if (!byQ.has(sl.q.id)) byQ.set(sl.q.id, i);
      if (sl.kind === "row") byRow.set(sl.key, i);
    });
    return { byQ, byRow };
  }, [deck]);

  const jumpToQuestion = useCallback(
    (q: InstrumentQuestion) => {
      if (q.type === "matrix") {
        const m = (liveAnswers.current[q.id] ?? {}) as Record<string, string>;
        const gap = MATRIX_ROWS.find((r) => !m[r.id]);
        const i = gap
          ? slideIndex.byRow.get(`${q.id}:${gap.id}`)
          : slideIndex.byQ.get(q.id);
        if (i !== undefined) jumpTo(i);
        return;
      }
      const i = slideIndex.byQ.get(q.id);
      if (i !== undefined) jumpTo(i);
    },
    [slideIndex, jumpTo],
  );

  // Jump helper: first not-done slide of a section, else its start.
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

  const jumpToReview = useCallback(() => {
    jumpTo(deck.length - 1);
  }, [deck.length, jumpTo]);

  // Position within the current module, for the top bar.
  const modPos = useMemo(() => {
    if (slide.kind === "review") return null;
    const mod = deck.filter(
      (sl) => sl.kind !== "review" && sl.sIdx === slide.sIdx,
    );
    return {
      no: slide.sIdx + 1,
      pos: mod.findIndex((sl) => sl.key === slide.key) + 1,
      count: mod.length,
      title: slide.section.title,
    };
  }, [deck, slide]);

  const [contentsOpen, setContentsOpen] = useState(false);

  return (
    <div
      // Fills the viewport under the 56px app topbar so the footer
      // controls always sit on screen.
      className="min-h-[calc(100dvh-3.5rem)] flex flex-col"
      onKeyDown={onKeyDown}
    >
      {/* ── slim bar: exit · where you are · contents · save ─────── */}
      <div className="border-b border-border-subtle relative z-30">
        <div className="px-4 sm:px-6 lg:px-10 py-3 mx-auto max-w-[1100px] flex items-center justify-between gap-4">
          <Link
            href={`/builder/projects/${slug}/tender`}
            className="inline-flex items-center gap-1.5 text-[12px] text-text-dim hover:text-text transition-colors shrink-0"
          >
            <ArrowLeft className="size-3.5" />
            Save and exit
          </Link>

          <div className="min-w-0 text-center">
            {stage === "opening" ? (
              <p className="text-[10px] tracking-[0.2em] uppercase text-text-dim font-ui font-semibold truncate">
                Tender submission
              </p>
            ) : stage === "bridge" && bridge ? (
              <p className="text-[10px] tracking-[0.2em] uppercase text-text-dim font-ui font-semibold truncate">
                Module {bridge.moduleIdx + 1} of {SECTIONS.length}
              </p>
            ) : slide.kind === "review" ? (
              <p className="text-[10px] tracking-[0.2em] uppercase text-accent-light font-ui font-semibold truncate">
                Review and metrics
              </p>
            ) : modPos ? (
              <>
                <p className="text-[10px] tracking-[0.2em] uppercase text-accent-light font-ui font-semibold truncate">
                  Module {modPos.no} of {SECTIONS.length} · {modPos.title}
                </p>
                <p className="mt-0.5 text-[10.5px] text-text-dim truncate hidden sm:block tabular-nums">
                  Question {modPos.pos} of {modPos.count} in this module
                </p>
              </>
            ) : null}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <SaveWhisper state={saveState} />
            <p className="text-[12px] text-text-dim tabular-nums hidden sm:block">
              <span className="text-text font-medium">{progress.answered}</span>
              /{progress.required}
            </p>
            <div className="relative">
              <button
                type="button"
                onClick={() => setContentsOpen((o) => !o)}
                aria-expanded={contentsOpen}
                className={cn(
                  "inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-[11.5px] transition-colors",
                  contentsOpen
                    ? "border-border-accent bg-[rgba(0,212,200,0.06)] text-text"
                    : "border-border-subtle text-text-muted hover:border-border-strong hover:text-text",
                )}
              >
                <ListOrdered className="size-3.5" />
                <span className="hidden sm:inline">Contents</span>
              </button>
              {contentsOpen ? (
                <ContentsPopover
                  sections={SECTIONS}
                  answers={answers}
                  perSection={progress.perSection}
                  currentModule={slide.kind === "review" ? null : slide.sIdx}
                  onClose={() => setContentsOpen(false)}
                  onJumpModule={(sIdx) => {
                    setContentsOpen(false);
                    jumpTo(firstGapInSection(sIdx));
                  }}
                  onJumpQuestion={(q) => {
                    setContentsOpen(false);
                    jumpToQuestion(q);
                  }}
                  onJumpReview={() => {
                    setContentsOpen(false);
                    jumpToReview();
                  }}
                />
              ) : null}
            </div>
          </div>
        </div>
        <div className="h-[3px] bg-border-subtle/50">
          <div
            className="h-full bg-accent transition-[width] duration-300"
            style={{ width: `${progress.pct}%` }}
          />
        </div>
      </div>

      {/* ── the stage ────────────────────────────────────────────── */}
      {/* Stages swap instantly and each ENTRANCE carries the ceremony
          (the opening rises, the bridge staggers in, slides glide).
          Exit animations are deliberately absent: a mode="wait" chain
          here would hold the whole deck hostage to an exit callback. */}
      <div className="flex-1 flex flex-col overflow-x-clip">
        {stage === "opening" ? (
          <div className="flex-1 flex flex-col">
            <OpeningSlide
              slug={slug}
              projectTitle={projectTitle}
              sections={SECTIONS}
              perSection={progress.perSection}
              progress={progress}
              onBegin={begin}
            />
          </div>
        ) : stage === "bridge" && bridge ? (
          <div key={`bridge-${bridge.moduleIdx}`} className="flex-1 flex flex-col">
            <ModuleBridge
              no={bridge.moduleIdx + 1}
              total={SECTIONS.length}
              section={SECTIONS[bridge.moduleIdx]!}
              onSkip={commitBridge}
            />
          </div>
        ) : (
          <motion.div
            key="deck"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE } }}
            className="flex-1 flex flex-col"
          >
                {/* Keyed remount, entrance only: the next slide glides
                    in and the old one simply goes. No exit animation —
                    an exit-completion dependency can wedge the whole
                    deck when frames starve (background tab, low power). */}
                <motion.div
                  key={slide.key}
                  initial={{ opacity: 0, x: 44 * dir }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.26, ease: EASE }}
                  className="flex-1 flex flex-col"
                >
                  <div className="flex-1 w-full mx-auto max-w-[780px] px-5 sm:px-8 pt-12 sm:pt-16 lg:pt-20 pb-10">
                    {slide.kind === "review" ? (
                      <ReviewSlide
                        slug={slug}
                        sections={SECTIONS}
                        answers={answers}
                        progress={progress}
                        onJumpModule={(sIdx) => jumpTo(firstGapInSection(sIdx))}
                        onJumpQuestion={jumpToQuestion}
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
                          {slide.q.ref ? (
                            <span className="text-accent-light">{slide.q.ref}</span>
                          ) : null}
                          {slide.q.ref ? " · " : ""}
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
                        {slide.q.id === "excl.derived_confirm" ? (
                          <DerivedExclusions answers={answers} />
                        ) : null}
                        <div className="mt-8">
                          <AnswerControl
                            question={slide.q}
                            value={answers[slide.q.id]}
                            onAnswer={(qid, patch) =>
                              answerAndMaybeAdvance(
                                qid,
                                patch,
                                slide.q.type === "bool" ||
                                  slide.q.type === "select" ||
                                  ((slide.q.type === "declare" ||
                                    slide.q.type === "confirm") &&
                                    patch === true),
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
          </motion.div>
        )}
      </div>
    </div>
  );
}

/* ── the opening ────────────────────────────────────────────────────── */

function OpeningSlide({
  slug,
  projectTitle,
  sections,
  perSection,
  progress,
  onBegin,
}: {
  slug: string;
  projectTitle: string;
  sections: InstrumentSection[];
  perSection: Array<{ id: string; required: number; answered: number; complete: boolean }>;
  progress: { answered: number; required: number; pct: number; complete: boolean };
  onBegin: () => void;
}) {
  const resuming = progress.answered > 0;
  const rise = (delay: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.55, delay, ease: EASE },
  });

  return (
    <div className="flex-1 w-full mx-auto max-w-[820px] px-5 sm:px-8 pt-12 sm:pt-16 lg:pt-20 pb-14 flex flex-col">
      <motion.p
        {...rise(0.05)}
        className="text-[10px] tracking-[0.24em] uppercase text-accent-light font-ui font-semibold"
      >
        Tender submission
      </motion.p>
      <motion.h1
        {...rise(0.12)}
        className="mt-3 font-display tracking-[-0.01em] text-[30px] sm:text-[40px] leading-[1.08] text-text"
      >
        {projectTitle}
      </motion.h1>
      <motion.p
        {...rise(0.2)}
        className="mt-4 text-[14px] sm:text-[14.5px] leading-[1.7] text-text-muted max-w-[62ch]"
      >
        You are preparing a formal tender for this project. {sections.length}{" "}
        modules cover your eligibility, the project, your credentials, the
        offer itself, scope, allowances, programme and delivery. Most questions
        are a single tap, and your answers save as they land, so you can leave
        at any point and resume where you stopped.
      </motion.p>

      <motion.dl
        {...rise(0.3)}
        className="mt-8 grid grid-cols-3 border-y border-border-subtle divide-x divide-border-subtle"
      >
        {[
          { k: "Modules", v: String(sections.length) },
          resuming
            ? { k: "Progress", v: `${progress.pct}%` }
            : { k: "First time", v: "About 30 min" },
          { k: "Autosave", v: "As you go" },
        ].map((c) => (
          <div key={c.k} className="py-4 px-4 first:pl-0">
            <dt className="text-[10px] tracking-[0.16em] uppercase text-text-dim font-ui font-semibold">
              {c.k}
            </dt>
            <dd className="mt-1 font-display text-[16px] sm:text-[18px] text-text tabular-nums">
              {c.v}
            </dd>
          </div>
        ))}
      </motion.dl>

      <motion.ol
        {...rise(0.4)}
        className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-1.5"
      >
        {sections.map((sec, i) => {
          const p = perSection[i];
          const done = !!p && p.required > 0 && p.complete;
          return (
            <li key={sec.id} className="flex items-center gap-3 py-1">
              <span className="w-6 text-[11px] font-mono text-text-dim tabular-nums shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 min-w-0 text-[13px] text-text-muted truncate">
                {sec.title}
              </span>
              {done ? (
                <Check className="size-3.5 text-accent-light shrink-0" strokeWidth={3} />
              ) : null}
            </li>
          );
        })}
      </motion.ol>

      <motion.div
        {...rise(0.52)}
        className="mt-9 flex flex-wrap items-center gap-4"
      >
        <button
          type="button"
          onClick={onBegin}
          className="inline-flex items-center gap-2 h-12 px-7 rounded-full bg-accent text-accent-contrast text-[13.5px] font-semibold tracking-[0.02em] hover:bg-accent-hover transition-colors shadow-[0_0_0_1px_rgba(0,212,200,0.4),_0_8px_24px_-8px_rgba(0,212,200,0.4)]"
        >
          {resuming ? "Resume your tender" : "Begin your tender"}
          <ArrowRight className="size-4" />
        </button>
        <Link
          href={`/builder/projects/${slug}/tender`}
          className="text-[12.5px] text-text-dim hover:text-text transition-colors"
        >
          Back to the tender page
        </Link>
      </motion.div>
    </div>
  );
}

/* ── the bridge between modules ─────────────────────────────────────── */

/**
 * The moment between modules: number, the module's question in the
 * builder's voice, a rule drawing across. Clicking anywhere lands the
 * first question immediately.
 */
function ModuleBridge({
  no,
  total,
  section,
  onSkip,
}: {
  no: number;
  total: number;
  section: InstrumentSection;
  onSkip: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSkip}
      aria-label="Continue to the questions"
      className="flex-1 flex items-center justify-center px-6 pb-16 text-center cursor-default select-none"
    >
      <div className="max-w-[680px]">
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12, ease: EASE }}
          className="text-[10.5px] tracking-[0.26em] uppercase text-text-dim font-ui font-semibold tabular-nums"
        >
          Module {no} of {total} · {section.title}
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.28, ease: EASE }}
          className="mt-4 font-display tracking-[-0.01em] text-[28px] sm:text-[38px] leading-[1.12] text-text"
        >
          {section.ask ?? section.title}
        </motion.h2>
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.62, delay: 0.52, ease: EASE }}
          className="mx-auto mt-6 h-px w-44 bg-accent origin-left"
        />
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.82, ease: EASE }}
          className="mt-5 text-[12.5px] leading-[1.6] text-text-muted max-w-[52ch] mx-auto"
        >
          {section.intro}
        </motion.p>
      </div>
    </button>
  );
}

/* ── contents popover ───────────────────────────────────────────────── */

function ContentsPopover({
  sections,
  answers,
  perSection,
  currentModule,
  onClose,
  onJumpModule,
  onJumpQuestion,
  onJumpReview,
}: {
  sections: InstrumentSection[];
  answers: Answers;
  perSection: Array<{ id: string; required: number; answered: number; complete: boolean }>;
  currentModule: number | null;
  onClose: () => void;
  onJumpModule: (sIdx: number) => void;
  onJumpQuestion: (q: InstrumentQuestion) => void;
  onJumpReview: () => void;
}) {
  const [expanded, setExpanded] = useState<number | null>(currentModule);

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        aria-hidden
        onClick={onClose}
      />
      <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(92vw,400px)] max-h-[min(70vh,560px)] overflow-y-auto rounded-lg border border-border-subtle bg-surface-1 card-elev shadow-[0_18px_50px_-18px_rgba(24,34,44,0.28)]">
        <p className="px-4 pt-3.5 pb-2 text-[10px] tracking-[0.18em] uppercase text-text-dim font-ui font-semibold">
          Contents
        </p>
        <ul className="pb-1.5">
          {sections.map((sec, sIdx) => {
            const p = perSection[sIdx]!;
            const open = expanded === sIdx;
            const visible = sec.questions.filter((q) => gatePasses(q, answers));
            return (
              <li key={sec.id} className="border-t border-border-subtle/50">
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => onJumpModule(sIdx)}
                    className="flex-1 min-w-0 flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[rgba(24,34,44,0.03)] transition-colors"
                  >
                    <span className="w-5 text-[10.5px] font-mono text-text-dim tabular-nums shrink-0">
                      {String(sIdx + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={cn(
                        "flex-1 min-w-0 text-[12.5px] font-ui truncate",
                        currentModule === sIdx
                          ? "text-accent-light font-semibold"
                          : "text-text",
                      )}
                    >
                      {sec.title}
                    </span>
                    <span className="text-[11px] text-text-dim tabular-nums shrink-0">
                      {p.answered}/{p.required}
                    </span>
                    {p.required > 0 && p.complete ? (
                      <Check className="size-3 text-accent-light shrink-0" strokeWidth={3} />
                    ) : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : sIdx)}
                    aria-expanded={open}
                    aria-label={`${open ? "Collapse" : "Expand"} ${sec.title}`}
                    className="px-3 py-2.5 text-text-dim hover:text-text transition-colors shrink-0"
                  >
                    <ChevronDown
                      className={cn(
                        "size-3.5 transition-transform",
                        open ? "rotate-180" : "",
                      )}
                    />
                  </button>
                </div>
                {open ? (
                  <ul className="pb-1.5">
                    {visible.map((q) => {
                      const done = isAnswerComplete(q, answers[q.id]);
                      return (
                        <li key={q.id}>
                          <button
                            type="button"
                            onClick={() => onJumpQuestion(q)}
                            className="w-full flex items-center gap-2.5 pl-12 pr-4 py-1.5 text-left hover:bg-[rgba(24,34,44,0.03)] transition-colors"
                          >
                            <span
                              className={cn(
                                "size-1.5 rounded-full shrink-0",
                                done
                                  ? "bg-accent"
                                  : q.required
                                    ? "bg-[#c99422]"
                                    : "bg-[rgba(24,34,44,0.18)]",
                              )}
                            />
                            {q.ref ? (
                              <span className="text-[10px] font-mono text-text-dim tabular-nums shrink-0 w-8">
                                {q.ref}
                              </span>
                            ) : null}
                            <span className="flex-1 min-w-0 text-[11.5px] text-text-muted truncate">
                              {q.type === "matrix" ? "Scope coverage grid" : q.prompt}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            );
          })}
          <li className="border-t border-border-subtle/50">
            <button
              type="button"
              onClick={onJumpReview}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[rgba(24,34,44,0.03)] transition-colors"
            >
              <span className="w-5 shrink-0" />
              <span className="flex-1 text-[12.5px] font-ui text-text">
                Review and metrics
              </span>
              <ArrowRight className="size-3 text-text-dim shrink-0" />
            </button>
          </li>
        </ul>
      </div>
    </>
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
        {q.ref ? (
          <span className="text-accent-light">{q.ref}</span>
        ) : null}
        {q.ref ? " · " : ""}
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
                <span className="text-[14px] font-ui font-semibold text-text">
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

/** The exclusion schedule the coverage grid already implies, shown on
 *  the confirm slide so the builder signs what the owner will read. */
function DerivedExclusions({ answers }: { answers: Answers }) {
  const m = (answers["scope.matrix"] ?? {}) as Record<string, string>;
  const excluded = MATRIX_ROWS.filter((r) => m[r.id] === "excluded");
  const allowance = MATRIX_ROWS.filter((r) => m[r.id] === "allowance");

  return (
    <div className="mt-6 border-y border-border-subtle divide-y divide-border-subtle/60">
      <div className="py-3.5">
        <p className="text-[10px] tracking-[0.16em] uppercase text-text-dim font-ui font-semibold">
          Excluded from your price
        </p>
        {excluded.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {excluded.map((r) => (
              <li
                key={r.id}
                className="px-2.5 py-1 rounded-full border border-[rgba(194,85,80,0.4)] text-[11.5px] text-[#a8433e]"
              >
                {r.label}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1.5 text-[12.5px] text-text-muted">
            Nothing in your coverage grid is marked excluded.
          </p>
        )}
      </div>
      {allowance.length > 0 ? (
        <div className="py-3.5">
          <p className="text-[10px] tracking-[0.16em] uppercase text-text-dim font-ui font-semibold">
            Carried as allowances
          </p>
          <p className="mt-1.5 text-[12.5px] text-text-muted">
            {allowance.map((r) => r.label).join(" · ")}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/* ── review ─────────────────────────────────────────────────────────── */

type ProgressShape = {
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

function ReviewSlide({
  slug,
  sections,
  answers,
  progress,
  onJumpModule,
  onJumpQuestion,
}: {
  slug: string;
  sections: InstrumentSection[];
  answers: Answers;
  progress: ProgressShape;
  onJumpModule: (sIdx: number) => void;
  onJumpQuestion: (q: InstrumentQuestion) => void;
}) {
  const remaining = progress.required - progress.answered;
  const [openModules, setOpenModules] = useState<Set<number>>(
    () => new Set(),
  );
  const toggle = (i: number) =>
    setOpenModules((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });

  return (
    <div>
      <p className="text-[10px] tracking-[0.2em] uppercase text-accent-light font-ui font-semibold">
        Review
      </p>
      <h2 className="mt-2.5 font-ui font-semibold tracking-[-0.02em] text-[24px] sm:text-[28px] leading-[1.2] text-text">
        {progress.complete
          ? "Your tender is ready to review."
          : `${remaining} required answer${remaining === 1 ? "" : "s"} to go.`}
      </h2>
      <p className="mt-2.5 text-[13.5px] leading-[1.65] text-text-muted max-w-[58ch]">
        {progress.complete
          ? "This is what the owner will read. Check the key metrics, open any module to read your answers, and submit from the tender page when you are satisfied."
          : "The key metrics so far, and every module below. Open one to see each answer, or jump straight to what is left."}
      </p>

      <MetricsPanel answers={answers} />

      <ul className="mt-8 border-y border-border-subtle">
        {sections.map((sec, sIdx) => {
          const p = progress.perSection[sIdx]!;
          const open = openModules.has(sIdx);
          const visible = sec.questions.filter((q) => gatePasses(q, answers));
          return (
            <li
              key={sec.id}
              className={cn(sIdx > 0 && "border-t border-border-subtle/60")}
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggle(sIdx)}
                  aria-expanded={open}
                  className="flex-1 min-w-0 flex items-center gap-3.5 py-3 text-left group"
                >
                  <span className="w-6 text-[11px] font-mono text-text-dim tabular-nums shrink-0">
                    {String(sIdx + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1 text-[13.5px] font-ui font-medium text-text truncate group-hover:text-accent-light transition-colors">
                    {sec.title}
                  </span>
                  <span className="text-[11.5px] text-text-dim tabular-nums shrink-0">
                    {p.answered}/{p.required}
                  </span>
                  {p.required > 0 && p.complete ? (
                    <span className="size-5 rounded-full bg-accent text-accent-contrast flex items-center justify-center shrink-0">
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                  ) : p.required > 0 ? (
                    <span className="size-5 rounded-full border border-[rgba(201,148,34,0.55)] text-[#8a6414] flex items-center justify-center shrink-0 text-[9px] font-semibold tabular-nums">
                      {p.required - p.answered}
                    </span>
                  ) : (
                    <span className="size-5 shrink-0" />
                  )}
                  <ChevronDown
                    className={cn(
                      "size-3.5 text-text-dim shrink-0 transition-transform",
                      open ? "rotate-180" : "",
                    )}
                  />
                </button>
                {!p.complete && p.required > 0 ? (
                  <button
                    type="button"
                    onClick={() => onJumpModule(sIdx)}
                    className="text-[11px] text-accent-light hover:text-accent-deep transition-colors shrink-0"
                  >
                    Finish
                  </button>
                ) : null}
              </div>
              {open ? (
                <ul className="pb-3">
                  {visible.map((q) => {
                    const done = isAnswerComplete(q, answers[q.id]);
                    const summary = summariseValue(q, answers[q.id]);
                    return (
                      <li key={q.id}>
                        <button
                          type="button"
                          onClick={() => onJumpQuestion(q)}
                          className="w-full flex items-start gap-3 pl-9 pr-1 py-1.5 text-left rounded-md hover:bg-[rgba(24,34,44,0.03)] transition-colors group/row"
                        >
                          <span className="w-8 pt-px text-[10px] font-mono text-text-dim tabular-nums shrink-0">
                            {q.ref ?? ""}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-[12px] leading-[1.45] text-text-muted">
                              {q.type === "matrix"
                                ? "Scope coverage grid"
                                : q.prompt}
                            </span>
                            <span
                              className={cn(
                                "block mt-0.5 text-[12px] leading-[1.45]",
                                summary
                                  ? "text-text font-medium"
                                  : done
                                    ? "text-text"
                                    : q.required
                                      ? "text-[#8a6414]"
                                      : "text-text-dim",
                              )}
                            >
                              {summary ??
                                (q.required ? "Not answered" : "Not provided")}
                            </span>
                          </span>
                          <ArrowRight className="size-3 mt-1 text-text-faint group-hover/row:text-text-dim transition-colors shrink-0" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
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

/** Key tender metrics, rolled up live from the answers. */
function MetricsPanel({ answers }: { answers: Answers }) {
  const m = useMemo(() => computeTenderMetrics(answers), [answers]);

  const fmtQ = (qid: string): string | null => {
    const q = getQuestion(qid);
    return q ? formatAnswer(q, answers[qid]) : null;
  };

  const cells: Array<{ k: string; v: string; sub?: string }> = [];
  if (m.priceExGst !== null) {
    cells.push({ k: "Contract price ex GST", v: formatAud(m.priceExGst) });
  }
  if (m.priceIncGst !== null && m.priceIncGst !== m.priceExGst) {
    cells.push({ k: "Including GST", v: formatAud(m.priceIncGst) });
  }
  if (m.depositPct !== null) {
    cells.push({ k: "Deposit", v: `${m.depositPct}%` });
  }
  if (m.validityDays !== null) {
    cells.push({ k: "Price holds for", v: `${m.validityDays} days` });
  }
  const lead = fmtQ("prog.lead_time");
  if (lead) cells.push({ k: "Lead time to site", v: lead });
  const start = fmtQ("programme.start");
  if (start) cells.push({ k: "Start on site", v: start });
  if (m.durationWeeks !== null) {
    cells.push({ k: "Build period", v: `${m.durationWeeks} weeks` });
  }
  if (m.psCount + m.pcCount > 0) {
    cells.push({
      k: "Allowances",
      v: formatAud(m.allowanceExposure),
      sub: `${m.psCount} provisional · ${m.pcCount} prime cost`,
    });
  }
  const covered = MATRIX_ROWS.length - m.coverage.unmarked;
  if (covered > 0) {
    cells.push({
      k: "Scope coverage",
      v: `${m.coverage.included} of ${MATRIX_ROWS.length} included`,
      sub: [
        m.coverage.allowance ? `${m.coverage.allowance} allowance` : null,
        m.coverage.excluded ? `${m.coverage.excluded} excluded` : null,
        m.coverage.notApplicable ? `${m.coverage.notApplicable} n/a` : null,
      ]
        .filter(Boolean)
        .join(" · ") || undefined,
    });
  }
  const dlp = fmtQ("contract.defects_liability");
  if (dlp) cells.push({ k: "Defects liability", v: dlp });
  if (m.ldPerWeek !== null) {
    cells.push({ k: "Liquidated damages", v: `${formatAud(m.ldPerWeek)} / week` });
  }
  if (m.alternativesCount > 0) {
    cells.push({
      k: "Alternatives offered",
      v: String(m.alternativesCount),
    });
  }

  if (cells.length === 0) return null;

  return (
    <div className="mt-8">
      <p className="text-[10px] tracking-[0.16em] uppercase text-text-dim font-ui font-semibold">
        Key tender metrics
      </p>
      <dl className="mt-3 flex flex-wrap gap-x-12 gap-y-5 border-y border-border-subtle py-5">
        {cells.map((c) => (
          <div key={c.k} className="min-w-[120px]">
            <dt className="text-[10px] tracking-[0.14em] uppercase text-text-dim font-ui font-semibold">
              {c.k}
            </dt>
            <dd className="mt-1 font-display text-[16px] sm:text-[17px] text-text tabular-nums leading-tight">
              {c.v}
            </dd>
            {c.sub ? (
              <dd className="mt-0.5 text-[10.5px] text-text-dim">{c.sub}</dd>
            ) : null}
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ── answer controls ────────────────────────────────────────────────── */

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

    case "declare":
    case "confirm": {
      const on = value === true;
      return (
        <button
          type="button"
          onClick={() => onAnswer(q.id, !on)}
          aria-pressed={on}
          className={cn(
            "flex items-center gap-3.5 rounded-lg border px-5 py-4 text-left transition-colors w-full max-w-[420px]",
            on
              ? "border-border-accent bg-[rgba(0,212,200,0.07)]"
              : "border-border-subtle bg-surface-1 card-elev hover:border-border-strong",
          )}
        >
          <span
            className={cn(
              "size-5 rounded-full border flex items-center justify-center shrink-0 transition-colors",
              on
                ? "border-transparent bg-accent text-accent-contrast"
                : "border-border-strong",
            )}
          >
            {on ? <Check className="size-3" strokeWidth={3.5} /> : null}
          </span>
          <span className="text-[14px] font-ui font-semibold text-text">
            {q.type === "declare" ? "I agree and declare" : "Confirmed, this is correct"}
          </span>
        </button>
      );
    }

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
          placeholder={q.required ? "Type your answer" : "Optional"}
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

/* ── scope matrix (full grid, kept for completeness) ────────────────── */

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
