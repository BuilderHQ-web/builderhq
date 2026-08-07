"use client";

/**
 * The unlock tour — shown once, the first time a builder opens a
 * project they hold a spot on.
 *
 * Two movements. First the moment itself: a full-screen beat that
 * says the project is unlocked, with the title given its due. Then a
 * short guided walk of the real page: the tour scrolls to each
 * section in turn and lifts it into a spotlight while everything else
 * sits dimmed and blurred behind it, with one plain line saying what
 * the section is. Next moves on; it never returns for that project.
 * The very first walkthrough a builder ever takes has no skip — it is
 * six quick steps and they should see them once. From their second
 * unlocked project on, Skip and Escape leave at any point.
 *
 * The spotlight works by elevation, not by cutting holes: a fixed
 * blurred scrim covers the page, and the current section is raised
 * above it on a lit panel via inline styles applied to the section's
 * own element (and reverted on every step change and on exit). The
 * sections are the page's real ones, so the tour can never drift from
 * the page it describes.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

const KEY_PREFIX = "bhq.unlock-tour.v1.";
/** Set after the builder's first ever walkthrough, on any project —
 *  from then on the tour can be skipped. */
const ANY_SEEN_KEY = "bhq.unlock-tour.seen-any.v1";
const EASE = [0.22, 1, 0.36, 1] as const;

/* ── the walk ───────────────────────────────────────────────────────── */

interface TourStop {
  /** The id of the section on the page. Missing ids skip the stop. */
  target: string;
  title: string;
  line: string;
  /** Fixed elements spotlight in place — no scroll, no panel. */
  fixed?: boolean;
}

const STOPS: TourStop[] = [
  {
    target: "facts",
    title: "Project details",
    line: "The type, size, budget and timing. The full address is on the right.",
  },
  {
    target: "scope",
    title: "Scope of works",
    line: "Prepared by BuilderHQ: our AI read every page of the documents and wrote the build into these lines. Search them, or download the lot as a PDF.",
  },
  {
    target: "documents",
    title: "Documents",
    line: "Every drawing and report. Download them one by one, or all at once.",
  },
  {
    target: "owner",
    title: "The owner",
    line: "Their contact details. You can call or email them directly.",
  },
  {
    target: "messaging",
    title: "Messages",
    line: "Talk to the owner here. Every conversation stays with the project.",
  },
  {
    target: "tender-cta",
    title: "Your tender",
    line: "When you are ready, start here. Answer the questions and we build your tender document.",
    fixed: true,
  },
];

/* ── spotlight mechanics ────────────────────────────────────────────── */

interface TouchedNode {
  el: HTMLElement;
  prevStyle: string | null;
}

interface SpotState {
  touched: TouchedNode[];
  timer: ReturnType<typeof setTimeout> | null;
}

/** Does this element start a stacking context the elevation must
 *  climb through? Entrance animations (transforms, partial opacity)
 *  are the usual culprits. */
function makesStackingContext(cs: CSSStyleDeclaration): boolean {
  return (
    cs.transform !== "none" ||
    cs.filter !== "none" ||
    cs.perspective !== "none" ||
    Number(cs.opacity) < 1 ||
    cs.willChange.includes("transform") ||
    cs.willChange.includes("opacity") ||
    (cs.position !== "static" && cs.zIndex !== "auto")
  );
}

function spotlightOn(el: HTMLElement, panel: boolean): SpotState {
  const touched: TouchedNode[] = [];
  const remember = (node: HTMLElement) => {
    touched.push({ el: node, prevStyle: node.getAttribute("style") });
  };

  // Every ancestor that traps z-index gets lifted with the section,
  // or the scrim would blur the very thing the walk is pointing at.
  // Entrance wrappers caught mid-animation settle to their final
  // state (fully visible, untransformed) so the spotlight never
  // points at a half-faded section.
  let node = el.parentElement;
  while (node && node !== document.body) {
    const cs = getComputedStyle(node);
    if (makesStackingContext(cs)) {
      remember(node);
      if (cs.position === "static") node.style.position = "relative";
      node.style.zIndex = "60";
      node.style.opacity = "1";
      node.style.transform = "none";
    }
    node = node.parentElement;
  }

  remember(el);
  el.style.transition =
    "box-shadow 0.35s ease, background-color 0.35s ease, padding 0.35s ease, margin 0.35s ease";
  const apply = () => {
    el.style.position = "relative";
    el.style.zIndex = "60";
    if (panel) {
      el.style.backgroundColor = "#ffffff";
      el.style.borderRadius = "16px";
      el.style.padding = "20px";
      el.style.margin = "-20px";
      el.style.boxShadow =
        "0 0 0 1px rgba(0,212,200,0.4), 0 30px 80px -30px rgba(15,23,32,0.45)";
    } else {
      el.style.boxShadow =
        "0 0 0 1px rgba(0,212,200,0.5), 0 -18px 60px -20px rgba(15,23,32,0.4)";
    }
  };
  // A short timeout (never rAF, which starves in background tabs)
  // lets the transition property land first so the lift animates.
  const timer = setTimeout(apply, 30);
  return { touched, timer };
}

function spotlightOff(spot: SpotState | null) {
  if (!spot) return;
  if (spot.timer) clearTimeout(spot.timer);
  for (const t of spot.touched) {
    if (t.prevStyle) t.el.setAttribute("style", t.prevStyle);
    else t.el.removeAttribute("style");
  }
}

/* ── the component ──────────────────────────────────────────────────── */

export function UnlockTour({
  projectId,
  projectTitle,
}: {
  projectId: string;
  projectTitle: string;
}) {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<"hidden" | "opening" | "tour">("hidden");
  const [stops, setStops] = useState<TourStop[]>([]);
  const [step, setStep] = useState(0);
  // The builder's very first walkthrough, on any project, has no
  // skip: six quick steps, seen once. Later projects can skip.
  const [canSkip, setCanSkip] = useState(false);
  const spotRef = useRef<SpotState | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let seen = true;
    let skippable = false;
    try {
      seen = window.localStorage.getItem(KEY_PREFIX + projectId) === "1";
      skippable = window.localStorage.getItem(ANY_SEEN_KEY) === "1";
    } catch {
      // Storage unavailable — skip the tour rather than loop it.
    }
    if (seen) return;
    // A short beat lets the page paint first, so the ceremony fades
    // in over the real thing rather than replacing a blank frame.
    const t = setTimeout(() => {
      setCanSkip(skippable);
      setPhase("opening");
    }, 250);
    return () => clearTimeout(t);
  }, [projectId]);

  const finish = useCallback(() => {
    spotlightOff(spotRef.current);
    spotRef.current = null;
    setPhase("hidden");
    try {
      window.localStorage.setItem(KEY_PREFIX + projectId, "1");
      window.localStorage.setItem(ANY_SEEN_KEY, "1");
    } catch {
      // Worst case it shows again next visit.
    }
    restoreFocusRef.current?.focus?.();
  }, [projectId]);

  const beginTour = useCallback(() => {
    // Only the sections this page actually has. Resolved at start, so
    // a legacy round without a scope section simply skips that stop.
    const present = STOPS.filter((s) => document.getElementById(s.target));
    if (present.length === 0) {
      finish();
      return;
    }
    setStops(present);
    setStep(0);
    setPhase("tour");
  }, [finish]);

  // Move the spotlight whenever the step changes.
  useEffect(() => {
    if (phase !== "tour") return;
    const stop = stops[step];
    if (!stop) return;
    const el = document.getElementById(stop.target);
    if (!el) return;
    spotlightOff(spotRef.current);
    spotRef.current = spotlightOn(el, !stop.fixed);
    if (!stop.fixed) {
      el.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      });
    }
    cardRef.current?.focus();
    return () => {
      spotlightOff(spotRef.current);
      spotRef.current = null;
    };
  }, [phase, step, stops, reduceMotion]);

  const next = useCallback(() => {
    if (step >= stops.length - 1) {
      // Done: the walk ends where the page begins.
      finish();
      window.scrollTo({
        top: 0,
        behavior: reduceMotion ? "auto" : "smooth",
      });
    } else {
      setStep((s) => s + 1);
    }
  }, [step, stops.length, finish, reduceMotion]);

  const back = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  // Keys: Escape leaves, arrows and Enter walk. Form fields keep
  // their keys.
  useEffect(() => {
    if (phase === "hidden") return;
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable)
      ) {
        return;
      }
      if (e.key === "Escape" && canSkip) {
        e.preventDefault();
        finish();
        return;
      }
      if (phase === "tour") {
        if (e.key === "ArrowRight" || e.key === "Enter") {
          if (t && (t.tagName === "A" || t.tagName === "BUTTON")) return;
          e.preventDefault();
          next();
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          back();
        }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [phase, next, back, finish, canSkip]);

  // Remember where focus was so leaving the tour puts it back.
  useEffect(() => {
    if (phase === "opening") {
      restoreFocusRef.current = document.activeElement as HTMLElement | null;
    }
  }, [phase]);

  if (phase === "hidden") return null;

  const d = (n: number) => (reduceMotion ? 0 : n);

  /* ── movement one: the unlock ─────────────────────────────────────── */
  if (phase === "opening") {
    return (
      <motion.div
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="fixed inset-0 z-[70] flex items-center justify-center px-6 bg-[rgba(250,248,243,0.94)] backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-label="Tender spot secured"
      >
        <div className="max-w-[560px] w-full text-center">
          {/* the mark: a ring drawing itself closed, a key turned */}
          <div className="relative mx-auto size-[92px]" aria-hidden>
            <svg viewBox="0 0 92 92" className="absolute inset-0">
              <circle
                cx="46"
                cy="46"
                r="43"
                fill="none"
                stroke="rgba(24,34,44,0.08)"
                strokeWidth="2"
              />
              <motion.circle
                cx="46"
                cy="46"
                r="43"
                fill="none"
                stroke="#00a69b"
                strokeWidth="2"
                strokeLinecap="round"
                transform="rotate(-90 46 46)"
                initial={reduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.1, delay: d(0.2), ease: EASE }}
              />
              <motion.path
                d="M32 47.5 L42 57.5 L61 37.5"
                fill="none"
                stroke="#0a7d73"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={reduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: d(1.0), ease: EASE }}
              />
            </svg>
          </div>

          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: d(0.9), ease: EASE }}
            className="mt-7 text-[10px] tracking-[0.34em] uppercase text-accent-deep font-ui font-semibold"
          >
            Tender spot secured
          </motion.p>
          <motion.h2
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: d(1.05), ease: EASE }}
            className="mt-3 font-display uppercase tracking-[-0.014em] text-[30px] sm:text-[40px] leading-[1.02] text-text break-words"
          >
            {projectTitle}
          </motion.h2>
          <motion.p
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: d(1.3), ease: EASE }}
            className="mt-4 text-[13.5px] leading-[1.7] text-text-muted max-w-[44ch] mx-auto"
          >
            You have full access to this project now. Here is a quick
            look at what is on this page.
          </motion.p>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: d(1.5), ease: EASE }}
            className="mt-8 flex items-center justify-center gap-4"
          >
            <button
              type="button"
              onClick={beginTour}
              className="inline-flex items-center gap-2 h-12 px-7 rounded-full bg-accent text-accent-contrast text-[13px] font-semibold tracking-[0.02em] hover:bg-accent-hover transition-colors shadow-[0_0_0_1px_rgba(0,212,200,0.35),_0_12px_32px_-12px_rgba(0,212,200,0.5)]"
            >
              Begin the walkthrough
              <ArrowRight className="size-4" />
            </button>
            {canSkip ? (
              <button
                type="button"
                onClick={finish}
                className="text-[12.5px] text-text-dim hover:text-text transition-colors"
              >
                Skip
              </button>
            ) : null}
          </motion.div>
        </div>
      </motion.div>
    );
  }

  /* ── movement two: the walk ───────────────────────────────────────── */
  const stop = stops[Math.min(step, stops.length - 1)]!;
  const last = step >= stops.length - 1;

  return (
    <>
      {/* the scrim: everything but the spotlight, dimmed and blurred.
          A click anywhere on it moves the walk along. */}
      <motion.div
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        onClick={next}
        className="fixed inset-0 z-50 bg-[rgba(24,34,44,0.42)] backdrop-blur-[3px]"
        aria-hidden
      />

      {/* the guide card */}
      <div
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`${stop.title}. ${stop.line}`}
        className={cn(
          "fixed inset-x-4 z-[70] mx-auto max-w-[430px] outline-none",
          stop.fixed ? "bottom-28 sm:bottom-32" : "bottom-5 sm:bottom-8",
        )}
      >
        <motion.div
          key={stop.target}
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
          className="rounded-xl border border-border-subtle bg-surface-1 card-elev-lg px-5 py-4"
        >
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[9.5px] tracking-[0.22em] uppercase text-accent-deep font-ui font-semibold tabular-nums">
              {step + 1} of {stops.length}
            </p>
            {canSkip ? (
              <button
                type="button"
                onClick={finish}
                className="text-[11px] text-text-dim hover:text-text transition-colors"
              >
                Skip tour
              </button>
            ) : null}
          </div>
          <p className="mt-1.5 font-ui font-semibold text-[15.5px] text-text">
            {stop.title}
          </p>
          <p className="mt-1 text-[12.5px] leading-[1.65] text-text-muted">
            {stop.line}
          </p>
          <div className="mt-3.5 flex items-center justify-between gap-3">
            {/* progress dots */}
            <span className="flex items-center gap-1.5" aria-hidden>
              {stops.map((x, i) => (
                <span
                  key={x.target}
                  className={cn(
                    "rounded-full transition-all duration-300",
                    i === step
                      ? "w-5 h-1.5 bg-accent"
                      : "size-1.5 bg-[rgba(24,34,44,0.18)]",
                  )}
                />
              ))}
            </span>
            <span className="flex items-center gap-2">
              {step > 0 ? (
                <button
                  type="button"
                  onClick={back}
                  className="inline-flex items-center h-9 px-3.5 rounded-full text-[12px] text-text-muted hover:text-text transition-colors"
                >
                  Back
                </button>
              ) : null}
              <button
                type="button"
                onClick={next}
                className="inline-flex items-center gap-1.5 h-9 px-4.5 rounded-full bg-accent text-accent-contrast text-[12.5px] font-semibold hover:bg-accent-hover transition-colors"
              >
                {last ? "Done" : "Next"}
                {!last ? <ArrowRight className="size-3.5" /> : null}
              </button>
            </span>
          </div>
        </motion.div>
      </div>
    </>
  );
}
