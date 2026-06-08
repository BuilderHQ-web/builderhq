"use server";

/**
 * /guide — server action for the Melbourne Build Brief landing page.
 *
 * Flow:
 *   1. Validate input (Zod via the leads service)
 *   2. Rate-limit per IP (Upstash, reused signup limiter)
 *   3. Persist lead row → leads table
 *   4. Fan out two emails in parallel:
 *      - user-facing PDF delivery
 *      - ops notification to info@builderhq.com.au
 *   5. Best-effort stamp success/failure back onto the lead row
 *
 * Email failures are NON-FATAL. The lead row exists either way — if
 * Resend hiccups, an admin can re-send from /admin/leads (next).
 *
 * Returns a simple { ok: true } shape on success — the page redirects
 * to /guide-confirmed client-side after a successful response.
 */

import { headers } from "next/headers";

import { createLead, markLeadDelivered, markLeadDeliveryFailed, markLeadOpsNotified } from "@/modules/leads";
import { sendGuideDownloadEmail, sendGuideLeadOpsEmail } from "@/modules/email";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { fail, ok, type Result } from "@/lib/result";
import { clientIpFromHeaders, limiters } from "@/lib/ratelimit";

export interface GuideLeadInput {
  firstName: string;
  email: string;
  phone?: string;
  source?: string;
}

export async function submitGuideLeadAction(
  input: GuideLeadInput,
): Promise<Result<{ ok: true }>> {
  // Pull request context. headers() is async in Next.js 16.
  const hdrs = await headers();
  const ip = clientIpFromHeaders(hdrs);
  const userAgent = hdrs.get("user-agent") ?? null;

  // Rate-limit per IP. Re-use the signup limiter (5 per 5 min) since
  // it's the closest analogue — anonymous form submission with email.
  const rl = await limiters.signUp.limit(ip);
  if (!rl.success) {
    return fail(
      "rate_limited",
      "Too many submissions from this network. Wait a minute and try again.",
    );
  }

  // 1 + 2 — validate + persist.
  const leadResult = await createLead({
    kind: "guide_melbourne_build_brief",
    firstName: input.firstName,
    email: input.email,
    phone: input.phone,
    source: input.source ?? null,
    ip,
    userAgent,
    meta: { guide: "melbourne_build_brief", variant: "vol1" },
  });

  if (!leadResult.ok) return leadResult;
  const lead = leadResult.value;

  // 3 — fan-out emails. Both are fire-and-await with their own
  // try/catch via the Result types — neither blocks the other.
  const downloadUrl = `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/downloads/melbourne-build-brief-vol1.pdf`;

  const [userEmail, opsEmail] = await Promise.all([
    sendGuideDownloadEmail({
      to: lead.email,
      firstName: lead.firstName,
      downloadUrl,
    }),
    sendGuideLeadOpsEmail({
      leadId: lead.id,
      firstName: lead.firstName,
      email: lead.email,
      phone: lead.phone,
      source: lead.source,
      createdAt: lead.createdAt,
    }),
  ]);

  // 4 — stamp result back onto the lead row. Best-effort.
  if (userEmail.ok) {
    await markLeadDelivered(lead.id);
  } else {
    await markLeadDeliveryFailed(lead.id, userEmail.error.message);
    logger.warn(
      {
        event: "guide.lead_email_failed",
        leadId: lead.id,
        msg: userEmail.error.message,
      },
      "guide download email did not send, lead retained, admin can retry",
    );
  }
  if (opsEmail.ok) {
    await markLeadOpsNotified(lead.id);
  } else {
    logger.warn(
      {
        event: "guide.ops_email_failed",
        leadId: lead.id,
        msg: opsEmail.error.message,
      },
      "ops notification did not send, lead retained, dashboard will surface it",
    );
  }

  return ok({ ok: true });
}
