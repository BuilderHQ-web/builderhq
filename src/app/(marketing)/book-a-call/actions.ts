"use server";

/**
 * /book-a-call — server action.
 *
 * The "Book a free call" Google Ads funnel. Instead of asking a cold
 * visitor to upload plans, we capture a short qualifier and send them
 * to a Cal.com booking. This action is the lead-capture half:
 *
 *   1. Zod-validate the form input
 *   2. Rate-limit per IP (reuse the signup limiter — same abuse vector)
 *   3. Persist a `lead_kind = 'book_call'` row, with project_type /
 *      suburb / state / timeline in the `meta` jsonb column
 *   4. Send an ops-only notification to info@ so the team can line up
 *      builders before the call
 *   5. Stamp ops_notified_at on the lead row
 *
 * NO customer email is sent from here — Cal.com handles the booking
 * confirmation + reminders. Returns `{ ok: true }`; the client then
 * redirects to /book-a-call/confirmed (which fires the Google Ads
 * conversion pixel and shows the Cal.com embed).
 */

import { headers } from "next/headers";
import { z } from "zod";

import { createLead, markLeadOpsNotified } from "@/modules/leads";
import { sendBookCallOpsEmail } from "@/modules/email";
import { logger } from "@/lib/logger";
import { fail, ok, type Result } from "@/lib/result";
import { clientIpFromHeaders, limiters } from "@/lib/ratelimit";

export interface BookCallInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  projectType?: string;
  suburb?: string;
  state?: string;
  timeline?: string;
  source?: string;
}

const inputSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(80),
  lastName: z.string().trim().min(1, "Last name is required.").max(80),
  email: z.string().trim().email("Enter a valid email.").max(160),
  phone: z.string().trim().max(40).optional().default(""),
  projectType: z.string().trim().max(80).optional(),
  suburb: z.string().trim().max(120).optional(),
  state: z.string().trim().max(8).optional(),
  timeline: z.string().trim().max(40).optional(),
  source: z.string().trim().max(160).optional(),
});

export async function submitBookCallAction(
  input: BookCallInput,
): Promise<Result<{ ok: true }>> {
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

  const rl = await limiters.signUp.limit(ip);
  if (!rl.success) {
    return fail(
      "rate_limited",
      "Too many submissions from this network. Wait a minute and try again.",
    );
  }

  // Phone is required — we call them back. Same 8-digit floor as the
  // estimate flow (handles "04 1234 5678" / "9876 5432").
  if (v.phone.replace(/[^\d+]/g, "").length < 8) {
    return fail("validation", "A phone number is required so we can reach you.", {
      issues: [{ path: ["phone"], message: "Please enter a phone number." }],
    });
  }

  const location = [v.suburb, v.state].filter(Boolean).join(", ") || null;

  const meta: Record<string, unknown> = {};
  if (v.projectType) meta.project_type = v.projectType;
  if (v.suburb) meta.suburb = v.suburb;
  if (v.state) meta.state = v.state;
  if (v.timeline) meta.timeline = v.timeline;

  const leadResult = await createLead({
    kind: "book_call",
    firstName: v.firstName,
    lastName: v.lastName,
    email: v.email,
    phone: v.phone,
    source: v.source ?? null,
    ip,
    userAgent,
    meta,
  });
  if (!leadResult.ok) return leadResult;
  const lead = leadResult.value;

  // Ops email is best-effort — the lead row exists regardless, and admin
  // can spot a missing notification in the dashboard.
  const opsResult = await sendBookCallOpsEmail({
    leadId: lead.id,
    firstName: lead.firstName,
    lastName: lead.lastName ?? "",
    email: lead.email,
    phone: lead.phone,
    projectType: v.projectType ?? null,
    location,
    timeline: v.timeline ?? null,
    source: lead.source,
    createdAt: lead.createdAt,
  });

  if (opsResult.ok) {
    await markLeadOpsNotified(lead.id);
  } else {
    logger.warn(
      {
        event: "book_call.ops_email_failed",
        leadId: lead.id,
        msg: opsResult.error.message,
      },
      "book call ops notification did not send, lead retained for admin retry",
    );
  }

  return ok({ ok: true });
}
