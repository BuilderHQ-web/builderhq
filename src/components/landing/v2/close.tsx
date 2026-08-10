"use client";

/**
 * Close, the last word. A teal band, a centred column, one action, and
 * the three promises that decide it. The trio shows on every breakpoint:
 * mobile visitors decide here too. Words come from CLOSE in ./content;
 * the destination is the shared start route carried on HERO.primary, so
 * both ends of the page point at the same door.
 */

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Reveal } from "../reveal";
import { track } from "@/lib/analytics";
import { CLOSE, HERO } from "./content";
import { SectionField } from "./section-field";

export function Close({ authedHref }: { authedHref: string | null }) {
  const primary = authedHref
    ? { label: "Open your dashboard", href: authedHref }
    : { label: CLOSE.ctaLabel, href: HERO.primary.href };

  return (
    <section className="relative px-5 md:px-10 py-24 sm:py-28 lg:py-32 overflow-hidden">
      <SectionField variant="teal" />

      <div className="relative z-10 mx-auto w-full max-w-[860px] flex flex-col items-center text-center gap-6 lg:gap-7">
        <Reveal>
          <h2 className="font-ui font-semibold tracking-[-0.03em] mx-auto max-w-[22ch] text-[clamp(2.3rem,4vw+0.5rem,3.5rem)] leading-[1.08] text-text">
            {CLOSE.h2}
          </h2>
        </Reveal>

        <Reveal delay={0.1}>
          <p className="max-w-[46ch] text-[17px] leading-[1.65] text-text-muted">
            {CLOSE.sub}
          </p>
        </Reveal>

        <Reveal delay={0.16}>
          <div className="flex flex-col items-center gap-7">
            <Link
              href={primary.href}
              onClick={() => track("close_cta", { label: primary.label })}
              className="group inline-flex items-center justify-center gap-2 h-[52px] px-8 rounded-full bg-accent text-accent-contrast text-[16px] font-semibold tracking-[0.01em] hover:bg-accent-hover transition-colors duration-[160ms]"
            >
              {primary.label}
              <ArrowUpRight className="size-4 transition-transform duration-[160ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>

            <ul className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-x-7 gap-y-2.5 text-[16px] leading-[1.5] text-text-muted">
              {CLOSE.trio.map((line) => (
                <li key={line} className="inline-flex items-center gap-2.5">
                  <span aria-hidden className="size-[5px] rounded-full bg-accent-light" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
