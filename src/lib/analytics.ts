/**
 * analytics — one thin wrapper around Vercel Web Analytics custom events.
 *
 * Every conversion-relevant moment on the marketing site funnels through
 * `track()` so the event vocabulary lives in one place and call sites never
 * crash if the analytics runtime isn't available (blocked, SSR, dev).
 *
 * Event vocabulary (keep this list current):
 *   lens_selected            { role, source: "selector" | "nav" }
 *   hero_cta                 { role, label }
 *   close_cta                { role, label }
 *   partner_modal_opened     { mode }        — architect | finance | intro
 *   partner_modal_submitted  { mode }
 *   section_viewed           { id }          — once per section per pageview
 *
 * Pageviews come from <Analytics /> in the root layout. Custom events
 * require Web Analytics enabled on the Vercel project (Pro plan); on
 * plans without custom events they no-op harmlessly.
 */

import { track as vercelTrack } from "@vercel/analytics";

type EventProps = Record<string, string | number | boolean | null>;

export function track(event: string, props?: EventProps): void {
  try {
    vercelTrack(event, props);
  } catch {
    /* Analytics must never break the page. */
  }
}
