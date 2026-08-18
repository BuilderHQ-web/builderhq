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
import { Logo } from "@/components/brand/logo";
import { track } from "@/lib/analytics";
import {
  trackMetaCustomEvent,
  trackMetaEvent,
} from "@/components/analytics/meta-pixel";
import { type DemoStage, type DemoStep } from "./content";
import {
  AppFrame,
  CloseSurface,
  type CloseCopy,
  type SurfaceProps,
} from "./ui";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * One walkthrough, fully described: the engine runs whichever script
 * it is handed, so the homeowner and architect demos are two configs
 * on one runtime rather than two runtimes.
 */
export interface DemoConfig {
  /** Analytics identity: "homeowner", "architect". */
  id: string;
  script: DemoStage[];
  /** Breadcrumb text per stage id. */
  crumbs: Record<string, string>;
  surfaces: Record<string, React.ComponentType<SurfaceProps>>;
  close: CloseCopy;
  disclaimer: string;
}

/* ── anchored positioning ───────────────────────────────────────────── */

/** The breathing room between an element and the card under it. */
const GAP = 14;

interface AnchorBox {
  /** Where the card's top edge sits, in the content container's own
   *  coordinate space: under the element, and under anything the
   *  card would otherwise cover. */
  edgeTop: number;
  left: number;
  width: number;
  arrowX: number;
  /** The caret is drawn only when the card still touches its
   *  element; once it has been pushed clear, it would point at
   *  nothing. */
  caret: boolean;
  /** Which beat this measurement belongs to; stale boxes derive away. */
  forStep: string;
}

/**
 * Where the callout sits: always UNDER the element the beat
 * describes, positioned in the document rather than the viewport, so
 * it scrolls with its section and can never drift over anything.
 * Null on phones, where callouts fall back to the bottom sheet.
 */
function useAnchor(
  targetId: string | null,
  stepId: string,
  desktop: boolean,
  container: React.RefObject<HTMLDivElement | null>,
  card: React.RefObject<HTMLDivElement | null>,
): AnchorBox | null {
  const [box, setBox] = useState<AnchorBox | null>(null);
  useEffect(() => {
    if (!targetId || !desktop) return;
    const el = document.querySelector(`[data-demo-target="${targetId}"]`);
    const host = container.current;
    if (!el || !host) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const c = host.getBoundingClientRect();
      const width = Math.min(400, c.width);
      const centre = r.left + r.width / 2 - c.left;
      const left = Math.min(Math.max(0, centre - width / 2), c.width - width);
      const height = card.current?.offsetHeight ?? 150;

      // The card sits under the element, and under anything it would
      // otherwise cover: a half hidden button is the thing the demo
      // must never do. Each pass can uncover the next control down,
      // so the clearance settles over a few rounds.
      let top = r.bottom + GAP;
      for (let pass = 0; pass < 4; pass += 1) {
        let pushed = top;
        document.querySelectorAll("button, a, input").forEach((node) => {
          if (node === el || el.contains(node)) return;
          if (node.closest("[data-demo-callout]") || node.closest("header"))
            return;
          const b = node.getBoundingClientRect();
          if (b.width === 0 || b.height === 0) return;
          const clearsSide =
            b.right < c.left + left + 6 || b.left > c.left + left + width - 6;
          if (clearsSide) return;
          if (b.bottom > pushed && b.top < top + height) pushed = b.bottom + GAP;
        });
        if (pushed === top) break;
        top = pushed;
      }

      // Scroll so the element and its card are both on screen: the
      // card's foot above the fold, the element clear of the header.
      // Done here, not once up front, because sections often mount on
      // the beat that points at them and only later passes see the
      // settled layout.
      const y = window.scrollY;
      const room = window.innerHeight;
      const lowest = y + top + height + 24 - room;
      const highest = y + r.top - 96;
      const wanted = Math.max(
        0,
        Math.min(Math.max(lowest, y + r.top - room * 0.3), Math.max(0, highest)),
      );
      // "instant", explicitly: the page sets scroll-behavior smooth,
      // and a smooth glide here is the bottom flash then jump bug.
      if (Math.abs(wanted - y) > 4)
        window.scrollTo({ top: wanted, behavior: "instant" });

      setBox({
        edgeTop: top - c.top,
        left,
        width,
        arrowX: Math.min(Math.max(22, centre - left), width - 22),
        // Only the caret needs to know the element is further up.
        caret: top - r.bottom <= GAP + 1,
        forStep: stepId,
      });
    };
    const t = setTimeout(measure, 50);
    // Surfaces animate in over ~400ms and spot rings settle after;
    // later passes land the card on the settled layout.
    const t2 = setTimeout(measure, 520);
    const t3 = setTimeout(measure, 950);
    // Blocks that arrive on the beat itself change the page under
    // the card: measure again whenever the surface grows. The card
    // is absolutely positioned, so it cannot feed this back.
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
      clearTimeout(t3);
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [targetId, stepId, desktop, container, card]);
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

export function DemoExperience({ config }: { config: DemoConfig }) {
  const reduceMotion = !!useReducedMotion();
  const desktop = useDesktop();
  const { script } = config;

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

  /* ── phones have no anchored callout to drive the scroll, so the
        bottom sheet must never narrate an element that is off screen:
        each anchored beat brings its element into view itself. ─────── */
  useEffect(() => {
    if (desktop) return;
    const target =
      step && (step.kind === "note" || step.kind === "click")
        ? (step.target ?? null)
        : null;
    if (!target) return;
    const t = setTimeout(() => {
      document
        .querySelector(`[data-demo-target="${target}"]`)
        ?.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "center",
        });
    }, 160);
    return () => clearTimeout(t);
  }, [step, desktop, reduceMotion]);

  /* ── measurement ─────────────────────────────────────────────────── */

  useEffect(() => {
    track("demo_opened", { script: config.id });
    trackMetaEvent("ViewContent", {
      content_name: "product_demo",
      content_category: config.id,
    });
  }, [config.id]);

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
        track("demo_completed", { script: config.id });
        trackMetaCustomEvent("DemoCompleted", {
          content_name: "product_demo",
          content_category: config.id,
        });
      } else {
        track("demo_skipped_to_end", { script: config.id });
      }
    }
  }, [stage.id, script, config.id]);

  const onSignupClick = useCallback(() => {
    track("demo_signup_click", {});
  }, []);

  // The active callout is the walkthrough's voice: focusing it keeps
  // keyboard users anchored and has screen readers announce the beat.
  const cardRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    cardRef.current?.focus({ preventScroll: true });
  }, [pos]);

  const contentRef = useRef<HTMLDivElement | null>(null);
  const anchor = useAnchor(
    step && (step.kind === "note" || step.kind === "click")
      ? (step.target ?? null)
      : null,
    step?.id ?? "",
    desktop,
    contentRef,
    cardRef,
  );

  /* ── render ──────────────────────────────────────────────────────── */

  const Surface = config.surfaces[stage.id];
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
      <p className="mt-1.5 font-ui font-semibold text-[15.5px] tracking-[-0.01em] text-text">
        {step.title}
      </p>
      <p className="mt-1 text-[12.5px] leading-[1.65] text-text-muted">
        {step.line}
      </p>
      {step.kind === "click" ? (
        <p className="mt-2.5 flex items-center gap-2 rounded-lg bg-accent-muted px-3 py-2 text-[12.5px] font-ui font-semibold text-accent-light">
          <MousePointerClick
            className={cn("size-4 shrink-0", !reduceMotion && "animate-pulse")}
          />
          {step.prompt}
        </p>
      ) : null}
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
          <span className="text-[11px] text-text-dim">
            Use the screen above
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
            <Link href="/" className="flex items-center shrink-0" aria-label="BuilderHQ home">
              <Logo height={25} tone="dark" />
            </Link>
            <span className="px-2 py-0.5 rounded-full bg-accent-muted text-accent-light text-[9.5px] tracking-[0.14em] uppercase font-ui font-bold shrink-0">
              Demo
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
          ref={contentRef}
          className={cn(
            "relative mx-auto max-w-[1080px] px-4 sm:px-6 pt-8 sm:pt-12",
            isClose ? "pb-16" : "pb-56 sm:pb-64",
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
                close={config.close}
                disclaimer={config.disclaimer}
              />
            ) : Surface ? (
              <AppFrame crumb={config.crumbs[stage.id] ?? ""}>
                <Surface
                  stepIdx={pos.step}
                  spot={step?.kind === "click" ? (step.target ?? null) : null}
                  soft={step?.kind === "note" ? (step.target ?? null) : null}
                  onAction={onAction}
                  reduceMotion={reduceMotion}
                />
              </AppFrame>
            ) : null}
          </motion.div>

          {/* ── anchored callout: sits under the element it describes,
                 in the document, so it scrolls with its section ────── */}
          {!isClose &&
          step &&
          (step.kind === "note" || step.kind === "click") &&
          anchor ? (
            <motion.div
              key={step.id}
              ref={cardRef}
              tabIndex={-1}
              data-quiet-focus
              role="group"
              aria-label={`${step.title}. ${step.line}`}
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              data-demo-callout
              style={{
                top: anchor.edgeTop,
                left: anchor.left,
                width: anchor.width,
              }}
              className="absolute z-30 outline-none rounded-xl border border-border-subtle border-l-[3px] border-l-accent bg-surface-1 card-elev-lg px-5 py-4"
            >
              {/* the caret tying the callout to its element */}
              {anchor.caret ? (
                <span
                  aria-hidden
                  style={{ left: anchor.arrowX }}
                  className="absolute -top-[7px] size-3 -translate-x-1/2 rotate-45 bg-surface-1 border-l border-t border-border-subtle"
                />
              ) : null}
              {cardInner}
            </motion.div>
          ) : null}
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

      {/* ── bottom card: watch beats, and every beat on phones ─────── */}
      {!isClose &&
      step &&
      !isIntro &&
      (step.kind === "watch" ||
        ((step.kind === "note" || step.kind === "click") && !desktop)) ? (
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
