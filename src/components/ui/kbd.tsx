import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Kbd — keyboard shortcut chip. Used in command-palette hints, tooltips,
 * empty states ("Press ⌘K to search"). Inset shadow + slight bottom edge
 * gives the impression of a physical key.
 */
export function Kbd({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      {...props}
      className={cn(
        "inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5",
        "rounded-tight border border-border-strong bg-surface-2",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_1px_0_0_rgba(0,0,0,0.4)]",
        "font-mono text-[11px] leading-none text-text-muted",
        "tabular-nums",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
