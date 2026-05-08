"use client";

/**
 * Reveal — in-app scroll/mount fade-up.
 *
 * Tuned for dashboard pace: snappier (~320ms) and smaller travel (8px)
 * than the marketing-side Reveal which is deliberately slower for the
 * landing page. Stagger via `delay`.
 *
 *   <Reveal>...</Reveal>
 *   <Reveal delay={0.06}>...</Reveal>
 *
 * Respects `prefers-reduced-motion` automatically — motion's reduce
 * setting collapses transforms + duration so users with that
 * preference don't get any animation at all.
 */

import { motion, type HTMLMotionProps } from "motion/react";

interface RevealProps extends HTMLMotionProps<"div"> {
  delay?: number;
  y?: number;
  duration?: number;
  /** Use mount trigger instead of inView. Use this for elements that
   *  appear above the fold and shouldn't wait for a scroll event. */
  immediate?: boolean;
}

export function Reveal({
  delay = 0,
  y = 8,
  duration = 0.32,
  immediate = false,
  children,
  ...props
}: RevealProps) {
  const transition = {
    duration,
    delay,
    ease: [0.2, 0.65, 0.3, 0.9] as [number, number, number, number],
  };
  if (immediate) {
    return (
      <motion.div
        initial={{ opacity: 0, y }}
        animate={{ opacity: 1, y: 0 }}
        transition={transition}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={transition}
      {...props}
    >
      {children}
    </motion.div>
  );
}
