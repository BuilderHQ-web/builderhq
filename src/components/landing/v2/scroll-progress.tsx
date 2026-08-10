"use client";

/**
 * ScrollProgress — a 2px hairline along the very top of the viewport
 * that fills as the page is read. One teal, like everything else on
 * the marketing surface. Sits above the nav; pointer-events off.
 */

import { motion, useScroll, useSpring } from "motion/react";

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 28,
    mass: 0.4,
  });

  return (
    <motion.div
      aria-hidden
      className="fixed top-0 left-0 right-0 h-[2px] z-[70] origin-left pointer-events-none"
      style={{
        scaleX,
        background: "linear-gradient(90deg, #00d4c8, #0a7d73)",
      }}
    />
  );
}
