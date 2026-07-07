/**
 * Shared auth-page primitives.
 *
 * Every page in `(auth)` shares one composition rhythm:
 *
 *   centred brand mark
 *     ↓
 *   tight heading + subtitle (Space Grotesk, mixed-case, HQ extrabold)
 *     ↓
 *   form / informational content
 *     ↓
 *   secondary action / divider (optional)
 *     ↓
 *   legal footer (optional)
 *
 * Buttons and inputs share a single moderate radius (`rounded-xl`,
 * 12px) so they sit as one family. The primary button carries a
 * multi-layer teal halo — inset highlight + 1px ring + soft outer
 * glow — that brightens on hover. That glow is the auth flow's
 * signature affordance.
 *
 * Constants over a wrapping `<Button>` so each page can stay flat
 * and we don't pile up tiny per-page variants of the shared button.
 */

import { cn } from "@/lib/utils";

export const AUTH_CONTAINER_CLS =
  "flex flex-col items-center text-center gap-7";

export const AUTH_HEADING_CLS =
  "font-ui font-semibold tracking-[-0.022em] text-[28px] sm:text-[31px] leading-[1.1] text-text";

export const AUTH_SUBTITLE_CLS =
  "text-[13.5px] text-text-muted font-body leading-[1.5]";

export const AUTH_LABEL_CLS =
  "text-[12.5px] font-ui font-medium tracking-[0.005em] text-text-muted";

export const AUTH_INPUT_CLS =
  "h-11 px-3.5 text-[14px] rounded-xl bg-[rgba(24,34,44,0.05)] border-[rgba(24,34,44,0.1)] hover:border-[rgba(24,34,44,0.16)] focus-visible:border-accent focus-visible:ring-accent/30 placeholder:text-text-faint transition-colors";

export const AUTH_PRIMARY_BUTTON_CLS = cn(
  "group relative w-full h-11 rounded-xl inline-flex items-center justify-center gap-2",
  "bg-accent text-accent-contrast text-[13.5px] font-ui font-semibold tracking-[0.005em]",
  "transition-[background-color,box-shadow,transform] duration-[180ms]",
  "shadow-[inset_0_1px_0_0_rgba(24,34,44,0.28),0_0_0_1px_rgba(0,212,200,0.45),0_0_28px_-2px_rgba(0,212,200,0.55),0_8px_22px_-6px_rgba(0,212,200,0.45)]",
  "hover:bg-accent-hover hover:shadow-[inset_0_1px_0_0_rgba(24,34,44,0.34),0_0_0_1px_rgba(0,212,200,0.55),0_0_36px_-2px_rgba(0,212,200,0.75),0_12px_28px_-6px_rgba(0,212,200,0.65)]",
  "active:translate-y-[0.5px]",
  "disabled:opacity-55 disabled:cursor-not-allowed disabled:shadow-[inset_0_1px_0_0_rgba(24,34,44,0.15)]",
);

export const AUTH_SECONDARY_BUTTON_CLS = cn(
  "w-full h-11 rounded-xl inline-flex items-center justify-center gap-2",
  "bg-[rgba(24,34,44,0.07)] hover:bg-[rgba(24,34,44,0.1)] text-text text-[13px] font-ui font-semibold",
  "border border-[rgba(24,34,44,0.12)] hover:border-[rgba(24,34,44,0.2)] transition-colors",
  "shadow-[inset_0_1px_0_0_rgba(24,34,44,0.06)]",
  "disabled:opacity-55 disabled:cursor-not-allowed",
);

export const AUTH_DIVIDER_CLS = "w-full flex items-center gap-3";
export const AUTH_DIVIDER_LINE_CLS = "flex-1 h-px bg-[rgba(24,34,44,0.09)]";
export const AUTH_DIVIDER_TEXT_CLS =
  "text-[10px] tracking-[0.24em] uppercase text-text-faint font-ui font-semibold";

export const AUTH_LEGAL_CLS =
  "text-[11.5px] text-text-faint leading-[1.5] font-body mt-1";

export const AUTH_LEGAL_LINK_CLS =
  "underline underline-offset-2 decoration-[rgba(24,34,44,0.18)] hover:text-text-muted hover:decoration-text-muted transition-colors";
