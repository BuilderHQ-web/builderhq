"use client";

/**
 * Testimonials, the pull-quote beat that closes section 05. Not a card:
 * full bleed on the dotted field, with the attribution up top, one large
 * quote, and the descending staircase of three process facts beneath it.
 * The quote rotates every 10 seconds and stops entirely while the pointer
 * is anywhere over the block, so reading always beats the timer. The dots
 * drive it directly.
 *
 * The three facts do not rotate. They are fixed properties of the product,
 * each stated with its definition, and they are the only numbers in this
 * section. No dollar figures, no volumes, no savings claims.
 *
 * AUSTRALIAN CONSUMER LAW, read this before touching TESTIMONIALS.
 * The six quotes in content.ts are self-generated and illustrative. They
 * are not the words of real customers and are not attributable to anyone.
 * They must be replaced with real, permissioned quotes before this page
 * reaches production: presenting invented testimonials as genuine is
 * misleading conduct. Standing instruction from the plan: replace them
 * with verifiable facts (customer since, rounds run, users) the moment
 * real customers permit it, and collect those facts deliberately from day
 * one. No dollar or income claims in any replacement.
 */

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "@/lib/utils";
import { PROOF_FACTS, TESTIMONIALS } from "./content";
import { SectionField } from "./section-field";

/** Slow enough to read the long quotes. Pauses entirely on hover. */
const INTERVAL = 10000;

/** Instrument Serif is reserved: the Build Brief, pull quotes, and the
 *  three process-fact numerals below. Nowhere else on this page. */
const SERIF = { fontFamily: "var(--font-instrument-serif)" } as const;

/** Descending staircase, bottoms aligned. Heights start at sm: on a
 *  phone the three facts stack as rows so the labels can stay readable. */
const STEP_H = [
  "sm:h-[240px] lg:h-[300px]",
  "sm:h-[205px] lg:h-[250px]",
  "sm:h-[170px] lg:h-[200px]",
];

const slide = {
  enter: (d: number) => ({ opacity: 0, x: d * 50 }),
  center: { opacity: 1, x: 0 },
  exit: (d: number) => ({ opacity: 0, x: d * -50 }),
};

const TILE_RULE = {
  background:
    "linear-gradient(90deg, transparent, var(--color-border-accent), transparent)",
} as const;

export function Testimonials() {
  const [idx, setIdx] = React.useState(0);
  const [dir, setDir] = React.useState(1);
  // Auto-advance yields to reading: hovering anywhere over the block
  // holds the current quote until the pointer leaves.
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (paused) return;
    const t = window.setTimeout(() => {
      setDir(1);
      setIdx((i) => (i + 1) % TESTIMONIALS.length);
    }, INTERVAL);
    return () => window.clearTimeout(t);
  }, [idx, paused]);

  const go = (next: number) => {
    setDir(next >= idx ? 1 : -1);
    setIdx(next);
  };

  const t = TESTIMONIALS[idx]!;

  return (
    <section className="relative overflow-hidden px-5 md:px-10 py-20 lg:py-28">
      <SectionField variant="dots" />
      <div className="relative mx-auto w-full max-w-[1180px]">
        <div
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* popLayout: the outgoing quote is lifted out of flow while the
              incoming one lands, so the block never collapses to a blank
              gap mid-rotation. The min-height absorbs the difference
              between the shortest and longest quote. */}
          <AnimatePresence mode="popLayout" custom={dir} initial={false}>
            <motion.figure
              key={idx}
              custom={dir}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="min-h-[250px] lg:min-h-[272px]"
            >
              <figcaption className="flex items-center gap-3 text-[16px] sm:text-[17px] text-text-muted">
                <span aria-hidden className="block h-px w-7 bg-accent-light" />
                {t.who}
              </figcaption>

              <blockquote
                className="mt-6 lg:mt-8 max-w-[980px] text-[clamp(1.75rem,2.6vw+0.7rem,3rem)] leading-[1.12] tracking-[-0.01em] text-text"
                style={SERIF}
              >
                <p>“{t.quote}”</p>
              </blockquote>
            </motion.figure>
          </AnimatePresence>

          {/* Process facts. Fixed, not part of the rotation. */}
          <div className="mt-10 lg:mt-14 grid gap-3 sm:grid-cols-3 sm:items-end sm:gap-4 lg:gap-5">
            {PROOF_FACTS.map((fact, i) => (
              <div
                key={fact.label}
                className={cn(
                  "relative overflow-hidden rounded-xl border border-border-subtle bg-surface-1 card-elev",
                  "flex items-baseline gap-4 p-5",
                  "sm:flex-col sm:items-start sm:justify-between sm:p-6 lg:p-7",
                  STEP_H[i],
                )}
              >
                <span aria-hidden className="absolute top-0 inset-x-6 h-px" style={TILE_RULE} />
                <p
                  className="leading-none text-[2.4rem] sm:text-[clamp(2.2rem,4vw+0.6rem,3.4rem)] text-accent-light"
                  style={SERIF}
                >
                  {fact.value}
                </p>
                <p className="text-[16px] leading-[1.4] text-text-muted">{fact.label}</p>
              </div>
            ))}
          </div>

          {/* Dots */}
          <div className="mt-9 lg:mt-11 flex items-center gap-2">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show quote ${i + 1} of ${TESTIMONIALS.length}`}
                aria-current={i === idx}
                className="inline-flex h-8 items-center justify-center px-1"
              >
                <span
                  className="block h-[6px] rounded-full transition-all duration-[420ms] ease-[var(--ease-out)]"
                  style={{
                    width: i === idx ? 32 : 7,
                    background:
                      i === idx
                        ? "var(--color-accent-light)"
                        : "var(--color-border-strong)",
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
