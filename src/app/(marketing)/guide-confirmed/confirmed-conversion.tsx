"use client";

/**
 * Fires the Google Ads + GA4 conversion events when the confirmation
 * page loads. Mirrors the Bubble version exactly — same account
 * (AW-18140811034), same conversion label (KM0WCOa5_aocEJqem8pD),
 * same $20 AUD value attribution, so the Ads dashboard sees no
 * discontinuity in conversion tracking across the platform migration.
 *
 * Loads the gtag.js loader inline if it hasn't been added globally
 * yet (it hasn't — we'll add it project-wide later). Once loaded,
 * `gtag('event', 'conversion', …)` fires. The script tag is mounted
 * via a side-effect on mount so SSR HTML stays clean.
 */

import { useEffect } from "react";

const GOOGLE_ADS_ACCOUNT = "AW-18140811034";
const CONVERSION_LABEL = "KM0WCOa5_aocEJqem8pD";

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
    // Idempotent loader — bail if gtag is already present (e.g. another
    // page already mounted the script).
    if (typeof window === "undefined") return;
    if (!window.gtag) {
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ACCOUNT}`;
      document.head.appendChild(script);

      window.dataLayer = window.dataLayer || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      window.gtag = function (...args: any[]) {
        window.dataLayer!.push(args);
      };
      window.gtag("js", new Date());
      window.gtag("config", GOOGLE_ADS_ACCOUNT);
    }

    // Fire the Google Ads conversion + a GA4 event for analytics
    // dashboards. Both end up in the same dataLayer.
    window.gtag?.("event", "conversion", {
      send_to: `${GOOGLE_ADS_ACCOUNT}/${CONVERSION_LABEL}`,
      value: 20.0,
      currency: "AUD",
    });
    window.gtag?.("event", "guide_download_confirmed", {
      event_category: "lead_generation",
      event_label: "melbourne_build_brief",
    });
  }, []);

  return null;
}
