/**
 * The project cover band — one visual system for every surface that
 * shows a project as a card or row.
 *
 * The drawn covers are retired for now at the client's direction. The
 * drawings stay in public/project-covers and the fact mapping below is
 * kept intact so they can return without rework. What renders today is
 * the quiet type-set treatment the card family began with: the type's
 * paper tint, the drafting-sheet grid, and the type's mark oversized
 * and fading off the sheet.
 *
 * No hooks and no client directive: server pages and client cards
 * both compose it.
 */

import { cn } from "@/lib/utils";
import type { MarketplacePreview } from "@/modules/projects";

import { PlanMark } from "./plan-marks";

/** The listing facts the cover mapping reads. */
export type CoverFacts = Pick<
  MarketplacePreview,
  "type" | "floors" | "dwellingCount" | "renovationScope" | "extensionType"
>;

/** Per-type paper tint — the faint wash the band sits on. */
export const COVER_TINT: Record<MarketplacePreview["type"], string> = {
  single_dwelling: "from-[rgba(0,212,200,0.22)] to-[rgba(45,99,214,0.12)]",
  multi_dwelling: "from-[rgba(45,99,214,0.19)] to-[rgba(120,180,255,0.13)]",
  renovation: "from-[rgba(201,148,34,0.19)] to-[rgba(194,85,80,0.10)]",
  extension: "from-[rgba(10,125,115,0.19)] to-[rgba(0,212,200,0.14)]",
};

/**
 * The fact-to-drawing mapping. Nothing renders it while the covers are
 * retired; it is kept so the assignment survives their return.
 */
export function coverFor(p: CoverFacts): string {
  const base = "/project-covers";
  switch (p.type) {
    case "single_dwelling":
      if (p.floors != null && p.floors <= 1) return `${base}/single-1.webp`;
      if (p.floors != null && p.floors >= 3) return `${base}/single-3.webp`;
      return `${base}/single-2.webp`;
    case "multi_dwelling": {
      const d = p.dwellingCount ?? 3;
      if (d <= 2) return `${base}/multi-2.webp`;
      if (d === 3) return `${base}/multi-3.webp`;
      return `${base}/multi-4.webp`;
    }
    case "renovation":
      return p.renovationScope === "structural" ||
        p.renovationScope === "full_internal_and_external"
        ? `${base}/reno-structural.webp`
        : `${base}/reno-internal.webp`;
    case "extension":
      if (p.extensionType === "first_floor") return `${base}/ext-first.webp`;
      if (p.extensionType === "ground_and_first") return `${base}/ext-both.webp`;
      return `${base}/ext-ground.webp`;
  }
}

/**
 * The band layer: tinted paper, the drafting grid, the drafted
 * vignette for the project's facts, and an optional legibility scrim
 * for overlaid text. Fills its (relative) parent; the parent owns
 * size, borders and anything drawn on top.
 */
export function CoverArt({
  facts,
  scrim = false,
}: {
  facts: CoverFacts;
  /** Kept for the covers' return; inert while the band is type-set. */
  sizes?: string;
  /** Soft white fade at the foot, for text overlaid on the band. */
  scrim?: boolean;
  /** Kept for the covers' return; inert while the band is type-set. */
  imgClassName?: string;
}) {
  return (
    <>
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 bg-gradient-to-br",
          COVER_TINT[facts.type],
        )}
      />
      {/* the drafting-sheet grid */}
      <span
        aria-hidden
        className="absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(24,34,44,0.045) 0 1px, transparent 1px 22px), repeating-linear-gradient(90deg, rgba(24,34,44,0.045) 0 1px, transparent 1px 22px)",
        }}
      />
      {/* the project, drafted from its own facts */}
      <PlanMark facts={facts} />
      {scrim ? (
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-[72px] bg-gradient-to-t from-white/85 via-white/40 to-transparent"
        />
      ) : null}
    </>
  );
}
