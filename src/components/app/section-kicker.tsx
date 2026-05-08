/**
 * SectionKicker — the small uppercase label that opens a section.
 *
 *   ● PIPELINE
 *   ● AT A GLANCE
 *   ● FOUNDING ACCESS
 *
 * Standardises a pattern that was duplicated in 5+ places with slightly
 * different tracking values, sizes, and dot treatments. One component,
 * one rhythm. Tone variants pick different accent colours when a
 * section deserves emphasis (warning, success, etc.).
 *
 * Use SectionHeader for the bigger heading + description block above
 * grids and tables.
 */

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type Tone = "accent" | "muted" | "warn";

interface SectionKickerProps {
  children: React.ReactNode;
  tone?: Tone;
  /** Optional icon — replaces the default glow dot. */
  icon?: LucideIcon;
  /** When true, renders without the leading dot/icon (rare). */
  bare?: boolean;
  className?: string;
}

const toneStyles: Record<
  Tone,
  { text: string; dot: string; iconClass: string }
> = {
  accent: {
    text: "text-accent",
    dot: "bg-accent shadow-[0_0_8px_rgba(0,212,200,0.6)]",
    iconClass: "text-accent",
  },
  muted: {
    text: "text-text-dim",
    dot: "bg-text-dim/70",
    iconClass: "text-text-dim",
  },
  warn: {
    text: "text-warning",
    dot: "bg-warning shadow-[0_0_8px_rgba(255,181,71,0.5)]",
    iconClass: "text-warning",
  },
};

export function SectionKicker({
  children,
  tone = "accent",
  icon: Icon,
  bare = false,
  className,
}: SectionKickerProps) {
  const t = toneStyles[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2",
        "text-[10px] tracking-[0.22em] uppercase font-ui font-medium",
        t.text,
        className,
      )}
    >
      {!bare ? (
        Icon ? (
          <Icon className={cn("size-3", t.iconClass)} />
        ) : (
          <span aria-hidden className={cn("size-1 rounded-full", t.dot)} />
        )
      ) : null}
      {children}
    </span>
  );
}

interface SectionHeaderProps {
  /** The kicker label that sits above the title. Optional. */
  kicker?: React.ReactNode;
  title: string;
  description?: string;
  /** Right-aligned action(s) — e.g. "View all" link. */
  action?: React.ReactNode;
  /** Use display font for the title — for hero-class section openers. */
  display?: boolean;
  className?: string;
}

export function SectionHeader({
  kicker,
  title,
  description,
  action,
  display = false,
  className,
}: SectionHeaderProps) {
  return (
    <header className={cn("flex items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        {kicker ? <div className="mb-1.5">{kicker}</div> : null}
        <h2
          className={cn(
            display
              ? "font-display uppercase tracking-[-0.012em] text-[26px] leading-[1.05] text-text"
              : "font-ui font-semibold text-[16px] tracking-[-0.005em] text-text",
          )}
        >
          {title}
        </h2>
        {description ? (
          <p className="text-[12.5px] text-text-dim mt-1 leading-[1.5]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
