"use client";

/**
 * Problem — the dark chapter.
 *
 * Every earlier treatment tried to make this section behave on the
 * cream canvas: a diorama, then columns, then a ledger. The register
 * was always slightly wrong, because the section's job is not to
 * inform, it is to make the reader feel the hole they are standing
 * in before the product turns the lights on.
 *
 * So the chapter goes dark. The same deep navy the how-it-works deck
 * speaks in, opened and closed by hairline seams, with the role's
 * bloom breathing in the corners. The three failures sit as three
 * equal glass panels: a mono index, the claim in cream, the evidence
 * in blue-grey. And the fix becomes the one luminous moment on the
 * page: on this ground, the brand's electric hues finally read as
 * TYPE, which the light theme can never allow, so the conclusion
 * glows the way it should.
 *
 * The dark ground gets its own small palette. The light theme's
 * accent values are cut for cream and go muddy on navy, so each lens
 * carries a lifted variant used only inside this chapter.
 *
 * id="story" — where the lens switcher returns to.
 */

import { motion } from "motion/react";

import { Reveal } from "../reveal";
import { LENS, ROLE_PALETTE, type Role } from "./content";
import { useRole } from "./role";
import { RoleSwap } from "./swap";

const EASE = [0.22, 1, 0.36, 1] as const;

/** The deck's navy, exactly, so the page's dark moments rhyme. */
const NAVY =
  "linear-gradient(158deg, #132433 0%, #0c1826 46%, #101f2d 100%)";

/** Ink for dark ground. */
const D = {
  head: "#f3f7fb",
  body: "rgba(203,216,229,0.66)",
  faint: "rgba(233,241,249,0.38)",
  line: "rgba(255,255,255,0.09)",
  lineHot: "rgba(255,255,255,0.17)",
  card: "rgba(255,255,255,0.028)",
  cardHot: "rgba(255,255,255,0.05)",
} as const;

/** The lifted role hues, legal only on navy. The light palette's
 *  accents are mixed for cream and go muddy here. */
const BRIGHT: Record<Role, string> = {
  homeowner: "#25d8c9",
  builder: "#6f9eff",
  architect: "#e9b053",
};

export function Problem() {
  const { role } = useRole();
  const copy = LENS[role].problem;
  const pal = ROLE_PALETTE[role];
  const bright = BRIGHT[role];

  return (
    <section
      id="story"
      className="relative overflow-hidden px-5 md:px-10 py-20 lg:py-28 scroll-mt-24 lg:min-h-[100svh] lg:flex lg:items-center"
      style={{ background: NAVY }}
    >
      {/* The chapter's seams: a lit hairline where the dark begins and
          ends, the register's quietest signature. */}
      <span
        aria-hidden
        className="absolute top-0 inset-x-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 8%, rgba(255,255,255,0.16), transparent 92%)",
        }}
      />
      <span
        aria-hidden
        className="absolute bottom-0 inset-x-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 8%, rgba(255,255,255,0.16), transparent 92%)",
        }}
      />

      {/* The role's bloom, breathing in the corners of the dark. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-32 size-[560px] rounded-full"
        style={{
          background: `radial-gradient(circle, ${pal.glow1}, transparent 68%)`,
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-48 -right-36 size-[520px] rounded-full"
        style={{
          background: `radial-gradient(circle, ${pal.glow2}, transparent 68%)`,
        }}
      />

      <div className="relative mx-auto w-full max-w-[1140px]">
        {/* ── Head — SectionHead's scale, spoken in the dark ───────── */}
        <Reveal>
          <RoleSwap>
            <div className="text-center">
              <h2 className="mx-auto max-w-[26ch] font-ui font-semibold tracking-[-0.035em] text-[clamp(2.15rem,3.4vw+0.5rem,3.8rem)] leading-[1.06]">
                <span className="block" style={{ color: D.head }}>
                  {copy.head.h2a}
                </span>
                <span className="block" style={{ color: bright }}>
                  {copy.head.h2b}
                </span>
              </h2>
              <p
                className="mt-6 lg:mt-7 mx-auto max-w-[42ch] text-balance font-ui font-semibold tracking-[-0.015em] text-[18px] sm:text-[20px] lg:text-[21px] leading-[1.35]"
                style={{ color: D.head }}
              >
                {copy.head.lead}
              </p>
              {copy.head.blurb ? (
                <p
                  className="mt-3.5 mx-auto max-w-[58ch] text-pretty text-[15px] sm:text-[16px] leading-[1.65]"
                  style={{ color: D.body }}
                >
                  {copy.head.blurb}
                </p>
              ) : null}
            </div>
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
                className="group relative overflow-hidden rounded-[18px] border p-7 lg:p-8 transition-colors duration-300"
                style={{
                  borderColor: D.line,
                  background: D.card,
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
                }}
              >
                {/* the panel's own bloom, held back until the pointer
                    asks for it */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 size-[300px] rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{
                    background: `radial-gradient(circle, ${pal.glow1}, transparent 66%)`,
                  }}
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-[18px] border opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ borderColor: D.lineHot }}
                />

                <div className="relative">
                  <span
                    className="font-mono text-[12px] tracking-[0.22em] tabular-nums"
                    style={{ color: bright }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3
                    className="mt-5 max-w-[20ch] text-balance font-ui font-semibold text-[19px] lg:text-[21px] leading-[1.28] tracking-[-0.015em]"
                    style={{ color: D.head }}
                  >
                    {point.claim}
                  </h3>
                  <p
                    className="mt-3.5 max-w-[38ch] text-pretty text-[14.5px] lg:text-[15px] leading-[1.7]"
                    style={{ color: D.body }}
                  >
                    {point.body}
                  </p>
                </div>
              </motion.article>
            ))}
          </div>

          {/* ── The fix — the one luminous moment ───────────────────
              Centred under the symmetric row, announced by the site's
              kicker-with-rules grammar, and set in the lifted role hue
              the light theme can never use as type. The halo is the
              role's wash, not a glow filter: light behind the words,
              not neon on them. */}
          <div className="mt-16 lg:mt-20 flex flex-col items-center text-center">
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.8 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="flex items-center justify-center gap-3 font-mono text-[11px] tracking-[0.3em] uppercase"
              style={{ color: D.faint }}
            >
              <span
                aria-hidden
                className="h-px w-7"
                style={{ background: "rgba(255,255,255,0.22)" }}
              />
              {copy.bridge.label}
              <span
                aria-hidden
                className="h-px w-7"
                style={{ background: "rgba(255,255,255,0.22)" }}
              />
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.85, ease: EASE, delay: 0.15 }}
              className="mt-6 max-w-[26ch] font-ui font-semibold tracking-[-0.03em] text-[clamp(1.9rem,2.6vw+0.7rem,3.1rem)] leading-[1.1]"
            >
              <span className="block" style={{ color: D.head }}>
                {copy.bridge.a}
              </span>
              <span
                className="block"
                style={{ color: bright, textShadow: `0 0 44px ${pal.wash}` }}
              >
                {copy.bridge.b}
              </span>
            </motion.p>
          </div>
        </RoleSwap>
      </div>
    </section>
  );
}
