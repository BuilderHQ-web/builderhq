"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";

/**
 * Builder dashboard hero intro — animated greeting + ambient sweep.
 *
 * - Time-of-day greeting (Good morning / afternoon / evening) computed
 *   on the client so server/client times don't disagree.
 * - "Hi" + name reveal staggered, accent name has a subtle glow.
 * - One-shot light-sweep across the hero on mount.
 */
export function BuilderHeroIntro({ firstName }: { firstName: string }) {
  const [greeting, setGreeting] = useState("Hello");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  return (
    <div className="relative">
      {/* one-shot sweep on mount */}
      <motion.span
        aria-hidden
        initial={{ x: "-30%", opacity: 0 }}
        animate={{ x: "120%", opacity: [0, 0.4, 0.4, 0] }}
        transition={{
          duration: 1.6,
          ease: [0.22, 1, 0.36, 1],
          delay: 0.25,
          times: [0, 0.15, 0.85, 1],
        }}
        className="pointer-events-none absolute inset-y-0 w-[40%] rounded-full"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(126,245,237,0.15), transparent)",
          filter: "blur(36px)",
        }}
      />

      <motion.span
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="inline-flex items-center gap-2.5 text-[10px] tracking-[0.24em] uppercase text-accent font-ui font-medium"
      >
        <span className="size-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(0,212,200,0.7)]" />
        {greeting}
      </motion.span>

      <motion.h1
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
        className="mt-5 font-display uppercase tracking-[-0.018em] leading-[0.9] text-[clamp(2.5rem,5vw+1rem,5rem)]"
      >
        Hi{" "}
        <motion.span
          initial={{ opacity: 0, y: "100%" }}
          animate={{ opacity: 1, y: "0%" }}
          transition={{ delay: 0.18, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="inline-block text-accent-light"
          style={{
            textShadow:
              "0 0 60px rgba(0,212,200,0.32), 0 0 120px rgba(0,212,200,0.12)",
          }}
        >
          {firstName}
        </motion.span>
        .
      </motion.h1>
    </div>
  );
}
