"use client";

/**
 * The Tender Journey — the tender IS the deck.
 *
 * There is no form behind this page any more. A builder arrives at the
 * opening letterhead (what this is, how long it takes, that everything
 * saves as it lands), presses Start, and the deck begins: one question
 * per slide through twelve modules, a short bridge as each new module
 * opens, documents attached as module eleven, sign-off as twelve, and
 * a review that closes with the submit itself. Every headline figure
 * the platform shows an owner — price, build period, validity, start —
 * is mirrored from the deck's answers server-side, so the deck is the
 * single source of truth.
 *
 * Stages: opening → (bridge) → deck → sealed. Stage and slide changes
 * are entrance-animated only; an exit-completion dependency can wedge
 * the whole experience when frames starve (background tab, low power).
 *
 * The draft row is created the moment the builder presses Start — not
 * on page view — so browsing a project never litters my-tenders with
 * phantom drafts.
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
  ChevronDown,
  FileText,
  ListOrdered,
  Loader2,
  Paperclip,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import {
  sectionsFor,
  SCOPE_STATES,
  scopeMatrixRows,
  isAnswerComplete,
  computeTenderMetrics,
  gateAllows,
  questionInPlay,
  getQuestion,
  type InstrumentQuestion,
  type InstrumentSection,
} from "@/modules/tenders/instrument";
import {
  scheduleDivisions,
  readScheduleAnswer,
  deriveAllowanceRows,
  deriveScheduleExclusions,
  ownerExcludedItems,
  formatCitation,
  type ScheduleDivision,
  type ScheduleEntry,
  type ScheduleState,
  type TenderSchedule,
  type TenderScheduleItem,
} from "@/modules/tenders/schedule";
import {
  buildTenderDocument,
  type TenderDocumentModel,
} from "@/modules/tenders/document";
import { TenderDocumentSheet } from "@/components/tender-document/sheet";
import { formatAnswer, formatAud } from "@/modules/tenders/comparison";
import {
  saveTenderResponsesAction,
  startTenderAction,
  submitTenderAction,
  listMyTenderDocsAction,
} from "@/app/(app)/_actions/tenders";
import {
  initUploadAction,
  completeUploadAction,
  softDeleteAction,
} from "@/app/(app)/_actions/documents";
import type { Document } from "@/modules/documents";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";

type Answers = Record<string, unknown>;
type SaveState = "idle" | "saving" | "saved" | "error";

/** Plain value, or an updater applied to the latest saved answer. */
type AnswerPatch = unknown | ((prev: unknown) => unknown);

const MATRIX_ROWS = scopeMatrixRows();

/** The slide easing every movement in the journey shares. */
const EASE = [0.22, 1, 0.36, 1] as const;

/** Once a builder has met the three-beat intro, it stays met. */
const INTRO_SEEN_KEY = "bhq.tender-intro-seen.v1";

/** What prints beside the declarations — entity facts from the profile. */
export interface TenderLetterhead {
  companyName: string | null;
  abn: string | null;
  licence: string | null;
}

/* ── the module list ────────────────────────────────────────────────── */

/**
 * The deck runs on modules, not raw sections: the question sections
 * from the instrument, with the documents module (files, not answers)
 * seated before sign-off. One list drives the opening index, the
 * bridges, the contents control, the top bar and the review ledger,
 * so every surface agrees on numbering.
 */
export type JourneyModule =
  | { kind: "questions"; key: string; title: string; ask?: string; intro: string; section: InstrumentSection }
  | { kind: "docs"; key: "documents"; title: string; ask: string; intro: string };

const DOCS_MODULE: Extract<JourneyModule, { kind: "docs" }> = {
  kind: "docs",
  key: "documents",
  title: "Additional documents",
  ask: "Anything the owner should read beside your answers?",
  intro:
    "Optional. Insurance certificates, an indicative programme, past project sheets. They sit beside your tender, never instead of it.",
};

export function buildModules(
  version: number | null | undefined,
  hasSchedule = false,
): JourneyModule[] {
  const sections = sectionsFor(version);
  // Audience-flagged questions filter here, at the single point every
  // journey surface (deck, progress, contents, review, resume) builds
  // from — so a schedule round can never show a legacy slide.
  const out: JourneyModule[] = sections.map((s) => ({
    kind: "questions",
    key: s.id,
    title: s.title,
    ask: s.ask,
    intro: s.intro,
    section: {
      ...s,
      questions: s.questions.filter((q) => questionInPlay(q, hasSchedule)),
    },
  }));
  // Documents before sign-off when the set ends with one; appended
  // otherwise (v1 has no sign-off module).
  const signoffIdx = out.findIndex((m) => m.key === "signoff");
  if (signoffIdx === -1) out.push(DOCS_MODULE);
  else out.splice(signoffIdx, 0, DOCS_MODULE);
  return out;
}

// Answer completeness is shared with the server (isAnswerComplete in
// instrument.ts) so progress here and the submit gate can never disagree.

function gatePasses(q: InstrumentQuestion, answers: Answers): boolean {
  if (!q.showIf) return true;
  return gateAllows(q.showIf, answers[q.showIf.qid]);
}

/** Questions captured inside another slide, never a slide of their own
 *  (the per-trade amounts, the inline extra-exclusions). */
function isInlineQuestion(q: InstrumentQuestion): boolean {
  return q.type === "amounts" || q.inline === true;
}

/** "3 listed", "24 included · 2 excluded", or the plain formatted value. */
export function summariseValue(
  q: InstrumentQuestion,
  v: unknown,
): string | null {
  if (q.type === "items") {
    return Array.isArray(v) && v.length > 0 ? `${v.length} listed` : null;
  }
  if (q.type === "matrix") {
    const m = (v ?? {}) as Record<string, string>;
    const marked = MATRIX_ROWS.filter((r) => !!m[r.id]);
    if (marked.length === 0) return null;
    const count = (s: string) => marked.filter((r) => m[r.id] === s).length;
    const parts = [
      `${count("included")} included`,
      count("allowance") ? `${count("allowance")} allowance` : null,
      count("excluded") ? `${count("excluded")} excluded` : null,
      count("not_applicable") ? `${count("not_applicable")} n/a` : null,
    ].filter(Boolean);
    return parts.join(" · ");
  }
  if (q.type === "schedule") {
    const entries = Object.values(readScheduleAnswer(v));
    if (entries.length === 0) return null;
    const count = (s: string) => entries.filter((e) => e.s === s).length;
    const parts = [
      `${count("documented")} as documented`,
      count("allowance") ? `${count("allowance")} allowance` : null,
      count("excluded") ? `${count("excluded")} excluded` : null,
    ].filter(Boolean);
    return parts.join(" · ");
  }
  return formatAnswer(q, v);
}

/* ── component ──────────────────────────────────────────────────────── */

export function TenderJourney({
  slug,
  projectId,
  projectTitle,
  projectMeta,
  initialTenderId,
  instrumentVersion,
  initialAnswers,
  initialDocs,
  letterhead,
  schedule = null,
}: {
  slug: string;
  projectId: string;
  projectTitle: string;
  projectMeta: string;
  initialTenderId: string | null;
  instrumentVersion: number;
  initialAnswers: Array<{ qid: string; v: unknown }>;
  initialDocs: Document[];
  letterhead: TenderLetterhead | null;
  /**
   * The client's approved tender schedule, when the round was
   * published through the scope gate. Present, it flips modules 5, 6
   * and 7 from the generic trade grid to the line-by-line walk of the
   * client's pack.
   */
  schedule?: TenderSchedule | null;
}) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const hasSchedule = schedule !== null && schedule.items.length > 0;
  const MODULES = useMemo(
    () => buildModules(instrumentVersion, hasSchedule),
    [instrumentVersion, hasSchedule],
  );
  // The schedule's division walk — module 5's slides on a gate round.
  const SCHED_DIVISIONS = useMemo<ScheduleDivision[]>(
    () =>
      hasSchedule
        ? scheduleDivisions(schedule!).filter((d) => d.items.length > 0)
        : [],
    [hasSchedule, schedule],
  );

  const tenderIdRef = useRef<string | null>(initialTenderId);
  const [starting, setStarting] = useState(false);

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
  const [docs, setDocs] = useState<Document[]>(initialDocs);

  // ── autosave pipeline ────────────────────────────────────────────
  const pending = useRef<Map<string, unknown>>(new Map());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef(false);

  const flush = useCallback(async () => {
    const tenderId = tenderIdRef.current;
    if (!tenderId || inflight.current || pending.current.size === 0) return;
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
  }, []);

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

  // ── progress (questions only; documents are optional colour) ─────
  const progress = useMemo(() => {
    const perModule = MODULES.map((m) => {
      if (m.kind === "docs") {
        return { key: m.key, required: 0, answered: 0, complete: true };
      }
      const visible = m.section.questions.filter((q) => gatePasses(q, answers));
      const required = visible.filter((q) => q.required);
      const answered = required.filter((q) =>
        isAnswerComplete(q, answers[q.id], { schedule }),
      );
      return {
        key: m.key,
        required: required.length,
        answered: answered.length,
        complete: answered.length >= required.length,
      };
    });
    const required = perModule.reduce((n, s) => n + s.required, 0);
    const answered = perModule.reduce((n, s) => n + s.answered, 0);
    return {
      perModule,
      required,
      answered,
      complete: answered >= required,
      pct: required === 0 ? 100 : Math.round((answered / required) * 100),
    };
  }, [MODULES, answers, schedule]);

  // ── the deck: one slide per visible question; the scope matrix
  //    fans out one slide per row; documents is one slide; review
  //    closes it ────────────────────────────────────────────────────
  type Slide =
    | {
        key: string;
        kind: "q";
        mIdx: number;
        module: Extract<JourneyModule, { kind: "questions" }>;
        q: InstrumentQuestion;
      }
    | {
        key: string;
        kind: "row";
        mIdx: number;
        module: Extract<JourneyModule, { kind: "questions" }>;
        q: InstrumentQuestion;
        row: { id: string; label: string };
        rIdx: number;
      }
    | {
        key: string;
        kind: "division";
        mIdx: number;
        module: Extract<JourneyModule, { kind: "questions" }>;
        q: InstrumentQuestion;
        division: ScheduleDivision;
        dIdx: number;
      }
    | { key: "documents"; kind: "docs"; mIdx: number }
    | { key: "review"; kind: "review" };

  const deck = useMemo<Slide[]>(() => {
    const out: Slide[] = [];
    MODULES.forEach((m, mIdx) => {
      if (m.kind === "docs") {
        out.push({ key: "documents", kind: "docs", mIdx });
        return;
      }
      for (const q of m.section.questions) {
        // Inline questions live inside another slide, not their own.
        if (isInlineQuestion(q)) continue;
        if (!gatePasses(q, answers)) continue;
        if (q.type === "matrix") {
          MATRIX_ROWS.forEach((row, rIdx) => {
            out.push({
              key: `${q.id}:${row.id}`,
              kind: "row",
              mIdx,
              module: m,
              q,
              row,
              rIdx,
            });
          });
        } else if (q.type === "schedule") {
          SCHED_DIVISIONS.forEach((division, dIdx) => {
            out.push({
              key: `${q.id}:${division.divisionId}`,
              kind: "division",
              mIdx,
              module: m,
              q,
              division,
              dIdx,
            });
          });
        } else {
          out.push({ key: q.id, kind: "q", mIdx, module: m, q });
        }
      }
    });
    out.push({ key: "review", kind: "review" });
    return out;
  }, [MODULES, SCHED_DIVISIONS, answers]);

  const divisionDone = useCallback(
    (division: ScheduleDivision, value: unknown): boolean => {
      const marks = readScheduleAnswer(value);
      return division.items.every((item) => {
        const e = marks[item.itemId];
        if (!e) return false;
        return e.s !== "allowance" || (typeof e.a === "number" && e.a > 0);
      });
    },
    [],
  );

  const slideDone = useCallback(
    (sl: Slide): boolean => {
      if (sl.kind === "review" || sl.kind === "docs") return true;
      if (sl.kind === "row") {
        const v = answers[sl.q.id];
        return (
          !!v &&
          typeof v === "object" &&
          !!(v as Record<string, unknown>)[sl.row.id]
        );
      }
      if (sl.kind === "division") {
        return divisionDone(sl.division, answers[sl.q.id]);
      }
      return isAnswerComplete(sl.q, answers[sl.q.id], { schedule });
    },
    [answers, divisionDone, schedule],
  );

  // Resume at the first unanswered REQUIRED question; everything
  // required answered → the review slide. Optional questions and the
  // documents slide never anchor resume — a builder who skipped
  // colour on the way through should not be dragged back to it.
  const [cursor, setCursor] = useState(() => {
    const init = Object.fromEntries(initialAnswers.map((a) => [a.qid, a.v]));
    const initDivisions = hasSchedule
      ? scheduleDivisions(schedule!).filter((d) => d.items.length > 0)
      : [];
    let i = 0;
    for (const m of buildModules(instrumentVersion, hasSchedule)) {
      if (m.kind === "docs") {
        i++;
        continue;
      }
      for (const q of m.section.questions) {
        if (isInlineQuestion(q)) continue;
        if (q.showIf && !gateAllows(q.showIf, init[q.showIf.qid])) continue;
        if (q.type === "matrix") {
          for (const row of MATRIX_ROWS) {
            const v = init[q.id] as Record<string, unknown> | undefined;
            if (q.required && (!v || !v[row.id])) return i;
            i++;
          }
        } else if (q.type === "schedule") {
          for (const d of initDivisions) {
            const marks = readScheduleAnswer(init[q.id]);
            const gap = d.items.some((item) => {
              const e = marks[item.itemId];
              return (
                !e ||
                (e.s === "allowance" && !(typeof e.a === "number" && e.a > 0))
              );
            });
            if (q.required && gap) return i;
            i++;
          }
        } else {
          if (
            q.required &&
            !isAnswerComplete(q, init[q.id], { schedule })
          ) {
            return i;
          }
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

  // ── stages: (intro) → opening → (bridge) → deck → sealed ─────────
  // A bridge HOLDS until the builder clicks or presses a key — module
  // openings are read at the reader's pace, never a timer's.
  const [stage, setStage] = useState<
    "intro" | "opening" | "bridge" | "deck" | "sealed"
  >("opening");

  // The three-beat introduction, for a builder's very first encounter:
  // why this exists, what we build together, what it asks of them.
  // Shown once (remembered on this device), always skippable, and
  // re-viewable any time with ?intro=1. Decided after hydration so the
  // server render never has to guess at localStorage.
  useEffect(() => {
    if (progress.answered > 0) return;
    let show = false;
    try {
      const forced = new URLSearchParams(window.location.search).get("intro");
      if (forced === "1") show = true;
      else if (window.localStorage.getItem(INTRO_SEEN_KEY) !== "1") {
        show = true;
      }
    } catch {
      // Storage unavailable — never block the journey over a nicety.
    }
    if (show) setStage("intro");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishIntro = useCallback(() => {
    try {
      window.localStorage.setItem(INTRO_SEEN_KEY, "1");
    } catch {
      // Ignore — worst case the intro shows again next visit.
    }
    setStage("opening");
  }, []);
  type Bridge = { moduleIdx: number; target: number; grand: boolean };
  const [bridge, setBridge] = useState<Bridge | null>(null);
  const bridgeRef = useRef<Bridge | null>(null);
  bridgeRef.current = bridge;

  const commitBridge = useCallback(() => {
    const b = bridgeRef.current;
    if (b) {
      setDir(1);
      setCursor(Math.max(0, Math.min(b.target, deck.length - 1)));
    }
    setBridge(null);
    setStage("deck");
  }, [deck.length]);

  const startBridge = useCallback(
    (moduleIdx: number, target: number, grand: boolean) => {
      setBridge({ moduleIdx, target, grand });
      setStage("bridge");
    },
    [],
  );

  // Start: create the draft if none exists yet, then enter the deck.
  // A first-ever start earns the grand opening; a resume gets the
  // standard module bridge.
  const begin = useCallback(async () => {
    if (starting) return;
    if (!tenderIdRef.current) {
      setStarting(true);
      try {
        const r = await startTenderAction(projectId);
        if (!r.ok) {
          toast.error("Couldn't start your tender", r.error.message);
          return;
        }
        tenderIdRef.current = r.value.id;
      } finally {
        setStarting(false);
      }
    }
    const sl = deck[idxRef.current]!;
    if (reduceMotion || sl.kind === "review") {
      setStage("deck");
      return;
    }
    startBridge(sl.mIdx, idxRef.current, progress.answered === 0);
  }, [starting, projectId, deck, reduceMotion, startBridge, progress.answered]);

  // Advance one slide; crossing into a new module opens its bridge.
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
      nxt.mIdx !== cur.mIdx
    ) {
      startBridge(nxt.mIdx, target, false);
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
    },
    [],
  );

  const [contentsOpen, setContentsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Enter continues whenever the current slide is answered.
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (stage !== "deck" || previewOpen) return;
      if (e.key !== "Enter") return;
      const t = e.target as HTMLElement;
      if (t.tagName === "TEXTAREA" || t.tagName === "BUTTON") return;
      if (slide.kind !== "review" && slideDone(slide)) {
        e.preventDefault();
        next();
      }
    },
    [stage, slide, slideDone, next, previewOpen],
  );

  // The opening starts and a bridge continues on Enter, Space or Escape.
  // The intro runs its own keys, so it is left alone here.
  useEffect(() => {
    if (
      stage === "deck" ||
      stage === "sealed" ||
      stage === "intro" ||
      previewOpen
    )
      return;
    const h = (e: KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " " && e.key !== "Escape") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "A" || t.tagName === "BUTTON")) return;
      e.preventDefault();
      if (stage === "opening") void begin();
      else commitBridge();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [stage, begin, commitBridge, previewOpen]);

  // ── lookups for contents + review jumps ──────────────────────────
  const slideIndex = useMemo(() => {
    const byQ = new Map<string, number>();
    const byRow = new Map<string, number>();
    let docsIdx = -1;
    deck.forEach((sl, i) => {
      if (sl.kind === "review") return;
      if (sl.kind === "docs") {
        docsIdx = i;
        return;
      }
      if (!byQ.has(sl.q.id)) byQ.set(sl.q.id, i);
      if (sl.kind === "row" || sl.kind === "division") byRow.set(sl.key, i);
    });
    return { byQ, byRow, docsIdx };
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
      if (q.type === "schedule") {
        const gap = SCHED_DIVISIONS.find(
          (d) => !divisionDone(d, liveAnswers.current[q.id]),
        );
        const i = gap
          ? slideIndex.byRow.get(`${q.id}:${gap.divisionId}`)
          : slideIndex.byQ.get(q.id);
        if (i !== undefined) jumpTo(i);
        return;
      }
      const i = slideIndex.byQ.get(q.id);
      if (i !== undefined) jumpTo(i);
    },
    [slideIndex, jumpTo, SCHED_DIVISIONS, divisionDone],
  );

  // Jump helper: first not-done slide of a module, else its start.
  const firstGapInModule = useCallback(
    (mIdx: number) => {
      const i = deck.findIndex(
        (sl) =>
          sl.kind !== "review" && sl.mIdx === mIdx && !slideDone(sl),
      );
      return i === -1
        ? deck.findIndex((sl) => sl.kind !== "review" && sl.mIdx === mIdx)
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
    const m = MODULES[slide.mIdx]!;
    const inMod = deck.filter(
      (sl) => sl.kind !== "review" && sl.mIdx === slide.mIdx,
    );
    return {
      no: slide.mIdx + 1,
      pos: inMod.findIndex((sl) => sl.key === slide.key) + 1,
      count: inMod.length,
      title: m.title,
      docs: m.kind === "docs",
    };
  }, [MODULES, deck, slide]);

  // The document, assembled live from the answers — what the preview
  // shows mid-deck is exactly what the PDF becomes.
  const docModel = useMemo(
    () =>
      buildTenderDocument({
        tenderId: tenderIdRef.current ?? "00000000-pending",
        status: "draft",
        submittedAt: null,
        instrumentVersion,
        answers,
        docs: docs.map((d) => ({
          filename: d.filename,
          sizeBytes: d.sizeBytes,
        })),
        project: { title: projectTitle, meta: projectMeta },
        builder: {
          entity: letterhead?.companyName ?? null,
          abn: letterhead?.abn ?? null,
          licence: letterhead?.licence ?? null,
        },
        schedule,
        now: new Date(),
      }),
    [
      answers,
      docs,
      instrumentVersion,
      projectTitle,
      projectMeta,
      letterhead,
      schedule,
    ],
  );

  // ── schedule marks ────────────────────────────────────────────────
  // One write path for every division-slide tap. The first mark also
  // pins the run the builder is answering against; leaving "allowance"
  // clears the figure so a stale amount never prints.
  const markScheduleItem = useCallback(
    (q: InstrumentQuestion, item: TenderScheduleItem, next: ScheduleEntry) => {
      // Pin (or re-pin after an addendum) the run these marks answer.
      if (
        schedule &&
        liveAnswers.current["scope.schedule_run"] !== schedule.runId
      ) {
        queue("scope.schedule_run", schedule.runId);
      }
      queue(q.id, (prev: unknown) => {
        const cur = { ...readScheduleAnswer(prev) };
        cur[item.itemId] =
          next.s === "allowance"
            ? { s: next.s, a: next.a ?? null }
            : { s: next.s };
        return cur;
      });
    },
    [queue, schedule],
  );

  // ── submit ───────────────────────────────────────────────────────
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = useCallback(async () => {
    const tenderId = tenderIdRef.current;
    if (!tenderId || submitting) return;
    setSubmitting(true);
    try {
      // Land any pending answers before the gate reads them.
      if (timer.current) clearTimeout(timer.current);
      await flush();
      const r = await submitTenderAction(tenderId);
      if (!r.ok) {
        const missing =
          (r.error.details?.missing as string[] | undefined) ?? [];
        toast.error(
          "Couldn't submit",
          missing.length > 0
            ? `Still missing: ${missing.join(", ")}`
            : r.error.message,
        );
        return;
      }
      setStage("sealed");
      // Let the seal land, then let the server swap this page to the
      // submitted state.
      setTimeout(() => router.refresh(), 2100);
    } finally {
      setSubmitting(false);
    }
  }, [submitting, flush, router]);

  // An addendum re-issued the pack after this draft pinned an earlier
  // one. The deck already answers the CURRENT schedule; the strip
  // tells the builder why lines may read differently, and the submit
  // gate holds any mark the revised schedule no longer carries.
  const pinnedRunAnswer = answers["scope.schedule_run"];
  const packReissued =
    hasSchedule &&
    typeof pinnedRunAnswer === "string" &&
    pinnedRunAnswer !== schedule!.runId;

  return (
    <div
      // Fills the viewport under the 56px app topbar so the footer
      // controls always sit on screen.
      className="min-h-[calc(100dvh-3.5rem)] flex flex-col"
      onKeyDown={onKeyDown}
    >
      {packReissued && stage !== "sealed" ? (
        <div className="bg-[rgba(201,148,34,0.08)] border-b border-[rgba(201,148,34,0.35)]">
          <p className="px-4 sm:px-6 lg:px-10 py-2 mx-auto max-w-[1100px] text-[12px] text-[#8a6414]">
            An addendum re-issued the tender schedule since this draft
            began. Review module 5 — your marks now answer the revised
            lines.
          </p>
        </div>
      ) : null}
      {/* ── slim bar: exit · where you are · contents · save ───────
          Sticky just below the app topbar (h-14, z-30) so it reads as
          the journey's sub-header; the solid canvas background makes
          slides disappear beneath it instead of ghosting through. */}
      <div className="sticky top-14 z-20 bg-bg border-b border-border-subtle">
        <div className="px-4 sm:px-6 lg:px-10 py-3 mx-auto max-w-[1100px] flex items-center justify-between gap-4">
          <Link
            href={`/builder/projects/${slug}`}
            className="inline-flex items-center gap-1.5 text-[12px] text-text-dim hover:text-text transition-colors shrink-0"
          >
            <ArrowLeft className="size-3.5" />
            Save and exit
          </Link>

          <div className="min-w-0 text-center">
            {stage === "opening" || stage === "intro" ? (
              <p className="text-[10px] tracking-[0.2em] uppercase text-text-dim font-ui font-semibold truncate">
                Tender submission
              </p>
            ) : stage === "sealed" ? (
              <p className="text-[10px] tracking-[0.2em] uppercase text-accent-light font-ui font-semibold truncate">
                Submitted
              </p>
            ) : stage === "bridge" && bridge ? (
              <p className="text-[10px] tracking-[0.2em] uppercase text-text-dim font-ui font-semibold truncate">
                Module {bridge.moduleIdx + 1} of {MODULES.length}
              </p>
            ) : slide.kind === "review" ? (
              <p className="text-[10px] tracking-[0.2em] uppercase text-accent-light font-ui font-semibold truncate">
                Review and submit
              </p>
            ) : modPos ? (
              <>
                <p className="text-[10px] tracking-[0.2em] uppercase text-accent-light font-ui font-semibold truncate">
                  Module {modPos.no} of {MODULES.length} · {modPos.title}
                </p>
                <p className="mt-0.5 text-[10.5px] text-text-dim truncate hidden sm:block tabular-nums">
                  {modPos.docs
                    ? "Optional attachments"
                    : `Question ${modPos.pos} of ${modPos.count} in this module`}
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
            {stage !== "opening" ? (
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-border-subtle text-[11.5px] text-text-muted hover:border-border-strong hover:text-text transition-colors"
              >
                <FileText className="size-3.5" />
                <span className="hidden sm:inline">Preview</span>
              </button>
            ) : null}
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
                  modules={MODULES}
                  answers={answers}
                  schedule={schedule}
                  perModule={progress.perModule}
                  docsCount={docs.length}
                  currentModule={slide.kind === "review" ? null : slide.mIdx}
                  onClose={() => setContentsOpen(false)}
                  onJumpModule={(mIdx) => {
                    setContentsOpen(false);
                    jumpTo(firstGapInModule(mIdx));
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
        {stage === "intro" ? (
          <IntroBeats
            reduceMotion={!!reduceMotion}
            onDone={finishIntro}
          />
        ) : stage === "opening" ? (
          <div className="flex-1 flex flex-col">
            <OpeningSlide
              slug={slug}
              projectTitle={projectTitle}
              projectMeta={projectMeta}
              modules={MODULES}
              perModule={progress.perModule}
              progress={progress}
              docsCount={docs.length}
              starting={starting}
              onBegin={() => void begin()}
            />
          </div>
        ) : stage === "sealed" ? (
          <SealedMoment />
        ) : stage === "bridge" && bridge ? (
          <div
            key={`bridge-${bridge.moduleIdx}-${bridge.grand ? "g" : "s"}`}
            className="flex-1 flex flex-col"
          >
            <ModuleBridge
              no={bridge.moduleIdx + 1}
              total={MODULES.length}
              module={MODULES[bridge.moduleIdx]!}
              grand={bridge.grand}
              projectTitle={projectTitle}
              onContinue={commitBridge}
            />
          </div>
        ) : (
          <motion.div
            key="deck"
            initial={{ opacity: 0, y: 10 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: { duration: 0.32, ease: EASE },
            }}
            className="flex-1 flex flex-col"
          >
            {/* Keyed remount, entrance only: the next slide glides in
                and the old one simply goes. No exit animation — an
                exit-completion dependency can wedge the whole deck
                when frames starve. */}
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
                    modules={MODULES}
                    answers={answers}
                    schedule={schedule}
                    progress={progress}
                    docs={docs}
                    model={docModel}
                    onPreview={() => setPreviewOpen(true)}
                    confirming={confirmingSubmit}
                    submitting={submitting}
                    onConfirmChange={setConfirmingSubmit}
                    onSubmit={() => void onSubmit()}
                    onJumpModule={(mIdx) => jumpTo(firstGapInModule(mIdx))}
                    onJumpQuestion={jumpToQuestion}
                    onJumpDocs={() =>
                      slideIndex.docsIdx >= 0 && jumpTo(slideIndex.docsIdx)
                    }
                  />
                ) : slide.kind === "docs" ? (
                  <DocsSlide
                    projectId={projectId}
                    tenderId={tenderIdRef.current}
                    docs={docs}
                    onDocsChange={setDocs}
                  />
                ) : slide.kind === "division" ? (
                  <DivisionSlide
                    q={slide.q}
                    division={slide.division}
                    dIdx={slide.dIdx}
                    total={SCHED_DIVISIONS.length}
                    marks={readScheduleAnswer(answers[slide.q.id])}
                    onMark={(item, entry) => {
                      markScheduleItem(slide.q, item, entry);
                      // The last unmarked line completing the division
                      // advances the deck — unless the mark is an
                      // allowance, which opens its amount field and
                      // must hold the slide for the figure.
                      if (entry.s !== "allowance") {
                        const after = {
                          ...readScheduleAnswer(
                            liveAnswers.current[slide.q.id],
                          ),
                        };
                        after[item.itemId] = entry;
                        if (divisionDone(slide.division, after)) {
                          if (advanceTimer.current) {
                            clearTimeout(advanceTimer.current);
                          }
                          advanceTimer.current = setTimeout(
                            () => advanceRef.current(),
                            420,
                          );
                        }
                      }
                    }}
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
                    amount={(() => {
                      const a = (
                        (answers["scope.amounts"] as Record<string, unknown>) ??
                        {}
                      )[slide.row.id];
                      return typeof a === "number" ? a : null;
                    })()}
                    onMark={(state) => {
                      // Marking included opens the optional amount field,
                      // so the deck stays put; every other state keeps
                      // the rapid-fire auto-advance. Leaving "included"
                      // clears any amount so a stale figure never prints.
                      if (state !== "included") {
                        queue("scope.amounts", (prev: unknown) => {
                          const cur = {
                            ...((prev as Record<string, unknown>) ?? {}),
                          };
                          delete cur[slide.row.id];
                          return cur;
                        });
                      }
                      answerAndMaybeAdvance(
                        slide.q.id,
                        (prev: unknown) => ({
                          ...((prev as Record<string, string>) ?? {}),
                          [slide.row.id]: state,
                        }),
                        state !== "included",
                      );
                    }}
                    onAmount={(v) =>
                      queue("scope.amounts", (prev: unknown) => {
                        const cur = {
                          ...((prev as Record<string, unknown>) ?? {}),
                        };
                        if (v === null) delete cur[slide.row.id];
                        else cur[slide.row.id] = v;
                        return cur;
                      })
                    }
                  />
                ) : (
                  <div>
                    <p className="text-[10px] tracking-[0.2em] uppercase text-text-dim font-ui font-semibold">
                      {slide.q.ref ? (
                        <span className="text-accent-light">
                          {slide.q.ref}
                        </span>
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
                    {slide.q.id === "elig.authority" && letterhead ? (
                      <LetterheadCard letterhead={letterhead} />
                    ) : null}
                    {slide.q.id === "excl.derived_confirm" ? (
                      <DerivedExclusions
                        answers={answers}
                        schedule={schedule}
                        onExtraChange={(update) =>
                          queue("scope.exclusions_list", (prev: unknown) =>
                            update(
                              Array.isArray(prev)
                                ? (prev as Record<string, unknown>[])
                                : [],
                            ),
                          )
                        }
                      />
                    ) : null}
                    {slide.q.id === "pcps.schedule_confirm" && schedule ? (
                      <DerivedAllowances
                        answers={answers}
                        schedule={schedule}
                      />
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
                      {slide.q.id === "creds.references" ? (
                        <ReferencesDupHint value={answers["creds.references"]} />
                      ) : null}
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

      {/* ── live document preview ────────────────────────────────── */}
      {previewOpen ? (
        <DocumentPreviewOverlay
          model={docModel}
          downloadHref={
            tenderIdRef.current
              ? `/builder/projects/${slug}/tender/document`
              : null
          }
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
    </div>
  );
}

/* ── live document preview overlay ──────────────────────────────────── */

function DocumentPreviewOverlay({
  model,
  downloadHref,
  onClose,
}: {
  model: TenderDocumentModel;
  downloadHref: string | null;
  onClose: () => void;
}) {
  // Escape closes; the deck's own key handlers sit behind the overlay.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col">
      <div
        className="absolute inset-0 bg-[rgba(24,34,44,0.45)]"
        aria-hidden
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE }}
        className="relative flex-1 flex flex-col min-h-0 mx-auto w-full max-w-[820px] px-4 sm:px-6 pt-6 sm:pt-10 pb-0"
      >
        <div className="flex items-center justify-between gap-3 pb-3">
          <div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#9fd8d2] font-ui font-semibold">
              Your tender document
            </p>
            <p className="mt-0.5 text-[11.5px] text-[rgba(255,255,255,0.75)]">
              Assembled live from your answers.
              {model.isDraft ? " The watermark lifts on submission." : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {downloadHref ? (
              <a
                href={downloadHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-accent text-accent-contrast text-[12px] font-semibold hover:bg-accent-hover transition-colors"
              >
                <FileText className="size-3.5" />
                Download PDF
              </a>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="size-9 rounded-full border border-[rgba(255,255,255,0.3)] text-white/85 hover:text-white hover:border-white/60 transition-colors flex items-center justify-center"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto pb-10 overscroll-contain">
          <TenderDocumentSheet model={model} />
        </div>
      </motion.div>
    </div>
  );
}

/* ── the three-beat introduction ────────────────────────────────────── */

const INTRO_BEATS = [
  {
    key: "why",
    kicker: "Why this exists",
    headline: "The care you take should be easy to see.",
    body: "Owners often weigh quotes that look nothing alike, where a considered price reads much the same as a rushed one. This presents your tender clearly and consistently, so your work is judged on its merits rather than its formatting.",
    cta: "Continue",
  },
  {
    key: "what",
    kicker: "How it works",
    headline: "You answer the questions. We prepare the tender.",
    body: "Twelve short sections cover your eligibility, the project, your credentials, your price and your terms. Your answers become a formal document on your letterhead, with schedules and a signature, ready to submit.",
    cta: "Continue",
  },
  {
    key: "cost",
    kicker: "What to expect",
    headline: "About thirty minutes, and less each time after.",
    body: "Most questions are a single tap, and everything saves as you go, so you can step away and return whenever suits. The details that describe your business carry across to your future tenders, and you can preview the finished document at any point.",
    cta: "Begin",
  },
] as const;

/**
 * The once-only welcome: three beats that make the case before the
 * letterhead screen takes over. Whole-surface click, Enter or the
 * button advances; Escape or the quiet link skips. Entrance-only
 * choreography throughout, and each beat's composition is drawn in
 * the document's own visual language.
 */
function IntroBeats({
  reduceMotion,
  onDone,
}: {
  reduceMotion: boolean;
  onDone: () => void;
}) {
  const [beat, setBeat] = useState(0);
  const b = INTRO_BEATS[beat]!;
  const last = beat === INTRO_BEATS.length - 1;

  const advance = useCallback(() => {
    if (beat >= INTRO_BEATS.length - 1) onDone();
    else setBeat((x) => x + 1);
  }, [beat, onDone]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onDone();
        return;
      }
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowRight") {
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === "A" || t.tagName === "BUTTON")) return;
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [advance, onDone]);

  const d = (delay: number) => (reduceMotion ? 0 : delay);

  return (
    <div className="flex-1 flex flex-col relative">
      <button
        type="button"
        onClick={onDone}
        className="absolute top-5 right-5 sm:right-10 z-10 text-[11.5px] text-text-dim hover:text-text transition-colors"
      >
        Skip the intro
      </button>

      <button
        type="button"
        onClick={advance}
        aria-label={last ? "Begin" : "Next"}
        className="flex-1 flex items-center justify-center px-6 pb-10 text-center cursor-pointer select-none"
      >
        <motion.div
          key={b.key}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="max-w-[600px] w-full"
        >
          <div className="h-[132px] flex items-end justify-center mb-9">
            {b.key === "why" ? (
              <IntroArtPile d={d} />
            ) : b.key === "what" ? (
              <IntroArtDocument d={d} />
            ) : (
              <IntroArtTimeline d={d} />
            )}
          </div>

          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: d(0.5), ease: EASE }}
            className="text-[10px] tracking-[0.3em] uppercase text-accent-deep font-ui font-semibold"
          >
            {b.kicker}
          </motion.p>
          <motion.h2
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: d(0.62), ease: EASE }}
            className="mt-3.5 font-display tracking-[-0.01em] text-[28px] sm:text-[36px] leading-[1.12] text-text"
          >
            {b.headline}
          </motion.h2>
          <motion.p
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.55, delay: d(0.85), ease: EASE }}
            className="mt-4 text-[13.5px] leading-[1.75] text-text-muted max-w-[52ch] mx-auto"
          >
            {b.body}
          </motion.p>

          <motion.span
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: d(1.1), ease: EASE }}
            className="mt-8 inline-flex items-center gap-2 h-11 px-6 rounded-full bg-accent text-accent-contrast text-[13px] font-semibold tracking-[0.02em] shadow-[0_0_0_1px_rgba(0,212,200,0.35)]"
          >
            {b.cta}
            <ArrowRight className="size-4" />
          </motion.span>
        </motion.div>
      </button>

      {/* progress dots */}
      <div className="pb-8 flex items-center justify-center gap-2">
        {INTRO_BEATS.map((x, i) => (
          <button
            key={x.key}
            type="button"
            onClick={() => setBeat(i)}
            aria-label={`Part ${i + 1}`}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === beat
                ? "w-6 bg-accent"
                : "w-1.5 bg-[rgba(24,34,44,0.18)] hover:bg-[rgba(24,34,44,0.3)]",
            )}
          />
        ))}
      </div>
    </div>
  );
}

/** Beat one: the pile — five quotes in five formats, none aligned. */
function IntroArtPile({ d }: { d: (n: number) => number }) {
  const sheets = [
    { rot: -7, x: -64, delay: 0.08 },
    { rot: 5, x: 0, delay: 0.2 },
    { rot: -2, x: 62, delay: 0.32 },
  ];
  return (
    <div className="relative w-[240px] h-[120px]" aria-hidden>
      {sheets.map((sh) => (
        <motion.div
          key={sh.rot}
          initial={{ opacity: 0, y: 26, rotate: 0 }}
          animate={{ opacity: 1, y: 0, rotate: sh.rot }}
          transition={{ duration: 0.55, delay: d(sh.delay), ease: EASE }}
          style={{ left: 90 + sh.x }}
          className="absolute bottom-0 w-[76px] h-[100px] bg-white rounded-[2px] shadow-[0_1px_2px_rgba(24,34,44,0.12),_0_10px_24px_-12px_rgba(24,34,44,0.3)] border border-[#eee9dd] px-2.5 pt-2.5"
        >
          <div className="h-[3px] w-7 bg-[#c9c3b2]" />
          {[16, 24, 32, 40, 48].map((top, i) => (
            <div
              key={top}
              style={{ marginTop: i === 0 ? 9 : 5, width: `${88 - ((i * 29) % 42)}%` }}
              className="h-[2.5px] bg-[#eee9dd]"
            />
          ))}
        </motion.div>
      ))}
    </div>
  );
}

/** Beat two: one crisp document assembling — rule, lines, seal. */
function IntroArtDocument({ d }: { d: (n: number) => number }) {
  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: d(0.08), ease: EASE }}
      className="relative w-[104px] h-[128px] bg-white rounded-[3px] shadow-[0_1px_2px_rgba(24,34,44,0.12),_0_16px_36px_-16px_rgba(24,34,44,0.35)] border border-[#eee9dd] px-3.5 pt-3.5 text-left"
    >
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.45, delay: d(0.35), ease: EASE }}
        className="h-[3px] bg-[#18222c] origin-left"
      />
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.4, delay: d(0.5 + i * 0.09), ease: EASE }}
          style={{ width: `${92 - i * 14}%` }}
          className="h-[2.5px] bg-[#e3ded2] origin-left mt-[9px]"
        />
      ))}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: d(0.95), ease: EASE }}
        className="absolute bottom-3 right-3 size-5 rounded-[2px] bg-[rgba(0,212,200,0.16)] border border-[#0a7d73]/50 flex items-center justify-center"
      >
        <Check className="size-3 text-[#0a7d73]" strokeWidth={3} />
      </motion.div>
    </motion.div>
  );
}

/** Beat three: the timeline — twelve ticks, one half hour. */
function IntroArtTimeline({ d }: { d: (n: number) => number }) {
  return (
    <div className="relative w-[280px] h-[90px]" aria-hidden>
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.7, delay: d(0.1), ease: EASE }}
        className="absolute bottom-[34px] left-0 right-0 h-px bg-[rgba(24,34,44,0.25)] origin-left"
      />
      {Array.from({ length: 12 }, (_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: 1, scaleY: 1 }}
          transition={{ duration: 0.3, delay: d(0.3 + i * 0.055), ease: EASE }}
          style={{ left: `${(i / 11) * 100}%` }}
          className={cn(
            "absolute bottom-[30px] w-px h-[9px] origin-bottom -translate-x-1/2",
            i === 11 ? "bg-accent-deep w-[2px] h-[13px]" : "bg-[rgba(24,34,44,0.3)]",
          )}
        />
      ))}
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: d(1.0), ease: EASE }}
        className="absolute bottom-0 left-1/2 -translate-x-1/2 font-mono text-[11px] text-text-dim tabular-nums"
      >
        12 modules · about 30 min
      </motion.p>
    </div>
  );
}

/* ── the opening ────────────────────────────────────────────────────── */

function OpeningSlide({
  slug,
  projectTitle,
  projectMeta,
  modules,
  perModule,
  progress,
  docsCount,
  starting,
  onBegin,
}: {
  slug: string;
  projectTitle: string;
  projectMeta: string;
  modules: JourneyModule[];
  perModule: Array<{
    key: string;
    required: number;
    answered: number;
    complete: boolean;
  }>;
  progress: {
    answered: number;
    required: number;
    pct: number;
    complete: boolean;
  };
  docsCount: number;
  starting: boolean;
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
      <motion.p {...rise(0.18)} className="mt-2 text-[12.5px] text-text-dim">
        {projectMeta}
      </motion.p>
      <motion.p
        {...rise(0.24)}
        className="mt-4 text-[14px] sm:text-[14.5px] leading-[1.7] text-text-muted max-w-[62ch]"
      >
        We are about to build your tender together: {modules.length} short
        modules that turn what you already know into a document that
        competes properly, presented the way owners and architects expect
        to read one. Most questions are a single tap, everything saves the
        moment it lands, and you can leave and pick it up whenever suits.
        When the modules are done, you review the finished document and
        submit it from the final page.
      </motion.p>

      <motion.dl
        {...rise(0.32)}
        className="mt-8 grid grid-cols-3 border-y border-border-subtle divide-x divide-border-subtle"
      >
        {[
          { k: "Modules", v: String(modules.length) },
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
        {...rise(0.42)}
        className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-1.5"
      >
        {modules.map((m, i) => {
          const p = perModule[i];
          const done =
            m.kind === "docs"
              ? docsCount > 0
              : !!p && p.required > 0 && p.complete;
          return (
            <li key={m.key} className="flex items-center gap-3 py-1">
              <span className="w-6 text-[11px] font-mono text-text-dim tabular-nums shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 min-w-0 text-[13px] text-text-muted truncate">
                {m.title}
              </span>
              {done ? (
                <Check
                  className="size-3.5 text-accent-light shrink-0"
                  strokeWidth={3}
                />
              ) : null}
            </li>
          );
        })}
      </motion.ol>

      <motion.div
        {...rise(0.54)}
        className="mt-9 flex flex-wrap items-center gap-4"
      >
        <button
          type="button"
          onClick={onBegin}
          disabled={starting}
          className="inline-flex items-center gap-2 h-12 px-7 rounded-full bg-accent text-accent-contrast text-[13.5px] font-semibold tracking-[0.02em] hover:bg-accent-hover transition-colors shadow-[0_0_0_1px_rgba(0,212,200,0.4),_0_8px_24px_-8px_rgba(0,212,200,0.4)] disabled:opacity-70"
        >
          {starting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Preparing your tender
            </>
          ) : (
            <>
              {resuming ? "Resume your tender" : "Start my tender"}
              <ArrowRight className="size-4" />
            </>
          )}
        </button>
        <Link
          href={`/builder/projects/${slug}`}
          className="text-[12.5px] text-text-dim hover:text-text transition-colors"
        >
          Back to the project
        </Link>
      </motion.div>
    </div>
  );
}

/* ── the bridge between modules ─────────────────────────────────────── */

/**
 * The moment between modules: number, the module's question in the
 * builder's voice, a rule drawing across. The bridge HOLDS until the
 * builder continues — click anywhere, the pill, or Enter.
 *
 * The GRAND variant plays once, on the very first start: registration
 * marks draw at the corners like a document being set on the press, a
 * hairline sweeps the width, the twelve module numbers cascade past
 * and dim to the one being opened, and the module's question settles
 * in from a soft blur. Entrance keyframes only — nothing here can
 * wedge on an exit callback.
 */
function ModuleBridge({
  no,
  total,
  module: m,
  grand,
  projectTitle,
  onContinue,
}: {
  no: number;
  total: number;
  module: JourneyModule;
  grand: boolean;
  projectTitle: string;
  onContinue: () => void;
}) {
  // The grand timeline breathes; the standard bridge gets to the
  // point. Every delay below keys off this base.
  const t = grand
    ? { kicker: 1.45, ask: 1.65, rule: 2.1, intro: 2.35, pill: 2.8 }
    : { kicker: 0.12, ask: 0.28, rule: 0.55, intro: 0.8, pill: 1.15 };

  return (
    <button
      type="button"
      onClick={onContinue}
      aria-label="Open this module"
      className="relative flex-1 flex items-center justify-center px-6 pb-16 text-center cursor-pointer select-none"
    >
      {grand ? (
        <>
          {/* registration marks — the document being set */}
          {(
            [
              ["top-10 left-6 sm:left-12", "M22 1 H1 V22"],
              ["top-10 right-6 sm:right-12", "M1 1 H22 V22"],
              ["bottom-10 left-6 sm:left-12", "M22 22 H1 V1"],
              ["bottom-10 right-6 sm:right-12", "M1 22 H22 V1"],
            ] as const
          ).map(([pos, d], i) => (
            <svg
              key={pos}
              viewBox="0 0 23 23"
              aria-hidden
              className={cn("absolute size-5 text-accent-deep/60", pos)}
            >
              <motion.path
                d={d}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{
                  duration: 0.5,
                  delay: 0.08 + i * 0.09,
                  ease: EASE,
                }}
              />
            </svg>
          ))}

          {/* the full-width hairline sweep */}
          <motion.div
            aria-hidden
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
            className="absolute top-[26%] left-0 right-0 h-px bg-[rgba(24,34,44,0.14)] origin-left"
          />
        </>
      ) : null}

      <div className="max-w-[680px] w-full">
        {grand ? (
          <>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3, ease: EASE }}
              className="text-[9.5px] tracking-[0.34em] uppercase text-text-dim font-ui font-semibold"
            >
              Preparing the tender of
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 14, scale: 1.03 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.42, ease: EASE }}
              className="mt-2 font-display text-[20px] sm:text-[24px] leading-[1.1] text-text/85"
            >
              {projectTitle}
            </motion.p>

            {/* the twelve, cascading past — the opened one stays lit */}
            <div
              aria-hidden
              className="mt-7 flex items-center justify-center gap-2.5 sm:gap-3.5 flex-wrap"
            >
              {Array.from({ length: total }, (_, i) => {
                const active = i + 1 === no;
                return (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{
                      opacity: active ? 1 : [0, 0.85, 0.22],
                      y: 0,
                    }}
                    transition={{
                      duration: active ? 0.45 : 0.9,
                      delay: 0.72 + i * 0.055,
                      ease: EASE,
                      ...(active
                        ? {}
                        : { opacity: { times: [0, 0.45, 1], duration: 0.9, delay: 0.72 + i * 0.055 } }),
                    }}
                    className={cn(
                      "font-mono text-[11px] tabular-nums",
                      active
                        ? "text-accent-deep font-semibold"
                        : "text-text-dim",
                    )}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </motion.span>
                );
              })}
            </div>
          </>
        ) : null}

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: t.kicker, ease: EASE }}
          className={cn(
            "text-[10.5px] tracking-[0.26em] uppercase text-text-dim font-ui font-semibold tabular-nums",
            grand && "mt-9",
          )}
        >
          Module {no} of {total} · {m.title}
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 20, filter: "blur(5px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.65, delay: t.ask, ease: EASE }}
          className="mt-4 font-display tracking-[-0.01em] text-[28px] sm:text-[38px] leading-[1.12] text-text"
        >
          {m.ask ?? m.title}
        </motion.h2>
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.62, delay: t.rule, ease: EASE }}
          className="mx-auto mt-6 h-px w-44 bg-accent origin-left"
        />
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: t.intro, ease: EASE }}
          className="mt-5 text-[12.5px] leading-[1.6] text-text-muted max-w-[52ch] mx-auto"
        >
          {m.intro}
        </motion.p>

        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: t.pill, ease: EASE }}
          className="mt-8 inline-flex items-center gap-2 h-11 px-6 rounded-full bg-accent text-accent-contrast text-[13px] font-semibold tracking-[0.02em] shadow-[0_0_0_1px_rgba(0,212,200,0.35)]"
        >
          {grand ? "Begin" : `Open module ${no}`}
          <ArrowRight className="size-4" />
        </motion.span>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: t.pill + 0.5, ease: EASE }}
          className="mt-3.5 text-[10.5px] text-text-faint"
        >
          Click anywhere, or press Enter
        </motion.p>
      </div>
    </button>
  );
}

/* ── the seal ───────────────────────────────────────────────────────── */

function SealedMoment() {
  return (
    <div className="flex-1 flex items-center justify-center px-6 pb-16 text-center">
      <div>
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
          className="mx-auto size-16 rounded-full bg-accent text-accent-contrast flex items-center justify-center shadow-[0_0_40px_rgba(0,212,200,0.45)]"
        >
          <Check className="size-8" strokeWidth={3} />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.35, ease: EASE }}
          className="mt-6 font-display tracking-[-0.01em] text-[30px] sm:text-[38px] leading-[1.1] text-text"
        >
          Tender submitted
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6, ease: EASE }}
          className="mt-3 text-[13.5px] leading-[1.65] text-text-muted max-w-[46ch] mx-auto"
        >
          Your tender is sealed for this round and the owner has been
          notified. You put a proper document in front of them; it will
          hold its own beside every other submission.
        </motion.p>
      </div>
    </div>
  );
}

/* ── contents popover ───────────────────────────────────────────────── */

function ContentsPopover({
  modules,
  answers,
  schedule,
  perModule,
  docsCount,
  currentModule,
  onClose,
  onJumpModule,
  onJumpQuestion,
  onJumpReview,
}: {
  modules: JourneyModule[];
  answers: Answers;
  schedule?: TenderSchedule | null;
  perModule: Array<{
    key: string;
    required: number;
    answered: number;
    complete: boolean;
  }>;
  docsCount: number;
  currentModule: number | null;
  onClose: () => void;
  onJumpModule: (mIdx: number) => void;
  onJumpQuestion: (q: InstrumentQuestion) => void;
  onJumpReview: () => void;
}) {
  const [expanded, setExpanded] = useState<number | null>(currentModule);

  return (
    <>
      <div className="fixed inset-0 z-40" aria-hidden onClick={onClose} />
      <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(92vw,400px)] max-h-[min(70vh,560px)] overflow-y-auto rounded-lg border border-border-subtle bg-surface-1 card-elev shadow-[0_18px_50px_-18px_rgba(24,34,44,0.28)]">
        <p className="px-4 pt-3.5 pb-2 text-[10px] tracking-[0.18em] uppercase text-text-dim font-ui font-semibold">
          Contents
        </p>
        <ul className="pb-1.5">
          {modules.map((m, mIdx) => {
            const p = perModule[mIdx]!;
            const open = expanded === mIdx;
            return (
              <li key={m.key} className="border-t border-border-subtle/50">
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => onJumpModule(mIdx)}
                    className="flex-1 min-w-0 flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[rgba(24,34,44,0.03)] transition-colors"
                  >
                    <span className="w-5 text-[10.5px] font-mono text-text-dim tabular-nums shrink-0">
                      {String(mIdx + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={cn(
                        "flex-1 min-w-0 text-[12.5px] font-ui truncate",
                        currentModule === mIdx
                          ? "text-accent-light font-semibold"
                          : "text-text",
                      )}
                    >
                      {m.title}
                    </span>
                    {m.kind === "docs" ? (
                      <span className="text-[11px] text-text-dim tabular-nums shrink-0">
                        {docsCount} attached
                      </span>
                    ) : (
                      <span className="text-[11px] text-text-dim tabular-nums shrink-0">
                        {p.answered}/{p.required}
                      </span>
                    )}
                    {m.kind !== "docs" && p.required > 0 && p.complete ? (
                      <Check
                        className="size-3 text-accent-light shrink-0"
                        strokeWidth={3}
                      />
                    ) : null}
                  </button>
                  {m.kind === "questions" ? (
                    <button
                      type="button"
                      onClick={() => setExpanded(open ? null : mIdx)}
                      aria-expanded={open}
                      aria-label={`${open ? "Collapse" : "Expand"} ${m.title}`}
                      className="px-3 py-2.5 text-text-dim hover:text-text transition-colors shrink-0"
                    >
                      <ChevronDown
                        className={cn(
                          "size-3.5 transition-transform",
                          open ? "rotate-180" : "",
                        )}
                      />
                    </button>
                  ) : (
                    <span className="w-9 shrink-0" />
                  )}
                </div>
                {open && m.kind === "questions" ? (
                  <ul className="pb-1.5">
                    {m.section.questions
                      .filter(
                        (q) => !isInlineQuestion(q) && gatePasses(q, answers),
                      )
                      .map((q) => {
                        const done = isAnswerComplete(q, answers[q.id], {
                          schedule,
                        });
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
                                {q.type === "matrix"
                                  ? "Scope coverage grid"
                                  : q.type === "schedule"
                                    ? "The tender schedule"
                                    : q.prompt}
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
                Review and submit
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
  amount,
  onMark,
  onAmount,
}: {
  q: InstrumentQuestion;
  row: { id: string; label: string };
  rIdx: number;
  total: number;
  value: string | undefined;
  amount: number | null;
  onMark: (state: string) => void;
  onAmount: (v: number | null) => void;
}) {
  return (
    <div>
      <p className="text-[10px] tracking-[0.2em] uppercase text-text-dim font-ui font-semibold tabular-nums">
        {q.ref ? <span className="text-accent-light">{q.ref}</span> : null}
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
                  {on ? (
                    <Check className="size-2.5" strokeWidth={3.5} />
                  ) : null}
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

      {value === "included" ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: EASE }}
          className="mt-6 border-y border-border-subtle py-4"
        >
          <p className="text-[12.5px] text-text font-ui font-medium">
            Amount in your price for this trade
          </p>
          <p className="mt-0.5 text-[11.5px] text-text-dim">
            Optional. Itemised trades print as a column on your coverage
            schedule and sharpen how your price reads.
          </p>
          <div className="mt-3">
            <CurrencyBox value={amount} onChange={onAmount} />
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}

/* ── the division slide (the schedule flip) ─────────────────────────── */

const DIVISION_STATES: Array<{
  value: ScheduleState;
  label: string;
  short: string;
}> = [
  { value: "documented", label: "Included as documented", short: "Documented" },
  { value: "allowance", label: "Allowance", short: "Allowance" },
  { value: "excluded", label: "Excluded", short: "Excluded" },
];

/**
 * One slide per division of the client's schedule: every line the
 * documents put in this division, marked in place. The client's
 * allowances arrive pre-figured — one tap carries the stated amount —
 * and a bulk control marks every untouched line as documented, so a
 * clean division takes seconds without ever pre-marking anything.
 */
function DivisionSlide({
  q,
  division,
  dIdx,
  total,
  marks,
  onMark,
}: {
  q: InstrumentQuestion;
  division: ScheduleDivision;
  dIdx: number;
  total: number;
  marks: Record<string, ScheduleEntry>;
  onMark: (item: TenderScheduleItem, entry: ScheduleEntry) => void;
}) {
  const unmarked = division.items.filter((i) => !marks[i.itemId]);
  return (
    <div>
      <p className="text-[10px] tracking-[0.2em] uppercase text-text-dim font-ui font-semibold tabular-nums">
        {q.ref ? <span className="text-accent-light">{q.ref}</span> : null}
        {q.ref ? " · " : ""}
        The tender schedule · {dIdx + 1} of {total}
      </p>
      <h2 className="mt-2.5 font-ui font-semibold tracking-[-0.02em] text-[22px] sm:text-[27px] leading-[1.25] text-text">
        {division.label}
      </h2>
      <p className="mt-2.5 text-[13.5px] leading-[1.65] text-text-muted max-w-[58ch]">
        {division.items.length} line{division.items.length === 1 ? "" : "s"}{" "}
        from the client&rsquo;s documents. Mark what your price does with
        each one.
      </p>

      <ul className="mt-7 space-y-2.5">
        {division.items.map((item) => (
          <ScheduleItemRow
            key={item.itemId}
            item={item}
            entry={marks[item.itemId]}
            onMark={(entry) => onMark(item, entry)}
          />
        ))}
      </ul>

      {unmarked.length >= 2 ? (
        <button
          type="button"
          onClick={() => {
            for (const item of unmarked) {
              onMark(item, { s: "documented" });
            }
          }}
          className="mt-4 inline-flex items-center gap-2 h-9 px-4 rounded-md border border-border-subtle text-[12.5px] font-ui text-text-muted hover:border-border-accent hover:text-text transition-colors"
        >
          <Check className="size-3.5" />
          Mark the remaining {unmarked.length} as documented
        </button>
      ) : null}

      {division.locked.length > 0 ? (
        <div className="mt-6 border-t border-border-subtle pt-3.5">
          <p className="text-[10px] tracking-[0.16em] uppercase text-text-dim font-ui font-semibold">
            Outside the client&rsquo;s tender scope
          </p>
          <p className="mt-1.5 text-[12px] leading-[1.6] text-text-dim">
            {division.locked.map((i) => i.label).join(" · ")}. The client
            took {division.locked.length === 1 ? "this" : "these"} out of the
            round; nothing to price.
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** One line of the schedule: the mark control and, for allowances, the figure. */
function ScheduleItemRow({
  item,
  entry,
  onMark,
}: {
  item: TenderScheduleItem;
  entry: ScheduleEntry | undefined;
  onMark: (entry: ScheduleEntry) => void;
}) {
  const isOwnerAllowance = item.kind === "owner_allowance";
  const state = entry?.s;
  const cite = item.citations[0] ? formatCitation(item.citations[0]) : null;
  return (
    <li
      className={cn(
        "rounded-lg border px-4 py-3.5 transition-colors",
        state
          ? "border-border-accent/60 bg-[rgba(0,212,200,0.04)]"
          : "border-border-subtle bg-surface-1 card-elev",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13.5px] font-ui font-semibold text-text leading-[1.35]">
            {item.label}
          </p>
          <p className="mt-1 text-[12px] leading-[1.55] text-text-muted max-w-[56ch]">
            {item.plain}
          </p>
          {isOwnerAllowance && item.ownerAmountAud !== null ? (
            <p className="mt-1.5 text-[11.5px] text-[#8a6414]">
              The client&rsquo;s schedule carries{" "}
              {formatAud(item.ownerAmountAud)} for this line.
            </p>
          ) : cite ? (
            <p className="mt-1.5 text-[11px] text-text-dim">{cite}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {isOwnerAllowance && item.ownerAmountAud !== null ? (
          <button
            type="button"
            onClick={() =>
              onMark({ s: "allowance", a: item.ownerAmountAud })
            }
            aria-pressed={
              state === "allowance" && entry?.a === item.ownerAmountAud
            }
            className={cn(
              "h-8 px-3 rounded-full border text-[12px] font-ui transition-colors",
              state === "allowance" && entry?.a === item.ownerAmountAud
                ? "border-transparent bg-accent text-accent-contrast font-semibold"
                : "border-border-strong text-text hover:border-border-accent",
            )}
          >
            Carry {formatAud(item.ownerAmountAud)}
          </button>
        ) : null}
        {DIVISION_STATES.map((st) => {
          // The carry chip owns the "allowance at the client's figure"
          // case; the plain Allowance chip is the builder's own figure.
          const on =
            state === st.value &&
            !(
              st.value === "allowance" &&
              isOwnerAllowance &&
              entry?.a === item.ownerAmountAud &&
              item.ownerAmountAud !== null
            );
          return (
            <button
              key={st.value}
              type="button"
              onClick={() =>
                onMark(
                  st.value === "allowance"
                    ? {
                        s: "allowance",
                        a:
                          entry?.s === "allowance"
                            ? (entry.a ?? null)
                            : null,
                      }
                    : { s: st.value },
                )
              }
              aria-pressed={on}
              className={cn(
                "h-8 px-3 rounded-full border text-[12px] font-ui transition-colors",
                on
                  ? st.value === "excluded"
                    ? "border-transparent bg-[#a8433e] text-white font-semibold"
                    : "border-transparent bg-accent text-accent-contrast font-semibold"
                  : "border-border-subtle text-text-muted hover:border-border-strong hover:text-text",
              )}
            >
              {isOwnerAllowance && st.value === "allowance"
                ? "My own figure"
                : st.short}
            </button>
          );
        })}
      </div>

      {state === "allowance" ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: EASE }}
          className="mt-3"
        >
          <p className="text-[11.5px] text-text-muted mb-1.5">
            Allowance in your price for this line
          </p>
          <CurrencyBox
            value={typeof entry?.a === "number" ? entry.a : null}
            onChange={(v) => onMark({ s: "allowance", a: v })}
          />
        </motion.div>
      ) : null}
    </li>
  );
}

/**
 * The allowance schedule module 7 confirms, derived live from the
 * schedule marks: the client's allowances as carried, and every line
 * the builder flipped to an allowance of their own.
 */
function DerivedAllowances({
  answers,
  schedule,
}: {
  answers: Answers;
  schedule: TenderSchedule;
}) {
  const rows = deriveAllowanceRows(schedule, answers["scope.schedule"]);
  if (rows.length === 0) {
    return (
      <div className="mt-6 border-y border-border-subtle py-4">
        <p className="text-[12.5px] text-text-muted">
          No allowances. Every line in your price is marked included as
          documented — the strongest schedule a tender can carry.
        </p>
      </div>
    );
  }
  const total = rows.reduce((n, r) => n + r.amountAud, 0);
  return (
    <div className="mt-6 border-y border-border-subtle">
      <ul className="divide-y divide-border-subtle/60">
        {rows.map((r) => (
          <li
            key={r.itemId}
            className="py-3 flex items-baseline justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="text-[13px] font-ui text-text">{r.label}</p>
              <p className="mt-0.5 text-[11px] text-text-dim">
                {r.divisionLabel} ·{" "}
                {r.source === "client_schedule"
                  ? r.ownerAmountAud !== null &&
                    r.amountAud === r.ownerAmountAud
                    ? "Client's schedule, carried at the stated figure"
                    : "Client's schedule, your figure"
                  : "Your allowance"}
              </p>
            </div>
            <span className="text-[13.5px] font-display tabular-nums text-text shrink-0">
              {formatAud(r.amountAud)}
            </span>
          </li>
        ))}
      </ul>
      <div className="py-3 border-t border-border-subtle flex items-baseline justify-between">
        <span className="text-[11px] tracking-[0.14em] uppercase text-text-dim font-ui font-semibold">
          Total allowances
        </span>
        <span className="text-[15px] font-display tabular-nums text-text">
          {formatAud(total)}
        </span>
      </div>
    </div>
  );
}

/** Entity facts that print on the document, shown beside declarations. */
function LetterheadCard({ letterhead }: { letterhead: TenderLetterhead }) {
  const bits = [
    letterhead.companyName,
    letterhead.abn ? `ABN ${letterhead.abn}` : null,
    letterhead.licence ? `Licence ${letterhead.licence}` : null,
  ].filter(Boolean);
  if (bits.length === 0) return null;
  return (
    <div className="mt-6 border-y border-border-subtle py-3.5">
      <p className="text-[10px] tracking-[0.16em] uppercase text-text-dim font-ui font-semibold">
        Prints on your tender
      </p>
      <p className="mt-1.5 text-[13px] text-text font-ui">
        {bits.join(" · ")}
      </p>
    </div>
  );
}

/**
 * The exclusion schedule the coverage grid implies, shown on the
 * confirm slide so the builder signs what the owner will read — plus
 * an inline editor to add exclusions the grid could not capture. The
 * derived rows read as fixed boxes; the added ones carry a remove
 * control. Both print together on the tender.
 */
function DerivedExclusions({
  answers,
  schedule,
  onExtraChange,
}: {
  answers: Answers;
  schedule?: TenderSchedule | null;
  onExtraChange: (
    update: (rows: Record<string, unknown>[]) => Record<string, unknown>[],
  ) => void;
}) {
  // Schedule rounds derive from the line marks; legacy rounds from the
  // trade grid. Same slide, same confirm, same printed record.
  const fromSchedule = schedule
    ? deriveScheduleExclusions(schedule, answers["scope.schedule"])
    : null;
  const scheduleAllowances = schedule
    ? deriveAllowanceRows(schedule, answers["scope.schedule"])
    : null;
  const clientOut = schedule ? ownerExcludedItems(schedule) : [];
  const m = (answers["scope.matrix"] ?? {}) as Record<string, string>;
  const excluded = fromSchedule
    ? fromSchedule.map((r) => ({ id: r.itemId, label: r.label }))
    : MATRIX_ROWS.filter((r) => m[r.id] === "excluded");
  const allowance = scheduleAllowances
    ? scheduleAllowances.map((r) => ({ id: r.itemId, label: r.label }))
    : MATRIX_ROWS.filter((r) => m[r.id] === "allowance");
  const extraRows = Array.isArray(answers["scope.exclusions_list"])
    ? (answers["scope.exclusions_list"] as Record<string, unknown>[])
    : [];

  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const commit = () => {
    const v = text.trim();
    if (v.length > 0) {
      onExtraChange((rows) => [...rows, { exclusion: v.slice(0, 200) }]);
    }
    setText("");
    setAdding(false);
  };

  return (
    <div className="mt-6 border-y border-border-subtle divide-y divide-border-subtle/60">
      <div className="py-3.5">
        <p className="text-[10px] tracking-[0.16em] uppercase text-text-dim font-ui font-semibold">
          Excluded from your price
        </p>
        <ul className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {excluded.map((r) => (
            <li
              key={r.id}
              className="px-2.5 py-1.5 rounded-full border border-[rgba(194,85,80,0.4)] text-[11.5px] text-[#a8433e]"
            >
              {r.label}
            </li>
          ))}
          {extraRows.map((row, i) => {
            const label =
              typeof row?.exclusion === "string" ? row.exclusion : "";
            if (!label.trim()) return null;
            return (
              <li
                key={`x-${i}`}
                className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1.5 rounded-full border border-[rgba(194,85,80,0.4)] bg-[rgba(194,85,80,0.05)] text-[11.5px] text-[#a8433e]"
              >
                {label}
                <button
                  type="button"
                  onClick={() =>
                    onExtraChange((rows) => rows.filter((_, j) => j !== i))
                  }
                  aria-label={`Remove ${label}`}
                  className="size-4 rounded-full hover:bg-[rgba(194,85,80,0.18)] flex items-center justify-center"
                >
                  <X className="size-2.5" strokeWidth={3} />
                </button>
              </li>
            );
          })}

          {adding ? (
            <li className="inline-flex items-center h-8 rounded-full border border-[rgba(194,85,80,0.5)] bg-[rgba(194,85,80,0.05)] pl-3 pr-1">
              <input
                autoFocus
                type="text"
                value={text}
                maxLength={200}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.stopPropagation();
                    commit();
                  }
                  if (e.key === "Escape") {
                    setText("");
                    setAdding(false);
                  }
                }}
                onBlur={commit}
                placeholder="Type an exclusion, press Enter"
                className="bg-transparent border-0 outline-none focus-visible:shadow-none text-[11.5px] text-[#a8433e] w-[180px] placeholder:text-[#a8433e]/50"
              />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={commit}
                aria-label="Add exclusion"
                className="size-6 rounded-full bg-[#a8433e] text-white flex items-center justify-center"
              >
                <Check className="size-3" strokeWidth={3} />
              </button>
            </li>
          ) : (
            <li>
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-dashed border-[rgba(194,85,80,0.5)] text-[11.5px] text-[#a8433e] hover:bg-[rgba(194,85,80,0.05)] transition-colors"
              >
                <Plus className="size-3" />
                Add an exclusion
              </button>
            </li>
          )}
        </ul>
        {excluded.length === 0 && extraRows.length === 0 && !adding ? (
          <p className="mt-2.5 text-[12px] text-text-dim">
            Nothing is marked excluded. Add anything the owner should know is
            out, or confirm the price covers it all.
          </p>
        ) : null}
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
      {clientOut.length > 0 ? (
        <div className="py-3.5">
          <p className="text-[10px] tracking-[0.16em] uppercase text-text-dim font-ui font-semibold">
            Outside the client&rsquo;s tender scope
          </p>
          <p className="mt-1.5 text-[12.5px] text-text-muted">
            {clientOut.map((i) => i.label).join(" · ")}. Taken out of the
            round by the client; printed for the record.
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** Gentle nudge when two referee rows look like the same person. */
function ReferencesDupHint({ value }: { value: unknown }) {
  if (!Array.isArray(value) || value.length < 2) return null;
  const keys = (value as Array<Record<string, unknown>>).map((row) =>
    [row?.name, row?.contact]
      .map((x) => (typeof x === "string" ? x.trim().toLowerCase() : ""))
      .join("|"),
  );
  const hasDup = keys.some(
    (k, i) => k !== "|" && keys.indexOf(k) !== i,
  );
  if (!hasDup) return null;
  return (
    <p className="mt-3 text-[12px] text-[#8a6414]">
      Two of these referees look identical. Two different projects or
      people carry far more weight with an owner.
    </p>
  );
}

/* ── documents slide (module 11) ────────────────────────────────────── */

type LocalUpload = {
  id: string;
  filename: string;
  status: "uploading" | "confirming" | "done" | "error";
  progress: number;
  error?: string;
};

function DocsSlide({
  projectId,
  tenderId,
  docs,
  onDocsChange,
}: {
  projectId: string;
  tenderId: string | null;
  docs: Document[];
  onDocsChange: (docs: Document[]) => void;
}) {
  const [active, setActive] = useState<LocalUpload[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(async () => {
    if (!tenderId) return;
    const r = await listMyTenderDocsAction(tenderId);
    if (r.ok) onDocsChange(r.value);
  }, [tenderId, onDocsChange]);

  const onFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!tenderId) return;
      for (const f of Array.from(files)) {
        await uploadOne({
          file: f,
          projectId,
          tenderId,
          setActive,
          onDone: refresh,
        });
      }
    },
    [tenderId, projectId, refresh],
  );

  const onDelete = useCallback(
    async (doc: Document) => {
      const r = await softDeleteAction(doc.id);
      if (!r.ok) {
        toast.error("Couldn't remove", r.error.message);
        return;
      }
      await refresh();
    },
    [refresh],
  );

  return (
    <div>
      <p className="text-[10px] tracking-[0.2em] uppercase text-text-dim font-ui font-semibold">
        <span className="text-accent-light">11</span> · Optional
      </p>
      <h2 className="mt-2.5 font-ui font-semibold tracking-[-0.02em] text-[22px] sm:text-[27px] leading-[1.25] text-text max-w-[26ch]">
        Additional documents
      </h2>
      <p className="mt-2.5 text-[13.5px] leading-[1.65] text-text-muted max-w-[58ch]">
        Insurance certificates, an indicative programme, past project
        sheets. Anything that backs your answers strengthens your tender,
        and owners read these beside it, never instead of it. Nothing to
        add? Skip straight through; your answers already carry the weight.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length > 0) void onFiles(e.dataTransfer.files);
        }}
        className={cn(
          "mt-8 rounded-lg border border-dashed px-6 py-9 text-center transition-colors",
          dragOver
            ? "border-border-accent bg-[rgba(0,212,200,0.04)]"
            : "border-border-strong/70",
        )}
      >
        <FileText className="size-5 mx-auto text-text-dim" />
        <p className="mt-2.5 text-[13px] text-text">
          Drop files here, or{" "}
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="text-accent-light font-semibold hover:text-accent-deep transition-colors"
          >
            browse
          </button>
        </p>
        <p className="mt-1 text-[11px] text-text-dim">
          PDF preferred · max 100 MB per file
        </p>
        <input
          ref={fileInput}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              void onFiles(e.target.files);
            }
            e.target.value = "";
          }}
        />
      </div>

      {active.length > 0 ? (
        <ul className="mt-4 space-y-1.5">
          {active.map((u) => (
            <li
              key={u.id}
              className="flex items-center gap-3 rounded-md border border-border-subtle bg-surface-1 px-3.5 py-2.5"
            >
              {u.status === "error" ? (
                <X className="size-3.5 text-danger shrink-0" />
              ) : u.status === "done" ? (
                <Check className="size-3.5 text-accent-light shrink-0" />
              ) : (
                <Loader2 className="size-3.5 animate-spin text-text-dim shrink-0" />
              )}
              <span className="flex-1 min-w-0 text-[12.5px] text-text truncate">
                {u.filename}
              </span>
              <span className="text-[11px] text-text-dim tabular-nums shrink-0">
                {u.status === "error"
                  ? u.error ?? "Failed"
                  : u.status === "confirming"
                    ? "Confirming"
                    : `${u.progress}%`}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {docs.length > 0 ? (
        <ul className="mt-4 border-y border-border-subtle divide-y divide-border-subtle/60">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center gap-3 py-2.5">
              <Paperclip className="size-3.5 text-text-dim shrink-0" />
              <span className="flex-1 min-w-0 text-[13px] text-text truncate">
                {d.filename}
              </span>
              <span className="text-[11px] text-text-dim tabular-nums shrink-0">
                {formatBytes(d.sizeBytes)}
              </span>
              <button
                type="button"
                onClick={() => void onDelete(d)}
                title="Remove"
                className="size-8 rounded-md text-text-dim hover:text-danger transition-colors flex items-center justify-center shrink-0"
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function formatBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}

async function uploadOne(args: {
  file: File;
  projectId: string;
  tenderId: string;
  setActive: React.Dispatch<React.SetStateAction<LocalUpload[]>>;
  onDone: () => void | Promise<void>;
}) {
  const localId = crypto.randomUUID();
  const { file, projectId, tenderId, setActive, onDone } = args;
  setActive((s) => [
    ...s,
    { id: localId, filename: file.name, status: "uploading", progress: 0 },
  ]);
  const patch = (p: Partial<LocalUpload>) =>
    setActive((s) => s.map((u) => (u.id === localId ? { ...u, ...p } : u)));

  try {
    const init = await initUploadAction({
      projectId,
      tenderId,
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      category: "other",
    });
    if (!init.ok) {
      patch({ status: "error", error: init.error.message });
      return;
    }
    await putWithProgress({
      url: init.value.uploadUrl,
      headers: init.value.uploadHeaders,
      body: file,
      onProgress: (pct) => patch({ progress: Math.round(pct * 100) }),
    });
    patch({ status: "confirming" });
    const done = await completeUploadAction(init.value.documentId);
    if (!done.ok) {
      patch({ status: "error", error: done.error.message });
      return;
    }
    patch({ status: "done", progress: 100 });
    await onDone();
    setTimeout(() => {
      setActive((s) => s.filter((u) => u.id !== localId));
    }, 800);
  } catch (err) {
    patch({
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

function putWithProgress(args: {
  url: string;
  headers: Record<string, string>;
  body: Blob;
  onProgress?: (pct: number) => void;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", args.url);
    for (const [k, v] of Object.entries(args.headers)) {
      xhr.setRequestHeader(k, v);
    }
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && args.onProgress) {
        args.onProgress(e.loaded / e.total);
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
    };
    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.send(args.body);
  });
}

/* ── review + submit ────────────────────────────────────────────────── */

type ProgressShape = {
  perModule: Array<{
    key: string;
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
  modules,
  answers,
  schedule,
  progress,
  docs,
  model,
  onPreview,
  confirming,
  submitting,
  onConfirmChange,
  onSubmit,
  onJumpModule,
  onJumpQuestion,
  onJumpDocs,
}: {
  slug: string;
  modules: JourneyModule[];
  answers: Answers;
  schedule?: TenderSchedule | null;
  progress: ProgressShape;
  docs: Document[];
  model: TenderDocumentModel;
  onPreview: () => void;
  confirming: boolean;
  submitting: boolean;
  onConfirmChange: (v: boolean) => void;
  onSubmit: () => void;
  onJumpModule: (mIdx: number) => void;
  onJumpQuestion: (q: InstrumentQuestion) => void;
  onJumpDocs: () => void;
}) {
  const remaining = progress.required - progress.answered;

  return (
    <div>
      <p className="text-[10px] tracking-[0.2em] uppercase text-accent-light font-ui font-semibold">
        Review and submit
      </p>
      <h2 className="mt-2.5 font-ui font-semibold tracking-[-0.02em] text-[24px] sm:text-[28px] leading-[1.2] text-text">
        {progress.complete
          ? "Your tender is ready. It reads well."
          : `${remaining} answer${remaining === 1 ? "" : "s"} to go. Nearly there.`}
      </h2>
      <p className="mt-2.5 text-[13.5px] leading-[1.65] text-text-muted max-w-[58ch]">
        {progress.complete
          ? "This is the document the owner receives, assembled from your answers and carrying your name. Read its cover below, open any module to check yourself, then submit when you are happy with it."
          : "The cover of your document so far, and every module below. Open one to read your answers back, or jump straight to what is left; your progress is safe either way."}
      </p>

      <CoverCard model={model} onPreview={onPreview} />

      <ModuleLedger
        modules={modules}
        answers={answers}
        schedule={schedule}
        perModule={progress.perModule}
        docs={docs}
        onJumpModule={onJumpModule}
        onJumpQuestion={onJumpQuestion}
        onJumpDocs={onJumpDocs}
      />

      <div className="mt-9">
        {progress.complete ? (
          confirming ? (
            <div className="border-y border-border-subtle py-5">
              <p className="text-[13.5px] leading-[1.65] text-text max-w-[52ch]">
                Submitting seals your tender for this round. The owner
                receives it exactly as this review reads, and it can only
                change by withdrawing.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 h-12 px-7 rounded-full bg-accent text-accent-contrast text-[13px] font-semibold tracking-[0.02em] hover:bg-accent-hover transition-colors shadow-[0_0_0_1px_rgba(0,212,200,0.4),_0_8px_24px_-8px_rgba(0,212,200,0.4)] disabled:opacity-70"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Submitting
                    </>
                  ) : (
                    <>
                      Submit tender
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onConfirmChange(false)}
                  disabled={submitting}
                  className="text-[12.5px] text-text-muted hover:text-text transition-colors"
                >
                  Keep editing
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onConfirmChange(true)}
                className="inline-flex items-center gap-2 h-12 px-7 rounded-full bg-accent text-accent-contrast text-[13px] font-semibold tracking-[0.02em] hover:bg-accent-hover transition-colors shadow-[0_0_0_1px_rgba(0,212,200,0.4),_0_8px_24px_-8px_rgba(0,212,200,0.4)]"
              >
                Submit tender
                <ArrowRight className="size-4" />
              </button>
              <Link
                href={`/builder/projects/${slug}`}
                className="text-[12.5px] text-text-dim hover:text-text transition-colors"
              >
                Save and exit
              </Link>
            </div>
          )
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-[12.5px] text-text-dim">
              Submission opens once every required answer is in. Everything
              so far is saved, so finish whenever suits.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The document's cover, inline on the review — letterhead, the
 * headline offer, the key terms — with the full live preview one tap
 * away. White is the document object, not a section.
 */
function CoverCard({
  model,
  onPreview,
}: {
  model: TenderDocumentModel;
  onPreview: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPreview}
      className="mt-8 block w-full text-left rounded-[4px] bg-white shadow-[0_1px_2px_rgba(24,34,44,0.08),_0_18px_44px_-20px_rgba(24,34,44,0.3)] hover:shadow-[0_1px_2px_rgba(24,34,44,0.08),_0_22px_52px_-20px_rgba(24,34,44,0.4)] transition-shadow group"
    >
      <div className="px-6 sm:px-8 py-6 sm:py-7">
        <div className="flex items-center justify-between gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/BuilderHQ_Email_Images/logo.png"
            alt="BuilderHQ"
            className="h-[18px] w-auto"
          />
          <span className="text-[8.5px] tracking-[0.28em] uppercase text-[#8a8577] font-semibold">
            Tender submission
          </span>
        </div>
        <div className="mt-2.5 h-[2px] bg-[#18222c]" />

        <div className="mt-5 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="min-w-0">
            <p className="font-display text-[20px] sm:text-[23px] leading-[1.1] text-[#18222c] truncate">
              {model.project.title}
            </p>
            <p className="mt-1 text-[11px] text-[#6b6555]">
              {model.builder.entity}
              {model.builder.abn ? ` · ABN ${model.builder.abn}` : ""}
            </p>
          </div>
          {model.cover.priceExGst ? (
            <div className="shrink-0">
              <p className="text-[8.5px] tracking-[0.18em] uppercase text-[#8a8577] font-semibold">
                Price ex GST
              </p>
              <p className="font-display text-[26px] leading-none text-[#18222c] tabular-nums">
                {model.cover.priceExGst}
              </p>
              {model.cover.priceIncGst ? (
                <p className="mt-1 text-[10.5px] text-[#6b6555] tabular-nums">
                  {model.cover.priceIncGst} inc GST
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        {model.cover.cells.length > 0 ? (
          <dl className="mt-5 pt-4 border-t border-[#eee9dd] grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3.5">
            {model.cover.cells.slice(0, 8).map((c) => (
              <div key={c.k}>
                <dt className="text-[8px] tracking-[0.16em] uppercase text-[#8a8577] font-semibold">
                  {c.k}
                </dt>
                <dd className="mt-0.5 text-[12px] font-semibold text-[#18222c] tabular-nums">
                  {c.v}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        <div className="mt-5 pt-3.5 border-t border-[#eee9dd] flex items-center justify-between gap-4">
          <span className="font-mono text-[10px] text-[#8a8577] tracking-[0.05em]">
            {model.ref}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[#0a7d73] group-hover:gap-2.5 transition-all">
            Read the full document
            <ArrowRight className="size-3.5" />
          </span>
        </div>
      </div>
    </button>
  );
}

/** Key tender metrics, rolled up live from the answers. Shared with the
 *  read-only outcome view. */
export function MetricsPanel({
  answers,
  schedule = null,
}: {
  answers: Answers;
  schedule?: TenderSchedule | null;
}) {
  const m = useMemo(
    () => computeTenderMetrics(answers, schedule),
    [answers, schedule],
  );

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
  if (m.schedule) {
    if (m.schedule.allowance > 0) {
      cells.push({
        k: "Allowances",
        v: formatAud(m.schedule.allowanceTotal),
        sub: `${m.schedule.allowance} line${m.schedule.allowance === 1 ? "" : "s"} of the schedule`,
      });
    }
  } else if (m.psCount + m.pcCount > 0) {
    cells.push({
      k: "Allowances",
      v: formatAud(m.allowanceExposure),
      sub: `${m.psCount} provisional · ${m.pcCount} prime cost`,
    });
  }
  if (m.schedule && m.schedule.total - m.schedule.unmarked > 0) {
    cells.push({
      k: "Scope coverage",
      v: `${m.schedule.documented} of ${m.schedule.total} as documented`,
      sub:
        [
          m.schedule.allowance ? `${m.schedule.allowance} allowance` : null,
          m.schedule.excluded ? `${m.schedule.excluded} excluded` : null,
        ]
          .filter(Boolean)
          .join(" · ") || undefined,
    });
  }
  const covered = m.schedule
    ? 0
    : MATRIX_ROWS.length - m.coverage.unmarked;
  if (covered > 0) {
    cells.push({
      k: "Scope coverage",
      v: `${m.coverage.included} of ${MATRIX_ROWS.length} included`,
      sub:
        [
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
    cells.push({
      k: "Liquidated damages",
      v: `${formatAud(m.ldPerWeek)} / week`,
    });
  }
  if (m.alternativesCount > 0) {
    cells.push({ k: "Alternatives offered", v: String(m.alternativesCount) });
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

/**
 * The numbered module ledger: every module, expandable to each
 * question and its answer. With jump handlers it is the review's
 * editor; without them it reads as the submitted document.
 */
export function ModuleLedger({
  modules,
  answers,
  schedule,
  perModule,
  docs,
  onJumpModule,
  onJumpQuestion,
  onJumpDocs,
}: {
  modules: JourneyModule[];
  answers: Answers;
  schedule?: TenderSchedule | null;
  perModule?: Array<{
    key: string;
    required: number;
    answered: number;
    complete: boolean;
  }>;
  docs: Document[];
  onJumpModule?: (mIdx: number) => void;
  onJumpQuestion?: (q: InstrumentQuestion) => void;
  onJumpDocs?: () => void;
}) {
  const readOnly = !onJumpQuestion;
  const [openModules, setOpenModules] = useState<Set<number>>(() => new Set());
  const toggle = (i: number) =>
    setOpenModules((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });

  return (
    <ul className="mt-8 border-y border-border-subtle">
      {modules.map((m, mIdx) => {
        const p = perModule?.[mIdx];
        const open = openModules.has(mIdx);
        return (
          <li
            key={m.key}
            className={cn(mIdx > 0 && "border-t border-border-subtle/60")}
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggle(mIdx)}
                aria-expanded={open}
                className="flex-1 min-w-0 flex items-center gap-3 py-3 text-left group"
              >
                <span className="w-6 text-[11px] font-mono text-text-dim tabular-nums shrink-0">
                  {String(mIdx + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 shrink truncate text-[13.5px] font-ui font-medium text-text group-hover:text-accent-light transition-colors">
                  {m.title}
                </span>
                <span
                  aria-hidden
                  className="flex-1 min-w-[16px] border-b border-dotted border-border-subtle translate-y-[4px]"
                />
                {m.kind === "docs" ? (
                  <span className="text-[11.5px] text-text-dim tabular-nums shrink-0">
                    {docs.length} attached
                  </span>
                ) : p ? (
                  <span className="text-[11.5px] text-text-dim tabular-nums shrink-0">
                    {p.answered}/{p.required}
                  </span>
                ) : null}
                {m.kind !== "docs" && p && p.required > 0 && p.complete ? (
                  <span className="size-5 rounded-full bg-accent text-accent-contrast flex items-center justify-center shrink-0">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                ) : m.kind !== "docs" && p && p.required > 0 ? (
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
              {!readOnly &&
              m.kind === "questions" &&
              p &&
              !p.complete &&
              p.required > 0 ? (
                <button
                  type="button"
                  onClick={() => onJumpModule?.(mIdx)}
                  className="text-[11px] text-accent-light hover:text-accent-deep transition-colors shrink-0"
                >
                  Finish
                </button>
              ) : null}
            </div>
            {open ? (
              m.kind === "docs" ? (
                <ul className="pb-3 mb-1 ml-[11px] border-l border-border-subtle/40 pl-6">
                  {docs.length === 0 ? (
                    <li className="text-[12px] text-text-dim py-1.5">
                      Nothing attached.
                      {!readOnly ? (
                        <button
                          type="button"
                          onClick={onJumpDocs}
                          className="ml-2 text-accent-light hover:text-accent-deep transition-colors"
                        >
                          Add documents
                        </button>
                      ) : null}
                    </li>
                  ) : (
                    docs.map((d) => (
                      <li
                        key={d.id}
                        className="flex items-center gap-2.5 py-1.5"
                      >
                        <Paperclip className="size-3 text-text-dim shrink-0" />
                        <span className="flex-1 min-w-0 text-[12px] text-text truncate">
                          {d.filename}
                        </span>
                        <span className="text-[10.5px] text-text-dim tabular-nums shrink-0">
                          {formatBytes(d.sizeBytes)}
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              ) : (
                <ul className="pb-3 mb-1 ml-[11px] border-l border-border-subtle/40">
                  {m.section.questions
                    .filter(
                      (q) => !isInlineQuestion(q) && gatePasses(q, answers),
                    )
                    .map((q) => {
                      const done = isAnswerComplete(q, answers[q.id], {
                        schedule,
                      });
                      const summary = summariseValue(q, answers[q.id]);
                      const inner = (
                        <>
                          <span className="w-8 pt-px text-[10px] font-mono text-text-dim tabular-nums shrink-0">
                            {q.ref ?? ""}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-[12px] leading-[1.45] text-text-muted">
                              {q.type === "matrix"
                                ? "Scope coverage grid"
                                : q.type === "schedule"
                                  ? "The tender schedule"
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
                                (q.required
                                  ? "Not answered"
                                  : "Not provided")}
                            </span>
                          </span>
                        </>
                      );
                      return (
                        <li key={q.id}>
                          {readOnly ? (
                            <div className="flex items-start gap-3 pl-5 pr-1 py-1.5">
                              {inner}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onJumpQuestion?.(q)}
                              className="w-full flex items-start gap-3 pl-5 pr-1 py-1.5 text-left rounded-md hover:bg-[rgba(24,34,44,0.03)] transition-colors group/row"
                            >
                              {inner}
                              <ArrowRight className="size-3 mt-1 text-text-faint group-hover/row:text-text-dim transition-colors shrink-0" />
                            </button>
                          )}
                        </li>
                      );
                    })}
                </ul>
              )
            ) : null}
          </li>
        );
      })}
    </ul>
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
            {q.type === "declare"
              ? "I agree and declare"
              : "Confirmed, this is correct"}
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
      const optionValues = new Set((q.options ?? []).map((o) => o.value));
      const customs = arr.filter((v) => !optionValues.has(v));
      const toggle = (v: string) =>
        onAnswer(q.id, (prev: unknown) => {
          const cur = Array.isArray(prev) ? (prev as string[]) : [];
          if (cur.includes(v)) return cur.filter((x) => x !== v);
          // "None" stands alone: choosing it clears the rest, and
          // choosing anything real clears "none".
          if (v === "none") return ["none"];
          return [...cur.filter((x) => x !== "none"), v];
        });
      return (
        <div className="flex flex-wrap gap-2 items-center">
          {(q.options ?? []).map((o) => (
            <Pill
              key={o.value}
              active={arr.includes(o.value)}
              onClick={() => toggle(o.value)}
            >
              {o.label}
            </Pill>
          ))}
          {customs.map((v) => (
            <Pill key={v} active onClick={() => toggle(v)}>
              {v}
              <X className="size-3 ml-1.5 -mr-0.5 inline" />
            </Pill>
          ))}
          {q.allowCustom ? <AddCustomPill onAdd={toggle} /> : null}
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
          value={
            Array.isArray(value) ? (value as Record<string, unknown>[]) : []
          }
          onChange={(update) =>
            onAnswer(q.id, (prev: unknown) =>
              update(
                Array.isArray(prev)
                  ? (prev as Record<string, unknown>[])
                  : [],
              ),
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

/** Inline "add your own" entry for multi questions with allowCustom. */
function AddCustomPill({ onAdd }: { onAdd: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");

  const commit = () => {
    const v = text.trim();
    if (v.length > 0) onAdd(v.slice(0, 60));
    setText("");
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-dashed border-border-strong text-[12.5px] text-text-muted hover:text-text hover:border-border-accent transition-colors"
      >
        <Plus className="size-3.5" />
        Add your own
      </button>
    );
  }
  return (
    <span className="inline-flex items-center h-10 rounded-full border border-border-accent bg-[rgba(0,212,200,0.04)] pl-4 pr-1.5">
      <input
        autoFocus
        type="text"
        value={text}
        maxLength={60}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            commit();
          }
          if (e.key === "Escape") {
            setText("");
            setEditing(false);
          }
        }}
        onBlur={commit}
        placeholder="Type and press Enter"
        className="bg-transparent border-0 outline-none focus-visible:shadow-none text-[12.5px] text-text w-[160px] placeholder:text-text-dim/60"
      />
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={commit}
        className="size-7 rounded-full bg-accent text-accent-contrast flex items-center justify-center ml-1"
        aria-label="Add"
      >
        <Check className="size-3.5" strokeWidth={3} />
      </button>
    </span>
  );
}

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
          className="relative flex flex-wrap items-center gap-2 rounded-md border border-border-subtle bg-[rgba(24,34,44,0.02)] p-2.5 pr-12"
        >
          {fields.map((f) => {
            if (f.type === "text") {
              return (
                <input
                  key={f.key}
                  type="text"
                  value={
                    typeof row[f.key] === "string"
                      ? (row[f.key] as string)
                      : ""
                  }
                  onChange={(e) => setCell(i, f.key, e.target.value)}
                  maxLength={500}
                  placeholder={f.label}
                  className="flex-1 min-w-[160px] h-10 px-3 rounded-md border border-border-subtle bg-surface-1 text-[12.5px] text-text placeholder:text-text-dim/60 focus:outline-none focus:border-border-accent transition-colors"
                />
              );
            }
            const num =
              typeof row[f.key] === "number" ? (row[f.key] as number) : null;
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
            className="absolute top-2.5 right-2.5 size-8 rounded-md text-text-dim hover:text-danger hover:bg-[rgba(194,85,80,0.08)] transition-colors flex items-center justify-center"
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
            Object.fromEntries(
              fields.map((f) => [f.key, f.type === "text" ? "" : null]),
            ),
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
