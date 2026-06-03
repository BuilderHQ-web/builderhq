/**
 * POST /api/mobile/auth/resend-code
 *
 * Resend the 6-digit sign-up code. Throttled in the service layer (one
 * resend per 60s per email) AND in the limiter (3 per 10 min per IP) so
 * neither vector can be ground into spam.
 *
 * Always returns 200 with a `throttled: boolean` flag — even when the
 * email is unknown or already verified — so this endpoint can't be used
 * to enumerate registered emails.
 *
 * Request:
 *   { email: string }
 *
 * Success (200):
 *   { throttled: boolean, codeExpiresAt: string | null }
 *
 * Failures:
 *   400  validation (bad email shape)
 *   429  rate-limited (3 per 10 min per IP)
 *   500  unexpected
 */

import { NextResponse, type NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import { clientIpFromHeaders, limiters } from "@/lib/ratelimit";
import { mobileResendCode } from "@/modules/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const ip = clientIpFromHeaders(request.headers);
  const rl = await limiters.verifyResend.limit(ip);
  if (!rl.success) {
    return NextResponse.json(
      {
        error: {
          code: "rate_limited",
          message: "Too many resends. Try again in a few minutes.",
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

  const result = await mobileResendCode(raw);
  if (!result.ok) {
    const status = result.error.code === "validation" ? 400 : 500;
    return NextResponse.json(
      { error: { code: result.error.code, message: result.error.message } },
      { status },
    );
  }

  if (result.value.throttled) {
    logger.info(
      { event: "mobile.resend.throttled" },
      "mobile code resend throttled",
    );
  }

  return NextResponse.json({
    throttled: result.value.throttled,
    codeExpiresAt: result.value.codeExpiresAt,
  });
}
