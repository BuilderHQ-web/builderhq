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
import { TenderSubmittedEmail } from "@/emails/TenderSubmittedEmail";
import { TenderShortlistedEmail } from "@/emails/TenderShortlistedEmail";
import { TenderAwardedEmail } from "@/emails/TenderAwardedEmail";
import { TenderRejectedEmail } from "@/emails/TenderRejectedEmail";
import { TenderWithdrawnEmail } from "@/emails/TenderWithdrawnEmail";

const resend = new Resend(env.RESEND_API_KEY);

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
