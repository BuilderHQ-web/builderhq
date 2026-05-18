"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, type ReactNode } from "react";

/**
 * Client-side inner for <StartCta />. Lives in its own file so the
 * server wrapper can render the Suspense boundary without itself
 * being a client component (which would force the whole page client-
 * side).
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
  href?: string;
  className: string;
}

export function StartCtaInner({ children, href = "/start/type", className }: Props) {
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
  return (
    <Link href={target} className={className}>
      {children}
    </Link>
  );
}
