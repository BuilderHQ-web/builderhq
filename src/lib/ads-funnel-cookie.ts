/**
 * Soft-auth cookie for the /start ads funnel.
 *
 * The /start flow has a window between "user submitted their email"
 * (step 2) and "user clicked the magic link" (which creates a real
 * Auth.js session) where the browser owns a draft project but isn't
 * yet a signed-in user. We pin them to that project via a short-lived
 * HMAC-signed cookie carrying `{ userId, projectId }`.
 *
 * Key design choices:
 *   · Signed with a DEDICATED secret (ADS_FUNNEL_SOFT_AUTH_SECRET).
 *     NOT reusing AUTH_SECRET so rotating either doesn't blow up
 *     the other — and so a soft-auth cookie can NEVER be confused
 *     for a real Auth.js session.
 *   · 24h expiry. They have a day to finish the wizard before they
 *     have to start over.
 *   · `HttpOnly` + `Secure` + `SameSite=Lax`. Lax is required so the
 *     cookie survives the GET redirect back from `/auth/magic`.
 *   · Cookie name distinct from Auth.js's (`__Secure-authjs.*`).
 *
 * Scope of what this cookie grants:
 *   ONLY the ability to read/write the specific draft project it
 *   names. Routes that accept it MUST check `cookie.projectId ===
 *   path.projectId` AND `project.ownerId === cookie.userId`. It does
 *   NOT grant Auth.js session privileges — the user can't browse
 *   the marketplace, see other projects, etc.
 */

import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import { env } from "./env";

export const ADS_FUNNEL_COOKIE_NAME = "bhq_ads_funnel";

/** 24 hours. */
const COOKIE_MAX_AGE_SECONDS = 24 * 60 * 60;

export interface AdsFunnelCookiePayload {
  userId: string;
  projectId: string;
  /** Epoch seconds. Used for expiry check independent of the cookie's
   *  own browser-side TTL (which the user can spoof). */
  iat: number;
}

interface ParseError {
  ok: false;
  reason: "missing" | "malformed" | "bad_signature" | "expired";
}

interface ParseOk {
  ok: true;
  value: AdsFunnelCookiePayload;
}

/**
 * Build the signed cookie string. The shape is `<base64url(json)>.<hmac>`
 * where the HMAC covers the base64 payload using
 * ADS_FUNNEL_SOFT_AUTH_SECRET. Compact, no library overhead.
 */
function sign(payload: AdsFunnelCookiePayload, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${mac}`;
}

function verify(
  raw: string,
  secret: string,
): { ok: true; value: AdsFunnelCookiePayload } | { ok: false } {
  const dot = raw.indexOf(".");
  if (dot < 0) return { ok: false };
  const body = raw.slice(0, dot);
  const givenMac = raw.slice(dot + 1);
  const expectedMac = createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(givenMac);
  const b = Buffer.from(expectedMac);
  if (a.length !== b.length) return { ok: false };
  if (!timingSafeEqual(a, b)) return { ok: false };
  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as AdsFunnelCookiePayload;
    if (
      typeof payload.userId !== "string" ||
      typeof payload.projectId !== "string" ||
      typeof payload.iat !== "number"
    ) {
      return { ok: false };
    }
    return { ok: true, value: payload };
  } catch {
    return { ok: false };
  }
}

function requireSecret(): string {
  const s = env.ADS_FUNNEL_SOFT_AUTH_SECRET;
  if (!s) {
    throw new Error(
      "ADS_FUNNEL_SOFT_AUTH_SECRET is not configured — the /start funnel cannot issue or verify soft-auth cookies.",
    );
  }
  return s;
}

/**
 * Set the cookie on the response. Call from a Server Action or
 * Route Handler after creating the draft user + project.
 */
export async function setAdsFunnelCookie(payload: {
  userId: string;
  projectId: string;
}): Promise<void> {
  const secret = requireSecret();
  const iat = Math.floor(Date.now() / 1000);
  const value = sign({ userId: payload.userId, projectId: payload.projectId, iat }, secret);
  const store = await cookies();
  store.set(ADS_FUNNEL_COOKIE_NAME, value, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

/**
 * Read + verify the cookie. Returns the payload on success, a tagged
 * reason on failure. Caller decides whether to fall back to Auth.js
 * session lookup or boot to /start.
 */
export async function readAdsFunnelCookie(): Promise<ParseOk | ParseError> {
  const store = await cookies();
  const raw = store.get(ADS_FUNNEL_COOKIE_NAME)?.value;
  if (!raw) return { ok: false, reason: "missing" };
  let secret: string;
  try {
    secret = requireSecret();
  } catch {
    return { ok: false, reason: "missing" };
  }
  const v = verify(raw, secret);
  if (!v.ok) return { ok: false, reason: "bad_signature" };
  const ageSeconds = Math.floor(Date.now() / 1000) - v.value.iat;
  if (ageSeconds > COOKIE_MAX_AGE_SECONDS) {
    return { ok: false, reason: "expired" };
  }
  return { ok: true, value: v.value };
}

/**
 * Clear the cookie. Called after /auth/magic redemption (real Auth.js
 * session takes over) and on hard reset.
 */
export async function clearAdsFunnelCookie(): Promise<void> {
  const store = await cookies();
  store.delete(ADS_FUNNEL_COOKIE_NAME);
}
