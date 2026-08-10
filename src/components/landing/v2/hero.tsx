"use client";

/**
 * Hero: one voice, one claim, one action.
 *
 * Copy left, the product right. No role fork, no lens hue, no glow: the
 * category line does the work and the browser frame beside it shows the
 * screen that line is describing. Teal appears three times and only
 * three times, as the kicker, the secondary link and the fill on the
 * one primary button.
 *
 * Every word comes from HERO in content.ts. This component holds none.
 */

import Link from "next/link";
import { motion } from "motion/react";

import { track } from "@/lib/analytics";
import { HeroVisual } from "./hero-visual";
import { HERO } from "./content";

const EASE = [0.16, 1, 0.3, 1] as const;

export function Hero({ authedHref }: { authedHref: string | null }) {
  const primary = authedHref
    ? { label: "Open your dashboard", href: authedHref }
    : HERO.primary;

  return (
    <section
      id="hero"
      className="relative isolate overflow-hidden px-5 md:px-10 lg:px-16 xl:px-20 pt-28 sm:pt-32 lg:pt-36 pb-16 lg:pb-24"
    >
      <div className="mx-auto w-full max-w-[1240px] grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] items-center gap-12 lg:gap-16 xl:gap-20">
        {/* Copy */}
        <div className="order-1 text-center lg:text-left">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-light"
          >
            {HERO.kicker}
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06, duration: 0.8, ease: EASE }}
            className="mt-5 lg:mt-6 font-ui font-semibold text-text tracking-[-0.03em] leading-[1.08] text-[clamp(2.25rem,4vw+0.75rem,3.5rem)] text-balance"
          >
            {HERO.h1}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, duration: 0.7, ease: EASE }}
            className="mt-6 mx-auto lg:mx-0 max-w-[36rem] text-[17px] leading-[1.65] text-text-muted"
          >
            {HERO.sub}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24, duration: 0.7, ease: EASE }}
          >
            <div className="mt-8 lg:mt-9 flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 sm:gap-7">
              <Link
                href={primary.href}
                onClick={() => track("hero_cta", { label: primary.label })}
                className="inline-flex h-[52px] items-center justify-center rounded-full bg-accent px-8 text-[16px] font-semibold text-accent-contrast transition-colors duration-[160ms] hover:bg-accent-hover"
              >
                {primary.label}
              </Link>
              {/* The glyph belongs to the label in content.ts. No second arrow. */}
              <a
                href="#how"
                className="inline-flex h-[52px] sm:h-auto items-center justify-center lg:justify-start text-[16px] font-medium text-accent-light transition-colors duration-[160ms] hover:text-text"
              >
                {HERO.secondaryLabel}
              </a>
            </div>

            <div className="mt-9 lg:mt-10 border-t border-border-subtle pt-5">
              <ul className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2.5">
                {HERO.facts.map((fact) => (
                  <li
                    key={fact}
                    className="inline-flex items-center gap-2 text-[16px] leading-[1.4] text-text-muted"
                  >
                    <span aria-hidden className="size-[6px] shrink-0 rounded-full bg-accent-light" />
                    {fact}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>

        {/* The product, in a browser frame. */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 1.0, ease: EASE }}
          className="order-2 flex justify-center lg:justify-end"
        >
          <HeroVisual />
        </motion.div>
      </div>
    </section>
  );
}
