"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  Home,
  Building,
  Wrench,
  Layers,
  MapPin,
  Files,
  Bookmark,
  BookmarkCheck,
  Lock,
  Unlock,
  ArrowUpRight,
  Loader2,
  Bed,
  Bath,
  type LucideIcon,
} from "lucide-react";

import {
  saveProjectAction,
  unsaveProjectAction,
} from "@/app/(app)/_actions/marketplace";
import { cn } from "@/lib/utils";
import type { MarketplacePreview } from "@/modules/projects";
import { unlockPriceFor } from "@/modules/projects/pricing";
import { Sparkles } from "lucide-react";

const TYPE_META: Record<
  MarketplacePreview["type"],
  { label: string; Icon: LucideIcon; tone: string }
> = {
  single_dwelling: {
    label: "Single dwelling",
    Icon: Home,
    tone: "from-[rgba(0,212,200,0.18)] to-[rgba(26,95,212,0.18)]",
  },
  multi_dwelling: {
    label: "Multi-dwelling",
    Icon: Building,
    tone: "from-[rgba(120,180,255,0.20)] to-[rgba(26,95,212,0.20)]",
  },
  renovation: {
    label: "Renovation",
    Icon: Wrench,
    tone: "from-[rgba(251,184,64,0.16)] to-[rgba(255,120,150,0.16)]",
  },
  extension: {
    label: "Extension",
    Icon: Layers,
    tone: "from-[rgba(126,245,237,0.20)] to-[rgba(0,212,200,0.18)]",
  },
};

const BUDGET_LABEL: Record<NonNullable<MarketplacePreview["budgetBand"]>, string> = {
  under_500k: "Under $500k",
  "500k_1m": "$500k–$1M",
  "1m_1_5m": "$1M–$1.5M",
  "1_5m_2m": "$1.5M–$2M",
  "2m_3m": "$2M–$3M",
  "3m_5m": "$3M–$5M",
  over_5m: "Over $5M",
};

/**
 * Project card used across the builder browse grid, dashboard suggested
 * row, and saved list. The cover band carries a giant faded type-icon
 * + blueprint-grid art so it reads as a "preview" instead of empty
 * space. The body leads with the budget (most-glanced number), then
 * an icon-based spec strip, address, and a footer with doc count + CTA.
 *
 * `fbaActive` swaps the "Locked" pill for a glowing "Free with FBA"
 * badge — only when the builder both has an active grant AND has
 * credits left this cycle (otherwise the pill stays "Locked" and the
 * detail page handles the paywall messaging).
 */
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
        "group relative flex flex-col rounded-md border overflow-hidden",
        "transition-[transform,border-color,box-shadow,background-color] duration-[260ms] ease-[cubic-bezier(0.2,0.65,0.3,0.9)]",
        "border-border-subtle bg-[linear-gradient(180deg,rgba(10,28,44,0.55),rgba(6,18,30,0.78))]",
        "shadow-[0_10px_28px_-18px_rgba(0,0,0,0.55)]",
        // Hover: lift + accent border + soft accent glow that hints
        // toward the card's edge without taking over the content.
        "hover:border-border-accent/60 hover:-translate-y-1",
        "hover:shadow-[0_18px_44px_-18px_rgba(0,212,200,0.30),0_8px_22px_-12px_rgba(0,0,0,0.7)]",
        // Tactile press — subtle compression so click registers.
        "active:translate-y-0 active:scale-[0.995] active:duration-[120ms]",
      )}
    >
      {/* Cover band — gradient + giant faded type-icon + blueprint grid */}
      <div
        className={cn(
          "relative h-[140px] overflow-hidden bg-gradient-to-br",
          meta.tone,
        )}
      >
        {/* blueprint grid */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "linear-gradient(rgba(142,252,244,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(142,252,244,0.08) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            maskImage:
              "radial-gradient(ellipse 80% 70% at 50% 50%, black, transparent 80%)",
          }}
        />
        {/* big faded type-icon — fills the band as visual signal */}
        <meta.Icon
          aria-hidden
          className="absolute -right-4 -bottom-6 size-[150px] text-text-dim/20 opacity-40 transition-transform duration-[400ms] group-hover:-translate-y-1 group-hover:scale-[1.04]"
          strokeWidth={0.9}
        />
        {/* gloss sheen on hover */}
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(126,245,237,0.45), transparent)",
          }}
        />

        {/* type pill */}
        <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-sm border border-border-accent/40 bg-bg-deep/60 backdrop-blur-sm text-[9.5px] tracking-[0.16em] uppercase text-accent-light">
          <meta.Icon className="size-3" />
          {meta.label}
        </span>

        {/* unlock + save badges */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {isUnlocked ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-border-accent bg-accent-muted/60 text-[9px] tracking-[0.16em] uppercase text-accent-light">
              <Unlock className="size-2.5" />
              Unlocked
            </span>
          ) : fbaActive ? (
            <span
              className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-border-accent bg-[linear-gradient(135deg,rgba(0,212,200,0.20),rgba(26,95,212,0.18))] text-[9px] tracking-[0.16em] uppercase text-accent-light font-semibold"
              style={{ boxShadow: "0 0 10px rgba(0,212,200,0.22)" }}
            >
              <Sparkles className="size-2.5" />
              Free · FBA
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-border-subtle bg-bg-deep/60 backdrop-blur-sm text-[9px] tracking-[0.16em] uppercase text-text-muted">
              <Lock className="size-2.5" />
              ${priceAud}
            </span>
          )}
          <button
            type="button"
            onClick={onToggleSave}
            disabled={pending}
            title={saved ? "Saved" : "Save"}
            className={cn(
              "size-7 rounded-sm border flex items-center justify-center transition-colors",
              saved
                ? "border-border-accent bg-accent-muted/60 text-accent-light"
                : "border-border-subtle bg-bg-deep/60 backdrop-blur-sm text-text-muted hover:text-text",
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

        {/* Budget — anchored bottom-left of the cover */}
        {project.budgetBand ? (
          <div className="absolute bottom-3 left-3">
            <div className="text-[8.5px] tracking-[0.18em] uppercase text-text-muted/80 mb-0.5">
              Project budget
            </div>
            <div className="font-display text-[20px] leading-none text-accent-light tabular-nums">
              {BUDGET_LABEL[project.budgetBand]}
            </div>
          </div>
        ) : null}

        {/* FBA-active price tag in the cover (slashed list price + $0)
             — anchored bottom-right. Skipped if already unlocked. */}
        {!isUnlocked && fbaActive ? (
          <div className="absolute bottom-3 right-3 text-right">
            <div className="text-[8.5px] tracking-[0.18em] uppercase text-text-muted/80 mb-0.5">
              Unlock cost
            </div>
            <div className="flex items-baseline justify-end gap-1.5">
              <span className="text-[11px] text-text-dim line-through decoration-[rgba(255,255,255,0.35)] decoration-1 tabular-nums">
                ${priceAud}
              </span>
              <span className="font-display text-[20px] leading-none text-accent-light tabular-nums">
                $0
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col p-5">
        <h3 className="font-ui font-semibold text-[15px] tracking-[-0.005em] text-text line-clamp-2">
          {project.title}
        </h3>

        <div className="mt-2 flex items-center gap-1.5 text-[12px] text-text-muted">
          <MapPin className="size-3" />
          {project.suburb ? `${project.suburb}, ${project.state}` : "Location pending"}
        </div>

        {/* Icon-based spec row — replaces "5 bed 3 bath 2 storey" pills */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <SpecCell
            icon={<Bed className="size-3.5" />}
            value={project.bedrooms}
            label="bed"
          />
          <SpecCell
            icon={<Bath className="size-3.5" />}
            value={project.bathrooms}
            label="bath"
          />
          {project.dwellingCount ? (
            <SpecCell
              icon={<Building className="size-3.5" />}
              value={project.dwellingCount}
              label="dwell"
            />
          ) : (
            <SpecCell
              icon={<Layers className="size-3.5" />}
              value={project.floors}
              label="storey"
            />
          )}
        </div>

        {project.description ? (
          <p className="mt-4 text-[12px] leading-[1.55] text-text-muted line-clamp-2">
            {project.description}
          </p>
        ) : null}

        <div className="mt-auto pt-4 flex items-center justify-between gap-2 border-t border-border-subtle/50">
          <span className="inline-flex items-center gap-1.5 text-[11.5px] text-text-muted">
            <Files className="size-3.5" />
            {project.documentCount} document{project.documentCount === 1 ? "" : "s"}
          </span>
          <span className="inline-flex items-center gap-1 text-[11.5px] text-accent-light opacity-60 group-hover:opacity-100 transition-opacity">
            View
            <ArrowUpRight className="size-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function SpecCell({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number | null | undefined;
  label: string;
}) {
  const isEmpty = !value;
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-sm border py-2 transition-colors",
        isEmpty
          ? "border-border-subtle/60 bg-[rgba(255,255,255,0.012)]"
          : "border-border-subtle bg-[rgba(255,255,255,0.022)]",
      )}
    >
      <span
        className={cn(
          "flex items-center gap-1.5",
          isEmpty ? "text-text-dim/50" : "text-accent-light",
        )}
      >
        {icon}
        <span
          className={cn(
            "font-display text-[18px] leading-none tabular-nums",
            isEmpty ? "text-text-dim/50" : "text-text",
          )}
        >
          {isEmpty ? "—" : value}
        </span>
      </span>
      <span className="mt-1 text-[9px] tracking-[0.14em] uppercase text-text-dim">
        {label}
      </span>
    </div>
  );
}
