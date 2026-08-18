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
import { ArrowUpRight, ArrowDown, ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";
import { HeroJourney } from "./hero-journey";
import { LENS, ROLE_PALETTE } from "./content";
import { useRole } from "./role";
import { AssociationStrip } from "./association";
import { RoleSwap } from "./swap";

const EASE = [0.16, 1, 0.3, 1] as const;

export function Hero({ authedHref }: { authedHref: string | null }) {
  const { role } = useRole();
  const copy = LENS[role].hero;
  const pal = ROLE_PALETTE[role];
  const signup = authedHref
    ? { label: "Open your dashboard", href: authedHref }
    : copy.primary;
  // A first time visitor has never seen a tender round, so the walk
  // through earns the filled button and signing up sits beside it.
  // Signed in, the dashboard leads: they are past being convinced.
  const lead = !authedHref && copy.lead === "secondary" ? copy.secondary : signup;
  const follow = lead === signup ? copy.secondary : signup;
  // A hash goes down the page, a route goes forward.
  const FollowArrow = follow.href.startsWith("#") ? ArrowDown : ArrowUpRight;

  return (
    <section
      id="hero"
      className="relative isolate min-h-[100dvh] flex flex-col justify-center lg:flex-row lg:items-center pt-32 sm:pt-24 lg:pt-20 pb-10 sm:pb-8 lg:pb-16 px-5 md:px-12 lg:px-20 xl:px-28 overflow-hidden"
    >
      <div className="mx-auto w-full max-w-[1280px] grid grid-cols-1 lg:grid-cols-[1.12fr_1fr] gap-4 sm:gap-10 lg:gap-20 items-center">
        {/* Visual — leads on mobile, right column on desktop. */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 1.0, ease: EASE }}
          className="flex justify-center order-2 mt-7 sm:mt-1 lg:mt-0"
        >
          <HeroJourney />
        </motion.div>

        {/* Copy */}
        <div className="text-center lg:text-left order-1">
          {/* Badge — desktop and tablet only; the phone hero stays minimal. */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="hidden sm:block"
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
              <h1 className="mt-0 sm:mt-6 lg:mt-8 font-ui font-semibold tracking-[-0.045em] leading-[1.03] text-[clamp(2.5rem,5.2vw+1rem,5.4rem)]">
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
              <p className="mt-3 lg:mt-7 mx-auto lg:mx-0 max-w-[30rem] lg:max-w-[36rem] text-balance sm:text-wrap text-[14.5px] sm:text-[17px] leading-[1.6] text-text-muted">
                {copy.sub}
                {/* The second sentence is desktop only. A phone hero has
                    no room for it, and two sentences there crowd the
                    CTA off the first screen. */}
                {copy.subMore ? (
                  <span className="hidden sm:inline"> {copy.subMore}</span>
                ) : null}
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
              <div className="mt-8 sm:mt-5 lg:mt-9 flex flex-col items-stretch lg:items-start sm:flex-row sm:items-center sm:justify-center lg:justify-start gap-2 sm:gap-5">
                <Link
                  href={lead.href}
                  onClick={() => track("hero_cta", { role, label: lead.label })}
                  className={cn(
                    "group inline-flex items-center justify-center gap-2 h-12 sm:h-[52px] px-8 rounded-full",
                    "bg-accent text-accent-contrast text-[15px] font-semibold tracking-[0.01em]",
                    "transition-[background-color,box-shadow,transform] duration-[180ms]",
                    "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),0_0_0_1px_rgba(0,212,200,0.45),0_10px_30px_-8px_rgba(0,212,200,0.5)]",
                    "hover:bg-accent-hover active:translate-y-[0.5px]",
                  )}
                >
                  {lead.label}
                  <ArrowRight className="size-4 transition-transform duration-[180ms] group-hover:translate-x-0.5" strokeWidth={2.4} />
                </Link>
                <a
                  href={follow.href}
                  onClick={() => track("hero_cta", { role, label: follow.label })}
                  className={cn(
                    "group inline-flex items-center justify-center gap-2 h-12 sm:h-[52px] px-7 rounded-full",
                    "border border-border-strong bg-surface-1 text-text text-[15px] font-semibold tracking-[0.01em]",
                    "transition-[background-color,border-color,transform] duration-[180ms]",
                    "hover:bg-surface-2 active:translate-y-[0.5px]",
                  )}
                >
                  {follow.label}
                  <FollowArrow className="size-4 opacity-70 transition-all duration-[180ms] group-hover:opacity-100" strokeWidth={2.2} />
                </a>
              </div>

              {/* The bodies we sit under, in place of three claims of
                  our own. Small: they are a signature, not a feature
                  list, and the phone keeps them too. */}
              <AssociationStrip className="mt-7 lg:mt-10 px-2 lg:px-0" />
            </RoleSwap>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
