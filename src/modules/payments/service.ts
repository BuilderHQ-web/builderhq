/**
 * payments · service layer.
 *
 * The paid-unlock flow, end to end:
 *
 *   createUnlockCheckout()  — runs the same gates the free unlock used to
 *                             (approved builder, not already unlocked, slot
 *                             free), opens a Stripe Checkout Session in
 *                             MANUAL-CAPTURE mode, writes a `pending` ledger
 *                             row, and returns the hosted Checkout URL.
 *
 *   handleStripeEvent()     — called by the webhook route AFTER signature
 *                             verification. On checkout completion it grants
 *                             the unlock and CAPTURES the held funds; if the
 *                             slot filled first (or the builder already has
 *                             the unlock), it CANCELS the authorisation so no
 *                             money ever moves.
 *
 * Manual capture is what makes the 3-slot cap safe under payment latency:
 * we only take the money once `unlockProject` has atomically claimed a slot.
 */

import "server-only";

import type Stripe from "stripe";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { fail, ok, type Result } from "@/lib/result";

import {
  getMarketplacePreview,
  unlockPriceFor,
  humanProjectTypeLabel,
} from "@/modules/projects";
import {
  unlockProject,
  isUnlocked,
  checkUnlockEligibility,
  UNLOCK_CAP,
} from "@/modules/unlocks";

import { getStripe } from "./stripe";
import { payments, type PaymentRow } from "./schema";

// ── checkout ────────────────────────────────────────────────────────────────

export interface CreateCheckoutResult {
  /** Hosted Stripe Checkout URL to redirect / open. Null when the builder
   *  already holds the unlock — the caller just navigates to the unlocked
   *  view instead of charging again. */
  url: string | null;
  alreadyUnlocked: boolean;
  paymentId: string | null;
}

/**
 * Open a Checkout Session for a builder to unlock a project. All the
 * eligibility / cap gating happens HERE, before any money is involved —
 * the webhook only ever captures an already-authorised payment.
 */
export async function createUnlockCheckout(args: {
  builderId: string;
  slug: string;
}): Promise<Result<CreateCheckoutResult>> {
  const { builderId, slug } = args;

  const preview = await getMarketplacePreview(slug);
  if (!preview.ok) {
    return fail("not_found", "Project not found.");
  }
  const project = preview.value;

  // Same hard gate the free unlock enforced: approved builder only.
  const eligibility = await checkUnlockEligibility(builderId);
  if (!eligibility.ok) return eligibility;

  // Already unlocked? No charge — tell the caller to just navigate.
  if (await isUnlocked(builderId, project.id)) {
    return ok({ url: null, alreadyUnlocked: true, paymentId: null });
  }

  // Cheap pre-check on the cap. The authoritative check is the row-locked
  // one in unlockProject at capture time — this just avoids sending a
  // builder to Stripe for a project that's visibly full. Spots are
  // per-project (2–5) with the platform default as fallback.
  if (project.unlockedCount >= (project.tenderSpots ?? UNLOCK_CAP)) {
    return fail("rate_limited", "This project is full — all spots are taken.", {
      reason: "project_full",
    });
  }

  const amountAud = unlockPriceFor(project.type);

  // Ledger row first, so the session always has a row to reconcile to.
  const [row] = await db
    .insert(payments)
    .values({ builderId, projectId: project.id, amountAud, status: "pending" })
    .returning({ id: payments.id });
  if (!row) return fail("internal", "Could not start checkout.");

  const appUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  const metadata = {
    paymentId: row.id,
    builderId,
    projectId: project.id,
    purpose: "unlock",
  };

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      // AUTHORISE only — capture happens in the webhook once a slot is claimed.
      payment_intent_data: {
        capture_method: "manual",
        metadata,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "aud",
            unit_amount: amountAud * 100, // dollars → cents at the Stripe edge
            product_data: {
              name: `Unlock — ${project.title}`,
              description: `Full plans, exact address & owner contact for this ${humanProjectTypeLabel(
                project.type,
              )}.`,
            },
          },
        },
      ],
      metadata,
      success_url: `${appUrl}/builder/projects/${project.slug}?unlock=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/builder/projects/${project.slug}?unlock=cancelled`,
    });

    await db
      .update(payments)
      .set({
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : (session.payment_intent?.id ?? null),
        updatedAt: new Date(),
      })
      .where(eq(payments.id, row.id));

    if (!session.url) return fail("external_error", "Stripe returned no checkout URL.");
    return ok({ url: session.url, alreadyUnlocked: false, paymentId: row.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error(
      { event: "payments.checkout.create_failed", builderId, projectId: project.id, msg },
      "stripe checkout session create failed",
    );
    await db
      .update(payments)
      .set({ status: "failed", failureReason: msg, updatedAt: new Date() })
      .where(eq(payments.id, row.id));
    return fail("external_error", "Couldn't start checkout. Please try again.");
  }
}

// ── webhook handling ──────────────────────────────────────────────────────

/**
 * Dispatch a verified Stripe event. The route handler owns signature
 * verification; this owns the business reaction. Always resolves (never
 * throws) so the webhook can return 200 and Stripe won't redeliver a
 * well-handled event.
 */
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      await onCheckoutCompleted(event.data.object);
      break;
    case "checkout.session.expired":
      await markFailedBySession(
        event.data.object.id,
        "Checkout session expired before payment.",
      );
      break;
    case "payment_intent.payment_failed":
      await markFailedByPaymentIntent(
        event.data.object.id,
        event.data.object.last_payment_error?.message ?? "Payment failed.",
      );
      break;
    default:
      // Unhandled event types are fine — we only subscribe to what we use.
      break;
  }
}

/**
 * The customer authorised payment. Grant the unlock and capture; if the
 * slot is gone (or already unlocked by another payment), cancel the hold.
 */
async function onCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const paymentId = session.metadata?.paymentId;
  const builderId = session.metadata?.builderId;
  const projectId = session.metadata?.projectId;
  const piId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  if (!paymentId || !builderId || !projectId || !piId) {
    logger.warn(
      { event: "payments.webhook.missing_metadata", sessionId: session.id },
      "checkout.session.completed without our metadata — ignoring",
    );
    return;
  }

  const [row] = await db.select().from(payments).where(eq(payments.id, paymentId));
  if (!row) {
    logger.warn(
      { event: "payments.webhook.no_row", paymentId, sessionId: session.id },
      "no payment row for completed session",
    );
    return;
  }
  // Idempotency — Stripe may redeliver. Only act on a still-open row.
  if (row.status !== "pending" && row.status !== "authorised") {
    return;
  }

  await db
    .update(payments)
    .set({ status: "authorised", stripePaymentIntentId: piId, updatedAt: new Date() })
    .where(eq(payments.id, paymentId));

  // Claim a slot atomically. source:"paid" bypasses the founding-credit
  // path and goes straight to the cap-enforced insert.
  const result = await unlockProject(builderId, projectId, {
    source: "paid",
    stripePaymentIntentId: piId,
  });

  const stripe = getStripe();

  // Capture ONLY if the unlock that now exists is the one THIS payment
  // created. If a different payment (or a free/admin grant) already claimed
  // the builder's slot, result.value carries that other row → don't charge.
  const won = result.ok && result.value.stripePaymentIntentId === piId;

  if (won) {
    try {
      await stripe.paymentIntents.capture(piId);
      await db
        .update(payments)
        .set({ status: "paid", updatedAt: new Date() })
        .where(eq(payments.id, paymentId));
      logger.info(
        { event: "payments.captured", paymentId, builderId, projectId },
        "unlock paid + captured",
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.error(
        { event: "payments.capture_failed", paymentId, piId, msg },
        "capture failed after unlock granted",
      );
    }
    return;
  }

  // Lost the race (cap full) or already unlocked → void the authorisation.
  const reason = result.ok
    ? "Already unlocked — no charge taken."
    : result.error.message;
  try {
    await stripe.paymentIntents.cancel(piId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error(
      { event: "payments.cancel_failed", paymentId, piId, msg },
      "could not cancel authorisation",
    );
  }
  await db
    .update(payments)
    .set({ status: "canceled", failureReason: reason, updatedAt: new Date() })
    .where(eq(payments.id, paymentId));
  logger.info(
    { event: "payments.canceled", paymentId, builderId, projectId, reason },
    "authorisation voided — builder not charged",
  );
}

async function markFailedBySession(sessionId: string, reason: string): Promise<void> {
  await db
    .update(payments)
    .set({ status: "failed", failureReason: reason, updatedAt: new Date() })
    .where(eq(payments.stripeCheckoutSessionId, sessionId));
}

async function markFailedByPaymentIntent(piId: string, reason: string): Promise<void> {
  await db
    .update(payments)
    .set({ status: "failed", failureReason: reason, updatedAt: new Date() })
    .where(eq(payments.stripePaymentIntentId, piId));
}

/**
 * Verify a raw webhook payload + signature, then dispatch it. Owns the
 * Stripe signature check so the route handler stays a thin shell and the
 * Stripe client never leaks outside this module.
 *
 *   ok            — signature valid, event handled
 *   validation    — missing / invalid signature (return 400, no retry)
 *   internal      — webhook secret not configured (return 500)
 */
export async function handleWebhookRequest(
  rawBody: string,
  signature: string | null,
): Promise<Result<{ received: true }>> {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    logger.error(
      { event: "payments.webhook.no_secret" },
      "STRIPE_WEBHOOK_SECRET not set — cannot verify webhook",
    );
    return fail("internal", "Webhook not configured.");
  }
  if (!signature) return fail("validation", "Missing stripe-signature header.");

  let evt: Stripe.Event;
  try {
    evt = getStripe().webhooks.constructEvent(
      rawBody,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.warn({ event: "payments.webhook.bad_signature", msg }, "invalid webhook signature");
    return fail("validation", "Invalid signature.");
  }

  await handleStripeEvent(evt);
  return ok({ received: true });
}

// ── reads ──────────────────────────────────────────────────────────────────

export async function getPaymentById(id: string): Promise<PaymentRow | null> {
  const [row] = await db.select().from(payments).where(eq(payments.id, id));
  return row ?? null;
}
