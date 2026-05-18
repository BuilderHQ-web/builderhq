/**
 * POST /api/auth/email-link
 *
 * Passwordless sign-in. Caller posts `{ email }`. Server:
 *
 *   1. Rate-limits by both email (3/10min) and IP (10/5min) — email
 *      gate prevents spamming a specific user's inbox; IP gate
 *      blunts account-discovery brute force.
 *   2. Issues a sign-in magic link if the email belongs to an
 *      eligible account.
 *   3. Returns the SAME `{ ok: true }` response regardless of
 *      whether the email is registered — never reveals account
 *      existence. The /login UI shows "Check your inbox" either way.
 *
 * The client doesn't get to know which case it was. The user finds
 * out by whether an email arrives.
 *
 * For users who came through the ads funnel and never set a password,
 * this is their primary path back into the dashboard from a new
 * device.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/logger";
import { clientIpFromHeaders, limiters } from "@/lib/ratelimit";
import { issueSigninMagicLink } from "@/modules/auth";

export const runtime = "nodejs";

const BodySchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
});

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, code: "validation", message: "Invalid request." },
      { status: 400 },
    );
  }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, code: "validation", message: "Enter a valid email." },
      { status: 400 },
    );
  }
  const { email } = parsed.data;
  const ip = clientIpFromHeaders(request.headers);

  // Per-IP gate first — the cheaper signal. Blocks an attacker
  // sweeping many emails from one IP.
  const ipRl = await limiters.authEmailLinkIp.limit(ip);
  if (!ipRl.success) {
    // Generic success to keep the response shape constant — never
    // reveals "you're rate-limited because of the email" vs "because
    // of the IP" to a probing client.
    logger.info(
      { event: "auth.email_link.ip_rate_limited", ip },
      "email-link request rate-limited by IP",
    );
    return NextResponse.json({ ok: true });
  }

  // Per-email gate — keep one user's inbox from getting hammered
  // even if the requests come from rotating IPs.
  const emailRl = await limiters.authEmailLinkEmail.limit(`email:${email}`);
  if (!emailRl.success) {
    logger.info(
      { event: "auth.email_link.email_rate_limited" },
      "email-link request rate-limited by email",
    );
    return NextResponse.json({ ok: true });
  }

  const result = await issueSigninMagicLink(email);
  if (!result.ok) {
    // Validation issue (e.g. malformed email that slipped past zod).
    // Still respond ok to keep account-existence private.
    logger.info(
      { event: "auth.email_link.issue_failed", err: result.error.message },
      "issueSigninMagicLink failed; responding ok to preserve privacy",
    );
    return NextResponse.json({ ok: true });
  }

  // result.value.sent tells us whether an email was actually queued;
  // we don't surface it to the client (privacy). We DO log it for
  // ops visibility.
  logger.info(
    { event: "auth.email_link.request_handled", sent: result.value.sent },
    "email-link request handled",
  );

  return NextResponse.json({ ok: true });
}
