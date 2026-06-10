"use client";

/**
 * Scroll-driven motion for /owneradvisory.
 *
 * - <ScrollQuote/> brightens the founder quote word-by-word as the section
 *   scrolls up through the viewport — the line "wakes up" as you reach it.
 * - <Reveal/> is a quiet whileInView fade-up for section blocks.
 *
 * Both honour prefers-reduced-motion: the quote renders fully lit and
 * the reveals render statically.
 */

import { useRef, type ReactNode } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from "motion/react";

type Styles = Readonly<Record<string, string>>;

const DIM = "rgba(243, 248, 251, 0.14)";
const LIT = "rgba(243, 248, 251, 1)";
/** Words finish lighting by this fraction of scroll, then hold lit. */
const SPAN = 0.82;

function Word({
  progress,
  start,
  end,
  children,
}: {
  progress: MotionValue<number>;
  start: number;
  end: number;
  children: ReactNode;
}) {
  const color = useTransform(progress, [start, end], [DIM, LIT]);
  return <motion.span style={{ color }}>{children} </motion.span>;
}

export function ScrollQuote({
  styles: s,
  eyebrow,
  quote,
  attrName,
  attrRole,
}: {
  styles: Styles;
  eyebrow: string;
  quote: string;
  attrName: string;
  attrRole: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.85", "end 0.45"],
  });

  const words = quote.split(" ");

  return (
    <section ref={ref} className={s.quoteSection}>
      <p className={s.sectionEyebrow}>{eyebrow}</p>
      <blockquote className={s.quote} aria-label={quote}>
        {reduce
          ? quote
          : words.map((w, i) => {
              const start = (i / words.length) * SPAN;
              const end = ((i + 1) / words.length) * SPAN;
              return (
                <Word key={i} progress={scrollYProgress} start={start} end={end}>
                  {w}
                </Word>
              );
            })}
      </blockquote>
      <div className={s.quoteRule} />
      <p className={s.quoteAttr}>
        <b>{attrName}</b>
        <br />
        {attrRole}
      </p>
    </section>
  );
}

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12% 0px -12% 0px" }}
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay }}
    >
      {children}
    </motion.div>
  );
}
