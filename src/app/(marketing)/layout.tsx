import * as React from "react";

/**
 * Marketing route group layout.
 *
 * Currently a pass-through. The placeholder home page in this group
 * carries its own nav + footer because there's only one marketing page
 * for now. When Phase 5 builds out the rest of the marketing site
 * (/how-it-works, /for-owners, /for-builders, /pricing, /blog, …),
 * extract the shared <MarketingNav /> and <MarketingFooter /> here.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
