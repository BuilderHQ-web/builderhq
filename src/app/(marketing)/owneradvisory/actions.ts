"use server";

/**
 * /owneradvisory — server action for the Owner Advisory Program.
 *
 * Flow (mirrors /guide):
 *   1. Rate-limit per IP (reused signup limiter)
 *   2. Validate the qualifier (project type + stage from a fixed set,
 *      suburb non-empty) — the progressive form gates first; this is
 *      the authoritative backstop
 *   3. Persist a lead row (kind: owner_advisory; project_type/suburb/
 *      stage in meta; first name + email top-level)
 *   4. Fan out two emails in parallel:
 *      - confirmation to the homeowner (what happens next)
 *      - ops notification to info@builderhq.com.au (lead + next step)
 *   5. Best-effort stamp success/failure back onto the lead row
 *
 * Email failures are NON-FATAL — the lead row exists either way and an
 * admin can follow up from the leads dashboard.
 */

import { headers } from "next/headers";

import {
  createLead,
  markLeadDelivered,
  markLeadDeliveryFailed,
  markLeadOpsNotified,
} from "@/modules/leads";
import {
  sendOwnerAdvisoryOpsEmail,
  sendOwnerAdvisoryConfirmationEmail,
} from "@/modules/email";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { normaliseAuPhone } from "@/lib/au-phone";
import { fail, ok, type Result } from "@/lib/result";
import { clientIpFromHeaders, limiters } from "@/lib/ratelimit";

export interface OwnerAdvisoryInput {
  projectType: string;
  suburb: string;
  stage: string;
  firstName: string;
  mobile: string;
  email: string;
  source?: string;
}

/** Allowed answers — kept in lockstep with the form's option lists. */
const PROJECT_TYPES = [
  "New home",
  "Major renovation",
  "Knock-down rebuild",
  "Townhouse or multi-dwelling",
];
const STAGES = [
  "Still finalising drawings",
  "Have working drawings",
  "Already getting quotes",
  "Ready to tender now",
];

export async function submitOwnerAdvisoryAction(
  input: OwnerAdvisoryInput,
): Promise<Result<{ ok: true }>> {
  const hdrs = await headers();
  const ip = clientIpFromHeaders(hdrs);
  const userAgent = hdrs.get("user-agent") ?? null;

  // 1 — rate limit per IP.
  const rl = await limiters.signUp.limit(ip);
  if (!rl.success) {
    return fail(
      "rate_limited",
      "Too many submissions from this network. Wait a minute and try again.",
    );
  }

  // 2 — validate the qualifier server-side.
  const projectType = PROJECT_TYPES.includes(input.projectType?.trim())
    ? input.projectType.trim()
    : null;
  const stage = STAGES.includes(input.stage?.trim()) ? input.stage.trim() : null;
  const suburb = input.suburb?.trim() ?? "";
  if (!projectType || !stage) {
    return fail("validation", "Please choose your project type and stage.");
  }
  if (suburb.length < 2) {
    return fail("validation", "Please tell us your Melbourne suburb.");
  }
  const phone = normaliseAuPhone(input.mobile ?? "");
  if (!phone) {
    return fail("validation", "Please enter a valid Australian mobile number.");
  }

  // 3 — persist (createLead validates first name + email via Zod; phone is
  //     already normalised to E.164 above).
  const leadResult = await createLead({
    kind: "owner_advisory",
    firstName: input.firstName,
    email: input.email,
    phone,
    source: input.source ?? null,
    ip,
    userAgent,
    meta: { projectType, suburb, stage },
  });
  if (!leadResult.ok) return leadResult;
  const lead = leadResult.value;

  // 4 — fan-out emails (owner confirmation + ops). Independent.
  const guideUrl = `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/guide`;
  const [confirmEmail, opsEmail] = await Promise.all([
    sendOwnerAdvisoryConfirmationEmail({
      to: lead.email,
      firstName: lead.firstName,
      projectType,
      suburb,
      guideUrl,
    }),
    sendOwnerAdvisoryOpsEmail({
      leadId: lead.id,
      firstName: lead.firstName,
      email: lead.email,
      phone: lead.phone,
      projectType,
      suburb,
      stage,
      source: lead.source,
      createdAt: lead.createdAt,
    }),
  ]);

  // 5 — stamp result. Best-effort.
  if (confirmEmail.ok) {
    await markLeadDelivered(lead.id);
  } else {
    await markLeadDeliveryFailed(lead.id, confirmEmail.error.message);
    logger.warn(
      {
        event: "owner_advisory.confirm_email_failed",
        leadId: lead.id,
        msg: confirmEmail.error.message,
      },
      "advisory confirmation email did not send, lead retained",
    );
  }
  if (opsEmail.ok) {
    await markLeadOpsNotified(lead.id);
  } else {
    logger.warn(
      {
        event: "owner_advisory.ops_email_failed",
        leadId: lead.id,
        msg: opsEmail.error.message,
      },
      "advisory ops email did not send, lead retained, dashboard will surface it",
    );
  }

  return ok({ ok: true });
}
