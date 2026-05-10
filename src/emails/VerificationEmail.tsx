/**
 * VerificationEmail — sent right after signup. The link inside has a
 * 24-hour TTL.
 *
 * Composes the shared shell + primitives so brand and chrome stay in
 * sync with every other transactional email.
 */

import {
  BodyText,
  Caption,
  Divider,
  EmailShell,
  InlineLink,
  PrimaryButton,
} from "./_shell";

interface VerificationEmailProps {
  verifyUrl: string;
  firstName: string | null;
}

export function VerificationEmail({
  verifyUrl,
  firstName,
}: VerificationEmailProps) {
  const greeting = firstName ? `Hi ${firstName},` : "Welcome to BuilderHQ.";

  return (
    <EmailShell
      preview="Verify your BuilderHQ account — link expires in 24 hours."
      kicker="Verify your email"
      heading="One quick click to get started"
      whyReceiving="You're receiving this because you just created a BuilderHQ account. If that wasn't you, you can ignore this email — your address won't be used."
    >
      <BodyText>{greeting}</BodyText>
      <BodyText>
        Confirm your email and we&apos;ll finish setting up your account so you
        can browse projects, submit tenders, or upload your first build.
      </BodyText>

      <PrimaryButton href={verifyUrl}>Verify email</PrimaryButton>

      <Caption>
        This link expires in 24 hours. If the button doesn&apos;t work, paste
        this URL into your browser:
        <br />
        <InlineLink href={verifyUrl}>{verifyUrl}</InlineLink>
      </Caption>

      <Divider space="28px" />

      <Caption>
        Didn&apos;t sign up for BuilderHQ? You can safely delete this email —
        no account is created until verification is complete.
      </Caption>
    </EmailShell>
  );
}

export default VerificationEmail;
