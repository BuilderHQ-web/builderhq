"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, type ReactNode } from "react";

/**
 * Primary CTA used by every page in the /start funnel.
 *
 * Preserves UTM params from the original ad click as the user moves
 * step → step, so Google Ads conversion attribution works end-to-end.
 * Without this, deep-clicked steps lose `utm_*` and conversions can't
 * be tied back to the keyword.
 */

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
] as const;

interface Props {
  children: ReactNode;
  /** Override the destination. Defaults to /start/type (begin funnel). */
  href?: string;
  /** Size variant. Default is the large hero size. */
  size?: "lg" | "md";
  /** Visual variant. Default `primary` (teal gradient). */
  variant?: "primary" | "ghost";
}

export function StartCta({
  children,
  href = "/start/type",
  size = "lg",
  variant = "primary",
}: Props) {
  const search = useSearchParams();
  const target = useMemo(() => {
    const params = new URLSearchParams();
    for (const k of UTM_KEYS) {
      const v = search.get(k);
      if (v) params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `${href}?${qs}` : href;
  }, [href, search]);

  const base =
    "group inline-flex items-center justify-center gap-2 rounded-full font-ui font-semibold tracking-[0.01em] transition-all duration-200 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
  const sizing =
    size === "lg"
      ? "h-12 px-7 text-[15px]"
      : "h-10 px-5 text-[13.5px]";

  const visual =
    variant === "primary"
      ? "bg-gradient-to-r from-[#00d4c8] via-[#1ea3f0] to-[#3b82f6] text-[#031118] shadow-[0_8px_24px_rgba(0,212,200,0.32)] hover:shadow-[0_10px_32px_rgba(0,212,200,0.42)]"
      : "border border-border-strong bg-surface-1/60 text-text hover:bg-surface-1";

  return (
    <Link href={target} className={`${base} ${sizing} ${visual}`}>
      {children}
    </Link>
  );
}
