"use client";

/**
 * The spine. How a round runs, as a stacked deck.
 *
 * Each step is one card: copy on the left (the step counter and name, the
 * headline, the plain answer, the shared primary CTA), and on the right
 * the product scene for that step, bleeding to the card's edge.
 *
 * The scroll: cards are position-sticky, all pinned at the same top
 * offset, so the next card slides up from below and settles exactly over
 * the previous one, a full cover with no peeking strips. Pure CSS sticky
 * (native scroll, no scroll-jacking); stacking is desktop-only, mobile
 * gets a clean vertical flow with the scene under each step's copy.
 *
 * Nothing here is hard-coded from the copy: the steps, their scenes and
 * the step count all derive from STEPS in content.ts, and the CTA label
 * is the one shared primary the hero uses, so the two can never drift.
 */

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Reveal } from "../reveal";
import { HERO, HOW, STEPS } from "./content";
import { AppScene } from "./app-scenes";

/** Sticky geometry: every card pins at the same offset, so each
 *  incoming card settles exactly over the previous one, a full cover. */
const TOP_BASE = 72;
/** Bottom edge of the floating nav pill. The gap above the card is
 *  measured from here, so the deck sits balanced under it. */
const HEADER_OFFSET = 76;

/** Derived, never typed out: "01 / 04" grows with the step list. */
const TOTAL = String(STEPS.length).padStart(2, "0");

export function Spine({ authedHref }: { authedHref?: string | null }) {
  const cta = authedHref
    ? { label: "Open your dashboard", href: authedHref }
    : HERO.primary;

  // Pin each card vertically centred between the header and the viewport
  // bottom (equal gap top and bottom) rather than jammed under the nav.
  // cardH mirrors the CSS height: clamp(476, 85dvh-82, 714).
  const [deckTop, setDeckTop] = React.useState(TOP_BASE);
  React.useEffect(() => {
    const compute = () => {
      const vh = window.innerHeight;
      const cardH = Math.min(714, Math.max(476, vh * 0.85 - 82));
      setDeckTop(Math.max(TOP_BASE, Math.round((vh - cardH + HEADER_OFFSET) / 2)));
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  return (
    <section id="how" className="relative px-5 md:px-10 py-20 lg:py-28 scroll-mt-16">
      <div className="mx-auto max-w-[1280px]">
        <Reveal>
          <div className="text-center mb-12 lg:mb-16">
            <h2 className="mx-auto max-w-[20ch] font-ui font-semibold tracking-[-0.03em] text-[clamp(2.1rem,3vw+0.6rem,3.5rem)] leading-[1.08] text-text">
              {HOW.h2}
            </h2>
            <p className="mt-5 mx-auto max-w-[46ch] text-[17px] leading-[1.65] text-text-muted">
              {HOW.sub}
            </p>
          </div>
        </Reveal>

        {/* The deck. One shared flow container: each sticky card pins at
            the same offset while the next scrolls up and covers it. */}
        <div className="relative mx-auto max-w-[1152px]">
          {STEPS.map((step, i) => (
            <div
              key={step.n}
              className="lg:sticky mb-6 lg:mb-[30vh] last:mb-0 lg:last:mb-0"
              style={{ top: deckTop, zIndex: 10 + i }}
            >
              <article className="relative grid grid-cols-1 lg:grid-cols-[0.98fr_1.02fr] overflow-hidden rounded-[24px] border border-border-subtle bg-surface-1 card-elev-lg lg:h-[calc(85dvh-82px)] lg:min-h-[476px] lg:max-h-[714px]">
                {/* ── Copy side ─────────────────────────── */}
                <div className="flex flex-col p-7 sm:p-9 lg:p-12 xl:p-14 min-h-0">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[14px] tabular-nums tracking-[0.04em] text-text-muted">
                      {step.n} / {TOTAL}
                    </span>
                    <span className="text-[16px] font-semibold tracking-[-0.015em] text-text">
                      {step.step}
                    </span>
                  </div>

                  <div className="flex-1 flex flex-col justify-center py-8 lg:py-4">
                    <p className="font-ui font-semibold tracking-[-0.03em] text-[clamp(1.8rem,2.2vw+0.6rem,2.5rem)] leading-[1.12] text-text max-w-[19ch]">
                      {step.headline}
                    </p>
                    <p className="mt-5 lg:mt-6 max-w-[46ch] text-[16px] lg:text-[16.5px] leading-[1.65] text-text-muted">
                      {step.body}
                    </p>
                  </div>

                  <div>
                    <Link
                      href={cta.href}
                      className="group inline-flex items-center gap-2 h-[52px] px-8 rounded-full bg-accent text-accent-contrast text-[16px] font-semibold hover:bg-accent-hover transition-colors duration-[180ms]"
                    >
                      {cta.label}
                      <ArrowUpRight className="size-4 transition-transform duration-[180ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </Link>
                  </div>
                </div>

                {/* ── Product side. The real UI, edge to edge. ── */}
                <div className="relative min-h-[340px] lg:min-h-0 lg:h-full border-t lg:border-t-0 lg:border-l border-border-subtle">
                  <AppScene scene={step.scene} />
                </div>
              </article>
            </div>
          ))}

          {/* Hold spacer. Extends the sticky container past the last
              card, so every card (including the last, once it lands at
              the pin line) stays pinned while this scrolls by. The final
              card therefore covers the pile COMPLETELY before anything
              releases; then the whole deck rides to the top together. */}
          <div aria-hidden className="hidden lg:block lg:h-[35vh]" />
        </div>
      </div>
    </section>
  );
}
