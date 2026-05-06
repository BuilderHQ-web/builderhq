import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Premium card surface.
 *
 * Layering tricks:
 *   1. 1px inset top highlight ("catching light") — the single move that
 *      makes a dark-mode card look like a real surface, not a div.
 *   2. Subtle top-to-bottom gradient inside (surface-1 → slightly cooler).
 *   3. Layered shadow: tight inner contour + larger soft drop.
 *   4. Hover lifts the card 1px and softens the accent rim — never aggressive.
 *
 * The `interactive` prop exists because most cards are static (purely
 * informational) and shouldn't animate on hover.
 */
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative isolate rounded-[var(--radius-xl)] border border-border",
        "bg-[linear-gradient(180deg,var(--color-surface-1),color-mix(in_oklch,var(--color-surface-1)_75%,var(--color-bg-deep)))]",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),0_1px_2px_0_rgba(0,0,0,0.4),0_8px_24px_-12px_rgba(0,0,0,0.55)]",
        "transition-[transform,border-color,box-shadow] duration-[var(--duration-base,360ms)] ease-[var(--ease-out)]",
        interactive && [
          "hover:-translate-y-[1px] hover:border-border-strong",
          "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_1px_2px_0_rgba(0,0,0,0.5),0_18px_44px_-14px_rgba(0,0,0,0.65),0_0_0_1px_rgba(0,212,200,0.08)]",
        ],
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-1.5 p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        "font-ui font-semibold text-[18px] leading-[26px] tracking-[-0.015em] text-text",
        className,
      )}
      {...props}
    />
  ),
);
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-[13px] leading-[20px] text-text-subtle", className)}
      {...props}
    />
  ),
);
CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("px-6 pb-6 pt-0", className)} {...props} />
  ),
);
CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center gap-3 px-6 pb-6 pt-0", className)}
      {...props}
    />
  ),
);
CardFooter.displayName = "CardFooter";
