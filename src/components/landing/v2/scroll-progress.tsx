"use client";

/**
 * ScrollProgress — a 2px hairline along the very top of the viewport
 * that fills with the current lens's hue as the page is read. Quiet,
 * dynamic, and it subtly reinforces "this page is yours" after a role
 * is chosen. Sits above the nav; pointer-events off.
 */

import { motion, useScroll, useSpring } from "motion/react";

import { ROLE_PALETTE } from "./content";
import { useRole } from "./role";

export function ScrollProgress() {
  const { role } = useRole();
  const pal = ROLE_PALETTE[role];
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.4 });

  return (
    <motion.div
      aria-hidden
      className="fixed top-0 left-0 right-0 h-[2px] z-[70] origin-left pointer-events-none"
      style={{
        scaleX,
        background: `linear-gradient(90deg, ${pal.accent}, ${pal.accentSoft})`,
        boxShadow: `0 0 12px ${pal.accent}66`,
        transition: "background 700ms cubic-bezier(0.22,1,0.36,1)",
      }}
    />
  );
}
