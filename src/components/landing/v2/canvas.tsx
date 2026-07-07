"use client";

/**
 * Canvas — the single continuous backdrop the whole page floats on.
 *
 * One deep base colour, constant across lenses, so the page never
 * "switches" the way the v1 dark/light bands did. Only the ambient
 * light shifts per role: three stacked glow layers (teal / steel /
 * gold), one visible at a time, cross-fading over ~900ms when the lens
 * changes. Reads as the room's lighting changing, not a new page.
 *
 * Sits at z-0 behind everything; grid + noise + the section content
 * layer on top. Pointer-events off so it never intercepts clicks.
 */

import { ROLE_ORDER, ROLE_PALETTE } from "./content";
import { useRole } from "./role";

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

export function Canvas() {
  const { role } = useRole();

  return (
    <div aria-hidden className="fixed inset-0 z-0 pointer-events-none" style={{ background: "#f4f1ea" }}>
      {ROLE_ORDER.map((r) => {
        const p = ROLE_PALETTE[r];
        return (
          <div
            key={r}
            className="absolute inset-0"
            style={{
              opacity: role === r ? 1 : 0,
              transition: `opacity 900ms ${EASE}`,
              background: `
                radial-gradient(ellipse 68% 52% at 12% -8%, ${p.glow1}, transparent 58%),
                radial-gradient(ellipse 60% 48% at 104% 108%, ${p.glow2}, transparent 62%),
                radial-gradient(circle at 50% 50%, ${p.tint}, transparent 70%)
              `,
            }}
          />
        );
      })}

      {/* Blueprint grid — faint, fixed. Part of the brand texture. */}
      <div
        className="absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(20,40,60,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(20,40,60,0.05) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse 90% 80% at 50% 30%, black, transparent 85%)",
          WebkitMaskImage: "radial-gradient(ellipse 90% 80% at 50% 30%, black, transparent 85%)",
        }}
      />

      {/* Fine grain */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=%270 0 200 200%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%27.75%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")',
          backgroundSize: "200px 200px",
        }}
      />
    </div>
  );
}

/**
 * RoleWash — the one-shot pulse fired when the lens changes. A soft
 * radial bloom in the incoming role's colour sweeps out from the upper
 * third and fades in ~900ms, so the whole surface visibly re-lights
 * as the label docks. Skips the first mount (no pulse on load).
 */

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";

export function RoleWash() {
  const { role } = useRole();
  const first = React.useRef(true);
  const seq = React.useRef(0);
  const [pulse, setPulse] = React.useState<{ id: number; wash: string } | null>(null);

  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    seq.current += 1;
    const id = seq.current;
    setPulse({ id, wash: ROLE_PALETTE[role].wash });
    const t = window.setTimeout(() => {
      setPulse((cur) => (cur?.id === id ? null : cur));
    }, 1300);
    return () => window.clearTimeout(t);
  }, [role]);

  return (
    <div aria-hidden className="fixed inset-0 z-[2] pointer-events-none overflow-hidden">
      <AnimatePresence>
        {pulse ? (
          <motion.div
            key={`${pulse.id}-flood`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: [0, 1, 0], scale: 1.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1], times: [0, 0.42, 1] }}
            className="absolute inset-0"
            style={{ background: `radial-gradient(circle at 50% 42%, ${pulse.wash}, transparent 72%)` }}
          />
        ) : null}
        {pulse ? (
          <motion.div
            key={`${pulse.id}-sweep`}
            initial={{ opacity: 0, x: "-26%" }}
            animate={{ opacity: [0, 0.7, 0], x: "26%" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1], times: [0, 0.5, 1] }}
            className="absolute inset-[-20%]"
            style={{ background: `linear-gradient(112deg, transparent 34%, ${pulse.wash} 50%, transparent 66%)` }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
