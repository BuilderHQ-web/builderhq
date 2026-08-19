/**
 * What a page address is allowed to tell Meta.
 *
 * Every event, from either half of the pair, carries the URL of the
 * page it happened on. Meta calls it `event_source_url`, the browser
 * pixel reads it off the address bar without being asked, and it is
 * transmitted whether or not anybody thought about what the address
 * contains. On this site it contained an email address, because the
 * signup redirect passed one so the next page could say "we sent a
 * link to ...".
 *
 * That is personal data leaving in the clear. Meta's own Business
 * Tools terms forbid it, Meta detects it automatically, and the
 * Australian Privacy Principles treat a disclosure to a third party
 * as a disclosure regardless of how casually it happened.
 *
 * Two rules, applied in one place so every event that exists today and
 * every event added later is covered by them.
 *
 *   1. THE QUERY IS STRIPPED to the campaign parameters. They are the
 *      only ones advertising has a reason to see, they are values we
 *      put in the URL ourselves, and anything else, known or invented
 *      later, is dropped without needing to be listed.
 *
 *   2. SOME PATHS ARE NEVER REPORTED. A password reset link is a
 *      password in path form. So is an account claim, an invitation
 *      and an email verification. Stripping the query does nothing for
 *      those, because the secret is the path, so no event reports them
 *      at all. Nothing is lost: no conversion is fired from any of
 *      them, and none of them is a page an advertisement points at.
 */

import { UTM_KEYS } from "./utm";

const CAMPAIGN_KEYS: ReadonlySet<string> = new Set<string>(UTM_KEYS);

/**
 * Paths whose own text is the secret, or whose audience is private.
 *
 * The token routes are one-time links out of an email. The partner
 * pages are draft profiles and welcome pages shown to a prospect while
 * they are being courted, which is nobody's business but theirs.
 */
const PRIVATE_PATHS: readonly RegExp[] = [
  /^\/claim\/.+/,
  /^\/reset-password\/.+/,
  /^\/verify-email\/.+/,
  /^\/invite\/.+/,
  /^\/partners\/preview\/.+/,
  /^\/partners\/welcome(?:\/|$)/,
];

/** True when the path itself must never reach an advertising network. */
export function isPrivateTrackingPath(pathname: string): boolean {
  if (!pathname) return false;
  return PRIVATE_PATHS.some((pattern) => pattern.test(pathname));
}

/**
 * Whether the browser pixel may report this address at all.
 *
 * The pixel sends the address bar verbatim and offers no way to
 * override it, so the only control available is whether it transmits.
 * It stays silent on a private path, and on any page whose query
 * carries somebody's address or points at a private path, which is how
 * `/signup?next=/invite/b/<token>` is handled: an invited builder's
 * token is not something to hand over for the sake of a page view.
 *
 * Campaign parameters are exempt by name, so an advertisement's own
 * landing page always reports.
 */
export function isReportableTrackingUrl(
  pathname: string,
  search: string,
): boolean {
  if (isPrivateTrackingPath(pathname)) return false;
  const params = new URLSearchParams(search);
  for (const [key, value] of params) {
    if (CAMPAIGN_KEYS.has(key)) continue;
    // An `@` is either an email address or something shaped closely
    // enough that it is not worth the argument.
    if (value.includes("@")) return false;
    if (isPrivateTrackingPath(value)) return false;
  }
  return true;
}

/**
 * The address a server-side event may carry, or nothing.
 *
 * Applied where the Conversions API payload is built, so it covers the
 * referer the browser sent, an address a caller passed deliberately,
 * and any event written from here on.
 */
export function sanitiseMetaSourceUrl(
  raw: string | null | undefined,
): string | undefined {
  if (!raw) return undefined;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return undefined;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
  if (isPrivateTrackingPath(url.pathname)) return undefined;

  const kept = new URLSearchParams();
  for (const key of UTM_KEYS) {
    const value = url.searchParams.get(key);
    if (value) kept.set(key, value);
  }
  const query = kept.toString();
  // Origin and path only. The fragment never leaves the browser in a
  // request, but it can arrive in a referer header, so it goes too.
  return `${url.origin}${url.pathname}${query ? `?${query}` : ""}`;
}
