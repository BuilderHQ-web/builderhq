"use client";

import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Suspense } from "react";
import Link from "next/link";

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
        <span className="inline-flex items-center gap-2 sm:gap-2.5 text-[9.5px] sm:text-[10px] tracking-[0.24em] sm:tracking-[0.26em] uppercase text-accent font-ui font-semibold">
          <span className="relative flex size-1.5">
            <span className="absolute inset-0 rounded-full bg-accent opacity-75 animate-ping" />
            <span className="relative size-1.5 rounded-full bg-accent shadow-[0_0_10px_rgba(0,212,200,0.8)]" />
          </span>
          Residential builds · Australia
        </span>
      </motion.div>

      <h1 className="mt-4 sm:mt-6 font-display tracking-[-0.02em] leading-[0.88] text-[clamp(2.6rem,7vw+0.4rem,6.4rem)]">
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
        className="mt-5 sm:mt-7 text-text-muted text-[14.5px] sm:text-[17px] leading-[1.55] max-w-[460px] font-body"
      >
        Three vetted Australian builders compete on your project.
        <span className="text-text"> Free for owners.</span>
      </motion.p>

      <motion.div
        {...ENTER}
        transition={{ duration: 0.6, delay: 0.75, ease: EASE }}
        className="mt-7 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:items-center"
      >
        <Suspense fallback={null}>
          <StartCta>
            Upload your project
            <ArrowRight size={16} strokeWidth={2.2} className="ml-0.5" />
          </StartCta>
        </Suspense>
        <span className="text-text-faint text-[11.5px] sm:text-[12px] font-ui tracking-wide">
          90 seconds · no card · no spam
        </span>
      </motion.div>

      {/* Lower-friction escape hatch — rescues visitors who aren't ready
          to upload plans by offering a quick call instead. */}
      <motion.p
        {...ENTER}
        transition={{ duration: 0.6, delay: 0.9, ease: EASE }}
        className="mt-4 sm:mt-5 text-text-faint text-[12.5px] sm:text-[13px] font-ui"
      >
        Not ready to upload?{" "}
        <Link
          href="/book-a-call"
          className="text-accent font-semibold underline-offset-2 hover:underline"
        >
          Book a free call →
        </Link>
      </motion.p>
    </div>
  );
}
