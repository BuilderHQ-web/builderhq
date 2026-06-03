/**
 * POST /api/mobile/auth/reset-password
 *
 * Complete the mobile password-reset flow: exchange a 6-digit code + a
 * new password for a fresh session (auto-sign-in), in the same response
 * shape as /api/mobile/auth/login. Resetting also revokes every other
 * device's session — the device doing the reset gets the new one.
 *
 * Request:
 *   {
 *     email:        string  required
 *     code:         string  required, exactly 6 digits
 *     password:     string  required, 10-200 chars (the new password)
 *     deviceLabel?: string  optional
 *   }
 *
 * Success (200):
 *   {
 *     accessToken, refreshToken, expiresIn, accessExpiresAt,
 *     user: { id, email, name, role, needsOnboarding }
 *   }
 *
 * Failures:
 *   400  validation (bad shape / weak password)
 *   401  code invalid / expired / never minted
 *   403  account banned / suspended
 *   429  rate-limited (10 per 60s per IP via limiters.signIn)
 *   500  unexpected
 *
 * Rate-limited by IP via `limiters.signIn` — like /verify, the code step
 * is a credential-style event (1-in-a-million guess space) so it needs
 * the same brute-force friction as a password attempt.
 */

import { NextResponse, type NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import { clientIpFromHeaders, limiters } from "@/lib/ratelimit";
import { mobileResetPassword } from "@/modules/auth";
import { hasCompletedOnboarding } from "@/modules/profiles";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
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

  const result = await mobileResetPassword(raw);
  if (!result.ok) {
    const status =
      result.error.code === "validation"
        ? 400
        : result.error.code === "unauthorized"
          ? 401
          : result.error.code === "forbidden"
            ? 403
            : 500;
    return NextResponse.json(
      { error: { code: result.error.code, message: result.error.message } },
      { status },
    );
  }

  const { user, tokens } = result.value;

  // Onboarding gate parity with /login — a reset user may already be
  // fully onboarded, so we can't hardcode this like /verify does.
  const onboarded = await hasCompletedOnboarding(user.id, user.role);

  logger.info(
    { event: "mobile.reset_password.ok", userId: user.id },
    "mobile password reset + session issued",
  );

  return NextResponse.json({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: tokens.expiresIn,
    accessExpiresAt: tokens.accessExpiresAt,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      needsOnboarding: !onboarded,
    },
  });
}
