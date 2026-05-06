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
