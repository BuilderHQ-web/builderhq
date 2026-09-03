/**
 * email · service.
 *
 * Thin abstraction over Resend so we can swap providers later without
 * touching callsites. Every email goes through one of the typed
 * `send<TemplateName>` functions exposed by this module — never the
 * Resend SDK directly.
 *
 * Templates live in `src/emails/` as React Email components. They render
 * to HTML + plain-text via `@react-email/render`.
 *
 * Phase 1 ships the verification-email path. The email_logs table arrives
 * with the audit module in Phase 4; until then we log to the structured
 * logger so failures surface in Sentry/Better Stack.
 */

import { Resend } from "resend";
import { render } from "@react-email/render";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { fail, ok, type Result } from "@/lib/result";

import { VerificationEmail } from "@/emails/VerificationEmail";
import { MobileVerificationCodeEmail } from "@/emails/MobileVerificationCodeEmail";
import { MobilePasswordResetCodeEmail } from "@/emails/MobilePasswordResetCodeEmail";
import { PasswordResetEmail } from "@/emails/PasswordResetEmail";
import { LaunchInviteEmail } from "@/emails/LaunchInviteEmail";
import { GuideDownloadEmail } from "@/emails/GuideDownloadEmail";
import { GuideLeadOpsEmail } from "@/emails/GuideLeadOpsEmail";
import { EstimateRequestOpsEmail } from "@/emails/EstimateRequestOpsEmail";
import { BookCallOpsEmail } from "@/emails/BookCallOpsEmail";
import { ArchitectTenderOpsEmail } from "@/emails/ArchitectTenderOpsEmail";
import { ArchitectTenderConfirmationEmail } from "@/emails/ArchitectTenderConfirmationEmail";
import {
  PartnerInterestConfirmationEmail,
  type PartnerNetwork,
} from "@/emails/PartnerInterestConfirmationEmail";
import { MetaLeadOpsEmail } from "@/emails/MetaLeadOpsEmail";
import { MetaLeadUnretrievableEmail } from "@/emails/MetaLeadUnretrievableEmail";
import { PartnerInterestOpsEmail } from "@/emails/PartnerInterestOpsEmail";
import { introNeedsLabel } from "@/modules/leads/partner-roles";
import { PartnerIntroOpsEmail } from "@/emails/PartnerIntroOpsEmail";
import { PartnerIntroConfirmationEmail } from "@/emails/PartnerIntroConfirmationEmail";
import { OwnerAdvisoryOpsEmail } from "@/emails/OwnerAdvisoryOpsEmail";
import { OwnerAdvisoryConfirmationEmail } from "@/emails/OwnerAdvisoryConfirmationEmail";
import { TenderSubmittedEmail } from "@/emails/TenderSubmittedEmail";
import { TenderSubmittedBuilderEmail } from "@/emails/TenderSubmittedBuilderEmail";
import { TenderSubmittedOpsEmail } from "@/emails/TenderSubmittedOpsEmail";
import { TenderShortlistedEmail } from "@/emails/TenderShortlistedEmail";
import { TenderAwardedEmail } from "@/emails/TenderAwardedEmail";
import { TenderRejectedEmail } from "@/emails/TenderRejectedEmail";
import { TenderWithdrawnEmail } from "@/emails/TenderWithdrawnEmail";
import { BuilderTenderInvitationEmail } from "@/emails/BuilderTenderInvitationEmail";
import { ParticipantInviteEmail } from "@/emails/ParticipantInviteEmail";
import { ParticipantJoinedEmail } from "@/emails/ParticipantJoinedEmail";
import { RoundAwardedNoticeEmail } from "@/emails/RoundAwardedNoticeEmail";
import { TenderValidityExpiringEmail } from "@/emails/TenderValidityExpiringEmail";
import { ScopeReadyEmail } from "@/emails/ScopeReadyEmail";
import { ScopeAddendumEmail } from "@/emails/ScopeAddendumEmail";
import { ScopeRunOpsEmail } from "@/emails/ScopeRunOpsEmail";
import { OwnerSignupOpsEmail } from "@/emails/OwnerSignupOpsEmail";
import { BuilderSignupOpsEmail } from "@/emails/BuilderSignupOpsEmail";
import { ArchitectSignupOpsEmail } from "@/emails/ArchitectSignupOpsEmail";
import { BuilderApprovedEmail } from "@/emails/BuilderApprovedEmail";
import { OwnerWelcomeEmail } from "@/emails/OwnerWelcomeEmail";
import { ArchitectWelcomeEmail } from "@/emails/ArchitectWelcomeEmail";
import { ProjectPublishedOwnerEmail } from "@/emails/ProjectPublishedOwnerEmail";
import { ProjectPublishedBuilderEmail } from "@/emails/ProjectPublishedBuilderEmail";
import { ProjectPublishedOpsEmail } from "@/emails/ProjectPublishedOpsEmail";
import { UnlockOwnerEmail } from "@/emails/UnlockOwnerEmail";
import { UnlockBuilderEmail } from "@/emails/UnlockBuilderEmail";
import { UnlockOpsEmail } from "@/emails/UnlockOpsEmail";
import { AdsFunnelMagicLinkEmail } from "@/emails/AdsFunnelMagicLinkEmail";
import { AuthSigninLinkEmail } from "@/emails/AuthSigninLinkEmail";

const resend = new Resend(env.RESEND_API_KEY);

/**
 * Hardcoded ops inbox. The same address regardless of environment, so
 * baking it in beats threading another env var. If we ever need a
 * staging variant we'll lift it to env at that point.
 */
export const OPS_EMAIL = "info@builderhq.com.au";

/**
 * Drop-in replacement for `resend.emails.send()` that adds a dev-mode
 * allowlist guard. Same call signature, same return shape — every send
 * function in this file routes through here.
 *
 * Behaviour:
 *   · NODE_ENV === "production" → always forwards to Resend untouched.
 *   · Otherwise → checks the recipient(s) against EMAIL_DEV_ALLOWLIST
 *     (comma-separated, case-insensitive). If any recipient isn't on
 *     the allowlist, the entire send is suppressed, logged, and a fake
 *     message id is returned. Caller's success path keeps working —
 *     they just don't actually hit Resend.
 *
 * Why this matters: when a developer points their local server at a
 * Neon dev branch, the branch is seeded with REAL builder emails from
 * production. Without this guard, a "publish project" test would
 * notify every real builder in the seed. With it, only emails to
 * addresses you explicitly allowlist (typically your own) go out.
 */
async function sendViaResend(
  input: Parameters<typeof resend.emails.send>[0],
): Promise<Awaited<ReturnType<typeof resend.emails.send>>> {
  if (env.NODE_ENV !== "production") {
    const allowlist = (env.EMAIL_DEV_ALLOWLIST ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const recipients = (Array.isArray(input.to) ? input.to : [input.to])
      .filter((x): x is string => typeof x === "string")
      .map((x) => x.toLowerCase());
    const blocked = recipients.filter((r) => !allowlist.includes(r));
    if (blocked.length > 0) {
      logger.warn(
        {
          event: "email.dev_suppressed",
          to: input.to,
          blocked,
          subject: input.subject,
          allowlist,
        },
        "[DEV] email suppressed by EMAIL_DEV_ALLOWLIST — add the recipient to allow real sends",
      );
      return {
        data: { id: `dev-suppressed-${Date.now()}` },
        error: null,
      } as Awaited<ReturnType<typeof resend.emails.send>>;
    }
  }
  return resend.emails.send(input);
}

interface SendVerificationEmailInput {
  to: string;
  verifyUrl: string;
  firstName: string | null;
}

export async function sendVerificationEmail(
  input: SendVerificationEmailInput,
): Promise<Result<{ id: string }>> {
  const subject = "Verify your BuilderHQ account";
  const props = { verifyUrl: input.verifyUrl, firstName: input.firstName };

  const [html, text] = await Promise.all([
    render(VerificationEmail(props)),
    render(VerificationEmail(props), { plainText: true }),
  ]);

  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: input.to,
    subject,
    html,
    text,
  });

  if (error) {
    logger.error(
      { event: "email.verification.failed", to: input.to, code: error.name, message: error.message },
      "verification email send failed",
    );
    return fail("external_error", "We couldn't send your verification email. Try again in a moment.");
  }

  if (!data) {
    return fail("external_error", "Email provider returned no message id");
  }

  logger.info(
    { event: "email.verification.sent", to: input.to, resendId: data.id },
    "verification email sent",
  );
  return ok({ id: data.id });
}

interface SendMobileVerificationCodeEmailInput {
  to: string;
  code: string;
  firstName: string | null;
  expiresInMinutes: number;
}

/**
 * Mobile-app sign-up code. Sister to `sendVerificationEmail` but ships a
 * 6-digit code instead of a link so the user can stay inside the app.
 * The auth service handles minting / expiring the code; this function
 * just renders + delivers it.
 */
export async function sendMobileVerificationCode(
  input: SendMobileVerificationCodeEmailInput,
): Promise<Result<{ id: string }>> {
  const subject = `${input.code} is your BuilderHQ verification code`;
  const props = {
    code: input.code,
    firstName: input.firstName,
    expiresInMinutes: input.expiresInMinutes,
  };

  const [html, text] = await Promise.all([
    render(MobileVerificationCodeEmail(props)),
    render(MobileVerificationCodeEmail(props), { plainText: true }),
  ]);

  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: input.to,
    subject,
    html,
    text,
    tags: [{ name: "category", value: "mobile_signup_code" }],
  });

  if (error) {
    logger.error(
      {
        event: "email.mobile_verification.failed",
        to: input.to,
        code: error.name,
        message: error.message,
      },
      "mobile verification code send failed",
    );
    return fail(
      "external_error",
      "We couldn't send your code. Try again in a moment.",
    );
  }

  if (!data) {
    return fail("external_error", "Email provider returned no message id");
  }

  logger.info(
    { event: "email.mobile_verification.sent", to: input.to, resendId: data.id },
    "mobile verification code sent",
  );
  return ok({ id: data.id });
}

interface SendMobilePasswordResetCodeEmailInput {
  to: string;
  code: string;
  firstName: string | null;
  expiresInMinutes: number;
}

/**
 * Mobile-app password-reset code. Sister to `sendMobileVerificationCode`
 * but recovers an existing account instead of verifying a new one. The
 * auth service handles minting / expiring the code; this function just
 * renders + delivers it.
 */
export async function sendMobilePasswordResetCode(
  input: SendMobilePasswordResetCodeEmailInput,
): Promise<Result<{ id: string }>> {
  const subject = `${input.code} is your BuilderHQ password reset code`;
  const props = {
    code: input.code,
    firstName: input.firstName,
    expiresInMinutes: input.expiresInMinutes,
  };

  const [html, text] = await Promise.all([
    render(MobilePasswordResetCodeEmail(props)),
    render(MobilePasswordResetCodeEmail(props), { plainText: true }),
  ]);

  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: input.to,
    subject,
    html,
    text,
    tags: [{ name: "category", value: "mobile_password_reset_code" }],
  });

  if (error) {
    logger.error(
      {
        event: "email.mobile_password_reset.failed",
        to: input.to,
        code: error.name,
        message: error.message,
      },
      "mobile password reset code send failed",
    );
    return fail(
      "external_error",
      "We couldn't send your code. Try again in a moment.",
    );
  }

  if (!data) {
    return fail("external_error", "Email provider returned no message id");
  }

  logger.info(
    { event: "email.mobile_password_reset.sent", to: input.to, resendId: data.id },
    "mobile password reset code sent",
  );
  return ok({ id: data.id });
}

interface SendPasswordResetEmailInput {
  to: string;
  resetUrl: string;
  firstName: string | null;
}

export async function sendPasswordResetEmail(
  input: SendPasswordResetEmailInput,
): Promise<Result<{ id: string }>> {
  const subject = "Reset your BuilderHQ password";
  const props = { resetUrl: input.resetUrl, firstName: input.firstName };

  const [html, text] = await Promise.all([
    render(PasswordResetEmail(props)),
    render(PasswordResetEmail(props), { plainText: true }),
  ]);

  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: input.to,
    subject,
    html,
    text,
  });

  if (error) {
    logger.error(
      { event: "email.password_reset.failed", to: input.to, code: error.name, message: error.message },
      "password reset email send failed",
    );
    return fail("external_error", "We couldn't send your reset email. Try again in a moment.");
  }

  if (!data) {
    return fail("external_error", "Email provider returned no message id");
  }

  logger.info(
    { event: "email.password_reset.sent", to: input.to, resendId: data.id },
    "password reset email sent",
  );
  return ok({ id: data.id });
}

// ── Launch invite (Bubble → Neon migration) ─────────────────────────────

interface SendLaunchInviteEmailInput {
  to: string;
  firstName: string | null;
  claimUrl: string;
  daysToExpire: number;
}

/**
 * One-shot email blast for migrated Bubble users. Sent by the
 * `scripts/migrate-bubble/05-blast.mjs` runner in batches of ~50/min
 * to stay within Resend's free-tier rate limit. Idempotent on the
 * runner side — keyed by claim token, won't double-send.
 *
 * Subject is intentionally event-style ("BuilderHQ 2.0 has landed —
 * claim your account") rather than transactional ("Action required")
 * so the recipient parses it as relevant news, not as a security alert.
 */
export async function sendLaunchInviteEmail(
  input: SendLaunchInviteEmailInput,
): Promise<Result<{ id: string }>> {
  const subject = "BuilderHQ 2.0 has landed — claim your account";
  const props = {
    claimUrl: input.claimUrl,
    firstName: input.firstName,
    daysToExpire: input.daysToExpire,
  };

  const [html, text] = await Promise.all([
    render(LaunchInviteEmail(props)),
    render(LaunchInviteEmail(props), { plainText: true }),
  ]);

  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: input.to,
    subject,
    html,
    text,
    // Mark the blast with a tag so Resend's dashboard groups them
    // and we can see open / bounce rates as one cohort.
    tags: [{ name: "category", value: "launch_invite" }],
  });

  if (error) {
    logger.error(
      {
        event: "email.launch_invite.failed",
        to: input.to,
        code: error.name,
        message: error.message,
      },
      "launch invite email send failed",
    );
    return fail(
      "external_error",
      "We couldn't send the launch invite to this address. The runner will retry.",
    );
  }

  if (!data) {
    return fail("external_error", "Email provider returned no message id");
  }

  logger.info(
    { event: "email.launch_invite.sent", to: input.to, resendId: data.id },
    "launch invite email sent",
  );
  return ok({ id: data.id });
}

// ── Marketing lead capture (guide download) ─────────────────────────────

interface SendGuideDownloadEmailInput {
  to: string;
  firstName: string;
  downloadUrl: string;
}

/**
 * User-facing email — drops the PDF link into the recipient's inbox.
 * Tagged so Resend's dashboard can break out open + click rates per
 * landing-page cohort (we'll add more guides later).
 */
export async function sendGuideDownloadEmail(
  input: SendGuideDownloadEmailInput,
): Promise<Result<{ id: string }>> {
  const subject = "Your Melbourne Build Brief is here";
  const props = {
    firstName: input.firstName,
    downloadUrl: input.downloadUrl,
  };

  const [html, text] = await Promise.all([
    render(GuideDownloadEmail(props)),
    render(GuideDownloadEmail(props), { plainText: true }),
  ]);

  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: input.to,
    subject,
    html,
    text,
    tags: [
      { name: "category", value: "lead_guide_delivery" },
      { name: "variant", value: "melbourne_build_brief" },
    ],
  });

  if (error) {
    logger.error(
      {
        event: "email.guide_download.failed",
        to: input.to,
        code: error.name,
        message: error.message,
      },
      "guide download email send failed",
    );
    return fail("external_error", error.message ?? "Email send failed.");
  }
  if (!data) return fail("external_error", "Email provider returned no message id");

  logger.info(
    { event: "email.guide_download.sent", to: input.to, resendId: data.id },
    "guide download email sent",
  );
  return ok({ id: data.id });
}

interface SendGuideLeadOpsEmailInput {
  leadId: string;
  firstName: string;
  email: string;
  phone: string | null;
  source: string | null;
  createdAt: Date;
}

/**
 * Internal ops notification — fires to info@builderhq.com.au on every
 * guide download so the team sees inbound interest in real time.
 */
export async function sendGuideLeadOpsEmail(
  input: SendGuideLeadOpsEmailInput,
): Promise<Result<{ id: string }>> {
  const subject = `New guide download: ${input.firstName} (${input.email})`;
  const props = {
    leadId: input.leadId,
    firstName: input.firstName,
    email: input.email,
    phone: input.phone,
    source: input.source,
    createdAt: input.createdAt,
  };

  const [html, text] = await Promise.all([
    render(GuideLeadOpsEmail(props)),
    render(GuideLeadOpsEmail(props), { plainText: true }),
  ]);

  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: OPS_EMAIL,
    subject,
    html,
    text,
    tags: [{ name: "category", value: "ops_lead_capture" }],
  });

  if (error) {
    logger.error(
      {
        event: "email.guide_lead_ops.failed",
        leadId: input.leadId,
        code: error.name,
        message: error.message,
      },
      "guide ops notification send failed",
    );
    return fail("external_error", error.message ?? "Email send failed.");
  }
  if (!data) return fail("external_error", "Email provider returned no message id");

  logger.info(
    { event: "email.guide_lead_ops.sent", leadId: input.leadId, resendId: data.id },
    "guide ops notification sent",
  );
  return ok({ id: data.id });
}

// ── Owner Advisory (/owneradvisory) ────────────────────────────────────

interface SendOwnerAdvisoryOpsEmailInput {
  leadId: string;
  firstName: string;
  email: string;
  phone: string | null;
  projectType: string;
  suburb: string;
  stage: string;
  source: string | null;
  createdAt: Date;
}

/** Internal ops notification — fires to info@ on every advisory request. */
export async function sendOwnerAdvisoryOpsEmail(
  input: SendOwnerAdvisoryOpsEmailInput,
): Promise<Result<{ id: string }>> {
  const subject = `Owner Advisory request: ${input.firstName} — ${input.projectType}, ${input.suburb}`;
  const props = { ...input };

  const [html, text] = await Promise.all([
    render(OwnerAdvisoryOpsEmail(props)),
    render(OwnerAdvisoryOpsEmail(props), { plainText: true }),
  ]);

  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: OPS_EMAIL,
    subject,
    html,
    text,
    tags: [{ name: "category", value: "ops_owner_advisory" }],
  });

  if (error) {
    logger.error(
      {
        event: "email.owner_advisory_ops.failed",
        leadId: input.leadId,
        code: error.name,
        message: error.message,
      },
      "owner advisory ops notification send failed",
    );
    return fail("external_error", error.message ?? "Email send failed.");
  }
  if (!data) return fail("external_error", "Email provider returned no message id");

  logger.info(
    { event: "email.owner_advisory_ops.sent", leadId: input.leadId, resendId: data.id },
    "owner advisory ops notification sent",
  );
  return ok({ id: data.id });
}

interface SendOwnerAdvisoryConfirmationEmailInput {
  to: string;
  firstName: string;
  projectType: string;
  suburb: string;
  guideUrl: string;
}

/** Confirmation to the homeowner — sets the within-one-business-day
 *  expectation and reinforces the independence promise. */
export async function sendOwnerAdvisoryConfirmationEmail(
  input: SendOwnerAdvisoryConfirmationEmailInput,
): Promise<Result<{ id: string }>> {
  const subject = `We've got your request, ${input.firstName}`;
  const props = {
    firstName: input.firstName,
    projectType: input.projectType,
    suburb: input.suburb,
    guideUrl: input.guideUrl,
  };

  const [html, text] = await Promise.all([
    render(OwnerAdvisoryConfirmationEmail(props)),
    render(OwnerAdvisoryConfirmationEmail(props), { plainText: true }),
  ]);

  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: input.to,
    subject,
    html,
    text,
    tags: [{ name: "category", value: "owner_advisory_confirmation" }],
  });

  if (error) {
    logger.error(
      {
        event: "email.owner_advisory_confirm.failed",
        to: input.to,
        code: error.name,
        message: error.message,
      },
      "owner advisory confirmation send failed",
    );
    return fail("external_error", error.message ?? "Email send failed.");
  }
  if (!data) return fail("external_error", "Email provider returned no message id");

  logger.info(
    { event: "email.owner_advisory_confirm.sent", to: input.to, resendId: data.id },
    "owner advisory confirmation sent",
  );
  return ok({ id: data.id });
}

// ── Marketing lead capture (estimate request, ops-only) ────────────────

interface SendEstimateRequestOpsEmailInput {
  leadId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  projectType: string | null;
  company: string | null;
  source: string | null;
  createdAt: Date;
}

/**
 * Ops-only notification for estimate-request submissions. NO customer
 * email — the team contacts the customer manually within the 12-hour
 * SLA, so automating a customer touch here would undercut the
 * concierge framing of the service.
 */
export async function sendEstimateRequestOpsEmail(
  input: SendEstimateRequestOpsEmailInput,
): Promise<Result<{ id: string }>> {
  const fullName = [input.firstName, input.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const subject = `ACTION: Estimate request from ${fullName || input.email}`;
  const props = {
    leadId: input.leadId,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone,
    projectType: input.projectType,
    company: input.company,
    source: input.source,
    createdAt: input.createdAt,
  };

  const [html, text] = await Promise.all([
    render(EstimateRequestOpsEmail(props)),
    render(EstimateRequestOpsEmail(props), { plainText: true }),
  ]);

  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: OPS_EMAIL,
    subject,
    html,
    text,
    tags: [
      { name: "category", value: "ops_lead_capture" },
      { name: "variant", value: "estimate_request" },
    ],
  });

  if (error) {
    logger.error(
      {
        event: "email.estimate_request_ops.failed",
        leadId: input.leadId,
        code: error.name,
        message: error.message,
      },
      "estimate request ops notification send failed",
    );
    return fail("external_error", error.message ?? "Email send failed.");
  }
  if (!data) return fail("external_error", "Email provider returned no message id");

  logger.info(
    {
      event: "email.estimate_request_ops.sent",
      leadId: input.leadId,
      resendId: data.id,
    },
    "estimate request ops notification sent",
  );
  return ok({ id: data.id });
}

// ── Marketing lead capture (book a call, ops-only) ─────────────────────

interface SendBookCallOpsEmailInput {
  leadId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  projectType: string | null;
  location: string | null;
  timeline: string | null;
  source: string | null;
  createdAt: Date;
}

/**
 * Ops-only notification for "Book a call" submissions. The time slot is
 * booked on Cal.com (which sends its own confirmation), so this is the
 * lead record + a prompt to be ready — or to reach out if they filled
 * the form but didn't pick a slot.
 */
export async function sendBookCallOpsEmail(
  input: SendBookCallOpsEmailInput,
): Promise<Result<{ id: string }>> {
  const fullName = [input.firstName, input.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const subject = `ACTION: Call request from ${fullName || input.email}`;
  const props = {
    leadId: input.leadId,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone,
    projectType: input.projectType,
    location: input.location,
    timeline: input.timeline,
    source: input.source,
    createdAt: input.createdAt,
  };

  const [html, text] = await Promise.all([
    render(BookCallOpsEmail(props)),
    render(BookCallOpsEmail(props), { plainText: true }),
  ]);

  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: OPS_EMAIL,
    subject,
    html,
    text,
    tags: [
      { name: "category", value: "ops_lead_capture" },
      { name: "variant", value: "book_call" },
    ],
  });

  if (error) {
    logger.error(
      {
        event: "email.book_call_ops.failed",
        leadId: input.leadId,
        code: error.name,
        message: error.message,
      },
      "book call ops notification send failed",
    );
    return fail("external_error", error.message ?? "Email send failed.");
  }
  if (!data) return fail("external_error", "Email provider returned no message id");

  logger.info(
    {
      event: "email.book_call_ops.sent",
      leadId: input.leadId,
      resendId: data.id,
    },
    "book call ops notification sent",
  );
  return ok({ id: data.id });
}

// ── Marketing lead capture (architect-tender, private outreach) ────────

interface SendArchitectTenderOpsEmailInput {
  leadId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  practiceName: string;
  projectAddress: string;
  source: string | null;
  ref: string | null;
  createdAt: Date;
}

/**
 * Ops notification for architect-tender confirmations. The submission
 * itself is the meaningful signal — there's no public ad funnel, just
 * a cold email that linked them here. Sends to info@ alongside the
 * architect-facing confirmation email below.
 */
export async function sendArchitectTenderOpsEmail(
  input: SendArchitectTenderOpsEmailInput,
): Promise<Result<{ id: string }>> {
  const fullName =
    [input.firstName, input.lastName].filter(Boolean).join(" ").trim();
  const subject = `ARCHITECT: ${fullName || input.email} — ${input.projectAddress}`;
  const props = {
    leadId: input.leadId,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone,
    practiceName: input.practiceName,
    projectAddress: input.projectAddress,
    source: input.source,
    ref: input.ref,
    createdAt: input.createdAt,
  };

  const [html, text] = await Promise.all([
    render(ArchitectTenderOpsEmail(props)),
    render(ArchitectTenderOpsEmail(props), { plainText: true }),
  ]);

  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: OPS_EMAIL,
    subject,
    html,
    text,
    tags: [
      { name: "category", value: "ops_lead_capture" },
      { name: "variant", value: "architect_tender" },
    ],
  });

  if (error) {
    logger.error(
      {
        event: "email.architect_tender_ops.failed",
        leadId: input.leadId,
        code: error.name,
        message: error.message,
      },
      "architect tender ops notification send failed",
    );
    return fail("external_error", error.message ?? "Email send failed.");
  }
  if (!data) return fail("external_error", "Email provider returned no message id");

  logger.info(
    {
      event: "email.architect_tender_ops.sent",
      leadId: input.leadId,
      resendId: data.id,
    },
    "architect tender ops notification sent",
  );
  return ok({ id: data.id });
}

interface SendArchitectTenderConfirmationEmailInput {
  to: string;
  firstName: string;
  practiceName: string;
  projectAddress: string;
}

/**
 * Architect-facing holding email — confirms receipt of the onboarding
 * form and tells them Aryan will reply personally within 24 hours.
 * Intentionally austere; the substantive follow-up is sent by hand.
 */
export async function sendArchitectTenderConfirmationEmail(
  input: SendArchitectTenderConfirmationEmailInput,
): Promise<Result<{ id: string }>> {
  const subject = "Received — your project is being onboarded";
  const props = {
    firstName: input.firstName,
    practiceName: input.practiceName,
    projectAddress: input.projectAddress,
  };

  const [html, text] = await Promise.all([
    render(ArchitectTenderConfirmationEmail(props)),
    render(ArchitectTenderConfirmationEmail(props), { plainText: true }),
  ]);

  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    // No explicit reply-to — falls back to EMAIL_FROM
    // (info@builderhq.com.au). The architect-facing flow is now
    // de-personalised; replies route to the central inbox. Add a
    // per-template replyTo back here if we ever re-introduce a
    // founder-signed variant.
    to: input.to,
    subject,
    html,
    text,
    tags: [
      { name: "category", value: "lead_architect_confirmation" },
      { name: "variant", value: "architect_tender" },
    ],
  });

  if (error) {
    logger.error(
      {
        event: "email.architect_tender_confirmation.failed",
        to: input.to,
        code: error.name,
        message: error.message,
      },
      "architect tender confirmation send failed",
    );
    return fail("external_error", error.message ?? "Email send failed.");
  }
  if (!data) return fail("external_error", "Email provider returned no message id");

  logger.info(
    {
      event: "email.architect_tender_confirmation.sent",
      to: input.to,
      resendId: data.id,
    },
    "architect tender confirmation sent",
  );
  return ok({ id: data.id });
}

// ── Preferred Partner network interest (architect / finance) ───────────

interface SendMetaLeadOpsEmailInput {
  leadId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  extras: Record<string, string>;
  campaignName: string | null;
  adName: string | null;
  formLabel: string | null;
  platform: string | null;
  incomplete: boolean;
  createdAt: Date;
}

/**
 * Tell ops a Meta Instant Form lead has landed.
 *
 * Failure is never fatal to the webhook: the lead row exists whether or
 * not this send succeeds, and a webhook that returns an error because an
 * email bounced would have Meta redeliver a lead we already hold.
 */
export async function sendMetaLeadOpsEmail(
  input: SendMetaLeadOpsEmailInput,
): Promise<Result<{ id: string }>> {
  const who = input.fullName.trim() || input.phone || input.email || "an unnamed lead";
  const subject = `ACTION: Meta lead from ${who}`;
  const props = { ...input };

  const [html, text] = await Promise.all([
    render(MetaLeadOpsEmail(props)),
    render(MetaLeadOpsEmail(props), { plainText: true }),
  ]);

  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: OPS_EMAIL,
    subject,
    html,
    text,
    tags: [
      { name: "category", value: "ops_lead_capture" },
      { name: "variant", value: "meta_instant_form" },
    ],
  });

  if (error) {
    logger.error(
      {
        event: "email.meta_lead_ops.failed",
        leadId: input.leadId,
        code: error.name,
        message: error.message,
      },
      "meta lead ops notification send failed",
    );
    return fail("external_error", error.message ?? "Email send failed.");
  }
  if (!data) return fail("external_error", "Email provider returned no message id");

  logger.info(
    { event: "email.meta_lead_ops.sent", leadId: input.leadId, resendId: data.id },
    "meta lead ops notification sent",
  );
  return ok({ id: data.id });
}

interface SendMetaLeadUnretrievableEmailInput {
  leadgenId: string;
  formId: string | null;
  pageId: string | null;
  reason: string;
  receivedAt: Date;
}

/**
 * Raise the alarm for a lead Meta would not let us read.
 *
 * Separate from the ordinary notice on purpose. This one is not "here
 * is a lead", it is "go and fetch a lead by hand", and blurring the two
 * would train the reader to skim past the one that needs work.
 */
export async function sendMetaLeadUnretrievableEmail(
  input: SendMetaLeadUnretrievableEmailInput,
): Promise<Result<{ id: string }>> {
  const props = { ...input };
  const [html, text] = await Promise.all([
    render(MetaLeadUnretrievableEmail(props)),
    render(MetaLeadUnretrievableEmail(props), { plainText: true }),
  ]);

  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: OPS_EMAIL,
    subject: "ACTION: a Meta lead arrived that we could not read",
    html,
    text,
    tags: [
      { name: "category", value: "ops_lead_capture" },
      { name: "variant", value: "meta_unretrievable" },
    ],
  });

  if (error) {
    logger.error(
      {
        event: "email.meta_lead_unretrievable.failed",
        leadgenId: input.leadgenId,
        code: error.name,
        message: error.message,
      },
      "meta unretrievable-lead alarm send failed",
    );
    return fail("external_error", error.message ?? "Email send failed.");
  }
  if (!data) return fail("external_error", "Email provider returned no message id");

  logger.info(
    {
      event: "email.meta_lead_unretrievable.sent",
      leadgenId: input.leadgenId,
      resendId: data.id,
    },
    "meta unretrievable-lead alarm sent",
  );
  return ok({ id: data.id });
}

interface SendPartnerInterestOpsEmailInput {
  leadId: string;
  firstName: string;
  lastName: string | null;
  email: string;
  phone: string | null;
  firmName: string;
  network: PartnerNetwork;
  state: string;
  website: string | null;
  source: string | null;
  createdAt: Date;
}

/** Ops notification — fires to info@ on every partner-network registration. */
export async function sendPartnerInterestOpsEmail(
  input: SendPartnerInterestOpsEmailInput,
): Promise<Result<{ id: string }>> {
  const fullName = [input.firstName, input.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const netLabel = input.network === "architect" ? "Design partner" : "Finance broker";
  const subject = `PARTNER (${netLabel}): ${fullName || input.email} — ${input.firmName}`;
  const props = { ...input };

  const [html, text] = await Promise.all([
    render(PartnerInterestOpsEmail(props)),
    render(PartnerInterestOpsEmail(props), { plainText: true }),
  ]);

  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: OPS_EMAIL,
    subject,
    html,
    text,
    tags: [
      { name: "category", value: "ops_lead_capture" },
      { name: "variant", value: `partner_${input.network}` },
    ],
  });

  if (error) {
    logger.error(
      {
        event: "email.partner_interest_ops.failed",
        leadId: input.leadId,
        code: error.name,
        message: error.message,
      },
      "partner interest ops notification send failed",
    );
    return fail("external_error", error.message ?? "Email send failed.");
  }
  if (!data) return fail("external_error", "Email provider returned no message id");

  logger.info(
    {
      event: "email.partner_interest_ops.sent",
      leadId: input.leadId,
      resendId: data.id,
    },
    "partner interest ops notification sent",
  );
  return ok({ id: data.id });
}

interface SendPartnerInterestConfirmationEmailInput {
  to: string;
  firstName: string;
  firmName: string;
  network: PartnerNetwork;
}

/** Confirmation to the partner — restrained, institutional holding email. */
export async function sendPartnerInterestConfirmationEmail(
  input: SendPartnerInterestConfirmationEmailInput,
): Promise<Result<{ id: string }>> {
  const netLabel =
    input.network === "architect"
      ? "Preferred Design Partner network"
      : "Preferred Finance Partner network";
  const subject = `Received — your interest in the ${netLabel}`;
  const props = {
    firstName: input.firstName,
    firmName: input.firmName,
    network: input.network,
  };

  const [html, text] = await Promise.all([
    render(PartnerInterestConfirmationEmail(props)),
    render(PartnerInterestConfirmationEmail(props), { plainText: true }),
  ]);

  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: input.to,
    subject,
    html,
    text,
    tags: [
      { name: "category", value: "lead_partner_confirmation" },
      { name: "variant", value: `partner_${input.network}` },
    ],
  });

  if (error) {
    logger.error(
      {
        event: "email.partner_interest_confirm.failed",
        to: input.to,
        code: error.name,
        message: error.message,
      },
      "partner interest confirmation send failed",
    );
    return fail("external_error", error.message ?? "Email send failed.");
  }
  if (!data) return fail("external_error", "Email provider returned no message id");

  logger.info(
    {
      event: "email.partner_interest_confirm.sent",
      to: input.to,
      resendId: data.id,
    },
    "partner interest confirmation sent",
  );
  return ok({ id: data.id });
}

// ── Preferred Partner introduction requests (homeowner side) ───────────

interface SendPartnerIntroOpsEmailInput {
  leadId: string;
  firstName: string;
  lastName: string | null;
  email: string;
  phone: string | null;
  needs: readonly string[];
  state: string;
  source: string | null;
  createdAt: Date;
}

/** Ops notification — fires to info@ on every introduction request. */
export async function sendPartnerIntroOpsEmail(
  input: SendPartnerIntroOpsEmailInput,
): Promise<Result<{ id: string }>> {
  const fullName = [input.firstName, input.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const subject = `INTRO (${introNeedsLabel(input.needs)}): ${fullName || input.email} — ${input.state}`;
  const props = { ...input };

  const [html, text] = await Promise.all([
    render(PartnerIntroOpsEmail(props)),
    render(PartnerIntroOpsEmail(props), { plainText: true }),
  ]);

  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: OPS_EMAIL,
    subject,
    html,
    text,
    tags: [
      { name: "category", value: "ops_lead_capture" },
      { name: "variant", value: "partner_intro" },
    ],
  });

  if (error) {
    logger.error(
      {
        event: "email.partner_intro_ops.failed",
        leadId: input.leadId,
        code: error.name,
        message: error.message,
      },
      "partner intro ops notification send failed",
    );
    return fail("external_error", error.message ?? "Email send failed.");
  }
  if (!data) return fail("external_error", "Email provider returned no message id");

  logger.info(
    {
      event: "email.partner_intro_ops.sent",
      leadId: input.leadId,
      resendId: data.id,
    },
    "partner intro ops notification sent",
  );
  return ok({ id: data.id });
}

interface SendPartnerIntroConfirmationEmailInput {
  to: string;
  firstName: string;
  needs: readonly string[];
}

/** Confirmation to the homeowner — restrained holding email. */
export async function sendPartnerIntroConfirmationEmail(
  input: SendPartnerIntroConfirmationEmailInput,
): Promise<Result<{ id: string }>> {
  const subject = "Received — we're lining up your introduction";
  const props = { firstName: input.firstName, needs: input.needs };

  const [html, text] = await Promise.all([
    render(PartnerIntroConfirmationEmail(props)),
    render(PartnerIntroConfirmationEmail(props), { plainText: true }),
  ]);

  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: input.to,
    subject,
    html,
    text,
    tags: [
      { name: "category", value: "lead_partner_confirmation" },
      { name: "variant", value: "partner_intro" },
    ],
  });

  if (error) {
    logger.error(
      {
        event: "email.partner_intro_confirm.failed",
        to: input.to,
        code: error.name,
        message: error.message,
      },
      "partner intro confirmation send failed",
    );
    return fail("external_error", error.message ?? "Email send failed.");
  }
  if (!data) return fail("external_error", "Email provider returned no message id");

  logger.info(
    {
      event: "email.partner_intro_confirm.sent",
      to: input.to,
      resendId: data.id,
    },
    "partner intro confirmation sent",
  );
  return ok({ id: data.id });
}

// ── Tender state-transition emails ──────────────────────────────────────
//
// All tender emails use the same basic shape: render html + text in
// parallel, send via Resend, log success/failure with a stable `event`
// name so we can grep for delivery issues. Failures return a Result so
// the dispatch layer can swallow + log without breaking the originating
// state transition.

interface SendTenderSubmittedEmailInput {
  to: string;
  ownerFirstName: string | null;
  builderCompany: string;
  projectTitle: string;
  totalPriceAud: number;
  durationWeeks: number;
  validityDays: number;
  reviewUrl: string;
}

export async function sendTenderSubmittedEmail(
  input: SendTenderSubmittedEmailInput,
): Promise<Result<{ id: string }>> {
  const subject = `${input.builderCompany} sent you a tender — ${input.projectTitle}`;
  const props = {
    ownerFirstName: input.ownerFirstName,
    builderCompany: input.builderCompany,
    projectTitle: input.projectTitle,
    totalPriceAud: input.totalPriceAud,
    durationWeeks: input.durationWeeks,
    validityDays: input.validityDays,
    reviewUrl: input.reviewUrl,
  };
  const [html, text] = await Promise.all([
    render(TenderSubmittedEmail(props)),
    render(TenderSubmittedEmail(props), { plainText: true }),
  ]);
  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: input.to,
    subject,
    html,
    text,
  });
  if (error) {
    logger.error(
      { event: "email.tender_submitted.failed", to: input.to, code: error.name, message: error.message },
      "tender_submitted email send failed",
    );
    return fail("external_error", "Couldn't send tender notification email.");
  }
  if (!data) return fail("external_error", "Email provider returned no message id");
  logger.info(
    { event: "email.tender_submitted.sent", to: input.to, resendId: data.id },
    "tender_submitted email sent",
  );
  return ok({ id: data.id });
}

interface SendTenderShortlistedEmailInput {
  to: string;
  builderFirstName: string | null;
  ownerName: string | null;
  projectTitle: string;
  tenderUrl: string;
}

export async function sendTenderShortlistedEmail(
  input: SendTenderShortlistedEmailInput,
): Promise<Result<{ id: string }>> {
  const subject = `Shortlisted on ${input.projectTitle}`;
  const props = {
    builderFirstName: input.builderFirstName,
    ownerName: input.ownerName,
    projectTitle: input.projectTitle,
    tenderUrl: input.tenderUrl,
  };
  const [html, text] = await Promise.all([
    render(TenderShortlistedEmail(props)),
    render(TenderShortlistedEmail(props), { plainText: true }),
  ]);
  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: input.to,
    subject,
    html,
    text,
  });
  if (error) {
    logger.error(
      { event: "email.tender_shortlisted.failed", to: input.to, code: error.name, message: error.message },
      "tender_shortlisted email send failed",
    );
    return fail("external_error", "Couldn't send shortlist email.");
  }
  if (!data) return fail("external_error", "Email provider returned no message id");
  logger.info(
    { event: "email.tender_shortlisted.sent", to: input.to, resendId: data.id },
    "tender_shortlisted email sent",
  );
  return ok({ id: data.id });
}

interface SendTenderAwardedEmailInput {
  to: string;
  builderFirstName: string | null;
  ownerName: string | null;
  ownerEmail: string;
  ownerPhone: string | null;
  projectTitle: string;
  tenderUrl: string;
}

export async function sendTenderAwardedEmail(
  input: SendTenderAwardedEmailInput,
): Promise<Result<{ id: string }>> {
  const subject = `Congratulations — you've been awarded ${input.projectTitle}`;
  const props = {
    builderFirstName: input.builderFirstName,
    ownerName: input.ownerName,
    ownerEmail: input.ownerEmail,
    ownerPhone: input.ownerPhone,
    projectTitle: input.projectTitle,
    tenderUrl: input.tenderUrl,
  };
  const [html, text] = await Promise.all([
    render(TenderAwardedEmail(props)),
    render(TenderAwardedEmail(props), { plainText: true }),
  ]);
  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: input.to,
    subject,
    html,
    text,
  });
  if (error) {
    logger.error(
      { event: "email.tender_awarded.failed", to: input.to, code: error.name, message: error.message },
      "tender_awarded email send failed",
    );
    return fail("external_error", "Couldn't send award email.");
  }
  if (!data) return fail("external_error", "Email provider returned no message id");
  logger.info(
    { event: "email.tender_awarded.sent", to: input.to, resendId: data.id },
    "tender_awarded email sent",
  );
  return ok({ id: data.id });
}

interface SendTenderRejectedEmailInput {
  to: string;
  builderFirstName: string | null;
  projectTitle: string;
  browseUrl: string;
}

export async function sendTenderRejectedEmail(
  input: SendTenderRejectedEmailInput,
): Promise<Result<{ id: string }>> {
  const subject = `Update on your tender — ${input.projectTitle}`;
  const props = {
    builderFirstName: input.builderFirstName,
    projectTitle: input.projectTitle,
    browseUrl: input.browseUrl,
  };
  const [html, text] = await Promise.all([
    render(TenderRejectedEmail(props)),
    render(TenderRejectedEmail(props), { plainText: true }),
  ]);
  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: input.to,
    subject,
    html,
    text,
  });
  if (error) {
    logger.error(
      { event: "email.tender_rejected.failed", to: input.to, code: error.name, message: error.message },
      "tender_rejected email send failed",
    );
    return fail("external_error", "Couldn't send tender update email.");
  }
  if (!data) return fail("external_error", "Email provider returned no message id");
  logger.info(
    { event: "email.tender_rejected.sent", to: input.to, resendId: data.id },
    "tender_rejected email sent",
  );
  return ok({ id: data.id });
}

interface SendTenderWithdrawnEmailInput {
  to: string;
  ownerFirstName: string | null;
  builderCompany: string;
  projectTitle: string;
  reviewUrl: string;
}

export async function sendTenderWithdrawnEmail(
  input: SendTenderWithdrawnEmailInput,
): Promise<Result<{ id: string }>> {
  const subject = `${input.builderCompany} withdrew their tender — ${input.projectTitle}`;
  const props = {
    ownerFirstName: input.ownerFirstName,
    builderCompany: input.builderCompany,
    projectTitle: input.projectTitle,
    reviewUrl: input.reviewUrl,
  };
  const [html, text] = await Promise.all([
    render(TenderWithdrawnEmail(props)),
    render(TenderWithdrawnEmail(props), { plainText: true }),
  ]);
  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: input.to,
    subject,
    html,
    text,
  });
  if (error) {
    logger.error(
      { event: "email.tender_withdrawn.failed", to: input.to, code: error.name, message: error.message },
      "tender_withdrawn email send failed",
    );
    return fail("external_error", "Couldn't send withdraw email.");
  }
  if (!data) return fail("external_error", "Email provider returned no message id");
  logger.info(
    { event: "email.tender_withdrawn.sent", to: input.to, resendId: data.id },
    "tender_withdrawn email sent",
  );
  return ok({ id: data.id });
}

// ── Tender — builder-side submit confirmation ──────────────────────────

interface SendTenderSubmittedBuilderEmailInput {
  to: string;
  builderFirstName: string | null;
  projectTitle: string;
  totalPriceAud: number;
  durationWeeks: number;
  validityDays: number;
  tenderUrl: string;
}

export async function sendTenderSubmittedBuilderEmail(
  input: SendTenderSubmittedBuilderEmailInput,
): Promise<Result<{ id: string }>> {
  const subject = `Tender submitted — ${input.projectTitle}`;
  const props = {
    builderFirstName: input.builderFirstName,
    projectTitle: input.projectTitle,
    totalPriceAud: input.totalPriceAud,
    durationWeeks: input.durationWeeks,
    validityDays: input.validityDays,
    tenderUrl: input.tenderUrl,
  };
  const [html, text] = await Promise.all([
    render(TenderSubmittedBuilderEmail(props)),
    render(TenderSubmittedBuilderEmail(props), { plainText: true }),
  ]);
  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: input.to,
    subject,
    html,
    text,
  });
  if (error) {
    logger.error(
      { event: "email.tender_submitted_builder.failed", to: input.to, code: error.name, message: error.message },
      "tender_submitted (builder) email send failed",
    );
    return fail("external_error", "Couldn't send tender confirmation email.");
  }
  if (!data) return fail("external_error", "Email provider returned no message id");
  logger.info(
    { event: "email.tender_submitted_builder.sent", to: input.to, resendId: data.id },
    "tender_submitted (builder) email sent",
  );
  return ok({ id: data.id });
}

// ── Ops emails (info@) ─────────────────────────────────────────────────
//
// Internal heads-up emails sent on signup / publish / unlock / tender.
// Volumes stay low through launch; we taper them off once dashboards
// give ops the same signal in-product.

interface SendOwnerSignupOpsEmailInput {
  ownerName: string | null;
  ownerEmail: string;
  ownerPhone: string | null;
  entityType: string | null;
  companyName: string | null;
  state: string | null;
  signedUpAt: Date;
}

export async function sendOwnerSignupOpsEmail(
  input: SendOwnerSignupOpsEmailInput,
): Promise<Result<{ id: string }>> {
  const subject = `[Ops] New owner: ${input.ownerName ?? input.ownerEmail}`;
  const [html, text] = await Promise.all([
    render(OwnerSignupOpsEmail(input)),
    render(OwnerSignupOpsEmail(input), { plainText: true }),
  ]);
  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: OPS_EMAIL,
    subject,
    html,
    text,
  });
  if (error) {
    logger.error(
      { event: "email.ops_owner_signup.failed", code: error.name, message: error.message },
      "owner signup ops email failed",
    );
    return fail("external_error", "Couldn't send ops email.");
  }
  if (!data) return fail("external_error", "Email provider returned no message id");
  logger.info(
    { event: "email.ops_owner_signup.sent", resendId: data.id },
    "owner signup ops email sent",
  );
  return ok({ id: data.id });
}

interface SendBuilderApprovedEmailInput {
  to: string;
  firstName: string | null;
  companyName: string | null;
}

/**
 * The builder's welcome, sent the moment their account is approved.
 *
 * Every link is absolute and built here rather than in the template, so
 * the component stays pure and a preview render cannot accidentally
 * point a reader at localhost.
 */
export async function sendBuilderApprovedEmail(
  input: SendBuilderApprovedEmailInput,
): Promise<Result<{ id: string }>> {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  const props = {
    firstName: input.firstName,
    companyName: input.companyName,
    dashboardUrl: `${base}/builder`,
    demoUrl: `${base}/demo/builder`,
    networkUrl: `${base}/partners/builders`,
    // The join form is a modal on the landing page, opened by this
    // sentinel hash. The landing form honours it on load as well as on
    // click, which is what makes it work from an email at all.
    networkFormUrl: `${base}/#join-builder`,
  };

  const [html, text] = await Promise.all([
    render(BuilderApprovedEmail(props)),
    render(BuilderApprovedEmail(props), { plainText: true }),
  ]);

  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: input.to,
    subject: "Your BuilderHQ account is approved",
    html,
    text,
    tags: [
      { name: "category", value: "builder_lifecycle" },
      { name: "variant", value: "approved" },
    ],
  });

  if (error) {
    logger.error(
      { event: "email.builder_approved.failed", code: error.name, message: error.message },
      "builder approved email failed",
    );
    return fail("external_error", error.message ?? "Email send failed.");
  }
  if (!data) return fail("external_error", "Email provider returned no message id");
  logger.info(
    { event: "email.builder_approved.sent", resendId: data.id },
    "builder approved email sent",
  );
  return ok({ id: data.id });
}

/**
 * The welcome each role gets on finishing onboarding. Links are built
 * here rather than in the templates, so the components stay pure and a
 * preview render can never point a reader at localhost.
 */
export async function sendOwnerWelcomeEmail(input: {
  to: string;
  firstName: string | null;
}): Promise<Result<{ id: string }>> {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  const props = {
    firstName: input.firstName,
    startProjectUrl: `${base}/owner/projects/new`,
    demoUrl: `${base}/demo`,
  };
  const [html, text] = await Promise.all([
    render(OwnerWelcomeEmail(props)),
    render(OwnerWelcomeEmail(props), { plainText: true }),
  ]);
  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: input.to,
    subject: "Welcome to BuilderHQ",
    html,
    text,
    tags: [
      { name: "category", value: "lifecycle" },
      { name: "variant", value: "owner_welcome" },
    ],
  });
  if (error) {
    logger.error(
      { event: "email.owner_welcome.failed", code: error.name, message: error.message },
      "owner welcome email failed",
    );
    return fail("external_error", error.message ?? "Email send failed.");
  }
  if (!data) return fail("external_error", "Email provider returned no message id");
  logger.info({ event: "email.owner_welcome.sent", resendId: data.id }, "owner welcome sent");
  return ok({ id: data.id });
}

export async function sendArchitectWelcomeEmail(input: {
  to: string;
  firstName: string | null;
  practiceName: string | null;
}): Promise<Result<{ id: string }>> {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  const props = {
    firstName: input.firstName,
    practiceName: input.practiceName,
    startProjectUrl: `${base}/architect/projects/new`,
    demoUrl: `${base}/demo/architect`,
    networkUrl: `${base}/partners/architects`,
    // Sentinel hash: the landing form honours it on load as well as on
    // click, which is what lets an email link open it at all.
    networkFormUrl: `${base}/#join-architect`,
  };
  const [html, text] = await Promise.all([
    render(ArchitectWelcomeEmail(props)),
    render(ArchitectWelcomeEmail(props), { plainText: true }),
  ]);
  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: input.to,
    subject: "Welcome to BuilderHQ",
    html,
    text,
    tags: [
      { name: "category", value: "lifecycle" },
      { name: "variant", value: "architect_welcome" },
    ],
  });
  if (error) {
    logger.error(
      { event: "email.architect_welcome.failed", code: error.name, message: error.message },
      "architect welcome email failed",
    );
    return fail("external_error", error.message ?? "Email send failed.");
  }
  if (!data) return fail("external_error", "Email provider returned no message id");
  logger.info({ event: "email.architect_welcome.sent", resendId: data.id }, "architect welcome sent");
  return ok({ id: data.id });
}

interface SendArchitectSignupOpsEmailInput {
  architectName: string | null;
  architectEmail: string;
  architectPhone: string | null;
  practiceName: string | null;
  suburb: string | null;
  state: string | null;
  signedUpAt: Date;
}

export async function sendArchitectSignupOpsEmail(
  input: SendArchitectSignupOpsEmailInput,
): Promise<Result<{ id: string }>> {
  const subject = `[Ops] New architect: ${input.practiceName ?? input.architectName ?? input.architectEmail}`;
  const [html, text] = await Promise.all([
    render(ArchitectSignupOpsEmail(input)),
    render(ArchitectSignupOpsEmail(input), { plainText: true }),
  ]);
  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: OPS_EMAIL,
    subject,
    html,
    text,
  });
  if (error) {
    logger.error(
      { event: "email.ops_architect_signup.failed", code: error.name, message: error.message },
      "architect signup ops email failed",
    );
    return fail("external_error", "Couldn't send ops email.");
  }
  if (!data) return fail("external_error", "Email provider returned no message id");
  logger.info(
    { event: "email.ops_architect_signup.sent", resendId: data.id },
    "architect signup ops email sent",
  );
  return ok({ id: data.id });
}

interface SendBuilderSignupOpsEmailInput {
  builderName: string | null;
  builderEmail: string;
  builderPhone: string | null;
  companyName: string | null;
  abn: string | null;
  abnVerified: boolean;
  anyLicenceVerified: boolean;
  approvalStatus: string;
  state: string | null;
  signedUpAt: Date;
}

export async function sendBuilderSignupOpsEmail(
  input: SendBuilderSignupOpsEmailInput,
): Promise<Result<{ id: string }>> {
  const subject = `[Ops] New builder: ${input.companyName ?? input.builderName ?? input.builderEmail}`;
  const [html, text] = await Promise.all([
    render(BuilderSignupOpsEmail(input)),
    render(BuilderSignupOpsEmail(input), { plainText: true }),
  ]);
  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: OPS_EMAIL,
    subject,
    html,
    text,
  });
  if (error) {
    logger.error(
      { event: "email.ops_builder_signup.failed", code: error.name, message: error.message },
      "builder signup ops email failed",
    );
    return fail("external_error", "Couldn't send ops email.");
  }
  if (!data) return fail("external_error", "Email provider returned no message id");
  logger.info(
    { event: "email.ops_builder_signup.sent", resendId: data.id },
    "builder signup ops email sent",
  );
  return ok({ id: data.id });
}

interface SendProjectPublishedOpsEmailInput {
  projectTitle: string;
  projectType: string;
  suburb: string | null;
  state: string | null;
  budgetBand: string | null;
  ownerName: string | null;
  ownerEmail: string;
  documentCount: number;
  projectUrl: string;
}

export async function sendProjectPublishedOpsEmail(
  input: SendProjectPublishedOpsEmailInput,
): Promise<Result<{ id: string }>> {
  const subject = `[Ops] Project published: ${input.projectTitle}`;
  const [html, text] = await Promise.all([
    render(ProjectPublishedOpsEmail(input)),
    render(ProjectPublishedOpsEmail(input), { plainText: true }),
  ]);
  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: OPS_EMAIL,
    subject,
    html,
    text,
  });
  if (error) {
    logger.error(
      { event: "email.ops_project_published.failed", code: error.name, message: error.message },
      "project published ops email failed",
    );
    return fail("external_error", "Couldn't send ops email.");
  }
  if (!data) return fail("external_error", "Email provider returned no message id");
  logger.info(
    { event: "email.ops_project_published.sent", resendId: data.id },
    "project published ops email sent",
  );
  return ok({ id: data.id });
}

interface SendUnlockOpsEmailInput {
  projectTitle: string;
  projectUrl: string;
  builderCompany: string;
  builderEmail: string;
  ownerName: string | null;
  ownerEmail: string;
  source: string;
  unlockedAt: Date;
}

export async function sendUnlockOpsEmail(
  input: SendUnlockOpsEmailInput,
): Promise<Result<{ id: string }>> {
  const subject = `[Ops] Unlock: ${input.builderCompany} → ${input.projectTitle}`;
  const [html, text] = await Promise.all([
    render(UnlockOpsEmail(input)),
    render(UnlockOpsEmail(input), { plainText: true }),
  ]);
  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: OPS_EMAIL,
    subject,
    html,
    text,
  });
  if (error) {
    logger.error(
      { event: "email.ops_unlock.failed", code: error.name, message: error.message },
      "unlock ops email failed",
    );
    return fail("external_error", "Couldn't send ops email.");
  }
  if (!data) return fail("external_error", "Email provider returned no message id");
  logger.info(
    { event: "email.ops_unlock.sent", resendId: data.id },
    "unlock ops email sent",
  );
  return ok({ id: data.id });
}

interface SendTenderSubmittedOpsEmailInput {
  projectTitle: string;
  projectUrl: string;
  builderCompany: string;
  builderEmail: string;
  ownerName: string | null;
  ownerEmail: string;
  totalPriceAud: number | null;
  durationWeeks: number | null;
  validityDays: number | null;
  submittedAt: Date;
}

export async function sendTenderSubmittedOpsEmail(
  input: SendTenderSubmittedOpsEmailInput,
): Promise<Result<{ id: string }>> {
  const subject = `[Ops] Tender: ${input.builderCompany} → ${input.projectTitle}`;
  const [html, text] = await Promise.all([
    render(TenderSubmittedOpsEmail(input)),
    render(TenderSubmittedOpsEmail(input), { plainText: true }),
  ]);
  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: OPS_EMAIL,
    subject,
    html,
    text,
  });
  if (error) {
    logger.error(
      { event: "email.ops_tender_submitted.failed", code: error.name, message: error.message },
      "tender submitted ops email failed",
    );
    return fail("external_error", "Couldn't send ops email.");
  }
  if (!data) return fail("external_error", "Email provider returned no message id");
  logger.info(
    { event: "email.ops_tender_submitted.sent", resendId: data.id },
    "tender submitted ops email sent",
  );
  return ok({ id: data.id });
}

// ── Project published — owner confirmation + builder bulk ──────────────

interface SendProjectPublishedOwnerEmailInput {
  to: string;
  ownerFirstName: string | null;
  projectTitle: string;
  projectType: string;
  suburb: string | null;
  state: string | null;
  budgetBand: string | null;
  manageUrl: string;
}

export async function sendProjectPublishedOwnerEmail(
  input: SendProjectPublishedOwnerEmailInput,
): Promise<Result<{ id: string }>> {
  const subject = `${input.projectTitle} is live on BuilderHQ`;
  const props = {
    ownerFirstName: input.ownerFirstName,
    projectTitle: input.projectTitle,
    projectType: input.projectType,
    suburb: input.suburb,
    state: input.state,
    budgetBand: input.budgetBand,
    manageUrl: input.manageUrl,
  };
  const [html, text] = await Promise.all([
    render(ProjectPublishedOwnerEmail(props)),
    render(ProjectPublishedOwnerEmail(props), { plainText: true }),
  ]);
  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: input.to,
    subject,
    html,
    text,
  });
  if (error) {
    logger.error(
      { event: "email.project_published_owner.failed", to: input.to, code: error.name, message: error.message },
      "project published (owner) email failed",
    );
    return fail("external_error", "Couldn't send project-published email.");
  }
  if (!data) return fail("external_error", "Email provider returned no message id");
  logger.info(
    { event: "email.project_published_owner.sent", to: input.to, resendId: data.id },
    "project published (owner) email sent",
  );
  return ok({ id: data.id });
}

interface SendProjectPublishedBuilderEmailInput {
  to: string;
  builderFirstName: string | null;
  projectTitle: string;
  projectType: string;
  suburb: string | null;
  state: string | null;
  budgetBand: string | null;
  isInServiceArea: boolean;
  projectUrl: string;
  unsubscribeUrl: string;
}

export async function sendProjectPublishedBuilderEmail(
  input: SendProjectPublishedBuilderEmailInput,
): Promise<Result<{ id: string }>> {
  const location = [input.suburb, input.state].filter(Boolean).join(", ") || "—";
  const subject = input.isInServiceArea
    ? `New ${input.projectType} in your area — ${location}`
    : `New project on BuilderHQ — ${input.projectTitle}`;
  const props = {
    builderFirstName: input.builderFirstName,
    projectTitle: input.projectTitle,
    projectType: input.projectType,
    suburb: input.suburb,
    state: input.state,
    budgetBand: input.budgetBand,
    isInServiceArea: input.isInServiceArea,
    projectUrl: input.projectUrl,
    unsubscribeUrl: input.unsubscribeUrl,
  };
  const [html, text] = await Promise.all([
    render(ProjectPublishedBuilderEmail(props)),
    render(ProjectPublishedBuilderEmail(props), { plainText: true }),
  ]);
  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: input.to,
    subject,
    html,
    text,
    headers: {
      // RFC 8058 + 2369 — one-click and list-style unsubscribe headers
      // so Gmail / Outlook surface a built-in unsubscribe button.
      // input.unsubscribeUrl points at /api/unsubscribe/[token] which
      // handles both POST (one-click) and GET (302 to the friendly
      // confirmation page).
      "List-Unsubscribe": `<${input.unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
  if (error) {
    logger.error(
      { event: "email.project_published_builder.failed", to: input.to, code: error.name, message: error.message },
      "project published (builder) email failed",
    );
    return fail("external_error", "Couldn't send project-published email.");
  }
  if (!data) return fail("external_error", "Email provider returned no message id");
  logger.info(
    { event: "email.project_published_builder.sent", to: input.to, resendId: data.id },
    "project published (builder) email sent",
  );
  return ok({ id: data.id });
}

// ── Unlocks — owner notify + builder receipt ───────────────────────────

interface SendUnlockOwnerEmailInput {
  to: string;
  ownerFirstName: string | null;
  builderCompany: string;
  builderState: string | null;
  abnVerified: boolean;
  anyLicenceVerified: boolean;
  projectTitle: string;
  projectUrl: string;
  builderProfileUrl: string | null;
}

export async function sendUnlockOwnerEmail(
  input: SendUnlockOwnerEmailInput,
): Promise<Result<{ id: string }>> {
  const subject = `${input.builderCompany} unlocked ${input.projectTitle}`;
  const props = {
    ownerFirstName: input.ownerFirstName,
    builderCompany: input.builderCompany,
    builderState: input.builderState,
    abnVerified: input.abnVerified,
    anyLicenceVerified: input.anyLicenceVerified,
    projectTitle: input.projectTitle,
    projectUrl: input.projectUrl,
    builderProfileUrl: input.builderProfileUrl,
  };
  const [html, text] = await Promise.all([
    render(UnlockOwnerEmail(props)),
    render(UnlockOwnerEmail(props), { plainText: true }),
  ]);
  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: input.to,
    subject,
    html,
    text,
  });
  if (error) {
    logger.error(
      { event: "email.unlock_owner.failed", to: input.to, code: error.name, message: error.message },
      "unlock (owner) email failed",
    );
    return fail("external_error", "Couldn't send unlock email.");
  }
  if (!data) return fail("external_error", "Email provider returned no message id");
  logger.info(
    { event: "email.unlock_owner.sent", to: input.to, resendId: data.id },
    "unlock (owner) email sent",
  );
  return ok({ id: data.id });
}

interface SendUnlockBuilderEmailInput {
  to: string;
  builderFirstName: string | null;
  projectTitle: string;
  projectAddress: string | null;
  ownerName: string | null;
  ownerEmail: string;
  ownerPhone: string | null;
  projectUrl: string;
  unlockedViaFba: boolean;
}

export async function sendUnlockBuilderEmail(
  input: SendUnlockBuilderEmailInput,
): Promise<Result<{ id: string }>> {
  const subject = `Unlocked: ${input.projectTitle}`;
  const props = {
    builderFirstName: input.builderFirstName,
    projectTitle: input.projectTitle,
    projectAddress: input.projectAddress,
    ownerName: input.ownerName,
    ownerEmail: input.ownerEmail,
    ownerPhone: input.ownerPhone,
    projectUrl: input.projectUrl,
    unlockedViaFba: input.unlockedViaFba,
  };
  const [html, text] = await Promise.all([
    render(UnlockBuilderEmail(props)),
    render(UnlockBuilderEmail(props), { plainText: true }),
  ]);
  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: input.to,
    subject,
    html,
    text,
  });
  if (error) {
    logger.error(
      { event: "email.unlock_builder.failed", to: input.to, code: error.name, message: error.message },
      "unlock (builder) email failed",
    );
    return fail("external_error", "Couldn't send unlock receipt email.");
  }
  if (!data) return fail("external_error", "Email provider returned no message id");
  logger.info(
    { event: "email.unlock_builder.sent", to: input.to, resendId: data.id },
    "unlock (builder) email sent",
  );
  return ok({ id: data.id });
}

// ── /start ads-funnel magic link ─────────────────────────────────────────

interface SendAdsFunnelMagicLinkEmailInput {
  to: string;
  magicUrl: string;
  firstName: string | null;
  /** Project suburb — used to personalise both subject + body
   *  ("Your Brunswick single dwelling is ready"). */
  suburb: string;
  /** Humanised project type label ("single dwelling", "multi-dwelling
   *  build", "renovation", "extension"). */
  projectTypeLabel: string;
}

/**
 * Sends the magic-link email at the end of the /start funnel. The link
 * verifies the email, publishes the draft project (when all required
 * fields + plans are in place), and creates a dashboard session — all
 * on click. When required fields are missing, the click still lands
 * the user in their dashboard with the wizard pre-flagged for finish.
 */
export async function sendAdsFunnelMagicLinkEmail(
  input: SendAdsFunnelMagicLinkEmailInput,
): Promise<Result<{ id: string }>> {
  const projectPhrase = `${input.suburb} ${input.projectTypeLabel}`;
  const subject = `Your ${projectPhrase} is ready to publish`;
  const props = {
    magicUrl: input.magicUrl,
    firstName: input.firstName,
    suburb: input.suburb,
    projectTypeLabel: input.projectTypeLabel,
  };

  const [html, text] = await Promise.all([
    render(AdsFunnelMagicLinkEmail(props)),
    render(AdsFunnelMagicLinkEmail(props), { plainText: true }),
  ]);

  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: input.to,
    subject,
    html,
    text,
  });

  if (error) {
    logger.error(
      {
        event: "email.ads_funnel_magic.failed",
        to: input.to,
        code: error.name,
        message: error.message,
      },
      "ads-funnel magic-link email send failed",
    );
    return fail(
      "external_error",
      "We couldn't send the link to your email. Try again in a moment.",
    );
  }

  if (!data) {
    return fail("external_error", "Email provider returned no message id");
  }

  logger.info(
    {
      event: "email.ads_funnel_magic.sent",
      to: input.to,
      resendId: data.id,
    },
    "ads-funnel magic-link email sent",
  );
  return ok({ id: data.id });
}

// ── Sign-in magic link (returning users from /login) ────────────────

interface SendAuthSigninLinkEmailInput {
  to: string;
  magicUrl: string;
  firstName: string | null;
}

/**
 * Passwordless sign-in link for returning users. 15-minute TTL. Sent
 * from /api/auth/email-link when a user requests a sign-in link.
 *
 * Subject is intentionally short + recognisable so it threads cleanly
 * in inbox previews and survives Gmail's clip-at-102KB rule.
 */
export async function sendAuthSigninLinkEmail(
  input: SendAuthSigninLinkEmailInput,
): Promise<Result<{ id: string }>> {
  const subject = "Your BuilderHQ sign-in link";
  const props = { magicUrl: input.magicUrl, firstName: input.firstName };

  const [html, text] = await Promise.all([
    render(AuthSigninLinkEmail(props)),
    render(AuthSigninLinkEmail(props), { plainText: true }),
  ]);

  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: input.to,
    subject,
    html,
    text,
  });

  if (error) {
    logger.error(
      {
        event: "email.auth_signin_link.failed",
        to: input.to,
        code: error.name,
        message: error.message,
      },
      "sign-in link email send failed",
    );
    return fail(
      "external_error",
      "We couldn't send the link. Try again in a moment.",
    );
  }

  if (!data) {
    return fail("external_error", "Email provider returned no message id");
  }

  logger.info(
    { event: "email.auth_signin_link.sent", to: input.to, resendId: data.id },
    "sign-in link email sent",
  );
  return ok({ id: data.id });
}

// ── builder tender invitation (any round) ─────────────────

interface SendBuilderTenderInvitationEmailInput {
  to: string;
  contactFirstName: string | null;
  inviterName: string;
  projectTitle: string;
  projectLocation: string | null;
  inviteUrl: string;
  onPlatform: boolean;
}

/**
 * The formal letter of invitation a hand-picked builder receives for
 * a tender round. Fired by the tenders dispatch
 * when a runner creates the invite; the same personal link the
 * runner can copy from the round step.
 */
export async function sendBuilderTenderInvitationEmail(
  input: SendBuilderTenderInvitationEmailInput,
): Promise<Result<{ id: string }>> {
  const subject = `Invitation to tender: ${input.projectTitle}`;
  const props = {
    contactFirstName: input.contactFirstName,
    inviterName: input.inviterName,
    projectTitle: input.projectTitle,
    projectLocation: input.projectLocation,
    inviteUrl: input.inviteUrl,
    onPlatform: input.onPlatform,
  };
  const [html, text] = await Promise.all([
    render(BuilderTenderInvitationEmail(props)),
    render(BuilderTenderInvitationEmail(props), { plainText: true }),
  ]);
  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: input.to,
    subject,
    html,
    text,
    tags: [{ name: "category", value: "tender-invitation" }],
  });
  if (error) {
    logger.error(
      { event: "email.builder_tender_invitation.failed", to: input.to, code: error.name, message: error.message },
      "builder_tender_invitation email send failed",
    );
    return fail("external_error", "Couldn't send the invitation email.");
  }
  if (!data) return fail("external_error", "Email provider returned no message id");
  logger.info(
    { event: "email.builder_tender_invitation.sent", to: input.to, resendId: data.id },
    "builder_tender_invitation email sent",
  );
  return ok({ id: data.id });
}

// ── participant (project sharing) invitation ─────────────────────────────

interface SendParticipantInviteEmailInput {
  to: string;
  recipientFirstName: string | null;
  inviterName: string;
  projectTitle: string;
  projectLocation: string | null;
  /** Warm label: "Following" | "Deciding". */
  roleLabel: string;
  /** One sentence describing the seat's powers, already composed. */
  roleLine: string;
  claimUrl: string;
  /** "12 August 2026". */
  expiresOn: string;
}

/**
 * The letter a runner's invitee receives when a project is shared with
 * them — flagship case: an architect bringing their client into the
 * tender file. Fired by the projects dispatch when a seat is created
 * or an invitation is re-sent.
 */
export async function sendParticipantInviteEmail(
  input: SendParticipantInviteEmailInput,
): Promise<Result<{ id: string }>> {
  const subject = `${input.inviterName} has shared ${input.projectTitle} with you`;
  const props = {
    recipientFirstName: input.recipientFirstName,
    inviterName: input.inviterName,
    projectTitle: input.projectTitle,
    projectLocation: input.projectLocation,
    roleLabel: input.roleLabel,
    roleLine: input.roleLine,
    claimUrl: input.claimUrl,
    expiresOn: input.expiresOn,
  };
  const [html, text] = await Promise.all([
    render(ParticipantInviteEmail(props)),
    render(ParticipantInviteEmail(props), { plainText: true }),
  ]);
  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: input.to,
    subject,
    html,
    text,
    tags: [{ name: "category", value: "participant-invitation" }],
  });
  if (error) {
    logger.error(
      { event: "email.participant_invite.failed", to: input.to, code: error.name, message: error.message },
      "participant_invite email send failed",
    );
    return fail("external_error", "Couldn't send the invitation email.");
  }
  if (!data) return fail("external_error", "Email provider returned no message id");
  logger.info(
    { event: "email.participant_invite.sent", to: input.to, resendId: data.id },
    "participant_invite email sent",
  );
  return ok({ id: data.id });
}

interface SendParticipantJoinedEmailInput {
  to: string;
  runnerFirstName: string | null;
  participantName: string;
  roleLabel: string;
  projectTitle: string;
  projectUrl: string;
}

/** Quiet confirmation to the runner when an invited seat is claimed. */
export async function sendParticipantJoinedEmail(
  input: SendParticipantJoinedEmailInput,
): Promise<Result<{ id: string }>> {
  const subject = `${input.participantName} has joined ${input.projectTitle}`;
  const props = {
    runnerFirstName: input.runnerFirstName,
    participantName: input.participantName,
    roleLabel: input.roleLabel,
    projectTitle: input.projectTitle,
    projectUrl: input.projectUrl,
  };
  const [html, text] = await Promise.all([
    render(ParticipantJoinedEmail(props)),
    render(ParticipantJoinedEmail(props), { plainText: true }),
  ]);
  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: input.to,
    subject,
    html,
    text,
    tags: [{ name: "category", value: "participant-joined" }],
  });
  if (error) {
    logger.error(
      { event: "email.participant_joined.failed", to: input.to, code: error.name, message: error.message },
      "participant_joined email send failed",
    );
    return fail("external_error", "Couldn't send the notification email.");
  }
  if (!data) return fail("external_error", "Email provider returned no message id");
  logger.info(
    { event: "email.participant_joined.sent", to: input.to, resendId: data.id },
    "participant_joined email sent",
  );
  return ok({ id: data.id });
}

interface SendRoundAwardedNoticeEmailInput {
  to: string;
  recipientFirstName: string | null;
  actorName: string;
  builderCompany: string;
  projectTitle: string;
  reviewUrl: string;
}

/** The formal minute of an award, to everyone with a seat on the
 *  round except the person who clicked it. */
export async function sendRoundAwardedNoticeEmail(
  input: SendRoundAwardedNoticeEmailInput,
): Promise<Result<{ id: string }>> {
  const subject = `${input.projectTitle} has been awarded`;
  const props = {
    recipientFirstName: input.recipientFirstName,
    actorName: input.actorName,
    builderCompany: input.builderCompany,
    projectTitle: input.projectTitle,
    reviewUrl: input.reviewUrl,
  };
  const [html, text] = await Promise.all([
    render(RoundAwardedNoticeEmail(props)),
    render(RoundAwardedNoticeEmail(props), { plainText: true }),
  ]);
  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: input.to,
    subject,
    html,
    text,
    tags: [{ name: "category", value: "round-awarded-notice" }],
  });
  if (error) {
    logger.error(
      { event: "email.round_awarded_notice.failed", to: input.to, code: error.name, message: error.message },
      "round_awarded_notice email send failed",
    );
    return fail("external_error", "Couldn't send the notification email.");
  }
  if (!data) return fail("external_error", "Email provider returned no message id");
  logger.info(
    { event: "email.round_awarded_notice.sent", to: input.to, resendId: data.id },
    "round_awarded_notice email sent",
  );
  return ok({ id: data.id });
}

interface SendTenderValidityExpiringEmailInput {
  to: string;
  recipientFirstName: string | null;
  builderCompany: string;
  projectTitle: string;
  holdsUntil: string;
  daysLeft: number;
  reviewUrl: string;
}

/** Diary note to the runner: a priced tender's validity is closing. */
export async function sendTenderValidityExpiringEmail(
  input: SendTenderValidityExpiringEmailInput,
): Promise<Result<{ id: string }>> {
  const subject = `${input.builderCompany}'s price on ${input.projectTitle} holds until ${input.holdsUntil}`;
  const props = {
    recipientFirstName: input.recipientFirstName,
    builderCompany: input.builderCompany,
    projectTitle: input.projectTitle,
    holdsUntil: input.holdsUntil,
    daysLeft: input.daysLeft,
    reviewUrl: input.reviewUrl,
  };
  const [html, text] = await Promise.all([
    render(TenderValidityExpiringEmail(props)),
    render(TenderValidityExpiringEmail(props), { plainText: true }),
  ]);
  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: input.to,
    subject,
    html,
    text,
    tags: [{ name: "category", value: "tender-validity" }],
  });
  if (error) {
    logger.error(
      { event: "email.tender_validity_expiring.failed", to: input.to, code: error.name, message: error.message },
      "tender_validity_expiring email send failed",
    );
    return fail("external_error", "Couldn't send the notification email.");
  }
  if (!data) return fail("external_error", "Email provider returned no message id");
  logger.info(
    { event: "email.tender_validity_expiring.sent", to: input.to, resendId: data.id },
    "tender_validity_expiring email sent",
  );
  return ok({ id: data.id });
}

interface SendScopeReadyEmailInput {
  to: string;
  runnerFirstName: string | null;
  projectTitle: string;
  /** Every line a builder prices: documented plus gap. */
  scopeItems: number;
  /** Gaps the builders carry and price without the runner. */
  builderCarried: number;
  /** Gaps genuinely waiting on the runner. */
  decisions: number;
  /** Of those decisions, the ones that are an allowance to set. */
  allowances: number;
  reviewUrl: string;
}

/** The preparation phase's one letter: the pack is ready to review. */
export async function sendScopeReadyEmail(
  input: SendScopeReadyEmailInput,
): Promise<Result<{ id: string }>> {
  const subject = `Your tender pack for ${input.projectTitle} is ready`;
  const props = {
    runnerFirstName: input.runnerFirstName,
    projectTitle: input.projectTitle,
    scopeItems: input.scopeItems,
    builderCarried: input.builderCarried,
    decisions: input.decisions,
    allowances: input.allowances,
    reviewUrl: input.reviewUrl,
  };
  const [html, text] = await Promise.all([
    render(ScopeReadyEmail(props)),
    render(ScopeReadyEmail(props), { plainText: true }),
  ]);
  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: input.to,
    subject,
    html,
    text,
    tags: [{ name: "category", value: "scope-ready" }],
  });
  if (error) {
    logger.error(
      { event: "email.scope_ready.failed", to: input.to, code: error.name, message: error.message },
      "scope_ready email send failed",
    );
    return fail("external_error", "Couldn't send the notification email.");
  }
  if (!data) return fail("external_error", "Email provider returned no message id");
  logger.info(
    { event: "email.scope_ready.sent", to: input.to, resendId: data.id },
    "scope_ready email sent",
  );
  return ok({ id: data.id });
}

interface SendScopeAddendumEmailInput {
  to: string;
  builderFirstName: string | null;
  projectTitle: string;
  addendumLabel: string;
  summary: string;
  hasTender: boolean;
  actionUrl: string;
}

/** The formal letter every tenderer gets when a live pack re-issues. */
export async function sendScopeAddendumEmail(
  input: SendScopeAddendumEmailInput,
): Promise<Result<{ id: string }>> {
  const subject = `${input.addendumLabel} issued — ${input.projectTitle}`;
  const props = {
    builderFirstName: input.builderFirstName,
    projectTitle: input.projectTitle,
    addendumLabel: input.addendumLabel,
    summary: input.summary,
    hasTender: input.hasTender,
    actionUrl: input.actionUrl,
  };
  const [html, text] = await Promise.all([
    render(ScopeAddendumEmail(props)),
    render(ScopeAddendumEmail(props), { plainText: true }),
  ]);
  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: input.to,
    subject,
    html,
    text,
    tags: [{ name: "category", value: "scope-addendum" }],
  });
  if (error) {
    logger.error(
      { event: "email.scope_addendum.failed", to: input.to, code: error.name, message: error.message },
      "scope_addendum email send failed",
    );
    return fail("external_error", "Couldn't send the notification email.");
  }
  if (!data) return fail("external_error", "Email provider returned no message id");
  logger.info(
    { event: "email.scope_addendum.sent", to: input.to, resendId: data.id },
    "scope_addendum email sent",
  );
  return ok({ id: data.id });
}

interface SendScopeRunOpsEmailInput {
  kind: "started" | "review" | "failed" | "stalled";
  projectTitle: string;
  evidencedCount: number;
  gapCount: number;
  estimatedCostUsd: number | null;
  error: string | null;
  deskUrl: string;
  /**
   * Whether an earlier run already read this project. Optional because
   * the stalled-run drainer in the outbox cron builds this input by
   * hand and has no run context to derive it from.
   */
  isReread?: boolean;
  /** Documents this run ingested. */
  documentCount?: number;
  /** Filenames present now and absent from the previous read. */
  addedDocuments?: string[];
}

/** The desk's push: a pack awaits review, or a run needs rescue. */
export async function sendScopeRunOpsEmail(
  input: SendScopeRunOpsEmailInput,
): Promise<Result<{ id: string }>> {
  // A re-read says so in the subject line. Reading "Analysis started"
  // twice for one project is what made a second review look like a
  // fault rather than a customer adding a document.
  const subject =
    input.kind === "started"
      ? input.isReread
        ? `Re-read started — ${input.projectTitle}`
        : `Analysis started — ${input.projectTitle}`
      : input.kind === "review"
        ? input.isReread
          ? `Re-read ready for review — ${input.projectTitle}`
          : `Pack ready for review — ${input.projectTitle}`
        : input.kind === "stalled"
          ? `Run stalled — ${input.projectTitle}`
          : `Extraction failed — ${input.projectTitle}`;
  const [html, text] = await Promise.all([
    render(ScopeRunOpsEmail(input)),
    render(ScopeRunOpsEmail(input), { plainText: true }),
  ]);
  const { data, error } = await sendViaResend({
    from: env.EMAIL_FROM,
    to: OPS_EMAIL,
    subject,
    html,
    text,
    tags: [{ name: "category", value: "scope-ops" }],
  });
  if (error) {
    logger.error(
      { event: "email.scope_ops.failed", code: error.name, message: error.message },
      "scope_ops email send failed",
    );
    return fail("external_error", "Couldn't send the ops email.");
  }
  if (!data) return fail("external_error", "Email provider returned no message id");
  logger.info(
    { event: "email.scope_ops.sent", kind: input.kind, resendId: data.id },
    "scope_ops email sent",
  );
  return ok({ id: data.id });
}
