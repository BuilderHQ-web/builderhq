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
import { PasswordResetEmail } from "@/emails/PasswordResetEmail";
import { LaunchInviteEmail } from "@/emails/LaunchInviteEmail";
import { GuideDownloadEmail } from "@/emails/GuideDownloadEmail";
import { GuideLeadOpsEmail } from "@/emails/GuideLeadOpsEmail";
import { TenderSubmittedEmail } from "@/emails/TenderSubmittedEmail";
import { TenderSubmittedBuilderEmail } from "@/emails/TenderSubmittedBuilderEmail";
import { TenderSubmittedOpsEmail } from "@/emails/TenderSubmittedOpsEmail";
import { TenderShortlistedEmail } from "@/emails/TenderShortlistedEmail";
import { TenderAwardedEmail } from "@/emails/TenderAwardedEmail";
import { TenderRejectedEmail } from "@/emails/TenderRejectedEmail";
import { TenderWithdrawnEmail } from "@/emails/TenderWithdrawnEmail";
import { OwnerSignupOpsEmail } from "@/emails/OwnerSignupOpsEmail";
import { BuilderSignupOpsEmail } from "@/emails/BuilderSignupOpsEmail";
import { ProjectPublishedOwnerEmail } from "@/emails/ProjectPublishedOwnerEmail";
import { ProjectPublishedBuilderEmail } from "@/emails/ProjectPublishedBuilderEmail";
import { ProjectPublishedOpsEmail } from "@/emails/ProjectPublishedOpsEmail";
import { UnlockOwnerEmail } from "@/emails/UnlockOwnerEmail";
import { UnlockBuilderEmail } from "@/emails/UnlockBuilderEmail";
import { UnlockOpsEmail } from "@/emails/UnlockOpsEmail";

const resend = new Resend(env.RESEND_API_KEY);

/**
 * Hardcoded ops inbox. The same address regardless of environment, so
 * baking it in beats threading another env var. If we ever need a
 * staging variant we'll lift it to env at that point.
 */
export const OPS_EMAIL = "info@builderhq.com.au";

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

  const { data, error } = await resend.emails.send({
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

  const { data, error } = await resend.emails.send({
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

  const { data, error } = await resend.emails.send({
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

  const { data, error } = await resend.emails.send({
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

  const { data, error } = await resend.emails.send({
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
  const { data, error } = await resend.emails.send({
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
  const { data, error } = await resend.emails.send({
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
  const { data, error } = await resend.emails.send({
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
  const { data, error } = await resend.emails.send({
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
  const { data, error } = await resend.emails.send({
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
  const { data, error } = await resend.emails.send({
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
  const { data, error } = await resend.emails.send({
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
  const { data, error } = await resend.emails.send({
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
  const { data, error } = await resend.emails.send({
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
  const { data, error } = await resend.emails.send({
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
  const { data, error } = await resend.emails.send({
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
  const { data, error } = await resend.emails.send({
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
  const { data, error } = await resend.emails.send({
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
  const { data, error } = await resend.emails.send({
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
  const { data, error } = await resend.emails.send({
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
