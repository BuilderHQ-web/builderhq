"use server";

/**
 * /architect-tender — server action.
 *
 * Private confirmation flow for a cold-outreach campaign to senior
 * Melbourne architects whose Planning Permit applications surface on
 * PlanningAlerts.org.au within Moonee Valley and Merri-bek councils.
 * Architects arrive here via a personal email from Aryan that
 * already includes the project address as a URL parameter; the form
 * confirms onboarding consent.
 *
 * Brief named this endpoint "/api/onboard-project-for-tender" in REST
 * terms. We mount it as a Next.js server action instead to match every
 * other lead-capture form in this codebase (/guide, /estimate_request)
 * — fewer moving parts, same wire effect, full type safety.
 *
 * Flow:
 *   1. Zod-validate the form input
 *   2. Rate-limit per IP (Upstash, reuse the signup limiter)
 *   3. Persist a `lead_kind = 'architect_tender'` row. Surname,
 *      practice name, project address, consent flag, ref param ride in
 *      the `meta` jsonb (same pattern as estimate_request).
 *   4. Send two emails in parallel:
 *        - info@ ops notification (action required within 24hr)
 *        - architect confirmation (holding email; substantive reply
 *          comes from Aryan personally afterwards)
 *   5. Stamp ops_notified_at on the lead row.
 *
 * Returns `{ ok: true }` on success — the client redirects to
 * /architect-tender-confirmed which fires the Google Ads conversion.
 */

import { headers } from "next/headers";
import { z } from "zod";

import { createLead, markLeadOpsNotified } from "@/modules/leads";
import {
  sendArchitectTenderOpsEmail,
  sendArchitectTenderConfirmationEmail,
} from "@/modules/email";
import { logger } from "@/lib/logger";
import { fail, ok, type Result } from "@/lib/result";
import { clientIpFromHeaders, limiters } from "@/lib/ratelimit";

const inputSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(80),
  surname: z.string().trim().min(1, "Surname is required.").max(80),
  email: z.email("That email looks off — please double-check.").max(160),
  practiceName: z.string().trim().min(1, "Practice name is required.").max(160),
  projectAddress: z
    .string()
    .trim()
    .min(4, "Please confirm the project address.")
    .max(240),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  consent: z
    .boolean()
    .refine((v) => v === true, "Consent is required to onboard the project."),
  ref: z.string().trim().max(80).optional().or(z.literal("")),
});

export type ArchitectTenderInput = z.infer<typeof inputSchema>;

export async function submitArchitectTenderAction(
  input: ArchitectTenderInput,
): Promise<Result<{ ok: true }>> {
  // Zod first — surface inline field errors via the issues array so the
  // client can highlight the specific input that failed.
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return fail("validation", first?.message ?? "Some fields need fixing.", {
      issues: parsed.error.issues,
    });
  }
  const v = parsed.data;

  const hdrs = await headers();
  const ip = clientIpFromHeaders(hdrs);
  const userAgent = hdrs.get("user-agent") ?? null;

  // Rate-limit per IP. Same ceiling as signup since the abuse profile
  // is identical (anonymous form, email collected, downstream fan-out).
  const rl = await limiters.signUp.limit(ip);
  if (!rl.success) {
    return fail(
      "rate_limited",
      "Too many submissions from this network. Wait a minute and try again.",
    );
  }

  // Surname, practice name, and project address are first-class columns
  // on leads as of migration 0021 — `project_address` is indexed
  // case-insensitively for dedupe + admin search. `meta` only carries
  // truly form-specific bits (consent flag, ref, intent marker).
  const refRaw = (v.ref ?? "").trim();
  const source =
    refRaw.length > 0
      ? `architect_outreach_${refRaw}`
      : "architect_outreach";

  const meta: Record<string, unknown> = {
    consent: true,
    tender_intent: true,
    ref: refRaw || null,
  };

  const leadResult = await createLead({
    kind: "architect_tender",
    firstName: v.firstName,
    lastName: v.surname,
    email: v.email.trim().toLowerCase(),
    phone: v.phone && v.phone.length > 0 ? v.phone : null,
    practiceName: v.practiceName,
    projectAddress: v.projectAddress,
    source,
    ip,
    userAgent,
    meta,
  });

  if (!leadResult.ok) return leadResult;
  const lead = leadResult.value;

  // Fire both emails in parallel — they're independent and either can
  // fail without breaking the lead row, which is the canonical record.
  const [opsResult, confirmationResult] = await Promise.all([
    sendArchitectTenderOpsEmail({
      leadId: lead.id,
      firstName: v.firstName,
      lastName: v.surname,
      email: lead.email,
      phone: lead.phone,
      practiceName: v.practiceName,
      projectAddress: v.projectAddress,
      source: lead.source,
      ref: refRaw || null,
      createdAt: lead.createdAt,
    }),
    sendArchitectTenderConfirmationEmail({
      to: lead.email,
      firstName: v.firstName,
      practiceName: v.practiceName,
      projectAddress: v.projectAddress,
    }),
  ]);

  if (opsResult.ok) {
    await markLeadOpsNotified(lead.id);
  } else {
    logger.warn(
      {
        event: "architect_tender.ops_email_failed",
        leadId: lead.id,
        msg: opsResult.error.message,
      },
      "architect tender ops notification did not send — lead retained for admin retry",
    );
  }

  if (!confirmationResult.ok) {
    logger.warn(
      {
        event: "architect_tender.confirmation_email_failed",
        leadId: lead.id,
        msg: confirmationResult.error.message,
      },
      "architect tender confirmation did not send — the architect won't see a receipt but the lead is captured",
    );
  }

  return ok({ ok: true });
}
