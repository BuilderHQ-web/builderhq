/**
 * The industry bodies we sit under, in one place.
 *
 * Two surfaces show these marks: a quiet strip under the hero CTAs,
 * where recognition matters most, and a lockup at the foot of the
 * brand column, where the names are spelled out. Small on purpose:
 * an endorsement stated once reads as a fact, and a large one reads
 * as an advertisement. Keeping the list here means a third body is
 * one entry rather than two edits.
 *
 * Every mark runs to the same height on a given surface, whatever its
 * shape, so a surface sets one height and the widths fall out of it.
 */
import Image from "next/image";

import { cn } from "@/lib/utils";

export interface Association {
  name: string;
  src: string;
  width: number;
  height: number;
  /**
   * Optical scale against the surface's base height, for a mark whose
   * shape breaks the equal-height rule.
   *
   * Equal heights only balance marks of similar density. A stacked
   * lockup spends the same height on three lines of type that a
   * single-line mark spends on one, so matching it to the badge left
   * its wordmark at a 5.9px cap where the previous mark read at 10.1px.
   * Scaling it back to a legible cap is what "same weight" meant.
   */
  scale?: number;
}

export const ASSOCIATIONS: Association[] = [
  {
    name: "Housing Industry Association",
    src: "/Homepage_logos/hia-badge.png",
    width: 414,
    height: 468,
    // The badge is a solid shape filling its whole box; the lockup
    // beside it reaches its height on a thin spire with air around it.
    // Set to the same number they would look heavier, so this stops
    // just short and lets the two read level.
    scale: 1.1,
  },
  {
    name: "Master Builders Victoria",
    src: "/Homepage_logos/mbv-badge.png",
    width: 795,
    height: 400,
    // Three stacked lines of type inside the mark, so its cap height is
    // only 16.5% of its own. Matched to the badge it read at 5.9px,
    // against the 10.1px the previous single-line mark managed. 1.25
    // brings it to 7.4px, which is legible without the lockup standing
    // taller than the badge beside it.
    scale: 1.25,
  },
];

/**
 * The hero line: the label, a hairline, then the marks. It replaces a
 * list of our own claims with two that someone else vouches for, so
 * it stays small and lets the marks carry it.
 */
export function AssociationStrip({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center lg:justify-start gap-x-3.5 gap-y-2 sm:gap-x-4",
        "[--mark-h:26px] sm:[--mark-h:36px]",
        className,
      )}
    >
      <span className="text-[9.5px] sm:text-[10.5px] tracking-[0.16em] sm:tracking-[0.18em] uppercase font-semibold text-text-dim">
        In association with
      </span>
      <span aria-hidden className="hidden sm:block h-6 w-px bg-border-subtle" />
      <span className="flex items-center gap-4 sm:gap-5">
        {ASSOCIATIONS.map((a) => (
          <Image
            key={a.name}
            src={a.src}
            alt={a.name}
            width={a.width}
            height={a.height}
            // The hero's marks answer "are these people real?" in the
            // first seconds, so they are never allowed to arrive late.
            priority
            style={{ height: `calc(var(--mark-h) * ${a.scale ?? 1})` }}
            className="w-auto shrink-0"
          />
        ))}
      </span>
    </div>
  );
}
