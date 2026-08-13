"use client";

/**
 * Problem — the argument as a ledger.
 *
 * Earlier treatments tried illustration (the chaos diorama) and then
 * three floating columns with a conclusion hung under a thread of
 * gradient. The columns bottomed out ragged, the fix drifted in its
 * own alignment system, and the section read as three parts slapped
 * together rather than one argument.
 *
 * The product's whole case is accounting-shaped: three line items of
 * failure, one total. So the section is now a single ruled artifact.
 * Each failure is a row on a hairline: a mono numeral in the margin
 * column, the claim, the evidence beside it on one baseline. The rows
 * close with a double rule, which is how a ledger has marked "the
 * reckoning" for two hundred years, and the fix sits inside that
 * total row: same grid, display scale, the role's accent. The
 * conclusion stops floating because it is the bottom line of the
 * same document.
 *
 * Type and rules only. No cards, no icons, no colour fields. The
 * margin column is the one piece of structure carried from row to
 * row, so the eye walks down it like a filing margin.
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

/** One hairline that draws itself as it enters the viewport. */
function Rule({ strong, delay = 0 }: { strong?: boolean; delay?: number }) {
  return (
    <motion.span
      aria-hidden
      className="block h-px w-full origin-left"
      style={{ background: strong ? "rgba(24,34,44,0.28)" : "rgba(24,34,44,0.12)" }}
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, amount: 0.9 }}
      transition={{ duration: 0.9, ease: EASE, delay }}
    />
  );
}

export function Problem() {
  const { role } = useRole();
  const copy = LENS[role].problem;
  const pal = ROLE_PALETTE[role];

  return (
    <section
      id="story"
      className="relative overflow-hidden px-5 md:px-10 pt-16 pb-16 lg:py-24 scroll-mt-24 lg:min-h-[100svh] lg:flex lg:items-center"
    >
      <SectionField variant="warm" />
      <div className="relative mx-auto w-full max-w-[1140px]">
        <Reveal>
          <RoleSwap>
            <SectionHead head={copy.head} />
          </RoleSwap>
        </Reveal>

        {/* ── The ledger ──────────────────────────────────────────
            Narrower than the section measure on purpose: a document
            inside a page, not a stripe across it. */}
        <RoleSwap className="mt-12 lg:mt-16">
          <div className="mx-auto max-w-[960px]">
            <Rule />

            {copy.points.map((point, i) => (
              <div key={point.claim}>
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.65, ease: EASE, delay: 0.08 + i * 0.1 }}
                  className="grid grid-cols-[44px_1fr] gap-y-2.5 py-7 lg:grid-cols-[76px_minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-x-10 lg:py-9"
                >
                  <span
                    className="pt-[5px] font-mono text-[12px] tracking-[0.18em] tabular-nums"
                    style={{ color: pal.accentSoft }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="max-w-[22ch] text-balance font-ui font-semibold text-[19px] lg:text-[21px] leading-[1.28] tracking-[-0.015em] text-text">
                    {point.claim}
                  </h3>
                  <p className="col-start-2 lg:col-start-3 max-w-[52ch] text-pretty text-[14.5px] lg:text-[15px] leading-[1.7] text-text-muted lg:pt-[3px]">
                    {point.body}
                  </p>
                </motion.div>
                <Rule delay={0.05} />
              </div>
            ))}

            {/* The second stroke of the double rule: the ledger's
                mark that the line items are done and what follows is
                the reckoning. */}
            <div className="mt-[5px]">
              <Rule strong delay={0.15} />
            </div>

            {/* ── The total row ─────────────────────────────────
                Same grid as the failures, so the conclusion lands in
                the same document rather than floating under it. The
                label takes the margin column the numerals used; the
                thesis takes the full text measure at display scale. */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.3 }}
              className="grid grid-cols-[44px_1fr] py-9 lg:grid-cols-[76px_1fr] lg:gap-x-10 lg:py-12"
            >
              <span
                aria-hidden
                className="mt-[9px] h-px w-6 lg:w-9"
                style={{ background: pal.accentSoft }}
              />
              <div>
                <span
                  className="block font-mono text-[11px] tracking-[0.28em] uppercase"
                  style={{ color: pal.accentSoft }}
                >
                  {copy.bridge.label}
                </span>
                <p className="mt-5 max-w-[24ch] font-ui font-semibold tracking-[-0.03em] text-[clamp(1.7rem,2.2vw+0.7rem,2.75rem)] leading-[1.12]">
                  <span className="block text-text">{copy.bridge.a}</span>
                  <span className="block" style={{ color: pal.accentSoft }}>
                    {copy.bridge.b}
                  </span>
                </p>
              </div>
            </motion.div>
          </div>
        </RoleSwap>
      </div>
    </section>
  );
}
