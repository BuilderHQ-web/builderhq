import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * StatusDot — pulsing indicator for "live", "online", "active" states.
 * The pulse is implemented as a duplicate ring that scales+fades via
 * Tailwind's animate-ping, so reduced-motion users get a static dot.
 */
export function StatusDot({
  tone = "accent",
  size = 8,
  pulse = true,
  className,
  label,
}: {
  tone?: "accent" | "success" | "warning" | "danger" | "muted";
  size?: number;
  pulse?: boolean;
  className?: string;
  /** Visually hidden text for screen readers. */
  label?: string;
}) {
  const palette = {
    accent: { bg: "bg-accent-light", glow: "rgba(10,125,115,0.7)", ring: "bg-accent" },
    success: { bg: "bg-success", glow: "oklch(0.78 0.16 155 / 0.55)", ring: "bg-success" },
    warning: { bg: "bg-warning", glow: "rgba(251,184,64,0.55)", ring: "bg-warning" },
    danger:  { bg: "bg-danger", glow: "oklch(0.72 0.20 22 / 0.55)", ring: "bg-danger" },
    muted:   { bg: "bg-text-faint", glow: "rgba(22,28,34,0.18)", ring: "bg-text-faint" },
  }[tone];

  return (
    <span
      className={cn("relative inline-flex shrink-0", className)}
      style={{ width: size, height: size }}
    >
      {pulse ? (
        <span
          className={cn("absolute inset-0 rounded-full opacity-40 animate-ping motion-reduce:hidden", palette.ring)}
        />
      ) : null}
      <span
        className={cn("relative inline-block rounded-full", palette.bg)}
        style={{ width: size, height: size, boxShadow: `0 0 ${Math.max(8, size * 1.5)}px ${palette.glow}` }}
      />
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}
