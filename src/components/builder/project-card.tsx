"use client";

/**
 * ProjectCard — the docket: the live marketplace card's zoning, laid
 * horizontally, one per row.
 *
 * The hybrid the register asked for. The old card's strengths stay —
 * a type-tinted band with the blueprint grid and the PROJECT BUDGET
 * figure at display scale, bordered spec chips, the scarcity-dot
 * footer — but the band rotates into a LEFT PANEL so each project
 * reads as one wide docket in a vertical stack:
 *
 *   ┌ band ─────────┬ body ──────────────────────┬ state ─────────┐
 *   │ EXTENSION     │ Title                      │  ●●○ 2 of 3    │
 *   │               │ ⌖ Flynn, ACT               │  $199 to enter │
 *   │ PROJECT BUDGET│ [3 Bed][3 Bath][1 Storey]  │  View ↗        │
 *   │ $500k to $1m  │                            │                │
 *   └───────────────┴────────────────────────────┴────────────────┘
 *
 * Below lg the band folds back on top and the state row becomes the
 * footer — the exact shape of the live card, so mobile keeps the
 * layout owners already know.
 *
 * Behaviour contract preserved: whole card links to the project, the
 * bookmark toggles via save/unsave actions (optimistic-on-success),
 * spots honour the round's own capacity (tenderSpots ?? UNLOCK_CAP),
 * and state precedence holds (entered > full > one-left > open).
 * Parents render dockets in a `flex flex-col gap-3` stack.
 */

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  ArrowUpRight,
  Bath,
  Bed,
  Bookmark,
  BookmarkCheck,
  Building,
  Files,
  Home,
  Layers,
  Loader2,
  Lock,
  MapPin,
  Ruler,
  Wrench,
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

/** Per-type band art — soft light-theme gradients with the type's
 *  accent, carrying the blueprint grid and a large faded icon. */
const TYPE_META: Record<
  MarketplacePreview["type"],
  { label: string; Icon: LucideIcon; band: string }
> = {
  single_dwelling: {
    label: "Single dwelling",
    Icon: Home,
    band: "from-[rgba(0,212,200,0.16)] to-[rgba(45,99,214,0.08)]",
  },
  multi_dwelling: {
    label: "Multi dwelling",
    Icon: Building,
    band: "from-[rgba(45,99,214,0.13)] to-[rgba(120,180,255,0.09)]",
  },
  renovation: {
    label: "Renovation",
    Icon: Wrench,
    band: "from-[rgba(201,148,34,0.14)] to-[rgba(194,85,80,0.07)]",
  },
  extension: {
    label: "Extension",
    Icon: Layers,
    band: "from-[rgba(10,125,115,0.14)] to-[rgba(0,212,200,0.10)]",
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

// Compact tabular ranges — the chip label supplies the "Land m²" unit.
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

  // Spec chips — only the facts this project actually has.
  const chips: Array<{ Icon: LucideIcon; value: string; label: string }> = [];
  if (project.bedrooms != null)
    chips.push({ Icon: Bed, value: String(project.bedrooms), label: project.bedrooms === 1 ? "Bed" : "Beds" });
  if (project.bathrooms != null)
    chips.push({ Icon: Bath, value: String(project.bathrooms), label: project.bathrooms === 1 ? "Bath" : "Baths" });
  if (project.type === "multi_dwelling" && project.dwellingCount != null)
    chips.push({ Icon: Building, value: String(project.dwellingCount), label: "Dwellings" });
  else if (project.type !== "multi_dwelling" && project.floors != null)
    chips.push({ Icon: Layers, value: String(project.floors), label: project.floors === 1 ? "Storey" : "Storeys" });
  if (project.landSizeBand && LAND_LABEL[project.landSizeBand])
    chips.push({ Icon: Ruler, value: LAND_LABEL[project.landSizeBand]!, label: "Land m²" });

  return (
    <Link
      href={`/builder/projects/${project.slug}`}
      className={cn(
        "group relative flex flex-col lg:flex-row rounded-xl border overflow-hidden",
        "border-border-subtle bg-surface-1 card-elev",
        "transition-[border-color,box-shadow,transform] duration-200",
        "hover:border-border-strong hover:card-elev-lg hover:-translate-y-px",
        "active:translate-y-0 active:duration-[90ms]",
      )}
    >
      {/* ── the band — type + budget on the blueprint art ─────────── */}
      <div
        className={cn(
          "relative shrink-0 overflow-hidden bg-gradient-to-br",
          "border-b lg:border-b-0 lg:border-r border-border-subtle/60",
          "flex flex-row lg:flex-col items-center lg:items-start justify-between",
          // pr clears the floating save button while the band is the
          // top strip (below lg); on lg the button sits over the rail.
          "gap-3 pl-4 pr-12 lg:pr-4 py-3 lg:py-4 lg:w-[232px] lg:min-h-[136px]",
          meta.band,
        )}
      >
        {/* blueprint grid */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "linear-gradient(rgba(24,34,44,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(24,34,44,0.055) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
            maskImage:
              "radial-gradient(ellipse 85% 80% at 50% 50%, black, transparent 82%)",
          }}
        />
        {/* large faded type icon */}
        <meta.Icon
          aria-hidden
          className="absolute -right-3 -bottom-5 size-[96px] text-[rgba(24,34,44,0.08)] transition-transform duration-[400ms] group-hover:-translate-y-0.5 group-hover:scale-[1.03]"
          strokeWidth={1}
        />

        {/* type chip (+ hybrid note) */}
        <span className="relative inline-flex items-center gap-1.5 min-w-0">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm border border-border-subtle bg-white/70 backdrop-blur-[2px] text-[9.5px] tracking-[0.16em] uppercase text-text font-ui font-semibold whitespace-nowrap">
            <meta.Icon className="size-3 text-accent-light" />
            {meta.label}
          </span>
          {project.tenderMode === "hybrid" ? (
            <span className="hidden sm:inline-flex px-2 py-1 rounded-sm border border-border-subtle bg-white/55 text-[9px] tracking-[0.14em] uppercase text-text-muted">
              Hybrid
            </span>
          ) : null}
        </span>

        {/* the figure owners lead with */}
        <div className="relative text-right lg:text-left shrink-0">
          <p className="text-[8.5px] tracking-[0.18em] uppercase text-text-muted font-ui font-semibold">
            Project budget
          </p>
          <p
            className={cn(
              "mt-0.5 font-display leading-none tracking-[-0.01em] tabular-nums",
              project.budgetBand ? "text-[21px] text-text" : "text-[15px] text-text-dim",
            )}
          >
            {project.budgetBand
              ? (BUDGET_LABEL[project.budgetBand] ?? "—")
              : "Not stated"}
          </p>
        </div>
      </div>

      {/* ── body — title, locality, the specification ─────────────── */}
      <div className="min-w-0 flex-1 px-4 sm:px-5 py-4 pr-12 lg:pr-5 flex flex-col justify-center gap-2.5">
        <div className="min-w-0">
          <h3 className="font-ui font-semibold text-[15.5px] leading-[1.3] text-text line-clamp-2 lg:line-clamp-1">
            {project.title}
          </h3>
          <p className="mt-1 inline-flex items-center gap-1.5 text-[12.5px] text-text-muted min-w-0 max-w-full">
            <MapPin className="size-3.5 text-text-dim shrink-0" />
            <span className="truncate">
              {project.suburb
                ? `${project.suburb}, ${project.state}`
                : "Location shared on unlock"}
            </span>
          </p>
        </div>

        {chips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {chips.map((c) => (
              <span
                key={c.label}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border-subtle bg-[rgba(24,34,44,0.02)]"
              >
                <c.Icon className="size-3.5 text-text-dim" strokeWidth={1.8} />
                <span className="font-display text-[14.5px] leading-none text-text tabular-nums pt-px">
                  {c.value}
                </span>
                <span className="text-[8.5px] tracking-[0.14em] uppercase text-text-dim pt-[3px]">
                  {c.label}
                </span>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* ── round state — dots, the fee, the way in ───────────────── */}
      <div className="shrink-0 lg:w-[195px] border-t lg:border-t-0 lg:border-l border-border-subtle/60 px-4 sm:px-5 py-3 lg:py-4 lg:pt-8 flex lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-x-4 gap-y-1.5">
        <SpotsDots
          spots={spots}
          taken={taken}
          left={left}
          isFull={isFull}
          entered={isUnlocked}
        />
        <span className="inline-flex items-center gap-1 text-[11px] text-text-dim tabular-nums">
          {isUnlocked || isFull ? (
            <>
              <Files className="size-3" />
              {project.documentCount} document
              {project.documentCount === 1 ? "" : "s"}
            </>
          ) : fbaActive ? (
            "Complimentary entry"
          ) : (
            `$${priceAud} to enter`
          )}
        </span>
        <span className="hidden lg:inline-flex items-center gap-1 text-[11.5px] text-accent-light opacity-60 group-hover:opacity-100 transition-opacity mt-1">
          View
          <ArrowUpRight className="size-3 transition-transform duration-200 group-hover:translate-x-px group-hover:-translate-y-px" />
        </span>
      </div>

      {/* ── save — floats over the card's corner ──────────────────── */}
      <button
        type="button"
        onClick={onToggleSave}
        disabled={pending}
        title={saved ? "Saved" : "Save"}
        className={cn(
          "absolute top-3 right-3 size-8 rounded-md border flex items-center justify-center transition-colors z-10",
          saved
            ? "border-border-accent bg-[rgba(0,212,200,0.08)] text-accent-light"
            : "border-border-subtle bg-white/80 backdrop-blur-[2px] text-text-dim hover:text-text hover:border-border-strong",
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
    </Link>
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
