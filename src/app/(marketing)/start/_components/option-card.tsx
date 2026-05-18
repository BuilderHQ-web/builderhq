"use client";

import { ArrowRight, Check } from "lucide-react";
import { type ReactNode } from "react";

/**
 * The visual primitive for every "pick one of N" step. Used in:
 *   · Step 1 (project type — 4 cards)
 *   · Step 3 renovation scope + extension type
 *   · Step 4 (timeline — 5 chips)
 *   · Step 5 (budget — 5 chips)
 *
 * Three sizes:
 *   · "card" — 2-column layout with icon + title + body. For the
 *     headline picks (project type).
 *   · "row"  — full-width single-line picker. For mid-funnel
 *     "pick one of 5" choices where copy is short.
 *   · "chip" — pill button. For numeric / band picks.
 *
 * All sizes share the same hover/selected visual language: subtle
 * teal border lift on hover, full teal + check icon on selected.
 */

interface BaseProps {
  title: string;
  selected: boolean;
  onSelect: () => void;
}

interface CardProps extends BaseProps {
  variant: "card";
  copy: string;
  icon: ReactNode;
}

interface RowProps extends BaseProps {
  variant: "row";
  copy?: string;
  icon?: ReactNode;
}

interface ChipProps extends BaseProps {
  variant: "chip";
}

export function OptionCard(props: CardProps | RowProps | ChipProps) {
  const { selected, onSelect, title } = props;

  if (props.variant === "chip") {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={[
          "group relative inline-flex items-center justify-center gap-2 rounded-full px-5 h-12 text-[13.5px] font-ui font-semibold transition-all duration-200 active:scale-[0.98]",
          selected
            ? "border border-accent bg-accent-muted text-accent-light shadow-[0_4px_24px_rgba(0,212,200,0.18)]"
            : "border border-border-strong bg-surface-1/40 text-text hover:border-border-accent hover:bg-surface-1/70",
        ].join(" ")}
      >
        {selected ? (
          <Check size={14} strokeWidth={2.4} className="text-accent" />
        ) : null}
        {title}
      </button>
    );
  }

  if (props.variant === "row") {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={[
          "group relative w-full text-left flex items-center gap-4 rounded-2xl border px-5 py-4 transition-all duration-200 active:scale-[0.99] overflow-hidden",
          selected
            ? "border-accent bg-accent-muted/60"
            : "border-border bg-surface-1/40 hover:border-border-accent hover:bg-surface-1/70",
        ].join(" ")}
      >
        {/* Hover glow */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background:
              "radial-gradient(120% 80% at 0% 0%, rgba(0,212,200,0.10), transparent 60%)",
          }}
        />
        {props.icon ? (
          <span
            className={[
              "relative inline-flex items-center justify-center size-9 rounded-lg border shrink-0 transition-colors",
              selected
                ? "border-accent bg-accent-muted text-accent-light"
                : "border-border-subtle bg-surface-0/60",
            ].join(" ")}
          >
            {props.icon}
          </span>
        ) : null}
        <div className="relative flex-1 min-w-0">
          <p
            className={[
              "font-ui font-semibold text-[14.5px] tracking-[-0.005em] transition-colors",
              selected ? "text-accent-light" : "text-text",
            ].join(" ")}
          >
            {title}
          </p>
          {props.copy ? (
            <p className="mt-0.5 text-text-muted text-[12.5px] leading-[1.5] font-body">
              {props.copy}
            </p>
          ) : null}
        </div>
        {selected ? (
          <Check
            size={16}
            strokeWidth={2.2}
            className="text-accent shrink-0 relative"
          />
        ) : (
          <ArrowRight
            size={14}
            strokeWidth={1.8}
            className="text-text-faint group-hover:text-accent-light group-hover:translate-x-0.5 transition-all duration-200 relative shrink-0"
          />
        )}
      </button>
    );
  }

  // card variant
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={[
        "group relative text-left rounded-2xl border transition-all duration-200 p-5 sm:p-6 overflow-hidden active:scale-[0.99]",
        selected
          ? "border-accent bg-accent-muted/60 shadow-[0_8px_32px_rgba(0,212,200,0.16)]"
          : "border-border bg-surface-1/40 hover:border-border-accent hover:bg-surface-1/70",
      ].join(" ")}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background:
            "radial-gradient(120% 80% at 0% 0%, rgba(0,212,200,0.10), transparent 60%)",
        }}
      />
      <div className="relative flex items-start gap-3.5">
        <span
          className={[
            "mt-0.5 inline-flex items-center justify-center size-10 rounded-lg border transition-colors shrink-0",
            selected
              ? "border-accent bg-accent-muted text-accent-light"
              : "border-border-subtle bg-surface-0/60",
          ].join(" ")}
        >
          {props.icon}
        </span>
        <div className="flex-1 min-w-0">
          <h3
            className={[
              "font-ui font-semibold text-[16px] tracking-[-0.005em] transition-colors",
              selected ? "text-accent-light" : "text-text",
            ].join(" ")}
          >
            {title}
          </h3>
          <p className="mt-1.5 text-text-muted text-[13px] leading-[1.55] font-body">
            {props.copy}
          </p>
        </div>
        {selected ? (
          <Check
            size={16}
            strokeWidth={2.4}
            className="text-accent relative shrink-0 mt-1"
          />
        ) : (
          <ArrowRight
            size={16}
            strokeWidth={1.8}
            className="text-text-faint group-hover:text-accent-light group-hover:translate-x-0.5 transition-all duration-200 relative shrink-0 mt-1"
          />
        )}
      </div>
    </button>
  );
}
