"use client";

/**
 * Ecosystem — the brand moment: one platform, three sides of every
 * build, visibly connected. A hairline draws itself between the three
 * columns as the section enters, so the "connection" is literal.
 * Shared across lenses; stays brand teal (this is BuilderHQ speaking,
 * not a lens).
 */

import { motion } from "motion/react";

import { Reveal } from "../reveal";
import { ECOSYSTEM } from "./content";

export function Ecosystem() {
  return (
    <section className="relative px-5 md:px-10 py-20 lg:py-24 overflow-hidden lg:min-h-[100svh] lg:flex lg:items-center">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 42%, rgba(0,212,200,0.06) 0%, transparent 65%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-[1080px]">
        <Reveal>
          <div className="text-center">
            <h2 className="mx-auto max-w-[22ch] font-ui font-semibold tracking-[-0.035em] text-[clamp(2.3rem,3.6vw+0.5rem,4rem)] leading-[1.06]">
              <span className="text-text">{ECOSYSTEM.h2a}</span>{" "}
              <span className="text-accent-light">{ECOSYSTEM.h2b}</span>
            </h2>
            <p className="mt-5 mx-auto max-w-[46ch] text-[15.5px] sm:text-[16.5px] leading-[1.65] text-text-muted">
              {ECOSYSTEM.sub}
            </p>
          </div>
        </Reveal>

        <div className="relative mt-12 lg:mt-16">
          {/* Connector — draws across behind the three cards. */}
          <motion.span
            aria-hidden
            className="hidden md:block absolute top-1/2 left-[8%] right-[8%] h-px origin-left"
            style={{ background: "linear-gradient(90deg, rgba(0,212,200,0.0), rgba(0,212,200,0.35), rgba(0,212,200,0.0))" }}
            initial={{ scaleX: 0, opacity: 0 }}
            whileInView={{ scaleX: 1, opacity: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          />

          <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {ECOSYSTEM.columns.map((col, i) => (
              <Reveal key={col.who} delay={i * 0.1}>
                <div className="relative h-full rounded-xl border border-border-subtle bg-white p-7 lg:p-8 text-center overflow-hidden transition-[border-color,transform] duration-[420ms] ease-[var(--ease-out)] hover:border-border-accent/50 hover:-translate-y-1">
                  <span
                    aria-hidden
                    className="absolute top-0 inset-x-8 h-px"
                    style={{ background: "linear-gradient(90deg, transparent, rgba(0,170,158,0.4), transparent)" }}
                  />
                  <p className="font-ui font-bold tracking-[-0.01em] text-[17px] text-text">
                    {col.who}
                  </p>
                  <p className="mt-0.5 text-[14px] font-medium text-accent-light/90">
                    {col.bring}
                  </p>
                  <p className="mt-3.5 text-[13.5px] leading-[1.6] text-text-muted">
                    {col.line}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
