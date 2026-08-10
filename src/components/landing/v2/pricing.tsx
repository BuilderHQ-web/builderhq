"use client";

/**
 * Pricing — what it costs, answered before anyone has to ask.
 *
 * This slot used to be "Proof": the platform explaining how carefully
 * it checks its own work. Handsome, and entirely about us, sitting
 * between two other chapters that were also about us. The checks it
 * described have moved into Trust, where they belong as rules; the
 * chapter itself now answers the question every reader arrives with
 * and no other section answered: what does this cost me.
 *
 * The geometry is unchanged, deliberately. Same split, same measure,
 * same bordered panel on the right; only the panel's rows changed
 * shape, from a four-gate checklist to a price list. Every figure is
 * the live one from projects/pricing.ts.
 */

import { motion } from "motion/react";

import { Reveal } from "../reveal";
import { LENS, ROLE_PALETTE } from "./content";
import { useRole } from "./role";
import { RoleSwap } from "./swap";

export function Pricing() {
  const { role } = useRole();
  const copy = LENS[role].pricing;
  const pal = ROLE_PALETTE[role];

  return (
    <section
      id="pricing"
      className="relative px-5 md:px-10 py-20 lg:py-24 scroll-mt-16 lg:min-h-[100svh] lg:flex lg:items-center"
    >
      <div className="mx-auto w-full max-w-[1080px]">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.92fr] gap-10 lg:gap-16 items-center">
          {/* The answer, in words */}
          <Reveal>
            <RoleSwap>
              <div className="text-center lg:text-left">
                <h2 className="font-ui font-semibold tracking-[-0.035em] text-[clamp(2.2rem,3.2vw+0.5rem,3.5rem)] leading-[1.08] max-w-[19ch] mx-auto lg:mx-0">
                  <span className="block text-text">{copy.h2a}</span>
                  <span className="block" style={{ color: pal.accentSoft }}>
                    {copy.h2b}
                  </span>
                </h2>
                <p className="mt-6 mx-auto lg:mx-0 max-w-[50ch] text-pretty text-[15px] leading-[1.75] text-text-muted">
                  {copy.body}
                </p>
                <p className="mt-6 text-[13px] tracking-[0.04em] text-text-dim">
                  {copy.note}
                </p>
              </div>
            </RoleSwap>
          </Reveal>

          {/* The answer, in figures */}
          <Reveal delay={0.1}>
            <RoleSwap>
              <div
                className="relative rounded-2xl border p-7 lg:p-9 overflow-hidden"
                style={{
                  borderColor: pal.accent + "30",
                  background: "linear-gradient(180deg, #ffffff, #faf8f3)",
                  boxShadow: `0 24px 60px -32px ${pal.accent}50`,
                }}
              >
                <span
                  aria-hidden
                  className="absolute top-0 inset-x-10 h-px"
                  style={{ background: `linear-gradient(90deg, transparent, ${pal.accentSoft}77, transparent)` }}
                />
                <p className="text-[11px] tracking-[0.22em] uppercase text-text-dim font-semibold">
                  {copy.panelTitle}
                </p>

                <dl className="mt-6">
                  {copy.rows.map((row, i) => (
                    <motion.div
                      key={row.label}
                      initial={{ opacity: 0, x: 12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, amount: 0.5 }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.15 + i * 0.1 }}
                      className={[
                        "flex items-baseline justify-between gap-6 py-3.5",
                        i === 0 ? "" : "border-t border-border-subtle/70",
                      ].join(" ")}
                    >
                      <dt className="text-[14.5px] leading-[1.4] text-text">
                        {row.label}
                      </dt>
                      <dd
                        className="font-ui font-semibold tabular-nums text-[17px] lg:text-[18px] tracking-[-0.01em] shrink-0"
                        style={{ color: pal.accentSoft }}
                      >
                        {row.value}
                      </dd>
                    </motion.div>
                  ))}
                </dl>

                <p className="mt-5 pt-5 border-t border-border-subtle/60 text-[12.5px] leading-[1.6] text-text-muted">
                  {copy.panelFooter}
                </p>
              </div>
            </RoleSwap>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
