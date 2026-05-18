/**
 * Rate-limit primitives.
 *
 * Backed by Upstash Redis sliding-window counters. Env-gated:
 *
 *   - If UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set
 *     (production / preview), real rate limits enforce.
 *   - If unset (typical local dev), every check resolves to allowed.
 *     This means engineers don't need a Redis instance for `pnpm dev`
 *     to work end-to-end on auth flows.
 *
 * Each named limiter has its own window + budget tuned to the
 * specific abuse vector:
 *
 *   - `signIn`        — 10 attempts per 60s per IP. Brute-force gate.
 *   - `signUp`        — 5 per 5 min per IP. Account-creation flood gate.
 *   - `forgot`        — 3 per 10 min per email/IP. Email-spam gate
 *                       (the password-reset endpoint can be weaponised
 *                       to burn Resend reputation).
 *   - `verifyResend`  — 3 per 10 min per email. Same vector.
 *   - `unlock`        — 30 per 60s per user. Project-unlock spam.
 *
 * Callers use it like:
 *
 *   const r = await limiters.signIn.limit(ip);
 *   if (!r.success) return fail("rate_limited", "Too many attempts. Try again in a minute.");
 *
 * IP comes from the request headers — typically `x-forwarded-for`
 * via the helper below. For email-keyed limits the caller passes
 * `email:<address>` instead.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
const ENABLED = Boolean(url && token);

// Singleton client. The factory pattern lets us keep a single
// connection across the cold-start lifetime of a serverless function.
const redis = ENABLED
  ? new Redis({
      url: url!,
      token: token!,
    })
  : null;

/**
 * Fallback when Upstash isn't configured. Every check passes. Logs
 * once at module load so engineers running locally see the no-op
 * notice (and prod misconfig stands out — a never-firing rate limit
 * is a launch bug).
 */
function makeNoopLimiter(name: string): Ratelimit {
  return {
    limit: async () => ({
      success: true,
      limit: Number.POSITIVE_INFINITY,
      remaining: Number.POSITIVE_INFINITY,
      reset: 0,
      pending: Promise.resolve(),
    }),
    blockUntilReady: async () => ({
      success: true,
      limit: Number.POSITIVE_INFINITY,
      remaining: Number.POSITIVE_INFINITY,
      reset: 0,
      pending: Promise.resolve(),
    }),
    resetUsedTokens: async () => undefined,
    getRemaining: async () => ({ remaining: Number.POSITIVE_INFINITY, reset: 0 }),
    // Internal field — we tag it for diagnostics.
    __noop: name,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

function make(name: string, requests: number, windowSec: number): Ratelimit {
  if (!redis) return makeNoopLimiter(name);
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, `${windowSec} s`),
    analytics: true,
    prefix: `rl:${name}`,
  });
}

export const limiters = {
  /** Sign-in attempts — per IP. */
  signIn: make("signin", 10, 60),
  /** New account creation — per IP. */
  signUp: make("signup", 5, 300),
  /** Password-reset request — per email/IP. */
  forgot: make("forgot", 3, 600),
  /** Re-send verification email — per email. */
  verifyResend: make("verify_resend", 3, 600),
  /** Project unlock spam — per user. */
  unlock: make("unlock", 30, 60),
  /** /start ads-funnel signup — per IP. Tighter than signUp because
   *  the funnel runs on paid traffic and is a top target for bots. */
  adsFunnelSignup: make("ads_funnel_signup", 5, 300),
  /** /start ads-funnel magic-link resend — per email. */
  adsFunnelResend: make("ads_funnel_resend", 3, 600),
  /** Passwordless sign-in link request — per email. Prevents an
   *  attacker from spam-mailing a specific user's inbox. */
  authEmailLinkEmail: make("auth_email_link_email", 3, 600),
  /** Passwordless sign-in link request — per IP. Prevents
   *  account-existence brute force by an attacker trying many
   *  emails from the same source. */
  authEmailLinkIp: make("auth_email_link_ip", 10, 300),
};

/**
 * Extract a client IP for rate-limiting from a Next.js request's
 * headers. Vercel + Cloudflare both set `x-forwarded-for`; we take
 * the first IP (closest to the client). Falls back to a constant so
 * the limiter still groups unidentified callers together rather than
 * letting all of them through unkeyed.
 */
export function clientIpFromHeaders(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

export const rateLimitEnabled = ENABLED;
