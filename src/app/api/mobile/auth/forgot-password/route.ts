/**
 * POST /api/mobile/auth/forgot-password
 *
 * Start the mobile password-reset flow. Emails a 6-digit code (15-min
 * TTL) when the account qualifies, and ALWAYS returns 200 with a
 * `codeExpiresAt` — even for unknown emails — so it can't be used to
 * enumerate registered accounts. The client always advances to the
 * code-entry screen and renders the "expires in 14:53" countdown.
 *
 * Request:
 *   { email: string }
 *
 * Success (200):
 *   { codeExpiresAt: string }   // ISO-8601
 *
 * Failures:
 *   400  validation (bad email shape)
 *   429  rate-limited (3 per 10 min per IP via limiters.forgot)
 *   500  unexpected
 */

import { NextResponse, type NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import { clientIpFromHeaders, limiters } from "@/lib/ratelimit";
import { mobileRequestPasswordReset } from "@/modules/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // Same email-spam gate the web reset uses — this endpoint can be
  // weaponised to burn Resend reputation against a target inbox.
  const ip = clientIpFromHeaders(request.headers);
  const rl = await limiters.forgot.limit(ip);
  if (!rl.success) {
    return NextResponse.json(
      {
        error: {
          code: "rate_limited",
          message: "Too many requests. Try again in a few minutes.",
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

  const result = await mobileRequestPasswordReset(raw);
  if (!result.ok) {
    const status = result.error.code === "validation" ? 400 : 500;
    return NextResponse.json(
      { error: { code: result.error.code, message: result.error.message } },
      { status },
    );
  }

  logger.info(
    { event: "mobile.forgot_password.requested" },
    "mobile password reset code requested",
  );
  return NextResponse.json({ codeExpiresAt: result.value.codeExpiresAt });
}
