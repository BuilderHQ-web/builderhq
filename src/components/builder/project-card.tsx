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
} from "lucide-react";

import {
  saveProjectAction,
  unsaveProjectAction,
} from "@/app/(app)/_actions/marketplace";
import { cn } from "@/lib/utils";
import type { MarketplacePreview } from "@/modules/projects";

const TYPE_META: Record<
  MarketplacePreview["type"],
  { label: string; icon: React.ReactNode; tone: string }
> = {
  single_dwelling: {
    label: "Single dwelling",
    icon: <Home className="size-3.5" />,
    tone: "from-[rgba(0,212,200,0.18)] to-[rgba(26,95,212,0.18)]",
  },
  multi_dwelling: {
    label: "Multi-dwelling",
    icon: <Building className="size-3.5" />,
    tone: "from-[rgba(120,180,255,0.20)] to-[rgba(26,95,212,0.20)]",
  },
  renovation: {
    label: "Renovation",
    icon: <Wrench className="size-3.5" />,
    tone: "from-[rgba(251,184,64,0.16)] to-[rgba(255,120,150,0.16)]",
  },
  extension: {
    label: "Extension",
    icon: <Layers className="size-3.5" />,
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
 * row, and saved list. Compact, clickable, with save/unlock affordances.
 */
export function ProjectCard({
  project,
  isSaved,
  isUnlocked,
}: {
  project: MarketplacePreview;
  isSaved: boolean;
  isUnlocked: boolean;
}) {
  const meta = TYPE_META[project.type];
  const [saved, setSaved] = useState(isSaved);
  const [pending, startTransition] = useTransition();

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
        "group relative flex flex-col rounded-md border overflow-hidden transition-all duration-[300ms]",
        "border-border-subtle bg-[linear-gradient(180deg,rgba(10,28,44,0.55),rgba(6,18,30,0.78))]",
        "hover:border-border-accent/60 hover:-translate-y-0.5",
        "shadow-[0_10px_28px_-18px_rgba(0,0,0,0.55)]",
      )}
    >
      {/* Cover band — gradient by type */}
      <div
        className={cn(
          "relative h-[120px] overflow-hidden bg-gradient-to-br",
          meta.tone,
        )}
      >
        {/* grid pattern */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "linear-gradient(rgba(142,252,244,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(142,252,244,0.08) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            maskImage:
              "radial-gradient(ellipse 80% 70% at 50% 50%, black, transparent 80%)",
          }}
        />
        {/* type pill */}
        <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-sm border border-border-accent/40 bg-bg-deep/60 backdrop-blur-sm text-[9.5px] tracking-[0.16em] uppercase text-accent-light">
          {meta.icon}
          {meta.label}
        </span>
        {/* unlock + save badges */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {isUnlocked ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-border-accent bg-accent-muted/60 text-[9px] tracking-[0.16em] uppercase text-accent-light">
              <Unlock className="size-2.5" />
              Unlocked
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-border-subtle bg-bg-deep/60 backdrop-blur-sm text-[9px] tracking-[0.16em] uppercase text-text-dim">
              <Lock className="size-2.5" />
              Locked
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
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col p-5">
        <h3 className="font-ui font-semibold text-[14.5px] tracking-[-0.005em] text-text line-clamp-2">
          {project.title}
        </h3>

        <div className="mt-2 flex items-center gap-1.5 text-[11.5px] text-text-dim">
          <MapPin className="size-3" />
          {project.suburb ? `${project.suburb}, ${project.state}` : "Location pending"}
        </div>

        {/* Spec strip */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {project.bedrooms ? (
            <Tag>{project.bedrooms} bed</Tag>
          ) : null}
          {project.bathrooms ? <Tag>{project.bathrooms} bath</Tag> : null}
          {project.floors ? <Tag>{project.floors} storey</Tag> : null}
          {project.dwellingCount ? (
            <Tag>{project.dwellingCount} dwellings</Tag>
          ) : null}
        </div>

        {project.description ? (
          <p className="mt-4 text-[12px] leading-[1.55] text-text-muted line-clamp-2">
            {project.description}
          </p>
        ) : null}

        <div className="mt-auto pt-5 flex items-center justify-between gap-2 border-t border-border-subtle/50">
          <div className="flex items-center gap-3 text-[11px] text-text-dim">
            {project.budgetBand ? (
              <span className="font-mono text-accent-light">
                {BUDGET_LABEL[project.budgetBand]}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <Files className="size-3" />
              {project.documentCount}
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] text-accent-light opacity-0 group-hover:opacity-100 transition-opacity">
            View
            <ArrowUpRight className="size-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-2 py-0.5 border border-border-subtle bg-[rgba(255,255,255,0.022)] rounded-sm text-[10.5px] text-text-muted">
      {children}
    </span>
  );
}
