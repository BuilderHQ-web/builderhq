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
        // Primary — flat teal, single subtle inset highlight, tiny contour
        // shadow. No coloured glow halo, no lift on hover. Resend-style:
        // the typography does the work; the button is quiet.
        primary: [
          "text-accent-contrast bg-accent",
          "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18),0_1px_0_0_rgba(0,0,0,0.18)]",
          "hover:bg-accent-hover",
        ],
        // Secondary — surface card with hairline border. Hover swaps the
        // surface tint, no border colour change, no shadow.
        secondary: [
          "text-text border border-border bg-surface-2",
          "hover:bg-surface-hover",
        ],
        // Outline — pure border + transparent. No inner gradient, no glow.
        outline: [
          "text-text border border-border-strong bg-transparent",
          "hover:bg-surface-1 hover:border-border-strong",
        ],
        ghost: [
          "bg-transparent text-text-muted",
          "hover:bg-surface-1 hover:text-text",
        ],
        subtle: [
          "bg-accent-muted text-accent-light border border-[rgba(0,212,200,0.20)]",
          "hover:bg-[rgba(0,212,200,0.18)]",
        ],
        // Danger — solid red, mirrors primary's quiet treatment.
        danger: [
          "text-text bg-danger",
          "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16),0_1px_0_0_rgba(0,0,0,0.20)]",
          "hover:bg-[oklch(0.78_0.20_22)]",
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
