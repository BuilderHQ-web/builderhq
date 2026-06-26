/**
 * POST /api/stripe/webhook
 *
 * Stripe webhook receiver for the paid-unlock flow. Verifies the
 * `stripe-signature` header against STRIPE_WEBHOOK_SECRET, then hands the
 * event to the payments service, which grants + captures the unlock (or
 * cancels the authorisation if the slot filled).
 *
 * Must read the RAW request body — Stripe signs the exact bytes, so we
 * use `request.text()` and never `request.json()` (which would reserialise
 * and break the signature). nodejs runtime: the Stripe SDK's signature
 * verification needs Node crypto, not the edge runtime.
 *
 * Always returns 200 once the signature is valid, even if a handler had a
 * recoverable hiccup, so Stripe doesn't hammer us with retries for events
 * we've acknowledged. Signature failures return 400 (Stripe won't retry).
 */

import { NextResponse, type NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import { handleWebhookRequest } from "@/modules/payments";

export const runtime = "nodejs";
// Never cache or statically optimise a webhook.
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  const result = await handleWebhookRequest(rawBody, signature);
  if (!result.ok) {
    const status = result.error.code === "validation" ? 400 : 500;
    logger.warn(
      { event: "stripe.webhook.rejected", code: result.error.code },
      "stripe webhook rejected",
    );
    return NextResponse.json({ error: result.error.message }, { status });
  }

  return NextResponse.json({ received: true });
}
