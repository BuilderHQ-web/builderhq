"use client";

/**
 * Remember which campaign brought a visitor here.
 *
 * The parameters exist on the page an advertisement points at and
 * nowhere else. By the time somebody has read the page, clicked
 * through and reached the signup form, the URL is `/signup?role=
 * architect` and the campaign that paid for them is gone, which is why
 * the `signupSource` and `signupCampaign` columns on the user row have
 * been sitting empty for every account created through the website.
 *
 * So the parameters are copied into a first-party cookie the moment a
 * page carrying them is opened, and the signup action reads that
 * cookie on the server. No personal data is involved: the values are
 * ones we wrote into our own advertisements.
 *
 * It mounts beside the pixel, on the marketing and auth surfaces only.
 */

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { UTM_COOKIE, UTM_COOKIE_MAX_AGE, utmCookieValue } from "@/lib/utm";

export function UtmCapture() {
  const pathname = usePathname();

  useEffect(() => {
    // Read from the document rather than through useSearchParams,
    // which would opt every marketing page out of static rendering.
    const params = new URLSearchParams(window.location.search);
    const value = utmCookieValue(
      params.get("utm_source"),
      params.get("utm_campaign"),
    );
    // Only a visit that carries campaign parameters writes anything, so
    // an ad click still counts a fortnight later and a later ad click
    // replaces an earlier one. That is how the ad platform attributes
    // its own spend.
    if (!value) return;
    const secure = window.location.protocol === "https:" ? "; secure" : "";
    // `value` is already percent-encoded by utmCookieValue.
    document.cookie = `${UTM_COOKIE}=${value}; path=/; max-age=${UTM_COOKIE_MAX_AGE}; samesite=lax${secure}`;
  }, [pathname]);

  return null;
}
