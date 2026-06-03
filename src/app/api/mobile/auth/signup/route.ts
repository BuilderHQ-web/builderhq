/**
 * POST /api/mobile/auth/signup
 *
 * Native-app sign-up. Creates the user (pending_verification) and emails
 * a 6-digit code with a 15-minute TTL. Sister to the web's signup server
 * action, but the verify step exchanges the code for a mobile session
 * pair directly (see /api/mobile/auth/verify) so the user never leaves
 * the app.
 *
 * Request:
 *   {
 *     firstName: string  required, 1-50 chars
 *     lastName:  string  required, 1-50 chars
 *     email:     string  required, lowercased + trimmed
 *     password:  string  required, 10-200 chars
 *     role:      "project_owner" | "builder"
 *     deviceLabel?:    string optional — surfaced in future "active
 *                                          devices" settings screen
 *     signupSource?:   string optional analytics hint
 *     signupCampaign?: string optional analytics hint
 *   }
 *
 * Success (200):
 *   { email: string, codeExpiresAt: string }  ISO-8601 expiry stamp
 *
 * Failures:
 *   400  validation (zod issues — surfaced as fieldErrors)
 *   409  email already registered + verified
 *   429  rate-limited (5 per 5 min per IP via limiters.signUp)
 *   500  unexpected
 */

import { NextResponse, type NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import { clientIpFromHeaders, limiters } from "@/lib/ratelimit";
import { mobileSignUp } from "@/modules/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // 1. Rate limit per IP.
  const ip = clientIpFromHeaders(request.headers);
  const rl = await limiters.signUp.limit(ip);
  if (!rl.success) {
    return NextResponse.json(
      {
        error: {
          code: "rate_limited",
          message: "Too many sign-up attempts. Try again in a few minutes.",
        },
      },
      { status: 429 },
    );
  }

  // 2. Parse body. Invalid JSON → 400 with a friendly message.
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "validation", message: "Invalid JSON body." } },
      { status: 400 },
    );
  }

  // 3. Hand to the service. Service surfaces zod issues as `details.issues`;
  //    fold those into a clean `fieldErrors` map the client can render
  //    inline. Same shape APIError.validation expects on the iOS side.
  const result = await mobileSignUp(raw);
  if (!result.ok) {
    const status =
      result.error.code === "validation"
        ? 400
        : result.error.code === "conflict"
          ? 409
          : 500;
    const fieldErrors: Record<string, string> = {};
    const details = result.error.details as
      | { issues?: Array<{ path: (string | number)[]; message: string }> }
      | undefined;
    if (details?.issues) {
      for (const issue of details.issues) {
        const key = String(issue.path[0] ?? "");
        if (key && !fieldErrors[key]) {
          fieldErrors[key] = issue.message;
        }
      }
    }
    return NextResponse.json(
      {
        error: {
          code: result.error.code,
          message: result.error.message,
          details: fieldErrors,
        },
      },
      { status },
    );
  }

  logger.info(
    { event: "mobile.signup.ok", email: result.value.email },
    "mobile signup ok",
  );

  return NextResponse.json({
    email: result.value.email,
    codeExpiresAt: result.value.codeExpiresAt,
  });
}
