"use client";

/**
 * Google Analytics 4.
 *
 * WHY IT OWNS ITS BOOT, like the Meta pixel does. Google's own snippet
 * sends a page view the instant it runs, and every page view carries
 * `page_location`: the full address, path and all. Some addresses here
 * must never leave the origin, because for them the path is the secret.
 * A password reset link, an account claim, an invitation, an email
 * verification. Pasting Google's snippet into the layout would send
 * every one of those to an American analytics service the first time
 * somebody clicked a link in their email.
 *
 * So the decision comes first and the script second, and the rule is
 * the same one the advertising pixel uses. One rule, one place, in
 * lib/meta-url.
 *
 * WHERE IT MOUNTS. Marketing and auth only. Never the signed-in
 * application, whose URLs name a client's project type and suburb.
 *
 * WHEN IT RUNS. Only when NEXT_PUBLIC_GA_MEASUREMENT_ID is set, which
 * is Vercel's Production scope alone, so development and preview
 * browsing never pollutes the property.
 */

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { env } from "@/lib/env";
import { isReportableTrackingUrl } from "@/lib/meta-url";

declare global {
  interface Window {
    // Matches the declarations in the Google Ads conversion components,
    // so the two merge instead of colliding.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dataLayer?: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gtag?: (...args: any[]) => void;
  }
}

/** Per document, not per mount: crossing route groups remounts this. */
let booted = false;
let lastTrackedPath: string | null = null;

function bootGtag(measurementId: string): void {
  if (window.gtag) return;
  window.dataLayer = window.dataLayer || [];
  const gtag: NonNullable<Window["gtag"]> = function (...args: unknown[]) {
    window.dataLayer?.push(args);
  };
  window.gtag = gtag;
  gtag("js", new Date());
  // We send page views ourselves, once we have decided the address is
  // reportable. Google's automatic one cannot be held back any other way.
  gtag("config", measurementId, { send_page_view: false });

  const tag = document.createElement("script");
  tag.async = true;
  tag.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(tag);
}

export function GoogleAnalytics() {
  const measurementId = env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const pathname = usePathname();

  useEffect(() => {
    if (!measurementId || !pathname) return;

    // Read from the document rather than useSearchParams, which would
    // opt every marketing page out of static rendering.
    if (!isReportableTrackingUrl(pathname, window.location.search)) return;

    if (!booted) {
      booted = true;
      bootGtag(measurementId);
    }
    if (lastTrackedPath === pathname) return;
    lastTrackedPath = pathname;

    // The address is sent explicitly, stripped of everything but the
    // campaign parameters, so a page that carries an id or a token in
    // its query never reports one.
    const url = new URL(window.location.href);
    const kept = new URLSearchParams();
    for (const [k, v] of url.searchParams) {
      if (k.startsWith("utm_")) kept.set(k, v);
    }
    const query = kept.toString();
    window.gtag?.("event", "page_view", {
      page_location: `${url.origin}${url.pathname}${query ? `?${query}` : ""}`,
      page_path: url.pathname,
      page_title: document.title,
    });
  }, [measurementId, pathname]);

  return null;
}

/**
 * Send an event to GA4. A no-op when the tag is absent, blocked, or on
 * the server, so a call site never needs to guard.
 *
 * Never pass personal information. GA4's terms forbid it and Google
 * deletes data found to contain it, which takes the surrounding events
 * with it.
 */
export function trackGaEvent(
  event: string,
  params?: Record<string, string | number | boolean | null>,
): void {
  if (typeof window === "undefined") return;
  window.gtag?.("event", event, params);
}
