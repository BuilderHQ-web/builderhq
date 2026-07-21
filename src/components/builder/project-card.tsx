"use client";

/**
 * ProjectCard — one project per row, as a card in the register.
 *
 * Round 3 of the browse surface: the hairline table read as a
 * spreadsheet, so each entry is now its own card — breathing room
 * between rows, a type-tinted tile on the left as the visual anchor,
 * and the three facts a builder scans first (type, suburb, budget)
 * promoted to a full-size line under the title. The specification
 * keeps its ledger DNA (numbers over small-caps labels, fixed column
 * widths so values still align down the page) but drops the cell
 * borders. Round state returns to the scarcity dots: taken spots glow,
 * open spots sit faint, one-left turns amber, full locks.
 *
 * Behaviour contract preserved: the whole card links to the project,
 * the bookmark toggles via save/unsave actions (optimistic-on-success),
 * spots honour the round's own capacity (tenderSpots ?? UNLOCK_CAP),
 * and state precedence holds (entered > full > one-left > open).
 * Parents render cards in a `flex flex-col gap-2.5` stack.
 */

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  Home,
  Building,
  Wrench,
  Layers,
  Bookmark,
  BookmarkCheck,
  Files,
  Loader2,
  Lock,
  type LucideIcon,
} from "lucide-react";

import {
  saveProjectAction,
  unsaveProjectAction,
} from "@/app/(app)/_actions/marketplace";
import { cn } from "@/lib/utils";
import type { MarketplacePreview } from "@/modules/projects";
import { unlockPriceFor } from "@/modules/projects/pricing";
// Constants path (NOT the module index) so we don't pull
// `unlocks/service.ts` — which is `server-only` — into the client bundle.
import { UNLOCK_CAP } from "@/modules/unlocks/constants";

/** Per-type tint for the anchor tile — quiet fills from the app
 *  palette so rows key themselves apart without shouting. */
const TYPE_META: Record<
  MarketplacePreview["type"],
  { label: string; Icon: LucideIcon; tile: string }
> = {
  single_dwelling: {
    label: "Single dwelling",
    Icon: Home,
    tile: "border-[rgba(0,212,200,0.28)] bg-[rgba(0,212,200,0.09)] text-[#0a7d73]",
  },
  multi_dwelling: {
    label: "Multi dwelling",
    Icon: Building,
    tile: "border-[rgba(45,99,214,0.22)] bg-[rgba(45,99,214,0.07)] text-[#2d63d6]",
  },
  renovation: {
    label: "Renovation",
    Icon: Wrench,
    tile: "border-[rgba(201,148,34,0.28)] bg-[rgba(201,148,34,0.09)] text-[#8a6414]",
  },
  extension: {
    label: "Extension",
    Icon: Layers,
    tile: "border-[rgba(66,96,111,0.24)] bg-[rgba(66,96,111,0.08)] text-[#42606f]",
  },
};

const BUDGET_LABEL: Record<string, string> = {
  under_500k: "Under $500k",
  "500k_1m": "$500k to $1m",
  "1m_1_5m": "$1m to $1.5m",
  "1_5m_2m": "$1.5m to $2m",
  "2m_3m": "$2m to $3m",
  "3m_5m": "$3m to $5m",
  over_5m: "Over $5m",
};

// Compact tabular ranges — the stat label supplies the "Land m²" unit.
const LAND_LABEL: Record<string, string> = {
  under_200: "<200",
  "200_400": "200-400",
  "400_600": "400-600",
  "600_800": "600-800",
  "800_1000": "800-1000",
  over_1000: ">1000",
};

export function ProjectCard({
  project,
  isSaved,
  isUnlocked,
  fbaActive = false,
}: {
  project: MarketplacePreview;
  isSaved: boolean;
  isUnlocked: boolean;
  fbaActive?: boolean;
}) {
  const meta = TYPE_META[project.type];
  const [saved, setSaved] = useState(isSaved);
  const [pending, startTransition] = useTransition();
  const priceAud = unlockPriceFor(project.type);

  // The round's own capacity — private/hybrid rounds set 2-5 spots;
  // null means the platform default.
  const spots = project.tenderSpots ?? UNLOCK_CAP;
  const taken = Math.min(project.unlockedCount, spots);
  const left = Math.max(0, spots - taken);
  const isFull = left === 0;

  const onToggleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      if (saved) {
        const r = await unsaveProjectAction(project.id);
        if (r.ok) setSaved(false);
      } else {
        const r = await saveProjectAction(project.id);
        if (r.ok) setSaved(true);
      }
    });
  };

  const specs: Array<{ label: string; value: string | null; w: string }> = [
    {
      label: "Beds",
      value: project.bedrooms != null ? String(project.bedrooms) : null,
      w: "w-[48px]",
    },
    {
      label: "Baths",
      value: project.bathrooms != null ? String(project.bathrooms) : null,
      w: "w-[48px]",
    },
    {
      label: project.type === "multi_dwelling" ? "Dwellings" : "Storeys",
      value:
        project.type === "multi_dwelling"
          ? project.dwellingCount != null
            ? String(project.dwellingCount)
            : null
          : project.floors != null
            ? String(project.floors)
            : null,
      w: "w-[76px]",
    },
    {
      label:
        project.type === "renovation" || project.type === "extension"
          ? "Docs"
          : "Land m²",
      value:
        project.type === "renovation" || project.type === "extension"
          ? String(project.documentCount)
          : project.landSizeBand
            ? (LAND_LABEL[project.landSizeBand] ?? null)
            : null,
      w: "w-[78px]",
    },
  ];

  return (
    <Link
      href={`/builder/projects/${project.slug}`}
      className={cn(
        "group relative block rounded-lg border overflow-hidden",
        "border-border-subtle bg-surface-1 card-elev",
        "transition-[border-color,box-shadow,transform] duration-200",
        "hover:border-border-strong hover:card-elev-lg hover:-translate-y-px",
        "active:translate-y-0 active:duration-[90ms]",
      )}
    >
      <div className="flex items-center gap-4 sm:gap-5 pl-4 sm:pl-5 pr-14 lg:pr-5 py-4">
        {/* ── type tile — the row's visual anchor ─────────────────── */}
        <span
          className={cn(
            "hidden sm:flex size-11 rounded-lg border items-center justify-center shrink-0",
            meta.tile,
          )}
        >
          <meta.Icon className="size-5" strokeWidth={1.7} />
        </span>

        {/* ── identity — the facts a builder scans first ──────────── */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-ui font-semibold text-[15.5px] leading-[1.3] text-text line-clamp-2 lg:line-clamp-none lg:truncate">
              {project.title}
            </h3>
            {project.tenderMode === "hybrid" ? (
              <span className="hidden sm:inline-flex text-[9px] tracking-[0.14em] uppercase text-text-dim border border-border-subtle rounded-full px-2 py-0.5 shrink-0">
                Hybrid round
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[13px] leading-[1.5] lg:truncate">
            <span className="inline-flex items-center gap-1.5 font-medium text-text">
              <meta.Icon className="size-3.5 sm:hidden" />
              {meta.label}
            </span>
            <span className="text-text-dim"> · </span>
            <span className="text-text-muted">
              {project.suburb
                ? `${project.suburb}, ${project.state}`
                : "Location on file"}
            </span>
            {project.budgetBand && BUDGET_LABEL[project.budgetBand] ? (
              <>
                <span className="text-text-dim"> · </span>
                <span className="font-semibold text-text">
                  {BUDGET_LABEL[project.budgetBand]}
                </span>
              </>
            ) : null}
          </p>
        </div>

        {/* ── specification — ledger numbers, no cell borders. Fixed
              widths keep values aligned down the page. ─────────────── */}
        <div className="hidden lg:flex items-center gap-2 xl:gap-3 shrink-0">
          {specs.map((s) => (
            <SpecStat key={s.label} {...s} />
          ))}
        </div>

        {/* ── round state — the scarcity dots ─────────────────────── */}
        <div className="hidden lg:flex flex-col items-end gap-1 w-[168px] shrink-0">
          <SpotsDots
            spots={spots}
            taken={taken}
            left={left}
            isFull={isFull}
            entered={isUnlocked}
          />
          <span className="text-[11px] text-text-dim tabular-nums">
            {isUnlocked || isFull ? (
              <span className="inline-flex items-center gap-1">
                <Files className="size-3" />
                {project.documentCount} document
                {project.documentCount === 1 ? "" : "s"}
              </span>
            ) : fbaActive ? (
              "Complimentary entry"
            ) : (
              `$${priceAud} to enter`
            )}
          </span>
        </div>

        {/* ── save ────────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={onToggleSave}
          disabled={pending}
          title={saved ? "Saved" : "Save"}
          className={cn(
            "absolute top-3.5 right-3.5 lg:static size-8 rounded-md border flex items-center justify-center transition-colors shrink-0",
            saved
              ? "border-border-accent bg-[rgba(0,212,200,0.06)] text-accent-light"
              : "border-border-subtle text-text-dim hover:text-text hover:border-border-strong",
          )}
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : saved ? (
            <BookmarkCheck className="size-4" />
          ) : (
            <Bookmark className="size-4" />
          )}
        </button>
      </div>

      {/* ── below lg: spec strip + round state fold under ─────────── */}
      <div className="lg:hidden border-t border-border-subtle/60 px-4 sm:px-5 py-2.5 flex items-center justify-between gap-x-4 gap-y-2 flex-wrap">
        <div className="flex items-center gap-4 sm:gap-5">
          {specs.map((s) => (
            <SpecStat key={s.label} {...s} compact />
          ))}
        </div>
        <div className="flex items-center gap-2.5">
          <SpotsDots
            spots={spots}
            taken={taken}
            left={left}
            isFull={isFull}
            entered={isUnlocked}
          />
          <span className="text-[10.5px] text-text-dim tabular-nums">
            {isUnlocked || isFull
              ? `${project.documentCount} doc${project.documentCount === 1 ? "" : "s"}`
              : fbaActive
                ? "Complimentary"
                : `$${priceAud} to enter`}
          </span>
        </div>
      </div>
    </Link>
  );
}

/** One ledger figure — number over a small-caps label, no cell chrome. */
function SpecStat({
  label,
  value,
  w,
  compact = false,
}: {
  label: string;
  value: string | null;
  w: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("text-center min-w-0", !compact && w)}>
      <p
        className={cn(
          "font-display leading-none tabular-nums truncate",
          value && value.length > 4
            ? compact
              ? "text-[11.5px] pt-[2px]"
              : "text-[12.5px] pt-[3px]"
            : compact
              ? "text-[14px]"
              : "text-[16.5px]",
          value ? "text-text" : "text-text-dim/50",
        )}
      >
        {value ?? "—"}
      </p>
      <p className="mt-0.5 text-[8.5px] tracking-[0.14em] uppercase text-text-dim truncate">
        {label}
      </p>
    </div>
  );
}

/**
 * SpotsDots — the round's state as scarcity dots (one per spot on THIS
 * round): taken spots glow teal, open spots sit faint, one-left turns
 * the glow amber, and a full round locks. The dots are the primary
 * read; the copy reinforces.
 */
function SpotsDots({
  spots,
  taken,
  left,
  isFull,
  entered,
}: {
  spots: number;
  taken: number;
  left: number;
  isFull: boolean;
  entered: boolean;
}) {
  if (isFull && !entered) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] font-ui font-semibold text-[#a8433e]">
        <Lock className="size-3" />
        Round full
      </span>
    );
  }

  const isUrgent = !entered && left === 1;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-flex items-center gap-[3px]" aria-hidden>
        {Array.from({ length: spots }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "size-1.5 rounded-full transition-colors",
              i < taken
                ? isUrgent
                  ? "bg-[#c99422] shadow-[0_0_6px_rgba(201,148,34,0.55)]"
                  : "bg-accent shadow-[0_0_6px_rgba(0,212,200,0.45)]"
                : "bg-text-faint/35",
            )}
          />
        ))}
      </span>
      <span
        className={cn(
          "text-[12px] font-ui tabular-nums",
          entered
            ? "text-[#0a7d73] font-semibold"
            : isUrgent
              ? "text-[#8a6414] font-semibold"
              : "text-text-muted",
        )}
      >
        {entered
          ? "You hold a spot"
          : isUrgent
            ? "1 spot left"
            : `${left} of ${spots} spot${spots === 1 ? "" : "s"} open`}
      </span>
    </span>
  );
}
