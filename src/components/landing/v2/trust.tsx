"use client";

/**
 * The standards. The rules the platform runs on, as a short manifesto.
 *
 * A statement that stays put while the reader walks the list: the claim
 * sticks in the left column, six numbered rules scroll past on the right,
 * separated by hairlines and counted in mono numerals. One voice, one
 * hue; the rules come from STANDARDS in content.ts and this file holds
 * no words of its own.
 *
 * Exported as `Trust` because the composition and the `#trust` anchor
 * (nav, footer, section analytics) already point at that name.
 */

import { Reveal } from "../reveal";
import { STANDARDS } from "./content";

/** The heading is one string in content.ts and is set in two tones here:
 *  the claim in ink, the second sentence in deep teal. Split at the first
 *  sentence break so the words live in the content file and only the
 *  emphasis lives in this one. */
const CUT = STANDARDS.h2.indexOf(". ");
const CLAIM = CUT < 0 ? STANDARDS.h2 : STANDARDS.h2.slice(0, CUT + 1);
const PRODUCT = CUT < 0 ? "" : STANDARDS.h2.slice(CUT + 2);

export function Trust() {
  return (
    <section id="trust" className="relative px-5 md:px-10 py-20 lg:py-24 scroll-mt-16">
      <div className="mx-auto w-full max-w-[1000px]">
        <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-10 lg:gap-16">
          {/* The statement */}
          <Reveal>
            <div className="lg:sticky lg:top-28 self-start text-center lg:text-left">
              <h2 className="font-ui font-semibold tracking-[-0.03em] text-[clamp(2.1rem,3vw+0.6rem,3.5rem)] leading-[1.08]">
                <span className="text-text">{CLAIM}</span>
                {PRODUCT ? <span className="text-accent-light"> {PRODUCT}</span> : null}
              </h2>
              <p className="mt-5 mx-auto lg:mx-0 max-w-[38ch] text-[17px] leading-[1.65] text-text-muted">
                {STANDARDS.lede}
              </p>
            </div>
          </Reveal>

          {/* The rules */}
          <div role="list">
            {STANDARDS.rules.map((rule, i) => (
              <Reveal
                key={rule.title}
                role="listitem"
                className={[
                  "grid grid-cols-[2rem_1fr] sm:grid-cols-[2.75rem_1fr] gap-x-3 sm:gap-x-5 py-7 lg:py-8",
                  i === 0 ? "" : "border-t border-border-subtle",
                ].join(" ")}
              >
                <span className="font-mono text-[14px] tabular-nums leading-[1.45] pt-[5px] text-accent-light">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <h3 className="font-ui font-semibold tracking-[-0.02em] text-[19px] lg:text-[21px] leading-[1.3] text-text">
                    {rule.title}
                  </h3>
                  <p className="mt-2.5 max-w-[56ch] text-[16px] leading-[1.65] text-text-muted">
                    {rule.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal delay={0.1}>
          <p className="mt-12 lg:mt-16 mx-auto max-w-[58ch] text-center text-[16px] leading-[1.65] text-text-muted">
            {STANDARDS.footer}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
