import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * BuilderHQ wordmark + glyph.
 * The glyph is an isometric "block" rendered with stacked rhombi —
 * a quiet nod to construction, not a literal house icon.
 */
export function Logo({
  className,
  showWordmark = true,
  size = 28,
}: {
  className?: string;
  showWordmark?: boolean;
  size?: number;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 leading-none", className)}>
      <Glyph size={size} />
      {showWordmark ? (
        <span
          className="font-display font-semibold tracking-tight text-text"
          style={{ fontSize: Math.round(size * 0.72) }}
        >
          BuilderHQ
        </span>
      ) : null}
    </span>
  );
}

export function Glyph({ size = 28, className }: { size?: number; className?: string }) {
  const id = React.useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-a`} x1="4" y1="6" x2="28" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="oklch(0.92 0.10 195)" />
          <stop offset="1" stopColor="oklch(0.62 0.16 195)" />
        </linearGradient>
        <linearGradient id={`${id}-b`} x1="6" y1="14" x2="26" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="oklch(0.78 0.13 195)" />
          <stop offset="1" stopColor="oklch(0.45 0.10 220)" />
        </linearGradient>
      </defs>
      {/* back rhombus (top) */}
      <path d="M16 2 L29 9 L16 16 L3 9 Z" fill={`url(#${id}-a)`} />
      {/* front rhombus (right) */}
      <path d="M16 16 L29 9 L29 23 L16 30 Z" fill={`url(#${id}-b)`} opacity="0.92" />
      {/* front rhombus (left) — darker for depth */}
      <path d="M16 16 L3 9 L3 23 L16 30 Z" fill="oklch(0.30 0.04 230)" opacity="0.85" />
      {/* highlight edge */}
      <path d="M16 2 L29 9 L16 16" stroke="oklch(1 0 0 / 0.35)" strokeWidth="0.5" fill="none" />
    </svg>
  );
}
