"use client";

/**
 * SectionDivider — the page's wayfinding system. A full-width hairline
 * with a numbered label riding it ("02 — How it works"), tinted by the
 * current lens. Replaces per-section kickers: one consistent, quiet
 * device that gives the long single-canvas page visible chapters and
 * rhythm without ever switching surfaces.
 */

import { motion } from "motion/react";

import { ROLE_PALETTE } from "./content";
import { useRole } from "./role";

export function SectionDivider({ n, label }: { n: string; label: string }) {
  const { role } = useRole();
  const pal = ROLE_PALETTE[role];

  return (
    <div aria-hidden className="relative px-5 md:px-10 py-2 lg:py-4">
      <div className="mx-auto max-w-[1200px] flex items-center gap-5">
        <motion.span
          className="h-px flex-1 origin-left"
          style={{ background: `linear-gradient(90deg, transparent, ${pal.accent}3d)` }}
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, amount: 0.9 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
        <span className="flex items-center gap-2.5 shrink-0">
          <span className="font-mono text-[12px] tabular-nums" style={{ color: pal.accentSoft }}>
            {n}
          </span>
          {/* Readable, not decorative. At 11px in text-dim nobody read
              the label, so the heading below arrived without its
              question. 13px, less extreme tracking, and a colour that
              passes contrast: still small caps on a hairline, but now
              it does its job. */}
          <span className="text-[13px] tracking-[0.16em] uppercase text-text-muted font-semibold">
            {label}
          </span>
        </span>
        <motion.span
          className="h-px flex-1 origin-right"
          style={{ background: `linear-gradient(270deg, transparent, ${pal.accent}3d)` }}
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, amount: 0.9 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}
