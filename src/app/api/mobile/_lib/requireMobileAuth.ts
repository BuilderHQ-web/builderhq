/**
 * requireMobileAuth — bearer-token authentication middleware for the
 * /api/mobile/* route family.
 *
 * Reads the `Authorization: Bearer <jwt>` header, verifies the JWT
 * signature + claims, and either returns the resolved user context or
 * a 401 NextResponse the route handler can return directly.
 *
 * Usage from a route handler:
 *
 *   const auth = await requireMobileAuth(request);
 *   if (!auth.ok) return auth.response;
 *   const { userId, role } = auth.value;
 *
 * The intentionally narrow shape — userId + role only — keeps the
 * surface small. Routes that need fuller user data hit the DB
 * themselves; we don't pay for a join on every authenticated request.
 *
 * Failure modes (all → 401 with a code that the mobile client uses to
 * decide whether to trigger a refresh):
 *   missing   — no Authorization header at all
 *   malformed — header present but not "Bearer <token>"
 *   invalid   — JWT failed signature/issuer/audience verification
 *   expired   — signature OK but `exp` is past
 *
 * Mobile-side: on any 401 with code `expired` the client tries one
 * /refresh and retries; any other code goes straight to logout +
 * sign-in screen.
 */

import "server-only";
import { NextResponse, type NextRequest } from "next/server";

import { verifyMobileAccessToken } from "@/lib/jwt";

export type MobileAuthFailureCode =
  | "missing"
  | "malformed"
  | "invalid"
  | "expired";

export type RequireMobileAuthResult =
  | {
      ok: true;
      value: { userId: string; role: "project_owner" | "builder" | "admin" };
    }
  | {
      ok: false;
      code: MobileAuthFailureCode;
      response: NextResponse;
    };

function unauthorized(code: MobileAuthFailureCode): NextResponse {
  return NextResponse.json(
    { error: { code, message: codeMessage(code) } },
    { status: 401 },
  );
}

function codeMessage(code: MobileAuthFailureCode): string {
  switch (code) {
    case "missing":
      return "Sign-in required.";
    case "malformed":
      return "Authorization header is malformed.";
    case "invalid":
      return "Session token is invalid.";
    case "expired":
      return "Session token expired.";
  }
}

export async function requireMobileAuth(
  request: NextRequest,
): Promise<RequireMobileAuthResult> {
  const header = request.headers.get("authorization");
  if (!header) {
    return { ok: false, code: "missing", response: unauthorized("missing") };
  }
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return { ok: false, code: "malformed", response: unauthorized("malformed") };
  }
  const token = match[1]!.trim();
  const claims = await verifyMobileAccessToken(token);
  if (!claims) {
    // verifyMobileAccessToken collapses every JWT failure mode to null
    // (bad signature, expired, wrong issuer, etc.). We can't distinguish
    // "expired" vs "invalid" without re-decoding here. For the mobile
    // client's benefit, decode the payload manually to look at exp —
    // if it's past, return `expired` (the only failure that triggers a
    // refresh attempt). Otherwise `invalid`.
    if (isExpiredJwt(token)) {
      return { ok: false, code: "expired", response: unauthorized("expired") };
    }
    return { ok: false, code: "invalid", response: unauthorized("invalid") };
  }
  return {
    ok: true,
    value: { userId: claims.sub, role: claims.role },
  };
}

/**
 * Best-effort expiry check without signature verification. Used only to
 * differentiate the 401 code for mobile's refresh decision — never as a
 * security primitive (no signature check is performed here).
 */
function isExpiredJwt(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1]!, "base64url").toString("utf8"),
    );
    if (typeof payload.exp !== "number") return false;
    return payload.exp * 1000 < Date.now();
  } catch {
    return false;
  }
}
