"use client";

/**
 * The demo engine — the runtime that walks a visitor through the
 * scripted journey in content.ts.
 *
 * Anatomy:
 *   · a persistent shell that reads as the product's own chrome
 *     (top bar, breadcrumb, progress line), with a quiet Demo mark
 *     and an exit that is always one click away;
 *   · a stage rail across the top so the visitor always knows where
 *     they are and can jump, because a demo that traps people gets
 *     closed, not finished;
 *   · the guide card along the bottom, one beat at a time: observe
 *     beats advance on Continue, click beats point at a real control
 *     in the surface, watch beats play themselves out with a Skip
 *     always offered;
 *   · surfaces derive everything from the step index, so Back
 *     genuinely rewinds the world.
 *
 * Honesty is part of the design: the reading is compressed and the
 * script says so, and the figures are marked illustrative.
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

export function DemoExperience() {
  const reduceMotion = !!useReducedMotion();
  const script = HOMEOWNER_SCRIPT;

  const [pos, setPos] = useState({ stage: 0, step: 0 });
  const stage: DemoStage = script[pos.stage]!;
  const step: DemoStep | null = stage.steps[pos.step] ?? null;
  const isClose = stage.id === "close";

  // Overall progress for the hairline under the top bar.
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
   * just past it. A live-looking button that silently does nothing is
   * the fastest way to lose a visitor's trust in the whole surface.
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
    // Reduced motion snaps the animation, not the reading: the guide
    // copy still needs its time on screen, so the beat holds for at
    // least four seconds either way.
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
      // among them); a demo must never swallow them. Held keys advance
      // one beat, not twenty.
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

  // The card is the walkthrough's voice: focusing it on every beat
  // keeps keyboard users anchored and has screen readers announce the
  // step, the same pattern the unlock tour uses in the product.
  const cardRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    cardRef.current?.focus({ preventScroll: true });
  }, [pos]);

  /* ── render ──────────────────────────────────────────────────────── */

  const Surface = SURFACES[stage.id];
  const stageNo = pos.stage + 1;

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

          {/* stage rail */}
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
                    "px-2.5 h-7 rounded-full text-[11px] font-ui transition-colors",
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
        {/* progress hairline */}
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
            // Room for the guide card, which floats over the foot of
            // the page.
            isClose ? "pb-16" : "pb-56 sm:pb-48",
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
                  onAction={onAction}
                  reduceMotion={reduceMotion}
                />
              ) : null}
          </motion.div>
        </div>
      </main>

      {/* ── the guide card ─────────────────────────────────────────── */}
      {!isClose && step ? (
        <div className="fixed inset-x-0 bottom-0 sm:inset-x-4 sm:bottom-5 z-40 sm:mx-auto sm:max-w-[560px] pointer-events-none">
          <motion.div
            key={step.id}
            ref={cardRef}
            tabIndex={-1}
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
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[9.5px] tracking-[0.2em] uppercase text-accent-light font-ui font-semibold tabular-nums">
                Part {stageNo} of {script.length} · {stage.rail}
              </p>
              {/* step dots for this stage */}
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

            <p className="mt-1.5 font-ui font-semibold text-[15.5px] text-text">
              {step.title}
            </p>
            <p className="mt-1 text-[12.5px] leading-[1.65] text-text-muted">
              {step.line}
            </p>

            <div className="mt-3.5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={back}
                disabled={pos.stage === 0 && pos.step === 0}
                className={cn(
                  "inline-flex items-center gap-1.5 h-9 px-2.5 rounded-full text-[12px] transition-colors",
                  pos.stage === 0 && pos.step === 0
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
                        duration: (reduceMotion ? 1400 : (step.watchMs ?? 4500)) / 1000,
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
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}
