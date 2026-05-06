"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";

/**
 * GlowButton — the premium primary CTA. Use sparingly (hero, top of pricing,
 * key conversion points). Carries:
 *   - A slow idle pulse-glow so the button visibly "lives" on the page
 *   - A conic-gradient halo that brightens on hover
 *   - A diagonal sheen that sweeps left→right on hover
 *
 * For everyday actions, reach for <Button variant="primary" />.
 */
export const GlowButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, size = "lg", ...props }, ref) => {
    return (
      <span className="relative inline-flex group">
        {/* Idle pulse glow — a soft halo that breathes (3.6s loop) */}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute -inset-[3px] rounded-[5px]",
            "bg-[radial-gradient(ellipse_at_center,rgba(0,212,200,0.45),transparent_70%)]",
            "blur-[10px] opacity-50 animate-[pulseGlow_3.6s_ease-in-out_infinite]",
          )}
        />
        {/* Conic ring — sharpens on hover */}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute -inset-[2px] rounded-[5px]",
            "bg-[conic-gradient(from_140deg,rgba(126,245,237,0),rgba(126,245,237,0.85),rgba(26,95,212,0.5),rgba(126,245,237,0))]",
            "opacity-50 blur-[6px] transition-opacity duration-500",
            "group-hover:opacity-100",
          )}
        />
        <Button
          ref={ref}
          variant="primary"
          size={size}
          uppercase
          className={cn(
            "relative overflow-hidden tracking-[0.08em] font-semibold",
            // Diagonal shine sweep on hover
            "before:pointer-events-none before:absolute before:inset-0",
            "before:bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.40)_50%,transparent_70%)]",
            "before:translate-x-[-120%] before:transition-transform before:duration-[900ms] before:ease-[var(--ease-out)]",
            "group-hover:before:translate-x-[120%]",
            className,
          )}
          {...props}
        >
          <span className="relative">{children}</span>
        </Button>
      </span>
    );
  },
);
GlowButton.displayName = "GlowButton";
