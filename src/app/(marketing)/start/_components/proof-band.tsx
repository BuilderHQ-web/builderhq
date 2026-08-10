"use client";

import { motion } from "motion/react";
import { AnimatedCount } from "./animated-count";

/**
 * Single proof band beneath the hero. Four metrics:
 *
 *   100%     Verified builders
 *   50+      Active builders
 *   $50M+    Tenders uploaded
 *   24/7     Live marketplace
 *
 * Animations:
 *   · The band itself fades + lifts in slightly after the hero
 *   · Each metric cell has its own count-up (or static reveal)
 *     with a small stagger between cells
 */

const EASE = [0.16, 1, 0.3, 1] as const;

export function ProofBand() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.95, ease: EASE }}
      className="mt-8 sm:mt-14 rounded-2xl border border-border-subtle bg-surface-0/45 backdrop-blur-sm overflow-hidden"
    >
      {/* 2x2 on mobile (with horizontal + vertical dividers), 1x4 on
              desktop (vertical dividers only). The cross-row divider on
              mobile is added via the second-row items' `border-t`. */}
      <div className="grid grid-cols-2 sm:grid-cols-4">
        <Metric
          delay={1.1}
          value={<AnimatedCount value={100} format="{n}%" duration={1400} />}
          label="Verified builders"
          className="border-r border-border-subtle sm:border-r"
        />
        <Metric
          delay={1.2}
          value={<AnimatedCount value={50} format="{n}+" duration={1400} />}
          label="Active builders"
          className="sm:border-r sm:border-border-subtle"
        />
        <Metric
          delay={1.3}
          value={<AnimatedCount value={50} format="${n}M+" duration={1500} />}
          label="Tenders uploaded"
          className="border-r border-t sm:border-t-0 border-border-subtle sm:border-r"
        />
        <Metric
          delay={1.4}
          value={
            <span className="inline-flex items-center gap-1.5 sm:gap-2">
              24/7
              <span className="relative flex size-1.5 sm:size-2">
                <span className="absolute inset-0 rounded-full bg-accent opacity-80 animate-ping" />
                <span className="relative size-1.5 sm:size-2 rounded-full bg-accent shadow-[0_0_8px_rgba(0,212,200,0.7)]" />
              </span>
            </span>
          }
          label="Live marketplace"
          className="border-t sm:border-t-0 border-border-subtle"
        />
      </div>
    </motion.div>
  );
}

function Metric({
  value,
  label,
  delay,
  className,
}: {
  value: React.ReactNode;
  label: string;
  delay: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay, ease: EASE }}
      className={`px-3 py-4 sm:px-5 sm:py-7 flex flex-col items-center text-center ${className ?? ""}`}
    >
      <span className="font-display text-[22px] sm:text-[32px] text-text leading-none tracking-[-0.005em]">
        {value}
      </span>
      <span className="mt-1.5 sm:mt-2 text-[9.5px] sm:text-[10.5px] tracking-[0.16em] sm:tracking-[0.18em] uppercase text-text-faint font-ui font-semibold">
        {label}
      </span>
    </motion.div>
  );
}
