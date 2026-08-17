/**
 * The industry bodies we sit under, in one place.
 *
 * Three surfaces show these marks at three sizes: a quiet strip under
 * the hero CTAs, a lockup at the foot of the brand column, and the
 * full tier above the partner register. Keeping the list here means a
 * third body is one entry rather than three edits.
 *
 * The marks are portrait badges or landscape lockups, and the two
 * cannot share a height without the landscape one dominating the row.
 * `wide` carries that difference, so each surface sizes them by shape
 * rather than by name.
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
  /** A landscape lockup, which needs less height than a badge. */
  wide?: boolean;
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
    width: 520,
    height: 262,
    wide: true,
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
            className={cn(
              "w-auto shrink-0",
              a.wide ? "h-[24px] sm:h-[28px]" : "h-[30px] sm:h-[34px]",
            )}
          />
        ))}
      </span>
    </div>
  );
}
