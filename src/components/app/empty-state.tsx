/**
 * EmptyState — shared "nothing here yet" surface.
 *
 * Empty states are where activation lives or dies. The default shape:
 *
 *   ┌──────────────────────────────────────────────┐
 *   │             ─── icon orb ───                 │
 *   │                                              │
 *   │              Big display title               │
 *   │      One-line description in muted text      │
 *   │                                              │
 *   │           [ Primary CTA ]   secondary        │
 *   └──────────────────────────────────────────────┘
 *
 * The icon orb is a subtle gradient ring — same family as the FBA
 * card's "founding member" treatment but quieter. Pages can pass
 * `tone` to switch to a "first time" celebratory variant for
 * onboarding-flavoured moments.
 */

"use client";

import Link from "next/link";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";

type Tone = "default" | "primary";

interface EmptyStateProps {
  /** Pre-rendered icon JSX. Pass `<Compass className="size-5" />`,
   *  not the bare `Compass` component — passing a component reference
   *  from a Server Component prop tries to serialise the function
   *  across the RSC boundary and crashes the page. */
  icon: React.ReactNode;
  title: string;
  description?: string;
  /** Primary action — link only (rendered server-side via Next Link).
   *  Click handlers live elsewhere because functions can't cross the
   *  server→client component boundary. */
  primary?: { label: string; href: string };
  /** Secondary action — usually a settings link or "learn more". */
  secondary?: { label: string; href: string };
  tone?: Tone;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  primary,
  secondary,
  tone = "default",
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.2, 0.65, 0.3, 0.9] }}
      className={cn(
        "rounded-md border border-border-subtle",
        "bg-surface-2",
        "px-8 py-14 sm:py-16 text-center",
        "relative overflow-hidden",
        className,
      )}
    >
      {/* Ambient glow */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          background:
            tone === "primary"
              ? "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(0,212,200,0.10), transparent 65%)"
              : "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(0,212,200,0.05), transparent 65%)",
        }}
      />

      <div className="relative mx-auto max-w-[420px]">
        <div
          className={cn(
            "mx-auto size-14 rounded-full flex items-center justify-center mb-5",
            "border border-border-subtle",
            "bg-[radial-gradient(circle_at_50%_30%,rgba(0,212,200,0.18),rgba(24,34,44,0.03))]",
            tone === "primary" && "shadow-[0_0_24px_rgba(0,212,200,0.25)]",
          )}
        >
          <span
            className={cn(
              "inline-flex items-center justify-center",
              tone === "primary" ? "text-accent-light" : "text-accent-light",
            )}
          >
            {icon}
          </span>
        </div>

        <h3 className="font-display uppercase tracking-[-0.012em] text-[22px] leading-[1.05] text-text">
          {title}
        </h3>

        {description ? (
          <p className="mt-2 text-[13px] text-text-muted leading-[1.6]">
            {description}
          </p>
        ) : null}

        {primary || secondary ? (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {primary ? (
              <Link
                href={primary.href}
                className={cn(
                  "inline-flex items-center gap-1.5 h-9 px-5 rounded-full",
                  "bg-accent text-accent-contrast text-[12.5px] font-semibold tracking-[0.04em]",
                  "hover:bg-accent-hover transition-colors duration-[140ms]",
                  "shadow-[0_0_0_1px_rgba(0,212,200,0.35),_0_6px_18px_-8px_rgba(0,212,200,0.45)]",
                )}
              >
                {primary.label}
              </Link>
            ) : null}
            {secondary ? (
              <Link
                href={secondary.href}
                className={cn(
                  "inline-flex items-center gap-1.5 h-9 px-4 rounded-full",
                  "border border-border-subtle text-text-muted",
                  "text-[12px] tracking-[0.04em]",
                  "hover:bg-surface-1 hover:text-text transition-colors duration-[140ms]",
                )}
              >
                {secondary.label}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
