import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Decorative blueprint-style corner brackets. Wrap a section/panel and
 * the four L-shaped brackets float in each corner, framing the content
 * like a technical drawing. Direct port of the landing's `.hero-corner`.
 *
 * Use sparingly — hero, featured panels, tender comparison. Not every card.
 */
export function CornerBrackets({
  className,
  size = 34,
  inset = 28,
  color = "rgba(0,212,200,0.38)",
}: {
  className?: string;
  size?: number;
  inset?: number;
  color?: string;
}) {
  const stroke = `1px solid ${color}`;
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 z-10", className)}
    >
      <span
        className="absolute"
        style={{ top: inset, left: inset, width: size, height: size, borderTop: stroke, borderLeft: stroke }}
      />
      <span
        className="absolute"
        style={{ top: inset, right: inset, width: size, height: size, borderTop: stroke, borderRight: stroke }}
      />
      <span
        className="absolute"
        style={{ bottom: inset, left: inset, width: size, height: size, borderBottom: stroke, borderLeft: stroke }}
      />
      <span
        className="absolute"
        style={{ bottom: inset, right: inset, width: size, height: size, borderBottom: stroke, borderRight: stroke }}
      />
    </div>
  );
}
