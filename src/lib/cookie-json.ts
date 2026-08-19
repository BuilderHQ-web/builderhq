/**
 * A small JSON object carried in a cookie.
 *
 * Cookie values are not allowed to contain commas, semicolons, quotes
 * or spaces, and JSON is made of exactly those. Some proxies treat a
 * comma in a Set-Cookie header as the start of a second cookie, which
 * turns a working handoff into an intermittent one that only fails in
 * production. So the value is percent-encoded on the way in.
 *
 * Reading is deliberately forgiving about how many times it was
 * encoded, because that depends on what the framework decided to do at
 * each end and it is not worth being brittle about. Anything that is
 * not a plain object at the end of it reads as nothing at all: a
 * malformed cookie must never be the reason a page fails.
 */

export function encodeCookieJson(value: unknown): string {
  return encodeURIComponent(JSON.stringify(value));
}

export function decodeCookieJson(
  raw: string | null | undefined,
): Record<string, unknown> | null {
  if (!raw) return null;
  let candidate = raw;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return null;
    } catch {
      // Not JSON yet. It may still be percent-encoded.
    }
    let decoded: string;
    try {
      decoded = decodeURIComponent(candidate);
    } catch {
      return null;
    }
    if (decoded === candidate) return null;
    candidate = decoded;
  }
  return null;
}
