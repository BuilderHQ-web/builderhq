import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Subtle 1px gradient border used on premium cards (pricing tier highlight,
 * hero callouts, founding-builder cards). Renders the gradient as the
 * background of the wrapper, with an inner div clipping the content.
 */
export function GradientBorder({
  className,
  innerClassName,
  radius = 16,
  children,
}: {
  className?: string;
  innerClassName?: string;
  radius?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("relative p-px", className)}
      style={{
        background:
          "linear-gradient(140deg, oklch(0.78 0.13 195 / 0.55), oklch(1 0 0 / 0.06) 35%, oklch(0.55 0.18 280 / 0.45))",
        borderRadius: radius,
      }}
    >
      <div
        className={cn("relative bg-surface-1", innerClassName)}
        style={{ borderRadius: radius - 1 }}
      >
        {children}
      </div>
    </div>
  );
}
