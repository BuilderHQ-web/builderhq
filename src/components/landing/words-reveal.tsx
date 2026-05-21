"use client";

/**
 * WordsReveal — mask-slide word reveal for headings.
 *
 * Splits a string of text into words, wraps each in an
 * `overflow: hidden` mask, and animates each word's child from
 * `y: 100%` to `y: 0` with a stagger. Triggered when the heading
 * enters the viewport. Once played, doesn't replay.
 *
 *   "Tendering shouldn't feel like"
 *    │
 *    └── ┌──────────┐ ┌──────────┐ ┌──────┐ ┌──────┐
 *        │ Tendering│ │shouldn't │ │ feel │ │ like │   masks
 *        └──────────┘ └──────────┘ └──────┘ └──────┘
 *           ↑            ↑            ↑        ↑
 *         word         word         word     word     animate from below
 *
 * Multiple instances on the same line can chain via `startIndex`
 * so the stagger continues across phrases (e.g., the accent-italic
 * portion of a heading). Default behaviour: each phrase animates
 * independently in sync.
 */

import * as React from "react";
import { useRef } from "react";
import { motion, useInView } from "motion/react";

export function WordsReveal({
  children,
  className,
  startIndex = 0,
  stagger = 0.07,
  duration = 0.85,
  ease = [0.22, 1, 0.36, 1] as const,
}: {
  children: string;
  className?: string;
  startIndex?: number;
  stagger?: number;
  duration?: number;
  ease?: readonly [number, number, number, number];
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.25 });

  // Split on whitespace but PRESERVE the whitespace tokens — that
  // way "Tendering shouldn't feel" renders with the original spaces
  // between words. Whitespace tokens render as plain text (no
  // animation, no inline-block).
  const tokens = children.split(/(\s+)/);

  // Count only non-whitespace tokens for stagger indexing so word
  // delays don't get inflated by whitespace.
  let wordCount = -1;

  return (
    <span ref={ref} className={className}>
      {tokens.map((token, i) => {
        if (/^\s+$/.test(token)) {
          // Keep the original whitespace inline.
          return <React.Fragment key={i}>{token}</React.Fragment>;
        }
        wordCount += 1;
        const delay = (startIndex + wordCount) * stagger;
        return (
          <span
            key={i}
            // The mask: clips anything outside the line-box so the
            // child can slide up from below without bleeding into
            // surrounding lines. `leading-[1.02]` matches the
            // heading's leading exactly so the mask sits flush.
            style={{
              display: "inline-block",
              overflow: "hidden",
              verticalAlign: "top",
              // 1.05em mask height accommodates descenders + italics
              // without clipping; tuned to avoid cropping g/p/y.
              lineHeight: "1.05em",
              paddingBottom: "0.08em",
              marginBottom: "-0.08em",
            }}
          >
            <motion.span
              className="inline-block"
              initial={{ y: "105%" }}
              animate={inView ? { y: "0%" } : { y: "105%" }}
              transition={{
                duration,
                delay,
                ease: ease as [number, number, number, number],
              }}
            >
              {token}
            </motion.span>
          </span>
        );
      })}
    </span>
  );
}
