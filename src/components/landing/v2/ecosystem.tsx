"use client";

/**
 * 04 · Who it’s for. The three audiences of a round, side by side.
 *
 * An editorial heading, a hairline that draws itself across the measure,
 * and three columns hanging beneath it in broadsheet order: homeowners,
 * the practices that run rounds for them, and the builders who price the
 * work. Each column names its reader, states the promise in one line,
 * and hands off to the page that argues it in full.
 *
 * One voice, one hue. This section is never forked and never leaves
 * brand teal. All words come from AUDIENCES in ./content.
 */

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

import { Reveal } from "../reveal";
import { AUDIENCES } from "./content";

export function Ecosystem() {
  return (
    <section id="ecosystem" className="relative px-5 md:px-10 py-20 lg:py-28 overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 30%, rgba(0,212,200,0.06) 0%, transparent 65%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-[1180px]">
        <Reveal>
          <div className="text-center lg:text-left">
            <span
              aria-hidden
              className="hidden lg:block h-[3px] w-12 rounded-full mb-8"
              style={{ background: "var(--color-accent)" }}
            />
            <h2 className="mx-auto lg:mx-0 max-w-[20ch] font-ui font-semibold tracking-[-0.03em] text-[clamp(2.1rem,3.2vw+0.5rem,3.5rem)] leading-[1.08] text-text">
              {AUDIENCES.h2}
            </h2>
          </div>
        </Reveal>

        {/* The seam. Draws itself across the measure as the section enters,
            then the three columns hang beneath it. */}
        <motion.span
          aria-hidden
          className="mt-10 lg:mt-12 block h-px w-full origin-left"
          style={{
            background:
              "linear-gradient(90deg, rgba(0,170,158,0.45), rgba(24,34,44,0.10) 55%, transparent)",
          }}
          initial={{ scaleX: 0, opacity: 0 }}
          whileInView={{ scaleX: 1, opacity: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        />

        <Reveal delay={0.08}>
          <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-border-subtle">
            {AUDIENCES.blocks.map((block) => (
              <div
                key={block.name}
                className="flex flex-col py-9 lg:pb-0 lg:px-10 lg:first:pl-0 lg:last:pr-0"
              >
                <p className="font-ui font-semibold tracking-[-0.005em] text-[17px] leading-[1.35] text-accent-light">
                  {block.name}
                </p>
                <p className="mt-3 font-ui font-semibold tracking-[-0.02em] text-[21px] leading-[1.25] text-text">
                  {block.statement}
                </p>
                <p className="mt-3 text-[16px] leading-[1.65] text-text-muted">
                  {block.line}
                </p>
                <Link
                  href={block.href}
                  className="group mt-auto pt-6 inline-flex items-center gap-2 self-start text-[16px] font-medium text-accent-light hover:underline underline-offset-4"
                >
                  {block.cta}
                  <ArrowRight
                    className="size-4 transition-transform duration-[180ms] ease-[var(--ease-out)] group-hover:translate-x-0.5"
                    strokeWidth={2}
                  />
                </Link>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
