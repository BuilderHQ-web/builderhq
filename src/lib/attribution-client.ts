/**
 * The browser half of attribution: reading and writing the cookies.
 *
 * Kept apart from lib/attribution, which is pure and runs on both sides,
 * so the server can decode a record without pulling `document` into its
 * bundle. Everything here is a no-op outside a browser.
 */

import {
  ATTRIBUTION_COOKIE,
  ATTRIBUTION_MAX_AGE,
  LEGACY_UTM_COOKIE,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  decodeAttribution,
  decodeLegacyUtm,
  encodeAttribution,
  mergeAttribution,
  readTouch,
  type Attribution,
} from "./attribution";

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const hit = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : undefined;
}

function writeCookie(name: string, value: string, maxAge: number): void {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; samesite=lax${secure}`;
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

/** The attribution record as it stands, without recording a visit. */
export function currentAttribution(): Attribution {
  return decodeAttribution(readCookie(ATTRIBUTION_COOKIE));
}

/**
 * The visit id. Sliding: every page view pushes the expiry out another
 * thirty minutes, so a session ends after half an hour of real idleness
 * rather than half an hour after it began.
 */
export function currentSessionId(): string {
  const existing = readCookie(SESSION_COOKIE);
  const id = existing || newId();
  writeCookie(SESSION_COOKIE, id, SESSION_MAX_AGE);
  return id;
}

/**
 * Record this page view against the visitor's history and return the
 * result. Safe to call on every navigation.
 */
export function recordVisit(): Attribution {
  if (typeof window === "undefined") return {};

  let existing = decodeAttribution(readCookie(ATTRIBUTION_COOKIE));

  // Yesterday's cookie, folded in once, so traffic the live campaigns
  // already paid for keeps its source instead of resetting to direct.
  if (!existing.first && !existing.last) {
    const legacy = decodeLegacyUtm(readCookie(LEGACY_UTM_COOKIE));
    if (legacy) existing = { ...existing, first: legacy, last: legacy };
  }

  const { touch, gclid, fbclid } = readTouch(
    window.location.href,
    document.referrer,
    new Date().toISOString(),
  );
  const next = mergeAttribution(
    existing,
    touch,
    { ...(gclid ? { gclid } : {}), ...(fbclid ? { fbclid } : {}) },
    newId,
  );
  writeCookie(ATTRIBUTION_COOKIE, encodeAttribution(next), ATTRIBUTION_MAX_AGE);
  currentSessionId();
  return next;
}
