/**
 * The drawn project cover — one visual system for every surface that
 * shows a project as a card or row.
 *
 * Eleven hand-curated monochrome architectural drawings live in
 * public/project-covers. The cover for a listing is picked from its
 * own facts, so the mapping IS the assignment: every project past and
 * future is covered the moment its facts exist, with no upload step.
 * The ink sits on the type's paper tint through a multiply blend, so
 * the one monochrome set carries every type's colour.
 *
 * No hooks and no client directive: server pages and client cards
 * both compose it.
 */

import Image from "next/image";

import { cn } from "@/lib/utils";
import type { MarketplacePreview } from "@/modules/projects";

/** The listing facts the cover mapping reads. */
export type CoverFacts = Pick<
  MarketplacePreview,
  "type" | "floors" | "dwellingCount" | "renovationScope" | "extensionType"
>;

/** Per-type paper tint — the faint wash the monochrome ink sits on. */
export const COVER_TINT: Record<MarketplacePreview["type"], string> = {
  single_dwelling: "from-[rgba(0,212,200,0.22)] to-[rgba(45,99,214,0.12)]",
  multi_dwelling: "from-[rgba(45,99,214,0.19)] to-[rgba(120,180,255,0.13)]",
  renovation: "from-[rgba(201,148,34,0.19)] to-[rgba(194,85,80,0.10)]",
  extension: "from-[rgba(10,125,115,0.19)] to-[rgba(0,212,200,0.14)]",
};

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
 * The art layer: tinted paper, the drawing multiplied onto it, and an
 * optional legibility scrim for overlaid text. Fills its (relative)
 * parent; the parent owns size, borders and anything drawn on top.
 */
export function CoverArt({
  facts,
  sizes,
  scrim = false,
  imgClassName,
}: {
  facts: CoverFacts;
  /** next/image responsive hint, e.g. "(min-width: 1024px) 248px, 100vw". */
  sizes: string;
  /** Soft white fade at the foot, for text overlaid on the art. */
  scrim?: boolean;
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
      <Image
        src={coverFor(facts)}
        alt=""
        fill
        sizes={sizes}
        className={cn("object-cover mix-blend-multiply", imgClassName)}
        style={{ objectPosition: "center 42%" }}
      />
      {scrim ? (
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-[72px] bg-gradient-to-t from-white/85 via-white/40 to-transparent"
        />
      ) : null}
    </>
  );
}
