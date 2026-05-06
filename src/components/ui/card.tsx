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
        "relative isolate rounded-[var(--radius-xl)] border border-border bg-surface-1",
        // One inset highlight + a quiet drop. No outer shadow halo.
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]",
        "transition-[border-color,background] duration-[160ms] ease-[var(--ease-out)]",
        interactive && "hover:border-border-strong hover:bg-surface-2",
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
