import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Input — premium-tuned.
 * Subtle inner top-down gradient gives depth even when not focused.
 * Focus ring is a softly-feathered teal halo, not a hard 2px outline.
 */
/**
 * Quiet by default — flat surface, hairline border, no inner gradient.
 * Focus state is a small teal halo only (no inner gradient swap, no
 * outer glow) so the form feels precise rather than decorated.
 */
const baseField = [
  "w-full rounded-tight border border-border bg-surface-1 px-3.5",
  "text-[13px] text-text placeholder:text-text-faint",
  "transition-[border-color,box-shadow] duration-[160ms] ease-[var(--ease-out)]",
  "hover:border-border-strong",
  "focus:outline-none focus:border-border-accent-strong",
  "focus:shadow-[0_0_0_3px_rgba(0,212,200,0.15)]",
  "disabled:cursor-not-allowed disabled:opacity-50",
  "aria-invalid:border-[rgba(255,80,80,0.50)]",
  "aria-invalid:focus:shadow-[0_0_0_3px_rgba(255,80,80,0.18)]",
] as const;

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        ...baseField,
        "h-10 py-2",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "[&::-webkit-search-cancel-button]:hidden",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(...baseField, "min-h-[88px] py-2.5 resize-y", className)}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
