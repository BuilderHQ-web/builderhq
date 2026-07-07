"use client";

/**
 * Testimonials — Base44's story block, our colours. NOT a card:
 * full-bleed on the page, with an attribution line up top, a huge bold
 * quote, and three big stepped stat rectangles at the bottom (the
 * descending-staircase Base44 uses). No photo. It auto-advances every
 * 7s with a smooth horizontal slide and can be driven by the dots.
 *
 * Reset-on-lens-change via keying <Story> on role (no setState-in-effect).
 *
 * CONTENT IS PLACEHOLDER (TESTIMONIALS in content.ts) — real,
 * attributable quotes + numbers must replace it before deploy (ACCC).
 */

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "@/lib/utils";
import { TESTIMONIALS, ROLE_PALETTE, type Role } from "./content";
import { SectionField } from "./section-field";
import { useRole } from "./role";

const INTERVAL = 7000;

/** Descending staircase — first tallest, bottoms aligned. */
const STEP_H = ["h-[128px] sm:h-[240px] lg:h-[300px]", "h-[112px] sm:h-[205px] lg:h-[250px]", "h-[96px] sm:h-[170px] lg:h-[200px]"];

const slide = {
  enter: (d: number) => ({ opacity: 0, x: d * 50 }),
  center: { opacity: 1, x: 0 },
  exit: (d: number) => ({ opacity: 0, x: d * -50 }),
};

export function Testimonials() {
  const { role } = useRole();
  return (
    <section className="relative overflow-hidden px-5 md:px-10 py-20 lg:py-28 lg:min-h-[100svh] lg:flex lg:items-center">
      <SectionField variant="dots" />
      <div className="relative mx-auto w-full max-w-[1180px]">
        <Story key={role} role={role} />
      </div>
    </section>
  );
}

function Story({ role }: { role: Role }) {
  const pal = ROLE_PALETTE[role];
  const set = TESTIMONIALS[role];
  const [idx, setIdx] = React.useState(0);
  const [dir, setDir] = React.useState(1);

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      setDir(1);
      setIdx((i) => (i + 1) % set.length);
    }, INTERVAL);
    return () => window.clearTimeout(t);
  }, [idx, set.length]);

  const go = (next: number) => {
    setDir(next >= idx ? 1 : -1);
    setIdx(next);
  };

  const t = set[idx]!;

  return (
    <div>
      {/* popLayout: the outgoing slide is lifted out of flow while the
          incoming one lands, so the block never collapses to a blank
          gap mid-rotation (mode="wait" left a ~0.5s hole). */}
      <AnimatePresence mode="popLayout" custom={dir} initial={false}>
        <motion.div
          key={idx}
          custom={dir}
          variants={slide}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Attribution line */}
          <p className="text-[15px] sm:text-[17px] text-text-muted">
            <span style={{ color: pal.accent }}>—</span> {t.name}
            <span className="text-text-dim"> · {t.title}</span>
          </p>

          {/* Quote — the hero. Font lives on the sized element so any
              ch-based measure resolves against the big type, not 16px. */}
          <blockquote className="mt-6 lg:mt-9 max-w-[880px] lg:max-w-[1080px] font-ui font-semibold tracking-[-0.04em] leading-[1.05] text-[clamp(1.9rem,3.1vw+0.5rem,3.4rem)] text-text">
            <p>“{t.quote}”</p>
          </blockquote>

          {/* Stepped stat rectangles */}
          <div className="mt-9 sm:mt-12 lg:mt-16 grid grid-cols-3 gap-2 sm:gap-3 lg:gap-5 items-end">
            {t.stats.map((st, i) => (
              <div
                key={st.label}
                className={cn("relative rounded-xl overflow-hidden flex flex-col justify-between p-3 sm:p-6 lg:p-7", STEP_H[i])}
                style={{
                  background: "#ffffff", // white block pops on the dotted field — colour carried by the number
                  border: "1px solid rgba(24,34,44,0.08)",
                  boxShadow: "0 2px 10px -4px rgba(24,34,44,0.12)",
                }}
              >
                <span
                  aria-hidden
                  className="absolute top-0 inset-x-6 h-px"
                  style={{ background: `linear-gradient(90deg, transparent, ${pal.accentSoft}66, transparent)` }}
                />
                <p className="font-ui font-semibold tracking-[-0.03em] leading-none text-[clamp(1.25rem,3vw+0.5rem,3.2rem)]" style={{ color: pal.accentSoft }}>
                  {st.value}
                </p>
                <p className="text-[10.5px] sm:text-[14px] lg:text-[15px] leading-[1.35] text-text-muted">{st.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Dots */}
      <div className="mt-8 lg:mt-10 flex items-center gap-2">
        {set.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => go(i)}
            aria-label={`Show testimonial ${i + 1}`}
            aria-current={i === idx}
            className="group inline-flex items-center justify-center h-8 px-1"
          >
            <span
              className="block h-[6px] rounded-full transition-all duration-[420ms] ease-[var(--ease-out)]"
              style={{
                width: i === idx ? 32 : 7,
                background: i === idx ? pal.accent : "rgba(24,34,44,0.18)",
                boxShadow: i === idx ? `0 0 10px ${pal.accent}90` : "none",
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
