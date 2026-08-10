"use client";

/**
 * HeroVisual: the proof, not a promise. One large, still, browser-framed
 * screen of the product doing its job: the round, evaluated. Three
 * tenders, their composite scores, and the flags the round raised.
 *
 * Static on purpose. A real screen reads credible where cycling cards
 * read like a demo. The only life is a single notification chip breathing
 * at the frame's edge, and one soft teal bloom behind the glass.
 */

import { motion } from "motion/react";
import { FileCheck2, Lock } from "lucide-react";

import { AppScene } from "./app-scenes";

export function HeroVisual() {
  return (
    <div className="relative w-full max-w-[92%] sm:max-w-[540px] lg:max-w-[620px]">
      {/* One fixed bloom. It lifts the frame off the canvas and nothing else. */}
      <div
        aria-hidden
        className="absolute -inset-10 sm:-inset-16 pointer-events-none"
        style={{ background: "radial-gradient(closest-side, rgba(0,212,200,0.16), transparent 74%)" }}
      />

      <div className="relative">
        <div className="relative overflow-hidden rounded-[16px] border border-border bg-surface-1 card-elev-lg sm:rounded-[20px]">
          <div className="relative flex h-10 items-center border-b border-border-subtle bg-surface-2 px-4 sm:h-11">
            <span className="flex items-center gap-1.5" aria-hidden>
              <span className="size-[9px] rounded-full bg-[#f6b9b3]" />
              <span className="size-[9px] rounded-full bg-[#f3d9a4]" />
              <span className="size-[9px] rounded-full bg-[#bfe3c0]" />
            </span>
            <span className="absolute left-1/2 inline-flex h-6 -translate-x-1/2 items-center gap-1.5 rounded-full bg-[rgba(24,34,44,0.05)] px-3.5 text-[11px] text-text-muted">
              <Lock className="size-2.5" aria-hidden />
              builderhq.com.au
            </span>
          </div>

          {/* Mobile: the scene sits top-aligned at its natural height and
              the overflow fades out, a deliberate peek so nothing chops
              mid-row. From sm up the frame is fixed and the scene centres
              itself inside it. */}
          <div className="relative h-[300px] overflow-hidden sm:h-[460px] lg:h-[500px]" style={{ background: "#0a1119" }}>
            <div className="absolute inset-x-0 top-0 sm:static sm:h-full">
              <AppScene scene="round" />
            </div>
            <div
              aria-hidden
              className="sm:hidden absolute bottom-0 inset-x-0 h-16"
              style={{ background: "linear-gradient(180deg, rgba(10,17,25,0), #0a1119)" }}
            />
          </div>
        </div>

        {/* One chip. Its numbers are the round's numbers. */}
        <motion.div
          aria-hidden
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: [0, -7, 0] }}
          transition={{
            opacity: { duration: 0.6, delay: 0.7 },
            y: { duration: 5.2, delay: 0.7, repeat: Infinity, ease: "easeInOut" },
          }}
          className="absolute -left-4 bottom-[15%] hidden items-center gap-2.5 rounded-xl border border-border-subtle bg-surface-1 py-2.5 pl-2.5 pr-4 card-elev-lg sm:flex lg:-left-9"
        >
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-muted text-accent-light">
            <FileCheck2 className="size-4" strokeWidth={2.2} />
          </span>
          <span className="min-w-0">
            <span className="block whitespace-nowrap text-[13px] font-semibold leading-tight text-text">
              New tender received
            </span>
            <span className="block whitespace-nowrap text-[11.5px] leading-tight text-text-muted">
              Hartley Homes · $1.28M
            </span>
          </span>
        </motion.div>
      </div>
    </div>
  );
}
