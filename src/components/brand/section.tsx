import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Vertical-rhythm wrapper. All page sections compose from this so spacing
 * and max-width stay consistent across marketing & app shells.
 */
interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  width?: "narrow" | "default" | "wide" | "full";
  spacing?: "sm" | "md" | "lg" | "xl";
  as?: "section" | "div" | "main" | "article";
}

const widthMap = {
  narrow: "max-w-3xl",
  default: "max-w-6xl",
  wide: "max-w-[1320px]",
  full: "max-w-none",
} as const;

const spacingMap = {
  sm: "py-10 md:py-14",
  md: "py-16 md:py-24",
  lg: "py-24 md:py-32",
  xl: "py-32 md:py-44",
} as const;

export function Section({
  className,
  width = "default",
  spacing = "md",
  as: Tag = "section",
  ...props
}: SectionProps) {
  return (
    <Tag
      className={cn(
        "mx-auto w-full px-6 md:px-8",
        widthMap[width],
        spacingMap[spacing],
        className,
      )}
      {...props}
    />
  );
}

/**
 * Eyebrow / kicker — brand label for section headers. Quiet by default
 * (uppercase teal text only); a small accent rule appears at the start
 * to anchor it visually but without the heavy glow we used to ship.
 *
 * The Resend-tier move is restraint: typography does the work, decoration
 * stays out of the way.
 */
export function Eyebrow({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 font-ui",
        "text-[10px] tracking-[0.22em] uppercase text-accent",
        className,
      )}
    >
      <span aria-hidden className="block w-4 h-px bg-accent/70" />
      {children}
    </span>
  );
}
