"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import * as React from "react";

/**
 * Reveal — scroll-triggered fade-up. Wrap any block to animate it in
 * once it crosses 15% of the viewport. Stagger via `delay`.
 *
 *   <Reveal>...</Reveal>
 *   <Reveal delay={0.08}>...</Reveal>
 *
 * Animations are intentionally slow + soft (700ms, ease-out) — Resend /
 * Lando-tier graceful entrance, never bouncy or aggressive.
 */
interface RevealProps extends HTMLMotionProps<"div"> {
  delay?: number;
  y?: number;
  duration?: number;
}

export function Reveal({
  delay = 0,
  y = 16,
  duration = 0.7,
  children,
  ...props
}: RevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
