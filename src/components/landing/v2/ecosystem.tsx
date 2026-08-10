"use client";

/**
 * Ecosystem — the brand moment: one platform, every side of every build.
 *
 * Deliberately the one asymmetric section on the page: after five
 * centre-stacked chapters, the heading sits left as an editorial block
 * (short teal rule, left-aligned type) with the four sides arranged as a
 * 2×2 grid beside it. A vertical hairline draws itself between the two
 * halves as the section enters, so the "connection" is still literal.
 * Shared across lenses; stays brand teal (this is BuilderHQ speaking,
 * not a lens).
 */

import { motion } from "motion/react";

import { Reveal } from "../reveal";
import { ECOSYSTEM } from "./content";

export function Ecosystem() {
  return (
    <section
      id="ecosystem"
      className="relative px-5 md:px-10 py-20 lg:py-24 overflow-hidden lg:min-h-[100svh] lg:flex lg:items-center"
    >
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 38% 45%, rgba(0,212,200,0.06) 0%, transparent 65%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-[1180px]">
        <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-12 lg:gap-16 items-center">
          {/* Editorial heading — left-aligned, the page's one asymmetric beat. */}
          <Reveal>
            <div className="text-center lg:text-left">
              <span
                aria-hidden
                className="hidden lg:block h-[3px] w-12 rounded-full mb-8"
                style={{ background: "var(--color-accent)" }}
              />
              <h2 className="mx-auto lg:mx-0 max-w-[16ch] font-ui font-semibold tracking-[-0.035em] text-[clamp(2.3rem,3.4vw+0.5rem,3.8rem)] leading-[1.06]">
                <span className="block text-text">{ECOSYSTEM.h2a}</span>
                <span className="block text-accent-light">{ECOSYSTEM.h2b}</span>
              </h2>
              <p className="mt-5 mx-auto lg:mx-0 max-w-[38ch] text-[15.5px] sm:text-[16.5px] leading-[1.65] text-text-muted">
                {ECOSYSTEM.sub}
              </p>
            </div>
          </Reveal>

          {/* The four sides — 2×2, joined to the heading by a drawn hairline. */}
          <div className="relative lg:pl-14">
            <motion.span
              aria-hidden
              className="hidden lg:block absolute left-0 top-[6%] bottom-[6%] w-px origin-top"
              style={{
                background:
                  "linear-gradient(180deg, rgba(0,212,200,0), rgba(0,212,200,0.35), rgba(0,212,200,0))",
              }}
              initial={{ scaleY: 0, opacity: 0 }}
              whileInView={{ scaleY: 1, opacity: 1 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {ECOSYSTEM.columns.map((col, i) => (
                <Reveal key={col.who} delay={i * 0.08}>
                  <div className="relative h-full rounded-xl border border-border-subtle bg-white card-elev p-6 lg:p-7 overflow-hidden transition-[border-color,transform] duration-[420ms] ease-[var(--ease-out)] hover:border-border-accent/50 hover:-translate-y-1">
                    <span
                      aria-hidden
                      className="absolute top-0 inset-x-7 h-px"
                      style={{
                        background:
                          "linear-gradient(90deg, transparent, rgba(0,170,158,0.4), transparent)",
                      }}
                    />
                    <p className="font-ui font-bold tracking-[-0.01em] text-[17px] text-text">
                      {col.who}
                    </p>
                    <p className="mt-0.5 text-[14px] font-medium text-accent-light/90">
                      {col.bring}
                    </p>
                    <p className="mt-3 text-[13.5px] leading-[1.6] text-text-muted">
                      {col.line}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
