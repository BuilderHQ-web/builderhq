"use client";

/**
 * Proof — the human, credible beat, fully forked per lens:
 *   homeowner  → how every builder gets in (the vetting gate)
 *   builder    → how every project gets in (we vet the work too)
 *   architect  → how practices join (invited, personally, on your terms)
 * No invented stats, no stock testimonials. Concrete and true.
 */

import { motion } from "motion/react";

import { Reveal } from "../reveal";
import { LENS, ROLE_PALETTE } from "./content";
import { useRole } from "./role";
import { RoleSwap } from "./swap";

export function Proof() {
  const { role } = useRole();
  const copy = LENS[role].proof;
  const pal = ROLE_PALETTE[role];

  return (
    <section className="relative px-5 md:px-10 py-20 lg:py-24 scroll-mt-16 lg:min-h-[100svh] lg:flex lg:items-center">
      <div className="mx-auto w-full max-w-[1080px]">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.92fr] gap-10 lg:gap-16 items-center">
          {/* The people */}
          <Reveal>
            <RoleSwap>
              <div className="text-center lg:text-left">
                <h2 className="font-ui font-semibold tracking-[-0.035em] text-[clamp(2.2rem,3.2vw+0.5rem,3.5rem)] leading-[1.08] max-w-[17ch] mx-auto lg:mx-0">
                  <span className="text-text">{copy.h2a}</span>{" "}
                  <span style={{ color: pal.accentSoft }}>{copy.h2b}</span>
                </h2>
                <p className="mt-6 mx-auto lg:mx-0 max-w-[50ch] text-[15px] leading-[1.75] text-text-muted">
                  {copy.body}
                </p>
                <p className="mt-6 text-[13px] tracking-[0.04em] text-text-dim">
                  {copy.place}
                </p>
              </div>
            </RoleSwap>
          </Reveal>

          {/* The gate */}
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
                <p className="text-[10px] tracking-[0.22em] uppercase text-text-dim font-semibold">
                  {copy.panelTitle}
                </p>

                <ol className="mt-6 relative">
                  <span
                    aria-hidden
                    className="absolute left-[15px] top-4 bottom-6 w-px"
                    style={{ background: `linear-gradient(180deg, ${pal.accent}66, ${pal.accent}0f)` }}
                  />
                  {copy.gates.map((g, i) => (
                    <motion.li
                      key={g.label}
                      initial={{ opacity: 0, x: 12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, amount: 0.5 }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.15 + i * 0.1 }}
                      className="relative grid grid-cols-[32px_1fr] gap-x-4 pb-6 last:pb-0"
                    >
                      <span
                        className="relative z-10 inline-flex size-8 items-center justify-center rounded-full border"
                        style={{ borderColor: pal.accent + "55", background: "#ffffff", color: pal.accentSoft }}
                      >
                        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.4">
                          <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <div className="pt-1">
                        <p className="font-ui font-semibold text-[14.5px] text-text leading-[1.3]">
                          {g.label}
                        </p>
                        <p className="mt-1 text-[12.5px] leading-[1.55] text-text-dim">
                          {g.detail}
                        </p>
                      </div>
                    </motion.li>
                  ))}
                </ol>

                <p className="mt-2 pt-5 border-t border-border-subtle/60 text-[12.5px] leading-[1.6] text-text-muted">
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
