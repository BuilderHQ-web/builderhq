"use server";

/**
 * /partner-interest — server action behind the landing "Join the network"
 * CTAs for architects and finance brokers.
 *
 * Not a page: there is no /partner-interest route. This module exists only
 * to host the server action that the landing's <PartnerForm> modal calls.
 * Mirrors every other lead-capture form in the codebase (/guide,
 * /architect-tender): validate, rate-limit, persist a `leads` row, fan out
 * two emails (ops notify + applicant confirmation), stamp the result.
 *
 * Firm name lands in `practice_name`; network / state / website ride in the
 * `meta` jsonb. No project is attached (these are practitioners).
 */

import { headers } from "next/headers";
import { z } from "zod";

import {
  createLead,
  markLeadDelivered,
  markLeadDeliveryFailed,
  markLeadOpsNotified,
} from "@/modules/leads";
import {
  sendPartnerInterestOpsEmail,
  sendPartnerInterestConfirmationEmail,
} from "@/modules/email";
import { logger } from "@/lib/logger";
import { fail, ok, type Result } from "@/lib/result";
import { clientIpFromHeaders, limiters } from "@/lib/ratelimit";

/** Australian states + territories — the select options on the form. */
const AU_STATES = ["VIC", "NSW", "QLD", "ACT", "SA", "WA", "TAS", "NT"] as const;

const inputSchema = z.object({
  network: z.enum(["architect", "finance"]),
  fullName: z.string().trim().min(1, "Your name is required.").max(120),
  firmName: z
    .string()
    .trim()
    .min(1, "Please add your practice or business name.")
    .max(160),
  email: z.email("That email looks off, please double-check.").max(160),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  state: z.enum(AU_STATES),
  website: z.string().trim().max(200).optional().or(z.literal("")),
  /** Honeypot — checked before validation; kept here for typing only. */
  hp: z.string().optional(),
});

export type PartnerInterestInput = z.infer<typeof inputSchema>;

export async function submitPartnerInterestAction(
  input: PartnerInterestInput,
): Promise<Result<{ ok: true }>> {
  // Honeypot: bots fill hidden fields humans never see. Feign success so
  // the bot moves on, but do nothing — no row, no email.
  if (typeof input?.hp === "string" && input.hp.trim().length > 0) {
    logger.info({ event: "partner_interest.honeypot_tripped" }, "partner form honeypot tripped");
    return ok({ ok: true });
  }

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

  // Same ceiling as signup — identical abuse profile (anonymous form,
  // email collected, downstream email fan-out).
  const rl = await limiters.signUp.limit(ip);
  if (!rl.success) {
    return fail(
      "rate_limited",
      "Too many submissions from this network. Wait a minute and try again.",
    );
  }

  // Split the single "Full name" field into the leads columns.
  const parts = v.fullName.trim().split(/\s+/);
  const firstName = parts[0] ?? v.fullName.trim();
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : null;

  // Normalise the website to an absolute URL so the ops-email link works.
  const websiteRaw = (v.website ?? "").trim();
  const website = websiteRaw
    ? /^https?:\/\//i.test(websiteRaw)
      ? websiteRaw
      : `https://${websiteRaw}`
    : null;

  const kind =
    v.network === "architect"
      ? "partner_architect_interest"
      : "partner_finance_interest";
  const source = `landing_partner_${v.network}`;

  const leadResult = await createLead({
    kind,
    firstName,
    lastName,
    email: v.email.trim().toLowerCase(),
    phone: v.phone && v.phone.length > 0 ? v.phone : null,
    practiceName: v.firmName,
    source,
    ip,
    userAgent,
    meta: { network: v.network, state: v.state, website },
  });

  if (!leadResult.ok) return leadResult;
  const lead = leadResult.value;

  // Fire both emails in parallel — independent; either can fail without
  // breaking the lead row, which is the canonical record.
  const [opsResult, confirmationResult] = await Promise.all([
    sendPartnerInterestOpsEmail({
      leadId: lead.id,
      firstName,
      lastName,
      email: lead.email,
      phone: lead.phone,
      firmName: v.firmName,
      network: v.network,
      state: v.state,
      website,
      source: lead.source,
      createdAt: lead.createdAt,
    }),
    sendPartnerInterestConfirmationEmail({
      to: lead.email,
      firstName,
      firmName: v.firmName,
      network: v.network,
    }),
  ]);

  if (opsResult.ok) {
    await markLeadOpsNotified(lead.id);
  } else {
    logger.warn(
      {
        event: "partner_interest.ops_email_failed",
        leadId: lead.id,
        msg: opsResult.error.message,
      },
      "partner interest ops notification did not send, lead retained for admin retry",
    );
  }

  if (confirmationResult.ok) {
    await markLeadDelivered(lead.id);
  } else {
    await markLeadDeliveryFailed(lead.id, confirmationResult.error.message);
    logger.warn(
      {
        event: "partner_interest.confirmation_email_failed",
        leadId: lead.id,
        msg: confirmationResult.error.message,
      },
      "partner interest confirmation did not send, applicant won't see a receipt but the lead is captured",
    );
  }

  return ok({ ok: true });
}
