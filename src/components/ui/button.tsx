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
        // Primary — flat accent. No inset, no shadow, no border. The button
        // is a flat plate of brand colour; hover gently brightens. Maximum
        // restraint, brand-true.
        primary: [
          "text-accent-contrast bg-accent",
          "hover:bg-accent-hover",
        ],
        // Secondary — quiet surface chip with hairline border.
        secondary: [
          "text-text border border-border bg-surface-1",
          "hover:bg-surface-2",
        ],
        // Outline — hairline border on transparent. Hover lifts the surface
        // colour just enough to acknowledge intent.
        outline: [
          "text-text border border-border-strong bg-transparent",
          "hover:bg-surface-1",
        ],
        ghost: [
          "bg-transparent text-text-muted",
          "hover:bg-surface-1 hover:text-text",
        ],
        subtle: [
          "bg-accent-muted text-accent-light border border-[rgba(0,212,200,0.20)]",
          "hover:bg-[rgba(0,212,200,0.18)]",
        ],
        danger: [
          "text-text bg-danger",
          "hover:bg-[oklch(0.78_0.20_22)]",
        ],
        link: [
          "bg-transparent text-accent-light underline-offset-[5px] decoration-[rgba(126,245,237,0.4)]",
          "hover:underline px-0",
        ],
      },
      size: {
        // Sharp small/medium — inline buttons in tables, dropdowns, dense UIs.
        sm: "h-8 rounded-md px-3.5 text-[12px]",
        md: "h-10 rounded-md px-4 text-[13px]",
        // Pill large/xl — hero CTAs, primary actions on focused screens
        // (auth, onboarding, project upload). Pill radii read as confident
        // and modern; matches the Resend / Base44 / Lando aesthetic.
        lg: "h-11 rounded-full px-6 text-[13.5px]",
        xl: "h-13 rounded-full px-8 text-[14px]",
        icon: "h-10 w-10 rounded-md",
        "icon-sm": "h-8 w-8 rounded-md",
      },
      uppercase: {
        true: "uppercase tracking-[0.04em]",
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
