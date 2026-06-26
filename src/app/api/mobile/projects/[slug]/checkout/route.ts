/**
 * POST /api/mobile/projects/[slug]/checkout
 *
 * Start a paid unlock. Runs the same eligibility / cap gates the free
 * unlock used to, then opens a Stripe Checkout Session and returns its
 * hosted URL for the app to open in an in-app browser (Custom Tab /
 * SFSafariViewController). The actual unlock is granted server-side by
 * the Stripe webhook once payment is captured — the app polls / refetches
 * GET /projects/[slug] on return.
 *
 * Responses:
 *   200 { ok: true, url }                  — open this URL to pay
 *   200 { ok: true, alreadyUnlocked: true } — builder already has it; just refetch
 *   403 forbidden        — not a builder / not approved
 *   404 not_found        — slug not visible
 *   409 conflict / 429   — project full
 */

import { NextResponse, type NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import { clientIpFromHeaders, limiters } from "@/lib/ratelimit";
import { createUnlockCheckout } from "@/modules/payments";
import { requireMobileAuth } from "../../../_lib/requireMobileAuth";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const auth = await requireMobileAuth(request);
  if (!auth.ok) return auth.response;

  if (auth.value.role !== "builder" && auth.value.role !== "admin") {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Only builders can unlock projects." } },
      { status: 403 },
    );
  }

  const ip = clientIpFromHeaders(request.headers);
  const rl = await limiters.unlock.limit(`${auth.value.userId}:${ip}`);
  if (!rl.success) {
    return NextResponse.json(
      { error: { code: "rate_limited", message: "Slow down — try again in a moment." } },
      { status: 429 },
    );
  }

  const result = await createUnlockCheckout({ builderId: auth.value.userId, slug });
  if (!result.ok) {
    const status =
      result.error.code === "rate_limited" ? 429 :
      result.error.code === "forbidden" ? 403 :
      result.error.code === "not_found" ? 404 :
      result.error.code === "external_error" ? 502 :
      400;
    return NextResponse.json(
      { error: { code: result.error.code, message: result.error.message } },
      { status },
    );
  }

  logger.info(
    { event: "mobile.checkout.created", builderId: auth.value.userId, slug, alreadyUnlocked: result.value.alreadyUnlocked },
    "mobile unlock checkout",
  );

  return NextResponse.json({
    ok: true,
    url: result.value.url,
    alreadyUnlocked: result.value.alreadyUnlocked,
  });
}
