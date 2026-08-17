/**
 * The industry bodies we sit under, in one place.
 *
 * Three surfaces show these marks at three sizes: a quiet strip under
 * the hero CTAs, a lockup at the foot of the brand column, and the
 * full tier above the partner register. Keeping the list here means a
 * third body is one entry rather than three edits.
 *
 * Every mark runs to the same height on a given surface, whatever its
 * shape, so a surface sets one height and the widths fall out of it.
 */
import Image from "next/image";

import { cn } from "@/lib/utils";

export interface Association {
  name: string;
  /** What the body is, in the reader's terms. Marquee only. */
  blurb: string;
  src: string;
  width: number;
  height: number;
}

export const ASSOCIATIONS: Association[] = [
  {
    name: "Housing Industry Association",
    blurb: "Australia’s peak body for residential building",
    src: "/Homepage_logos/hia-badge.png",
    width: 414,
    height: 468,
  },
  {
    name: "Master Builders Australia",
    blurb: "The national voice of the building and construction industry",
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
            className="h-[26px] sm:h-[30px] w-auto shrink-0"
          />
        ))}
      </span>
    </div>
  );
}
