"use client";

import { motion } from "motion/react";
import { AnimatedCount } from "./animated-count";

/**
 * Single proof band beneath the hero. Four metrics:
 *
 *   93       Questions every builder answers
 *   256      Lines in the Scope Standard
 *   6        Published scoring dimensions
 *   $0       Commission
 *
 * These are facts about how the process works, and every one of them can
 * be checked in the product. The band previously carried "50+ active
 * builders" and "$50M+ tenders uploaded", neither of which anyone could
 * substantiate. Do not put a volume or outcome number back here without
 * a source you would show a regulator.
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
          value={<AnimatedCount value={93} format="{n}" duration={1400} />}
          label="Questions every builder answers"
          className="border-r border-border-subtle sm:border-r"
        />
        <Metric
          delay={1.2}
          value={<AnimatedCount value={256} format="{n}" duration={1400} />}
          label="Lines in the Scope Standard"
          className="sm:border-r sm:border-border-subtle"
        />
        <Metric
          delay={1.3}
          value={<AnimatedCount value={6} format="{n}" duration={1500} />}
          label="Published scoring dimensions"
          className="border-r border-t sm:border-t-0 border-border-subtle sm:border-r"
        />
        <Metric
          delay={1.4}
          value="$0"
          label="Commission"
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
      <span className="mt-1.5 sm:mt-2 text-[9.5px] sm:text-[10.5px] tracking-[0.16em] sm:tracking-[0.18em] uppercase text-text-muted font-ui font-semibold">
        {label}
      </span>
    </motion.div>
  );
}
