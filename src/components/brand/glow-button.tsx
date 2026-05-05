"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";

/**
 * GlowButton — the premium primary CTA. Use *sparingly* (hero, top of pricing,
 * key conversion points). It carries an animated gradient ring + soft outer
 * glow + light-trail shimmer on hover. For everyday actions, use <Button>.
 */
export const GlowButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <span className="relative inline-flex group">
        {/* Outer animated glow */}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute -inset-[2px] rounded-[calc(var(--radius-lg)+2px)]",
            "bg-[conic-gradient(from_140deg,oklch(0.78_0.16_195/0.0),oklch(0.78_0.16_195/0.7),oklch(0.55_0.20_280/0.55),oklch(0.78_0.16_195/0.0))]",
            "opacity-60 blur-[8px] transition-opacity duration-500",
            "group-hover:opacity-100",
          )}
        />
        <Button
          ref={ref}
          variant="primary"
          size="lg"
          className={cn(
            "relative overflow-hidden",
            "bg-[linear-gradient(180deg,oklch(0.86_0.15_195),oklch(0.74_0.16_195))]",
            "text-accent-contrast",
            "shadow-[0_1px_0_0_oklch(1_0_0/0.45)_inset,0_10px_30px_-10px_oklch(0.78_0.16_195/0.65)]",
            "hover:shadow-[0_1px_0_0_oklch(1_0_0/0.50)_inset,0_14px_36px_-10px_oklch(0.78_0.16_195/0.75)]",
            // Shine sweep on hover
            "before:pointer-events-none before:absolute before:inset-0",
            "before:bg-[linear-gradient(110deg,transparent_30%,oklch(1_0_0/0.35)_50%,transparent_70%)]",
            "before:translate-x-[-120%] before:transition-transform before:duration-[900ms] before:ease-[var(--ease-out-soft)]",
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
