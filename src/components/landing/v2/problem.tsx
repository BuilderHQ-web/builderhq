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
            <div className="text-center">
              <h2 className="mx-auto max-w-[24ch] font-ui font-semibold tracking-[-0.035em] text-[clamp(2.3rem,3.6vw+0.5rem,4rem)] leading-[1.06]">
                <span className="text-text">{copy.h2a}</span>{" "}
                <span style={{ color: pal.accentSoft }}>{copy.h2b}</span>
              </h2>
              <p className="mt-5 lg:mt-6 mx-auto max-w-[58ch] text-[15.5px] sm:text-[16.5px] leading-[1.65] text-text-muted">
                {copy.blurb}
              </p>
            </div>
          </RoleSwap>
        </Reveal>

        <RoleSwap className="mt-12 lg:mt-20">
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
                <h3 className="mt-4 max-w-[18ch] font-ui font-semibold text-[19px] lg:text-[20px] leading-[1.28] tracking-[-0.015em] text-text">
                  {point.claim}
                </h3>
                <p className="mt-3 max-w-[34ch] text-[15px] leading-[1.65] text-text-muted">
                  {point.body}
                </p>
              </motion.div>
            ))}
          </div>

          {/* One line to hand over to how-it-works. */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.5 }}
            className="mt-12 lg:mt-16 mx-auto max-w-[52ch] text-center text-[15.5px] sm:text-[16.5px] leading-[1.65] text-text"
          >
            {copy.bridge}
          </motion.p>
        </RoleSwap>
      </div>
    </section>
  );
}
