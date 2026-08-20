/**
 * Every route into the product demo, labelled the same way.
 *
 * The demo is the strongest intent signal on the public site: somebody
 * who watches it has understood what the product does, and a campaign
 * that produces demo watchers is working even before anybody signs up.
 * Until now a click on it was recorded as `hero_cta` with a button
 * label, which cannot tell you which of the three pages it happened on,
 * where on that page, or which demo it opened.
 *
 * One event with three dimensions replaces that: the lens the visitor
 * was reading, the position on the page, and the demo it leads to.
 * Source, device and session are added by the server, so a call site
 * never has to think about them.
 */

import { track } from "@/lib/analytics";

/** Where on the page the link sits. */
export type DemoPlacement = "hero" | "journey_step" | "closing" | "nav";

/** Which demo a link opens, or null when it is not a demo link at all. */
export function demoTarget(href: string): string | null {
  const path = href.split(/[?#]/)[0] ?? "";
  if (path === "/demo") return "homeowner";
  if (path === "/demo/builder") return "builder";
  if (path === "/demo/architect") return "architect";
  return null;
}

/**
 * Safe to call on any call to action. It reports nothing unless the
 * link actually opens a demo, so a shared button component can call it
 * without its caller knowing where the link points.
 */
export function trackDemoCta(opts: {
  href: string;
  lens: string;
  placement: DemoPlacement;
  label: string;
}): void {
  const destination = demoTarget(opts.href);
  if (!destination) return;
  track("demo_cta_click", {
    lens: opts.lens,
    placement: opts.placement,
    destination,
    label: opts.label,
  });
}
