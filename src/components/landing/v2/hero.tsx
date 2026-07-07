"use client";

/**
 * Hero v3.1 — the proven composition (copy left, product right) wearing
 * the new type system: clean grotesk statement, no serif, no italics,
 * no scanline. The visual keeps its original grid column so
 * BuildingReveal sizes correctly (it collapses without a real column
 * width — learned the hard way).
 */

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight, ArrowDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { HeroVisual } from "./hero-visual";
import { LENS, ROLE_PALETTE } from "./content";
import { useRole } from "./role";
import { RoleSwap } from "./swap";

const EASE = [0.16, 1, 0.3, 1] as const;

export function Hero({ authedHref }: { authedHref: string | null }) {
  const { role } = useRole();
  const copy = LENS[role].hero;
  const pal = ROLE_PALETTE[role];
  const primary = authedHref
    ? { label: "Open your dashboard", href: authedHref }
    : copy.primary;

  return (
    <section
      id="hero"
      className="relative isolate pt-[5.25rem] sm:pt-24 lg:pt-20 pb-8 lg:pb-12 px-5 md:px-12 lg:px-20 xl:px-28 overflow-hidden lg:min-h-[88svh] lg:flex lg:items-center"
    >
      <div className="mx-auto w-full max-w-[1280px] grid grid-cols-1 lg:grid-cols-[1.12fr_1fr] gap-4 sm:gap-10 lg:gap-20 items-center">
        {/* Visual — leads on mobile, right column on desktop. */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 1.0, ease: EASE }}
          className="flex justify-center order-2 mt-1 lg:mt-0"
        >
          <HeroVisual />
        </motion.div>

        {/* Copy */}
        <div className="text-center lg:text-left order-1">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="block"
          >
            <RoleSwap className="inline-block">
              <span
                className="inline-flex items-center gap-2 pl-2.5 pr-3.5 py-1.5 rounded-full border text-[12px] font-medium"
                style={{ borderColor: pal.accent + "30", background: pal.accent + "0d", color: pal.accentSoft }}
              >
                <span className="size-1.5 rounded-full" style={{ background: pal.accent, boxShadow: `0 0 8px ${pal.accent}b3` }} />
                {copy.badge}
              </span>
            </RoleSwap>
          </motion.div>

          {/* Statement */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.8, ease: EASE }}
          >
            <RoleSwap>
              <h1 className="mt-4 sm:mt-6 lg:mt-8 font-ui font-semibold tracking-[-0.045em] leading-[1.03] text-[clamp(2.5rem,5.2vw+1rem,5.4rem)]">
                <span className="block text-text">{copy.h1a}</span>
                <span className="block" style={{ color: pal.accentSoft }}>
                  {copy.h1b}
                </span>
              </h1>
            </RoleSwap>
          </motion.div>

          {/* Sub */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7, ease: EASE }}
          >
            <RoleSwap>
              <p className="mt-3 lg:mt-7 mx-auto lg:mx-0 max-w-[30rem] lg:max-w-[36rem] text-[14.5px] sm:text-[17px] leading-[1.6] text-text-muted">
                {copy.sub}
              </p>
            </RoleSwap>
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7, ease: EASE }}
          >
            <RoleSwap>
              <div className="mt-5 lg:mt-9 flex flex-col items-stretch lg:items-start sm:flex-row sm:items-center sm:justify-center lg:justify-start gap-2 sm:gap-5">
                <Link
                  href={primary.href}
                  className={cn(
                    "group inline-flex items-center justify-center gap-2 h-12 sm:h-[52px] px-8 rounded-full",
                    "bg-accent text-accent-contrast text-[15px] font-semibold tracking-[0.01em]",
                    "transition-[background-color,box-shadow,transform] duration-[180ms]",
                    "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),0_0_0_1px_rgba(0,212,200,0.45),0_10px_30px_-8px_rgba(0,212,200,0.5)]",
                    "hover:bg-accent-hover active:translate-y-[0.5px]",
                  )}
                >
                  {primary.label}
                  <ArrowUpRight className="size-4 transition-transform duration-[180ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2.4} />
                </Link>
                <a
                  href={copy.secondary.href}
                  className="group inline-flex items-center justify-center lg:justify-start gap-1.5 px-3 py-1.5 sm:py-3 text-[14px] sm:text-[14.5px] font-medium text-text-muted hover:text-text transition-colors"
                >
                  {copy.secondary.label}
                  <ArrowDown className="size-4 opacity-60 transition-all duration-[180ms] group-hover:translate-y-0.5 group-hover:opacity-100" />
                </a>
              </div>

              {/* Instant answers — the three facts a first visit needs. */}
              <ul className="mt-4 lg:mt-7 flex flex-wrap items-center justify-center lg:justify-start gap-x-4 gap-y-1 px-2 lg:px-0">
                {copy.facts.map((f) => (
                  <li key={f} className="inline-flex items-center gap-1.5 text-[11.5px] sm:text-[12.5px] font-medium text-text-muted">
                    <span aria-hidden className="size-[5px] rounded-full" style={{ background: pal.accent }} />
                    {f}
                  </li>
                ))}
              </ul>
            </RoleSwap>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
