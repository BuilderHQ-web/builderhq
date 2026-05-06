import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * DataValue — premium number display with tabular figures. Used wherever
 * builders/owners scan numeric data (prices, ABNs, tender counts, dates).
 * Tabular-nums keep digits perfectly aligned across rows; without it, "8"
 * is narrower than "0" and tables look amateur.
 */
interface DataValueProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: "sm" | "md" | "lg" | "xl";
  tone?: "default" | "accent" | "muted";
  /** Render with the mono font (best for ABNs, IDs). */
  mono?: boolean;
}

const sizeMap = {
  sm: "text-[12px] leading-[16px]",
  md: "text-[14px] leading-[18px]",
  lg: "text-[18px] leading-[22px]",
  xl: "text-[26px] leading-[30px] tracking-[-0.015em]",
} as const;

const toneMap = {
  default: "text-text",
  accent: "text-accent-light",
  muted: "text-text-muted",
} as const;

export function DataValue({
  className,
  size = "md",
  tone = "default",
  mono = false,
  ...props
}: DataValueProps) {
  return (
    <span
      className={cn(
        "tabular-nums slashed-zero",
        mono ? "font-mono" : "font-ui font-semibold",
        sizeMap[size],
        toneMap[tone],
        className,
      )}
      {...props}
    />
  );
}

/**
 * DataLabel — the small uppercase label that sits above a DataValue.
 * Pair them for the dl/dd pattern used on cards and dashboards.
 */
export function DataLabel({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "block text-[9px] tracking-[0.2em] uppercase text-text-dim",
        className,
      )}
      {...props}
    />
  );
}
