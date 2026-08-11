"use client";

/**
 * Problem — three structural failures, stated plainly.
 *
 * The earlier treatment was a chaos-to-order diorama: tilted red chips
 * imitating missed calls and renamed PDFs, an arrow, and a panel of
 * green ticks. It read as illustration rather than argument, which is
 * the wrong register for people about to commit a million dollars.
 *
 * This is the argument with the furniture removed. Three columns, a
 * mono numeral, a claim, two lines of evidence, separated by hairlines
 * and nothing else. No cards, no icons, no colour coding, no shadows.
 * It borrows the numbered-rule device from SectionDivider, which is
 * the most institutional thing on the page, so the section reads as
 * part of a document rather than a slide.
 *
 * Section geometry (full viewport, warm field, 1140 measure) and the
 * heading block are unchanged.
 *
 * id="story" — where the lens switcher returns to.
 */

import { motion } from "motion/react";

import { Reveal } from "../reveal";
import { LENS, ROLE_PALETTE } from "./content";
import { SectionField } from "./section-field";
import { SectionHead } from "./section-head";
import { useRole } from "./role";
import { RoleSwap } from "./swap";

const EASE = [0.22, 1, 0.36, 1] as const;

export function Problem() {
  const { role } = useRole();
  const copy = LENS[role].problem;
  const pal = ROLE_PALETTE[role];

  return (
    <section id="story" className="relative overflow-hidden px-5 md:px-10 pt-16 pb-16 lg:py-24 scroll-mt-24 lg:min-h-[100svh] lg:flex lg:items-center">
      <SectionField variant="warm" />
      <div className="relative mx-auto w-full max-w-[1140px]">
        <Reveal>
          <RoleSwap>
            <SectionHead head={copy.head} />
          </RoleSwap>
        </Reveal>

        <RoleSwap className="mt-12 lg:mt-16">
          {/* Three failures, side by side. The hairlines are the only
              structure; everything else is type. */}
          <div className="grid grid-cols-1 divide-y lg:grid-cols-3 lg:divide-y-0 lg:divide-x divide-[rgba(24,34,44,0.10)]">
            {copy.points.map((point, i) => (
              <motion.div
                key={point.claim}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.7, ease: EASE, delay: 0.1 + i * 0.12 }}
                className={[
                  "py-8 lg:py-2",
                  i === 0 ? "lg:pr-10" : i === 1 ? "lg:px-10" : "lg:pl-10",
                ].join(" ")}
              >
                <span
                  className="font-mono text-[11px] tracking-[0.22em]"
                  style={{ color: pal.accentSoft }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-4 max-w-[20ch] text-balance font-ui font-semibold text-[19px] lg:text-[20px] leading-[1.28] tracking-[-0.015em] text-text">
                  {point.claim}
                </h3>
                <p className="mt-3 max-w-[34ch] text-pretty text-[15px] leading-[1.65] text-text-muted">
                  {point.body}
                </p>
              </motion.div>
            ))}
          </div>

          {/* The turn in the argument. It used to be one more line of
              body copy at the foot of the section, which is where a
              reader stops reading. Now a rule descends out of the three
              failures and gathers into a single statement: the same
              numbered-rule grammar as the dividers, so the section
              announces its conclusion rather than muttering it. */}
          <div className="mt-12 lg:mt-16 flex flex-col items-center text-center">
            <motion.span
              aria-hidden
              className="h-9 w-px origin-top"
              style={{ background: `linear-gradient(180deg, transparent, ${pal.accent}99)` }}
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true, amount: 0.8 }}
              transition={{ duration: 0.7, ease: EASE }}
            />
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.25 }}
            >
              <span
                className="mt-4 block font-mono text-[11px] tracking-[0.28em] uppercase"
                style={{ color: pal.accentSoft }}
              >
                {copy.bridge.label}
              </span>
              <p className="mt-4 mx-auto max-w-[30ch] font-ui font-semibold tracking-[-0.03em] text-[clamp(1.5rem,1.9vw+0.7rem,2.4rem)] leading-[1.15]">
                <span className="block text-text">{copy.bridge.a}</span>
                <span className="block" style={{ color: pal.accentSoft }}>
                  {copy.bridge.b}
                </span>
              </p>
            </motion.div>
          </div>
        </RoleSwap>
      </div>
    </section>
  );
}
