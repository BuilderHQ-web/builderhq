import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Input — premium-tuned.
 * Subtle inner top-down gradient gives depth even when not focused.
 * Focus ring is a softly-feathered teal halo, not a hard 2px outline.
 */
const baseField = [
  "w-full rounded-tight border border-border px-3.5",
  "bg-[linear-gradient(180deg,var(--color-surface-1),color-mix(in_oklch,var(--color-surface-1)_92%,var(--color-bg-deep)))]",
  "text-[13px] text-text placeholder:text-text-faint",
  "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]",
  "transition-[border-color,background,box-shadow] duration-[var(--duration-base,200ms)] ease-[var(--ease-out)]",
  "hover:border-border-strong",
  "focus:outline-none focus:border-border-accent-strong focus:bg-surface-2",
  "focus:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),0_0_0_3px_rgba(0,212,200,0.18),0_0_24px_-4px_rgba(0,212,200,0.20)]",
  "disabled:cursor-not-allowed disabled:opacity-50",
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
