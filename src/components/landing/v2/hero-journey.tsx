"use client";

/**
 * HeroJourney — the whole platform, for one reader, in one sitting.
 *
 * The hero used to hold a single still screen. That was the right call
 * when nothing else on the page moved; it is the wrong one now that
 * every card in the deck demonstrates itself. So the hero does the
 * thing none of those cards can: it runs the entire journey end to end,
 * from the first upload to the job being awarded, so a visitor knows
 * within twenty seconds what the whole product is.
 *
 * Three decisions worth defending:
 *
 *   · The chrome never changes. One browser frame, one URL, and a
 *     breadcrumb that rewrites as the session navigates. Screens fade
 *     and rise into it rather than sliding, because sliding reads as a
 *     carousel of pictures and fading reads as one person moving
 *     through one product.
 *
 *   · The step index sits under the frame rather than over it. A title
 *     card between steps would tell the visitor what they are about to
 *     see and then make them wait for it; a rail tells them where they
 *     are, how far in, and how much is left, without ever interrupting.
 *
 *   · It stops when nobody is watching. Off screen, or on a hidden tab,
 *     the timeline is torn down rather than left spinning.
 *
 * Under prefers-reduced-motion the journey holds on its first step,
 * which is a complete screen, and the rail shows where that sits.
 */

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Lock } from "lucide-react";

import type { Role } from "./content";
import { ROLE_PALETTE } from "./content";
import { useRole } from "./role";
import { C } from "./scenes/kit";
import { JOURNEYS, type HeroStep } from "./scenes/journeys";

/** Pause between the last step and the loop restarting. */
const LOOP_PAUSE = 1500;

/**
 * Is the frame worth animating right now? Scroll measurement rather
 * than IntersectionObserver, for the reason documented in
 * scene-motion.tsx: a root inset by half in both directions collapses
 * to zero height and never reports.
 */
function useOnScreen(ref: React.RefObject<HTMLElement | null>): boolean {
  const [on, setOn] = React.useState(true);

  React.useEffect(() => {
    const measure = () => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const visible = r.bottom > 0 && r.top < window.innerHeight;
      setOn(visible && document.visibilityState === "visible");
    };
    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    document.addEventListener("visibilitychange", measure);
    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      document.removeEventListener("visibilitychange", measure);
    };
  }, [ref]);

  return on;
}

/**
 * Keyed on the lens, so switching audience remounts the journey rather
 * than resuming somebody else's story from step four.
 */
export function HeroJourney() {
  const { role } = useRole();
  return <Journey key={role} role={role} />;
}

function Journey({ role }: { role: Role }) {
  const pal = ROLE_PALETTE[role];
  const steps = JOURNEYS[role];

  const frame = React.useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(frame);
  const reduced = useReducedMotion();
  const running = onScreen && !reduced;

  const [i, setI] = React.useState(0);

  React.useEffect(() => {
    if (!running) return;
    const step = steps[i];
    if (!step) return;
    const last = i === steps.length - 1;
    const t = window.setTimeout(
      () => setI(last ? 0 : i + 1),
      step.hold + (last ? LOOP_PAUSE : 0),
    );
    return () => window.clearTimeout(t);
  }, [running, i, steps]);

  const step: HeroStep = steps[Math.min(i, steps.length - 1)]!;

  return (
    <div ref={frame} className="relative w-full max-w-[90%] sm:max-w-[540px] lg:max-w-[620px]">
      {/* Role-hued bloom behind the frame — re-lights per lens. */}
      <div
        aria-hidden
        className="absolute -inset-10 sm:-inset-16 pointer-events-none"
        style={{
          background: `radial-gradient(closest-side, ${pal.glow1}, transparent 74%)`,
          transition: "background 900ms cubic-bezier(0.22,1,0.36,1)",
        }}
      />

      <div className="relative">
        <div
          className="relative rounded-[16px] sm:rounded-[20px] border overflow-hidden"
          style={{
            borderColor: "rgba(24,34,44,0.12)",
            background: "#ffffff",
            boxShadow:
              "0 60px 120px -48px rgba(24,34,44,0.5), 0 20px 44px -26px rgba(24,34,44,0.3)",
          }}
        >
          {/* Browser chrome. Fixed, so the session has one home. */}
          <div
            className="relative flex items-center px-4 h-10 sm:h-11 border-b"
            style={{ borderColor: "rgba(24,34,44,0.08)", background: "#fbfaf6" }}
          >
            <span className="flex items-center gap-1.5" aria-hidden>
              <span className="size-[9px] rounded-full bg-[#f6b9b3]" />
              <span className="size-[9px] rounded-full bg-[#f3d9a4]" />
              <span className="size-[9px] rounded-full bg-[#bfe3c0]" />
            </span>
            <span
              className="absolute left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 h-6 px-3.5 rounded-full text-[11px]"
              style={{ background: "rgba(24,34,44,0.05)", color: "#53606b" }}
            >
              <Lock className="size-2.5" aria-hidden />
              builderhq.com.au
            </span>
          </div>

          {/* The app. One height for the whole journey, so nothing jumps
              between steps and the frame never resizes under the reader. */}
          <div
            className="relative h-[max(230px,calc(100svh-560px))] sm:h-[460px] lg:h-[500px] overflow-hidden"
            style={{ background: C.canvas }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={`${role}-${step.key}`}
                className="absolute inset-0"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
              >
                <step.Screen />
              </motion.div>
            </AnimatePresence>

            {/* Mobile keeps the deliberate bottom peek. */}
            <div
              aria-hidden
              className="sm:hidden absolute bottom-0 inset-x-0 h-16"
              style={{ background: `linear-gradient(180deg, rgba(244,241,234,0), ${C.canvas})` }}
            />
          </div>
        </div>

        <StepRail steps={steps} index={i} hold={step.hold} accent={pal.accentSoft} running={running} />
      </div>
    </div>
  );
}

/**
 * The index. Every step named on desktop so the reader can see the
 * whole shape of the thing at a glance, even before it gets there; on a
 * phone there is no room, so it collapses to the count and the current
 * name. The line under the active label fills across that step's own
 * duration, which is what makes the rail feel driven by the demo rather
 * than decorative.
 */
function StepRail({
  steps,
  index,
  hold,
  accent,
  running,
}: {
  steps: HeroStep[];
  index: number;
  hold: number;
  accent: string;
  running: boolean;
}) {
  return (
    <div className="mt-4 sm:mt-5 px-1">
      {/* Phone: the count and the name. */}
      <div className="sm:hidden flex items-baseline gap-2.5">
        <span className="font-mono text-[10.5px] tabular-nums shrink-0" style={{ color: accent }}>
          {String(index + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
        </span>
        <span className="text-[11.5px] font-semibold truncate" style={{ color: C.ink }}>
          {steps[index]?.label}
        </span>
      </div>
      <div className="sm:hidden mt-2 h-px w-full" style={{ background: "rgba(24,34,44,0.10)" }}>
        <motion.span
          key={index}
          className="block h-px"
          style={{ background: accent }}
          initial={{ width: "0%" }}
          animate={{ width: running ? "100%" : "0%" }}
          transition={{ duration: hold / 1000, ease: "linear" }}
        />
      </div>

      {/* Desktop: the whole index, so the shape of the journey is
          legible before it has finished playing. */}
      <div className="hidden sm:flex items-start gap-0">
        {steps.map((s, n) => {
          const done = n < index;
          const now = n === index;
          return (
            <div key={s.key} className="flex-1 min-w-0">
              <div className="h-px w-full overflow-hidden" style={{ background: "rgba(24,34,44,0.12)" }}>
                {now ? (
                  <motion.span
                    key={index}
                    className="block h-px"
                    style={{ background: accent }}
                    initial={{ width: "0%" }}
                    animate={{ width: running ? "100%" : "0%" }}
                    transition={{ duration: hold / 1000, ease: "linear" }}
                  />
                ) : (
                  <span className="block h-px" style={{ width: done ? "100%" : "0%", background: accent }} />
                )}
              </div>
              <p
                className="mt-2 pr-3 text-[10.5px] leading-tight truncate transition-colors duration-300"
                style={{ color: now ? C.ink : done ? C.muted : C.faint, fontWeight: now ? 600 : 400 }}
              >
                {s.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export type { Role };
