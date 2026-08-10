"use client";

/**
 * SectionHead — the standard opening of a full-width chapter.
 *
 * Three levels, in one place so every chapter opens on the same rhythm:
 *
 *   h2      the plain topic, the way an industry body would state it
 *   lead    the sharp line the topic used to be, demoted but still the
 *           sentence that lands
 *   blurb   the supporting paragraph
 *
 * The two heading lines are BLOCK spans rather than inline ones. Left
 * inline, the browser wrapped them wherever the measure ran out, which
 * is how "Three builders price three different jobs." came to sit as
 * three words and then "jobs." alone on the second line. Blocks make
 * the break an editorial decision, taken in content.ts, where each
 * line is written to fit its column at the largest clamp step.
 */

import { ROLE_PALETTE, type SectionHeadCopy } from "./content";
import { useRole } from "./role";

export function SectionHead({ head }: { head: SectionHeadCopy }) {
  const { role } = useRole();
  const pal = ROLE_PALETTE[role];

  return (
    <div className="text-center">
      <h2 className="mx-auto max-w-[26ch] font-ui font-semibold tracking-[-0.035em] text-[clamp(2.15rem,3.4vw+0.5rem,3.8rem)] leading-[1.06]">
        <span className="block text-text">{head.h2a}</span>
        <span className="block" style={{ color: pal.accentSoft }}>
          {head.h2b}
        </span>
      </h2>

      <p className="mt-6 lg:mt-7 mx-auto max-w-[42ch] text-balance font-ui font-semibold tracking-[-0.015em] text-[18px] sm:text-[20px] lg:text-[21px] leading-[1.35] text-text">
        {head.lead}
      </p>

      <p className="mt-3.5 mx-auto max-w-[58ch] text-pretty text-[15px] sm:text-[16px] leading-[1.65] text-text-muted">
        {head.blurb}
      </p>
    </div>
  );
}
