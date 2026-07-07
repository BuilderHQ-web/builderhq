import { Landing } from "@/components/landing/v2/landing";
import { resolveCtaLinks } from "@/components/landing/cta-links";

/**
 * Marketing home — Landing v2, the three-lens page.
 *
 * One page that speaks to homeowners by default (ad traffic converts
 * with zero interaction) and re-tunes itself for builders and
 * architects when they self-select in the hero. `/for/builders` and
 * `/for/architects` render the same composition with the lens
 * pre-selected for targeted campaigns.
 *
 * Auth-aware: signed-in visitors get their dashboard as the primary
 * CTA regardless of lens (resolveCtaLinks is the existing role map).
 */
export default async function MarketingHome() {
  const cta = await resolveCtaLinks();
  const authedHref = /^\/(owner|builder|admin)/.test(cta.primary.href)
    ? cta.primary.href
    : null;

  return <Landing authedHref={authedHref} />;
}
