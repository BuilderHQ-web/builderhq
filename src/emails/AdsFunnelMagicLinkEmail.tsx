/**
 * AdsFunnelMagicLinkEmail — sent at the end of the /start funnel.
 *
 * One click does three things:
 *   1. Verifies the recipient's email
 *   2. Publishes their draft project (if all required fields are
 *      filled and architectural plans uploaded — otherwise lands
 *      on the wizard to finish)
 *   3. Signs them into the dashboard
 *
 * Copy is built around the user's actual project — suburb + project
 * type — so it reads as "their" project, not "a" project. e.g.
 * "Your Brunswick single dwelling is ready to go."
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
  /** e.g. "Brunswick" — the project's suburb from the funnel. */
  suburb: string;
  /** Humanised project type. e.g. "single dwelling", "renovation". */
  projectTypeLabel: string;
}

export function AdsFunnelMagicLinkEmail({
  magicUrl,
  firstName,
  suburb,
  projectTypeLabel,
}: AdsFunnelMagicLinkEmailProps) {
  const greeting = firstName ? `Hi ${firstName},` : "Welcome to BuilderHQ.";
  const projectPhrase = `${suburb} ${projectTypeLabel}`;

  return (
    <EmailShell
      preview={`Your ${projectPhrase} is ready — confirm to go live.`}
      kicker="One click to publish"
      heading="Your project is ready"
      whyReceiving="You uploaded a project on BuilderHQ and we need to confirm your email before verified builders can tender. If that wasn't you, you can ignore this email."
    >
      <BodyText>{greeting}</BodyText>
      <BodyText>
        Your <strong>{projectPhrase}</strong> is ready to go. One click
        confirms your email and opens it up to verified Australian
        builders — you&apos;ll be signed straight into your dashboard.
      </BodyText>

      <PrimaryButton href={magicUrl}>Confirm and publish</PrimaryButton>

      <Caption>
        This link expires in 7 days. If the button doesn&apos;t work, paste
        this URL into your browser:
        <br />
        <InlineLink href={magicUrl}>{magicUrl}</InlineLink>
      </Caption>

      <Divider space="28px" />

      <Caption>
        Your project stays private — and out of the marketplace — until
        you click. We never share your address, contact details, or
        plans with any builder before that point.
      </Caption>
    </EmailShell>
  );
}

export default AdsFunnelMagicLinkEmail;
