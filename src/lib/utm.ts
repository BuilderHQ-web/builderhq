/**
 * Where a visitor came from, carried as far as the account they create.
 *
 * A campaign lands somebody on `/for/architects?utm_source=meta&
 * utm_campaign=architects-au`. They read, they click through to the
 * signup form, and by then the URL is `/signup?role=architect` and the
 * campaign that paid for them is gone. The columns to record it have
 * always existed on the user row; nothing was filling them from the
 * website form.
 *
 * So the parameters are copied into a first-party cookie the moment a
 * page carrying them is opened, and the signup action reads that cookie
 * on the server. Reading it there rather than posting it in the form
 * matters: a value that reaches the database should not be one a
 * stranger can type into a request.
 *
 * LAST TOUCH, not first. The cookie is only rewritten by a visit that
 * carries campaign parameters of its own, so an ad click still counts
 * a fortnight later, and a second ad click replaces the first. That is
 * how the ad platform attributes its own spend, and a database that
 * disagrees with the platform is worse than no column at all.
 */

import { decodeCookieJson, encodeCookieJson } from "./cookie-json";

/** The campaign keys a URL is allowed to carry. */
export const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

/** First party, thirty days, no personal data in it. */
export const UTM_COOKIE = "bhq_utm";
export const UTM_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export interface UtmAttribution {
  source?: string;
  campaign?: string;
}

/** The signup columns validate at 120 characters. */
const MAX_LENGTH = 120;

function clean(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().slice(0, MAX_LENGTH);
  return trimmed || undefined;
}

/**
 * The cookie body, or null when there is nothing worth storing.
 *
 * Two fields, matching the two columns that exist. Storing more would
 * be collecting for its own sake, which is the habit this platform
 * argues against everywhere else.
 */
export function utmCookieValue(
  source: string | null,
  campaign: string | null,
): string | null {
  const s = clean(source);
  const c = clean(campaign);
  if (!s && !c) return null;
  return encodeCookieJson({ ...(s ? { s } : {}), ...(c ? { c } : {}) });
}

/**
 * Read the cookie back. Anything malformed reads as no attribution,
 * because a broken cookie must never be the reason a signup fails.
 */
export function readUtmAttribution(
  cookieValue: string | null | undefined,
): UtmAttribution {
  const raw = decodeCookieJson(cookieValue);
  if (!raw) return {};
  const source = clean(raw.s);
  const campaign = clean(raw.c);
  return {
    ...(source ? { source } : {}),
    ...(campaign ? { campaign } : {}),
  };
}
