"use client";

/**
 * FlyingLabel — the dock flight, as one fully-controlled element.
 *
 * When a selector card is pressed, the provider records the card word's
 * screen rect (`flight.from`) and the target role. This overlay renders
 * a fixed clone of the role phrase at that rect, then flies it up to the
 * header: it lifts and grows a touch, then travels while shrinking to
 * settle exactly where the nav's dock label lives (measured live from
 * `#nav-role-dock`). On landing it calls completeFlight(), which reveals
 * the real docked label and unmounts the clone.
 *
 * A single transform-origin: top-left, scale-based FLIP — GPU cheap and
 * pixel-exact at both ends. No layout thrash mid-flight.
 */

import * as React from "react";
import { motion } from "motion/react";

import { ROLE_META, ROLE_PALETTE } from "./content";
import { useRole } from "./role";

export function FlyingLabel() {
  const { flight, completeFlight } = useRole();
  const [target, setTarget] = React.useState<{ left: number; top: number; fontSize: number } | null>(null);

  // Measure the header dock slot once the flight begins (the nav renders
  // it invisibly while a flight is active precisely so we can measure it).
  React.useLayoutEffect(() => {
    if (!flight) return;
    let cancelled = false;
    const raf = requestAnimationFrame(() => {
      if (cancelled) return;
      const el = document.getElementById("nav-role-dock");
      if (!el) {
        completeFlight();
        return;
      }
      const r = el.getBoundingClientRect();
      const fs = parseFloat(getComputedStyle(el).fontSize) || 16;
      setTarget({ left: r.left, top: r.top, fontSize: fs });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      setTarget(null);
    };
  }, [flight, completeFlight]);

  if (!flight || !target) return null;

  const pal = ROLE_PALETTE[flight.role];
  const from = flight.from;
  // Clone is sized at the TARGET font size and scaled up to match the
  // card at takeoff, so it shrinks to 1 exactly as it lands.
  const startScale = from.fontSize / target.fontSize;

  return (
    <div aria-hidden className="fixed inset-0 z-[60] pointer-events-none">
      <motion.span
        className="font-ui font-medium whitespace-nowrap"
        style={{
          position: "fixed",
          left: from.left,
          top: from.top,
          fontSize: target.fontSize,
          transformOrigin: "top left",
          color: pal.accentSoft,
        }}
        initial={{ x: 0, y: 0, scale: startScale, opacity: 0.2 }}
        animate={{
          x: target.left - from.left,
          y: target.top - from.top,
          scale: [startScale, startScale * 1.08, 1],
          opacity: [0.2, 1, 1],
        }}
        transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1], times: [0, 0.32, 1] }}
        onAnimationComplete={completeFlight}
      >
        {ROLE_META[flight.role].dock}
      </motion.span>
    </div>
  );
}
