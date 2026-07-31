/**
 * JWT helpers for the mobile bearer-token flow.
 *
 * The web app uses Auth.js's cookie-based session strategy. Mobile
 * clients can't carry cookies cleanly across native code paths, so
 * they get a separate flow: a short-lived JWT access token (15 min)
 * signed with `AUTH_SECRET` and verified on every API call.
 *
 * Algorithm: HS256 (HMAC-SHA-256). Single shared secret, no key
 * rotation infrastructure needed — adequate for a first-party mobile
 * app where the server signs *and* verifies. Public-key (RS256/ES256)
 * is the right answer when third-party services need to verify tokens
 * without holding the signing key, which we don't have today.
 *
 * Issuer + audience claims pin the token to this app + the mobile
 * surface so we can introduce different token types later (e.g. a web-
 * SSE-stream token) without ambiguous validation. The audience also
 * keeps tokens minted here from being mistaken for Auth.js's own JWTs.
 */

import "server-only";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

import { env } from "./env";

/** Hard-coded issuer + audience so token type is unambiguous. */
const ISSUER = "builderhq";
const AUDIENCE = "builderhq-mobile";

/** Access token lifetime — 15 minutes. Industry standard short window. */
export const ACCESS_TOKEN_TTL_SEC = 15 * 60;

const encodedSecret = new TextEncoder().encode(env.AUTH_SECRET);

export interface MobileAccessClaims extends JWTPayload {
  /** User id (also encoded as `sub`). */
  sub: string;
  /** Role at token-issue time. Stale role = next refresh corrects it. */
  role: "project_owner" | "builder" | "admin" | "architect";
}

/**
 * Sign a fresh access token for the given user. Always sets a 15-min
 * expiry; do not allow callers to override — keeping the TTL constant
 * is half the security argument for the short-lived/long-refresh split.
 */
export async function signMobileAccessToken(input: {
  userId: string;
  role: MobileAccessClaims["role"];
}): Promise<string> {
  return new SignJWT({ role: input.role })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(input.userId)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SEC}s`)
    .sign(encodedSecret);
}

/**
 * Verify an access token. Returns null on any failure (bad signature,
 * expired, wrong issuer/audience, malformed). Throws nothing — callers
 * branch on the null and return a 401.
 */
export async function verifyMobileAccessToken(
  token: string,
): Promise<MobileAccessClaims | null> {
  try {
    const { payload } = await jwtVerify(token, encodedSecret, {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ["HS256"],
    });
    // Narrow to MobileAccessClaims — we wrote it, we know the shape.
    if (typeof payload.sub !== "string") return null;
    if (
      payload.role !== "project_owner" &&
      payload.role !== "builder" &&
      payload.role !== "admin"
    ) {
      return null;
    }
    return payload as MobileAccessClaims;
  } catch {
    return null;
  }
}
