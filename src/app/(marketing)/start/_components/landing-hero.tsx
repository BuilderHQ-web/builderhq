"use client";

import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Suspense } from "react";

import { StartCta } from "./start-cta";

/**
 * The landing hero copy column. Staggered mount animation —
 * elements emerge in sequence:
 *
 *   0.0s  kicker
 *   0.15s headline line 1
 *   0.30s headline line 2
 *   0.55s subline
 *   0.75s CTA + caption
 *
 * Easing is `[0.16, 1, 0.3, 1]` — the "smooth-out" curve Resend /
 * Linear / Vercel all favour: starts fast, settles gently.
 *
 * Copy is intentionally tiny — one kicker, two-line headline, one
 * subline, one CTA. The visual on the right does the rest of the
 * talking.
 */

const ENTER = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
} as const;

const EASE = [0.16, 1, 0.3, 1] as const;

export function LandingHero() {
  return (
    <div className="relative">
      <motion.div
        {...ENTER}
        transition={{ duration: 0.6, delay: 0, ease: EASE }}
      >
        <span className="inline-flex items-center gap-2.5 text-[10px] tracking-[0.26em] uppercase text-accent font-ui font-semibold">
          <span className="relative flex size-1.5">
            <span className="absolute inset-0 rounded-full bg-accent opacity-75 animate-ping" />
            <span className="relative size-1.5 rounded-full bg-accent shadow-[0_0_10px_rgba(0,212,200,0.8)]" />
          </span>
          Residential builds · Australia
        </span>
      </motion.div>

      <h1 className="mt-6 font-display uppercase tracking-[-0.02em] leading-[0.88] text-[clamp(3rem,7vw+1rem,6.4rem)]">
        <motion.span
          {...ENTER}
          transition={{ duration: 0.7, delay: 0.15, ease: EASE }}
          className="block text-text"
        >
          Verified builders.
        </motion.span>
        <motion.span
          {...ENTER}
          transition={{ duration: 0.7, delay: 0.3, ease: EASE }}
          className="block text-accent"
        >
          Tendering for you.
        </motion.span>
      </h1>

      <motion.p
        {...ENTER}
        transition={{ duration: 0.6, delay: 0.55, ease: EASE }}
        className="mt-7 text-text-muted text-[16px] sm:text-[17px] leading-[1.55] max-w-[460px] font-body"
      >
        Upload your project once. Three vetted Australian builders compete.
        Free for owners.
      </motion.p>

      <motion.div
        {...ENTER}
        transition={{ duration: 0.6, delay: 0.75, ease: EASE }}
        className="mt-10 flex flex-col sm:flex-row gap-3 sm:items-center"
      >
        <Suspense fallback={null}>
          <StartCta>
            Upload your project
            <ArrowRight size={16} strokeWidth={2.2} className="ml-0.5" />
          </StartCta>
        </Suspense>
        <span className="text-text-faint text-[12px] font-ui tracking-wide">
          90 seconds · no card · no spam
        </span>
      </motion.div>
    </div>
  );
}
