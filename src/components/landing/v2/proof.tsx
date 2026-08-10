"use client";

/**
 * Proof, the human beat of section 05. One voice, no lens fork: a plain
 * statement that there are people behind this and you can call them,
 * beside the four gates every builder clears before a project is
 * visible to them.
 *
 * The gate copy is deliberately literal about what is checked and how.
 * The Australian Business Register is national and checked live. State
 * licence registers are checked where one connects, and by hand where
 * one does not. Do not compress those two lines into "we verify every
 * builder's licence": that claim is not true outside Victoria.
 *
 * Every word comes from PROOF in content.ts. This file holds none of
 * its own.
 */

import { Reveal } from "../reveal";
import { PROOF } from "./content";

const TOP_RULE = {
  background:
    "linear-gradient(90deg, transparent, var(--color-border-accent-strong), transparent)",
} as const;

const SPINE = {
  background:
    "linear-gradient(180deg, var(--color-border-accent-strong), transparent)",
} as const;

export function Proof() {
  return (
    <section className="relative px-5 md:px-10 py-20 lg:py-28 scroll-mt-16">
      <div className="mx-auto w-full max-w-[1080px]">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.92fr] gap-12 lg:gap-16 items-center">
          {/* The people */}
          <Reveal>
            <div className="text-center lg:text-left">
              <h2 className="mx-auto lg:mx-0 max-w-[17ch] font-ui font-semibold tracking-[-0.03em] leading-[1.08] text-[clamp(2.2rem,3.2vw+0.5rem,3.5rem)] text-text">
                {PROOF.h2}
              </h2>
              <p className="mt-6 mx-auto lg:mx-0 max-w-[52ch] text-[17px] leading-[1.65] text-text-muted">
                {PROOF.body}
              </p>
            </div>
          </Reveal>

          {/* The gate */}
          <Reveal delay={0.1}>
            <div className="relative overflow-hidden rounded-2xl border border-border-subtle bg-surface-1 card-elev-lg p-7 lg:p-9">
              <span aria-hidden className="absolute top-0 inset-x-10 h-px" style={TOP_RULE} />

              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-light">
                {PROOF.gatesTitle}
              </p>

              <ol className="relative mt-7">
                <span
                  aria-hidden
                  className="absolute left-[17px] top-6 bottom-8 w-px"
                  style={SPINE}
                />
                {PROOF.gates.map((gate) => (
                  <li
                    key={gate.title}
                    className="relative grid grid-cols-[34px_1fr] gap-x-4 pb-7 last:pb-0"
                  >
                    <span className="relative z-10 inline-flex size-[34px] items-center justify-center rounded-full border border-border-accent bg-accent-muted text-accent-light">
                      <svg
                        aria-hidden
                        viewBox="0 0 24 24"
                        className="size-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                      >
                        <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <div className="pt-1">
                      <p className="font-ui font-semibold text-[16px] leading-[1.35] text-text">
                        {gate.title}
                      </p>
                      <p className="mt-1.5 text-[16px] leading-[1.55] text-text-muted">
                        {gate.line}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              <p className="mt-1 border-t border-border-subtle pt-6 text-[16px] leading-[1.6] text-text-muted">
                {PROOF.footer}
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
