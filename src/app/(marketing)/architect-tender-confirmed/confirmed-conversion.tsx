"use client";

/**
 * Fires the "Architect Tender Confirmed" Google Ads conversion on
 * /architect-tender-confirmed mount. Mirrors the same approach as
 * /guide-confirmed:
 *   · Same Google Ads account (AW-18140811034).
 *   · A NEW conversion label specific to this campaign — see the
 *     `CONVERSION_LABEL` placeholder below. You must create the
 *     conversion action in Google Ads ("Architect Tender Confirmed",
 *     category "Submit lead form", value A$200) and paste the
 *     generated label here. Until then the event fires but Ads
 *     won't recognise it.
 *   · Value attribution: A$200 (architect-confirmed onboarding is
 *     considered a high-intent lead given the council scope and
 *     manual qualification on the back end).
 *
 * Loads gtag.js inline if it hasn't been mounted globally yet, then
 * fires the conversion + a GA4 analytics event. The script tag is
 * added in a side-effect on mount so SSR HTML stays clean.
 */

import { useEffect } from "react";
import { ensureGtag } from "@/components/analytics/google-analytics";

const GOOGLE_ADS_ACCOUNT = "AW-18140811034";

// TODO: replace with the actual conversion label once the "Architect
// Tender Confirmed" conversion is created in Google Ads. Format is the
// random string you copy out of the Ads UI after creating the action —
// e.g. "abcDEFghi_jkLMnoPqr". The fallback below is intentional so the
// event still fires in GA4 even before Ads is configured.
const CONVERSION_LABEL = "REPLACE_WITH_ARCHITECT_TENDER_LABEL";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dataLayer?: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gtag?: (...args: any[]) => void;
  }
}

export function ConfirmedConversion() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    // One shared loader. This block used to be hand rolled here and
    // pushed a rest-parameter array into the dataLayer instead of the
    // `arguments` object, which gtag.js ignores. The library loaded,
    // the queue filled, and no conversion was ever sent.
    ensureGtag(GOOGLE_ADS_ACCOUNT);
    window.gtag?.("config", GOOGLE_ADS_ACCOUNT);

    // Google Ads conversion — fires only once the conversion label is
    // wired up. Until then the event lands in dataLayer but Ads ignores
    // it. We still fire it so any future label swap reports historical
    // conversions correctly.
    window.gtag?.("event", "conversion", {
      send_to: `${GOOGLE_ADS_ACCOUNT}/${CONVERSION_LABEL}`,
      value: 200.0,
      currency: "AUD",
    });

    // GA4 analytics event — independent of Ads. Useful for funnel +
    // dashboard analysis regardless of paid-acquisition wiring.
    window.gtag?.("event", "architect_tender_confirmed", {
      event_category: "lead_generation",
      event_label: "architect_outreach_moonee_valley_merribek",
      value: 200,
      currency: "AUD",
    });
  }, []);

  return null;
}
