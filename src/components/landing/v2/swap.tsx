"use client";

/**
 * RoleSwap — the calm re-tune. Wrap any forked block; when the lens
 * changes, the old copy fades 8px down and the new copy rises in.
 * `stagger` cascades direct <SwapItem> children at 60ms intervals so
 * lists (problem rows, spine steps, FAQ items) roll in gracefully.
 *
 * Furniture, not fireworks: 350ms in, 180ms out, brand ease-out, no
 * scale, no blur. `initial={false}` so first paint never animates
 * (scroll entrances belong to <Reveal>). Reduced motion collapses to
 * a plain crossfade via MotionConfig at the provider.
 */

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";

import { useRole } from "./role";

const EASE = [0.16, 1, 0.3, 1] as const;

const container = {
  from: { opacity: 0, y: 10 },
  in: (stagger: boolean) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: EASE,
      ...(stagger ? { staggerChildren: 0.06, delayChildren: 0.04 } : {}),
    },
  }),
  out: { opacity: 0, y: -8, transition: { duration: 0.18, ease: "easeIn" as const } },
};

const item = {
  from: { opacity: 0, y: 12 },
  in: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

export function RoleSwap({
  children,
  className,
  stagger = false,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: boolean;
}) {
  const { role } = useRole();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={role}
        className={className}
        variants={container}
        custom={stagger}
        initial="from"
        animate="in"
        exit="out"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/** Direct child of a staggered <RoleSwap> — inherits the cascade. */
export function SwapItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div className={className} variants={item}>
      {children}
    </motion.div>
  );
}
