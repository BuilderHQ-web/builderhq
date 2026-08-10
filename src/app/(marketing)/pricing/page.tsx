import type { Metadata } from "next";
import { resolveNavAuthedHref } from "@/components/landing/cta-links";
import Link from "next/link";

import { MarketingPageShell } from "@/components/landing/page-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { SITE } from "@/lib/seo";
import { UNLOCK_PRICE_AUD } from "@/modules/projects/pricing";

/**
 * /pricing: the whole commercial model on one page.
 *
 * Deliberately the calmest page on the site: two cards, one rate table,
 * one closing statement. Pricing pages earn trust by being boring and
 * complete, so there is no ornament here and no persuasion beyond the
 * facts.
 *
 * The numbers are read from `@/modules/projects/pricing`, the same table
 * the product charges from, so the page cannot drift from the runtime.
 * Change the price there and this page and its Offer structured data
 * both follow.
 */

const DESCRIPTION =
  "Free for homeowners and practices. Builders pay a one off fee per project to take a spot on a round, from $49 to $199 by project type. No subscriptions, no commission.";

export const metadata: Metadata = {
  title: { absolute: "BuilderHQ pricing" },
  description: DESCRIPTION,
  alternates: { canonical: "/pricing" },
  openGraph: {
    type: "website",
    title: "BuilderHQ pricing",
    description: DESCRIPTION,
    url: `${SITE}/pricing`,
  },
};

/** The four project types, cheapest first. Labels and definitions match
 *  the ones an owner sees when they choose a project type in the app. */
const TIERS: Array<{
  type: keyof typeof UNLOCK_PRICE_AUD;
  label: string;
  detail: string;
}> = [
  {
    type: "renovation",
    label: "Renovation",
    detail: "Work to an existing home: kitchen, bathroom, internal.",
  },
  {
    type: "extension",
    label: "Extension",
    detail: "New floor space: ground, first floor or rear.",
  },
  {
    type: "single_dwelling",
    label: "Single dwelling",
    detail: "A new build, one home on the site.",
  },
  {
    type: "multi_dwelling",
    label: "Multi dwelling",
    detail: "A duplex, townhouses, or two or more homes on the site.",
  },
];

const FAQ_LINKS: Array<{ q: string; href: string }> = [
  { q: "What does BuilderHQ cost?", href: "/faq#general" },
  { q: "What does it cost a builder to tender?", href: "/faq#builders" },
  { q: "How is a builder verified?", href: "/faq#verification" },
];

/** Two outline pills, no primary: the floating nav already carries the
 *  page's one primary action. */
const NEXT_STEPS: Array<{ label: string; href: string }> = [
  { label: "Start your project", href: "/signup?role=owner" },
  { label: "Browse open rounds", href: "/signup?role=builder" },
];

/**
 * Offer structured data: one Offer per project type in AUD for the
 * builder side, plus the free side stated as a zero-price Offer so an
 * answer engine reading this page cannot mistake who pays.
 * Both hang off the site Organization emitted by the marketing layout.
 */
function pricingGraph(): Record<string, unknown> {
  const url = `${SITE}/pricing`;
  const seller = { "@id": `${SITE}/#organization` };
  const areaServed = { "@type": "Country", name: "Australia" };

  const offers = TIERS.map((tier) => ({
    "@type": "Offer",
    "@id": `${url}#offer-${tier.type.replace(/_/g, "-")}`,
    name: `Tender spot on a ${tier.label.toLowerCase()} round`,
    description: `${tier.detail} A one off fee for a verified builder to take a spot on the round and price the prepared scope of works.`,
    category: tier.label,
    price: UNLOCK_PRICE_AUD[tier.type],
    priceCurrency: "AUD",
    availability: "https://schema.org/InStock",
    url,
    seller,
  }));

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        "@id": `${url}#run-a-round`,
        name: "Running a tender round on BuilderHQ",
        serviceType: "Residential construction tendering",
        description:
          "Uploading, the scope of works, the evaluation, addenda and the record. Free for homeowners and for the practices that run rounds for their clients.",
        provider: seller,
        areaServed,
        offers: {
          "@type": "Offer",
          "@id": `${url}#offer-run-a-round`,
          name: "Run a tender round",
          price: 0,
          priceCurrency: "AUD",
          availability: "https://schema.org/InStock",
          url,
          seller,
        },
      },
      {
        "@type": "Service",
        "@id": `${url}#tender-spot`,
        name: "Tender spot on a BuilderHQ round",
        serviceType: "Residential construction tendering",
        description:
          "A one off fee for a verified builder to take a spot on an open tender round. Browsing is free, invited rounds are free, and BuilderHQ takes no commission on awarded work.",
        provider: seller,
        areaServed,
        audience: {
          "@type": "BusinessAudience",
          audienceType: "Australian residential builders",
        },
        offers,
      },
    ],
  };
}

export default async function PricingPage() {
  const navAuthedHref = await resolveNavAuthedHref();
  return (
    <MarketingPageShell
      authedHref={navAuthedHref}
      kicker="Pricing"
      title="Simple pricing, in the open."
      sub="Free for the people who run rounds. A one off fee for builders who take a spot. No subscriptions, and no commission on anything."
    >
      <JsonLd data={pricingGraph()} />

      {/* Card 1 · the free side */}
      <section
        aria-labelledby="pricing-owners"
        className="rounded-xl border border-border-subtle bg-white card-elev px-6 sm:px-8 lg:px-10 py-8 sm:py-10"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3">
          <h2
            id="pricing-owners"
            className="font-ui font-semibold tracking-[-0.02em] text-[clamp(1.375rem,1.2vw+1rem,1.75rem)] leading-[1.15] text-text"
          >
            Homeowners and practices
          </h2>
          <p className="font-mono tabular-nums text-[2.25rem] leading-none text-text">
            $0
          </p>
        </div>
        <p className="mt-6 max-w-[58ch] text-[17px] leading-[1.65] text-text-muted">
          Running a round is free. Uploading, the scope of works, the
          evaluation, addenda, the record. All of it.
        </p>
      </section>

      {/* Card 2 · the builder rate table */}
      <section
        aria-labelledby="pricing-builders"
        className="mt-4 rounded-xl border border-border-subtle bg-white card-elev px-6 sm:px-8 lg:px-10 py-8 sm:py-10"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3">
          <h2
            id="pricing-builders"
            className="font-ui font-semibold tracking-[-0.02em] text-[clamp(1.375rem,1.2vw+1rem,1.75rem)] leading-[1.15] text-text"
          >
            Builders
          </h2>
          <p className="font-ui font-semibold text-[11px] tracking-[0.18em] uppercase text-accent-light">
            Per project, one off
          </p>
        </div>

        <ul className="mt-7 border-t border-border-subtle">
          {TIERS.map((tier) => (
            <li
              key={tier.type}
              className="flex items-baseline justify-between gap-5 sm:gap-10 border-b border-border-subtle py-5"
            >
              <div className="min-w-0">
                <p className="font-ui font-semibold text-[16px] leading-[1.4] text-text">
                  {tier.label}
                </p>
                <p className="mt-1.5 text-[16px] leading-[1.65] text-text-muted">
                  {tier.detail}
                </p>
              </div>
              <p className="shrink-0 font-mono tabular-nums text-[1.5rem] leading-none text-text">
                ${UNLOCK_PRICE_AUD[tier.type]}
              </p>
            </li>
          ))}
        </ul>

        <p className="mt-7 max-w-[58ch] text-[16px] leading-[1.65] text-text-muted">
          Browsing is free. Invited rounds are free. The fee applies only when
          you take a spot on an open round.
        </p>
      </section>

      {/* The closing statement, then the places to read further */}
      <section className="mt-10 lg:mt-12 border-t border-border-subtle pt-9">
        <p className="max-w-[60ch] font-ui font-medium text-[17px] leading-[1.6] text-text">
          No commission, either side. The contract is always directly between
          client and builder.
        </p>

        <h2 className="mt-11 font-ui font-semibold text-[11px] tracking-[0.18em] uppercase text-text-muted">
          More in the FAQ
        </h2>
        <ul className="mt-4 flex flex-col gap-2.5">
          {FAQ_LINKS.map((item) => (
            <li key={item.q}>
              <Link
                href={item.href}
                className="text-[16px] leading-[1.65] text-accent-light underline underline-offset-4 decoration-accent-light/35 hover:decoration-accent-light transition-colors duration-[160ms]"
              >
                {item.q}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-11 flex flex-wrap items-center gap-3">
          {NEXT_STEPS.map((step) => (
            <Link
              key={step.href}
              href={step.href}
              className="inline-flex h-12 items-center rounded-full border border-border-strong px-6 font-ui font-medium text-[16px] text-text hover:bg-surface-2 transition-colors duration-[160ms]"
            >
              {step.label}
            </Link>
          ))}
        </div>
      </section>
    </MarketingPageShell>
  );
}
