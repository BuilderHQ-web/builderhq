import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Button — premium-tuned.
 *
 * Premium moves baked in:
 *   - Inset top highlight on filled variants (catching-light effect).
 *   - Layered shadow on primary: tight contour + soft teal halo.
 *   - Outline variant has a barely-visible inner gradient so it doesn't
 *     read as a flat stroke against busy backgrounds.
 *   - Active (mousedown) compresses 1.5%, never resizes.
 *   - All hover transitions are slow (240ms) and easeOut — no flicker.
 */
const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap select-none",
    "font-ui font-medium tracking-[-0.005em]",
    "transition-[background,color,box-shadow,transform,border-color] duration-[var(--duration-base,240ms)] ease-[var(--ease-out)]",
    "active:scale-[0.985] focus-visible:outline-none",
    "disabled:pointer-events-none disabled:opacity-40",
    "[&_svg]:size-4 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary: [
          "text-accent-contrast",
          "bg-[linear-gradient(180deg,#7ef5ed_0%,#00d4c8_55%,#00b8ad_100%)]",
          "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.40),inset_0_-1px_0_0_rgba(0,0,0,0.20),0_1px_2px_0_rgba(0,0,0,0.30),0_8px_24px_-10px_rgba(0,212,200,0.55)]",
          "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.50),inset_0_-1px_0_0_rgba(0,0,0,0.20),0_1px_2px_0_rgba(0,0,0,0.30),0_12px_32px_-10px_rgba(0,212,200,0.70)]",
          "hover:-translate-y-px",
        ],
        secondary: [
          "text-text border border-border",
          "bg-[linear-gradient(180deg,var(--color-surface-2),var(--color-surface-1))]",
          "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),0_1px_2px_0_rgba(0,0,0,0.3)]",
          "hover:border-border-strong hover:bg-[linear-gradient(180deg,var(--color-surface-hover),var(--color-surface-2))]",
        ],
        outline: [
          "text-text border border-border-strong",
          "bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.005))]",
          "hover:border-border-accent-strong hover:text-accent-light",
          "hover:shadow-[0_0_24px_-4px_rgba(0,212,200,0.20)]",
          "hover:-translate-y-px",
        ],
        ghost: [
          "bg-transparent text-text-muted",
          "hover:bg-surface-1 hover:text-text",
        ],
        subtle: [
          "bg-accent-muted text-accent-light border border-[rgba(0,212,200,0.20)]",
          "hover:bg-[rgba(0,212,200,0.18)] hover:border-border-accent-strong",
        ],
        danger: [
          "text-text border border-[rgba(255,80,80,0.30)]",
          "bg-[linear-gradient(180deg,oklch(0.74_0.20_22),oklch(0.66_0.20_22))]",
          "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.20),0_1px_2px_0_rgba(0,0,0,0.3)]",
          "hover:bg-[linear-gradient(180deg,oklch(0.78_0.20_22),oklch(0.70_0.20_22))]",
        ],
        link: [
          "bg-transparent text-accent-light underline-offset-[5px] decoration-[rgba(126,245,237,0.4)]",
          "hover:underline px-0",
        ],
      },
      size: {
        sm: "h-8 rounded-tight px-3 text-[12px] tracking-[0.04em]",
        md: "h-10 rounded-tight px-4 text-[13px]",
        lg: "h-12 rounded-tight px-6 text-[13px] tracking-[0.04em]",
        xl: "h-14 rounded-tight px-7 text-[14px] tracking-[0.04em]",
        icon: "h-10 w-10 rounded-tight",
        "icon-sm": "h-8 w-8 rounded-tight",
      },
      uppercase: {
        true: "uppercase",
        false: "",
      },
    },
    compoundVariants: [
      // Pill CTAs (sm/lg/xl) on primary look more premium uppercased
      // by default — opt-out via `uppercase={false}`.
      { size: "lg", uppercase: undefined, class: "" },
    ],
    defaultVariants: { variant: "primary", size: "md", uppercase: false },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, uppercase, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, uppercase }), className)}
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
