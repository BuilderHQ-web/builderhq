import { Landing } from "@/components/landing/v2/landing";
import { resolveCtaLinks } from "@/components/landing/cta-links";

/**
 * Marketing home — Landing v2.
 *
 * One page in one voice, written for every side of a tender round with
 * the homeowner as the default reader, so ad traffic converts with zero
 * interaction. Architects and builders get the full argument in their
 * own vocabulary at /for/architects and /for/builders.
 *
 * Auth-aware: a signed-in visitor gets their dashboard as the primary
 * action everywhere on the page (resolveCtaLinks is the existing role
 * map).
 */
export default async function MarketingHome() {
  const cta = await resolveCtaLinks();
  const authedHref = /^\/(owner|builder|admin)/.test(cta.primary.href)
    ? cta.primary.href
    : null;

  return <Landing authedHref={authedHref} />;
}
