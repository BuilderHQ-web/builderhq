"use client";

import { useEffect, useState } from "react";
import { useInView } from "motion/react";
import { useRef } from "react";

/**
 * Count-up animator. Mounts at zero, eases to `value` over `duration`
 * ms when scrolled into view. Tabular-nums + min-width via the
 * widest target prevent layout shift mid-animation.
 *
 * `format` is a string template:
 *   "{n}%"  → "0%" → "100%"
 *   "${n}"  → "$0" → "$50"
 *   "{n}"   → "0" → "3"
 *
 * For string-only metrics (e.g. "AU") use AnimatedCount.Static below.
 */
export function AnimatedCount({
  value,
  duration = 1400,
  format = "{n}",
  delay = 0,
}: {
  value: number;
  duration?: number;
  format?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const start = performance.now() + delay;
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = Math.max(0, now - start);
      const progress = Math.min(1, elapsed / duration);
      // Ease-out cubic — fast start, gentle landing.
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * value));
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setCurrent(value);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration, delay]);

  return (
    <span ref={ref} className="tabular-nums">
      {format.replace("{n}", String(current))}
    </span>
  );
}
