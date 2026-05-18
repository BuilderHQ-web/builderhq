"use client";

import { useId, type InputHTMLAttributes } from "react";

/**
 * The text input primitive used across the quiz. Minimal chrome —
 * a single-line input with a low-key label above, no border-box on
 * focus. The focus state lifts the bottom edge to accent-teal.
 */

interface Props
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "onChange"> {
  label: string;
  hint?: string;
  error?: string | null;
  onChange: (value: string) => void;
}

export function TextField({
  label,
  hint,
  error,
  onChange,
  className,
  ...rest
}: Props) {
  const id = useId();
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="block text-[10px] tracking-[0.18em] uppercase text-text-faint font-ui font-semibold mb-1.5"
      >
        {label}
      </label>
      <input
        id={id}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
        className={[
          "w-full h-12 rounded-lg border bg-surface-0/60 px-4 text-[15px] text-text font-body placeholder:text-text-faint transition-colors",
          error
            ? "border-warning/60 focus:border-warning focus:bg-surface-0"
            : "border-border focus:border-border-accent focus:bg-surface-0",
          "focus:outline-none",
          rest.disabled ? "opacity-60" : "",
        ].join(" ")}
      />
      {error ? (
        <p className="mt-1.5 text-[11.5px] text-warning font-body">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[11.5px] text-text-faint font-body">{hint}</p>
      ) : null}
    </div>
  );
}
