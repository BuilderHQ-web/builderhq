"use client";

/**
 * Close — the last word, forked per lens. One calm halo, one CTA, and
 * the three promises that matter to this reader. The trust trio shows
 * on every breakpoint: mobile visitors decide here too.
 */

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Reveal } from "../reveal";
import { track } from "@/lib/analytics";
import { LENS } from "./content";
import { SectionField } from "./section-field";
import { useRole } from "./role";
import { RoleSwap } from "./swap";

export function Close({ authedHref }: { authedHref: string | null }) {
  const { role } = useRole();
  const copy = LENS[role].close;
  const primary = authedHref
    ? { label: "Open your dashboard", href: authedHref }
    : copy.primary;

  return (
    <section className="relative px-5 md:px-10 py-24 sm:py-28 lg:py-40 overflow-hidden lg:min-h-[100svh] lg:flex lg:flex-col lg:items-center lg:justify-center">
      <SectionField variant="teal" />

      <div className="relative z-10 mx-auto w-full max-w-[860px] flex flex-col items-center text-center gap-6 lg:gap-7">
        <Reveal>
          <RoleSwap>
            <h2 className="font-ui font-semibold tracking-[-0.04em] mx-auto max-w-[22ch] text-[clamp(2.4rem,4.4vw+0.5rem,4.6rem)] leading-[1.05]">
              <span className="block text-text">{copy.h2a}</span>
              <span className="block text-accent-light">{copy.h2b}</span>
            </h2>
          </RoleSwap>
        </Reveal>

        <Reveal delay={0.1}>
          <RoleSwap>
            <p className="max-w-[540px] text-[14.5px] sm:text-[15.5px] leading-[1.7] text-text-muted">
              {copy.sub}
            </p>
          </RoleSwap>
        </Reveal>

        <Reveal delay={0.16}>
          <RoleSwap>
            <div className="flex flex-col items-center gap-6">
              <Link
                href={primary.href}
                onClick={() => track("close_cta", { role, label: primary.label })}
                className="group inline-flex items-center justify-center gap-2 h-[52px] sm:h-12 px-8 rounded-full bg-accent text-accent-contrast text-[14px] font-semibold tracking-[0.02em] hover:bg-accent-hover transition-colors duration-[160ms] shadow-[0_0_0_1px_rgba(0,212,200,0.4),0_8px_28px_-8px_rgba(0,212,200,0.55)]"
              >
                {primary.label}
                <ArrowUpRight className="size-4 transition-transform duration-[160ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>

              <ul className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11.5px] tracking-[0.04em] text-text-muted/90">
                {copy.trio.map((line) => (
                  <li key={line} className="inline-flex items-center gap-2">
                    <span
                      aria-hidden
                      className="size-[5px] rounded-full bg-accent-light"
                      style={{ boxShadow: "0 0 8px rgba(0,212,200,0.55)" }}
                    />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </RoleSwap>
        </Reveal>
      </div>
    </section>
  );
}
