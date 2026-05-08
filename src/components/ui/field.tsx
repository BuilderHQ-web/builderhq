"use client";

/**
 * Field — shared label / control / hint / error rhythm.
 *
 * Every form ad-hoc'd this layout. Wrap any single control in a
 * <Field> and you get:
 *
 *   ┌──────────────────────────────────────────────┐
 *   │  Label · optional                            │
 *   │  ┌────────────────────────────────────────┐  │
 *   │  │ <Input>                                │  │
 *   │  └────────────────────────────────────────┘  │
 *   │  Helper text                                 │
 *   │  ⚠  Error message                           │
 *   └──────────────────────────────────────────────┘
 *
 * The Field auto-associates label↔control via aria-describedby for
 * screen readers, and applies aria-invalid to the inner control when
 * `error` is set so the existing focus-ring colour swap fires.
 *
 * Pass either an `id` (which we apply to the rendered control if it
 * accepts htmlFor) or wrap a control that has its own id — both work.
 */

import { useId } from "react";
import { AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";

interface FieldProps {
  /** Visible label text. Use null / undefined to hide (rare). */
  label?: React.ReactNode;
  /** Marks the field as required visually. Doesn't add HTML required. */
  required?: boolean;
  /** Optional uppercase suffix shown to the right of the label —
   *  e.g. "Optional", "Recommended", "GST inclusive". */
  badge?: React.ReactNode;
  /** Quiet helper copy under the control. */
  hint?: React.ReactNode;
  /** Counter / footer text aligned to the right of the helper row. */
  trailing?: React.ReactNode;
  /** Set to a string to render an error message + flip aria-invalid. */
  error?: string | null;
  /** The control. Single element preferred so `aria-invalid` can
   *  forward; an arbitrary tree is fine but won't auto-mark invalid. */
  children: React.ReactNode;
  /** Class on the outer wrapper. */
  className?: string;
  /** Class on the gap row between control and helper. */
  rowClassName?: string;
}

export function Field({
  label,
  required,
  badge,
  hint,
  trailing,
  error,
  children,
  className,
  rowClassName,
}: FieldProps) {
  const reactId = useId();
  const hintId = hint ? `${reactId}-hint` : undefined;
  const errorId = error ? `${reactId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  // If `children` is a single element, forward aria-invalid + aria-describedby
  // so consumers don't have to thread these manually.
  let control: React.ReactNode = children;
  if (
    typeof children === "object" &&
    children !== null &&
    "props" in children &&
    "type" in children
  ) {
    const child = children as React.ReactElement<{
      "aria-invalid"?: boolean;
      "aria-describedby"?: string;
    }>;
    control = {
      ...child,
      props: {
        ...child.props,
        "aria-invalid": child.props["aria-invalid"] ?? !!error,
        "aria-describedby":
          [child.props["aria-describedby"], describedBy]
            .filter(Boolean)
            .join(" ") || undefined,
      },
    } as React.ReactElement;
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label !== undefined && label !== null ? (
        <div className="flex items-baseline justify-between gap-2">
          <label
            className="text-[11px] tracking-[0.04em] text-text-muted font-medium"
          >
            {label}
            {required ? (
              <span className="text-accent ml-1" aria-hidden>
                *
              </span>
            ) : null}
          </label>
          {badge ? (
            <span className="text-[10px] tracking-[0.16em] uppercase text-text-dim">
              {badge}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className={cn("min-w-0", rowClassName)}>{control}</div>

      {(hint || trailing || error) && (
        <div className="flex items-start justify-between gap-3 min-h-[14px]">
          <div className="min-w-0 flex flex-col gap-0.5">
            {error ? (
              <p
                id={errorId}
                className="inline-flex items-center gap-1.5 text-[11.5px] leading-[1.4] text-danger"
              >
                <AlertTriangle className="size-3 shrink-0" />
                {error}
              </p>
            ) : hint ? (
              <p id={hintId} className="text-[11.5px] leading-[1.5] text-text-dim">
                {hint}
              </p>
            ) : null}
          </div>
          {trailing ? (
            <span className="text-[10.5px] tracking-[0.04em] text-text-faint shrink-0">
              {trailing}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
