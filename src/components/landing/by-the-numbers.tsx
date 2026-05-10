"use client";

/**
 * ByTheNumbers — a single confident row that replaces the older chart-y
 * Stats section. Four hard numbers, no animation gymnastics, no
 * scrolling reveals competing with the headline. The strip's job is
 * "five seconds of credibility," not "be looked at."
 *
 * Each number sits on its own column with a thin vertical divider so
 * the eye reads across as a continuous line. On mobile the columns
 * stack 2×2 with horizontal dividers.
 */

import { Reveal } from "./reveal";

// Real numbers from the Bubble export are wired in per-deploy. The
// strings below are the source of truth for the marketing surface.
// When the figures update, edit them here — no other consumers.
const ITEMS = [
  {
    value: "50+",
    label: "Verified builders",
    sub: "ABR active + state-register checked.",
  },
  {
    value: "45+",
    label: "Project unlocks",
    sub: "Real residential builds, tendered.",
  },
  {
    value: "$50M+",
    label: "Tenders submitted",
    sub: "Total quoted value across the platform.",
  },
  {
    value: "Free",
    label: "For owners — forever",
    sub: "No fees, no commission on awards.",
  },
] as const;

export function ByTheNumbers() {
  return (
    <section
      id="by-the-numbers"
      aria-label="Platform facts at a glance"
      className="relative px-6 md:px-10 py-14 lg:py-16"
    >
      <div className="mx-auto max-w-[1320px]">
        <Reveal>
          <div
            className={[
              "relative rounded-md border border-border-subtle overflow-hidden",
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
            <div className="relative grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-border-subtle/60">
              {ITEMS.map((item) => (
                <div
                  key={item.label}
                  className="px-6 lg:px-8 py-7 lg:py-8 flex flex-col gap-2"
                >
                  <span
                    className="font-display tracking-[-0.005em] tabular-nums leading-none text-accent-light"
                    style={{
                      fontSize: "clamp(2.25rem, 2.4vw + 1rem, 3rem)",
                      textShadow:
                        "0 0 60px rgba(0,212,200,0.25), 0 0 120px rgba(0,212,200,0.08)",
                    }}
                  >
                    {item.value}
                  </span>
                  <span className="text-[11px] tracking-[0.18em] uppercase text-text-muted font-ui font-medium mt-1">
                    {item.label}
                  </span>
                  <span className="text-[12px] leading-[1.55] text-text-dim max-w-[28ch]">
                    {item.sub}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
