"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { type ReactNode } from "react";

/**
 * The primary forward CTA every step uses. Two visual states:
 *   · enabled — full teal gradient
 *   · disabled — muted glass surface, no shadow
 *
 * Pinned by the step body, not the shell — each step controls when
 * "Continue" becomes pressable (e.g. after the user picks an option).
 */

interface Props {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** Override the label. Defaults to "Continue". Step 6 uses "Send my link". */
  children?: ReactNode;
}

export function QuizNext({ onClick, disabled, loading, children = "Continue" }: Props) {
  const isDisabled = Boolean(disabled || loading);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className={[
        "group inline-flex items-center justify-center gap-2 rounded-full h-12 px-7 text-[14.5px] font-ui font-semibold transition-all duration-200 active:scale-[0.98]",
        isDisabled
          ? "bg-surface-1/40 text-text-faint cursor-not-allowed border border-border-subtle"
          : "bg-gradient-to-r from-[#00d4c8] via-[#1ea3f0] to-[#3b82f6] text-[#031118] shadow-[0_8px_24px_rgba(0,212,200,0.32)] hover:shadow-[0_10px_32px_rgba(0,212,200,0.42)]",
      ].join(" ")}
    >
      {loading ? (
        <>
          <Loader2 size={15} strokeWidth={2.2} className="animate-spin" />
          Working…
        </>
      ) : (
        <>
          {children}
          <ArrowRight
            size={15}
            strokeWidth={2.2}
            className="group-hover:translate-x-0.5 transition-transform duration-200"
          />
        </>
      )}
    </button>
  );
}
