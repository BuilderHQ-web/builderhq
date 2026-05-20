"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Stats Strip — elegant social proof section.
 * Animated countUp numbers on scroll-enter.
 * Clean typography, no cards, just impactful numbers.
 */

const STATS = [
  { value: 2.4, suffix: "B+", prefix: "$", label: "Project value tendered" },
  { value: 150, suffix: "+", prefix: "", label: "Verified builders" },
  { value: 14, suffix: " days", prefix: "", label: "Avg. tender turnaround" },
  { value: 78, suffix: "K", prefix: "$", label: "Avg. savings per project" },
] as const;

export function StatsStrip() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      ref={ref}
      className="py-16 lg:py-20 border-y border-border-subtle"
    >
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{
                duration: 0.6,
                delay: i * 0.1,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="text-center lg:text-left"
            >
              <div className="text-[clamp(2rem,5vw,3rem)] font-medium tracking-tight text-text tabular-nums">
                {stat.prefix}
                <AnimatedNumber
                  value={stat.value}
                  isInView={isInView}
                  delay={i * 100}
                />
                {stat.suffix}
              </div>
              <div className="mt-2 text-[14px] text-text-muted">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Animated number counter
 */
function AnimatedNumber({
  value,
  isInView,
  delay = 0,
}: {
  value: number;
  isInView: boolean;
  delay?: number;
}) {
  const [count, setCount] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isInView || hasAnimated.current) return;
    hasAnimated.current = true;

    const timeout = setTimeout(() => {
      const duration = 1500;
      const steps = 60;
      const increment = value / steps;
      let current = 0;
      const interval = duration / steps;

      const timer = setInterval(() => {
        current += increment;
        if (current >= value) {
          setCount(value);
          clearInterval(timer);
        } else {
          setCount(current);
        }
      }, interval);

      return () => clearInterval(timer);
    }, delay);

    return () => clearTimeout(timeout);
  }, [isInView, value, delay]);

  // Format number - show decimal for values with decimals
  const formatted = Number.isInteger(value)
    ? Math.round(count).toLocaleString()
    : count.toFixed(1);

  return <span>{formatted}</span>;
}
