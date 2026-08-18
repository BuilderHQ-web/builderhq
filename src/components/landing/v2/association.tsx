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
}

export const ASSOCIATIONS: Association[] = [
  {
    name: "Housing Industry Association",
    src: "/Homepage_logos/hia-badge.png",
    width: 414,
    height: 468,
  },
  {
    name: "Master Builders Australia",
    src: "/Homepage_logos/mba-badge.png",
    width: 600,
    height: 157,
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
            className="h-[26px] sm:h-[36px] w-auto shrink-0"
          />
        ))}
      </span>
    </div>
  );
}
