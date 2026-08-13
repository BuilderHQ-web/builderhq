"use client";

/**
 * Problem — three failures, then the turn.
 *
 * The layout settled here after several attempts: three equal panels
 * on one row, and the fix centred beneath them under the site's
 * kicker-with-rules grammar. Equal panels are what fixed the ragged
 * column bottoms of the earlier treatment, and centring the
 * conclusion under a symmetric row is what stopped it drifting in its
 * own alignment system.
 *
 * A dark version of this chapter was built and rejected: the layout
 * survived, the ground did not. So the panels are paper on the warm
 * field, and the accents return to the light theme's values.
 *
 * One rule carried from the app and easy to break here: bright teal
 * #00d4c8 and its siblings are FILL only. As display type on cream
 * they fail contrast, so every coloured word in this section uses the
 * lens's accentSoft, which is mixed for exactly this ground.
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

        {/* ── Three failures, three equal panels ───────────────────── */}
        <RoleSwap className="mt-12 lg:mt-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5 items-stretch">
            {copy.points.map((point, i) => (
              <motion.article
                key={point.claim}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.7, ease: EASE, delay: 0.08 + i * 0.1 }}
                className="group relative overflow-hidden rounded-[18px] border p-7 lg:p-8 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5"
                style={{
                  borderColor: "rgba(24,34,44,0.10)",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.62))",
                  boxShadow:
                    "0 1px 2px rgba(24,34,44,0.04), 0 14px 34px -26px rgba(24,34,44,0.30)",
                }}
              >
                {/* The lens tint, held back until the pointer asks for
                    it. Barely there by design: on paper a wash this
                    faint reads as warmth, not as a highlight. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 size-[300px] rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{
                    background: `radial-gradient(circle, ${pal.tint}, transparent 68%)`,
                  }}
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-[18px] border opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ borderColor: "rgba(24,34,44,0.20)" }}
                />

                <div className="relative">
                  <span
                    className="font-mono text-[12px] tracking-[0.22em] tabular-nums"
                    style={{ color: pal.accentSoft }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-5 max-w-[20ch] text-balance font-ui font-semibold text-[19px] lg:text-[21px] leading-[1.28] tracking-[-0.015em] text-text">
                    {point.claim}
                  </h3>
                  <p className="mt-3.5 max-w-[38ch] text-pretty text-[14.5px] lg:text-[15px] leading-[1.7] text-text-muted">
                    {point.body}
                  </p>
                </div>
              </motion.article>
            ))}
          </div>

          {/* ── The turn ────────────────────────────────────────────
              Centred under the symmetric row, announced by the site's
              kicker-with-rules grammar so it reads as the section's
              conclusion rather than one more line of copy. */}
          <div className="mt-16 lg:mt-20 flex flex-col items-center text-center">
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.8 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="flex items-center justify-center gap-3 font-mono text-[11px] tracking-[0.3em] uppercase text-text-dim"
            >
              <span
                aria-hidden
                className="h-px w-7"
                style={{ background: "rgba(24,34,44,0.22)" }}
              />
              {copy.bridge.label}
              <span
                aria-hidden
                className="h-px w-7"
                style={{ background: "rgba(24,34,44,0.22)" }}
              />
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.85, ease: EASE, delay: 0.15 }}
              className="mt-6 max-w-[26ch] font-ui font-semibold tracking-[-0.03em] text-[clamp(1.9rem,2.6vw+0.7rem,3.1rem)] leading-[1.1]"
            >
              <span className="block text-text">{copy.bridge.a}</span>
              <span className="block" style={{ color: pal.accentSoft }}>
                {copy.bridge.b}
              </span>
            </motion.p>
          </div>
        </RoleSwap>
      </div>
    </section>
  );
}
