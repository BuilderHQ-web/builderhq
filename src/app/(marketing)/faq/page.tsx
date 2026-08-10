import { resolveNavAuthedHref } from "@/components/landing/cta-links";
import { MarketingPageShell } from "@/components/landing/page-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { faqPageGraph } from "@/lib/seo";

import { FAQ_SCHEMA_ITEMS } from "./faq-schema";
import { FAQContent } from "./faq-content";

/**
 * /faq. Categorised, accordion-driven, calm. One question open at a
 * time, the same UX language as the home page's question section.
 *
 * Every word on this page lives in ./faq-schema.ts, which also derives
 * the FAQPage structured data from the same array. Edit the copy there,
 * never here, and the page and the schema stay identical by
 * construction.
 */



export default async function FAQPage() {
  const navAuthedHref = await resolveNavAuthedHref();
  return (
    <MarketingPageShell
      authedHref={navAuthedHref}
      kicker="Help centre"
      title="The honest answers."
      sub="What homeowners, architects and builders ask before they run their first round. If your question is not here, email us and we will add it."
    >
      <JsonLd data={faqPageGraph(FAQ_SCHEMA_ITEMS)} />
      <FAQContent />
    </MarketingPageShell>
  );
}
