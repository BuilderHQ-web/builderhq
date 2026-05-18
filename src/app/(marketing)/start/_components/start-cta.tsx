import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { StartCtaInner } from "./start-cta-inner";

/**
 * Primary CTA used by every page in the /start funnel.
 *
 * Renders a Suspense-wrapped client inner component that pulls UTM
 * params off the URL and appends them to the destination href.
 * Wrapping here (rather than at every call site) lets the rest of
 * the funnel pages stay clean — and prevents the Next.js static
 * prerender from bailing out with the "useSearchParams without a
 * Suspense boundary" error on /start.
 *
 * Fallback during SSR / param-resolve: a plain link with no UTMs
 * preserved. The full hydrated client component takes over on
 * mount and re-appends them, so first-paint is fast even without
 * UTM data baked in.
 */

interface Props {
  children: ReactNode;
  /** Override the destination. Defaults to /start/type (begin funnel). */
  href?: string;
  /** Size variant. Default is the large hero size. */
  size?: "lg" | "md";
  /** Visual variant. Default `primary` (teal gradient). */
  variant?: "primary" | "ghost";
}

function ctaClassName({
  size = "lg",
  variant = "primary",
}: Pick<Props, "size" | "variant">): string {
  const base =
    "group inline-flex items-center justify-center gap-2 rounded-full font-ui font-semibold tracking-[0.01em] transition-all duration-200 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
  const sizing =
    size === "lg" ? "h-12 px-7 text-[15px]" : "h-10 px-5 text-[13.5px]";
  const visual =
    variant === "primary"
      ? "bg-gradient-to-r from-[#00d4c8] via-[#1ea3f0] to-[#3b82f6] text-[#031118] shadow-[0_8px_24px_rgba(0,212,200,0.32)] hover:shadow-[0_10px_32px_rgba(0,212,200,0.42)]"
      : "border border-border-strong bg-surface-1/60 text-text hover:bg-surface-1";
  return `${base} ${sizing} ${visual}`;
}

export function StartCta(props: Props) {
  const { children, href = "/start/type", size, variant } = props;
  const className = ctaClassName({ size, variant });
  return (
    <Suspense fallback={<Link href={href} className={className}>{children}</Link>}>
      <StartCtaInner {...props} className={className} />
    </Suspense>
  );
}
