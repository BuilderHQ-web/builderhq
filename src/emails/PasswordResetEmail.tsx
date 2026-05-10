/**
 * PasswordResetEmail — sent when a user clicks "forgot password".
 *
 * 1-hour TTL, security-forward copy. Uses the shared shell so the
 * sender identity / footer stays consistent with the rest of the
 * transactional set.
 */

import {
  BodyText,
  Caption,
  Divider,
  EmailShell,
  InlineLink,
  PrimaryButton,
} from "./_shell";

interface PasswordResetEmailProps {
  resetUrl: string;
  firstName: string | null;
}

export function PasswordResetEmail({
  resetUrl,
  firstName,
}: PasswordResetEmailProps) {
  const greeting = firstName ? `Hi ${firstName},` : "Hi,";

  return (
    <EmailShell
      preview="Reset your BuilderHQ password — link expires in 1 hour."
      kicker="Password reset"
      heading="Set a new password"
      whyReceiving="You're receiving this because someone requested a password reset for the BuilderHQ account at this address."
    >
      <BodyText>{greeting}</BodyText>
      <BodyText>
        Click below to choose a new password. The link works once and expires
        in 1 hour for your security.
      </BodyText>

      <PrimaryButton href={resetUrl}>Reset password</PrimaryButton>

      <Caption>
        Or paste this URL into your browser:
        <br />
        <InlineLink href={resetUrl}>{resetUrl}</InlineLink>
      </Caption>

      <Divider space="28px" />

      <Caption>
        Didn&apos;t request this? You can ignore this email — your password
        stays the same. If you keep getting reset emails you didn&apos;t ask
        for, get in touch and we&apos;ll lock the account down.
      </Caption>
    </EmailShell>
  );
}

export default PasswordResetEmail;
