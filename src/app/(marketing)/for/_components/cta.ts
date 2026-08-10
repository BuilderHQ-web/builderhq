import { resolveCtaLinks } from "@/components/landing/cta-links";

import type { Cta } from "./sections";

/**
 * The page's one primary action, auth-aware. A signed-in visitor is
 * sent to their own dashboard rather than to a signup they have
 * already been through; everyone else gets the page's own call.
 */
export async function resolvePrimaryCta(fallback: Cta): Promise<Cta> {
  const { primary } = await resolveCtaLinks();
  return /^\/(owner|builder|admin)/.test(primary.href)
    ? { label: "Open your dashboard", href: primary.href }
    : fallback;
}
