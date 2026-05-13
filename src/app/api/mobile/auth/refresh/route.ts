/**
 * POST /api/mobile/auth/refresh
 *
 * Exchange a valid refresh token for a freshly-rotated session pair.
 * Mobile calls this:
 *
 *   · Proactively, when the cached access token is within ~2 minutes
 *     of expiry (avoids the 401 round-trip)
 *   · Reactively, when any authenticated request returns 401 + code
 *     "expired" (single retry; if refresh also fails, mobile logs out)
 *
 * The presented refresh token is rotated: it's marked revoked, a new
 * token is issued, and the chain is linked via `rotatedToId`. If the
 * presented token was ALREADY revoked, that's a theft signal — the
 * entire chain is invalidated and the user is forced to re-auth.
 *
 * Request:
 *   { refreshToken: string }
 *
 * Success (200): same shape as /login, minus the user object (mobile
 * already has the user cached; if we ever need to surface a role
 * change, a separate /me call handles it).
 *   {
 *     accessToken, refreshToken, expiresIn, accessExpiresAt
 *   }
 *
 * Failures:
 *   400  invalid body
 *   401  refresh token unknown, expired, or reused (chain revoked)
 *   429  rate-limited
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/logger";
import { clientIpFromHeaders, limiters } from "@/lib/ratelimit";
import { rotateSession } from "@/modules/auth/mobile-tokens";

export const runtime = "nodejs";

const InputSchema = z.object({
  refreshToken: z.string().min(20).max(200),
});

export async function POST(request: NextRequest) {
  // Same limiter as login — a brute-forcer trying to hit /refresh with
  // guessed tokens shouldn't get an easier ride.
  const ip = clientIpFromHeaders(request.headers);
  const rl = await limiters.signIn.limit(ip);
  if (!rl.success) {
    return NextResponse.json(
      {
        error: {
          code: "rate_limited",
          message: "Too many requests. Try again in a minute.",
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
  const parsed = InputSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "validation", message: "refreshToken is required." } },
      { status: 400 },
    );
  }

  const rotated = await rotateSession(parsed.data.refreshToken);
  if (!rotated.ok) {
    // All failure paths map to 401 so the mobile client can react with a
    // single "force logout" branch. The code field tells it which sub-
    // reason to surface to the user.
    return NextResponse.json(
      {
        error: {
          code: rotated.error.code,
          message: rotated.error.message,
        },
      },
      { status: 401 },
    );
  }

  logger.info(
    { event: "mobile.refresh.ok" },
    "mobile session rotated",
  );

  return NextResponse.json({
    accessToken: rotated.value.accessToken,
    refreshToken: rotated.value.refreshToken,
    expiresIn: rotated.value.expiresIn,
    accessExpiresAt: rotated.value.accessExpiresAt,
  });
}
