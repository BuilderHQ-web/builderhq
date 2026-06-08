"use server";

/**
 * /estimate_request_landing_page — server action.
 *
 * Distinct from the /guide flow in one critical way:
 *   NO email goes to the customer.
 *
 * The user submits, the lead is persisted, an ops notification fires
 * to info@builderhq.com.au, and the team reaches out manually within
 * 12 hours to collect drawings + return the estimate. This is a
 * concierge service, not a self-serve download — automating the
 * customer touch here would undercut the white-glove pitch.
 *
 * Flow:
 *   1. Zod-validate the form input
 *   2. Rate-limit per IP (Upstash, reused signup limiter)
 *   3. Persist `lead_kind = 'estimate_request'` with last_name +
 *      project_type + company captured in `meta` jsonb
 *   4. Send ops-only email to info@
 *   5. Stamp ops_notified_at on the lead row
 *
 * Returns `{ ok: true }` on success — the client redirects to
 * /estimate_received which fires any Google Ads conversion pixel.
 */

import { headers } from "next/headers";

import {
  createLead,
  markLeadOpsNotified,
} from "@/modules/leads";
import { sendEstimateRequestOpsEmail } from "@/modules/email";
import { logger } from "@/lib/logger";
import { fail, ok, type Result } from "@/lib/result";
import { clientIpFromHeaders, limiters } from "@/lib/ratelimit";

export interface EstimateLeadInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  projectType?: string;
  company?: string;
  source?: string;
}

export async function submitEstimateRequestAction(
  input: EstimateLeadInput,
): Promise<Result<{ ok: true }>> {
  const hdrs = await headers();
  const ip = clientIpFromHeaders(hdrs);
  const userAgent = hdrs.get("user-agent") ?? null;

  // Rate-limit. Same ceiling as signup since the abuse vector is
  // similar (anonymous form, email collected, downstream fan-out).
  const rl = await limiters.signUp.limit(ip);
  if (!rl.success) {
    return fail(
      "rate_limited",
      "Too many submissions from this network. Wait a minute and try again.",
    );
  }

  // Phone is required for this flow (we call the customer back) — Zod
  // in leads/service.ts allows null phone for guide downloads, so we
  // enforce non-empty here at the action layer.
  if (!input.phone || input.phone.trim().length < 8) {
    return fail("validation", "A phone number is required so we can reach you.", {
      issues: [{ path: ["phone"], message: "Please enter a phone number." }],
    });
  }
  if (!input.lastName || input.lastName.trim().length < 1) {
    return fail("validation", "Last name is required.", {
      issues: [{ path: ["lastName"], message: "Please enter your last name." }],
    });
  }

  const meta: Record<string, unknown> = {
    last_name: input.lastName.trim(),
  };
  if (input.projectType && input.projectType.trim().length > 0) {
    meta.project_type = input.projectType.trim();
  }
  if (input.company && input.company.trim().length > 0) {
    meta.company = input.company.trim();
  }

  const leadResult = await createLead({
    kind: "estimate_request",
    firstName: input.firstName,
    email: input.email,
    phone: input.phone,
    source: input.source ?? null,
    ip,
    userAgent,
    meta,
  });

  if (!leadResult.ok) return leadResult;
  const lead = leadResult.value;

  // Ops email only — no customer-facing email by design. Failures are
  // non-fatal; the lead row exists either way and admin can spot
  // missing notifications in the dashboard.
  const opsResult = await sendEstimateRequestOpsEmail({
    leadId: lead.id,
    firstName: lead.firstName,
    lastName: (meta.last_name as string) ?? "",
    email: lead.email,
    phone: lead.phone,
    projectType: (meta.project_type as string | undefined) ?? null,
    company: (meta.company as string | undefined) ?? null,
    source: lead.source,
    createdAt: lead.createdAt,
  });

  if (opsResult.ok) {
    await markLeadOpsNotified(lead.id);
  } else {
    logger.warn(
      {
        event: "estimate.ops_email_failed",
        leadId: lead.id,
        msg: opsResult.error.message,
      },
      "estimate ops notification did not send, lead retained for admin retry",
    );
  }

  return ok({ ok: true });
}
