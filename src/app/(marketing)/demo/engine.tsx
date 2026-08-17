"use client";

/**
 * The demo engine — the runtime that walks a visitor through the
 * scripted journey in content.ts.
 *
 * The presentation rule, learned from the homepage explainers: TEXT
 * FIRST, then the interface. Each stage opens with a full-screen
 * statement over the blurred surface, and inside a stage every
 * explanation is a callout anchored beside the exact element it
 * describes. The one fixed-bottom card that remains is the watch
 * beat, where the surface itself is performing.
 *
 * Rules carried from the product's own deck and tours:
 *   · entrance-only animations (an exit dependency wedges a starved
 *     tab);
 *   · every stage opens at the top of the page;
 *   · the active callout takes focus, so keyboard and screen reader
 *     users are anchored beat by beat;
 *   · browser shortcuts are never swallowed, held keys advance once;
 *   · clicking a control ahead of the script fast-forwards to it
 *     rather than dying silently;
 *   · completion analytics fire only for a walked demo.
 */

import * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, MousePointerClick, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";
import {
  trackMetaCustomEvent,
  trackMetaEvent,
} from "@/components/analytics/meta-pixel";
import {
  DEMO_CLOSE,
  DEMO_DISCLAIMER,
  HOMEOWNER_SCRIPT,
  type DemoStage,
  type DemoStep,
} from "./content";
import {
  CloseSurface,
  CompareSurface,
  ReadingSurface,
  RoundSurface,
  ScopeSurface,
  TenderSurface,
  UploadSurface,
  type SurfaceProps,
} from "./surfaces";

const EASE = [0.22, 1, 0.36, 1] as const;

const SURFACES: Record<string, React.ComponentType<SurfaceProps>> = {
  upload: UploadSurface,
  reading: ReadingSurface,
  scope: ScopeSurface,
  live: RoundSurface,
  tenders: TenderSurface,
  compare: CompareSurface,
};

const CRUMBS: Record<string, string> = {
  upload: "New project",
  reading: "Reading your documents",
  scope: "Scope of works",
  live: "Your round",
  tenders: "Tenders",
  compare: "The comparison",
  close: "Done",
};

/* ── anchored positioning ───────────────────────────────────────────── */

interface AnchorBox {
  top: number;
  left: number;
  width: number;
  placement: "above" | "below";
  arrowX: number;
  /** Which beat this measurement belongs to; stale boxes derive away. */
  forStep: string;
}

/**
 * Where the callout sits: beside the element the beat describes.
 * Measured after the target has been scrolled to centre, re-measured
 * on scroll and resize, and null on phones, where callouts fall back
 * to the bottom sheet. State only ever moves inside timers and
 * listeners; the no-anchor cases derive at return.
 */
function useAnchor(
  targetId: string | null,
  stepId: string,
  desktop: boolean,
  reduceMotion: boolean,
): AnchorBox | null {
  const [box, setBox] = useState<AnchorBox | null>(null);
  useEffect(() => {
    if (!targetId || !desktop) return;
    const el = document.querySelector(`[data-demo-target="${targetId}"]`);
    if (!el) return;
    el.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "center",
    });
    const measure = () => {
      const r = el.getBoundingClientRect();
      const width = Math.min(400, window.innerWidth - 32);
      const centre = r.left + r.width / 2;
      const left = Math.min(
        Math.max(16, centre - width / 2),
        window.innerWidth - width - 16,
      );
      // Below the element when there is room for a card; above it
      // otherwise. 240px comfortably covers the tallest callout.
      const below = r.bottom + 240 < window.innerHeight;
      setBox({
        top: below ? r.bottom + 14 : r.top - 14,
        left,
        width,
        placement: below ? "below" : "above",
        arrowX: Math.min(Math.max(22, centre - left), width - 22),
        forStep: stepId,
      });
    };
    const t = setTimeout(measure, reduceMotion ? 80 : 460);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [targetId, stepId, desktop, reduceMotion]);
  if (!targetId || !desktop) return null;
  return box && box.forStep === stepId ? box : null;
}

/** Tracks the sm breakpoint so callouts know when to anchor. */
function useDesktop(): boolean {
  const [desktop, setDesktop] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return desktop;
}

/* ── the experience ─────────────────────────────────────────────────── */

export function DemoExperience() {
  const reduceMotion = !!useReducedMotion();
  const desktop = useDesktop();
  const script = HOMEOWNER_SCRIPT;

  const [pos, setPos] = useState({ stage: 0, step: 0 });
  const stage: DemoStage = script[pos.stage]!;
  const step: DemoStep | null = stage.steps[pos.step] ?? null;
  const isClose = stage.id === "close";
  const isIntro = step?.kind === "intro";

  const totalSteps = useMemo(
    () => script.reduce((n, s) => n + s.steps.length, 0) + 1,
    [script],
  );
  const doneSteps = useMemo(() => {
    let n = 0;
    for (let i = 0; i < pos.stage; i++) n += script[i]!.steps.length;
    return n + pos.step + (isClose ? 1 : 0);
  }, [script, pos, isClose]);

  /* ── movement ────────────────────────────────────────────────────── */

  const advance = useCallback(() => {
    setPos((p) => {
      const s = script[p.stage]!;
      if (p.step + 1 < s.steps.length) return { stage: p.stage, step: p.step + 1 };
      if (p.stage + 1 < script.length) return { stage: p.stage + 1, step: 0 };
      return p;
    });
  }, [script]);

  const back = useCallback(() => {
    setPos((p) => {
      if (p.step > 0) return { stage: p.stage, step: p.step - 1 };
      if (p.stage > 0) {
        const prev = script[p.stage - 1]!;
        return { stage: p.stage - 1, step: Math.max(0, prev.steps.length - 1) };
      }
      return p;
    });
  }, [script]);

  const jumpToStage = useCallback((idx: number) => {
    setPos({ stage: idx, step: 0 });
  }, []);

  /**
   * A surface control was clicked. The current click step's target
   * advances as expected — and initiative is rewarded rather than
   * ignored: when the clicked control belongs to a LATER click step
   * in this stage and everything between is observation, the
   * walkthrough treats the click as that step's own action and lands
   * just past it.
   */
  const onAction = useCallback(
    (target: string) => {
      if (step?.kind === "click" && step.target === target) {
        advance();
        return;
      }
      const steps = stage.steps;
      for (let i = pos.step + 1; i < steps.length; i++) {
        const candidate = steps[i]!;
        if (candidate.kind !== "click") continue;
        if (candidate.target !== target) break;
        const between = steps.slice(pos.step, i);
        if (between.some((b) => b.kind === "click")) break;
        const after = i + 1;
        if (after < steps.length) {
          setPos({ stage: pos.stage, step: after });
        } else if (pos.stage + 1 < script.length) {
          setPos({ stage: pos.stage + 1, step: 0 });
        }
        return;
      }
    },
    [step, advance, stage, pos, script],
  );

  /* ── watch beats play themselves ─────────────────────────────────── */

  useEffect(() => {
    if (step?.kind !== "watch") return;
    // Reduced motion snaps the animation, not the reading: the copy
    // still needs its time on screen.
    const ms = reduceMotion
      ? Math.max(4000, (step.watchMs ?? 4500) - 1200)
      : (step.watchMs ?? 4500);
    const t = setTimeout(advance, ms);
    return () => clearTimeout(t);
  }, [step, advance, reduceMotion]);

  /* ── keyboard ────────────────────────────────────────────────────── */

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      // Cmd/Alt/Ctrl + arrow are the browser's own shortcuts (history
      // among them); a demo must never swallow them. Held keys
      // advance one beat, not twenty.
      if (e.metaKey || e.altKey || e.ctrlKey || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if ((e.key === "ArrowRight" || e.key === "Enter") && step && step.kind !== "click") {
        if (t && (t.tagName === "A" || t.tagName === "BUTTON")) return;
        e.preventDefault();
        advance();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        back();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [step, advance, back]);

  /* ── a long surface leaves the page scrolled; the next stage must
        always open at its top — the deck carries the same rule. ────── */
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [stage.id]);

  /* ── measurement ─────────────────────────────────────────────────── */

  useEffect(() => {
    track("demo_opened", { script: "homeowner" });
    trackMetaEvent("ViewContent", { content_name: "product_demo" });
  }, []);

  const seenStages = useRef(new Set<string>());
  useEffect(() => {
    if (seenStages.current.has(stage.id)) return;
    seenStages.current.add(stage.id);
    track("demo_stage", { stage: stage.id });
    if (stage.id === "close") {
      // Completion is the demo's one conversion signal and Meta will
      // optimise on it, so a curiosity click on the rail's last chip
      // must not count: it only fires when every stage was walked.
      const walked = script.every(
        (st) => st.id === "close" || seenStages.current.has(st.id),
      );
      if (walked) {
        track("demo_completed", {});
        trackMetaCustomEvent("DemoCompleted", { content_name: "product_demo" });
      } else {
        track("demo_skipped_to_end", {});
      }
    }
  }, [stage.id, script]);

  const onSignupClick = useCallback(() => {
    track("demo_signup_click", {});
  }, []);

  // The active callout is the walkthrough's voice: focusing it keeps
  // keyboard users anchored and has screen readers announce the beat.
  const cardRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    cardRef.current?.focus({ preventScroll: true });
  }, [pos]);

  const anchor = useAnchor(
    step && (step.kind === "note" || step.kind === "click")
      ? (step.target ?? null)
      : null,
    step?.id ?? "",
    desktop,
    reduceMotion,
  );

  /* ── render ──────────────────────────────────────────────────────── */

  const Surface = SURFACES[stage.id];
  const stageNo = pos.stage + 1;
  const atStart = pos.stage === 0 && pos.step === 0;

  const cardInner = step ? (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[9.5px] tracking-[0.2em] uppercase text-accent-light font-ui font-semibold tabular-nums">
          Part {stageNo} of {script.length} · {stage.rail}
        </p>
        <span className="flex items-center gap-1.5" aria-hidden>
          {stage.steps.map((x, i) => (
            <span
              key={x.id}
              className={cn(
                "rounded-full transition-all duration-300",
                i === pos.step
                  ? "w-4 h-1.5 bg-accent"
                  : "size-1.5 bg-[rgba(24,34,44,0.16)]",
              )}
            />
          ))}
        </span>
      </div>
      <p className="mt-1.5 font-ui font-semibold text-[15px] text-text">
        {step.title}
      </p>
      <p className="mt-1 text-[12.5px] leading-[1.65] text-text-muted">
        {step.line}
      </p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={back}
          disabled={atStart}
          className={cn(
            "inline-flex items-center gap-1.5 h-9 px-2.5 -ml-2.5 rounded-full text-[12px] transition-colors",
            atStart
              ? "text-text-faint cursor-default"
              : "text-text-muted hover:text-text",
          )}
        >
          <ArrowLeft className="size-3.5" />
          Back
        </button>

        {step.kind === "click" ? (
          <span className="inline-flex items-center gap-2 text-[12.5px] font-ui font-semibold text-accent-light">
            <MousePointerClick
              className={cn("size-4", !reduceMotion && "animate-pulse")}
            />
            {step.prompt}
          </span>
        ) : step.kind === "watch" ? (
          <span className="flex items-center gap-3">
            <span className="relative w-24 h-[4px] rounded-full bg-[rgba(24,34,44,0.08)] overflow-hidden">
              <motion.span
                key={step.id}
                className="absolute inset-y-0 left-0 bg-accent rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{
                  duration:
                    (reduceMotion
                      ? Math.max(4000, (step.watchMs ?? 4500) - 1200)
                      : (step.watchMs ?? 4500)) / 1000,
                  ease: "linear",
                }}
              />
            </span>
            <button
              type="button"
              onClick={advance}
              className="inline-flex items-center h-9 px-3 -mr-2 rounded-full text-[12px] text-text-muted hover:text-text transition-colors"
            >
              Skip
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={advance}
            className="inline-flex items-center gap-1.5 h-9 px-4.5 rounded-full bg-accent text-accent-contrast text-[12.5px] font-semibold hover:bg-accent-hover transition-colors"
          >
            Continue
            <ArrowRight className="size-3.5" />
          </button>
        )}
      </div>
    </>
  ) : null;

  return (
    <div className="min-h-dvh bg-bg text-text antialiased flex flex-col">
      {/* ── the product's chrome ───────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-bg/90 backdrop-blur-md border-b border-border-subtle">
        <div className="mx-auto max-w-[1080px] px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="flex items-center gap-1 shrink-0" aria-label="BuilderHQ home">
              <span className="font-ui font-bold tracking-[-0.02em] text-[15px] text-text">
                Builder<span className="text-accent-light">HQ</span>
              </span>
            </Link>
            <span className="px-2 py-0.5 rounded-full bg-accent-muted text-accent-light text-[9.5px] tracking-[0.14em] uppercase font-ui font-bold shrink-0">
              Demo
            </span>
            <span className="hidden md:block text-[12px] text-text-dim truncate">
              / {CRUMBS[stage.id]}
            </span>
          </div>

          <nav className="hidden lg:flex items-center gap-1" aria-label="Demo stages">
            {script.map((s, i) => {
              const done = i < pos.stage;
              const current = i === pos.stage;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => jumpToStage(i)}
                  aria-current={current ? "step" : undefined}
                  className={cn(
                    "px-2.5 h-8 rounded-full text-[11px] font-ui transition-colors",
                    current
                      ? "bg-accent-muted text-accent-light font-semibold"
                      : done
                        ? "text-text-muted hover:text-text"
                        : "text-text-faint hover:text-text-dim",
                  )}
                >
                  {s.rail}
                </button>
              );
            })}
          </nav>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 h-9 px-3 -mr-3 rounded-full text-[12px] text-text-muted hover:text-text transition-colors shrink-0"
          >
            <X className="size-3.5" />
            Leave the demo
          </Link>
        </div>
        <div className="h-[2px] bg-[rgba(24,34,44,0.06)]" aria-hidden>
          <motion.div
            className="h-full bg-accent"
            animate={{ width: `${Math.round((doneSteps / totalSteps) * 100)}%` }}
            transition={{ duration: reduceMotion ? 0 : 0.45, ease: EASE }}
          />
        </div>
      </header>

      {/* ── the surface ────────────────────────────────────────────── */}
      <main className="flex-1">
        <div
          className={cn(
            "mx-auto max-w-[1080px] px-4 sm:px-6 pt-8 sm:pt-12",
            isClose ? "pb-16" : "pb-56 sm:pb-40",
          )}
        >
          {/* Keyed remount, entrance only. An exit animation makes the
              next stage wait on the old one's completion, and a starved
              tab never delivers it: the deck in the product carries the
              same rule for the same reason. */}
          <motion.div
            key={stage.id}
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, ease: EASE }}
            aria-hidden={isIntro || undefined}
            className={cn(
              "transition-[filter,opacity] duration-500",
              isIntro && "blur-[6px] opacity-60 pointer-events-none select-none",
            )}
          >
            {isClose ? (
              <CloseSurface
                reduceMotion={reduceMotion}
                onPrimary={onSignupClick}
                close={DEMO_CLOSE}
                disclaimer={DEMO_DISCLAIMER}
              />
            ) : Surface ? (
              <Surface
                stepIdx={pos.step}
                spot={step?.kind === "click" ? (step.target ?? null) : null}
                soft={step?.kind === "note" ? (step.target ?? null) : null}
                onAction={onAction}
                reduceMotion={reduceMotion}
              />
            ) : null}
          </motion.div>
        </div>
      </main>

      {/* ── the stage opener: text first, the surface waiting behind ── */}
      {isIntro && step ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-6 bg-[rgba(244,241,234,0.55)]">
          <motion.div
            key={step.id}
            ref={cardRef}
            tabIndex={-1}
            data-quiet-focus
            role="group"
            aria-label={`${step.title}. ${step.line}`}
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="outline-none select-none max-w-[640px] w-full text-center"
          >
            <p className="text-[10.5px] tracking-[0.32em] uppercase text-accent-light font-ui font-bold">
              {step.kicker}
            </p>
            <h2 className="mt-4 font-ui font-semibold tracking-[-0.035em] text-[34px] sm:text-[46px] leading-[1.06] text-text">
              {step.title}
            </h2>
            <p className="mt-4 text-[15px] sm:text-[16px] leading-[1.7] text-text-muted max-w-[46ch] mx-auto">
              {step.line}
            </p>
            <div className="mt-8 flex items-center justify-center gap-4">
              {!atStart ? (
                <button
                  type="button"
                  onClick={back}
                  className="inline-flex items-center gap-1.5 h-11 px-4 rounded-full text-[12.5px] text-text-muted hover:text-text transition-colors"
                >
                  <ArrowLeft className="size-3.5" />
                  Back
                </button>
              ) : null}
              <button
                type="button"
                onClick={advance}
                className="inline-flex items-center gap-2 h-12 px-7 rounded-full bg-accent text-accent-contrast text-[13px] font-semibold tracking-[0.02em] hover:bg-accent-hover transition-colors shadow-[0_0_0_1px_rgba(0,212,200,0.35),_0_12px_32px_-12px_rgba(0,212,200,0.5)]"
              >
                Continue
                <ArrowRight className="size-4" />
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}

      {/* ── anchored callout (desktop notes and clicks) ────────────── */}
      {!isClose && step && (step.kind === "note" || step.kind === "click") && anchor ? (
        <motion.div
          key={step.id}
          ref={cardRef}
          tabIndex={-1}
          data-quiet-focus
          role="group"
          aria-label={`${step.title}. ${step.line}`}
          initial={reduceMotion ? false : { opacity: 0, y: anchor.placement === "below" ? 10 : -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          style={{
            top: anchor.top,
            left: anchor.left,
            width: anchor.width,
            transform: anchor.placement === "above" ? "translateY(-100%)" : undefined,
          }}
          className="fixed z-40 outline-none rounded-xl border border-border-subtle bg-surface-1 card-elev-lg px-5 py-4"
        >
          {/* the caret tying the callout to its element */}
          <span
            aria-hidden
            style={{ left: anchor.arrowX }}
            className={cn(
              "absolute size-3 -translate-x-1/2 rotate-45 bg-surface-1 border-border-subtle",
              anchor.placement === "below"
                ? "-top-[7px] border-l border-t"
                : "-bottom-[7px] border-r border-b",
            )}
          />
          {cardInner}
        </motion.div>
      ) : null}

      {/* ── bottom card: watch beats, and every beat on phones ─────── */}
      {!isClose &&
      step &&
      !isIntro &&
      (step.kind === "watch" || ((step.kind === "note" || step.kind === "click") && !anchor)) ? (
        <div className="fixed inset-x-0 bottom-0 sm:inset-x-4 sm:bottom-5 z-40 sm:mx-auto sm:max-w-[560px] pointer-events-none">
          <motion.div
            key={step.id}
            ref={step.kind === "watch" || !desktop ? cardRef : undefined}
            tabIndex={-1}
            data-quiet-focus
            role="group"
            aria-label={`${step.title}. ${step.line}`}
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: EASE }}
            className={cn(
              "pointer-events-auto outline-none border border-border-subtle bg-surface-1 card-elev-lg px-5 py-4",
              "rounded-t-2xl sm:rounded-xl pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4",
            )}
          >
            {cardInner}
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}
