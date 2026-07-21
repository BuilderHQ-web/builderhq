"use client";

/**
 * ProjectCard — a registry docket, not a shop card.
 *
 * One open tender round as a builder reads it: what the project is,
 * where it is, the specification in a hairline ledger, and the honest
 * state of the round (spots remaining out of THIS round's capacity,
 * the fee to enter). No gradients, no glow, no scarcity theatrics —
 * the register presents facts and lets the work sell itself.
 *
 * Behaviour contract preserved from the previous card: the whole card
 * links to the project, the bookmark toggles via save/unsave actions
 * (optimistic-on-success), and the state badges keep their precedence
 * (round full > entered > complimentary > fee).
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
  Loader2,
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

const TYPE_META: Record<
  MarketplacePreview["type"],
  { label: string; Icon: LucideIcon }
> = {
  single_dwelling: { label: "Single dwelling", Icon: Home },
  multi_dwelling: { label: "Multi dwelling", Icon: Building },
  renovation: { label: "Renovation", Icon: Wrench },
  extension: { label: "Extension", Icon: Layers },
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

// Compact tabular ranges — the cell header supplies the "Land m²" unit.
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

  return (
    <Link
      href={`/builder/projects/${project.slug}`}
      className={cn(
        "group relative flex h-full flex-col rounded-lg border overflow-hidden",
        "border-border-subtle bg-surface-1 card-elev",
        "transition-[border-color,box-shadow] duration-200",
        "hover:border-border-strong hover:card-elev-lg",
      )}
    >
      {/* ── header: type + save ────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 px-4 pt-3.5">
        <span className="inline-flex items-center gap-1.5 text-[9.5px] tracking-[0.16em] uppercase text-accent-light font-ui font-semibold min-w-0">
          <meta.Icon className="size-3 shrink-0" />
          <span className="truncate">{meta.label}</span>
          {project.tenderMode === "hybrid" ? (
            <span className="text-text-dim shrink-0">· Hybrid round</span>
          ) : null}
        </span>
        <button
          type="button"
          onClick={onToggleSave}
          disabled={pending}
          title={saved ? "Saved" : "Save"}
          className={cn(
            "size-7 rounded-md border flex items-center justify-center transition-colors shrink-0",
            saved
              ? "border-border-accent bg-[rgba(0,212,200,0.06)] text-accent-light"
              : "border-border-subtle text-text-dim hover:text-text hover:border-border-strong",
          )}
        >
          {pending ? (
            <Loader2 className="size-3 animate-spin" />
          ) : saved ? (
            <BookmarkCheck className="size-3.5" />
          ) : (
            <Bookmark className="size-3.5" />
          )}
        </button>
      </div>

      {/* ── identity ───────────────────────────────────────────── */}
      <div className="px-4 pt-2 pb-3.5">
        <h3 className="font-ui font-semibold text-[14.5px] leading-[1.35] text-text line-clamp-2">
          {project.title}
        </h3>
        <p className="mt-1 text-[11.5px] text-text-dim truncate">
          {project.suburb
            ? `${project.suburb}, ${project.state}`
            : "Location on file"}
          {project.budgetBand && BUDGET_LABEL[project.budgetBand]
            ? ` · ${BUDGET_LABEL[project.budgetBand]}`
            : ""}
        </p>
      </div>

      {/* ── the specification ledger ───────────────────────────── */}
      <div className="grid grid-cols-4 gap-px bg-border-subtle border-y border-border-subtle">
        <LedgerCell
          label="Beds"
          value={project.bedrooms != null ? String(project.bedrooms) : null}
        />
        <LedgerCell
          label="Baths"
          value={project.bathrooms != null ? String(project.bathrooms) : null}
        />
        <LedgerCell
          label={project.type === "multi_dwelling" ? "Dwellings" : "Storeys"}
          value={
            project.type === "multi_dwelling"
              ? project.dwellingCount != null
                ? String(project.dwellingCount)
                : null
              : project.floors != null
                ? String(project.floors)
                : null
          }
        />
        <LedgerCell
          label={
            project.type === "renovation" || project.type === "extension"
              ? "Docs"
              : "Land m²"
          }
          value={
            project.type === "renovation" || project.type === "extension"
              ? String(project.documentCount)
              : project.landSizeBand
                ? (LAND_LABEL[project.landSizeBand] ?? null)
                : null
          }
        />
      </div>

      {/* ── the round's state ──────────────────────────────────── */}
      <div className="mt-auto flex items-center justify-between gap-3 px-4 py-3">
        <span
          className={cn(
            "text-[11.5px] font-ui tabular-nums",
            isUnlocked
              ? "text-[#0a7d73] font-semibold"
              : isFull
                ? "text-text-dim"
                : left === 1
                  ? "text-[#8a6414] font-semibold"
                  : "text-text-muted",
          )}
        >
          {isUnlocked
            ? "You hold a spot"
            : isFull
              ? "Round full"
              : `${left} of ${spots} spot${spots === 1 ? "" : "s"} open`}
        </span>
        <span className="text-[11px] text-text-dim tabular-nums shrink-0">
          {isUnlocked || isFull
            ? `${project.documentCount} document${project.documentCount === 1 ? "" : "s"}`
            : fbaActive
              ? "Complimentary entry"
              : `$${priceAud} to enter`}
        </span>
      </div>
    </Link>
  );
}

function LedgerCell({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="bg-surface-1 px-2 py-2.5 text-center min-w-0">
      <p
        className={cn(
          "font-display leading-none tabular-nums truncate",
          // Range strings ("800-1000") step down so they fit the cell.
          value && value.length > 4 ? "text-[12.5px] pt-[3px]" : "text-[16px]",
          value ? "text-text" : "text-text-dim/50",
        )}
      >
        {value ?? "—"}
      </p>
      <p className="mt-1 text-[8.5px] tracking-[0.14em] uppercase text-text-dim truncate">
        {label}
      </p>
    </div>
  );
}
