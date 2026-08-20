import * as React from "react";

import { JsonLd } from "@/components/seo/json-ld";
import { MetaPixel } from "@/components/analytics/meta-pixel";
import { AttributionCapture } from "@/components/analytics/attribution-capture";
import { siteGraph } from "@/lib/seo";

/**
 * Marketing route group layout.
 *
 * Carries the site-wide structured data (Organization + WebSite) so
 * every public page states the BuilderHQ entity for search, answer and
 * generative engines. Individual pages add their own page-specific
 * schema (partner, collection, FAQ, article) on top.
 *
 * Also mounts the Meta Pixel. Marketing and auth are the only two
 * surfaces that carry it: they are where advertising traffic lands and
 * where an account is created, and they hold nothing private. It is
 * deliberately absent from the signed-in application, which is what the
 * privacy policy tells visitors.
 *
 * Otherwise a pass-through: marketing pages compose their own nav +
 * footer via MarketingPageShell / the landing composition.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={siteGraph()} />
      <MetaPixel />
      <AttributionCapture />
      {children}
    </>
  );
}
