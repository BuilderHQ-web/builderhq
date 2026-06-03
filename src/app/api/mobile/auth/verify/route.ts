/**
 * POST /api/mobile/auth/verify
 *
 * Exchange a 6-digit mobile sign-up code for a mobile session. On
 * success, marks the user verified + active, deletes the code (single-
 * use), and issues an access JWT + refresh token in the same shape as
 * /api/mobile/auth/login — so the client can hand straight to its
 * "AuthSession.didSignIn(user:)" path without a second round-trip.
 *
 * Request:
 *   {
 *     email: string  required
 *     code:  string  required, exactly 6 digits
 *     deviceLabel?: string optional
 *   }
 *
 * Success (200):
 *   {
 *     accessToken, refreshToken, expiresIn, accessExpiresAt,
 *     user: { id, email, name, role }
 *   }
 *
 * Failures:
 *   400  validation (bad shape)
 *   401  code invalid / expired / never minted
 *   429  rate-limited (10 per 60s per IP via limiters.signIn)
 *   500  unexpected
 *
 * Rate-limited by IP via `limiters.signIn` (same key family as login)
 * because the verify step is functionally a first-login event.
 */

import { NextResponse, type NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import { clientIpFromHeaders, limiters } from "@/lib/ratelimit";
import { mobileVerifyCode } from "@/modules/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // Reuse the login limiter — verify is a credential-style endpoint:
  // 6-digit code = 1-in-a-million guess space, so brute-force needs the
  // same friction as a password attempt.
  const ip = clientIpFromHeaders(request.headers);
  const rl = await limiters.signIn.limit(ip);
  if (!rl.success) {
    return NextResponse.json(
      {
        error: {
          code: "rate_limited",
          message: "Too many attempts. Try again in a minute.",
        },
      },
      { status: 429 },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "validation", message: "Invalid JSON body." } },
      { status: 400 },
    );
  }

  const result = await mobileVerifyCode(raw);
  if (!result.ok) {
    const status =
      result.error.code === "validation"
        ? 400
        : result.error.code === "unauthorized"
          ? 401
          : 500;
    return NextResponse.json(
      { error: { code: result.error.code, message: result.error.message } },
      { status },
    );
  }

  logger.info(
    { event: "mobile.verify.ok", userId: result.value.user.id },
    "mobile verify + session issued",
  );

  // Fresh sign-up → always needs onboarding (no profile row yet). We
  // hardcode rather than re-query so the client gets a consistent
  // signal even on the rare resubmit-then-verify path where a profile
  // row could in theory exist.
  return NextResponse.json({
    accessToken: result.value.tokens.accessToken,
    refreshToken: result.value.tokens.refreshToken,
    expiresIn: result.value.tokens.expiresIn,
    accessExpiresAt: result.value.tokens.accessExpiresAt,
    user: { ...result.value.user, needsOnboarding: true },
  });
}
