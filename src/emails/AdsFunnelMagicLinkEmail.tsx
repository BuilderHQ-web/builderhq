/**
 * AdsFunnelMagicLinkEmail — sent at the end of the /start funnel.
 *
 * The link does three things in one click:
 *   1. Verifies the recipient's email
 *   2. Publishes their draft project to the marketplace
 *   3. Signs them into the dashboard
 *
 * Copy emphasises that the project isn't live yet — gives owners a
 * concrete reason to click rather than treating it as a generic
 * "confirm your email" they can put off.
 */

import {
  BodyText,
  Caption,
  Divider,
  EmailShell,
  InlineLink,
  PrimaryButton,
} from "./_shell";

interface AdsFunnelMagicLinkEmailProps {
  magicUrl: string;
  firstName: string | null;
  projectTitle: string;
}

export function AdsFunnelMagicLinkEmail({
  magicUrl,
  firstName,
  projectTitle,
}: AdsFunnelMagicLinkEmailProps) {
  const greeting = firstName ? `Hi ${firstName},` : "Welcome to BuilderHQ.";

  return (
    <EmailShell
      preview={`Confirm your email to publish ${projectTitle} — link expires in 7 days.`}
      kicker="One click to publish"
      heading="Confirm your project to go live"
      whyReceiving="You uploaded a project on BuilderHQ and we need to confirm your email before verified builders can tender. If that wasn't you, you can ignore this email."
    >
      <BodyText>{greeting}</BodyText>
      <BodyText>
        Your project <strong>{projectTitle}</strong> is ready to go. One click
        confirms your email and publishes it to verified Australian builders
        — you&apos;ll be signed straight into your dashboard.
      </BodyText>

      <PrimaryButton href={magicUrl}>Publish my project</PrimaryButton>

      <Caption>
        This link expires in 7 days. If the button doesn&apos;t work, paste this
        URL into your browser:
        <br />
        <InlineLink href={magicUrl}>{magicUrl}</InlineLink>
      </Caption>

      <Divider space="28px" />

      <Caption>
        Your project stays private — and out of the marketplace — until you
        click. We never share your address, contact details, or plans with
        any builder before that point.
      </Caption>
    </EmailShell>
  );
}

export default AdsFunnelMagicLinkEmail;
