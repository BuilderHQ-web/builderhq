/**
 * payments · Stripe client (server-only).
 *
 * One lazily-instantiated Stripe client for the whole app. Lazy because
 * STRIPE_SECRET_KEY is optional in env (so builds / non-payment code
 * paths don't require it) — but the moment any payment code actually
 * runs without a key, we throw a clear error instead of a cryptic SDK one.
 *
 * Never `new Stripe()` anywhere else — import `getStripe()` from here.
 */

import "server-only";

import Stripe from "stripe";

import { env } from "@/lib/env";

let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (client) return client;
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set — payments are unavailable. Add it to the environment.",
    );
  }
  // apiVersion intentionally omitted: the installed SDK pins its own
  // supported version, which avoids a literal-type mismatch on upgrade.
  client = new Stripe(env.STRIPE_SECRET_KEY);
  return client;
}

/** True when Stripe is configured — lets callers degrade gracefully. */
export function isStripeConfigured(): boolean {
  return Boolean(env.STRIPE_SECRET_KEY);
}
