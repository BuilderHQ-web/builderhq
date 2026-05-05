import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-10 w-full rounded-[var(--radius-md)] border border-border bg-surface-1 px-3.5 py-2",
          "text-[14px] text-text placeholder:text-text-faint",
          "transition-[border-color,background,box-shadow] duration-150 ease-[var(--ease-out-soft)]",
          "hover:border-border-strong",
          "focus:outline-none focus:border-border-accent focus:bg-surface-2",
          "focus:shadow-[0_0_0_3px_oklch(0.78_0.13_195/0.18)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "[&::-webkit-search-cancel-button]:hidden",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[88px] w-full rounded-[var(--radius-md)] border border-border bg-surface-1 px-3.5 py-2.5",
        "text-[14px] text-text placeholder:text-text-faint resize-y",
        "transition-[border-color,background,box-shadow] duration-150 ease-[var(--ease-out-soft)]",
        "hover:border-border-strong",
        "focus:outline-none focus:border-border-accent focus:bg-surface-2",
        "focus:shadow-[0_0_0_3px_oklch(0.78_0.13_195/0.18)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
