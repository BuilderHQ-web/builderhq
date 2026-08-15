"use client";

/**
 * StatCount — a number that settles into place.
 *
 * The dashboard's summary numbers used to just be printed. This one
 * counts from zero to its value over ~0.9s the first time it scrolls
 * into view, which is enough motion to make a summary feel alive and
 * little enough to stay out of the reader's way. Renders the final
 * value immediately under prefers-reduced-motion, and formats through
 * a caller-supplied formatter so currency and plain counts share the
 * one component.
 */

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";

export function StatCount({
  value,
  format = "number",
  className,
}: {
  value: number;
  /**
   * How to render each frame's value. A NAME, not a function: this is
   * a client component, and a function prop crossing the server
   * boundary throws "Functions cannot be passed directly to Client
   * Components" at runtime — which typecheck cannot see and dev does
   * not reproduce. Add a case here rather than a callback there.
   */
  format?: "number" | "currency";
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced || value === 0) {
      setShown(value);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const DUR = 900;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / DUR);
      // ease-out cubic: fast start, gentle settle.
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduced, value]);

  const text =
    format === "currency"
      ? new Intl.NumberFormat("en-AU", {
          style: "currency",
          currency: "AUD",
          maximumFractionDigits: 0,
        }).format(shown)
      : new Intl.NumberFormat("en-AU").format(shown);

  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  );
}
