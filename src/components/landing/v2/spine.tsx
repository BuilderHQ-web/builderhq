"use client";

/**
 * The spine v5 — how it works as a Base44-style stacked deck.
 *
 * Each step is one big warm-light card: copy on the left ("01 / 04 ·
 * step title" label, the reader's worry as a large serif question, a
 * plain answer, a black pill CTA), and on the right a faithful
 * recreation of the actual BuilderHQ product screen for that step,
 * bleeding to the card's edge.
 *
 * The scroll: cards are position-sticky, all pinned at the same top
 * offset, so the next card slides up from below and settles exactly
 * over the previous one — a full cover, no peeking strips. Pure CSS
 * sticky (native scroll, no scroll-jacking); stacking is desktop-only,
 * mobile gets a clean vertical flow with the mock under each step's
 * copy.
 */

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Reveal } from "../reveal";
import { LENS, ROLE_PALETTE } from "./content";
import { useRole } from "./role";
import { RoleSwap } from "./swap";
import { AppScene } from "./app-scenes";

/** Sticky geometry: every card pins at the same offset, so each
 *  incoming card settles exactly over the previous one — full cover. */
const TOP_BASE = 72;
/** Bottom edge of the floating nav pill — the gap above the card is
 *  measured from here, so the deck sits balanced under it. */
const HEADER_OFFSET = 76;

export function Spine({ authedHref }: { authedHref?: string | null }) {
  const { role } = useRole();
  const copy = LENS[role].spine;
  const hero = LENS[role].hero;
  const pal = ROLE_PALETTE[role];
  const cta = authedHref
    ? { label: "Open your dashboard", href: authedHref }
    : hero.primary;

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
            <h2 className="mx-auto max-w-[24ch] font-ui font-semibold tracking-[-0.035em] text-[clamp(2.3rem,3.6vw+0.5rem,4rem)] leading-[1.06]">
              <span className="text-text">Four steps.</span>{" "}
              <span style={{ color: pal.accentSoft }}>Clear from the start.</span>
            </h2>
            <RoleSwap className="inline-block">
              <p className="mt-5 mx-auto max-w-[54ch] text-[15.5px] sm:text-[16.5px] leading-[1.65] text-text-muted">
                {copy.blurb}
              </p>
            </RoleSwap>
          </div>
        </Reveal>

        <RoleSwap>
          {/* The deck. One shared flow container: each sticky card pins at
              its own offset while the next scrolls up and covers it. */}
          <div className="relative mx-auto max-w-[1152px]">
            {copy.steps.map((step, i) => {
              const last = i === copy.steps.length - 1;
              return (
                <div
                  key={step.title}
                  className="lg:sticky mb-6 lg:mb-[30vh] last:mb-0 lg:last:mb-0"
                  style={{ top: deckTop, zIndex: 10 + i }}
                >
                  <article
                    className="relative grid grid-cols-1 lg:grid-cols-[0.98fr_1.02fr] overflow-hidden rounded-[24px] lg:h-[calc(85dvh-82px)] lg:min-h-[476px] lg:max-h-[714px]"
                    style={{
                      background: "#f8f6f2",
                      boxShadow:
                        "0 -14px 34px -26px rgba(0,0,0,0.55), 0 30px 70px -30px rgba(0,0,0,0.6), 0 0 0 1px rgba(15,25,35,0.05)",
                    }}
                  >
                    {/* ── Copy side ─────────────────────────── */}
                    <div className="flex flex-col p-7 sm:p-9 lg:p-12 xl:p-14 min-h-0">
                      {/* Label row — lives inside the peek strip. */}
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[13.5px] tracking-[0.04em] text-[#98a1a9]">
                          {String(i + 1).padStart(2, "0")} / {String(copy.steps.length).padStart(2, "0")}
                        </span>
                        <span className="text-[15.5px] font-semibold text-[#1a222a] tracking-[-0.015em]">
                          {step.title}
                        </span>
                      </div>

                      <div className="flex-1 flex flex-col justify-center py-8 lg:py-4">
                        <p className="font-ui font-semibold tracking-[-0.032em] text-[clamp(1.85rem,2.3vw+0.6rem,2.6rem)] leading-[1.1] text-[#12181f] max-w-[19ch]">
                          {step.headline}
                        </p>
                        <p className="mt-5 lg:mt-6 max-w-[44ch] text-[16px] lg:text-[16.5px] leading-[1.65] text-[#525d67]">
                          {step.body}
                        </p>
                      </div>

                      <div>
                        <Link
                          href={cta.href}
                          className="group inline-flex items-center gap-2 h-[52px] px-8 rounded-full bg-[#12171c] text-[#f4f4f2] text-[14.5px] font-semibold hover:bg-[#232b33] transition-colors duration-[180ms]"
                        >
                          {cta.label}
                          <ArrowUpRight className="size-4 transition-transform duration-[180ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </Link>
                      </div>
                    </div>

                    {/* ── Product side — the real UI, edge to edge ── */}
                    <div className="relative min-h-[340px] lg:min-h-0 lg:h-full border-t lg:border-t-0 lg:border-l border-[rgba(15,25,35,0.07)]">
                      <AppScene role={role} step={i} />
                    </div>
                  </article>

                  {last ? null : null}
                </div>
              );
            })}

            {/* Hold spacer — extends the sticky container past the last
                card, so every card (including the fourth, once it lands
                at the pin line) stays pinned while this scrolls by. The
                final card therefore covers the pile COMPLETELY before
                anything releases; then the whole deck rides to the top
                together. */}
            <div aria-hidden className="hidden lg:block lg:h-[35vh]" />
          </div>
        </RoleSwap>
      </div>
    </section>
  );
}
