import * as React from "react";

import { SmoothScroll } from "@/components/landing/smooth-scroll";

/**
 * Marketing route group layout.
 *
 * Mounts <SmoothScroll /> at the root so Lenis-driven smooth scroll +
 * GSAP ScrollTrigger choreography are active across every marketing
 * page (/, /about, /faq, /privacy, /terms, /guide, …). The component
 * is a render-nothing side-effect — it sets up a global raf loop on
 * mount and tears it down on unmount.
 *
 * Self-disables on touch devices + reduced-motion users; see the
 * component header for the off-switch logic. App (dashboard) routes
 * sit in a different route group and are NOT affected — they keep
 * native scroll, which is the right call for data-dense product
 * surfaces.
 *
 * Marketing pages still carry their own nav + footer for now. When
 * Phase 5 ships /pricing, /how-it-works etc., extract a shared
 * <MarketingNav /> + <MarketingFooter /> here.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SmoothScroll />
      {children}
    </>
  );
}
