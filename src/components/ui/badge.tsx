import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide uppercase",
  {
    variants: {
      variant: {
        default: "border-border bg-surface-2 text-text-muted",
        accent: "border-[oklch(0.78_0.13_195/0.35)] bg-accent-muted text-accent",
        success: "border-[oklch(0.78_0.16_155/0.35)] bg-success-muted text-success",
        warning: "border-[oklch(0.83_0.16_75/0.35)] bg-warning-muted text-warning",
        danger: "border-[oklch(0.72_0.20_22/0.35)] bg-danger-muted text-danger",
        info: "border-[oklch(0.78_0.13_230/0.35)] bg-info-muted text-info",
        outline: "border-border-strong bg-transparent text-text-muted",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
