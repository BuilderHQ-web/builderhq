import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Decorative blueprint-style grid backdrop. Use for hero sections only.
 * Pure CSS — no images, no JS, no layout cost. Fades to transparent at edges
 * via radial mask so it never feels like wallpaper.
 */
export function GridBg({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 overflow-hidden",
        className,
      )}
    >
      {/* faint orthogonal grid */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, oklch(1 0 0 / 0.04) 1px, transparent 1px), linear-gradient(to bottom, oklch(1 0 0 / 0.04) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 30%, black 30%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 50% 30%, black 30%, transparent 75%)",
        }}
      />
      {/* teal aurora blob top-left */}
      <div
        className="absolute -top-40 -left-40 size-[520px] rounded-full opacity-50 blur-3xl"
        style={{ background: "radial-gradient(circle, oklch(0.78 0.18 195 / 0.30), transparent 60%)" }}
      />
      {/* violet aurora blob bottom-right */}
      <div
        className="absolute -bottom-32 -right-24 size-[460px] rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, oklch(0.50 0.18 280 / 0.30), transparent 60%)" }}
      />
    </div>
  );
}

/** Subtle film-grain overlay. 1KB SVG, very low opacity. */
export function NoiseOverlay({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-0 -z-0 opacity-[0.025] mix-blend-overlay",
        className,
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.6 0'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>\")",
      }}
    />
  );
}
