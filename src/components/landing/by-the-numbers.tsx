"use client";

/**
 * ByTheNumbers — single confident row, animated count-up on first
 * scroll into view. Each numeric tile counts from 0 → its target;
 * the non-numeric tile ("Free") gets a soft glow reveal so it lands
 * on the same beat as the others.
 *
 * The motion is deliberately calm — duration 1.6s, ease-out, no
 * spring overshoot. We're not selling drama; we're confirming
 * credibility.
 *
 * Source-of-truth array sits in this file. When the figures move
 * (real numbers from the database), edit them here — the consumer
 * (the landing page) is unaware of the values.
 */

import { useEffect, useRef, useState } from "react";
import { useInView, animate } from "motion/react";
import { Reveal } from "./reveal";

type Item = {
  value: string;
  label: string;
  sub: string;
  /** Numeric counter target. When set, we count up from 0 and append
   *  the suffix ("+", "M+", etc.) baked into the value string. */
  numeric?: { to: number; prefix?: string; suffix?: string };
};

const ITEMS: Item[] = [
  {
    value: "50+",
    label: "Verified builders",
    sub: "ABR active + state-register checked.",
    numeric: { to: 50, suffix: "+" },
  },
  {
    value: "45+",
    label: "Project unlocks",
    sub: "Real residential builds, tendered.",
    numeric: { to: 45, suffix: "+" },
  },
  {
    value: "$50M+",
    label: "Tenders submitted",
    sub: "Total quoted value across the platform.",
    numeric: { to: 50, prefix: "$", suffix: "M+" },
  },
  {
    value: "Free",
    label: "For owners — forever",
    sub: "No fees, no commission on awards.",
    // No numeric target — uses the soft-reveal path.
  },
];

export function ByTheNumbers() {
  return (
    <section
      id="by-the-numbers"
      aria-label="Platform facts at a glance"
      className="relative px-5 md:px-10 py-14 lg:py-16"
    >
      <div className="mx-auto max-w-[1320px]">
        <Reveal>
          <div
            className={[
              "relative rounded-2xl lg:rounded-md border border-border-subtle overflow-hidden",
              "bg-[linear-gradient(180deg,rgba(10,28,44,0.40),rgba(6,18,30,0.55))]",
            ].join(" ")}
          >
            {/* Soft accent halo top-right — keeps the strip from feeling
                like a flat horizontal bar. */}
            <span
              aria-hidden
              className="pointer-events-none absolute -top-24 -right-20 size-72 rounded-full opacity-50"
              style={{
                background:
                  "radial-gradient(circle, rgba(0,212,200,0.16), transparent 70%)",
              }}
            />
            {/* Top hairline accent — matches the comparison cards. */}
            <span
              aria-hidden
              className="absolute top-0 inset-x-10 h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(126,245,237,0.45), transparent)",
              }}
            />
            <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x lg:divide-y-0 lg:divide-x divide-border-subtle/60">
              {ITEMS.map((item) => (
                <Tile key={item.label} item={item} />
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Tile({ item }: { item: Item }) {
  return (
    <div className="px-5 lg:px-8 py-7 lg:py-8 flex flex-col items-center text-center gap-2 lg:items-start lg:text-left">
      {item.numeric ? (
        <CountUp
          to={item.numeric.to}
          prefix={item.numeric.prefix ?? ""}
          suffix={item.numeric.suffix ?? ""}
        />
      ) : (
        <SoftReveal>{item.value}</SoftReveal>
      )}
      <span className="text-[10.5px] tracking-[0.22em] uppercase text-accent-light font-ui font-semibold mt-1.5">
        {item.label}
      </span>
      <span className="text-[12.5px] leading-[1.55] text-text-dim max-w-[28ch]">
        {item.sub}
      </span>
    </div>
  );
}

/**
 * CountUp — fires once when the element scrolls into view. Counts
 * from 0 to `to` over 1.6s with a calm ease-out, then locks. Re-fires
 * on no schedule — ages well across re-renders.
 */
function CountUp({
  to,
  prefix,
  suffix,
}: {
  to: number;
  prefix: string;
  suffix: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });
    return () => controls.stop();
  }, [inView, to]);

  return (
    <span
      ref={ref}
      className="font-display tracking-[-0.005em] tabular-nums leading-none text-accent-light"
      style={{
        fontSize: "clamp(3rem, 5vw + 1.25rem, 3.25rem)",
        textShadow:
          "0 0 60px rgba(0,212,200,0.25), 0 0 120px rgba(0,212,200,0.08)",
      }}
    >
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

/**
 * SoftReveal — for the non-numeric tile ("Free"). Fades in + glows
 * on the same scroll trigger as the count-ups so all four tiles feel
 * synchronised. Uses opacity + a brief letter-spacing pulse for a
 * subtle "settling into place" effect.
 */
function SoftReveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  return (
    <span
      ref={ref}
      className={[
        "font-display tracking-[-0.005em] leading-none text-accent-light",
        "transition-[opacity,letter-spacing,filter] duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
        inView
          ? "opacity-100 tracking-[-0.005em] [filter:blur(0px)]"
          : "opacity-0 tracking-[0.06em] [filter:blur(6px)]",
      ].join(" ")}
      style={{
        fontSize: "clamp(3rem, 5vw + 1.25rem, 3.25rem)",
        textShadow:
          "0 0 60px rgba(0,212,200,0.25), 0 0 120px rgba(0,212,200,0.08)",
      }}
    >
      {children}
    </span>
  );
}
