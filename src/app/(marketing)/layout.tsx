import * as React from "react";

import { JsonLd } from "@/components/seo/json-ld";
import { siteGraph } from "@/lib/seo";

/**
 * Marketing route group layout.
 *
 * Carries the site-wide structured data (Organization + WebSite) so
 * every public page states the BuilderHQ entity for search, answer and
 * generative engines. Individual pages add their own page-specific
 * schema (partner, collection, FAQ, article) on top.
 *
 * Otherwise a pass-through: marketing pages compose their own nav +
 * footer via MarketingPageShell / the landing composition.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={siteGraph()} />
      {children}
    </>
  );
}
