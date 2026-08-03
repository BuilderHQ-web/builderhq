"use server";

/**
 * /partner-interest — server action behind the landing "Join the network"
 * CTA. One form, every discipline: the practitioner picks their role
 * (design practice, builder, finance broker, and whatever the register
 * adds next).
 *
 * Not a page: there is no /partner-interest route. This module exists only
 * to host the server action that the landing's <PartnerForm> modal calls.
 * Mirrors every other lead-capture form in the codebase (/guide,
 * /architect-tender): validate, rate-limit, persist a `leads` row, fan out
 * two emails (ops notify + applicant confirmation), stamp the result.
 *
 * Firm name lands in `practice_name`; role / state / website ride in the
 * `meta` jsonb, so widening the register needs no migration. No project
 * is attached (these are practitioners).
 */

import { headers } from "next/headers";
import { z } from "zod";

import {
  createLead,
  markLeadDelivered,
  markLeadDeliveryFailed,
  markLeadOpsNotified,
  INTRO_NEED_VALUES,
  PARTNER_ROLE_VALUES,
} from "@/modules/leads";
import {
  sendPartnerInterestOpsEmail,
  sendPartnerInterestConfirmationEmail,
  sendPartnerIntroOpsEmail,
  sendPartnerIntroConfirmationEmail,
} from "@/modules/email";
import { logger } from "@/lib/logger";
import { fail, ok, type Result } from "@/lib/result";
import { clientIpFromHeaders, limiters } from "@/lib/ratelimit";

/** Australian states + territories — the select options on the form. */
const AU_STATES = ["VIC", "NSW", "QLD", "ACT", "SA", "WA", "TAS", "NT"] as const;

const inputSchema = z.object({
  role: z.enum(PARTNER_ROLE_VALUES),
  fullName: z.string().trim().min(1, "Your name is required.").max(120),
  firmName: z
    .string()
    .trim()
    .min(1, "Please add your practice or business name.")
    .max(160),
  email: z.email("That email looks off, please double-check.").max(160),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  state: z.enum(AU_STATES),
  website: z
    .string()
    .trim()
    .min(1, "Please add your website.")
    .max(200),
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
  const websiteRaw = v.website.trim();
  const website = /^https?:\/\//i.test(websiteRaw)
    ? websiteRaw
    : `https://${websiteRaw}`;

  const source = `landing_partner_${v.role}`;

  const leadResult = await createLead({
    // One kind for every discipline; the role rides in meta.
    kind: "partner_network_interest",
    firstName,
    lastName,
    email: v.email.trim().toLowerCase(),
    phone: v.phone && v.phone.length > 0 ? v.phone : null,
    practiceName: v.firmName,
    source,
    ip,
    userAgent,
    meta: { role: v.role, state: v.state, website },
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
      network: v.role,
      state: v.state,
      website,
      source: lead.source,
      createdAt: lead.createdAt,
    }),
    sendPartnerInterestConfirmationEmail({
      to: lead.email,
      firstName,
      firmName: v.firmName,
      network: v.role,
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

/* ── Homeowner introduction requests ─────────────────────────────────────
   The homeowner-facing sibling of the partner form: "Request an
   introduction" on the landing network section. Same shape: validate,
   rate-limit, persist a `leads` row (kind partner_intro_request), fan out
   the ops notify + a holding confirmation. */

const introSchema = z.object({
  needs: z
    .array(z.enum(INTRO_NEED_VALUES))
    .min(1, "Tell us who you would like to meet.")
    .max(INTRO_NEED_VALUES.length),
  fullName: z.string().trim().min(1, "Your name is required.").max(120),
  email: z.email("That email looks off, please double-check.").max(160),
  phone: z.string().trim().min(1, "A phone number is required.").max(40),
  state: z.enum(AU_STATES),
  /** Honeypot — checked before validation; kept here for typing only. */
  hp: z.string().optional(),
});

export type IntroRequestInput = z.infer<typeof introSchema>;

export async function submitIntroRequestAction(
  input: IntroRequestInput,
): Promise<Result<{ ok: true }>> {
  if (typeof input?.hp === "string" && input.hp.trim().length > 0) {
    logger.info({ event: "partner_intro.honeypot_tripped" }, "intro form honeypot tripped");
    return ok({ ok: true });
  }

  const parsed = introSchema.safeParse(input);
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

  const parts = v.fullName.trim().split(/\s+/);
  const firstName = parts[0] ?? v.fullName.trim();
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : null;

  const leadResult = await createLead({
    kind: "partner_intro_request",
    firstName,
    lastName,
    email: v.email.trim().toLowerCase(),
    phone: v.phone,
    source: "landing_intro_request",
    ip,
    userAgent,
    meta: { needs: v.needs, state: v.state },
  });

  if (!leadResult.ok) return leadResult;
  const lead = leadResult.value;

  const [opsResult, confirmationResult] = await Promise.all([
    sendPartnerIntroOpsEmail({
      leadId: lead.id,
      firstName,
      lastName,
      email: lead.email,
      phone: lead.phone,
      needs: v.needs,
      state: v.state,
      source: lead.source,
      createdAt: lead.createdAt,
    }),
    sendPartnerIntroConfirmationEmail({
      to: lead.email,
      firstName,
      needs: v.needs,
    }),
  ]);

  if (opsResult.ok) {
    await markLeadOpsNotified(lead.id);
  } else {
    logger.warn(
      {
        event: "partner_intro.ops_email_failed",
        leadId: lead.id,
        msg: opsResult.error.message,
      },
      "partner intro ops notification did not send, lead retained for admin retry",
    );
  }

  if (confirmationResult.ok) {
    await markLeadDelivered(lead.id);
  } else {
    await markLeadDeliveryFailed(lead.id, confirmationResult.error.message);
    logger.warn(
      {
        event: "partner_intro.confirmation_email_failed",
        leadId: lead.id,
        msg: confirmationResult.error.message,
      },
      "partner intro confirmation did not send, homeowner won't see a receipt but the lead is captured",
    );
  }

  return ok({ ok: true });
}
