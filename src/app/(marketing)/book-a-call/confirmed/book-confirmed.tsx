"use client";

/**
 * Client island for /book-a-call/confirmed.
 *
 * Two jobs:
 *   1. Fire the "Book Call Confirmed" Google Ads conversion + a GA4
 *      event on mount (same approach as the other confirmed pages).
 *   2. Render the Cal.com booking embed — themed dark to match the
 *      lander, and PREFILLED with the name + email passed through the
 *      query string so the visitor picks a slot without retyping.
 *
 * Falls back to a "we'll call you" message if no Cal link is configured
 * (NEXT_PUBLIC_CAL_LINK empty), so the page is never broken.
 *
 * Reads useSearchParams → must be rendered under a <Suspense> boundary.
 */

import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { env } from "@/lib/env";
import { ensureGtag } from "@/components/analytics/google-analytics";

const GOOGLE_ADS_ACCOUNT = "AW-18140811034";
// TODO: create a "Book Call Confirmed" conversion action in Google Ads
// (category "Book appointment", value A$150) and paste its label here.
// Until then the event still fires into dataLayer so a later label swap
// reports historical conversions.
const CONVERSION_LABEL = "REPLACE_WITH_BOOK_CALL_LABEL";
const DEFAULT_CAL_LINK = "builderhq/builderhq-free-15-min-call";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dataLayer?: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gtag?: (...args: any[]) => void;
  }
}

export function BookConfirmed() {
  const searchParams = useSearchParams();
  const name = searchParams.get("name") ?? "";
  const email = searchParams.get("email") ?? "";

  useEffect(() => {
    if (typeof window === "undefined") return;
    // One shared loader. This block used to be hand rolled here and
    // pushed a rest-parameter array into the dataLayer instead of the
    // `arguments` object, which gtag.js ignores. The library loaded,
    // the queue filled, and no conversion was ever sent.
    ensureGtag(GOOGLE_ADS_ACCOUNT);
    window.gtag?.("config", GOOGLE_ADS_ACCOUNT);

    window.gtag?.("event", "conversion", {
      send_to: `${GOOGLE_ADS_ACCOUNT}/${CONVERSION_LABEL}`,
      value: 150.0,
      currency: "AUD",
    });
    window.gtag?.("event", "book_call_confirmed", {
      event_category: "lead_generation",
      event_label: "book_a_call_google_ads",
      value: 150,
      currency: "AUD",
    });
  }, []);

  const calUrl = useMemo(() => {
    const link = env.NEXT_PUBLIC_CAL_LINK || DEFAULT_CAL_LINK;
    if (!link) return null;
    const params = new URLSearchParams({ theme: "dark" });
    if (name) params.set("name", name);
    if (email) params.set("email", email);
    return `https://cal.com/${link}?${params.toString()}`;
  }, [name, email]);

  if (!calUrl) {
    return (
      <div
        style={{
          maxWidth: 560,
          margin: "0 auto",
          padding: "28px 24px",
          borderRadius: 18,
          border: "1px solid rgba(0, 212, 200, 0.18)",
          background: "linear-gradient(180deg, rgba(10,21,33,0.9), rgba(6,13,22,0.96))",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
          You&apos;re on the list.
        </p>
        <p style={{ fontSize: 14, opacity: 0.7, lineHeight: 1.55 }}>
          We&apos;ve got your details and a BuilderHQ specialist will call you
          within 1 business day to match you with builders.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 940,
        margin: "0 auto",
        borderRadius: 18,
        overflow: "hidden",
        border: "1px solid rgba(0, 212, 200, 0.18)",
        boxShadow: "0 40px 100px rgba(0,0,0,0.5)",
        background: "#0a1521",
      }}
    >
      <iframe
        src={calUrl}
        title="Book your free 15-minute call"
        style={{
          width: "100%",
          height: 760,
          border: 0,
          display: "block",
          colorScheme: "dark",
        }}
        loading="lazy"
      />
    </div>
  );
}
