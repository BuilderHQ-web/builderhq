import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Premium card surface (light).
 *
 * A crisp white surface lifted off the warm greige canvas by `card-elev`
 * (globals.css): a tight contact shadow for the edge plus a soft, wide
 * ambient drop. That separation — white on warm, gently raised — is what
 * keeps sections legible instead of melting into one flat sheet.
 *
 * The `interactive` prop exists because most cards are static (purely
 * informational) and shouldn't animate on hover. When set, the card
 * lifts 1px into `card-elev-lg` and firms its border.
 */
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative isolate rounded-[var(--radius-xl)] border border-border bg-surface-1 card-elev",
        "transition-[border-color,box-shadow,transform] duration-[180ms] ease-[var(--ease-out)]",
        interactive && "hover:-translate-y-px hover:border-border-strong hover:card-elev-lg",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-2 p-7", className)} {...props} />
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
    <div ref={ref} className={cn("px-7 pb-7 pt-0", className)} {...props} />
  ),
);
CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center gap-3 px-7 pb-7 pt-0", className)}
      {...props}
    />
  ),
);
CardFooter.displayName = "CardFooter";
