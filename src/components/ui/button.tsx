import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // base — premium feel: subtle inset highlight, smooth easing, no default rounding-blowout
  [
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap select-none",
    "font-medium tracking-tight",
    "transition-[background,color,box-shadow,transform] duration-200 ease-[var(--ease-out-soft)]",
    "active:scale-[0.985] focus-visible:outline-none",
    "disabled:pointer-events-none disabled:opacity-40",
    "[&_svg]:size-4 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary: [
          "bg-accent text-accent-contrast",
          "shadow-[0_1px_0_0_oklch(1_0_0/0.25)_inset,0_8px_24px_-10px_oklch(0.78_0.16_195/0.55)]",
          "hover:bg-accent-hover hover:shadow-[0_1px_0_0_oklch(1_0_0/0.30)_inset,0_10px_28px_-8px_oklch(0.78_0.16_195/0.65)]",
          "active:bg-accent-active",
        ],
        secondary: [
          "bg-surface-2 text-text border border-border",
          "hover:bg-surface-hover hover:border-border-strong",
        ],
        outline: [
          "bg-transparent text-text border border-border-strong",
          "hover:bg-surface-1 hover:border-border-accent",
        ],
        ghost: [
          "bg-transparent text-text-muted",
          "hover:bg-surface-1 hover:text-text",
        ],
        subtle: [
          "bg-accent-muted text-accent",
          "hover:bg-[oklch(0.78_0.13_195/0.22)]",
        ],
        danger: [
          "bg-danger text-text",
          "hover:bg-[oklch(0.76_0.20_22)]",
        ],
        link: [
          "bg-transparent text-accent underline-offset-4 hover:underline px-0",
        ],
      },
      size: {
        sm: "h-8 rounded-[var(--radius-md)] px-3 text-[13px]",
        md: "h-10 rounded-[var(--radius-md)] px-4 text-[14px]",
        lg: "h-12 rounded-[var(--radius-lg)] px-6 text-[15px]",
        xl: "h-14 rounded-[var(--radius-lg)] px-7 text-[16px]",
        icon: "h-10 w-10 rounded-[var(--radius-md)]",
        "icon-sm": "h-8 w-8 rounded-[var(--radius-sm)]",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Show a spinner and disable. */
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <span
            aria-hidden
            className="inline-block size-3.5 rounded-full border-2 border-current border-r-transparent animate-spin"
          />
        ) : null}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
