import * as React from "react";
import { cn } from "@/lib/utils";

interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
  /**
   * `solid` — flat 1px border-subtle line.
   * `gradient` — fades transparent → border → transparent, premium feel.
   * `accent` — gradient with teal glow at center, used for emphasis.
   */
  variant?: "solid" | "gradient" | "accent";
}

export const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className, orientation = "horizontal", decorative = true, variant = "gradient", ...props }, ref) => {
    const isH = orientation === "horizontal";
    return (
      <div
        ref={ref}
        role={decorative ? "none" : "separator"}
        aria-orientation={decorative ? undefined : orientation}
        className={cn(
          isH ? "h-px w-full" : "h-full w-px",
          variant === "solid" && "bg-border-subtle",
          variant === "gradient" &&
            (isH
              ? "bg-[linear-gradient(90deg,transparent,rgba(24,34,44,0.18),transparent)]"
              : "bg-[linear-gradient(180deg,transparent,rgba(24,34,44,0.18),transparent)]"),
          variant === "accent" &&
            (isH
              ? "bg-[linear-gradient(90deg,transparent_15%,rgba(0,212,200,0.7)_50%,transparent_85%)] shadow-[0_0_8px_rgba(0,212,200,0.3)]"
              : "bg-[linear-gradient(180deg,transparent_15%,rgba(0,212,200,0.7)_50%,transparent_85%)] shadow-[0_0_8px_rgba(0,212,200,0.3)]"),
          className,
        )}
        {...props}
      />
    );
  },
);
Separator.displayName = "Separator";
