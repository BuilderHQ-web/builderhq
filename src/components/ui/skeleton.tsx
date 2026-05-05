import * as React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-md)] bg-surface-1",
        "before:absolute before:inset-0",
        "before:bg-[linear-gradient(90deg,transparent,oklch(1_0_0/0.06),transparent)]",
        "before:bg-[length:200%_100%]",
        "before:animate-[shimmer_2.4s_linear_infinite]",
        className,
      )}
      {...props}
    />
  );
}
